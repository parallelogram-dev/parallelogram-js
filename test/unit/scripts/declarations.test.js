import { describe, expect, it } from 'vitest';
import {
  conflictingGlobalEvents,
  elementDeclarations,
  exportedNames,
} from '../../../scripts/types/declarations.mjs';
import { elementContract } from './element-contract.js';

const lines = text => text.split('\n');
/** The block that starts with a line, up to the brace that closes it at the same indentation */
const block = (text, start) => {
  const from = text.indexOf(start);
  const indent = text.slice(text.lastIndexOf('\n', from) + 1, from);
  return text.slice(from, text.indexOf(`\n${indent}}`, from) + indent.length + 2);
};
const quotedKeys = text => [...text.matchAll(/^\s+'([^']+)':/gm)].map(match => match[1]);

describe('element declarations', () => {
  it('declares the default class with its properties and methods', () => {
    expect(lines(elementDeclarations(elementContract()))).toEqual(
      expect.arrayContaining([
        'export default class PWidget extends HTMLElement {',
        '  readonly form: HTMLFormElement | null;',
        "  size: 'sm' | 'md';",
        '  open(options?: { focus?: boolean }): void;',
        '  addEventListener<K extends keyof PWidgetEventMap>(',
        '    listener: (this: PWidget, event: PWidgetEventMap[K]) => void,',
      ])
    );
  });

  it('declares the defaults a site changes once, from the attributes that carry an option', () => {
    const contract = elementContract({
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
    });

    /* Without this a TypeScript page cannot write the line Getting started shows,
       PModal.defaults.closeLabel = 'Fermer', because the class's declaration is generated from the
       contract and never saw the static */
    expect(elementDeclarations(contract)).toContain(
      "  static defaults: {\n    /** The accessible name of the close button */\n    closeLabel: string;\n    size: 'sm' | 'md';\n  };"
    );
  });

  it('maps the DOM events the element dispatches, leaving out event bus messages and native events without a detail', () => {
    const map = block(elementDeclarations(elementContract()), 'export interface PWidgetEventMap');

    expect(quotedKeys(map)).toEqual(['change', 'p-widget:open', 'widget:open']);
  });

  it('marks deprecated events', () => {
    expect(elementDeclarations(elementContract())).toContain(
      "   * @deprecated Listen for p-widget:open. Removed in 0.6.0.\n   */\n  'widget:open': CustomEvent<{ widget: HTMLElement }>;"
    );
  });

  it('declares child elements as named classes, without listeners when they have no events', () => {
    expect(elementDeclarations(elementContract())).toContain(
      '/** A part of the widget */\nexport class PWidgetPart extends HTMLElement {}'
    );
  });

  it('registers every tag globally', () => {
    const tags = block(elementDeclarations(elementContract()), 'interface HTMLElementTagNameMap');

    expect(lines(tags).slice(1, -1)).toEqual([
      "    'p-widget': PWidget;",
      "    'p-widget-part': PWidgetPart;",
    ]);
  });

  it('adds only framework events to the global event map', () => {
    const events = block(
      elementDeclarations(elementContract()),
      'interface GlobalEventHandlersEventMap'
    );

    expect(quotedKeys(events)).toEqual(['p-widget:open', 'widget:open']);
  });

  it('leaves out the global event map when there are no framework events', () => {
    expect(elementDeclarations(elementContract({ events: [] }))).not.toContain(
      'GlobalEventHandlersEventMap'
    );
  });

  describe('with a child element defined in its own module', () => {
    const contract = elementContract({
      elements: [
        {
          tag: 'p-widget-part',
          module: 'components/PWidgetPart',
          description: 'A part of the widget',
          events: [{ name: 'p-widget-part:pick', detail: '{ id: string }', description: 'Picked' }],
        },
      ],
    });

    it("re-exports the child from the component's module without declaring it there", () => {
      const declarations = elementDeclarations(contract);

      expect({
        reexport: declarations.startsWith("export { PWidgetPart } from './PWidgetPart.js';\n\n"),
        declared: declarations.includes('class PWidgetPart'),
        tags: quotedKeys(block(declarations, 'interface HTMLElementTagNameMap')),
      }).toEqual({ reexport: true, declared: false, tags: ['p-widget'] });
    });

    it('declares the child, its tag and its events in its own module', () => {
      const declarations = elementDeclarations(contract, 'components/PWidgetPart');

      expect({
        declared: declarations.includes('export class PWidgetPart extends HTMLElement {'),
        parent: declarations.includes('PWidget '),
        tags: quotedKeys(block(declarations, 'interface HTMLElementTagNameMap')),
        events: quotedKeys(block(declarations, 'interface GlobalEventHandlersEventMap')),
      }).toEqual({
        declared: true,
        parent: false,
        tags: ['p-widget-part'],
        events: ['p-widget-part:pick'],
      });
    });
  });

  it('escapes comment terminators in descriptions', () => {
    expect(elementDeclarations(elementContract())).toContain(' * Shows *\\/ things\n');
  });
});

describe('exported names', () => {
  it.each([
    [
      'declared classes, types and export lists',
      'export default class PUploader extends HTMLElement {\n}\nexport declare class PUploaderFile extends HTMLElement {\n}\nexport type Options = {};\nexport { helper as run, other };\n',
      ['default', 'PUploaderFile', 'Options', 'run', 'other'],
    ],
    [
      'a default export of a name',
      'declare class PModal {\n}\nexport default PModal;\n',
      ['default'],
    ],
  ])('reads %s', (_, declarations, expected) => {
    expect([...exportedNames(declarations)]).toEqual(expected);
  });
});

describe('conflicting global events', () => {
  const withOpenDetail = (tag, detail) =>
    elementContract({
      name: tag === 'p-widget' ? 'PWidget' : 'PGadget',
      tag,
      events: [{ name: 'shared:open', detail, description: 'Opened' }],
      elements: [],
    });

  it('reports a framework event two elements type differently', () => {
    expect(
      conflictingGlobalEvents([
        withOpenDetail('p-widget', '{ id: number }'),
        withOpenDetail('p-gadget', '{ id: string }'),
      ])
    ).toEqual([
      'shared:open is CustomEvent<{ id: number }> on p-widget but CustomEvent<{ id: string }> on p-gadget',
    ]);
  });

  it('accepts a framework event two elements type the same way', () => {
    expect(
      conflictingGlobalEvents([
        withOpenDetail('p-widget', '{ id: number }'),
        withOpenDetail('p-gadget', '{ id: number }'),
      ])
    ).toEqual([]);
  });
});
