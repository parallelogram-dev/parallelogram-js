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
    note: 'The colour roles surfaces read, and components as they move to them. Setting a surface colour below overrides its role for that surface.',
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
      colour('--color-overlay'),
      colour('--color-shadow'),
      colour('--color-danger'),
      colour('--color-danger-bg'),
      colour('--color-success'),
      colour('--color-success-bg'),
      colour('--color-warning'),
      colour('--color-warning-bg'),
    ],
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    note: 'Shared shapes and colours for the parts components are made of. Components that don’t follow a change here still use their own values.',
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
