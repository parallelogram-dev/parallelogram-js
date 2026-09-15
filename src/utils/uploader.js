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
