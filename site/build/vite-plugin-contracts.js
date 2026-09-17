import { loadContracts } from './pages.js';
import { runtimeContracts } from './runtime-contracts.js';

export const VIRTUAL_ID = 'virtual:contracts';
export const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/**
 * Serve `virtual:contracts`, the part of every contract the site's runtime needs, generated from
 * the contract files so the documentation in them stays on the build side
 *
 * @returns {import('vite').Plugin}
 */
export function contractRegistry() {
  return {
    name: 'contract-registry',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(runtimeContracts(await loadContracts()))};`;
    },
  };
}
