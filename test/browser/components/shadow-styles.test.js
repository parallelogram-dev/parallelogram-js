import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PModal.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PUploader.js';

const TAGS = ['p-modal', 'p-select', 'p-toasts', 'p-datetime', 'p-uploader', 'p-uploader-file'];

describe('web component styles', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each(TAGS)('%s shares one adopted stylesheet between its instances', tag => {
    const first = document.createElement(tag);
    const second = document.createElement(tag);
    document.body.append(first, second);

    const [firstSheets, secondSheets] = [first, second].map(
      element => element.shadowRoot.adoptedStyleSheets
    );
    expect([
      firstSheets.length,
      firstSheets[0] === secondSheets[0],
      first.shadowRoot.querySelector('style'),
    ]).toEqual([1, true, null]);
  });
});
