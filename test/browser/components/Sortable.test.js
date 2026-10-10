import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Sortable from '../../../src/components/Sortable.js';
import styles from '../../../src/styles/framework/components/draggable.scss';
import { drag, nextFrames, press } from '../support/drag.js';

const order = list =>
  [...list.children].map(item => item.dataset.id + (item.style.display === 'none' ? '-' : ''));
const leftovers = () =>
  document.querySelectorAll(
    '[data-sortable-item-state="mirror"], [data-sortable-item-state="placeholder"]'
  ).length;
const announced = () => document.querySelector('[data-parallelogram-announcer]')?.textContent ?? '';

describe('Sortable', () => {
  let style;
  let sortable;
  let events;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${styles}
      [data-sortable] { display: block; width: 240px; margin: 0 0 16px; padding: 0; min-height: 40px; }
      [data-sortable] > * { display: block; height: 32px; margin: 0; list-style: none; }`;
    document.head.append(style);
    sortable = new Sortable();
    events = [];
    for (const type of ['sortable:start', 'sortable:sorted', 'sortable:stop', 'sortable:change']) {
      document.addEventListener(type, record);
    }
  });

  afterEach(() => {
    for (const type of ['sortable:start', 'sortable:sorted', 'sortable:stop', 'sortable:change']) {
      document.removeEventListener(type, record);
    }
    sortable.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  function record(event) {
    events.push({ type: event.type, list: event.target.id, ...event.detail });
  }

  const list = (id, ids, attributes = '') => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<ul id="${id}" data-sortable ${attributes}>${ids
        .map(item => `<li data-id="${item}">Item ${item.toUpperCase()}</li>`)
        .join('')}</ul>`
    );
    const element = document.getElementById(id);
    sortable.mount(element);
    return element;
  };

  it('moves an item to where it is dragged and reports the new order once', async () => {
    const element = list('tasks', ['a', 'b', 'c', 'd']);
    let mirrored = false;

    await drag(element.children[0], element.children[2], {
      dy: 6,
      during: () => (mirrored = leftovers() === 2),
    });

    const changes = events.filter(event => event.type === 'sortable:change');
    expect({
      mirrored,
      order: order(element),
      changes: changes.map(change => change.items.map(item => item.dataset.id)),
      indexes: changes.map(change => [change.oldIndex, change.newIndex]),
      state: element.getAttribute('data-sortable-state'),
      leftovers: leftovers(),
    }).toEqual({
      mirrored: true,
      order: ['b', 'c', 'a', 'd'],
      changes: [['b', 'c', 'a', 'd']],
      indexes: [[0, 2]],
      state: 'idle',
      leftovers: 0,
    });
  });

  it('leaves a press without movement to the click it is', async () => {
    const element = list('tasks', ['a', 'b']);

    await press(element.children[0], { hold: 150 });

    expect(events).toEqual([]);
  });

  it('drags by touch after a finger rests, and leaves a quick swipe to scroll', async () => {
    const element = list('tasks', ['a', 'b', 'c']);

    await drag(element.children[0], element.children[2], { pointerType: 'touch', dy: 6 });
    const swiped = order(element);
    await drag(element.children[0], element.children[2], {
      pointerType: 'touch',
      hold: 150,
      dy: 6,
    });

    expect([swiped, order(element)]).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c', 'a'],
    ]);
  });

  it('moves an item with the keyboard and keeps focus on it', async () => {
    const element = list('tasks', ['a', 'b', 'c']);
    element.children[0].focus();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    const lifted = order(element);
    await userEvent.keyboard(' ');
    await nextFrames();

    expect({
      lifted,
      order: order(element),
      focused: document.activeElement.dataset.id,
      announced: announced(),
    }).toEqual({
      lifted: ['a-', 'b', 'c', 'a'],
      order: ['b', 'c', 'a'],
      focused: 'a',
      announced: 'Dropped Item A.',
    });
  });

  it('puts an item back when Escape cancels the drag', async () => {
    const element = list('tasks', ['a', 'b', 'c']);
    element.children[0].focus();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Escape}');
    await nextFrames();

    expect({
      order: order(element),
      stops: events.filter(event => event.type === 'sortable:stop').map(stop => stop.reverted),
      changes: events.filter(event => event.type === 'sortable:change').length,
    }).toEqual({ order: ['a', 'b', 'c'], stops: [true], changes: 0 });
  });

  it('moves items between lists in the same group and reports both', async () => {
    const todo = list('todo', ['a', 'b'], 'data-sortable-group="board"');
    const done = list('done', [], 'data-sortable-group="board"');

    await drag(todo.children[0], done);

    expect({
      todo: order(todo),
      done: order(done),
      changed: events
        .filter(event => event.type === 'sortable:change')
        .map(event => [event.list, event.items.map(item => item.dataset.id)]),
    }).toEqual({
      todo: ['b'],
      done: ['a'],
      changed: [
        ['done', ['a']],
        ['todo', ['b']],
      ],
    });
  });

  it('carries an item into the next list in its group from the keyboard', async () => {
    const todo = list('todo', ['a', 'b'], 'data-sortable-group="board"');
    const done = list('done', ['c'], 'data-sortable-group="board"');
    todo.children[1].focus();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');

    expect([order(todo), order(done)]).toEqual([['a'], ['b', 'c']]);
  });

  it('starts a drag only from the handle when there is one', async () => {
    const element = list('tasks', [], 'data-sortable-handle=".grip"');
    element.innerHTML = ['a', 'b', 'c']
      .map(
        id =>
          `<li data-id="${id}"><span class="grip">::</span> <span class="label">${id}</span></li>`
      )
      .join('');
    await nextFrames();

    await drag(element.querySelector('.label'), element.children[2], { dy: 6 });
    const fromLabel = order(element);
    await drag(element.querySelector('.grip'), element.children[2], { dy: 6 });

    expect([fromLabel, order(element)]).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c', 'a'],
    ]);
  });

  it('lets a listener refuse a move with preventDefault()', async () => {
    const element = list('tasks', ['a', 'b', 'c']);
    element.addEventListener('sortable:sort', event => event.preventDefault());

    await drag(element.children[0], element.children[2], { dy: 6 });

    expect(order(element)).toEqual(['a', 'b', 'c']);
  });

  it('starts no drag while data-sortable-disabled is set', async () => {
    const element = list('tasks', ['a', 'b', 'c'], 'data-sortable-disabled');

    await drag(element.children[0], element.children[2], { dy: 6 });

    expect([order(element), leftovers()]).toEqual([['a', 'b', 'c'], 0]);
  });

  it('puts the item back when the list is unmounted mid-drag', async () => {
    const element = list('tasks', ['a', 'b', 'c']);
    element.children[0].focus();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    sortable.unmount(element);

    expect([order(element), leftovers(), element.hasAttribute('data-sortable-state')]).toEqual([
      ['a', 'b', 'c'],
      0,
      false,
    ]);
  });

  it('makes items added later reachable with Tab', async () => {
    const element = list('tasks', ['a']);
    element.insertAdjacentHTML('beforeend', '<li data-id="b">Item B</li>');
    await nextFrames();

    expect(element.children[1].tabIndex).toBe(0);
  });

  it('mounts on every matching element without the framework', () => {
    document.body.innerHTML = '<ul data-sortable><li>A</li></ul><ul data-sortable><li>B</li></ul>';
    const instance = Sortable.enhanceAll();

    expect([instance instanceof Sortable, instance.trackedElements().length]).toEqual([true, 2]);
    instance.destroy();
  });
});
