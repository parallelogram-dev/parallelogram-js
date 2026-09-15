import path from 'node:path';
import { defineConfig } from 'vite';
import scss from '../scripts/rollup-plugin-scss.js';
import {
  componentsDir,
  guidesDir,
  loadDiscoveryFiles,
  repoRoot,
  siteRoot,
  writePages,
} from './build/pages.js';

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
 * Regenerate the pages when a contract or a guide changes during development
 */
function contractPages() {
  return {
    name: 'contract-pages',
    configureServer(server) {
      server.watcher.add([componentsDir, guidesDir]);
      server.watcher.on('change', async file => {
        if (!file.endsWith('.contract.js') && !file.startsWith(guidesDir + path.sep)) return;
        await writePages();
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

const CONTENT_TYPES = {
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
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
  plugins: [componentStyles(), contractPages(), discoveryFiles()],
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [styles] },
    },
  },
  server: {
    port: 3000,
    fs: { allow: [repoRoot] },
  },
  preview: { port: 3000 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { input },
  },
});
