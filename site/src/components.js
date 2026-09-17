import contracts from 'virtual:contracts';

const modules = import.meta.glob([
  '../../src/components/*.js',
  '!../../src/components/*.contract.js',
]);

/**
 * The DeferTracker example names an adapter called example, which loads nothing
 */
const withExampleTracker = load => async () => {
  const module = await load();
  module.registerTrackerAdapter('example', () => Promise.resolve());
  return module;
};

/**
 * Register every documented component, loaded the first time a page uses it
 *
 * @param {import('../../src/index.js').Parallelogram} app
 */
export function registerComponents(app) {
  for (const contract of contracts) {
    const selector = contract.match ?? contract.tag ?? `[${contract.selector}]`;
    const load = modules[`../../src/${contract.module}.js`];
    app.components.add(
      selector,
      contract.name === 'DeferTracker' ? withExampleTracker(load) : load
    );
  }
}
