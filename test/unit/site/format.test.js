import { describe, expect, it } from 'vitest';
import { describeDetail, serializeMarkup } from '../../../site/src/playground/format.js';

const fragment = html => document.createRange().createContextualFragment(html);

describe('playground formatting', () => {
  it('writes empty attributes without a value, as they are authored', () => {
    expect(
      serializeMarkup(fragment('<button data-toggle data-toggle-capture="">Menu</button>'))
    ).toBe('<button data-toggle data-toggle-capture>Menu</button>');
  });

  it('summarises elements and leaves out timestamps', () => {
    const target = document.createElement('nav');
    target.id = 'site-menu';

    expect(describeDetail({ target, timestamp: 12.5, open: true })).toBe(
      '{"target":"<nav#site-menu>","open":true}'
    );
  });

  it('cuts a long summary short', () => {
    const summary = describeDetail({ html: 'x'.repeat(400) });

    expect([summary.length, summary.endsWith('…')]).toEqual([160, true]);
  });
});
