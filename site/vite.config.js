import path from 'node:path';
import { defineConfig } from 'vite';
import scss from '../rollup-plugin-scss.js';
import { componentsDir, repoRoot, siteRoot, writePages } from './build/pages.js';

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
 * Regenerate the pages when a contract changes during development
 */
function contractPages() {
  return {
    name: 'contract-pages',
    configureServer(server) {
      server.watcher.add(componentsDir);
      server.watcher.on('change', async file => {
        if (!file.endsWith('.contract.js')) return;
        await writePages();
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

const input = await writePages();

export default defineConfig({
  root: siteRoot,
  base: './',
  publicDir: 'public',
  plugins: [componentStyles(), contractPages()],
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
