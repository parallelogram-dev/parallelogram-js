import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const displayOf = selector => getComputedStyle(document.querySelector(selector)).display;
const opacityOf = selector => getComputedStyle(document.querySelector(selector)).opacity;

describe('framework stylesheet', () => {
  let style;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
  });

  afterEach(() => {
    style.remove();
    document.body.replaceChildren();
  });

  it('hides closed toggle targets', () => {
    document.body.innerHTML = '<nav id="menu" data-toggle-state="closed">Links</nav>';

    expect(displayOf('#menu')).toBe('none');
  });

  it('shows only the first tab panel before Tabs loads', () => {
    document.body.innerHTML = `
      <div data-tabs>
        <div data-tabs-panels>
          <section id="shipping" data-tab-panel>Shipping</section>
          <section id="returns" data-tab-panel>Returns</section>
        </div>
      </div>`;

    expect([displayOf('#shipping'), displayOf('#returns')]).toEqual(['block', 'none']);
  });

  it('shows every tab panel when Tabs fails to load', () => {
    document.body.innerHTML = `
      <div data-tabs class="component-error">
        <div data-tabs-panels>
          <section id="shipping" data-tab-panel>Shipping</section>
          <section id="returns" data-tab-panel>Returns</section>
        </div>
      </div>`;

    expect([displayOf('#shipping'), displayOf('#returns')]).toEqual(['block', 'block']);
  });

  it('shows content Scrollreveal was going to reveal when it fails to load', () => {
    document.body.innerHTML = `
      <p id="waiting" data-reveal>Later</p>
      <p id="failed" data-reveal class="component-error">Now</p>`;

    expect([opacityOf('#waiting'), opacityOf('#failed')]).toEqual(['0', '1']);
  });

  it('keeps revealed content visible and hides content Scrollreveal is waiting to reveal', () => {
    document.body.innerHTML = `
      <p id="waiting" data-reveal data-reveal-enhanced="true" data-reveal-state="hidden">Later</p>
      <p id="revealed" data-reveal data-reveal-enhanced="true" data-reveal-state="visible">Now</p>`;

    expect([opacityOf('#waiting'), opacityOf('#revealed')]).toEqual(['0', '1']);
  });
});
