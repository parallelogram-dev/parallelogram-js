/**
 * The design tokens the workbench can change, and the CSS it exports
 *
 * Colour tokens take a light and a dark value, applied to the light and dark preview frames. Every
 * other token takes one value, applied to both.
 */

/**
 * @typedef {'colour'|'length'|'shadow'|'duration'|'easing'} TokenKind
 * @typedef {{ name: string, kind: TokenKind }} Token
 * @typedef {{ id: string, title: string, note?: string, tokens: Token[] }} TokenGroup
 */

const colour = name => ({ name, kind: 'colour' });
const length = name => ({ name, kind: 'length' });

const surface = (type, parts) =>
  parts.map(part => {
    const name = `--surface-${type}-${part}`;
    if (part === 'radius' || part === 'border-width') return length(name);
    if (part === 'shadow') return { name, kind: 'shadow' };
    return colour(name);
  });

const FULL_SURFACE = ['radius', 'border-width', 'border-color', 'color-bg', 'color-text', 'shadow'];

/** @type {TokenGroup[]} */
export const TOKEN_GROUPS = [
  {
    id: 'palette',
    title: 'Colour palette',
    note: 'Start here. These are the roles the whole library reads, so a change here reaches every component at once — an accent set here is the accent of buttons, focus rings, selected days and links. A page with a brand colour can set `--brand-primary` instead, which the accent follows in both themes, along with `--brand-primary-hover` and `--brand-primary-contrast`. Reach for a surface or a component property below only when you want one thing to differ from the rest.',
    tokens: [
      colour('--color-accent'),
      colour('--color-accent-hover'),
      colour('--color-accent-contrast'),
      colour('--color-text-muted'),
      colour('--color-surface'),
      colour('--color-surface-muted'),
      colour('--color-hover'),
      colour('--color-border'),
      colour('--color-border-strong'),
      colour('--color-control-border'),
      colour('--color-overlay'),
      colour('--color-shadow'),
      colour('--color-danger'),
      colour('--color-danger-bg'),
      colour('--color-danger-contrast'),
      colour('--color-success'),
      colour('--color-success-bg'),
      colour('--color-warning'),
      colour('--color-warning-bg'),
      colour('--color-inverse-surface'),
      colour('--color-inverse-text'),
      colour('--color-success-strong'),
      colour('--color-warning-strong'),
      colour('--color-danger-strong'),
      colour('--color-on-status'),
    ],
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    note: 'The second layer: the shapes components are built from, rather than the colours they are painted in. A dialog radius set here is the radius of every dialog, and a component keeps its own value only where it sets one. Use these when the palette is right and the shape is not.',
    tokens: [
      ...surface('control', FULL_SURFACE),
      ...surface('button', ['radius', 'border-width', 'shadow']),
      ...surface('panel', FULL_SURFACE),
      ...surface('dialog', FULL_SURFACE),
      ...surface('dropdown', FULL_SURFACE),
      colour('--surface-dropdown-item-hover-bg'),
      colour('--surface-dropdown-item-selected-bg'),
      colour('--surface-dropdown-item-current-bg'),
      ...surface('item', FULL_SURFACE),
      ...surface('card', FULL_SURFACE),
      ...surface('touch', FULL_SURFACE),
      colour('--surface-touch-hover-bg'),
      colour('--surface-touch-hover-border-color'),
    ],
  },
  {
    id: 'controls',
    title: 'Buttons and fields',
    note: 'What every button and field in the library follows, whoever drew it. A component that shows buttons of its own — a modal’s footer, the picker’s Apply — reads these first and falls back to its own only where it must, so setting a primary button here is usually the whole job.',
    tokens: [
      colour('--button-primary-bg'),
      colour('--button-primary-color'),
      colour('--button-primary-hover-bg'),
      colour('--button-secondary-border'),
      colour('--button-secondary-hover-bg'),
      colour('--form-control-placeholder-color'),
      colour('--form-control-hover-border-color'),
      colour('--form-control-focus-border-color'),
      colour('--form-control-focus-ring-color'),
      length('--form-control-focus-ring-width'),
    ],
  },
  {
    id: 'focus',
    title: 'Focus and motion',
    note: 'The two things people notice when they are not looking for them. The focus ring is shown to keyboard users and hidden from pointer users automatically, so it can afford to be loud. Motion is skipped entirely for anyone who asks their system for less of it, which is why a duration here is a maximum rather than a promise.',
    tokens: [
      colour('--framework-focus-color'),
      length('--framework-focus-width'),
      length('--framework-focus-offset'),
      { name: '--framework-transition-duration', kind: 'duration' },
      { name: '--framework-transition-easing', kind: 'easing' },
    ],
  },
];

/**
 * @typedef {{ id: string, title: string, demo: string, tokens: Token[] }} TokenRow
 */

/** Which family a token belongs to, and so which row it is shown on */
const familyOf = name => {
  const surface = name.match(/^--surface-([a-z]+)-/);
  if (surface) return `surface-${surface[1]}`;
  const button = name.match(/^--button-([a-z]+)-/);
  if (button) return `button-${button[1]}`;
  if (name.startsWith('--form-control-')) return 'form-control';
  if (name.startsWith('--framework-focus-')) return 'focus';
  if (name.startsWith('--framework-transition-')) return 'motion';
  const colour = name.match(/^--color-([a-z]+)/);
  if (colour) return `color-${colour[1]}`;
  return 'other';
};

/** How a family is shown working: the demo that uses its tokens together */
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
  'button-primary': ['Primary button', 'button'],
  'button-secondary': ['Secondary button', 'button'],
  'form-control': ['Fields', 'field'],
  focus: ['Focus ring', 'focus'],
  motion: ['Motion', 'motion'],
  other: ['Other', 'swatch'],
};

/**
 * A group's tokens as rows, one per family, in the order the tokens are declared
 *
 * Derived from the names rather than listed by hand, so every token lands on exactly one row and
 * a token added to a group cannot quietly fail to appear.
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

/**
 * CSS for the values that differ from the design system: shared and light values on the root, dark
 * values on the dark theme
 *
 * @param {{ light: Map<string, string>, dark: Map<string, string> }} changes
 * @returns {string}
 */
export function exportCss({ light, dark }) {
  const block = (selector, values) => {
    const entries = [...values].sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return '';
    return `${selector} {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;
  };

  return (
    [block(':root', light), block(':root[data-theme="dark"]', dark)].filter(Boolean).join('\n\n') ||
    '/* No changes yet */'
  );
}
