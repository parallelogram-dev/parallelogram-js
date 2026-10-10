import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Swappable from '../../../src/components/Swappable.js';
import styles from '../../../src/styles/framework/components/draggable.scss';
import { drag, nextFrames } from '../support/drag.js';

const order = grid => [...grid.children].map(tile => tile.dataset.id);

describe('Swappable', () => {
  let style;
  let swappable;
  let grid;
  let changes;
  const record = event => changes.push(event.detail.items.map(tile => tile.dataset.id));

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${styles}
      [data-swappable] { display: flex; gap: 8px; width: 400px; }
      [data-swappable] > * { width: 60px; height: 40px; }`;
    document.head.append(style);
    document.body.innerHTML = `<div data-swappable>${['a', 'b', 'c', 'd']
      .map(id => `<div data-id="${id}">${id.toUpperCase()}</div>`)
      .join('')}</div>`;
    grid = document.querySelector('[data-swappable]');
    swappable = new Swappable();
    swappable.mount(grid);
    changes = [];
    document.addEventListener('swappable:change', record);
  });

  afterEach(() => {
    document.removeEventListener('swappable:change', record);
    swappable.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  it('exchanges the dragged tile with the one it is dropped on, leaving the rest', async () => {
    await drag(grid.children[0], grid.children[2]);

    expect([order(grid), changes]).toEqual([['c', 'b', 'a', 'd'], [['c', 'b', 'a', 'd']]]);
  });

  it('swaps with the keyboard, and Escape undoes the swap', async () => {
    grid.children[0].focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Escape}');
    await nextFrames();
    const cancelled = order(grid);

    grid.children[0].focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');

    expect([cancelled, order(grid), changes.length]).toEqual([
      ['a', 'b', 'c', 'd'],
      ['b', 'a', 'c', 'd'],
      1,
    ]);
  });
});
