import { Parallelogram } from '../../src/index.js';
import { installMockApi } from './mocks.js';

const contracts = import.meta.glob('../../src/components/*.contract.js', {
  eager: true,
  import: 'default',
});
const modules = import.meta.glob([
  '../../src/components/*.js',
  '!../../src/components/*.contract.js',
]);

installMockApi();

const app = Parallelogram.create({
  router: { timeout: 10000 },
  pageManager: {
    containerSelector: '[data-view="main"]',
    targetGroups: { main: ['main', 'sidebar'] },
  },
});

/**
 * The DeferTracker example names an adapter called example, which loads nothing
 */
const withExampleTracker = load => async () => {
  const module = await load();
  module.registerTrackerAdapter('example', () => Promise.resolve());
  return module;
};

for (const contract of Object.values(contracts)) {
  const selector = contract.match ?? contract.tag ?? `[${contract.selector}]`;
  const load = modules[`../../src/${contract.module}.js`];
  app.components.add(selector, contract.name === 'DeferTracker' ? withExampleTracker(load) : load);
}
app.components.add('[data-example]', () => import('./playground/ExamplePlayground.js'));

app.run();
