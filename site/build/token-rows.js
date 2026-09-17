/**
 * Which row a token belongs on, and how that row is shown working
 *
 * No filesystem here on purpose: the renderer imports this, and the renderer is loaded by a browser
 * test. Reading the stylesheets lives in tokens.js, which only Node ever imports -- importing a
 * module that names `node:fs` throws in a browser whether or not the call is ever made.
 */

/* A family is one row: the values that are only meaningful together */
const VARIANTS = ['primary', 'secondary', 'danger', 'ghost'];

const familyOf = name => {
  let match = name.match(/^--surface-([a-z]+)-/);
  if (match) return `surface-${match[1]}`;
  match = name.match(/^--button-([a-z]+)/);
  if (match) return VARIANTS.includes(match[1]) ? `button-${match[1]}` : 'button';
  if (name.startsWith('--form-control-')) return 'form-control';
  if (name.startsWith('--panel-')) return 'panel';
  if (name.startsWith('--modal-')) return 'modal';
  if (name.startsWith('--framework-focus-')) return 'focus';
  if (name.startsWith('--framework-transition-')) return 'motion';
  match = name.match(/^--color-([a-z]+)/);
  if (match) return `color-${match[1]}`;
  return 'other';
};

/** How a family is shown working: the demo that uses its values together */
const FAMILY = {
  'color-accent': ['Accent', 'button'],
  'color-danger': ['Danger', 'status'],
  'color-success': ['Success', 'status'],
  'color-warning': ['Warning', 'status'],
  'color-surface': ['Page surface', 'surface'],
  'color-text': ['Text', 'text'],
  'color-border': ['Borders', 'surface'],
  'color-hover': ['Hover', 'surface'],
  'color-control': ['Control border', 'surface'],
  'color-inverse': ['Inverse', 'inverse'],
  'color-overlay': ['Overlay', 'overlay'],
  'color-shadow': ['Shadow', 'shadow'],
  'color-on': ['Text on a status', 'on-status'],
  'surface-control': ['Controls', 'surface'],
  'surface-button': ['Buttons', 'surface'],
  'surface-panel': ['Panels', 'surface'],
  'surface-dialog': ['Dialogs', 'surface'],
  'surface-dropdown': ['Dropdowns', 'surface'],
  'surface-item': ['Items', 'surface'],
  'surface-card': ['Cards', 'surface'],
  'surface-touch': ['Touch targets', 'surface'],
  button: ['Button shape and type', 'button'],
  'button-primary': ['Primary button', 'button'],
  'button-secondary': ['Secondary button', 'button'],
  'button-danger': ['Danger button', 'button'],
  'button-ghost': ['Ghost button', 'button'],
  'form-control': ['Fields', 'field'],
  panel: ['Panel', 'surface'],
  modal: ['Modal', 'surface'],
  focus: ['Focus ring', 'focus'],
  motion: ['Motion', 'motion'],
  other: ['Other', 'swatch'],
};

/**
 * A layer's tokens as rows, one per family, in the order the tokens are declared
 *
 * @param {TokenGroup} group
 * @returns {TokenRow[]}
 */
export function rowsOf(group) {
  const rows = new Map();
  for (const token of group.tokens) {
    const id = familyOf(token.name);
    if (!rows.has(id)) {
      const [title, demo] = FAMILY[id] ?? FAMILY.other;
      rows.set(id, { id, title, demo, tokens: [] });
    }
    rows.get(id).tokens.push(token);
  }
  return [...rows.values()];
}
