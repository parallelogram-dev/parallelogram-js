/**
 * Helpers shared by `<p-uploader>` and `<p-uploader-file>`
 */

/**
 * Turn a failed response body into a short message that is safe to show.
 *
 * JSON bodies contribute their `message` or `error` string. Plain-text bodies
 * are used when short and free of markup; anything else (such as an HTML error
 * page) falls back to the generic message.
 *
 * @param {string|null|undefined} body
 * @param {string} fallback
 * @returns {string}
 */
export const errorMessage = (body, fallback) => {
  const content = body?.trim();
  if (!content) return fallback;

  if (content.startsWith('{')) {
    try {
      const { message, error } = JSON.parse(content);
      return [message, error].find(value => typeof value === 'string' && value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return content.length <= 200 && !content.includes('<') ? content : fallback;
};

/**
 * A boolean attribute read as BaseComponent.getBoolAttr() reads one: missing gives the default,
 * and "false" or "0" give false
 *
 * @param {Element} element
 * @param {string} name
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
export const boolAttr = (element, name, defaultValue) => {
  const value = element.getAttribute(name);
  return value === null ? defaultValue : !['false', '0'].includes(value.trim().toLowerCase());
};

/**
 * The text the uploader and its file cards show, shared so a card on its own has the same words.
 * A site changes these once through PUploader.defaults; a page changes one with the matching
 * attribute on <p-uploader>, {name} placeholders included.
 */
export const uploaderText = {
  addLabel: 'Drag/Add files',
  addOneLabel: 'Drag/Add file',
  noActionMessage: 'Files can’t be added because no upload-action is set.',
  tooLargeMessage: '{file} is larger than {size}.',
  wrongTypeMessage: '{file} isn’t an accepted file type.',
  limitMessage: 'You can add up to {count} files.',
  limitOneMessage: 'You can add up to {count} file.',
  movedMessage: 'Moved {file} to position {position} of {count}.',
  unnamedFile: 'the file',
  orderError: 'The new order couldn’t be saved, so the files are back in their previous order.',
  uploadError: 'Upload failed',
  invalidResponseMessage: 'Invalid server response',
  serverError: 'Server error',
  deleteError: 'Delete failed: {error}',
  saveError: 'Changes couldn’t be saved: {error}',
  progressLabel: 'Upload progress',
  deleteHeading: 'Delete this file?',
  cancelDeleteLabel: 'Cancel delete',
  confirmDeleteLabel: 'Confirm delete',
  editLabel: 'Edit details',
  cancelEditLabel: 'Cancel editing',
  saveLabel: 'Save details',
  removeLabel: 'Remove file',
  cancelUploadLabel: 'Cancel',
  moveUpLabel: 'Move up',
  moveDownLabel: 'Move down',
  replaceLabel: 'Replace',
  deleteLabel: 'Delete file',
  fileInfoLabel: 'File information for {file}',
};
