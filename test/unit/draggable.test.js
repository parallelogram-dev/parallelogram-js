import { afterEach, describe, expect, it } from 'vitest';
import * as entry from '../../src/draggable.js';
import { Sortable } from '../../src/draggable.js';
import { Sortable as Engine } from '../../src/utils/draggable/Sortable.js';

const press = (target, key) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

const makeList = () => {
  document.body.innerHTML = `<form><ul>
    <li tabindex="0">One <input type="radio" name="choice" value="1" checked></li>
    <li tabindex="0">Two <input type="radio" name="other" value="2"></li>
  </ul></form>`;
  return document.querySelector('ul');
};

describe('draggable entry', () => {
  let sorter;

  afterEach(() => {
    sorter?.destroy();
    sorter = null;
    document.body.replaceChildren();
  });

  it('exports the engine the components are built on', () => {
    expect(Sortable).toBe(Engine);
    expect(Object.keys(entry).sort()).toEqual([
      'AbstractPlugin',
      'Draggable',
      'Droppable',
      'Focusable',
      'KeyboardSensor',
      'Mirror',
      'PointerSensor',
      'Scrollable',
      'Sensor',
      'Sortable',
      'Swappable',
      'closest',
    ]);
  });

  it('holds a dragged row with the placeholder it is given, leaving the row its checked radio', () => {
    const list = makeList();
    const [first] = list.children;
    sorter = new Sortable([list], {
      draggable: 'li',
      placeholder: item => item.cloneNode(false),
    });
    const stops = [];
    sorter.on('sortable:stop', ({ oldIndex, newIndex }) => stops.push({ oldIndex, newIndex }));

    first.focus();
    press(first, ' ');
    const placeholder = list.querySelector('[data-draggable-item-state="placeholder"]');
    expect(placeholder.children).toHaveLength(0);
    expect(first.querySelector('input').checked).toBe(true);

    press(document.activeElement, 'ArrowDown');
    press(document.activeElement, ' ');
    expect(stops).toEqual([{ oldIndex: 0, newIndex: 1 }]);
    expect(list.lastElementChild).toBe(first);
    expect(first.querySelector('input').checked).toBe(true);
  });
});
