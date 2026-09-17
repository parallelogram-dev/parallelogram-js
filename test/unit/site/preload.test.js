import { describe, expect, it } from 'vitest';
import { chunksFor, modulesFor, pagesAffectedBy } from '../../../site/build/preload.js';

const contracts = [
  { name: 'PDatetime', kind: 'element', tag: 'p-datetime', module: 'components/PDatetime' },
  { name: 'Toggle', kind: 'enhancement', selector: 'data-toggle', module: 'components/Toggle' },
  { name: 'Tabs', kind: 'enhancement', selector: 'data-tabs', module: 'components/Tabs' },
  {
    name: 'FormEnhancer',
    kind: 'enhancement',
    selector: 'data-form-enhancer',
    match: 'form[data-form-enhancer]',
    module: 'components/FormEnhancer',
  },
];

describe('preloading the chunks a page will need', () => {
  it('names the managers every page loads, and the components the markup uses', () => {
    const html = `<button data-toggle="menu">Menu</button><p-datetime name="from"></p-datetime>
      <p>The data-tabs-panel attribute is described here but not used.</p><div data-example></div>
      <form data-form-enhancer></form>`;

    /* `data-tabs-panel` is not the `data-tabs` attribute; a tag in prose is not an opening tag */
    expect(modulesFor(html, contracts)).toEqual([
      'src/managers/RouterManager.js',
      'src/core/FragmentSwapper.js',
      'src/components/PDatetime.js',
      'src/components/Toggle.js',
      'src/components/FormEnhancer.js',
      'site/src/playground/ExamplePlayground.js',
    ]);
  });

  it('resolves modules to their chunks with their static imports, less what main already loads', () => {
    const bundle = {
      'assets/main-1.js': {
        type: 'chunk',
        fileName: 'assets/main-1.js',
        imports: ['assets/core-1.js'],
      },
      'assets/core-1.js': { type: 'chunk', fileName: 'assets/core-1.js', imports: [] },
      'assets/RouterManager-1.js': {
        type: 'chunk',
        fileName: 'assets/RouterManager-1.js',
        facadeModuleId: '/repo/src/managers/RouterManager.js',
        imports: ['assets/core-1.js', 'assets/events-1.js'],
      },
      'assets/events-1.js': { type: 'chunk', fileName: 'assets/events-1.js', imports: [] },
      'assets/PDatetime-1.js': {
        type: 'chunk',
        fileName: 'assets/PDatetime-1.js',
        facadeModuleId: '/repo/src/components/PDatetime.js',
        imports: ['assets/events-1.js', 'assets/shadow-1.js'],
      },
      'assets/shadow-1.js': { type: 'chunk', fileName: 'assets/shadow-1.js', imports: [] },
      'assets/Tabs-1.js': {
        type: 'chunk',
        fileName: 'assets/Tabs-1.js',
        moduleIds: ['/repo/src/components/Tabs.js', '/repo/src/utils/motion.js'],
        imports: [],
      },
      'assets/main-1.css': { type: 'asset', fileName: 'assets/main-1.css' },
    };

    expect(
      chunksFor(
        [
          'src/managers/RouterManager.js',
          'src/components/PDatetime.js',
          'src/utils/motion.js',
          'src/nowhere.js',
        ],
        bundle,
        bundle['assets/main-1.js']
      )
    ).toEqual([
      'assets/RouterManager-1.js',
      'assets/events-1.js',
      'assets/PDatetime-1.js',
      'assets/shadow-1.js',
      'assets/Tabs-1.js',
    ]);
  });
});

describe('pages a saved file makes stale', () => {
  const site = {
    contracts: [{ name: 'PDatetime', tag: 'p-datetime' }, { name: 'Toggle' }],
    guides: [{ slug: 'getting-started' }],
    componentsDir: '/repo/src/components',
    guidesDir: '/repo/site/guides',
  };

  it('is a contract’s page and the index, or a guide’s page and the index, or nothing', () => {
    expect([
      pagesAffectedBy('/repo/src/components/PDatetime.contract.js', site),
      pagesAffectedBy('/repo/src/components/Toggle.contract.js', site),
      pagesAffectedBy('/repo/site/guides/getting-started.md', site),
      pagesAffectedBy('/repo/src/components/Toggle.js', site),
      pagesAffectedBy('/repo/site/guides/README.md', site),
    ]).toEqual([
      ['p-datetime', 'index'],
      ['toggle', 'index'],
      ['getting-started', 'index'],
      [],
      [],
    ]);
  });
});
