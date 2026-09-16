import { afterEach, describe, expect, it } from 'vitest';
import PUploader, { PUploaderFile } from '../../../src/components/PUploader.js';

const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));

const element = (tag, attributes = {}, text) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

const renderUploader = async (attributes = {}) => {
  const uploader = element('p-uploader', attributes);
  const fields = element('p-uploader-fields', { slot: 'field-definitions' });
  fields.append(element('p-uploader-field', { key: 'caption', label: 'Caption' }));
  const file = element('p-uploader-file', { 'file-id': 'first', filename: 'first.jpg' });
  file.append(element('p-uploader-data', { key: 'caption' }, 'Boats'));
  uploader.append(
    fields,
    file,
    element('p-uploader-file', { 'file-id': 'second', filename: 'second.jpg' })
  );
  document.body.append(uploader);
  await nextTask();
  return { uploader, file, shadow: file.shadowRoot };
};

const actions = shadow =>
  [...shadow.querySelectorAll('.uploader__toolbar button')].map(button => button.dataset.action);

describe('p-uploader', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('defines p-uploader-file and exports its class', () => {
    expect([customElements.get('p-uploader'), customElements.get('p-uploader-file')]).toEqual([
      PUploader,
      PUploaderFile,
    ]);
  });

  it('gives each file the toolbar its actions allow', async () => {
    const { shadow } = await renderUploader({
      'update-action': '/api/update',
      'delete-action': '/api/delete',
      'sequence-action': '/api/sequence',
    });

    /* Edit and Delete sit together in the pill, after the reorder arrows */
    expect(actions(shadow)).toEqual(['move-up', 'move-down', 'edit', 'show-delete']);
  });

  it('keeps focus on a file’s toolbar button when the file renders again', async () => {
    const { file, shadow } = await renderUploader({
      'delete-action': '/api/delete',
      'sequence-action': '/api/sequence',
    });
    const button = shadow.querySelector('[data-action="move-down"]');
    button.focus();

    file.setAttribute('filename', 'renamed.jpg');

    expect(shadow.activeElement).toBe(button);
  });

  it('keeps the edit dialog open with unsaved changes when the file renders again', async () => {
    const { file, shadow } = await renderUploader({ 'update-action': '/api/update' });
    shadow.querySelector('[data-action="edit"]').click();
    shadow.querySelector('dialog [name="caption"]').value = 'Fishing boats';

    file.setAttribute('filename', 'renamed.jpg');

    expect([
      shadow.querySelector('dialog').open,
      shadow.querySelector('dialog [name="caption"]').value,
    ]).toEqual([true, 'Fishing boats']);
  });

  it('takes away editing and deleting when allow-edit turns them off, and restores them in order', async () => {
    const { file, shadow } = await renderUploader({
      'update-action': '/api/update',
      'delete-action': '/api/delete',
      'sequence-action': '/api/sequence',
    });

    file.setAttribute('allow-edit', '0');
    const withoutEditing = actions(shadow);
    file.setAttribute('allow-edit', 'true');

    expect([withoutEditing, actions(shadow)]).toEqual([
      ['move-up', 'move-down'],
      ['move-up', 'move-down', 'edit', 'show-delete'],
    ]);
  });

  it('keeps the moved file’s order buttons in step with its position', async () => {
    const { uploader, file, shadow } = await renderUploader({ 'sequence-action': '/api/sequence' });

    uploader.append(file);
    file.setAttribute('filename', 'last.jpg');

    expect([
      shadow.querySelector('[data-action="move-up"]').disabled,
      shadow.querySelector('[data-action="move-down"]').disabled,
    ]).toEqual([false, true]);
  });
});
