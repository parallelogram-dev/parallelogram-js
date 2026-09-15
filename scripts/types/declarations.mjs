import path from 'node:path';
import {
  elementsOf,
  eventType,
  isFrameworkEvent,
  listenableEvents,
  parseSignature,
  propertiesOf,
} from './members.mjs';

/**
 * TypeScript declarations for a custom element module, generated from its contract
 *
 * tsc declares the other modules from their JSDoc. A custom element's contract lists exactly its
 * public properties, methods and events with TypeScript types, so its declaration comes from the
 * contract and leaves out the internals tsc would expose.
 */

/**
 * A doc comment made of text blocks separated by blank lines, or nothing when every block is empty
 *
 * @param {Array<string|undefined|false>} blocks
 * @param {string} [indent]
 * @returns {string}
 */
function docComment(blocks, indent = '') {
  const lines = blocks
    .filter(Boolean)
    .flatMap((block, index) => [
      ...(index > 0 ? [''] : []),
      ...block.replaceAll('*/', '*\\/').split('\n'),
    ]);

  if (lines.length === 0) return '';
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  const body = lines.map(line => `${indent} *${line ? ` ${line}` : ''}`).join('\n');
  return `${indent}/**\n${body}\n${indent} */\n`;
}

const deprecation = item => item.deprecated && `@deprecated ${item.deprecated}`;

/**
 * The events an element's event map declares. A native event without a detail, such as `input`, is
 * left to the type the DOM already gives it.
 *
 * @param {import('../../src/contract.js').ComponentContract | import('../../src/contract.js').ElementContract} item
 * @returns {import('../../src/contract.js').EventContract[]}
 */
const mappedEvents = item =>
  listenableEvents(item).filter(event => event.detail || isFrameworkEvent(event));

/**
 * @param {import('../../src/contract.js').EventContract[]} events
 * @param {string} indent
 * @returns {string} Event map entries, one per event
 */
const eventEntries = (events, indent) =>
  events
    .map(
      event =>
        `${docComment([event.description, deprecation(event)], indent)}${indent}'${event.name}': ${eventType(event)};`
    )
    .join('\n');

/**
 * addEventListener and removeEventListener overloads typed by the element's event map
 *
 * @param {string} className
 * @returns {string[]}
 */
function listenerMethods(className) {
  const map = `${className}EventMap`;
  const listener = `listener: (this: ${className}, event: ${map}[K]) => void`;
  const overloads = (method, options) => [
    `  ${method}<K extends keyof ${map}>(\n    type: K,\n    ${listener},\n    options?: ${options}\n  ): void;`,
    `  ${method}(\n    type: string,\n    listener: EventListenerOrEventListenerObject,\n    options?: ${options}\n  ): void;`,
  ];
  return [
    ...overloads('addEventListener', 'boolean | AddEventListenerOptions'),
    ...overloads('removeEventListener', 'boolean | EventListenerOptions'),
  ];
}

/**
 * An element's event map interface, when it has events, followed by its class
 *
 * @param {ReturnType<typeof elementsOf>[number]} element
 * @returns {string}
 */
function classDeclaration({ name, item, isDefault }) {
  const events = mappedEvents(item);

  const properties = propertiesOf(item).map(
    property =>
      `${docComment([property.description, deprecation(property)], '  ')}  ${property.readonly ? 'readonly ' : ''}${property.name}: ${property.type};`
  );
  const methods = (item.methods ?? []).map(method => {
    const { parameters, returns } = parseSignature(method.signature);
    const list = parameters
      .map(
        parameter =>
          `${parameter.rest ? '...' : ''}${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`
      )
      .join(', ');
    return `${docComment([method.description], '  ')}  ${method.name}(${list}): ${returns};`;
  });
  const members = [...properties, ...methods, ...(events.length ? listenerMethods(name) : [])];

  const eventMap = events.length
    ? `export interface ${name}EventMap extends HTMLElementEventMap {\n${eventEntries(events, '  ')}\n}\n\n`
    : '';
  const heading = `export ${isDefault ? 'default ' : ''}class ${name} extends HTMLElement`;
  const body = members.length ? ` {\n${members.join('\n')}\n}` : ' {}';

  return `${eventMap}${docComment([item.summary, item.description])}${heading}${body}`;
}

/**
 * The global augmentation: the module's tags in HTMLElementTagNameMap, and its framework events in
 * GlobalEventHandlersEventMap, because they bubble to the document
 *
 * @param {ReturnType<typeof elementsOf>} elements - The elements the module defines
 * @returns {string}
 */
function globalDeclarations(elements) {
  const tags = elements.map(({ name, item }) => `    '${item.tag}': ${name};`).join('\n');
  const events = elements.flatMap(({ item }) => listenableEvents(item)).filter(isFrameworkEvent);

  const eventMap = events.length
    ? `\n  interface GlobalEventHandlersEventMap {\n${eventEntries(events, '    ')}\n  }`
    : '';
  return `declare global {\n  interface HTMLElementTagNameMap {\n${tags}\n  }${eventMap}\n}`;
}

/**
 * The declaration file for one module of a custom element contract. A module declares the elements
 * it defines, and the component's own module also re-exports child elements defined in another.
 *
 * @param {import('../../src/contract.js').ComponentContract} contract - An element contract
 * @param {string} [module] - The module to declare, by default the component's own
 * @returns {string}
 */
export function elementDeclarations(contract, module = contract.module) {
  const elements = elementsOf(contract);
  const defined = elements.filter(element => element.module === module);
  const reexports =
    module === contract.module
      ? elements
          .filter(element => element.module !== module)
          .map(element => {
            const relative = path.posix.relative(path.posix.dirname(module), element.module);
            const specifier = relative.startsWith('.') ? relative : `./${relative}`;
            return `export { ${element.name} } from '${specifier}.js';`;
          })
      : [];

  const blocks = [
    ...(reexports.length ? [reexports.join('\n')] : []),
    ...defined.map(classDeclaration),
    globalDeclarations(defined),
  ];
  return `${blocks.join('\n\n')}\n`;
}

/**
 * The names a declaration file exports, with `default` for its default export
 *
 * @param {string} declarations
 * @returns {Set<string>}
 */
export function exportedNames(declarations) {
  const names = new Set();
  const declared =
    /^export\s+(?:declare\s+)?(default\s+)?(?:abstract\s+)?(?:class|function|const|let|var|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/gm;
  for (const match of declarations.matchAll(declared)) {
    names.add(match[1] ? 'default' : match[2]);
  }
  if (/^export\s+default\s+(?!(?:abstract\s+)?(?:class|function)\b)/m.test(declarations)) {
    names.add('default');
  }
  for (const match of declarations.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const specifier of match[1].split(',')) {
      const name = specifier
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * Framework events that two element contracts declare with different types, which would make their
 * global event map entries conflict
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @returns {string[]}
 */
export function conflictingGlobalEvents(contracts) {
  const seen = new Map();
  const problems = [];

  for (const contract of contracts.filter(entry => entry.kind === 'element')) {
    for (const { item } of elementsOf(contract)) {
      for (const event of listenableEvents(item).filter(isFrameworkEvent)) {
        const type = eventType(event);
        const earlier = seen.get(event.name);
        if (!earlier) {
          seen.set(event.name, { type, tag: item.tag });
        } else if (earlier.type !== type) {
          problems.push(
            `${event.name} is ${earlier.type} on ${earlier.tag} but ${type} on ${item.tag}`
          );
        }
      }
    }
  }

  return problems;
}
