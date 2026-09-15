import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectScript } from '../../../src/adapters/_script.js';
import Modal from '../../../src/components/Modal.js';
import '../../../src/components/PModal.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PUploader.js';
import SelectLoader from '../../../src/components/SelectLoader.js';
import { FragmentSwapper } from '../../../src/core/FragmentSwapper.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const fixture = new URL('../fixtures/tracker-script.js', import.meta.url).href;

class FakeTrusted {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

class FakeTrustedHTML extends FakeTrusted {}
class FakeTrustedScript extends FakeTrusted {}
class FakeTrustedScriptURL extends FakeTrusted {}

const FAKES = {
  createHTML: FakeTrustedHTML,
  createScript: FakeTrustedScript,
  createScriptURL: FakeTrustedScriptURL,
};

const requireType = (value, Type) => {
  if (!(value instanceof Type)) {
    throw new TypeError(`This document requires '${Type.name.replace('Fake', '')}' assignment.`);
  }
  return String(value);
};

const isScript = node => node instanceof HTMLScriptElement;

const guardSetter = (prototype, property, check) => {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  Object.defineProperty(prototype, property, {
    ...descriptor,
    set(value) {
      descriptor.set.call(this, check(this, value));
    },
  });
  return () => Object.defineProperty(prototype, property, descriptor);
};

const guardMethod = (prototype, name, wrap) => {
  const original = prototype[name];
  prototype[name] = wrap(original);
  return () => {
    prototype[name] = original;
  };
};

/**
 * Make HTML and script sinks accept only trusted values, as a page with
 * require-trusted-types-for 'script' does
 */
const enforceTrustedTypes = () => {
  const html = (_, value) => requireType(value, FakeTrustedHTML);
  const restores = [
    guardSetter(Element.prototype, 'innerHTML', html),
    guardSetter(ShadowRoot.prototype, 'innerHTML', html),
    guardSetter(HTMLScriptElement.prototype, 'src', (_, value) =>
      requireType(value, FakeTrustedScriptURL)
    ),
    guardSetter(Node.prototype, 'textContent', (node, value) =>
      isScript(node) ? requireType(value, FakeTrustedScript) : value
    ),
    guardMethod(
      Element.prototype,
      'setAttribute',
      setAttribute =>
        function (name, value) {
          const checked =
            isScript(this) && name.toLowerCase() === 'src'
              ? requireType(value, FakeTrustedScriptURL)
              : value;
          return setAttribute.call(this, name, checked);
        }
    ),
    guardMethod(
      DOMParser.prototype,
      'parseFromString',
      parseFromString =>
        function (input, type) {
          return parseFromString.call(this, requireType(input, FakeTrustedHTML), type);
        }
    ),
  ];
  return () => restores.forEach(restore => restore());
};

describe('the library under Trusted Types', () => {
  const policies = [];
  let restore;

  beforeEach(() => {
    vi.stubGlobal('trustedTypes', {
      createPolicy(name, rules) {
        policies.push(name);
        return Object.fromEntries(
          Object.entries(rules).map(([method, rule]) => [
            method,
            input => new FAKES[method](rule(input)),
          ])
        );
      },
    });
    restore = enforceTrustedTypes();
  });

  afterEach(() => {
    restore();
    document.body.replaceChildren();
    document
      .querySelectorAll('script[src*="tracker-script.js"]')
      .forEach(script => script.remove());
    delete globalThis.trackerFixtureRuns;
    delete globalThis.trustedFragmentRuns;
  });

  it('renders every web component through a named policy', () => {
    const modal = document.createElement('p-modal');
    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'), new Option('Mexico', 'mx'));
    const toasts = document.createElement('p-toasts');
    const datetime = document.createElement('p-datetime');
    datetime.setAttribute('mode', 'datetime');
    datetime.setAttribute('show-quick-dates', '');
    const uploader = document.createElement('p-uploader');
    const file = document.createElement('p-uploader-file');
    document.body.append(modal, select, toasts, datetime, uploader, file);

    datetime.open();
    toasts.toast({ message: 'Booking saved' });

    expect([
      policies.includes('parallelogram'),
      Boolean(modal.shadowRoot.querySelector('dialog')),
      Boolean(select.shadowRoot.querySelector('.root')),
      Boolean(datetime.shadowRoot.querySelector('.field')),
      Boolean(uploader.shadowRoot.querySelector('[part="selector"]')),
      Boolean(file.shadowRoot.querySelector('[part="preview"]')),
      toasts.shadowRoot.textContent.includes('Booking saved'),
    ]).toEqual([true, true, true, true, true, true, true]);
  });

  it('swaps a router fragment and runs its inline and external scripts', async () => {
    const main = document.createElement('main');
    main.dataset.view = 'main';
    main.append('Home');
    document.body.append(main);
    const swapper = new FragmentSwapper({
      eventBus: new EventManager(),
      mountWithin: () => {},
      unmountWithin: () => {},
    });

    await swapper.replaceFragments(
      `<main data-view="main"><h1>Pricing</h1><script src="${fixture}?router"></script><script>globalThis.trustedFragmentRuns = (globalThis.trustedFragmentRuns ?? 0) + 1;</script></main>`,
      { viewTargets: ['main'] }
    );

    await vi.waitFor(() =>
      expect([
        main.querySelector('h1')?.textContent,
        globalThis.trustedFragmentRuns,
        globalThis.trackerFixtureRuns,
      ]).toEqual(['Pricing', 1, 1])
    );
  });

  it('loads a SelectLoader choice', async () => {
    const select = document.createElement('select');
    select.setAttribute('data-selectloader', '');
    select.setAttribute('data-selectloader-target', '#product-details');
    select.setAttribute('data-selectloader-transition', 'none');
    select.append(new Option('Choose a product', ''), new Option('Laptop', '/fragments/laptop'));
    const target = document.createElement('div');
    target.id = 'product-details';
    document.body.append(select, target);
    const router = { get: async url => ({ data: `<p><strong>${url}</strong></p>` }) };
    new SelectLoader({ eventBus: new EventManager(), router }).mount(select);

    select.value = '/fragments/laptop';
    select.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(target.querySelector('strong')?.textContent).toBe('/fragments/laptop')
    );
  });

  it('creates a modal from HTML content', async () => {
    const modal = await Modal.create({
      title: 'Terms',
      content: '<p>Read them <strong>carefully</strong>.</p>',
    });

    expect(modal.querySelector('strong')?.textContent).toBe('carefully');
  });

  it('shows a toast message written in HTML', () => {
    const toasts = document.createElement('p-toasts');
    document.body.append(toasts);

    toasts.toast({ message: 'Saved as <em>draft</em>', allowHTML: true });

    expect(toasts.shadowRoot.querySelector('em')?.textContent).toBe('draft');
  });

  it('loads a tracker script', async () => {
    await injectScript(`${fixture}?trusted`);

    expect(globalThis.trackerFixtureRuns).toBe(1);
  });
});
