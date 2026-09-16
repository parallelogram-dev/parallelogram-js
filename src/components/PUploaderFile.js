import { generateId } from '../utils/dom-utils.js';
import fileStyles from '../styles/framework/components/PUploader.scss';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';
import { boolAttr, errorMessage } from '../utils/uploader.js';
import { followFocusSource } from '../utils/focus-source.js';
import { arrowDown, arrowUp, iconElement, pencil, trash } from '../utils/icons.js';

/**
 * Create an element whose attributes and text are set through DOM APIs, so
 * values from attributes, server responses or user input are never parsed as HTML.
 *
 * @param {string} tag
 * @param {Record<string, string>} [attributes]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
const withIcon = (button, paths) => {
  button.append(iconElement(paths, { size: 'sm' }));
  return button;
};

const el = (tag, attributes = {}, text) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

let fileTemplate;

/**
 * Static structure of a file card. Per-file data is filled in afterwards.
 *
 * @returns {HTMLTemplateElement}
 */
const getFileTemplate = () => {
  if (!fileTemplate) {
    fileTemplate = document.createElement('template');
    setStaticHTML(
      fileTemplate,
      `
      <slot></slot>
      <div class="uploader__overlay">
        <progress class="uploader__progress" part="progress" max="100" value="0" aria-label="Upload progress"></progress>
      </div>
      <div class="uploader__container">
        <picture class="uploader__preview" part="preview"><img alt=""></picture>
        <div class="uploader__content">
          <div data-panel="error" class="uploader__panel" part="panel" role="alert">
            <div class="uploader__alert">
              <div class="error-message"></div>
              <div class="uploader__actions" part="actions"></div>
            </div>
          </div>
          <div data-panel="info" class="uploader__panel" part="panel" role="region">
            <div class="uploader__body">
              <div class="uploader__fields" part="fields">
                <p class="uploader__filename" part="filename"></p>
              </div>
            </div>
          </div>
          <div data-panel="delete" class="uploader__panel" part="panel" role="group">
            <div class="uploader__alert">
              <h2 class="uploader__heading">Delete this file?</h2>
              <div class="uploader__actions" part="actions">
                <button type="button" class="uploader__btn uploader__btn--secondary" data-action="cancel" aria-label="Cancel delete">Cancel</button>
                <button type="button" class="uploader__btn uploader__btn--delete" data-action="confirm-delete" aria-label="Confirm delete">Delete</button>
              </div>
            </div>
          </div>
          <div data-panel="edit" class="uploader__panel uploader__panel--edit" part="panel edit-panel" role="group">
            <form class="uploader__form" aria-label="Edit details">
              <div class="uploader__edit-fields"></div>
              <p class="uploader__edit-message" role="alert"></p>
              <div class="uploader__actions" part="actions">
                <button type="button" class="uploader__btn uploader__btn--secondary" data-action="cancel">Cancel</button>
                <button type="submit" class="uploader__btn uploader__btn--primary" data-action="save">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `
    );
  }
  return fileTemplate;
};

/**
 * PUploaderFile - a file in a `<p-uploader>`, with its preview, upload progress, fields and actions
 *
 * `<p-uploader>` imports and defines it. Imported alone, this module defines only
 * `<p-uploader-file>`, and the actions that need an uploader's configuration appear once the
 * `<p-uploader>` around the file is defined.
 */
export class PUploaderFile extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    followFocusSource(this);
    this._fieldSchema = null;
    this._fieldData = new Map();
    this._build();
    this._render();
  }

  static get observedAttributes() {
    return [
      'state',
      'progress',
      'preview',
      'error',
      'filename',
      'allow-edit',
      'data-current-panel',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'data-current-panel') {
        this._updatePanelVisibility(newValue);
      } else if (name === 'state') {
        this._updateState(newValue);
      } else if (name === 'preview') {
        this._updatePreview(newValue);
      } else if (name === 'progress') {
        this._updateProgress(newValue);
      } else {
        this._render();
      }
    }
  }

  /**
   * Build the card's shadow tree, the buttons it shows and hides, and its listeners, once. Renders
   * update these nodes in place, so focus and an open edit panel survive them.
   */
  _build() {
    const root = document.importNode(getFileTemplate().content, true);

    const deletePanel = root.querySelector('[data-panel="delete"]');
    const headingId = generateId('delete-heading');
    deletePanel.setAttribute('aria-labelledby', headingId);
    deletePanel.querySelector('.uploader__heading').id = headingId;
    /* The edit panel names itself on its form, since its own heading only repeated the button */
    root.querySelector('[data-panel="edit"]').setAttribute('aria-label', 'Edit details');

    this._toolbar = el('div', { class: 'uploader__toolbar', part: 'toolbar' });
    /* Edit and delete sit together as one pill, the way a segmented control does */
    this._pills = el('div', { class: 'uploader__pills', part: 'pills' });
    root.querySelector('[data-panel="info"] .uploader__body').append(this._toolbar);

    this.shadowRoot.replaceChildren(root);
    adoptStyles(this.shadowRoot, fileStyles);

    /* A failed upload is removed from the error panel; a failed delete is cancelled */
    this._errorButtons = {
      remove: el(
        'button',
        {
          type: 'button',
          class: 'uploader__btn uploader__btn--delete',
          'data-action': 'confirm-delete',
          'aria-label': 'Remove file',
        },
        'Remove'
      ),
      cancel: el(
        'button',
        {
          type: 'button',
          class: 'uploader__btn uploader__btn--secondary',
          'data-action': 'cancel',
          'aria-label': 'Cancel',
        },
        'Cancel'
      ),
    };

    /* In toolbar order */
    this._toolbarButtons = {
      edit: withIcon(
        el('button', {
          type: 'button',
          class: 'uploader__pill',
          'data-action': 'edit',
          part: 'edit-button',
          title: 'Edit details',
          'aria-label': 'Edit details',
        }),
        pencil
      ),
      'move-up': withIcon(
        el('button', {
          type: 'button',
          class: 'uploader__move',
          'data-action': 'move-up',
          title: 'Move up',
          'aria-label': 'Move up',
        }),
        arrowUp
      ),
      'move-down': withIcon(
        el('button', {
          type: 'button',
          class: 'uploader__move',
          'data-action': 'move-down',
          title: 'Move down',
          'aria-label': 'Move down',
        }),
        arrowDown
      ),
      replace: el(
        'button',
        { type: 'button', class: 'uploader__replace', 'data-action': 'replace' },
        'Replace'
      ),
      'show-delete': withIcon(
        el('button', {
          type: 'button',
          class: 'uploader__pill uploader__pill--delete',
          'data-action': 'show-delete',
          title: 'Delete file',
          'aria-label': 'Delete file',
        }),
        trash
      ),
    };

    this._setupFileEventListeners();
  }

  /**
   * Show the file's attributes, its fields and the actions its uploader allows, updating the nodes
   * built once
   */
  _render() {
    const state = this.getAttribute('state') || 'uploaded';
    const filename = this.getAttribute('filename') || '';
    const root = this.shadowRoot;

    /* Load field data from slotted elements */
    if (this.querySelector('p-uploader-data') && !this._fieldData.size) {
      this._loadFieldData();
    }

    root
      .querySelector('.uploader__overlay')
      .classList.toggle('uploader__overlay--show', state === 'uploading');
    this._updateProgress(this.getAttribute('progress'));
    this._updatePreview(this.getAttribute('preview'));
    root.querySelector('.uploader__preview img').alt = filename;

    root.querySelector('.error-message').textContent = this.getAttribute('error') || '';
    const errorButton = this._errorButtons[state === 'error' ? 'remove' : 'cancel'];
    const errorActions = root.querySelector('[data-panel="error"] .uploader__actions');
    if (errorActions.firstElementChild !== errorButton) {
      errorActions.replaceChildren(errorButton);
    }

    root
      .querySelector('[data-panel="info"]')
      .setAttribute('aria-label', `File information for ${filename}`);
    root.querySelector('.uploader__filename').textContent = filename;

    this._renderDetails(state);
    this._renderToolbar(state);
    this._showPanels(this.getAttribute('data-current-panel') || 'info', state);
    this._syncOrderButtons();
  }

  /**
   * Show the panel for the current state and make the others inert, so their controls leave the tab
   * order while they are out of view
   */
  _showPanels(currentPanel, state) {
    for (const panel of this.shadowRoot.querySelectorAll('.uploader__panel')) {
      const name = panel.dataset.panel;
      const show =
        name === 'info'
          ? currentPanel === 'info' && state === 'uploaded'
          : name === currentPanel || (name === 'error' && state === 'error');
      panel.classList.toggle('uploader__panel--show', show);
      /* Once the details have been seen, they wait above rather than below, so a panel opening
         over them pushes them up and cancelling brings them back down */
      if (show && name === 'info') {
        panel.classList.add('uploader__panel--activated');
      }
      panel.inert = !show;
    }
  }

  /**
   * Fill the info panel with the file's fields, and the edit panel, while it is closed, with a
   * control for each field
   */
  _renderDetails(state) {
    const fields = this.shadowRoot.querySelector('.uploader__fields');
    fields.querySelectorAll('.uploader__field').forEach(node => node.remove());
    if (state !== 'uploaded') return;

    const { edit } = this._permissions();
    fields.append(...this._createFields(edit));
    if (edit && this._fieldSchema?.size && this._currentPanel() !== 'edit') {
      this._fillEditor();
    }
  }

  /**
   * The panel the card is showing
   *
   * @returns {string}
   */
  _currentPanel() {
    return this.getAttribute('data-current-panel') || 'info';
  }

  /**
   * The `<p-uploader>` around this file, once it is defined, or null
   *
   * @returns {HTMLElement|null}
   */
  _uploader() {
    const uploader = this.closest('p-uploader');
    return uploader && 'config' in uploader ? uploader : null;
  }

  /**
   * What the owning uploader lets this file offer: editing needs an update-action and deleting a
   * delete-action, and allow-edit="false" or "0" turns both off
   */
  _permissions() {
    const allowEdit = boolAttr(this, 'allow-edit', true);
    const config = this._uploader()?.config ?? {};
    return {
      edit: allowEdit && Boolean(config.updateAction),
      remove: allowEdit && Boolean(config.deleteAction),
    };
  }

  /**
   * Put the toolbar buttons the uploader's configuration allows in the toolbar: Edit details, Move
   * up, Move down, Replace and Delete. Buttons that stay are never moved, so they keep focus.
   */
  _renderToolbar(state) {
    const uploader = this._uploader();
    const uploaded = state === 'uploaded';
    const permissions = this._permissions();
    const sortable = uploaded && Boolean(uploader?._canSort());
    const shown = {
      edit: uploaded && permissions.edit && Boolean(this._fieldSchema?.size),
      'move-up': sortable,
      'move-down': sortable,
      replace: uploaded && Boolean(uploader?._canReplace()),
      'show-delete': permissions.remove,
    };

    const parentOf = action =>
      action === 'edit' || action === 'show-delete' ? this._pills : this._toolbar;
    const previous = new Map();
    for (const [action, button] of Object.entries(this._toolbarButtons)) {
      if (!shown[action]) {
        button.remove();
        continue;
      }
      const parent = parentOf(action);
      if (button.parentNode !== parent) {
        const after = previous.get(parent);
        if (after) {
          after.after(button);
        } else {
          parent.prepend(button);
        }
      }
      previous.set(parent, button);
    }

    /* The pill sits last in the toolbar, and goes away when neither button is allowed */
    if (this._pills.children.length === 0) {
      this._pills.remove();
    } else if (this._pills.parentNode !== this._toolbar) {
      this._toolbar.append(this._pills);
    }
  }

  /**
   * Disable Move up on the first file and Move down on the last
   */
  _syncOrderButtons() {
    const files = [...(this.closest('p-uploader')?.querySelectorAll('p-uploader-file') ?? [])];
    const index = files.indexOf(this);
    const up = this.shadowRoot.querySelector('[data-action="move-up"]');
    const down = this.shadowRoot.querySelector('[data-action="move-down"]');
    if (up) up.disabled = index <= 0;
    if (down) down.disabled = index === -1 || index >= files.length - 1;
  }

  _loadFieldData() {
    const dataElements = this.querySelectorAll('p-uploader-data');
    dataElements.forEach(dataEl => {
      const key = dataEl.getAttribute('key');
      const value = dataEl.textContent.trim();
      if (key) {
        this._fieldData.set(key, value);
      }
    });
  }

  /**
   * One row per field in the schema; when the details can't be edited, fields without a value are left out
   *
   * @returns {HTMLElement[]}
   */
  _createFields(canEdit) {
    if (!this._fieldSchema?.size) {
      return [];
    }

    return [...this._fieldSchema]
      .filter(([key]) => canEdit || this._fieldData.get(key))
      .map(([key, fieldDef]) => {
        const field = el('div', { class: 'uploader__field', part: 'field' });
        const value = el('span', { class: 'field__value', 'data-field': key });
        this._setFieldValue(value, this._fieldData.get(key));
        field.append(el('span', { class: 'field__label' }, fieldDef.label), value);
        return field;
      });
  }

  _setFieldValue(element, value) {
    element.replaceChildren(value || el('em', {}, '-'));
  }

  _updatePanelVisibility(currentPanel) {
    this._syncContentHeight(currentPanel);
    this._showPanels(currentPanel, this.getAttribute('state') || 'uploaded');
    /* The panels are stacked in a clipped box that can scroll. Focus moving to a panel still out of
       view scrolls it, which leaves every panel off its mark, so put it back once the browser has
       had its say. */
    const content = this.shadowRoot.querySelector('.uploader__content');
    if (content) {
      content.scrollTop = 0;
      requestAnimationFrame(() => {
        content.scrollTop = 0;
      });
    }
  }

  /**
   * The card is only as tall as its thumbnail, which the edit form outgrows, so while that panel is
   * open the clipped box takes the form's own height. The panels waiting below are moved by the
   * same measure, so they stay out of sight whatever it is.
   */
  _syncContentHeight(currentPanel) {
    const panel = this.shadowRoot.querySelector('[data-panel="edit"]');
    if (currentPanel !== 'edit') {
      this._editSize?.disconnect();
      this.style.removeProperty('--uploader-content-height');
      return;
    }
    if (!panel) return;

    /* The form's height isn't settled the first time it opens: the fields have only just been
       built, and a web font or a wrapped label can change it again. Watching the panel keeps the
       card the right depth however late that happens. */
    this._editSize ??= new ResizeObserver(entries => {
      const [entry] = entries;
      if ((this.getAttribute('data-current-panel') || 'info') === 'edit') {
        this._applyContentHeight(entry.target);
      }
    });
    /* The card is rebuilt when it is moved in the list, so the panel watched is always the one on
       the page now, not the one this card had before */
    this._editSize.disconnect();
    this._editSize.observe(panel);
    this._applyContentHeight(panel);
  }

  /**
   * Take the card's clipped box to the edit form's own height
   *
   * @param {HTMLElement} panel
   */
  _applyContentHeight(panel) {
    const height = panel.scrollHeight;
    if (height > 0) {
      this.style.setProperty('--uploader-content-height', `${height}px`);
    }
  }

  _updateState(newState) {
    const overlay = this.shadowRoot.querySelector('.uploader__overlay');

    if (newState === 'uploading') {
      /* Show progress overlay */
      if (overlay) {
        overlay.classList.add('uploader__overlay--show');
      }
    } else if (newState === 'uploaded') {
      /* Hide progress overlay and show info panel */
      if (overlay) {
        overlay.classList.remove('uploader__overlay--show');
      }

      /* Render fields in the info panel for newly uploaded files */
      this._renderInfoPanelFields();

      /* Show the info panel after the overlay fades out, unless the user is looking at a panel
         they opened themselves, such as the delete confirmation */
      clearTimeout(this._settlePanel);
      this._settlePanel = setTimeout(() => {
        if ((this.getAttribute('data-current-panel') || 'info') === 'info') {
          this.setAttribute('data-current-panel', 'info');
        }
      }, 375); /* Match the transition duration */
    } else if (newState === 'error') {
      /* Hide progress overlay and show error panel */
      if (overlay) {
        overlay.classList.remove('uploader__overlay--show');
      }
      this.setAttribute('data-current-panel', 'error');
    }
  }

  _updatePreview(previewUrl) {
    const preview = this.shadowRoot.querySelector('.uploader__preview');
    if (preview) {
      if (previewUrl) {
        preview.style.display = 'block';
        const img = preview.querySelector('img');
        if (img) {
          img.src = previewUrl;
        }
      } else {
        preview.style.display = 'none';
      }
    }
  }

  _updateProgress(progressValue) {
    const progressBar = this.shadowRoot.querySelector('.uploader__progress');
    if (progressBar) {
      progressBar.value = parseInt(progressValue) || 0;
    }
  }

  _updateFieldDisplay(fieldKey, newValue) {
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');
    if (infoPanel) {
      const fieldValueElement = infoPanel.querySelector(
        `[data-field="${CSS.escape(fieldKey)}"].field__value`
      );
      if (fieldValueElement) {
        this._setFieldValue(fieldValueElement, newValue);
      }
    }
  }

  _renderInfoPanelFields() {
    const state = this.getAttribute('state') || 'uploaded';
    this._renderDetails(state);
    this._renderToolbar(state);
    this._syncOrderButtons();
  }

  /**
   * Listen on the shadow tree, which lives as long as the element
   */
  _setupFileEventListeners() {
    this.shadowRoot.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const actions = {
        edit: () => this._setPanel('edit'),
        'show-delete': () => this._setPanel('delete'),
        'move-up': () => this._uploader()?._moveFile(this, -1),
        'move-down': () => this._uploader()?._moveFile(this, 1),
        replace: () => this._uploader()?._startReplace(this),
        cancel: () => this._setPanel('info'),
        'confirm-delete': () => this._handleConfirmDelete(),
      };
      actions[button.dataset.action]?.();
    });

    this.shadowRoot.addEventListener('submit', event => {
      event.preventDefault();
      this._saveDetails(event.target);
    });

    this.addEventListener('keydown', event => {
      if (event.key === 'Escape' && ['delete', 'edit'].includes(this._currentPanel())) {
        event.preventDefault();
        this._setPanel('info');
      }
    });
  }

  /**
   * Show a panel and move focus with it. Focus is set with preventScroll, because the panels sit in
   * a clipped box and scrolling it to the panel leaves every one of them off its mark.
   */
  _setPanel(panel) {
    /* A panel the user asked for outlives the one a finished upload would have shown */
    clearTimeout(this._settlePanel);
    const previous = this._currentPanel();
    const focusWasInPanel = Boolean(this.shadowRoot.activeElement?.closest('.uploader__panel'));

    if (panel === 'edit' && previous !== 'edit') {
      this._fillEditor();
    }

    this.setAttribute('data-current-panel', panel);
    this._notifyDraggableStateChange();

    if (panel === 'delete') {
      this.shadowRoot
        .querySelector('[data-panel="delete"] [data-action="cancel"]')
        ?.focus({ preventScroll: true });
    } else if (panel === 'edit') {
      this.shadowRoot
        .querySelector(
          '[data-panel="edit"] .uploader__input, [data-panel="edit"] .uploader__textarea, [data-panel="edit"] [data-action="save"]'
        )
        ?.focus({ preventScroll: true });
    } else if (previous === 'edit' || focusWasInPanel) {
      const opener = previous === 'edit' ? 'edit' : 'show-delete';
      this.shadowRoot.querySelector(`[data-action="${opener}"]`)?.focus({ preventScroll: true });
    }
  }

  _notifyDraggableStateChange() {
    const uploader = this._uploader();
    if (uploader && uploader._updateDraggableState) {
      uploader._updateDraggableState();
    }
  }

  /**
   * Put a control for each field, holding its current value, into the edit panel
   */
  _fillEditor() {
    const panel = this.shadowRoot.querySelector('[data-panel="edit"]');

    const rows = [...(this._fieldSchema ?? [])].map(([key, fieldDef]) => {
      const id = generateId('field');
      const control =
        fieldDef.type === 'textarea'
          ? el('textarea', { class: 'uploader__textarea', rows: '3', id })
          : el('input', { type: fieldDef.type, class: 'uploader__input', id });
      control.name = key;
      control.value = this._fieldData.get(key) || '';
      control.required = Boolean(fieldDef.required);
      if (fieldDef.maxlength) {
        control.maxLength = fieldDef.maxlength;
      }

      const row = el('div', { class: 'uploader__edit-field' });
      row.append(el('label', { class: 'field__label', for: id }, fieldDef.label), control);
      return row;
    });

    panel.querySelector('.uploader__edit-fields').replaceChildren(...rows);
    panel.querySelector('.uploader__edit-message').textContent = '';
  }

  /**
   * Save the fields changed in the edit panel, one request per field, and close it once they are all
   * saved. A failure keeps the panel open with a message.
   */
  async _saveDetails(form) {
    const uploader = this._uploader();
    const changed = [...form.querySelectorAll('[name]')].filter(
      control => control.value !== (this._fieldData.get(control.name) || '')
    );

    if (changed.length === 0 || !uploader?.config.updateAction) {
      this._setPanel('info');
      return;
    }

    const message = form.querySelector('.uploader__edit-message');
    const buttons = [...form.querySelectorAll('button')];
    buttons.forEach(button => {
      button.disabled = true;
    });
    message.textContent = '';

    try {
      for (const control of changed) {
        await this._saveField(uploader, control.name, control.value);
      }
      this._setPanel('info');
    } catch (error) {
      if (error.name === 'AbortError') return;
      uploader.logger?.error('Failed to update field:', error);
      message.textContent = `Changes couldn’t be saved: ${error.message}`;
      /* The message adds a line, so the card makes room for it */
      this._syncContentHeight('edit');
    } finally {
      buttons.forEach(button => {
        button.disabled = false;
      });
    }
  }

  async _saveField(uploader, key, value) {
    const fileId = this.getAttribute('file-id');
    const response = await uploader._postJson(uploader.config.updateAction, {
      id: fileId,
      field: key,
      value,
    });
    if (!response.ok) {
      throw new Error(errorMessage(await response.text(), 'Server error'));
    }

    this._fieldData.set(key, value);
    let dataElement = this.querySelector(`p-uploader-data[key="${CSS.escape(key)}"]`);
    if (!dataElement) {
      dataElement = document.createElement('p-uploader-data');
      dataElement.setAttribute('key', key);
      this.appendChild(dataElement);
    }
    dataElement.textContent = value;
    this._updateFieldDisplay(key, value);

    dispatchComponentEvent(this, 'p-uploader-file:update', { fileId, field: key, value });
  }

  async _handleConfirmDelete() {
    const uploader = this._uploader();
    const fileId = this.getAttribute('file-id');
    const currentState = this.getAttribute('state');

    /* If file is in error state or was never uploaded, just remove it locally */
    if (currentState === 'error' || currentState === 'uploading') {
      this._removeFile();
      return;
    }

    if (!uploader || !uploader.config.deleteAction) {
      /* No delete action configured, just remove locally */
      this._removeFile();
      return;
    }

    try {
      const response = await uploader._postJson(uploader.config.deleteAction, {
        id: fileId,
      });

      if (response.ok) {
        /* Delete successful, remove the file */
        this._removeFile();

        dispatchComponentEvent(this, 'p-uploader-file:delete', { fileId });
      } else {
        /* Delete failed, show error */
        const errorText = await response.text();
        if (uploader.logger) {
          uploader.logger.error('Failed to delete file:', errorText);
        }
        this.setAttribute('error', `Delete failed: ${errorMessage(errorText, 'Server error')}`);
        this.setAttribute('data-current-panel', 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      /* Network error, show error */
      if (uploader.logger) {
        uploader.logger.error('Failed to delete file:', error);
      }
      this.setAttribute('error', `Delete failed: ${error.message || 'Network error'}`);
      this.setAttribute('data-current-panel', 'error');
    }
  }

  _removeFile() {
    const uploader = this._uploader();
    const fileId = this.getAttribute('file-id');

    /* Clean up from parent's file tracking */
    if (uploader && fileId && uploader.files.has(fileId)) {
      uploader.files.delete(fileId);
    }

    /* Remove element from DOM */
    this.remove();

    /* Update draggable and full state */
    uploader?._updateDraggableState?.();
    uploader?._updateFullState?.();
  }
}

if (!customElements.get('p-uploader-file')) {
  customElements.define('p-uploader-file', PUploaderFile);
}
