import { afterEach, describe, expect, it } from 'vitest';
import PToasts from '../../../src/components/PToasts.js';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const mount = () => {
  const host = document.createElement('p-toasts');
  document.body.append(host);
  return host;
};

const lastToast = host => [...host.shadowRoot.querySelectorAll('.toast')].at(-1);

describe('p-toasts', () => {
  afterEach(() => {
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

  it('announces errors as alerts and other types as status messages', () => {
    const host = mount();

    host.toast({ message: 'Saved', type: 'success', timeout: 0 });
    host.toast({ message: 'Failed', type: 'error', timeout: 0 });

    const roles = [...host.shadowRoot.querySelectorAll('.toast')].map(t => t.getAttribute('role'));
    expect(roles).toEqual(['status', 'alert']);
  });

  it('styles and announces "warn" toasts the same way as "warning" toasts', () => {
    const host = mount();

    host.toast({ message: 'Storage almost full', type: 'warn', timeout: 0 });

    const toast = lastToast(host);
    expect(toast.classList.contains('warning')).toBe(true);
    expect(toast.getAttribute('role')).toBe('alert');
    expect(getComputedStyle(toast).backgroundColor).not.toBe(TRANSPARENT);
  });

  it('keeps toasts of an unknown type readable', () => {
    const host = mount();

    host.toast({ message: 'Syncing', type: 'sync', timeout: 0 });

    expect(getComputedStyle(lastToast(host)).backgroundColor).not.toBe(TRANSPARENT);
  });

  it('fires toast:close when the dismiss button is pressed', async () => {
    const host = mount();
    const closed = new Promise(resolve => host.addEventListener('toast:close', resolve));

    host.toast({ message: 'Saved', timeout: 0 });
    host.shadowRoot.querySelector('.close').click();

    const event = await closed;
    expect(event.detail).toMatchObject({ type: 'info', message: 'Saved' });
  });
});
