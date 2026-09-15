import PModal from '@parallelogram-js/core/components/PModal';
import PSelect from '@parallelogram-js/core/components/PSelect.js';
import PUploader, { PUploaderFile } from '@parallelogram-js/core/components/PUploader';
import '@parallelogram-js/core/components/PDatetime';
import '@parallelogram-js/core/components/PToasts';

export function modalApi(modal: PModal): void {
  modal.open({ returnFocus: null });
  modal.toggle(false);
  modal.addEventListener('p-modal:open', event => {
    const opened: HTMLElement = event.detail.modal;
    opened.focus();
  });

  /* @ts-expect-error open() takes an options object */
  modal.open(true);
}

export function tagNameMap(): void {
  const select: PSelect | null = document.querySelector('p-select');
  select?.setOptions([{ value: 'lunch', label: 'Lunch' }]);

  const uploader: PUploader = document.createElement('p-uploader');
  uploader.requestHeaders = () => ({ 'X-CSRF-Token': 'token' });
  const file: PUploaderFile | null = uploader.querySelector('p-uploader-file');
  file?.addEventListener('p-uploader-file:delete', event => event.detail.fileId.trim());

  const datetime = document.createElement('p-datetime');
  const rangeTo: string | null = datetime.rangeTo;
  datetime.addEventListener('change', event => {
    const complete: boolean = event.detail.complete;
    return complete || rangeTo;
  });

  /* @ts-expect-error mode is date, datetime or time */
  datetime.mode = 'week';

  const dismiss: () => void = document
    .createElement('p-toasts')
    .toast({ message: 'Saved', type: 'success' });
  dismiss();
}

export function globalEvents(): void {
  document.addEventListener('p-uploader:reject', event => {
    const reason: 'type' | 'size' = event.detail.reason;
    if (reason === 'size') event.preventDefault();
  });

  /* @ts-expect-error p-select:open carries no detail */
  document.addEventListener('p-select:open', event => event.detail);
}
