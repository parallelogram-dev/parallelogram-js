import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../src/components/PUploader.js';

const PAYLOAD = '<img src="data:," onerror="window.__puploaderInjected = true">';

const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));

const element = (tag, attributes = {}, text) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

async function mountUploader({ caption = 'A caption', attributes = {} } = {}) {
  const uploader = element('p-uploader', { 'update-action': '/api/update', ...attributes });
  const fields = element('p-uploader-fields', { slot: 'field-definitions' });
  fields.append(
    element('p-uploader-field', { key: 'caption', label: 'Caption', type: 'textarea' })
  );
  const file = element('p-uploader-file', { 'file-id': 'file-1', filename: 'photo.jpg' });
  file.append(element('p-uploader-data', { key: 'caption' }, caption));
  uploader.append(fields, file);
  document.body.append(uploader);
  await nextTask();
  return { uploader, file };
}

class FailingUpload {
  static body = '';
  upload = new EventTarget();
  #events = new EventTarget();
  status = 0;
  responseText = '';

  addEventListener(type, listener) {
    this.#events.addEventListener(type, listener);
  }

  open() {}

  send() {
    this.status = 500;
    this.responseText = FailingUpload.body;
    queueMicrotask(() => this.#events.dispatchEvent(new Event('load')));
  }
}

describe('p-uploader', () => {
  afterEach(() => {
    document.body.replaceChildren();
    delete window.__puploaderInjected;
  });

  it('renders a filename containing markup as text', async () => {
    const file = element('p-uploader-file', { filename: PAYLOAD });
    document.body.append(file);
    await nextTask();

    expect(file.shadowRoot.querySelector('.uploader__filename').textContent).toBe(PAYLOAD);
    expect(file.shadowRoot.querySelectorAll('img')).toHaveLength(1);
    expect(window.__puploaderInjected).toBeUndefined();
  });

  it('renders an error message containing markup as text', async () => {
    const file = element('p-uploader-file', { state: 'error', error: PAYLOAD });
    document.body.append(file);
    await nextTask();

    expect(file.shadowRoot.querySelector('.error-message').textContent).toBe(PAYLOAD);
    expect(file.shadowRoot.querySelectorAll('img')).toHaveLength(1);
    expect(window.__puploaderInjected).toBeUndefined();
  });

  it('renders saved field values containing markup as text', async () => {
    const { file } = await mountUploader({ caption: PAYLOAD });

    expect(file.shadowRoot.querySelector('.field__value').textContent).toBe(PAYLOAD);
    expect(file.shadowRoot.querySelector('textarea[name="caption"]').value).toBe(PAYLOAD);
    expect(file.shadowRoot.querySelectorAll('img')).toHaveLength(1);
    expect(window.__puploaderInjected).toBeUndefined();
  });

  it('shows an edited value containing markup as text after saving', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    const { file } = await mountUploader();
    const shadow = file.shadowRoot;

    shadow.querySelector('button.field__edit').click();
    shadow.querySelector('textarea[name="caption"]').value = PAYLOAD;
    shadow.querySelector('[data-action="confirm-edit"]').click();

    await vi.waitFor(() => expect(shadow.querySelector('.field__value').textContent).toBe(PAYLOAD));
    expect(shadow.querySelectorAll('img')).toHaveLength(1);
    expect(window.__puploaderInjected).toBeUndefined();
  });

  it('labels the delete dialog with its own heading even when the filename has quotes', async () => {
    const file = element('p-uploader-file', { filename: 'say "cheese".jpg' });
    document.body.append(file);
    await nextTask();

    const dialog = file.shadowRoot.querySelector('[data-panel="delete"]');
    const heading = file.shadowRoot.getElementById(dialog.getAttribute('aria-labelledby'));
    expect(heading?.textContent).toBe('Delete this file?');
  });

  it.each([
    ['an HTML error page', `<html><body>${PAYLOAD}</body></html>`, 'Upload failed'],
    ['a JSON message', '{"message":"File is too large"}', 'File is too large'],
    ['a short plain-text reason', 'Quota exceeded', 'Quota exceeded'],
  ])('reports an upload failure with %s safely', async (_label, body, expected) => {
    FailingUpload.body = body;
    const { uploader } = await mountUploader();
    uploader.setXHR(FailingUpload);

    const transfer = new DataTransfer();
    transfer.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    const input = uploader.shadowRoot.querySelector('.uploader__fileinput');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));

    const failed = () => uploader.querySelector('p-uploader-file[state="error"]');
    await vi.waitFor(() => expect(failed()).not.toBeNull());
    expect(failed().getAttribute('error')).toBe(expected);
    expect(failed().shadowRoot.querySelector('.error-message').textContent).toBe(expected);
    expect(window.__puploaderInjected).toBeUndefined();
  });
});
