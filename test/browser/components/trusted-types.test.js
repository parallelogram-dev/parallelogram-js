import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../src/components/PModal.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PUploader.js';

class FakeTrustedHTML {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

/**
 * Make innerHTML accept only TrustedHTML, as a page with require-trusted-types-for 'script' does
 */
const enforceTrustedTypes = () => {
  const restores = [Element.prototype, ShadowRoot.prototype].map(prototype => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'innerHTML');
    Object.defineProperty(prototype, 'innerHTML', {
      ...descriptor,
      set(value) {
        if (!(value instanceof FakeTrustedHTML)) {
          throw new TypeError("This document requires 'TrustedHTML' assignment.");
        }
        descriptor.set.call(this, String(value));
      },
    });
    return () => Object.defineProperty(prototype, 'innerHTML', descriptor);
  });
  return () => restores.forEach(restore => restore());
};

describe('web components under Trusted Types', () => {
  const policies = [];
  let restore;

  beforeEach(() => {
    vi.stubGlobal('trustedTypes', {
      createPolicy(name, rules) {
        policies.push(name);
        return { createHTML: input => new FakeTrustedHTML(rules.createHTML(input)) };
      },
    });
    restore = enforceTrustedTypes();
  });

  afterEach(() => {
    restore();
    document.body.replaceChildren();
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
});
