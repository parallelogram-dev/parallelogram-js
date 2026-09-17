import { afterEach, describe, expect, it, vi } from 'vitest';
import { designSystemPage } from '../../../site/build/render.js';
import DesignWorkbench from '../../../site/src/workbench/DesignWorkbench.js';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const groups = [
  {
    id: 'palette',
    title: 'Palette',
    tokens: [
      { name: '--color-accent', kind: 'colour' },
      { name: '--surface-panel-radius', kind: 'length' },
    ],
  },
];
const TOKENS = groups[0].tokens.map(token => token.name);
const WAIT = { timeout: 2500 };

const mountWorkbench = () => {
  const host = document.createElement('div');
  host.innerHTML = designSystemPage(new Map(), new Map(), groups);
  document.body.append(host);
  const element = host.querySelector('[data-design-workbench]');
  new DesignWorkbench().mount(element);
  const field = name => element.querySelector(`[data-token-input][name="${name}"]`);
  return {
    element,
    field,
    token: name => field(name).closest('.tokens__token'),
    output: () => element.querySelector('[data-workbench-output]').textContent,
  };
};

const applyStyles = () => {
  const style = document.createElement('style');
  style.textContent = frameworkStyles;
  document.head.append(style);
  return style;
};

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

describe('design workbench', () => {
  let style;

  afterEach(() => {
    style?.remove();
    style = null;
    document.body.replaceChildren();
    for (const name of TOKENS) document.documentElement.style.removeProperty(name);
  });

  it('reads the values once the stylesheet has applied, even when that is after it mounted', async () => {
    const { field, token } = mountWorkbench();
    await nextFrame();
    await nextFrame();
    const beforeStyles = [field('--color-accent').value, field('--surface-panel-radius').value];

    /* A development server can serve the stylesheet after the module has run; the page once
       showed white swatches and empty fields for exactly that, until a read that tries again */
    style = applyStyles();

    await vi.waitFor(() => expect(field('--surface-panel-radius').value).toBe('0.5em'), WAIT);
    expect({
      beforeStyles,
      radius: field('--surface-panel-radius').value,
      picker: token('--color-accent').querySelector('.tokens__picker')?.value,
      slider: token('--surface-panel-radius').querySelector('.tokens__slider')?.value,
    }).toEqual({ beforeStyles: ['', ''], radius: '0.5em', picker: '#3b82f6', slider: '0.5' });
  });

  it('writes a change onto the page and into the CSS to copy, and undoes it on reset', async () => {
    style = applyStyles();
    const { element, field, token, output } = mountWorkbench();
    await vi.waitFor(() => expect(field('--surface-panel-radius').value).toBe('0.5em'), WAIT);
    const root = document.documentElement.style;

    const slider = token('--surface-panel-radius').querySelector('.tokens__slider');
    slider.value = '1';
    slider.dispatchEvent(new Event('input'));
    const changed = [root.getPropertyValue('--surface-panel-radius'), output()];

    element
      .querySelector('[data-workbench-controls]')
      .dispatchEvent(new Event('reset', { cancelable: true }));

    expect({
      changed,
      afterReset: [root.getPropertyValue('--surface-panel-radius'), output()],
    }).toEqual({
      changed: ['1em', expect.stringContaining('--surface-panel-radius: 1em;')],
      afterReset: ['', '/* No changes yet */'],
    });
  });
});
