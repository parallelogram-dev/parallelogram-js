import path from 'node:path';
import { defineConfig } from 'vite';
import scss from '../scripts/rollup-plugin-scss.js';
import {
  componentsDir,
  guidesDir,
  loadContracts,
  loadDiscoveryFiles,
  loadGuides,
  repoRoot,
  siteRoot,
  writePages,
} from './build/pages.js';
import { chunksFor, modulesFor, pagesAffectedBy } from './build/preload.js';
import { RESOLVED_ID, contractRegistry } from './build/vite-plugin-contracts.js';

const styles = path.join(repoRoot, 'src/styles');

/**
 * Import the components' shadow DOM stylesheets as strings, as the package build does, while the
 * site's own stylesheet goes through Vite's CSS pipeline
 */
function componentStyles() {
  const plugin = scss({ loadPaths: [styles] });
  const components = componentsDir + path.sep;

  return {
    ...plugin,
    name: 'component-styles',
    resolveId(source, importer, options) {
      if (!importer?.startsWith(components)) return null;
      return plugin.resolveId.call(this, source, importer, options);
    },
  };
}

/**
 * Regenerate the pages when a contract or a guide changes during development, and tell the open
 * pages which of them went stale. Only those reload: a full reload sent every open page back
 * through the whole unbundled module graph for a change to one of them.
 */
function contractPages() {
  return {
    name: 'contract-pages',
    configureServer(server) {
      server.watcher.add([componentsDir, guidesDir]);
      server.watcher.on('change', async file => {
        if (!file.endsWith('.contract.js') && !file.startsWith(guidesDir + path.sep)) return;
        await writePages();
        const registry = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (registry) server.moduleGraph.invalidateModule(registry);
        const site = {
          contracts: await loadContracts(),
          guides: loadGuides(),
          componentsDir,
          guidesDir,
        };
        server.ws.send('parallelogram:pages-changed', { slugs: pagesAffectedBy(file, site) });
      });
    },
  };
}

/**
 * Preload, on each built page, the chunks it will import once main runs: the managers every page
 * loads and the components its markup uses. Without this a page discovers them one dynamic import
 * at a time, three round trips deep.
 */
function preloadChunks() {
  let contracts;
  return {
    name: 'preload-chunks',
    async buildStart() {
      contracts = await loadContracts();
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle, chunk }) {
        if (!bundle || !chunk) return;
        return chunksFor(modulesFor(html, contracts), bundle, chunk).map(file => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `./${file}` },
          injectTo: 'head',
        }));
      },
    },
  };
}

const CONTENT_TYPES = {
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Serve llms.txt, llms-full.txt, sitemap.xml and robots.txt during development, generated afresh
 * for each request, and emit them at the root of the built site
 */
function discoveryFiles() {
  return {
    name: 'discovery-files',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const name = new URL(request.url, 'http://localhost').pathname.slice(1);
        if (!Object.hasOwn(CONTENT_TYPES, path.extname(name))) return next();
        const files = await loadDiscoveryFiles();
        if (!Object.hasOwn(files, name)) return next();
        response.setHeader('Content-Type', CONTENT_TYPES[path.extname(name)]);
        response.end(files[name]);
      });
    },
    async generateBundle() {
      for (const [fileName, source] of Object.entries(await loadDiscoveryFiles())) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}

const input = await writePages();

export default defineConfig({
  root: siteRoot,
  base: './',
  publicDir: 'public',
  plugins: [
    componentStyles(),
    contractRegistry(),
    contractPages(),
    discoveryFiles(),
    preloadChunks(),
  ],
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [styles] },
    },
  },
  server: {
    port: 3000,
    fs: { allow: [repoRoot] },
    /* Compile the framework's core before the first request asks for it */
    warmup: { clientFiles: ['./src/main.js', '../src/index.js', '../src/managers/*.js'] },
  },
  preview: { port: 3000 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      input,
      output: {
        /* The framework's core is shared by every page; named for what it is rather than for
           whichever module happened to pull it in first */
        advancedChunks: {
          groups: [
            { name: 'core', test: /[\\/]src[\\/](index\.js|core[\\/]|managers[\\/]|utils[\\/])/ },
          ],
        },
      },
    },
  },
});
