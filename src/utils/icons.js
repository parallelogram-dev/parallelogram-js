/**
 * The icons the components draw
 *
 * Every icon is drawn on the 24x24 grid of the Tabler icon set (MIT), with a 2px round stroke in
 * `currentColor`, so they sit together whatever size they are used at. Each one is its own export
 * of path data, so a component carries only the icons it uses.
 *
 * `iconMarkup()` returns the SVG for a template, and `iconElement()` builds the same SVG through
 * the DOM, for code that doesn't insert markup. Sizes are `md` (24), `sm` (20) and `xs` (16).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Pixel size of each named size */
export const ICON_SIZES = { md: 24, sm: 20, xs: 16 };

export const chevronDown = ['M6 9l6 6l6 -6'];
export const chevronUp = ['M6 15l6 -6l6 6'];
export const chevronLeft = ['M15 6l-6 6l6 6'];
export const chevronRight = ['M9 6l6 6l-6 6'];
export const x = ['M18 6l-12 12', 'M6 6l12 12'];
export const check = ['M5 12l5 5l10 -10'];
export const search = ['M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'];
export const pencil = ['M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4', 'M13.5 6.5l4 4'];
export const trash = [
  'M4 7l16 0',
  'M10 11l0 6',
  'M14 11l0 6',
  'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
  'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
];
export const plus = ['M12 5l0 14', 'M5 12l14 0'];
export const arrowUp = ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6'];
export const arrowDown = ['M12 5l0 14', 'M18 13l-6 6', 'M6 13l6 6'];
export const arrowLeft = ['M5 12l14 0', 'M5 12l6 6', 'M5 12l6 -6'];
export const arrowRight = ['M5 12l14 0', 'M19 12l-6 6', 'M19 12l-6 -6'];
export const calendar = [
  'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z',
  'M16 3v4',
  'M8 3v4',
  'M4 11h16',
  'M8 14v4',
  'M12 14v4',
  'M16 14v4',
];
export const refresh = [
  'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4',
  'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
];
export const selector = ['M8 9l4 -4l4 4', 'M16 15l-4 4l-4 -4'];

const attributes = (size, className) => ({
  xmlns: SVG_NS,
  class: ['icon', size === 'md' ? '' : `icon--${size}`, className].filter(Boolean).join(' '),
  width: ICON_SIZES[size],
  height: ICON_SIZES[size],
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
});

/**
 * The SVG for an icon, for a template
 *
 * @param {string[]} paths - One of this module's icons
 * @param {Object} [options]
 * @param {'md'|'sm'|'xs'} [options.size='md']
 * @param {string} [options.class] - Added to the icon's own class
 * @returns {string}
 */
export const iconMarkup = (paths, { size = 'md', class: className = '' } = {}) => {
  const open = Object.entries(attributes(size, className))
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
  const drawn = paths.map(data => `<path d="${data}" />`).join('');
  return `<svg ${open}>${drawn}</svg>`;
};

/**
 * An icon as an element, for code that builds the DOM rather than inserting markup
 *
 * @param {string[]} paths - One of this module's icons
 * @param {Object} [options]
 * @param {'md'|'sm'|'xs'} [options.size='md']
 * @param {string} [options.class] - Added to the icon's own class
 * @returns {SVGSVGElement}
 */
export const iconElement = (paths, { size = 'md', class: className = '' } = {}) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [name, value] of Object.entries(attributes(size, className))) {
    if (name !== 'xmlns') svg.setAttribute(name, String(value));
  }
  for (const data of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', data);
    svg.append(path);
  }
  return svg;
};
