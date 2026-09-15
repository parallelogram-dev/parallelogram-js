/**
 * A custom element contract's public members, read the same way for its TypeScript declaration and
 * its custom-elements.json entry
 */

const OPENING = '([{<';
const CLOSING = ')]}>';
const QUOTES = `'"\``;
const VALUE_TYPES = { flag: 'boolean', boolean: 'boolean', number: 'number' };

/**
 * @typedef {Object} Parameter
 * @property {string} name
 * @property {string} type
 * @property {boolean} optional
 * @property {boolean} rest
 */

/**
 * The class name for a custom element tag, such as `PUploaderFile` for `p-uploader-file`
 *
 * @param {string} tag
 * @returns {string}
 */
export const classNameFor = tag =>
  tag.replace(/(?:^|-)([a-z0-9])/g, (_, letter) => letter.toUpperCase());

/**
 * The characters of a TypeScript type outside string literals, with the bracket depth after each,
 * skipping the arrow of a function type
 *
 * @param {string} text
 * @returns {Generator<{ char: string, index: number, depth: number }>}
 */
function* scan(text) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (QUOTES.includes(char)) {
      quote = char;
    } else if (char === '=' && text[index + 1] === '>') {
      index++;
    } else {
      if (OPENING.includes(char)) depth++;
      if (CLOSING.includes(char)) depth--;
      yield { char, index, depth };
    }
  }
}

/**
 * How many brackets a piece of a TypeScript type leaves open
 *
 * @param {string} text
 * @returns {number}
 */
export function bracketBalance(text) {
  let depth = 0;
  for (const token of scan(text)) depth = token.depth;
  return depth;
}

/**
 * @param {string} text
 * @returns {string[]} The parts between top-level commas
 */
function splitTopLevel(text) {
  const parts = [];
  let start = 0;
  for (const { char, index, depth } of scan(text)) {
    if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

/**
 * The parameters and return type of a function type, such as `(value: string) => void`
 *
 * @param {string} signature
 * @returns {{ parameters: Parameter[], returns: string }}
 * @throws {Error} When the signature isn't a function type whose parameters are named and typed
 */
export function parseSignature(signature) {
  const text = signature.trim();
  let close = -1;
  if (text.startsWith('(')) {
    for (const { char, index, depth } of scan(text)) {
      if (CLOSING.includes(char) && depth === 0) {
        close = index;
        break;
      }
    }
  }

  const arrow = close === -1 ? '' : text.slice(close + 1).trim();
  if (!arrow.startsWith('=>')) {
    throw new Error(`Not a function type: ${signature}`);
  }

  const parameters = splitTopLevel(text.slice(1, close)).map(parameter => {
    const match = parameter.match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/);
    if (!match) {
      throw new Error(`Parameter without a name and type in ${signature}: ${parameter}`);
    }
    return {
      name: match[2],
      type: match[4].trim(),
      optional: Boolean(match[3]),
      rest: Boolean(match[1]),
    };
  });

  return { parameters, returns: arrow.slice(2).trim() };
}

/**
 * The TypeScript type of the values an attribute accepts
 *
 * @param {import('../../src/contract.js').AttributeContract} attribute
 * @returns {string}
 */
export function attributeValueType(attribute) {
  if (attribute.type === 'enum') {
    return attribute.options.map(option => `'${option}'`).join(' | ');
  }
  return VALUE_TYPES[attribute.type] ?? 'string';
}

/**
 * The TypeScript type of the property an attribute reflects: null when the attribute is missing,
 * unless the property is a boolean or the attribute has a default
 *
 * @param {import('../../src/contract.js').AttributeContract} attribute
 * @returns {string}
 */
export function reflectedPropertyType(attribute) {
  const type = attributeValueType(attribute);
  const hasDefault = attribute.default !== undefined && attribute.default !== null;
  return type === 'boolean' || hasDefault ? type : `${type} | null`;
}

/**
 * The properties an element declares, followed by the properties its attributes reflect
 *
 * @param {import('../../src/contract.js').ComponentContract | import('../../src/contract.js').ElementContract} item
 * @returns {Array<import('../../src/contract.js').PropertyContract & { attribute?: string }>}
 */
export function propertiesOf(item) {
  const reflected = new Map(
    (item.attributes ?? [])
      .filter(attribute => attribute.property)
      .map(attribute => [attribute.property, attribute])
  );

  const declared = (item.properties ?? []).map(property => {
    const attribute = reflected.get(property.name);
    return attribute ? { ...property, attribute: attribute.name } : property;
  });
  const names = new Set(declared.map(property => property.name));

  const derived = [...reflected.values()]
    .filter(attribute => !names.has(attribute.property))
    .map(attribute => ({
      name: attribute.property,
      type: reflectedPropertyType(attribute),
      description: attribute.description,
      attribute: attribute.name,
      ...(attribute.readonly && { readonly: true }),
      ...(attribute.deprecated && { deprecated: attribute.deprecated }),
    }));

  return [...declared, ...derived];
}

/**
 * The DOM events a page listens for on an element: not event bus messages, events the page
 * dispatches to it, or events dispatched on other elements
 *
 * @param {import('../../src/contract.js').ComponentContract | import('../../src/contract.js').ElementContract} item
 * @returns {import('../../src/contract.js').EventContract[]}
 */
export const listenableEvents = item =>
  (item.events ?? []).filter(
    event => (event.channel ?? 'dom') !== 'bus' && !event.inbound && !event.on
  );

/**
 * The type of an event's object: a CustomEvent when it carries a detail
 *
 * @param {import('../../src/contract.js').EventContract} event
 * @returns {string}
 */
export const eventType = event => (event.detail ? `CustomEvent<${event.detail}>` : 'Event');

/**
 * Whether an event is the framework's own, named `<prefix>:<verb>`, rather than a native event such
 * as `change` that the DOM's event maps already declare
 *
 * @param {import('../../src/contract.js').EventContract} event
 * @returns {boolean}
 */
export const isFrameworkEvent = event => event.name.includes(':');

/**
 * An element contract followed by the child elements it defines, each with its class name
 *
 * @param {import('../../src/contract.js').ComponentContract} contract
 * @returns {Array<{ name: string, item: import('../../src/contract.js').ComponentContract | import('../../src/contract.js').ElementContract, isDefault: boolean }>}
 */
export const elementsOf = contract => [
  { name: contract.name, item: contract, isDefault: true },
  ...(contract.elements ?? []).map(element => ({
    name: classNameFor(element.tag),
    item: element,
    isDefault: false,
  })),
];
