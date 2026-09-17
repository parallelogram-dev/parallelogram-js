import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../src/components/PUploader.js';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const PAYLOAD = '<img src="data:," onerror="window.__puploaderInjected = true">';

const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));

/* The card's depth is animated, so a test watching it waits for the transition to land; vitest's
   own second isn't always enough for WebKit on a loaded CI runner. */
const SETTLED = { timeout: 5000 };

const element = (tag, attributes = {}, text) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

async function mountUploader({ caption = 'A caption', attributes = {} } = {}) {
  const uploader = element('p-uploader', {
    'upload-action': '/api/upload',
    'update-action': '/api/update',
    ...attributes,
  });
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

    shadow.querySelector('button[data-action="edit"]').click();
    shadow.querySelector('[data-panel="edit"] [name="caption"]').value = PAYLOAD;
    shadow.querySelector('[data-panel="edit"] [data-action="save"]').click();

    await vi.waitFor(() => expect(shadow.querySelector('.field__value').textContent).toBe(PAYLOAD));
    expect(shadow.querySelectorAll('img')).toHaveLength(1);
    expect(window.__puploaderInjected).toBeUndefined();
  });

  it('announces a saved field to the page as p-uploader-file:update', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    const { file } = await mountUploader();
    const updated = new Promise(resolve =>
      document.addEventListener(
        'p-uploader-file:update',
        event => resolve([event.composed, event.detail]),
        { once: true }
      )
    );
    const shadow = file.shadowRoot;

    shadow.querySelector('button[data-action="edit"]').click();
    shadow.querySelector('[data-panel="edit"] [name="caption"]').value = 'New caption';
    shadow.querySelector('[data-panel="edit"] [data-action="save"]').click();

    await expect(updated).resolves.toEqual([
      true,
      { fileId: 'file-1', field: 'caption', value: 'New caption' },
    ]);
  });

  it('labels the delete panel with its own heading even when the filename has quotes', async () => {
    const file = element('p-uploader-file', { filename: 'say "cheese".jpg' });
    document.body.append(file);
    await nextTask();

    const panel = file.shadowRoot.querySelector('[data-panel="delete"]');
    const heading = file.shadowRoot.getElementById(panel.getAttribute('aria-labelledby'));
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

class RecordingUpload {
  static instances = [];
  static status = 200;
  static body = '{"id":"server-1"}';
  static hold = false;
  upload = new EventTarget();
  #events = new EventTarget();
  headers = {};
  status = 0;
  responseText = '';
  aborted = false;

  constructor() {
    RecordingUpload.instances.push(this);
  }

  addEventListener(type, listener) {
    this.#events.addEventListener(type, listener);
  }

  open(method, url) {
    this.url = url;
  }

  setRequestHeader(name, value) {
    this.headers[name] = value;
  }

  send(body) {
    this.body = body;
    if (RecordingUpload.hold) return;
    this.status = RecordingUpload.status;
    this.responseText = RecordingUpload.body;
    queueMicrotask(() => this.#events.dispatchEvent(new Event('load')));
  }

  abort() {
    this.aborted = true;
  }
}

const addFiles = (uploader, files) => {
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  const input = uploader.shadowRoot.querySelector('input[type="file"]');
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
};

const fileIds = uploader =>
  [...uploader.querySelectorAll('p-uploader-file')].map(file => file.getAttribute('file-id'));

const drag = (type, target, dataTransfer) => {
  /* A real drag is preceded by the press that started it, which is what says where it began */
  if (type === 'dragstart') {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
  }
  return target.dispatchEvent(
    new DragEvent(type, { bubbles: true, composed: true, cancelable: true, dataTransfer })
  );
};

/* Drags start on the thumbnail: it is the handle, so a press elsewhere stays a click */
const handleOf = file => file.shadowRoot.querySelector('[part~="preview"]');

describe('p-uploader host', () => {
  beforeEach(() => {
    RecordingUpload.instances = [];
    RecordingUpload.status = 200;
    RecordingUpload.body = '{"id":"server-1"}';
    RecordingUpload.hold = false;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  const renderUploader = async (attributes = {}, ids = []) => {
    const uploader = element('p-uploader', attributes);
    ids.forEach(id =>
      uploader.append(element('p-uploader-file', { 'file-id': id, filename: `${id}.jpg` }))
    );
    document.body.append(uploader);
    await nextTask();
    uploader.setXHR(RecordingUpload);
    return uploader;
  };

  const reorder = uploader => {
    const [first, second] = uploader.querySelectorAll('p-uploader-file');
    const transfer = new DataTransfer();
    drag('dragstart', handleOf(first), transfer);
    drag('dragenter', second, transfer);
    drag('drop', second, transfer);
    drag('dragend', first, transfer);
  };

  it('keeps the delete confirmation open when it is asked for just after an upload finishes', async () => {
    const uploader = await renderUploader({
      'upload-action': '/api/upload',
      'delete-action': '/api/delete',
    });
    addFiles(uploader, [new File(['x'], 'harbour.txt', { type: 'text/plain' })]);
    const file = await vi.waitFor(() => {
      const added = uploader.querySelector('p-uploader-file[state="uploaded"]');
      expect(added).not.toBeNull();
      return added;
    });

    /* The card switches itself to the info panel shortly after an upload finishes */
    file.shadowRoot.querySelector('[data-action="show-delete"]').click();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(file.getAttribute('data-current-panel')).toBe('delete');
  });

  it('keeps a delete confirmation open when the card settles its state again underneath', async () => {
    const uploader = await renderUploader({
      'upload-action': '/api/upload',
      'delete-action': '/api/delete',
    });
    addFiles(uploader, [new File(['x'], 'harbour.txt', { type: 'text/plain' })]);
    const file = await vi.waitFor(() => {
      const added = uploader.querySelector('p-uploader-file[state="uploaded"]');
      expect(added).not.toBeNull();
      return added;
    });

    file.shadowRoot.querySelector('[data-action="show-delete"]').click();
    /* Anything that sets the state again schedules the card's own switch back to the details */
    file.setAttribute('state', 'uploaded');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(file.getAttribute('data-current-panel')).toBe('delete');
  });

  it('pushes the details up for the confirmation and brings them back down on cancel', async () => {
    const uploader = await renderUploader({ 'delete-action': '/api/delete' }, ['first', 'second']);
    const [file] = uploader.querySelectorAll('p-uploader-file');
    const info = file.shadowRoot.querySelector('[data-panel="info"]');
    const settle = () => {
      info.getAnimations().forEach(animation => animation.finish());
      return Math.round(new DOMMatrix(getComputedStyle(info).transform).m42);
    };

    file.shadowRoot.querySelector('[data-action="show-delete"]').click();
    const whileConfirming = settle();
    file.shadowRoot.querySelector('[data-panel="delete"] [data-action="cancel"]').click();

    /* Negative is up: the details wait above the confirmation, not below it */
    expect([whileConfirming < 0, settle()]).toEqual([true, 0]);
  });

  it('lines the delete confirmation up with the card, even though focus moves into it', async () => {
    const uploader = await renderUploader({ 'delete-action': '/api/delete' }, ['first', 'second']);
    const [file] = uploader.querySelectorAll('p-uploader-file');
    const content = file.shadowRoot.querySelector('.uploader__content');

    file.shadowRoot.querySelector('[data-action="show-delete"]').click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    /* Focus lands on Cancel while its panel is still out of view, which scrolls the clipped box
       the panels are stacked in unless the component puts it back */
    const panel = file.shadowRoot.querySelector('[data-panel="delete"]');
    panel.getAnimations().forEach(animation => animation.finish());
    expect([
      content.scrollTop,
      Math.round(panel.getBoundingClientRect().top - content.getBoundingClientRect().top),
    ]).toEqual([0, 0]);
  });

  it('shows the dragged file as a chip that follows the cursor', async () => {
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);
    const [file] = uploader.querySelectorAll('p-uploader-file');
    file.setAttribute('filename', 'harbour.jpg');
    file.setAttribute('preview', 'images/harbour.jpg');
    const transfer = new DataTransfer();
    let handedToBrowser = null;
    transfer.setDragImage = element => {
      handedToBrowser = element.tagName;
    };

    drag('dragstart', file.shadowRoot.querySelector('[part~="preview"]'), transfer);
    const chip = uploader.shadowRoot.querySelector('[part~="drag-chip"]');
    document.dispatchEvent(new DragEvent('dragover', { bubbles: true, clientX: 120, clientY: 80 }));
    const moved = chip.style.transform;
    drag('dragend', file, transfer);

    expect([
      chip.textContent,
      chip.querySelector('img')?.getAttribute('src'),
      /* The browser is given a blank picture of its own, so only the chip shows */
      handedToBrowser,
      moved,
      uploader.shadowRoot.querySelector('[part~="drag-chip"]'),
    ]).toEqual(['harbour.jpg', 'images/harbour.jpg', 'IMG', 'translate(132px, 60px)', null]);
  });

  it('starts a drag only from the thumbnail, so pressing a button cannot reorder files', async () => {
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);
    const [first, second] = uploader.querySelectorAll('p-uploader-file');
    const before = fileIds(uploader);
    const moveButton = first.shadowRoot.querySelector('[data-action="move-down"]');
    const transfer = new DataTransfer();

    /* A press on a button that the browser turns into a drag of the card beneath it */
    drag('dragstart', moveButton, transfer);
    drag('dragenter', second, transfer);
    drag('drop', second, transfer);
    drag('dragend', moveButton, transfer);

    expect(fileIds(uploader)).toEqual(before);
  });

  it('opens the file picker from a button keyboard users can reach', async () => {
    const uploader = await renderUploader({ 'upload-action': '/api/upload' });
    const input = uploader.shadowRoot.querySelector('input[type="file"]');
    const pick = vi.spyOn(input, 'click').mockImplementation(() => {});
    const button = uploader.shadowRoot.querySelector('button[part~="add-button"]');

    button?.click();

    expect([button?.tabIndex, pick.mock.calls.length]).toEqual([0, 1]);
  });

  it('marks itself full and hides the drop zone once max-files is reached', async () => {
    const uploader = await renderUploader({ 'max-files': '1', 'upload-action': '/api/upload' }, [
      'photo',
    ]);

    const selector = uploader.shadowRoot.querySelector('[part~="selector"]');
    expect([uploader.hasAttribute('full'), getComputedStyle(selector).display]).toEqual([
      true,
      'none',
    ]);
  });

  it('reports files beyond max-files inline and through an event instead of alert()', async () => {
    const alerts = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const uploader = await renderUploader({ 'max-files': '1', 'upload-action': '/api/upload' }, [
      'photo',
    ]);
    const limits = [];
    uploader.addEventListener('p-uploader:limit', event => limits.push(event.detail.maxFiles));

    addFiles(uploader, [new File(['x'], 'second.txt', { type: 'text/plain' })]);

    expect({
      limits,
      alerts: alerts.mock.calls.length,
      message: uploader.shadowRoot.querySelector('[part~="message"]')?.textContent,
    }).toEqual({ limits: [1], alerts: 0, message: 'You can add up to 1 file.' });
  });

  it('rejects files that are too large or not an accepted type', async () => {
    const uploader = await renderUploader({
      'upload-action': '/api/upload',
      'accept-types': 'image/*',
      'max-file-size': '1024',
    });
    const rejected = [];
    uploader.addEventListener('p-uploader:reject', event =>
      rejected.push([event.detail.file.name, event.detail.reason])
    );

    addFiles(uploader, [
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
      new File([new Uint8Array(2048)], 'huge.jpg', { type: 'image/jpeg' }),
    ]);

    expect({ rejected, cards: uploader.querySelectorAll('p-uploader-file').length }).toEqual({
      rejected: [
        ['notes.txt', 'type'],
        ['huge.jpg', 'size'],
      ],
      cards: 0,
    });
  });

  it('sends each file under its input-name and treats any 2xx response as success', async () => {
    RecordingUpload.status = 201;
    const uploader = await renderUploader({
      'upload-action': '/api/upload',
      'input-name': 'images',
    });

    addFiles(uploader, [new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    await vi.waitFor(() =>
      expect(uploader.querySelector('p-uploader-file')?.getAttribute('state')).toBe('uploaded')
    );
    expect(RecordingUpload.instances[0].body.has('images')).toBe(true);
  });

  it('adds the page’s CSRF token to uploads', async () => {
    const meta = element('meta', { name: 'csrf-token', content: 'token-123' });
    document.head.append(meta);

    try {
      const uploader = await renderUploader({ 'upload-action': '/api/upload' });
      addFiles(uploader, [new File(['x'], 'notes.txt', { type: 'text/plain' })]);

      await vi.waitFor(() => expect(RecordingUpload.instances).toHaveLength(1));
      expect(RecordingUpload.instances[0].headers).toEqual({ 'X-CSRF-Token': 'token-123' });
    } finally {
      meta.remove();
    }
  });

  it('sends requestHeaders with a new order', async () => {
    const save = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', save);
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);
    uploader.requestHeaders = { 'X-CSRF-Token': 'from-property' };

    reorder(uploader);

    await vi.waitFor(() => expect(save).toHaveBeenCalled());
    expect(new Headers(save.mock.calls[0][1].headers).get('X-CSRF-Token')).toBe('from-property');
  });

  it('announces a saved order to the page as p-uploader:sequence-update', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);
    const saved = new Promise(resolve =>
      document.addEventListener(
        'p-uploader:sequence-update',
        event => resolve([event.composed, [...event.detail.sequence].sort()]),
        { once: true }
      )
    );

    reorder(uploader);

    await expect(saved).resolves.toEqual([true, ['first', 'second']]);
  });

  it('draws the uploader and an added file with the dark roles when data-theme is dark', async () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    document.documentElement.dataset.theme = 'dark';

    try {
      const uploader = await renderUploader({ 'upload-action': '/api/upload' });
      /* The file item only exists once a file is added, and settles once its upload finishes */
      addFiles(uploader, [new File(['x'], 'harbour.txt', { type: 'text/plain' })]);
      const file = await vi.waitFor(() => {
        const added = uploader.querySelector('p-uploader-file[state="uploaded"]');
        expect(added).not.toBeNull();
        return added;
      });
      const selector = uploader.shadowRoot.querySelector('[part~="selector"]');
      const panel = file.shadowRoot.querySelector('[data-panel="info"]');

      const colours = () => {
        [uploader, selector, file, panel].forEach(node =>
          node.getAnimations().forEach(animation => animation.finish())
        );
        return [
          getComputedStyle(uploader).backgroundColor,
          getComputedStyle(uploader).borderTopColor,
          getComputedStyle(selector).backgroundColor,
          getComputedStyle(selector).color,
          getComputedStyle(file).backgroundColor,
          /* The cards carry no border of their own; the list's gap separates them */
          getComputedStyle(file).borderTopStyle,
          getComputedStyle(panel).backgroundColor,
        ];
      };

      await vi.waitFor(() =>
        expect(colours()).toEqual([
          'rgb(23, 29, 38)',
          'rgba(255, 255, 255, 0.14)',
          'color(srgb 0.376471 0.647059 0.980392 / 0.08)',
          'rgb(147, 197, 253)',
          'rgb(23, 29, 38)',
          'none',
          'rgb(23, 29, 38)',
        ])
      );
    } finally {
      delete document.documentElement.dataset.theme;
      style.remove();
    }
  });

  it('announces a finished upload to the page as p-uploader:upload-success', async () => {
    const uploader = await renderUploader({ 'upload-action': '/api/upload' });
    const uploaded = new Promise(resolve =>
      document.addEventListener(
        'p-uploader:upload-success',
        event => resolve([event.composed, event.detail.response]),
        { once: true }
      )
    );

    addFiles(uploader, [new File(['hello'], 'notes.txt', { type: 'text/plain' })]);

    await expect(uploaded).resolves.toEqual([true, { id: 'server-1' }]);
  });

  it('no longer dispatches the removed upload:success alias', async () => {
    const uploader = await renderUploader({ 'upload-action': '/api/upload' });
    const events = [];
    for (const type of ['p-uploader:upload-success', 'upload:success']) {
      uploader.addEventListener(type, () => events.push(type));
    }

    addFiles(uploader, [new File(['hello'], 'notes.txt', { type: 'text/plain' })]);

    await vi.waitFor(() => expect(events).toEqual(['p-uploader:upload-success']));
  });

  it('restores the original order when saving a new order fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 }))
    );
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);

    reorder(uploader);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await vi.waitFor(() => expect(fileIds(uploader)).toEqual(['first', 'second']));
  });

  it('restores the original order when a drag is abandoned', async () => {
    const save = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', save);
    const uploader = await renderUploader({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
    ]);
    const [first, second] = uploader.querySelectorAll('p-uploader-file');
    const transfer = new DataTransfer();

    drag('dragstart', handleOf(first), transfer);
    drag('dragenter', second, transfer);
    drag('dragend', first, transfer);
    await nextTask();

    expect([fileIds(uploader), save.mock.calls.length]).toEqual([['first', 'second'], 0]);
  });

  it('offers no delete button or reordering without the matching actions', async () => {
    const uploader = await renderUploader({}, ['first', 'second']);
    const [first] = uploader.querySelectorAll('p-uploader-file');

    expect({
      deleteButton: first.shadowRoot.querySelector('[data-action="show-delete"]') !== null,
      draggable: first.hasAttribute('draggable'),
    }).toEqual({ deleteButton: false, draggable: false });
  });

  it('stops uploads in progress when removed from the page', async () => {
    RecordingUpload.hold = true;
    const uploader = await renderUploader({ 'upload-action': '/api/upload' });
    addFiles(uploader, [new File(['x'], 'notes.txt', { type: 'text/plain' })]);
    await vi.waitFor(() => expect(RecordingUpload.instances).toHaveLength(1));

    uploader.remove();

    expect(RecordingUpload.instances[0].aborted).toBe(true);
  });
});

describe('p-uploader-file', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const renderCard = async ({ attributes = {}, fields = [], data = {} } = {}) => {
    const uploader = element('p-uploader', attributes);
    if (fields.length > 0) {
      const definitions = element('p-uploader-fields', { slot: 'field-definitions' });
      fields.forEach(([key, label, type = 'text']) =>
        definitions.append(element('p-uploader-field', { key, label, type }))
      );
      uploader.append(definitions);
    }
    const file = element('p-uploader-file', { 'file-id': 'file-1', filename: 'harbour.jpg' });
    Object.entries(data).forEach(([key, value]) =>
      file.append(element('p-uploader-data', { key }, value))
    );
    uploader.append(file);
    document.body.append(uploader);
    await nextTask();
    return { uploader, file, shadow: file.shadowRoot };
  };

  it('shows no fields when none are declared', async () => {
    const { shadow } = await renderCard({ attributes: { 'update-action': '/api/update' } });

    expect(shadow.querySelectorAll('.uploader__field')).toHaveLength(0);
  });

  it('hides empty fields when the details cannot be edited', async () => {
    const { shadow } = await renderCard({
      fields: [
        ['title', 'Title'],
        ['caption', 'Caption', 'textarea'],
      ],
      data: { title: 'Harbour at dawn' },
    });

    const labels = [...shadow.querySelectorAll('.uploader__field .field__label')].map(
      label => label.textContent
    );
    expect(labels).toEqual(['Title']);
  });

  it('edits every field in one panel and saves only the changed ones', async () => {
    const save = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', save);
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [
        ['title', 'Title'],
        ['caption', 'Caption', 'textarea'],
      ],
      data: { title: 'Harbour at dawn', caption: 'Boats' },
    });

    shadow.querySelector('button[data-action="edit"]').click();
    const panel = shadow.querySelector('[data-panel="edit"]');
    const opened = [
      panel?.classList.contains('uploader__panel--show'),
      [...(panel?.querySelectorAll('[name]') ?? [])].map(control => control.name),
    ];
    panel.querySelector('[name="caption"]').value = 'Fishing boats';
    panel.querySelector('button[data-action="save"]').click();

    await vi.waitFor(() => expect(panel.inert).toBe(true));
    expect({
      opened,
      saves: save.mock.calls.map(([, init]) => JSON.parse(init.body)),
      shown: [...shadow.querySelectorAll('.field__value')].map(value => value.textContent),
    }).toEqual({
      opened: [true, ['title', 'caption']],
      saves: [{ id: 'file-1', field: 'caption', value: 'Fishing boats' }],
      shown: ['Harbour at dawn', 'Fishing boats'],
    });
  });

  it('returns focus to the edit button when the edit panel is cancelled', async () => {
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [['title', 'Title']],
      data: { title: 'Harbour at dawn' },
    });
    const edit = shadow.querySelector('button[data-action="edit"]');

    edit.focus();
    edit.click();
    shadow.querySelector('[data-panel="edit"] button[data-action="cancel"]').click();

    expect([
      shadow.querySelector('[data-panel="edit"]').inert,
      shadow.activeElement === edit,
    ]).toEqual([true, true]);
  });

  it('slides the edit panel in over the details and back out again', async () => {
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [['title', 'Title']],
      data: { title: 'Harbour at dawn' },
    });
    const info = shadow.querySelector('[data-panel="info"]');
    const edit = shadow.querySelector('[data-panel="edit"]');

    shadow.querySelector('button[data-action="edit"]').click();
    const opened = [edit.inert, info.inert];
    shadow.querySelector('[data-panel="edit"] button[data-action="cancel"]').click();

    expect({ opened, closed: [edit.inert, info.inert] }).toEqual({
      opened: [false, true],
      closed: [true, false],
    });
  });

  it('moves focus into the edit panel when it opens', async () => {
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [['title', 'Title']],
      data: { title: 'Harbour at dawn' },
    });

    shadow.querySelector('button[data-action="edit"]').click();

    expect([
      shadow.activeElement?.name,
      Boolean(shadow.activeElement?.closest('[data-panel="edit"]')),
    ]).toEqual(['title', true]);
  });

  it('cancels the edit panel when Escape is pressed', async () => {
    const { file, shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [['title', 'Title']],
      data: { title: 'Harbour at dawn' },
    });
    const editButton = shadow.querySelector('button[data-action="edit"]');

    editButton.click();
    shadow.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
    );

    expect([file.getAttribute('data-current-panel'), shadow.activeElement === editButton]).toEqual([
      'info',
      true,
    ]);
  });

  it('takes the depth of the edit form while it is open, and its own again after', async () => {
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [
        ['title', 'Title'],
        ['caption', 'Caption', 'textarea'],
        ['credit', 'Credit'],
        ['notes', 'Notes', 'textarea'],
      ],
      data: { title: 'Harbour at dawn', caption: 'Boats' },
    });
    const content = shadow.querySelector('.uploader__content');
    const panel = shadow.querySelector('[data-panel="edit"]');
    const details = shadow.querySelector('[data-panel="info"]');
    const height = () => Math.round(content.getBoundingClientRect().height);
    /* Whichever panel is on show says how deep the card is, so neither is ever cropped */
    await vi.waitFor(() => expect(height()).toBe(details.scrollHeight), SETTLED);
    const closed = height();

    shadow.querySelector('button[data-action="edit"]').click();
    await vi.waitFor(() => expect(height()).toBe(panel.scrollHeight), SETTLED);
    const open = height();
    shadow.querySelector('[data-panel="edit"] button[data-action="cancel"]').click();

    await vi.waitFor(() => expect([open > closed, height()]).toEqual([true, closed]), SETTLED);
  });

  it('exposes parts for styling and does not render the filename as a heading', async () => {
    const { shadow } = await renderCard({
      attributes: { 'update-action': '/api/update' },
      fields: [['title', 'Title']],
      data: { title: 'Harbour at dawn' },
    });

    const parts = [
      'preview',
      'filename',
      'fields',
      'field',
      'actions',
      'panel',
      'edit-panel',
      'progress',
    ].filter(part => !shadow.querySelector(`[part~="${part}"]`));
    expect([parts, shadow.querySelector('[part~="filename"]')?.localName]).toEqual([[], 'p']);
  });

  it('makes panels that are not showing inert', async () => {
    const { shadow } = await renderCard({ attributes: { 'delete-action': '/api/delete' } });

    expect([
      shadow.querySelector('[data-panel="info"]').inert,
      shadow.querySelector('[data-panel="delete"]').inert,
    ]).toEqual([false, true]);
  });
});

describe('p-uploader layout', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const renderList = async (attributes = {}) => {
    const uploader = element('p-uploader', attributes);
    ['first', 'second', 'third'].forEach(id =>
      uploader.append(element('p-uploader-file', { 'file-id': id, filename: `${id}.jpg` }))
    );
    document.body.append(uploader);
    await nextTask();
    return uploader;
  };

  it('spaces files by --uploader-files-gap', async () => {
    const uploader = await renderList({ style: '--uploader-files-gap: 20px' });

    expect(getComputedStyle(uploader.shadowRoot.querySelector('[part~="files"]')).rowGap).toBe(
      '20px'
    );
  });

  it('joins stacked files into one list with only its outer corners rounded', async () => {
    const uploader = await renderList({ stacked: '', style: '--surface-card-radius: 12px' });
    const [first, second, third] = uploader.querySelectorAll('p-uploader-file');
    const radius = (file, corner) => getComputedStyle(file)[`border${corner}Radius`];

    expect({
      gap: getComputedStyle(uploader.shadowRoot.querySelector('[part~="files"]')).rowGap,
      first: [radius(first, 'TopLeft'), radius(first, 'BottomLeft')],
      second: [radius(second, 'TopLeft'), radius(second, 'BottomLeft')],
      third: [radius(third, 'TopLeft'), radius(third, 'BottomLeft')],
    }).toEqual({
      gap: '0px',
      first: ['12px', '0px'],
      second: ['0px', '0px'],
      third: ['0px', '12px'],
    });
  });
});

describe('p-uploader ordering and replacing without dragging', () => {
  beforeEach(() => {
    RecordingUpload.instances = [];
    RecordingUpload.status = 200;
    RecordingUpload.body = '{"id":"server-2"}';
    RecordingUpload.hold = false;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  const renderFiles = async (attributes, ids) => {
    const uploader = element('p-uploader', attributes);
    ids.forEach(id =>
      uploader.append(element('p-uploader-file', { 'file-id': id, filename: `${id}.jpg` }))
    );
    document.body.append(uploader);
    await nextTask();
    uploader.setXHR(RecordingUpload);
    return uploader;
  };

  const control = (uploader, id, action) =>
    uploader
      .querySelector(`p-uploader-file[file-id="${id}"]`)
      ?.shadowRoot.querySelector(`button[data-action="${action}"]`);

  it('moves a file down with its Move down button, saves the order and keeps focus on it', async () => {
    const save = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', save);
    const uploader = await renderFiles({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
      'third',
    ]);

    const moveDown = control(uploader, 'first', 'move-down');
    moveDown?.focus();
    moveDown?.click();

    await vi.waitFor(() => expect(save).toHaveBeenCalled());
    const moved = uploader.querySelector('p-uploader-file[file-id="first"]');
    expect({
      order: fileIds(uploader),
      saved: JSON.parse(save.mock.calls[0][1].body),
      focused: moved.shadowRoot.activeElement?.dataset.action,
    }).toEqual({
      order: ['second', 'first', 'third'],
      saved: { sequence: ['second', 'first', 'third'] },
      focused: 'move-down',
    });
  });

  it('keeps and saves the latest order when an earlier order fails to save after a second move', async () => {
    let settleFirst;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise(resolve => (settleFirst = resolve)))
      .mockImplementation(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', save);
    const uploader = await renderFiles({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
      'third',
    ]);
    const saved = new Promise(resolve =>
      uploader.addEventListener('p-uploader:sequence-update', resolve, { once: true })
    );

    control(uploader, 'first', 'move-down')?.click();
    control(uploader, 'first', 'move-down')?.click();
    settleFirst(new Response('nope', { status: 500 }));
    await saved;

    expect({
      order: fileIds(uploader),
      sent: save.mock.calls.map(([, init]) => JSON.parse(init.body).sequence),
      message: uploader.shadowRoot.querySelector('[part~="message"]')?.textContent,
    }).toEqual({
      order: ['second', 'third', 'first'],
      sent: [
        ['second', 'first', 'third'],
        ['second', 'third', 'first'],
      ],
      message: 'Moved first.jpg to position 3 of 3.',
    });
  });

  it('returns to the last saved order when the latest order fails to save', async () => {
    let settleFirst;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise(resolve => (settleFirst = resolve)))
      .mockImplementation(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', save);
    const uploader = await renderFiles({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
      'third',
    ]);
    const message = () => uploader.shadowRoot.querySelector('[part~="message"]')?.textContent;

    control(uploader, 'first', 'move-down')?.click();
    control(uploader, 'first', 'move-down')?.click();
    settleFirst(new Response('{}', { status: 200 }));

    await vi.waitFor(() => expect(message()).toMatch(/couldn’t be saved/));
    expect(fileIds(uploader)).toEqual(['second', 'first', 'third']);
  });

  it('disables moving past either end of the list', async () => {
    const uploader = await renderFiles({ 'sequence-action': '/api/sequence' }, [
      'first',
      'second',
      'third',
    ]);

    expect({
      firstUp: control(uploader, 'first', 'move-up')?.disabled,
      firstDown: control(uploader, 'first', 'move-down')?.disabled,
      lastDown: control(uploader, 'third', 'move-down')?.disabled,
    }).toEqual({ firstUp: true, firstDown: false, lastDown: true });
  });

  it('offers no move buttons when allow-sort is "0"', async () => {
    const uploader = await renderFiles({ 'sequence-action': '/api/sequence', 'allow-sort': '0' }, [
      'first',
      'second',
    ]);

    expect(control(uploader, 'first', 'move-down')).toBeFalsy();
  });

  it('offers no move buttons without a sequence-action', async () => {
    const uploader = await renderFiles({}, ['first', 'second']);

    expect(control(uploader, 'first', 'move-down')).toBeFalsy();
  });

  it('replaces the file in a single-file uploader', async () => {
    const remove = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', remove);
    const uploader = await renderFiles(
      { 'max-files': '1', 'upload-action': '/api/upload', 'delete-action': '/api/delete' },
      ['old']
    );
    const input = uploader.shadowRoot.querySelector('input[type="file"]');
    const pick = vi.spyOn(input, 'click').mockImplementation(() => {});

    control(uploader, 'old', 'replace')?.click();
    addFiles(uploader, [new File(['x'], 'new.txt', { type: 'text/plain' })]);

    await vi.waitFor(() =>
      expect(
        [...uploader.querySelectorAll('p-uploader-file')].map(file => file.getAttribute('filename'))
      ).toEqual(['new.txt'])
    );
    expect({
      picked: pick.mock.calls.length,
      deleted: remove.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)]),
      full: uploader.hasAttribute('full'),
    }).toEqual({ picked: 1, deleted: [['/api/delete', { id: 'old' }]], full: true });
  });
});
