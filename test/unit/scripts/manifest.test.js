import { describe, expect, it } from 'vitest';
import { customElementsManifest, SCHEMA_VERSION } from '../../../scripts/types/manifest.mjs';
import { elementContract } from './element-contract.js';

const widgetModule = () => customElementsManifest([elementContract()]).modules[0];
const [widget, part] = widgetModule().declarations;

describe('custom elements manifest', () => {
  it('lists only element contracts, ordered by tag', () => {
    const manifest = customElementsManifest([
      elementContract({ name: 'PZebra', tag: 'p-zebra', module: 'components/PZebra' }),
      { name: 'Toggle', kind: 'enhancement', selector: 'data-toggle', module: 'components/Toggle' },
      elementContract(),
    ]);

    expect({
      schemaVersion: manifest.schemaVersion,
      paths: manifest.modules.map(module => module.path),
    }).toEqual({
      schemaVersion: SCHEMA_VERSION,
      paths: ['dist/components/PWidget.js', 'dist/components/PZebra.js'],
    });
  });

  it('lists the defaults a site changes once as a static field, typed from the attributes', () => {
    const [declaration] = customElementsManifest([
      elementContract({
        attributes: [
          {
            name: 'close-label',
            type: 'string',
            default: 'Close',
            option: 'closeLabel',
            description: 'The accessible name of the close button',
          },
          { name: 'size', type: 'enum', options: ['sm', 'md'], default: 'md', option: 'size' },
          { name: 'open', type: 'flag', description: 'Present while open' },
        ],
      }),
    ]).modules[0].declarations;

    expect(declaration.members.find(member => member.name === 'defaults')).toEqual({
      kind: 'field',
      name: 'defaults',
      static: true,
      type: { text: "{ closeLabel: string; size: 'sm' | 'md' }" },
      description:
        'What every instance starts from; a site changes these once, before its elements are on the page',
    });
  });

  it('exports the default class, named child classes and their tag definitions', () => {
    const module = 'dist/components/PWidget.js';

    expect(widgetModule().exports).toEqual([
      { kind: 'js', name: 'default', declaration: { name: 'PWidget', module } },
      {
        kind: 'custom-element-definition',
        name: 'p-widget',
        declaration: { name: 'PWidget', module },
      },
      { kind: 'js', name: 'PWidgetPart', declaration: { name: 'PWidgetPart', module } },
      {
        kind: 'custom-element-definition',
        name: 'p-widget-part',
        declaration: { name: 'PWidgetPart', module },
      },
    ]);
  });

  it('lists a child element defined in its own module under that module, exported from both', () => {
    const own = 'dist/components/PWidget.js';
    const child = 'dist/components/PWidgetPart.js';
    const modules = customElementsManifest([
      elementContract({
        elements: [
          { tag: 'p-widget-part', module: 'components/PWidgetPart', description: 'A part' },
        ],
      }),
    ]).modules;

    expect(
      modules.map(module => ({
        path: module.path,
        declarations: module.declarations.map(declaration => declaration.name),
        exports: module.exports.map(entry => [entry.kind, entry.name, entry.declaration.module]),
      }))
    ).toEqual([
      {
        path: own,
        declarations: ['PWidget'],
        exports: [
          ['js', 'default', own],
          ['custom-element-definition', 'p-widget', own],
          ['js', 'PWidgetPart', child],
        ],
      },
      {
        path: child,
        declarations: ['PWidgetPart'],
        exports: [
          ['js', 'PWidgetPart', child],
          ['custom-element-definition', 'p-widget-part', child],
        ],
      },
    ]);
  });

  it('describes attributes with their type, default and reflected property', () => {
    expect(widget.attributes).toEqual([
      {
        name: 'size',
        type: { text: "'sm' | 'md'" },
        default: 'md',
        fieldName: 'size',
        description: 'The size',
      },
      {
        name: 'data-widget-state',
        type: { text: "'closed' | 'open'" },
        description: "The widget's state",
      },
    ]);
  });

  it('describes properties, reflected properties and methods as members', () => {
    expect(widget.members).toEqual([
      {
        kind: 'field',
        name: 'form',
        type: { text: 'HTMLFormElement | null' },
        readonly: true,
        description: 'The owning form',
      },
      {
        kind: 'field',
        name: 'size',
        type: { text: "'sm' | 'md'" },
        attribute: 'size',
        description: 'The size',
      },
      {
        kind: 'method',
        name: 'open',
        parameters: [{ name: 'options', type: { text: '{ focus?: boolean }' }, optional: true }],
        return: { type: { text: 'void' } },
        description: 'Open the widget',
      },
    ]);
  });

  it('lists the DOM events the element dispatches, with deprecations', () => {
    expect(widget.events).toEqual([
      {
        name: 'change',
        type: { text: 'CustomEvent<{ value: string }>' },
        description: 'The value changed',
      },
      { name: 'input', type: { text: 'Event' }, description: 'The value is changing' },
      {
        name: 'p-widget:open',
        type: { text: 'CustomEvent<{ widget: HTMLElement }>' },
        description: 'The widget opened',
      },
      {
        name: 'widget:open',
        type: { text: 'CustomEvent<{ widget: HTMLElement }>' },
        description: 'The old name for p-widget:open',
        deprecated: 'Listen for p-widget:open. Removed in 0.6.0.',
      },
    ]);
  });

  it('describes slots, parts and CSS custom properties', () => {
    expect({
      slots: widget.slots,
      cssParts: widget.cssParts,
      cssProperties: widget.cssProperties,
    }).toEqual({
      slots: [{ name: '', description: 'The content' }],
      cssParts: [{ name: 'panel', description: 'The panel' }],
      cssProperties: [
        { name: '--widget-gap', default: '1rem', description: 'Space between items' },
      ],
    });
  });

  it('leaves out the collections an element has none of', () => {
    expect(Object.keys(part)).toEqual([
      'kind',
      'name',
      'customElement',
      'tagName',
      'description',
      'superclass',
    ]);
  });
});
