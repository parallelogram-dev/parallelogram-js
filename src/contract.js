/**
 * Component contracts: machine-readable descriptions of each component's markup API
 *
 * Every component has a `<Name>.contract.js` module beside it whose default export is its contract.
 * Components never import their contracts, so contracts add nothing to bundles. The documentation
 * site, custom-elements.json and the TypeScript declarations are generated from them, and
 * test/unit/contracts.test.js checks each contract against its component's source.
 *
 * @module @parallelogram-js/core/contract
 */

/**
 * @typedef {'flag'|'string'|'boolean'|'number'|'enum'|'selector'|'url'|'json'} AttributeType
 *
 * flag: presence marks an element and the value is ignored. boolean: on an enhancement component
 * `""` or `"true"` is true and `"false"` is false; on a web component presence is true.
 */

/**
 * @typedef {Object} AttributeContract
 * @property {string} name - The full attribute name, such as `data-toggle-capture`. A trailing
 *   `<placeholder>` stands for a family of attributes, such as `data-form-enhancer-message-<constraint>`
 * @property {AttributeType} type
 * @property {string} description
 * @property {string|number|boolean|null} [default]
 * @property {string[]} [options] - The values an enum attribute accepts
 * @property {boolean} [required]
 * @property {string} [on] - The element it belongs on, when that isn't the component's own element
 * @property {boolean} [readonly] - Written by the component for styles and scripts to read
 * @property {string} [option] - The key in the component's `static defaults` holding its default
 * @property {string} [property] - The web component property that reflects it
 * @property {string} [deprecated] - What to use instead, and the release that removes it
 */

/**
 * @typedef {Object} EventContract
 * @property {string} name
 * @property {string} description
 * @property {string} [detail] - The TypeScript type of `event.detail`, or of the event bus payload
 * @property {'dom'|'bus'|'both'} [channel] - A DOM event, a framework event bus message, or both
 *   (default dom)
 * @property {string} [on] - The element it is dispatched on, when that isn't the component's own
 * @property {boolean} [cancelable]
 * @property {boolean} [inbound] - Dispatched by the page to ask the component to do something
 * @property {string} [deprecated]
 */

/**
 * @typedef {Object} PropertyContract
 * @property {string} name
 * @property {string} type - A TypeScript type
 * @property {string} description
 * @property {boolean} [readonly]
 * @property {string} [deprecated]
 */

/**
 * @typedef {Object} MethodContract
 * @property {string} name
 * @property {string} signature - A TypeScript function type, such as `(value: string) => void`
 * @property {string} description
 */

/**
 * @typedef {Object} NamedContract
 * @property {string} name - An empty string names a default slot
 * @property {string} description
 * @property {string} [default] - A CSS property's default value
 */

/**
 * @typedef {Object} ControlContract
 * @property {string} attribute - An attribute the documentation site lets readers change
 * @property {string} [target] - A selector for the element it goes on within the example, when that
 *   isn't the component's own element
 */

/**
 * @typedef {Object} ExampleContract
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} markup
 * @property {ControlContract[]} [controls]
 */

/**
 * @typedef {Object} ElementContract
 * @property {string} tag
 * @property {string} [module] - The import path of the module that defines it, when that isn't the
 *   component's own, such as `components/PUploaderFile`
 * @property {string} description
 * @property {AttributeContract[]} [attributes]
 * @property {EventContract[]} [events]
 * @property {NamedContract[]} [parts]
 * @property {NamedContract[]} [slots]
 */

/**
 * @typedef {Object} ComponentContract
 * @property {string} name - The class name
 * @property {'element'|'enhancement'} kind - A custom element, or a component that enhances
 *   existing markup through data attributes
 * @property {string} [tag] - An element's tag name
 * @property {string} [selector] - An enhancement component's data attribute
 * @property {string} [match] - The CSS selector to register the component with, when that isn't
 *   `[selector]` or the tag name
 * @property {string} module - The import path within the package, such as `components/Toggle`
 * @property {string} summary - One line saying what the component does
 * @property {string} [description] - Paragraphs separated by blank lines; `code` in backticks
 * @property {string} [stylesheet] - The package stylesheet it needs, such as `styles/toggle.css`
 * @property {string[]} [states] - Values of its `data-<component>-state` attribute
 * @property {AttributeContract[]} attributes
 * @property {PropertyContract[]} [properties]
 * @property {MethodContract[]} [methods]
 * @property {EventContract[]} events
 * @property {NamedContract[]} [slots]
 * @property {NamedContract[]} [parts]
 * @property {NamedContract[]} [cssProperties]
 * @property {ElementContract[]} [elements] - Child elements the component defines alongside itself
 * @property {string} [accessibility]
 * @property {ExampleContract[]} examples
 */

const ATTRIBUTE_TYPES = new Set([
  'flag',
  'string',
  'boolean',
  'number',
  'enum',
  'selector',
  'url',
  'json',
]);
const CHANNELS = new Set(['dom', 'bus', 'both']);
const DEFAULT_TYPES = { boolean: 'boolean', number: 'number' };

const isText = value => typeof value === 'string' && value.trim() !== '';

function duplicates(items, label, problems) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.name)) problems.push(`${label} ${item.name} is declared twice`);
    seen.add(item.name);
  }
}

function checkAttributes(attributes, where, problems) {
  if (!Array.isArray(attributes)) {
    problems.push(`${where} attributes must be an array`);
    return;
  }
  duplicates(attributes, `${where} attribute`, problems);

  for (const attribute of attributes) {
    const label = `${where} attribute ${attribute.name}`;
    if (!/^[a-z][a-z0-9-]*(<[a-z-]+>)?$/.test(attribute.name ?? '')) {
      problems.push(`${where} has an attribute with an invalid name: ${attribute.name}`);
    }
    if (!ATTRIBUTE_TYPES.has(attribute.type)) {
      problems.push(`${label} has an unknown type: ${attribute.type}`);
    }
    if (!isText(attribute.description)) problems.push(`${label} needs a description`);

    const hasDefault = attribute.default !== undefined && attribute.default !== null;
    if (attribute.type === 'enum') {
      if (!Array.isArray(attribute.options) || attribute.options.length === 0) {
        problems.push(`${label} is an enum without options`);
      } else if (hasDefault && !attribute.options.includes(attribute.default)) {
        problems.push(`${label} has a default that isn't one of its options`);
      }
    } else if (attribute.options) {
      problems.push(`${label} has options but isn't an enum`);
    }

    const expected = DEFAULT_TYPES[attribute.type] ?? 'string';
    if (hasDefault && typeof attribute.default !== expected) {
      problems.push(`${label} needs a ${expected} default`);
    }
    if (attribute.option && attribute.default === undefined) {
      problems.push(`${label} names a defaults option but has no default`);
    }
  }
}

function checkEvents(events, where, problems) {
  if (!Array.isArray(events)) {
    problems.push(`${where} events must be an array`);
    return;
  }
  duplicates(events, `${where} event`, problems);

  for (const event of events) {
    const label = `${where} event ${event.name}`;
    if (!/^[a-z][a-z-]*(:[a-z][a-zA-Z-]*)?$/.test(event.name ?? '')) {
      problems.push(`${where} has an event with an invalid name: ${event.name}`);
    }
    if (!isText(event.description)) problems.push(`${label} needs a description`);
    if (event.channel !== undefined && !CHANNELS.has(event.channel)) {
      problems.push(`${label} has an unknown channel: ${event.channel}`);
    }
  }
}

function checkNamed(items, label, problems, pattern) {
  if (items === undefined) return;
  if (!Array.isArray(items)) {
    problems.push(`${label}s must be an array`);
    return;
  }
  duplicates(items, label, problems);
  for (const item of items) {
    if (typeof item.name !== 'string' || !pattern.test(item.name)) {
      problems.push(`${label} has an invalid name: ${item.name}`);
    }
    if (!isText(item.description)) problems.push(`${label} ${item.name} needs a description`);
  }
}

/**
 * Problems with a contract's shape, as sentences; an empty list means it is well formed
 *
 * @param {ComponentContract} contract
 * @returns {string[]}
 */
export function validateContract(contract) {
  const problems = [];
  if (!contract || typeof contract !== 'object') return ['The contract must be an object'];

  if (!/^[A-Z][A-Za-z]+$/.test(contract.name ?? '')) problems.push('name must be a class name');
  if (contract.kind === 'element') {
    if (!/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(contract.tag ?? '')) {
      problems.push('An element needs a custom element tag');
    }
  } else if (contract.kind === 'enhancement') {
    if (!/^data-[a-z][a-z-]*$/.test(contract.selector ?? '')) {
      problems.push('An enhancement component needs a data attribute selector');
    }
  } else {
    problems.push('kind must be element or enhancement');
  }
  if (!/^components\/[A-Z][A-Za-z]+$/.test(contract.module ?? '')) {
    problems.push('module must be a components/ import path');
  }
  if (!isText(contract.summary)) problems.push('summary is required');

  checkAttributes(contract.attributes, contract.name, problems);
  checkEvents(contract.events, contract.name, problems);
  checkNamed(contract.slots, 'slot', problems, /^[a-z-]*$/);
  checkNamed(contract.parts, 'part', problems, /^[a-z][a-z-]*$/);
  checkNamed(contract.cssProperties, 'CSS property', problems, /^--[a-z][a-z0-9-]*$/);
  checkNamed(contract.properties, 'property', problems, /^[a-z][A-Za-z]*$/);
  checkNamed(contract.methods, 'method', problems, /^[a-z][A-Za-z]*$/);

  const attributeNames = new Set((contract.attributes ?? []).map(attribute => attribute.name));
  for (const element of contract.elements ?? []) {
    if (!/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(element.tag ?? '')) {
      problems.push(`An element has an invalid tag: ${element.tag}`);
    }
    if (element.module !== undefined && !/^components\/[A-Z][A-Za-z]+$/.test(element.module)) {
      problems.push(`${element.tag} module must be a components/ import path`);
    }
    if (!isText(element.description)) problems.push(`${element.tag} needs a description`);
    checkAttributes(element.attributes ?? [], element.tag, problems);
    checkEvents(element.events ?? [], element.tag, problems);
    checkNamed(element.parts, `${element.tag} part`, problems, /^[a-z][a-z-]*$/);
    checkNamed(element.slots, `${element.tag} slot`, problems, /^[a-z-]*$/);
    for (const attribute of element.attributes ?? []) attributeNames.add(attribute.name);
  }

  if (!Array.isArray(contract.examples) || contract.examples.length === 0) {
    problems.push('At least one example is required');
  } else {
    const ids = new Set();
    for (const example of contract.examples) {
      if (!/^[a-z][a-z0-9-]*$/.test(example.id ?? '')) {
        problems.push(`An example has an invalid id: ${example.id}`);
      }
      if (ids.has(example.id)) problems.push(`Example ${example.id} is declared twice`);
      ids.add(example.id);
      if (!isText(example.title)) problems.push(`Example ${example.id} needs a title`);
      if (!isText(example.markup)) problems.push(`Example ${example.id} needs markup`);
      for (const control of example.controls ?? []) {
        if (!attributeNames.has(control.attribute)) {
          problems.push(
            `Example ${example.id} controls an undeclared attribute: ${control.attribute}`
          );
        }
      }
    }
  }

  return problems;
}
