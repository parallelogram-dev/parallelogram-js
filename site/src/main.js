import { Parallelogram } from '../../src/index.js';
import { registerComponents } from './components.js';
import { installMockApi } from './mocks.js';

installMockApi();

const app = Parallelogram.create({
  router: { timeout: 10000 },
  pageManager: {
    containerSelector: '[data-view="main"]',
    targetGroups: { main: ['main', 'sidebar'] },
    /* Only the reading column animates; the sidebar swap is just the current-page marker moving */
    targetGroupTransitions: {
      main: { out: 'page-leave', in: 'page-enter', duration: 300 },
    },
  },
});

registerComponents(app);
app.components.add('[data-example]', () => import('./playground/ExamplePlayground.js'));
app.components.add('[data-design-workbench]', () => import('./workbench/DesignWorkbench.js'));

app.run();

if (import.meta.hot) {
  /* During development a page reloads only when a save made it stale, not on every save */
  import.meta.hot.on('parallelogram:pages-changed', ({ slugs }) => {
    const current =
      location.pathname
        .split('/')
        .pop()
        .replace(/\.html$/, '') || 'index';
    if (slugs.includes(current)) location.reload();
  });
}
