import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PModal.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PUploader.js';
import modalStyles from '../../../src/styles/framework/components/PModal.scss';
import selectStyles from '../../../src/styles/framework/components/PSelect.scss';
import toastStyles from '../../../src/styles/framework/components/PToasts.scss';
import fileStyles from '../../../src/styles/framework/components/PUploader.scss';
import hostStyles from '../../../src/styles/framework/components/PUploaderHost.scss';

const shadowStyle = (host, selector) => getComputedStyle(host.shadowRoot.querySelector(selector));

describe('web component tokens', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each([
    ['PModal', modalStyles],
    ['PSelect', selectStyles],
    ['PToasts', toastStyles],
    ['PUploader', fileStyles],
    ['PUploaderHost', hostStyles],
  ])('%s styles contain no document-level :root rules', (name, css) => {
    expect(css.includes(':root')).toBe(false);
  });

  it('draws component surfaces without the framework stylesheet on the page', () => {
    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'));
    const modal = document.createElement('p-modal');
    const toasts = document.createElement('p-toasts');
    const uploader = document.createElement('p-uploader');
    document.body.append(select, modal, toasts, uploader);
    toasts.toast({ message: 'Booking saved', timeout: 0 });

    expect(
      [
        shadowStyle(select, '.menu').backgroundColor,
        shadowStyle(modal, 'dialog').backgroundColor,
        shadowStyle(toasts, '.toast').borderTopLeftRadius,
        getComputedStyle(uploader).borderTopLeftRadius,
      ].filter(value => value === 'rgba(0, 0, 0, 0)' || value === '0px')
    ).toEqual([]);
  });
});
