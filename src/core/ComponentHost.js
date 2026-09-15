/**
 * ComponentHost - Loads registry components and mounts them on matching elements
 *
 * The host owns the component lifecycle for a root element: it mounts
 * components on elements matching their selectors, watches the root with a
 * single MutationObserver to mount added elements and unmount removed ones,
 * and loads each component's module once.
 *
 * Each registry entry has one load record. Elements found while its module is
 * still loading wait in that record, survive retries, and are mounted once the
 * module arrives if they are still on the page. Components load after the
 * entries named in `dependsOn`, and `priority: 'critical'` entries are mounted
 * before the rest on every pass.
 *
 * Events emitted on the event bus: `page:component-mounted`,
 * `page:component-mount-error`, `page:component-unmounted`,
 * `page:component-loaded` and `page:component-load-error`.
 */

/**
 * @typedef {Object} RegistryEntry
 * @property {string} name - Unique component name
 * @property {string} selector - CSS selector for elements the component mounts on
 * @property {() => (Object|Function|Promise<Object|Function>)} loader - Returns the module or class
 * @property {'critical'|'normal'} [priority='normal'] - Critical entries mount first
 * @property {string[]} [dependsOn] - Names of entries that must load first
 * @property {string} [exportName] - Named export to use when the module has no default export
 */

const isThenable = value => typeof value?.then === 'function';

export class ComponentHost {
  /**
   * @param {Object} options
   * @param {RegistryEntry[]} [options.registry]
   * @param {Object} options.eventBus
   * @param {Object} [options.logger]
   * @param {Object} [options.router]
   * @param {number} [options.maxRetryAttempts=3] - Retries after a module fails to load
   * @param {number} [options.retryDelay=1000] - Delay before the first retry, doubled for each retry
   */
  constructor({
    registry = [],
    eventBus,
    logger,
    router,
    maxRetryAttempts = 3,
    retryDelay = 1000,
  }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    this.maxRetryAttempts = maxRetryAttempts;
    this.retryDelay = retryDelay;

    /** @type {Map<string, RegistryEntry>} */
    this.entries = new Map();
    /** @type {Map<string, Object>} Load record per entry name */
    this.records = new Map();
    /** @type {Map<string, Object>} Entries and combined selector per mount priority */
    this.passes = new Map();
    this.timers = new Set();
    this.observer = null;
    this.root = null;
    this.stopped = false;

    registry.forEach(entry => this._register(entry));
  }

  /**
   * Mount components within the root and start watching it for changes.
   *
   * @param {Element} [root=document.body]
   * @returns {ComponentHost}
   */
  start(root = document.body) {
    this.stopped = false;
    this.root = root;
    this.mountWithin(root);

    this.observer = new MutationObserver(records => this._onMutations(records));
    this.observer.observe(root, { childList: true, subtree: true });

    return this;
  }

  /**
   * Stop watching the root, cancel pending retries and unmount every component.
   */
  stop() {
    this.observer?.disconnect();
    this.observer = null;

    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    for (const [name, record] of this.records) {
      if (record.instance) {
        for (const element of this._trackedElements(record.instance)) {
          this._unmountElement(name, record.instance, element);
        }
        record.instance.destroy?.();
      }
      for (const element of record.pending.keys()) {
        element.classList.remove('component-loading');
      }
    }

    this.records.clear();
    this.root = null;
    this.stopped = true;
  }

  /**
   * Register a component. When the host has started, matching elements in the
   * root are mounted straight away.
   *
   * @param {RegistryEntry} entry
   * @returns {ComponentHost}
   * @throws {Error} If the entry is invalid or its name is already registered.
   */
  add(entry) {
    this._register(entry);
    if (this.root) {
      this._mountEntry(entry, this._matching(entry.selector, [this.root]), null);
    }
    return this;
  }

  /**
   * Mount components on matching elements within a root. Does nothing once the host is stopped,
   * until it starts again.
   *
   * @param {Element} root
   * @param {Object} [options]
   * @param {'all'|'critical'|'normal'} [options.priority='all'] - Which entries to mount
   * @param {Element[]|null} [options.nodes] - Only search these nodes instead of the whole root
   * @param {string|null} [options.fragmentTarget] - Fragment being mounted, written to data-fragment-target
   */
  mountWithin(root, { priority = 'all', nodes = null, fragmentTarget = null } = {}) {
    if (this.stopped) {
      return;
    }

    const scopes = nodes ?? [root];
    const pass = this._pass(priority);
    const found = pass.selector ? this._matching(pass.selector, scopes) : [];

    for (const { entry, valid } of pass.entries) {
      let elements;
      try {
        elements = valid
          ? found.filter(element => element.matches(entry.selector))
          : this._matching(entry.selector, scopes);
      } catch (error) {
        this.logger?.error(`Invalid selector for component ${entry.name}`, { error, entry });
        this.eventBus.emit('page:component-mount-error', { componentName: entry.name, error });
        continue;
      }

      if (elements.length > 0) {
        this._mountEntry(entry, elements, fragmentTarget);
      }
    }
  }

  /**
   * Unmount every component mounted on, or waiting to mount on, elements within a root.
   *
   * @param {Element} root
   */
  unmountWithin(root) {
    for (const [name, record] of this.records) {
      if (record.instance) {
        for (const element of this._trackedElements(record.instance)) {
          if (root === element || root.contains(element)) {
            this._unmountElement(name, record.instance, element);
          }
        }
      }

      for (const element of [...record.pending.keys()]) {
        if (root === element || root.contains(element)) {
          record.pending.delete(element);
          element.classList.remove('component-loading');
        }
      }
    }
  }

  /**
   * Mount a registered component on a specific element, whether or not it matches the selector.
   *
   * @param {string} name
   * @param {Element} element
   * @returns {boolean} False when no component with that name is registered
   */
  mount(name, element) {
    const entry = this.entries.get(name);
    if (!entry) return false;

    this._mountEntry(entry, [element], null);
    return true;
  }

  /**
   * Load a component that failed to load for good again, with a fresh set of retries
   *
   * Failed dependencies are retried too, and matching elements in the root wait for the new load.
   *
   * @param {string} name
   * @returns {boolean} False when no component with that name has failed to load
   */
  retry(name) {
    const entry = this.entries.get(name);
    if (!entry || this.records.get(name)?.status !== 'failed') return false;

    (entry.dependsOn ?? []).forEach(dependency => this.retry(dependency));
    this.records.delete(name);
    if (this.root) {
      this._mountEntry(entry, this._matching(entry.selector, [this.root]), null);
    }
    return true;
  }

  getInstance(name) {
    return this.records.get(name)?.instance ?? null;
  }

  /**
   * @returns {Map<string, Object>} Loaded component instances by name
   */
  getInstances() {
    const instances = new Map();
    for (const [name, record] of this.records) {
      if (record.instance) instances.set(name, record.instance);
    }
    return instances;
  }

  /**
   * @returns {{ loading: string[], retries: Record<string, number> }}
   */
  getLoadingStatus() {
    const loading = [];
    const retries = {};
    for (const [name, record] of this.records) {
      if (record.status === 'loading' || record.status === 'retrying') loading.push(name);
      if (record.attempts > 0) retries[name] = record.attempts;
    }
    return { loading, retries };
  }

  /**
   * @throws {Error} If the entry is invalid, its name is already registered, or its dependencies
   *   lead back to it.
   */
  _register(entry) {
    if (!entry?.name || !entry.selector || typeof entry.loader !== 'function') {
      throw new Error('A component needs a name, a selector and a loader function');
    }
    if (this.entries.has(entry.name)) {
      throw new Error(`A component named "${entry.name}" is already registered`);
    }
    const cycle = this._dependencyCycle(entry);
    if (cycle) {
      throw new Error(`Components can't depend on each other in a cycle: ${cycle.join(' → ')}`);
    }
    this.entries.set(entry.name, entry);
    this.passes.clear();
  }

  /**
   * The names on a path from an entry back to itself through registered dependencies, or null
   *
   * @returns {string[]|null}
   */
  _dependencyCycle(entry) {
    const visit = (name, path) => {
      if (name === entry.name) return [...path, name];
      if (path.includes(name)) return null;
      for (const next of this.entries.get(name)?.dependsOn ?? []) {
        const cycle = visit(next, [...path, name]);
        if (cycle) return cycle;
      }
      return null;
    };

    for (const name of entry.dependsOn ?? []) {
      const cycle = visit(name, [entry.name]);
      if (cycle) return cycle;
    }
    return null;
  }

  _entriesFor(priority) {
    const entries = [...this.entries.values()];
    const critical = entries.filter(entry => entry.priority === 'critical');
    const normal = entries.filter(entry => entry.priority !== 'critical');

    if (priority === 'critical') return critical;
    if (priority === 'normal') return normal;
    return [...critical, ...normal];
  }

  /**
   * The entries a mount pass covers, and one selector joining the valid selectors among them so
   * each scope is searched once
   */
  _pass(priority) {
    let pass = this.passes.get(priority);
    if (!pass) {
      const entries = this._entriesFor(priority).map(entry => ({
        entry,
        valid: this._isValidSelector(entry.selector),
      }));
      const selector = entries
        .filter(({ valid }) => valid)
        .map(({ entry }) => entry.selector)
        .join(',');
      pass = { entries, selector };
      this.passes.set(priority, pass);
    }
    return pass;
  }

  _isValidSelector(selector) {
    try {
      document.createDocumentFragment().querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  _matching(selector, scopes) {
    const elements = new Set();
    for (const scope of scopes) {
      if (scope.matches?.(selector)) elements.add(scope);
      scope.querySelectorAll?.(selector).forEach(element => elements.add(element));
    }
    return [...elements];
  }

  _record(entry) {
    let record = this.records.get(entry.name);
    if (!record) {
      record = { status: 'idle', instance: null, pending: new Map(), attempts: 0 };
      /* Settles once the component has loaded or has failed for good, after any retries */
      record.ready = new Promise((resolve, reject) => {
        record.settle = { resolve, reject };
      });
      record.ready.catch(() => {});
      this.records.set(entry.name, record);
    }
    return record;
  }

  _mountEntry(entry, elements, fragmentTarget) {
    const record = this._record(entry);

    if (record.instance) {
      elements.forEach(element =>
        this._mountElement(entry.name, record.instance, element, fragmentTarget)
      );
      return;
    }

    if (record.status === 'failed') {
      elements.forEach(element => element.classList.add('component-error'));
      return;
    }

    elements.forEach(element => {
      record.pending.set(element, fragmentTarget);
      element.classList.add('component-loading');
    });

    if (record.status === 'idle') {
      this._load(entry, record);
    }
  }

  _load(entry, record) {
    record.status = 'loading';

    const waitingFor = this._dependencies(entry).filter(
      dependency => dependency.status !== 'loaded'
    );

    if (waitingFor.length === 0) {
      this._loadModule(entry, record);
      return;
    }

    /* Dependencies are waited on through their retries; one that fails for good fails this one */
    Promise.all(waitingFor.map(dependency => dependency.ready)).then(
      () => this._loadModule(entry, record),
      error => {
        if (this.records.get(entry.name) !== record) return;
        this._fail(
          entry,
          record,
          new Error(`Component ${entry.name} was not loaded because a dependency failed to load`, {
            cause: error,
          })
        );
      }
    );
  }

  _loadModule(entry, record) {
    if (this.records.get(entry.name) !== record) return;

    let result;
    try {
      result = entry.loader();
    } catch (error) {
      this._onLoadFailed(entry, record, error);
      return;
    }

    if (!isThenable(result)) {
      this._onLoaded(entry, record, result);
      return;
    }

    result.then(
      module => this._onLoaded(entry, record, module),
      error => this._onLoadFailed(entry, record, error)
    );
  }

  _dependencies(entry) {
    return (entry.dependsOn ?? []).flatMap(name => {
      const dependency = this.entries.get(name);
      if (!dependency) {
        this.logger?.warn(`Component ${entry.name} depends on unknown component ${name}`);
        return [];
      }

      const record = this._record(dependency);
      if (record.status === 'idle') this._load(dependency, record);
      return [record];
    });
  }

  _onLoaded(entry, record, module) {
    if (this.records.get(entry.name) !== record) return;

    let instance;
    try {
      instance = this._createInstance(entry, module);
    } catch (error) {
      this._fail(entry, record, error);
      return;
    }

    record.instance = instance;
    record.status = 'loaded';
    record.settle.resolve();

    const waiting = [...record.pending];
    record.pending.clear();

    for (const [element, fragmentTarget] of waiting) {
      element.classList.remove('component-loading', 'component-error');
      if (element.isConnected) {
        this._mountElement(entry.name, instance, element, fragmentTarget);
      }
    }

    this.eventBus.emit('page:component-loaded', {
      componentName: entry.name,
      instance,
      queueSize: waiting.length,
    });
  }

  _onLoadFailed(entry, record, error) {
    if (this.records.get(entry.name) !== record) return;

    if (record.attempts < this.maxRetryAttempts) {
      record.attempts++;
      record.status = 'retrying';
      this.logger?.warn(`Retrying component ${entry.name} (attempt ${record.attempts})`, { error });

      const timer = setTimeout(
        () => {
          this.timers.delete(timer);
          this._load(entry, record);
        },
        this.retryDelay * 2 ** (record.attempts - 1)
      );
      this.timers.add(timer);
      return;
    }

    this._fail(entry, record, error);
  }

  _fail(entry, record, error) {
    record.status = 'failed';
    record.settle.reject(error);

    for (const element of record.pending.keys()) {
      element.classList.remove('component-loading');
      element.classList.add('component-error');
    }
    record.pending.clear();

    this.logger?.error(`Failed to load component ${entry.name}`, { error });
    this.eventBus.emit('page:component-load-error', {
      componentName: entry.name,
      error,
      retries: record.attempts,
    });
  }

  /**
   * @throws {Error} If the module does not provide a component class.
   */
  _createInstance(entry, module) {
    const ComponentClass =
      typeof module === 'function'
        ? module
        : (module?.default ?? (entry.exportName ? module?.[entry.exportName] : undefined));

    if (typeof ComponentClass !== 'function') {
      throw new Error(
        `The loader for component ${entry.name} did not return a class (expected a default export${
          entry.exportName ? ` or "${entry.exportName}"` : ''
        })`
      );
    }

    return new ComponentClass({
      eventBus: this.eventBus,
      logger: this.logger,
      router: this.router,
      config: entry,
    });
  }

  _mountElement(name, instance, element, fragmentTarget) {
    if (instance.elements?.has(element) || instance._initializing?.has(element)) return;

    const mounted = () =>
      this.eventBus.emit('page:component-mounted', {
        componentName: name,
        element,
        instance,
        fragmentTarget,
      });
    const failed = error =>
      this.eventBus.emit('page:component-mount-error', {
        componentName: name,
        error,
        element,
        fragmentTarget,
      });

    try {
      const result = instance.mount(element);
      if (fragmentTarget) {
        element.setAttribute('data-fragment-target', fragmentTarget);
      }
      if (!isThenable(result)) {
        mounted();
        return;
      }
      /* An asynchronous _init is reported once it settles, unless the element was unmounted first */
      result.then(() => {
        if (instance.elements?.has(element) !== false) mounted();
      }, failed);
    } catch (error) {
      this.logger?.error(`Failed to mount ${name}`, { error, element });
      failed(error);
    }
  }

  _unmountElement(name, instance, element) {
    try {
      const unmounted = instance.unmount(element);
      element.removeAttribute('data-fragment-target');
      if (unmounted !== false) {
        this.eventBus.emit('page:component-unmounted', { componentName: name, element, instance });
      }
    } catch (error) {
      this.logger?.error(`Failed to unmount ${name}`, { error, element });
    }
  }

  _trackedElements(instance) {
    return instance.trackedElements?.() ?? [...(instance.elements?.keys?.() ?? [])];
  }

  _onMutations(mutations) {
    const added = new Set();
    const removed = [];

    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) added.add(node);
      });
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) removed.push(node);
      });
    }

    this._unmountRemoved(removed);

    const roots = [...added].filter(node => {
      if (!node.isConnected) return false;
      for (let parent = node.parentNode; parent; parent = parent.parentNode) {
        if (added.has(parent)) return false;
      }
      return true;
    });
    if (roots.length > 0 && this.root) {
      this.mountWithin(this.root, { nodes: roots });
    }
  }

  /**
   * Unmount components from removed elements and the elements inside them. An element moved within
   * the page is connected again by the time the records arrive, so it stays mounted.
   */
  _unmountRemoved(nodes) {
    const removed = new Set(nodes.filter(node => !node.isConnected));
    if (removed.size === 0) return;

    const wasRemoved = element => {
      if (element.isConnected) return false;
      for (let node = element; node; node = node.parentNode) {
        if (removed.has(node)) return true;
      }
      return false;
    };

    for (const [name, record] of this.records) {
      if (record.instance) {
        for (const element of this._trackedElements(record.instance)) {
          if (wasRemoved(element)) this._unmountElement(name, record.instance, element);
        }
      }

      for (const element of [...record.pending.keys()]) {
        if (wasRemoved(element)) record.pending.delete(element);
      }
    }
  }
}

export default ComponentHost;
