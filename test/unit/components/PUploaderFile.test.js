import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PUploaderFile.js';

const element = (tag, attributes = {}) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
};

describe('p-uploader-file imported on its own', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('defines only p-uploader-file', () => {
    expect([customElements.get('p-uploader-file')?.name, customElements.get('p-uploader')]).toEqual(
      ['PUploaderFile', undefined]
    );
  });

  it('shows a file in an undefined p-uploader without the actions its attributes would allow', () => {
    const uploader = element('p-uploader', {
      'delete-action': '/api/delete',
      'sequence-action': '/api/sequence',
    });
    const file = element('p-uploader-file', { 'file-id': 'file-1', filename: 'harbour.jpg' });
    uploader.append(file, element('p-uploader-file', { 'file-id': 'file-2' }));
    document.body.append(uploader);

    expect([
      file.shadowRoot.querySelector('.uploader__filename').textContent,
      file.shadowRoot.querySelectorAll('.uploader__toolbar button').length,
    ]).toEqual(['harbour.jpg', 0]);
  });

  it('keeps its shadow nodes when its filename changes', () => {
    const file = document.body.appendChild(element('p-uploader-file', { filename: 'old.jpg' }));
    const filename = file.shadowRoot.querySelector('.uploader__filename');
    const panel = file.shadowRoot.querySelector('[data-panel="info"]');

    file.setAttribute('filename', 'new.jpg');

    expect({
      sameNodes: file.shadowRoot.querySelector('.uploader__filename') === filename,
      text: filename.textContent,
      alt: file.shadowRoot.querySelector('.uploader__preview img').alt,
      label: panel.getAttribute('aria-label'),
    }).toEqual({
      sameNodes: true,
      text: 'new.jpg',
      alt: 'new.jpg',
      label: 'File information for new.jpg',
    });
  });

  it('offers Remove in the error panel once a failed upload reports its error', () => {
    const file = document.body.appendChild(element('p-uploader-file', { state: 'uploading' }));

    file.setAttribute('state', 'error');
    file.setAttribute('error', 'Upload failed');

    const actions = file.shadowRoot.querySelectorAll('[data-panel="error"] .uploader__actions *');
    expect([...actions].map(button => button.textContent)).toEqual(['Remove']);
  });

  it('offers Cancel in the error panel when an uploaded file reports an error', () => {
    const file = document.body.appendChild(element('p-uploader-file', { filename: 'a.jpg' }));

    file.setAttribute('error', 'Delete failed: Server error');

    const actions = file.shadowRoot.querySelectorAll('[data-panel="error"] .uploader__actions *');
    expect([...actions].map(button => button.textContent)).toEqual(['Cancel']);
  });

  it('hides the preview when its preview is removed', () => {
    const file = document.body.appendChild(
      element('p-uploader-file', { preview: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' })
    );

    file.removeAttribute('preview');

    expect(file.shadowRoot.querySelector('.uploader__preview').style.display).toBe('none');
  });
});
