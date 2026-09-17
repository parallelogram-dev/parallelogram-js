import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PModal.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PUploader.js';
import datetimeStyles from '../../../src/styles/framework/components/PDatetime.scss';
import modalStyles from '../../../src/styles/framework/components/PModal.scss';
import selectStyles from '../../../src/styles/framework/components/PSelect.scss';
import toastStyles from '../../../src/styles/framework/components/PToasts.scss';
import fileStyles from '../../../src/styles/framework/components/PUploader.scss';
import hostStyles from '../../../src/styles/framework/components/PUploaderHost.scss';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const shadowStyle = (host, selector) => getComputedStyle(host.shadowRoot.querySelector(selector));

describe('web component tokens', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each([
    ['PDatetime', datetimeStyles],
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

  it('draws form control fields and panels with the dark surface when data-theme is dark', () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    document.documentElement.dataset.theme = 'dark';
    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'));
    const datetime = document.createElement('p-datetime');
    document.body.append(select, datetime);

    const surfaces = [
      getComputedStyle(select).backgroundColor,
      shadowStyle(select, '.menu').backgroundColor,
      getComputedStyle(datetime).backgroundColor,
      shadowStyle(datetime, '.panel').backgroundColor,
    ];
    delete document.documentElement.dataset.theme;
    style.remove();

    expect(surfaces).toEqual(Array(4).fill('rgb(23, 29, 38)'));
  });

  it('draws the modal panel and toasts with the dark surface, inverse surface and status colour when data-theme is dark', () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    document.documentElement.dataset.theme = 'dark';
    const toasts = document.createElement('p-toasts');
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Release this table?</h2>';
    document.body.append(toasts, modal);
    /* Toasts only exist once shown, and the panel only renders once open */
    toasts.toast({ message: 'Booking saved', timeout: 0 });
    toasts.toast({ message: 'Payment declined', type: 'error', timeout: 0 });
    modal.open();

    const colours = [
      shadowStyle(modal, 'dialog').backgroundColor,
      shadowStyle(toasts, '.toast.info').backgroundColor,
      shadowStyle(toasts, '.toast.error').backgroundColor,
    ];
    delete document.documentElement.dataset.theme;
    style.remove();

    /* The error toast is the dark theme's --color-danger, not the deeper -strong it once was */
    expect(colours).toEqual(['rgb(23, 29, 38)', 'rgb(42, 51, 66)', 'rgb(248, 113, 113)']);
  });
});
