import {
  attributeValueType,
  elementsOf,
  eventType,
  listenableEvents,
  parseSignature,
  propertiesOf,
} from './members.mjs';

/**
 * custom-elements.json, the Custom Elements Manifest for the package's custom elements, generated
 * from their contracts
 *
 * @see https://github.com/webcomponents/custom-elements-manifest
 */

export const SCHEMA_VERSION = '2.1.0';

/**
 * An entry with its description and deprecation, when it has them
 *
 * @param {Object} entry
 * @param {{ description?: string, deprecated?: string }} source
 * @returns {Object}
 */
const described = (entry, { description, deprecated }) => ({
  ...entry,
  ...(description && { description }),
  ...(deprecated && { deprecated }),
});

/**
 * @param {Object} declaration
 * @param {string} key
 * @param {Array} entries
 * @returns {Object} The declaration, with the entries under key unless there are none
 */
const withEntries = (declaration, key, entries) =>
  entries.length ? { ...declaration, [key]: entries } : declaration;

/**
 * @param {import('../../src/contract.js').AttributeContract} attribute
 * @returns {Object}
 */
const attributeEntry = attribute =>
  described(
    {
      name: attribute.name,
      type: { text: attributeValueType(attribute) },
      ...(attribute.default !== undefined &&
        attribute.default !== null && { default: String(attribute.default) }),
      ...(attribute.property && { fieldName: attribute.property }),
    },
    attribute
  );

/**
 * @param {ReturnType<typeof propertiesOf>[number]} property
 * @returns {Object}
 */
const fieldEntry = property =>
  described(
    {
      kind: 'field',
      name: property.name,
      type: { text: property.type },
      ...(property.readonly && { readonly: true }),
      ...(property.attribute && { attribute: property.attribute }),
    },
    property
  );

/**
 * @param {import('../../src/contract.js').MethodContract} method
 * @returns {Object}
 */
function methodEntry(method) {
  const { parameters, returns } = parseSignature(method.signature);
  return described(
    {
      kind: 'method',
      name: method.name,
      ...(parameters.length && {
        parameters: parameters.map(parameter => ({
          name: parameter.name,
          type: { text: parameter.type },
          ...(parameter.optional && { optional: true }),
          ...(parameter.rest && { rest: true }),
        })),
      }),
      return: { type: { text: returns } },
    },
    method
  );
}

/**
 * @param {ReturnType<typeof elementsOf>[number]} element
 * @returns {Object} A custom element class declaration
 */
function classDeclaration({ name, item }) {
  let declaration = {
    kind: 'class',
    name,
    customElement: true,
    tagName: item.tag,
    ...(item.summary && { summary: item.summary }),
    ...(item.description && { description: item.description }),
    superclass: { name: 'HTMLElement', package: 'global:' },
  };

  declaration = withEntries(declaration, 'attributes', (item.attributes ?? []).map(attributeEntry));
  declaration = withEntries(declaration, 'members', [
    ...propertiesOf(item).map(fieldEntry),
    ...(item.methods ?? []).map(methodEntry),
  ]);
  declaration = withEntries(
    declaration,
    'events',
    listenableEvents(item).map(event =>
      described({ name: event.name, type: { text: eventType(event) } }, event)
    )
  );
  declaration = withEntries(
    declaration,
    'slots',
    (item.slots ?? []).map(slot => described({ name: slot.name }, slot))
  );
  declaration = withEntries(
    declaration,
    'cssParts',
    (item.parts ?? []).map(part => described({ name: part.name }, part))
  );
  return withEntries(
    declaration,
    'cssProperties',
    (item.cssProperties ?? []).map(property =>
      described(
        { name: property.name, ...(property.default && { default: property.default }) },
        property
      )
    )
  );
}

/**
 * @param {import('../../src/contract.js').ComponentContract} contract - An element contract
 * @returns {Object} The module entry for the file that defines the element
 */
function moduleEntry(contract) {
  const path = `dist/${contract.module}.js`;
  const elements = elementsOf(contract);

  return {
    kind: 'javascript-module',
    path,
    declarations: elements.map(classDeclaration),
    exports: elements.flatMap(({ name, item, isDefault }) => [
      { kind: 'js', name: isDefault ? 'default' : name, declaration: { name, module: path } },
      { kind: 'custom-element-definition', name: item.tag, declaration: { name, module: path } },
    ]),
  };
}

/**
 * The manifest for every element contract, ordered by tag
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @returns {Object}
 */
export function customElementsManifest(contracts) {
  return {
    schemaVersion: SCHEMA_VERSION,
    modules: contracts
      .filter(contract => contract.kind === 'element')
      .sort((a, b) => a.tag.localeCompare(b.tag))
      .map(moduleEntry),
  };
}
