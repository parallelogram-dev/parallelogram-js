const DETAIL_LIMIT = 160;

/**
 * Example markup as HTML, writing attributes with empty values the way they are authored
 *
 * @param {DocumentFragment} fragment
 * @returns {string}
 */
export function serializeMarkup(fragment) {
  const template = document.createElement('template');
  template.content.append(fragment);
  return template.innerHTML.replace(/ ([\w:.-]+)=""(?=[\s/>])/g, ' $1');
}

/**
 * An element as `<tag#id>`, for the playground's state panel and event log
 */
export const describeElement = element =>
  `<${element.localName}${element.id ? `#${element.id}` : ''}>`;

const describeValue = value => {
  if (value instanceof Element) {
    return `<${value.localName}${value.id ? `#${value.id}` : ''}>`;
  }
  if (value instanceof File) return `File ${value.name}`;
  if (value instanceof Error) return value.message;
  if (value instanceof Event) return `${value.type} event`;
  return value;
};

/**
 * A short, readable summary of an event's detail for the event log
 *
 * Elements become `<tag#id>`, timestamps and functions are left out, and long summaries are cut.
 *
 * @param {unknown} detail
 * @returns {string}
 */
export function describeDetail(detail) {
  if (detail === null || detail === undefined) return '';

  const seen = new WeakSet();
  const text = JSON.stringify(detail, (key, value) => {
    if (key === 'timestamp' || typeof value === 'function') return undefined;
    if (
      value instanceof Node ||
      value instanceof Event ||
      value instanceof Error ||
      value instanceof File
    ) {
      return describeValue(value);
    }
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[circular]';
      seen.add(value);
    }
    return value;
  });

  if (!text || text === '{}') return '';
  return text.length > DETAIL_LIMIT ? `${text.slice(0, DETAIL_LIMIT - 1)}…` : text;
}
