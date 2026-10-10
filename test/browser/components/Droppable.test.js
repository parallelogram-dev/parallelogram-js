import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Droppable from '../../../src/components/Droppable.js';
import styles from '../../../src/styles/framework/components/draggable.scss';
import { drag, nextFrames } from '../support/drag.js';

/* Each dropzone as name:items:state, counting what a visitor sees as in it: not the hidden
   original or the copy following the pointer */
const zones = () =>
  [...document.querySelectorAll('[data-droppable-zone]')].map(zone => {
    const items = [...zone.children]
      .filter(item => item.style.display !== 'none')
      .filter(item => item.getAttribute('data-droppable-item-state') !== 'mirror')
      .map(item => item.dataset.id)
      .join('');
    return `${zone.dataset.droppableZone}:${items}:${zone.getAttribute('data-droppable-zone-state')}`;
  });

describe('Droppable', () => {
  let style;
  let droppable;
  let changes;
  const record = event =>
    changes.push([
      event.detail.initialDropzone.dataset.droppableZone,
      event.detail.dropzone.dataset.droppableZone,
    ]);

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${styles}
      [data-droppable] { display: flex; gap: 16px; }
      [data-droppable-zone] { width: 100px; height: 60px; border: 1px solid; }
      [data-droppable-zone] > * { height: 40px; }`;
    document.head.append(style);
    document.body.innerHTML = `<div data-droppable>
      <div data-droppable-zone="inbox" aria-label="Inbox"><div data-id="p">Invoice</div></div>
      <div data-droppable-zone="review" aria-label="In review"></div>
      <div data-droppable-zone="paid" aria-label="Paid"></div>
    </div>`;
    droppable = new Droppable();
    droppable.mount(document.querySelector('[data-droppable]'));
    changes = [];
    document.addEventListener('droppable:change', record);
  });

  afterEach(() => {
    document.removeEventListener('droppable:change', record);
    droppable.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  const zone = name => document.querySelector(`[data-droppable-zone="${name}"]`);

  it('marks which dropzones are occupied without being told', () => {
    expect(zones()).toEqual(['inbox:p:occupied', 'review::empty', 'paid::empty']);
  });

  it('moves an item into the empty dropzone it is dropped on', async () => {
    let during;
    await drag(document.querySelector('[data-id="p"]'), zone('paid'), {
      during: () => (during = zones()),
    });
    await nextFrames();

    expect({ during, after: zones(), changes }).toEqual({
      during: ['inbox::available', 'review::available', 'paid:p:occupied'],
      after: ['inbox::empty', 'review::empty', 'paid:p:occupied'],
      changes: [['inbox', 'paid']],
    });
  });

  it('sends an item home when it is let go outside every dropzone', async () => {
    await drag(document.querySelector('[data-id="p"]'), zone('review'), {
      during: async () => {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 5,
            clientY: 400,
            pointerId: 1,
            isPrimary: true,
          })
        );
        await nextFrames();
      },
    });
    await nextFrames();

    expect([zones(), changes]).toEqual([['inbox:p:occupied', 'review::empty', 'paid::empty'], []]);
  });

  it('moves an item between free dropzones with the keyboard', async () => {
    document.querySelector('[data-id="p"]').focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    await nextFrames();

    expect([zones(), changes]).toEqual([
      ['inbox::empty', 'review::empty', 'paid:p:occupied'],
      [['inbox', 'paid']],
    ]);
  });
});
