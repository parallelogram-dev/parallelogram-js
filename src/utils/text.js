/**
 * Replace `{name}` placeholders with values; one with no value is left as written
 *
 * @param {string} template
 * @param {Record<string, string|number>} [values]
 * @returns {string}
 */
export const fill = (template, values = {}) =>
  template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);

/**
 * The text an element shows for one of its strings
 *
 * The attribute wins when the page set it; otherwise the class default, so a site translates every
 * instance once with `PModal.defaults.closeLabel = 'Fermer'` and a page changes one with
 * `close-label="Fermer"`. The default's key is the attribute in camel case.
 *
 * @param {HTMLElement} element
 * @param {string} attribute
 * @param {Record<string, string|number>} [values] Fills `{name}` placeholders in either
 * @returns {string}
 */
export const text = (element, attribute, values) => {
  const key = attribute.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  return fill(element.getAttribute(attribute) ?? element.constructor.defaults?.[key] ?? '', values);
};
