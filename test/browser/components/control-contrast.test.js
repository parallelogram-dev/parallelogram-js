import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PSelect.js';
import frameworkStyles from '../../../src/styles/framework/index.scss';

/**
 * Red, green and blue from 0 to 255 and alpha from 0 to 1, from a computed rgb() or color(srgb) value
 */
const parse = value => {
  const srgb = value.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/);
  if (srgb) {
    return [...srgb.slice(1, 4).map(channel => Number(channel) * 255), Number(srgb[4] ?? 1)];
  }
  const [red, green, blue, alpha = 1] = value.match(/[\d.]+/g).map(Number);
  return [red, green, blue, alpha];
};

/**
 * The opaque colour a computed colour shows over an opaque background
 */
const over = (value, background) => {
  const [red, green, blue, alpha] = parse(value);
  return [red, green, blue].map((channel, i) => channel * alpha + background[i] * (1 - alpha));
};

const luminance = colour =>
  colour
    .map(channel => channel / 255)
    .map(channel => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);

const ratio = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

const shadowStyle = (host, selector, pseudo) =>
  getComputedStyle(host.shadowRoot.querySelector(selector), pseudo);

describe('form control contrast', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.removeAttribute('style');
    delete document.documentElement.dataset.theme;
    document.head.querySelector('style[data-contrast-test]')?.remove();
  });

  it.each([
    ['light', '#161b24'],
    ['dark', '#e4e8ee'],
  ])('meets WCAG AA for borders and text in the %s theme', (theme, ink) => {
    const style = document.createElement('style');
    style.dataset.contrastTest = '';
    style.textContent = frameworkStyles;
    document.head.append(style);
    document.documentElement.dataset.theme = theme;
    document.body.style.color = ink;

    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'));
    const empty = document.createElement('p-datetime');
    const range = document.createElement('p-datetime');
    for (const [name, value] of Object.entries({
      mode: 'date',
      range: '',
      'range-to': 'to',
      value: '2023-07-10',
      'range-to-value': '2023-07-20',
    })) {
      range.setAttribute(name, value);
    }
    document.body.append(select, empty, range);

    const surface = over(getComputedStyle(empty).backgroundColor, [255, 255, 255]);
    const panel = over(shadowStyle(range, '.panel').backgroundColor, surface);
    const placeholder = shadowStyle(empty, '.input', '::before');
    const start = shadowStyle(range, '[data-date="2023-07-10"]');
    const inRange = shadowStyle(range, '[data-date="2023-07-15"]');
    const inRangeBg = over(inRange.backgroundColor, panel);

    const measured = {
      'p-select border': [
        ratio(over(getComputedStyle(select).borderTopColor, surface), surface),
        3,
      ],
      'p-datetime border': [
        ratio(over(getComputedStyle(empty).borderTopColor, surface), surface),
        3,
      ],
      'p-datetime time select border': [
        ratio(over(shadowStyle(range, '.time-select').borderTopColor, panel), panel),
        3,
      ],
      'p-datetime placeholder': [
        Number(placeholder.opacity) * ratio(over(placeholder.color, surface), surface),
        4.5,
      ],
      'p-datetime range start': [
        ratio(
          over(start.color, over(start.backgroundColor, panel)),
          over(start.backgroundColor, panel)
        ),
        4.5,
      ],
      'p-datetime in-range day': [
        Number(inRange.opacity) * ratio(over(inRange.color, inRangeBg), inRangeBg),
        4.5,
      ],
    };

    expect(
      Object.entries(measured)
        .filter(([, [value, minimum]]) => value < minimum)
        .map(([name, [value]]) => `${name}: ${value.toFixed(2)}`)
    ).toEqual([]);
  });
});
