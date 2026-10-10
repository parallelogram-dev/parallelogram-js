import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Sortable } from '../../../src/utils/draggable/Sortable.js';
import { drag } from '../support/drag.js';

/* An item whose construction is counted, to tell a copy made by cloneNode() from one built by hand */
let constructed = 0;
class CountedItem extends HTMLElement {
  constructor() {
    super();
    constructed++;
  }
}
customElements.define('counted-item', CountedItem);

describe('the drag engine', () => {
  let style;
  let list;
  let engine;

  beforeEach(() => {
    constructed = 0;
    style = document.createElement('style');
    style.textContent = `
      #list { display: block; width: 240px; padding: 0; }
      #list > * { display: block; height: 32px; }`;
    document.head.append(style);
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="list">${['a', 'b', 'c']
        .map(id => `<counted-item data-id="${id}">Item ${id}</counted-item>`)
        .join('')}</div>`
    );
    list = document.getElementById('list');
    constructed = 0;
  });

  afterEach(() => {
    engine?.destroy();
    engine = null;
    style.remove();
    document.body.replaceChildren();
  });

  const ids = () => [...list.children].map(item => item.dataset.id);

  it('builds the placeholder from the placeholder option rather than copying the item', async () => {
    let placeholder = null;
    engine = new Sortable([list], {
      draggable: 'counted-item',
      distance: 4,
      placeholder: () => Object.assign(document.createElement('div'), { className: 'slot' }),
    });
    engine.on('drag:start', event => (placeholder = event.source.className));

    await drag(list.children[0], list.children[2], { dy: 6 });

    expect({ placeholder, constructed, order: ids() }).toEqual({
      placeholder: 'slot',
      constructed: 0,
      order: ['b', 'c', 'a'],
    });
  });

  it('follows the pointer with the mirror option’s element, at its own width', async () => {
    let mirror = null;
    engine = new Sortable([list], {
      draggable: 'counted-item',
      distance: 4,
      placeholder: () => document.createElement('div'),
      mirror: {
        create: (_source, originalSource) =>
          Object.assign(document.createElement('span'), {
            className: 'chip',
            textContent: originalSource.dataset.id,
          }),
      },
    });

    await drag(list.children[0], list.children[2], {
      during: () => {
        const chip = document.querySelector('.chip');
        mirror = chip && {
          text: chip.textContent,
          width: chip.style.width,
          position: chip.style.position,
          state: chip.getAttribute('data-draggable-item-state'),
        };
      },
    });

    expect({ mirror, constructed, left: document.querySelector('.chip') }).toEqual({
      mirror: { text: 'a', width: '', position: 'fixed', state: 'mirror' },
      constructed: 0,
      left: null,
    });
  });

  it('starts a drag from a handle inside an item’s shadow root, and only from the handle', async () => {
    for (const item of list.children) {
      item.attachShadow({ mode: 'open' }).innerHTML =
        '<span part="grip" style="display:block;height:16px">grip</span><span style="display:block;height:16px">body</span>';
    }
    engine = new Sortable([list], {
      draggable: 'counted-item',
      handle: '[part~="grip"]',
      distance: 4,
      placeholder: () => document.createElement('div'),
    });
    const [first, second, third] = list.children;
    const grip = item => item.shadowRoot.querySelector('[part~="grip"]');
    const body = item => item.shadowRoot.querySelector('span:not([part])');

    await drag(body(first), third, { dy: 6 });
    const fromBody = ids();
    await drag(grip(first), third, { dy: 6 });

    expect([fromBody, ids(), second.isConnected]).toEqual([['a', 'b', 'c'], ['b', 'c', 'a'], true]);
  });
});
