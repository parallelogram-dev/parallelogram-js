/**
 * The CSS the workbench exports
 *
 * The tokens themselves are derived from the stylesheets at build time, in site/build/tokens.js,
 * because a list written by hand falls behind the design system without anything failing. This
 * module is what the page itself loads, and the page only needs to write out what was changed.
 */

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
