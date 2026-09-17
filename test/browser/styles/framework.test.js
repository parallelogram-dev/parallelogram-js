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

  it('lets a page set the brand once and the accent follow it', () => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', 'rgb(1, 2, 3)');
    const accent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
    root.style.removeProperty('--brand-primary');

    /* The brand layer is where a page sets its colour once; --color-accent is the mechanical role
       every component reads, and it follows the brand unless the page overrides the role itself */
    expect(accent).toBe('rgb(1, 2, 3)');
  });

  it('lets a page set a second brand colour, and leaves it as the accent until it does', () => {
    const root = document.documentElement;
    const read = name => getComputedStyle(root).getPropertyValue(name).trim();

    const untouched = [read('--color-secondary'), read('--color-complimentary')];
    root.style.setProperty('--brand-secondary', 'rgb(4, 5, 6)');
    const set = read('--color-secondary');
    root.style.removeProperty('--brand-secondary');

    /* The promise is that adding these roles changed nothing for a page that does not set them:
       both are the accent until asked otherwise, so the second value here is what guards that */
    expect([set, untouched]).toEqual([
      'rgb(4, 5, 6)',
      [read('--color-accent'), read('--color-accent')],
    ]);
  });

  it('hides a web component until its module upgrades it', () => {
    /* This file never imports the components, so these tags stay unupgraded and :not(:defined)
       applies, which is the state a page is in while the module is still on its way */
    document.body.insertAdjacentHTML(
      'beforeend',
      `<p-modal id="modal"><h2 slot="title">Release this table?</h2><p>It goes to the waitlist.</p></p-modal>
       <p-select id="select"><option value="bar">Bar</option></p-select>
       <p-datetime id="datetime"></p-datetime>
       <p-uploader id="uploader"></p-uploader>
       <p-toasts id="toasts"></p-toasts>`
    );

    expect(['#modal', '#select', '#datetime', '#uploader', '#toasts'].map(displayOf)).toEqual([
      'none',
      'none',
      'none',
      'none',
      'none',
    ]);
  });

  it('hides closed toggle targets', () => {
    document.body.innerHTML = '<nav id="menu" data-toggle-state="closed">Links</nav>';

    expect(displayOf('#menu')).toBe('none');
  });

  it('keeps closed toggle targets hidden and open ones in their own display inside a cascade layer', () => {
    style.textContent = `@layer parallelogram { ${frameworkStyles} }\n.menu { display: flex; }`;
    document.body.innerHTML = `
      <nav id="closed" class="menu" data-toggle-state="closed" hidden>Links</nav>
      <nav id="open" class="menu" data-toggle-state="open">Links</nav>`;

    expect([displayOf('#closed'), displayOf('#open')]).toEqual(['none', 'flex']);
  });

  it('keeps inactive tab panels hidden inside a cascade layer when page styles set their display', () => {
    style.textContent = `@layer parallelogram { ${frameworkStyles} }\n.panel { display: grid; }`;
    document.body.innerHTML = `
      <div data-tabs data-tabs-enhanced="true">
        <div data-tabs-panels>
          <section id="active" class="panel" data-tab-panel="active">Shipping</section>
          <section id="inactive" class="panel" data-tab-panel="inactive" hidden>Returns</section>
        </div>
      </div>`;

    expect([displayOf('#active'), displayOf('#inactive')]).toEqual(['grid', 'none']);
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
