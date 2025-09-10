import './scss/base.scss';

// demo/basic/src/main.js
import {DevLogger, EventBus} from '@contenir/core';
import {RouterManager} from '@contenir/router';
import {PageManager} from '@contenir/page';
import {AlertManager} from '@contenir/ui';
import '@contenir/components'; // registers <x-modal>, etc.

// Optional: if your HTML uses <cn-alerts>, alias it to <x-toasts> so it keeps working
if (!customElements.get('cn-alerts')) {
    customElements.define(
        'cn-alerts',
        class extends HTMLElement {
            connectedCallback() {
                const toasts = document.createElement('x-toasts');
                // carry over placement if you set it on <cn-alerts>
                if (this.hasAttribute('placement')) {
                    toasts.setAttribute('placement', this.getAttribute('placement'));
                } else {
                    toasts.setAttribute('placement', 'top-right');
                }
                this.replaceWith(toasts);
            }
        }
    );
}

const eventBus = new EventBus();
const logger = new DevLogger('demo', true);
const router = new RouterManager({eventBus, logger});
const alerts = new AlertManager({
    logger: new DevLogger('alerts', true),
    eventBus,
});

// If/when you add components, place them here.
// For now the registry is empty, so PageManager just swaps fragments.
const registry = [];

const pageLogger = new DevLogger('page', true);
const pages = new PageManager({
        containerSelector: '#app',
    },
    registry,
    eventBus,
    pageLogger,
    router
);

// Simple in-memory routes for the demo
const routes = {
    '/demo/home': `
    <section class="grid">
      <article class="card">
        <h2>Home</h2>
        <p>This HTML came from a client-side route map.</p>
      </article>
    </section>`,
    '/demo/gallery': `
    <section class="grid">
      ${[1, 2, 3, 4]
        .map(
            (i) => `
        <article class="card">
          <img data-component="lazy-image" data-src="https://picsum.photos/seed/${i}/1200/800" alt="Random ${i}" />
        </article>`
        )
        .join('')}
    </section>`,
    '/demo/about': `
    <section class="grid">
      <article class="card">
        <h2>About</h2>
        <p>SPA-style navigation replacing only the #app fragment.</p>
      </article>
    </section>`,
};

// Monkey-patch RouterManager.get to serve from the route map in this demo
const realGet = router.get.bind(router);
router.get = async function (url) {
    const path = (typeof url === 'string' ? new URL(url, location.href) : url).pathname;
    if (routes[path]) {
        return {
            res: {ok: true, status: 200, headers: {get: () => 'text/html'}},
            data: routes[path],
        };
    }
    return realGet(url);
};

// Intercept same-origin <a> clicks for SPA navigation
document.addEventListener('click', (ev) => {
    const a = ev.target?.closest?.('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    ev.preventDefault();
    router.navigate(url.toString()).catch(() => {
    }); // errors are toast-notified
});

// Some example route event logging + error toast
eventBus.on('route:start', ({url}) => logger.info('route:start', url.toString()));
eventBus.on('route:success', ({url}) => logger.info('route:success', url.toString()));
eventBus.on('route:error', ({error}) =>
    alerts.toast({message: `Navigation failed: ${error?.message || 'Unknown error'}`, type: 'error'})
);

// Initial hydration
window.addEventListener('DOMContentLoaded', () => {
    // If you later add components, they will be mounted here:
    const root = document.querySelector('#app');
    eventBus.emit('fragment:did-mount', {root});
    pages.mountAllWithin(root);

    // Wire the example buttons if present
    const btnToast = document.getElementById('btn-toast');
    const btnProgress = document.getElementById('btn-progress');

    btnToast?.addEventListener('click', () =>
        alerts.toast({message: 'Saved!', type: 'success', timeout: 1800})
    );

    btnProgress?.addEventListener('click', async () => {
        const p = alerts.progress({
            message: 'Uploading… 0%',
            determinate: true,
            value: 0,
            max: 100,
            cancellable: true,
        });
        for (let i = 0; i <= 100; i += 10) {
            // just a demo loop
            await new Promise((r) => setTimeout(r, 150));
            p.set(i);
            p.setMessage(`Uploading… ${i}%`);
        }
        p.succeed('Upload complete');
    });
});
