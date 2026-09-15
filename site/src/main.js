import { Parallelogram } from '../../src/index.js';
import { registerComponents } from './components.js';
import { installMockApi } from './mocks.js';

installMockApi();

const app = Parallelogram.create({
  router: { timeout: 10000 },
  pageManager: {
    containerSelector: '[data-view="main"]',
    targetGroups: { main: ['main', 'sidebar'] },
  },
});

registerComponents(app);
app.components.add('[data-example]', () => import('./playground/ExamplePlayground.js'));
app.components.add('[data-design-workbench]', () => import('./workbench/DesignWorkbench.js'));

app.run();
