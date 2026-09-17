import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exampleBlock } from '../../../site/build/render.js';
import Accordion from '../../../src/components/Accordion.contract.js';
import FormEnhancer from '../../../src/components/FormEnhancer.contract.js';
import siteStyles from '../../../site/src/styles/site.scss';

const luminance = colour => {
  const [r, g, b] = colour.match(/[\d.]+/g).map(Number);
  const channel = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const mountExample = (contract, exampleId) => {
  const host = document.createElement('div');
  host.innerHTML = exampleBlock(
    contract,
    contract.examples.find(example => example.id === exampleId)
  );
  document.body.append(host);
  return host.querySelector('.example__stage');
};

describe('the example stage in the dark theme', () => {
  let style;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = siteStyles;
    document.head.append(style);
    document.documentElement.dataset.theme = 'dark';
  });

  afterEach(() => {
    style.remove();
    delete document.documentElement.dataset.theme;
    document.body.replaceChildren();
  });

  it('is a dark ground with readable text, and native controls follow it', () => {
    const stage = mountExample(Accordion, Accordion.examples[0].id);
    const summary = stage.querySelector('summary');
    const form = mountExample(FormEnhancer, FormEnhancer.examples[0].id);
    const input = form.querySelector('input');
    const button = form.querySelector('button');

    /* The stage was #fff with dark text and color-scheme: light regardless of theme, so every
       component sat on a light patch with the dark theme's light text over it */
    expect({
      stageIsDark: luminance(getComputedStyle(stage).backgroundColor) < 0.2,
      summaryContrast: Math.round(
        contrast(
          luminance(getComputedStyle(summary).color),
          luminance(getComputedStyle(stage).backgroundColor)
        )
      ),
      inputScheme: getComputedStyle(input).colorScheme,
      buttonIsLight: luminance(getComputedStyle(button).backgroundColor) > 0.5,
    }).toEqual({
      stageIsDark: true,
      summaryContrast: expect.any(Number),
      inputScheme: 'dark',
      buttonIsLight: false,
    });
    expect(
      contrast(
        luminance(getComputedStyle(summary).color),
        luminance(getComputedStyle(stage).backgroundColor)
      )
    ).toBeGreaterThanOrEqual(4.5);
  });
});
