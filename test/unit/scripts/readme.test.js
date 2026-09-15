import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adapterNames,
  componentTables,
  END,
  readmeWith,
  SITE,
  START,
} from '../../../scripts/readme.mjs';
import { elementContract } from './element-contract.js';

const contracts = Object.values(
  import.meta.glob('../../../src/components/*.contract.js', { eager: true, import: 'default' })
);

const enhancement = {
  name: 'CopyToClipboard',
  kind: 'enhancement',
  selector: 'data-copytoclipboard',
  module: 'components/CopyToClipboard',
  stylesheet: 'styles/copy.css',
  summary: 'Copy a | separated <code> value',
};

describe('README component tables', () => {
  it('lists each web component with its page, import and summary', () => {
    expect(componentTables([elementContract()], [])).toContain(
      `| [\`<p-widget>\`](${SITE}/p-widget.html) | \`components/PWidget\` | A widget |`
    );
  });

  it('lists each enhancement with its selector and stylesheet, escaping its summary', () => {
    expect(componentTables([enhancement], [])).toContain(
      `| [CopyToClipboard](${SITE}/copy-to-clipboard.html) | \`[data-copytoclipboard]\` | \`components/CopyToClipboard\` | \`styles/copy.css\` | Copy a \\| separated &lt;code&gt; value |`
    );
  });

  it('names the tracker adapters', () => {
    expect(componentTables([], ['ga4', 'gtm'])).toContain(
      'adapters imported from `@parallelogram-js/core/adapters/<name>`: `ga4`, `gtm`.'
    );
  });

  it('rejects a README without both markers', async () => {
    await expect(readmeWith(`# Title\n\n${END}\n${START}\n`, [], [])).rejects.toThrow(START);
  });

  it('matches the component contracts and adapters', async () => {
    const readme = readFileSync(`${process.cwd()}/README.md`, 'utf8');

    expect(await readmeWith(readme, contracts, adapterNames())).toBe(readme);
  });
});
