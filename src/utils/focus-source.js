/**
 * Whether focus last moved by keyboard or by pointer, so focus rings show to keyboard users only
 *
 * Browsers count a focused text field as `:focus-visible` even after a click, so `:focus-visible`
 * alone can't hide rings from pointer users. `trackFocusSource()` records the last input on `<html>`
 * as `data-focus-source="keyboard"` or `"pointer"` for page styles. Web components call
 * `followFocusSource(host)` to copy it onto their host, where shadow styles read it with
 * `:host([data-focus-source="pointer"])`. Until the first input, and on pages that never call it,
 * the attribute is absent and rings show as usual.
 */

const TEXT_ENTRY_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

const followed = new WeakSet();
let source = 'keyboard';
let tracking = false;

const isTextEntry = element =>
  Boolean(element?.isContentEditable) ||
  element?.localName === 'textarea' ||
  (element?.localName === 'input' && TEXT_ENTRY_TYPES.has(element.type));

const setSource = value => {
  source = value;
  document.documentElement.setAttribute('data-focus-source', value);

  const active = document.activeElement;
  if (active && followed.has(active)) {
    active.setAttribute('data-focus-source', value);
  }
};

/**
 * Start recording the last input method on `<html>`. Calling it again does nothing.
 *
 * A pointer press counts as pointer input. A key press counts as keyboard input, except typing in a
 * text field and shortcuts with Ctrl, Alt or Meta; Tab always counts.
 */
export function trackFocusSource() {
  if (tracking || typeof document === 'undefined') return;
  tracking = true;

  document.addEventListener('pointerdown', () => setSource('pointer'), true);
  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Tab' && (event.ctrlKey || event.altKey || event.metaKey)) return;
      if (event.key === 'Tab' || !isTextEntry(event.composedPath()[0])) {
        setSource('keyboard');
      }
    },
    true
  );
}

/**
 * The input method the page last recorded, which is a keyboard until anything is recorded
 *
 * Read from `<html>` rather than from this module's own record so that a page which sets the
 * attribute itself, or renders it server side, is answered as it asked.
 *
 * @returns {'keyboard'|'pointer'}
 */
export function focusSource() {
  return document.documentElement.getAttribute('data-focus-source') === 'pointer'
    ? 'pointer'
    : 'keyboard';
}

/**
 * Keep a host's `data-focus-source` in step with the last input method while focus is inside it
 *
 * @param {HTMLElement} host
 */
export function followFocusSource(host) {
  trackFocusSource();
  if (followed.has(host)) return;
  followed.add(host);
  host.addEventListener('focusin', () => host.setAttribute('data-focus-source', source));
}
