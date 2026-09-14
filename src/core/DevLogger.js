const noop = () => {};

/**
 * Console logger used across the framework
 *
 * Messages are prefixed with the namespace, such as `[parallelogram]`. debug, log, info and group
 * stay quiet until the logger is enabled, and silent quietens warn and error as well. Each method is
 * the console's own function bound to the prefix, so developer tools point at the line that logged
 * the message rather than at this file. Production builds remove the framework's own debug, log,
 * info and group calls, so those only appear when a bundler resolves the `development` condition.
 */
export class DevLogger {
  /**
   * @param {string|{ namespace?: string, prefix?: string }} [namespace='parallelogram']
   * @param {boolean} [enabled=false] - Show debug, log, info and group output
   * @param {boolean} [silent=false] - Hide all output, including warnings and errors
   */
  constructor(namespace = 'parallelogram', enabled = false, silent = false) {
    this.namespace =
      typeof namespace === 'string'
        ? namespace
        : (namespace?.namespace ?? namespace?.prefix ?? 'parallelogram');
    this.enabled = Boolean(enabled);
    this.silent = Boolean(silent);
    this._children = new Set();
    this._bind();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this._bind();
  }

  setSilent(silent) {
    this.silent = Boolean(silent);
    this._bind();
  }

  /**
   * A logger for part of an application, with a namespace nested in this one and settings that
   * follow this logger's
   *
   * @param {string} subNamespace
   * @returns {DevLogger}
   */
  child(subNamespace) {
    const child = new DevLogger(`${this.namespace}:${subNamespace}`, this.enabled, this.silent);
    this._children.add(child);
    return child;
  }

  group(label, data) {
    if (this.silent || !this.enabled || !console.groupCollapsed) return;

    console.groupCollapsed(`[${this.namespace}] ${label}`);
    if (data && typeof data === 'object') {
      console.log('Details:', data);
    }
  }

  groupEnd() {
    if (this.silent || !this.enabled || !console.groupEnd) return;
    console.groupEnd();
  }

  _bind() {
    const prefix = `[${this.namespace}]`;
    const verbose = this.enabled && !this.silent;

    this.debug = verbose ? console.debug.bind(console, prefix) : noop;
    this.log = verbose ? console.log.bind(console, prefix) : noop;
    this.info = verbose ? console.info.bind(console, prefix) : noop;
    this.warn = this.silent ? noop : console.warn.bind(console, prefix);
    this.error = this.silent ? noop : console.error.bind(console, prefix);

    for (const child of this._children) {
      child.enabled = this.enabled;
      child.silent = this.silent;
      child._bind();
    }
  }
}

export function createLogger(namespace, forceEnabled) {
  if (forceEnabled !== undefined) {
    return new DevLogger(namespace, forceEnabled);
  }
  const isDebugMode =
    (typeof window !== 'undefined' && window.location?.search?.includes('debug=1')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('app:debug') === '1');
  return new DevLogger(namespace, isDebugMode);
}
