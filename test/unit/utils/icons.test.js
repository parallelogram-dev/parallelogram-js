import { describe, expect, it } from 'vitest';
import {
  ICON_SIZES,
  arrowDown,
  chevronDown,
  iconElement,
  iconMarkup,
  trash,
  x,
} from '../../../src/utils/icons.js';

const parse = markup => new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;

describe('icons', () => {
  it('draws every icon on the same grid with the same stroke', () => {
    const drawn = [chevronDown, x, trash, arrowDown].map(paths => {
      const svg = parse(iconMarkup(paths));
      return [svg.getAttribute('viewBox'), svg.getAttribute('stroke-width')];
    });

    expect(drawn).toEqual([
      ['0 0 24 24', '2'],
      ['0 0 24 24', '2'],
      ['0 0 24 24', '2'],
      ['0 0 24 24', '2'],
    ]);
  });

  it('sizes an icon from its name, and marks anything but the default', () => {
    const sizes = ['md', 'sm', 'xs'].map(size => {
      const svg = parse(iconMarkup(chevronDown, { size }));
      return [svg.getAttribute('width'), svg.getAttribute('class')];
    });

    expect(sizes).toEqual([
      [String(ICON_SIZES.md), 'icon'],
      [String(ICON_SIZES.sm), 'icon icon--sm'],
      [String(ICON_SIZES.xs), 'icon icon--xs'],
    ]);
  });

  it('takes its colour from the text around it', () => {
    expect(parse(iconMarkup(x)).getAttribute('stroke')).toBe('currentColor');
  });

  it('hides icons from assistive technology, since the control carries the name', () => {
    expect([
      parse(iconMarkup(trash)).getAttribute('aria-hidden'),
      iconElement(trash).getAttribute('aria-hidden'),
    ]).toEqual(['true', 'true']);
  });

  it('builds the same icon as an element, without markup', () => {
    const element = iconElement(trash, { size: 'sm', class: 'uploader__icon' });

    expect([
      element.namespaceURI,
      element.getAttribute('class'),
      [...element.querySelectorAll('path')].map(path => path.getAttribute('d')),
    ]).toEqual(['http://www.w3.org/2000/svg', 'icon icon--sm uploader__icon', trash]);
  });
});
