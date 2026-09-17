import { describe, expect, it } from 'vitest';
import { loadContracts } from '../../../site/build/pages.js';
import { runtimeContracts } from '../../../site/build/runtime-contracts.js';

const contracts = await loadContracts();

describe('the contracts the site ships to the browser', () => {
  it('keep how to find and load a component and what the playground watches, and nothing else', () => {
    const runtime = runtimeContracts(contracts);
    const uploader = runtime.find(contract => contract.name === 'PUploader');
    const keys = new Set(runtime.flatMap(contract => Object.keys(contract)));

    expect({
      keys: [...keys].sort(),
      uploader: {
        tag: uploader.tag,
        module: uploader.module,
        anEvent: uploader.events[0],
        readonlyOnly: uploader.attributes.every(attribute => attribute.readonly),
        childTags: uploader.elements.map(element => element.tag),
      },
      bytes: JSON.stringify(runtime).length < JSON.stringify(contracts).length / 8,
    }).toEqual({
      keys: [
        'attributes',
        'elements',
        'events',
        'kind',
        'match',
        'module',
        'name',
        'selector',
        'tag',
      ],
      uploader: {
        tag: 'p-uploader',
        module: 'components/PUploader',
        anEvent: expect.objectContaining({ name: expect.stringMatching(/^p-uploader:/) }),
        readonlyOnly: true,
        childTags: expect.arrayContaining(['p-uploader-file']),
      },
      bytes: true,
    });
  });
});
