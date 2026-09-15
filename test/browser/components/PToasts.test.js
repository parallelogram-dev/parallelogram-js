import { afterEach, describe, expect, it, vi } from 'vitest';
import PToasts from '../../../src/components/PToasts.js';
import '../../../src/components/PModal.js';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const WAIT = { timeout: 2000 };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const mount = (attributes = {}) => {
  const host = document.createElement('p-toasts');
  for (const [name, value] of Object.entries(attributes)) {
    host.setAttribute(name, value);
  }
  document.body.append(host);
  return host;
};

const toasts = host => [...host.shadowRoot.querySelectorAll('.toast')];
const lastToast = host => toasts(host).at(-1);
const region = (host, role) => host.shadowRoot.querySelector(`[role="${role}"]`);

describe('p-toasts', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('registers the p-toasts custom element', () => {
    expect(customElements.get('p-toasts')).toBe(PToasts);
    expect(mount()).toBeInstanceOf(PToasts);
  });

  it('renders the message as text rather than markup by default', () => {
    const host = mount();

    host.toast({ message: '<img src=x onerror="window.__pwned = true">', timeout: 0 });

    const message = host.shadowRoot.querySelector('.msg');
    expect(message.textContent).toBe('<img src=x onerror="window.__pwned = true">');
    expect(message.querySelector('img')).toBeNull();
  });

  it('announces through live regions that exist before the first toast', async () => {
    const host = mount();
    const regionsBeforeToasts = [Boolean(region(host, 'status')), Boolean(region(host, 'alert'))];

    host.toast({ message: 'Booking saved', type: 'success', timeout: 0 });
    host.toast({ message: 'Payment failed', type: 'error', timeout: 0 });

    await vi.waitFor(
      () =>
        expect([
          regionsBeforeToasts,
          region(host, 'status').textContent,
          region(host, 'alert').textContent,
          toasts(host).map(toast => toast.getAttribute('role')),
        ]).toEqual([[true, true], 'Booking saved', 'Payment failed', [null, null]]),
      WAIT
    );
  });

  it('styles and announces "warn" toasts the same way as "warning" toasts', async () => {
    const host = mount();

    host.toast({ message: 'Storage almost full', type: 'warn', timeout: 0 });

    const toast = lastToast(host);
    await vi.waitFor(
      () => expect(region(host, 'alert').textContent).toBe('Storage almost full'),
      WAIT
    );
    expect(toast.classList.contains('warning')).toBe(true);
    expect(getComputedStyle(toast).backgroundColor).not.toBe(TRANSPARENT);
  });

  it('keeps toasts of an unknown type readable', () => {
    const host = mount();

    host.toast({ message: 'Syncing', type: 'sync', timeout: 0 });

    expect(getComputedStyle(lastToast(host)).backgroundColor).not.toBe(TRANSPARENT);
  });

  it('fires p-toasts:close when the dismiss button is pressed', async () => {
    const host = mount();
    const closed = new Promise(resolve => host.addEventListener('p-toasts:close', resolve));

    host.toast({ message: 'Saved', timeout: 0 });
    host.shadowRoot.querySelector('.close').click();

    const event = await closed;
    expect(event.detail).toMatchObject({ type: 'info', message: 'Saved' });
  });

  it('waits while the pointer is over the toasts', async () => {
    const host = mount();
    host.toast({ message: 'Booking saved', timeout: 150 });
    const stack = host.shadowRoot.querySelector('[part="stack"]');

    stack.dispatchEvent(new PointerEvent('pointerenter'));
    await pause(400);
    const whilePaused = toasts(host).length;
    stack.dispatchEvent(new PointerEvent('pointerleave'));

    await vi.waitFor(() => expect([whilePaused, toasts(host).length]).toEqual([1, 0]), WAIT);
  });

  it('keeps error toasts until they are dismissed', () => {
    vi.useFakeTimers();
    const host = mount();

    host.toast({ message: 'Payment failed', type: 'error' });
    vi.advanceTimersByTime(60_000);

    expect(toasts(host)).toHaveLength(1);
  });

  it('accepts a title, a duration and dismissible: false', async () => {
    const host = mount();

    host.toast({ message: 'Saved', title: 'Booking', duration: 100, dismissible: false });
    const toast = lastToast(host);
    const rendered = [toast.querySelector('.title')?.textContent, toast.querySelector('.close')];

    await vi.waitFor(
      () => expect([rendered, toasts(host).length]).toEqual([['Booking', null], 0]),
      WAIT
    );
  });

  it('gives the dismiss button a target of at least 24 by 24 pixels', () => {
    const host = mount();

    host.toast({ message: 'Saved', timeout: 0 });

    const { width, height } = host.shadowRoot.querySelector('.close').getBoundingClientRect();
    expect([width >= 24, height >= 24]).toEqual([true, true]);
  });

  it('centres toasts with the top-center placement', () => {
    const host = mount({ placement: 'top-center' });

    host.toast({ message: 'Saved', timeout: 0 });

    const box = host.getBoundingClientRect();
    expect(Math.abs(box.left + box.width / 2 - window.innerWidth / 2)).toBeLessThan(2);
  });

  it('shows toasts above an open modal dialog', async () => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Checkout</h2><p>Card details</p>';
    const host = mount();
    document.body.append(modal);
    modal.open();
    await pause(50);

    host.toast({ message: 'Payment failed', type: 'error', timeout: 0 });

    const box = lastToast(host).getBoundingClientRect();
    expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(
      host
    );
  });

  it('returns to its place once the modal closes', async () => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Checkout</h2><p>Card details</p>';
    const host = mount();
    document.body.append(modal);
    modal.open();
    host.toast({ message: 'Payment failed', type: 'error', timeout: 0 });
    const insideModal = modal.contains(host);

    modal.close();

    await vi.waitFor(
      () => expect([insideModal, host.parentNode]).toEqual([true, document.body]),
      WAIT
    );
  });

  it('makes toasts at least 300 pixels wide when the screen allows', () => {
    const host = mount();

    host.toast({ message: 'Saved', timeout: 0 });

    const expected = Math.min(300, window.innerWidth - 32);
    expect(lastToast(host).getBoundingClientRect().width).toBeGreaterThanOrEqual(expected - 1);
  });
});
