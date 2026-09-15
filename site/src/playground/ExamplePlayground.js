import { BaseComponent } from '../../../src/core/BaseComponent.js';
import { MockUpload } from '../mocks.js';
import { describeDetail, describeElement, serializeMarkup } from './format.js';

const contracts = import.meta.glob('../../../src/components/*.contract.js', {
  eager: true,
  import: 'default',
});
const contractsByName = new Map(
  Object.values(contracts).map(contract => [contract.name, contract])
);

/** Payload keys that may hold the element an event bus message is about */
const ELEMENT_KEYS = ['element', 'target', 'trigger', 'video', 'modal', 'targetElement'];
const LOG_LIMIT = 50;

/**
 * ExamplePlayground - makes a documentation example live
 *
 * The example's controls change attributes on its markup, which is rendered again so the component
 * mounts with the new configuration, and the markup shown below follows. The events the component
 * sends, as DOM events inside the example or on the event bus, are listed as they happen.
 */
export default class ExamplePlayground extends BaseComponent {
  static selector = 'data-example';

  _init(element) {
    const state = super._init(element);
    const [name] = (element.getAttribute('data-example') ?? '').split(':');
    const contract = contractsByName.get(name);
    const source = element.querySelector('template[data-example-source]');
    const stage = element.querySelector('[data-example-stage]');
    if (!contract || !source || !stage) return state;

    Object.assign(state, {
      contract,
      source,
      stage,
      own: contract.match ?? contract.tag ?? `[${contract.selector}]`,
      form: element.querySelector('[data-example-controls]'),
      code: element.querySelector('[data-example-code]'),
      log: element.querySelector('[data-example-log]'),
      panel: element.querySelector('[data-example-state]'),
      started: performance.now(),
    });

    this._prepareStage(state);
    if (state.form) this._connectControls(state);
    if (state.log) this._connectLog(state);
    if (state.panel) this._connectState(state);
    return state;
  }

  _fields(state) {
    return [...state.form.querySelectorAll('[data-attribute]')];
  }

  _targetIn(root, state, field) {
    return root.querySelector(field.dataset.target ?? state.own);
  }

  _connectControls(state) {
    const { signal } = state.controller;
    this._readControls(state);
    state.form.hidden = false;

    state.form.addEventListener('input', () => this._render(state), { signal });
    state.form.addEventListener(
      'reset',
      () => {
        setTimeout(() => {
          this._readControls(state);
          this._render(state);
        });
      },
      { signal }
    );
    state.form.addEventListener('submit', event => event.preventDefault(), { signal });
  }

  /**
   * Set each control from the attribute it changes in the original markup
   */
  _readControls(state) {
    const original = state.source.content;
    for (const field of this._fields(state)) {
      const target = this._targetIn(original, state, field);
      const name = field.dataset.attribute;
      if (field.type === 'checkbox') {
        field.checked = Boolean(target?.hasAttribute(name));
        continue;
      }

      const value = target?.getAttribute(name) ?? '';
      const options = field.options ? [...field.options].map(option => option.value) : null;
      if (options && value === '' && target?.hasAttribute(name)) {
        field.value = 'true';
      } else {
        field.value = !options || options.includes(value) ? value : '';
      }
    }
  }

  _render(state) {
    const markup = state.source.content.cloneNode(true);
    for (const field of this._fields(state)) {
      const target = this._targetIn(markup, state, field);
      if (!target) continue;
      const name = field.dataset.attribute;
      const authored = this._targetIn(state.source.content, state, field)?.getAttribute(name);
      if (field.type === 'checkbox') {
        target.toggleAttribute(name, field.checked);
      } else if (field.value === '') {
        target.removeAttribute(name);
      } else if (field.value === 'true' && authored === '') {
        target.setAttribute(name, '');
      } else {
        target.setAttribute(name, field.value);
      }
    }

    if (state.code) {
      state.code.textContent = serializeMarkup(markup.cloneNode(true));
    }
    state.stage.replaceChildren(markup);
    this._prepareStage(state);
  }

  /**
   * Point uploaders in the example at the site's stand-in server
   */
  _prepareStage(state) {
    const uploaders = state.stage.querySelectorAll('p-uploader');
    if (uploaders.length === 0) return;

    customElements.whenDefined('p-uploader').then(() => {
      uploaders.forEach(uploader => uploader.setXHR?.(MockUpload));
    });
  }

  _connectLog(state) {
    const { contract, stage, log } = state;
    const { signal } = state.controller;
    const list = log.querySelector('[data-example-log-list]');
    const empty = log.querySelector('[data-example-log-empty]');
    log.hidden = false;

    log.querySelector('[data-example-log-clear]')?.addEventListener(
      'click',
      () => {
        list.replaceChildren();
        empty.hidden = false;
      },
      { signal }
    );

    const record = (name, detail) => {
      const item = document.createElement('li');
      const time = document.createElement('span');
      time.className = 'log__time';
      time.textContent = `${((performance.now() - state.started) / 1000).toFixed(2)}s`;
      const label = document.createElement('code');
      label.textContent = name;
      const summary = document.createElement('span');
      summary.className = 'log__detail';
      summary.textContent = describeDetail(detail);
      item.append(time, label, summary);

      list.prepend(item);
      while (list.children.length > LOG_LIMIT) list.lastElementChild.remove();
      empty.hidden = true;
    };

    const events = [contract, ...(contract.elements ?? [])]
      .flatMap(item => item.events ?? [])
      .filter(event => !event.inbound && !event.deprecated);

    for (const event of events) {
      if (event.channel === 'bus') {
        this.eventBus?.on(
          event.name,
          payload => {
            if (this._concernsStage(stage, payload)) record(event.name, payload);
          },
          { signal }
        );
        continue;
      }

      stage.addEventListener(
        event.name,
        domEvent => {
          /* Native input and change events from inside a shadow root aren't the component's own */
          if (!event.name.includes(':') && domEvent.composedPath()[0] !== domEvent.target) return;
          record(event.name, domEvent.detail);
        },
        { signal }
      );
    }
  }

  /**
   * List the state attributes the component writes in the example, as they change
   */
  _connectState(state) {
    const names = [state.contract, ...(state.contract.elements ?? [])]
      .flatMap(item => item.attributes ?? [])
      .filter(attribute => attribute.readonly && !attribute.deprecated)
      .map(attribute => attribute.name);
    const list = state.panel.querySelector('[data-example-state-list]');

    const render = () => {
      const rows = [];
      for (const name of names) {
        for (const node of state.stage.querySelectorAll(`[${CSS.escape(name)}]`)) {
          const term = document.createElement('dt');
          term.append(`${describeElement(node)} `);
          const code = document.createElement('code');
          code.textContent = name;
          term.append(code);
          const value = document.createElement('dd');
          value.textContent = node.getAttribute(name) || '(present)';
          rows.push(term, value);
        }
      }
      list.replaceChildren(...rows);
      state.panel.hidden = rows.length === 0;
    };

    const observer = new MutationObserver(render);
    observer.observe(state.stage, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: names,
    });
    state.controller.signal.addEventListener('abort', () => observer.disconnect());
    render();
  }

  _concernsStage(stage, payload) {
    const nodes = ELEMENT_KEYS.map(key => payload?.[key]).filter(value => value instanceof Node);
    return nodes.length === 0 || nodes.some(node => stage.contains(node));
  }
}
