import { describe, expect, it } from 'vitest';
import {
  classNameFor,
  eventType,
  listenableEvents,
  parseSignature,
  propertiesOf,
  reflectedPropertyType,
} from '../../../scripts/types/members.mjs';

const parameter = (name, type, { optional = false, rest = false } = {}) => ({
  name,
  type,
  optional,
  rest,
});

describe('contract members', () => {
  it('names a class after its tag', () => {
    expect(classNameFor('p-uploader-file')).toBe('PUploaderFile');
  });

  it.each([
    ['no parameters', '() => void', { parameters: [], returns: 'void' }],
    [
      'an optional object parameter',
      '(options?: { returnFocus?: HTMLElement | null }) => void',
      {
        parameters: [
          parameter('options', '{ returnFocus?: HTMLElement | null }', { optional: true }),
        ],
        returns: 'void',
      },
    ],
    [
      'commas and arrows inside types',
      "(options: { type?: 'a,b' | 'c'; pairs: Array<[string, number]>; done: () => void }, force: boolean) => () => void",
      {
        parameters: [
          parameter(
            'options',
            "{ type?: 'a,b' | 'c'; pairs: Array<[string, number]>; done: () => void }"
          ),
          parameter('force', 'boolean'),
        ],
        returns: '() => void',
      },
    ],
    [
      'a rest parameter',
      '(...values: string[]) => number',
      { parameters: [parameter('values', 'string[]', { rest: true })], returns: 'number' },
    ],
  ])('parses a signature with %s', (_, signature, expected) => {
    expect(parseSignature(signature)).toEqual(expected);
  });

  it.each([
    ['a type that is not a function', 'string'],
    ['a parameter without a type', '(value) => void'],
  ])('rejects a signature with %s', (_, signature) => {
    expect(() => parseSignature(signature)).toThrow(signature);
  });

  it.each([
    ['a flag as a boolean', { type: 'flag' }, 'boolean'],
    ['a string without a default as nullable', { type: 'string' }, 'string | null'],
    ['a string with a default as a string', { type: 'string', default: 'md' }, 'string'],
    [
      'an enum with a default as its options',
      { type: 'enum', options: ['12', '24'], default: '24' },
      "'12' | '24'",
    ],
    ['a number without a default as nullable', { type: 'number' }, 'number | null'],
  ])('types a reflected property for %s', (_, attribute, expected) => {
    expect(reflectedPropertyType(attribute)).toBe(expected);
  });

  it('lists declared properties before the ones only attributes reflect', () => {
    const item = {
      attributes: [
        { name: 'value', type: 'string', property: 'value', description: 'The value attribute' },
        {
          name: 'range-to',
          type: 'string',
          property: 'rangeTo',
          description: 'The end field',
          deprecated: 'Use to. Removed in 0.6.0.',
        },
        { name: 'data-x-state', type: 'string', readonly: true, description: 'The state' },
      ],
      properties: [
        { name: 'value', type: 'string', description: 'The value' },
        { name: 'form', type: 'HTMLFormElement | null', readonly: true, description: 'The form' },
      ],
    };

    expect(propertiesOf(item)).toEqual([
      { name: 'value', type: 'string', description: 'The value', attribute: 'value' },
      { name: 'form', type: 'HTMLFormElement | null', readonly: true, description: 'The form' },
      {
        name: 'rangeTo',
        type: 'string | null',
        description: 'The end field',
        attribute: 'range-to',
        deprecated: 'Use to. Removed in 0.6.0.',
      },
    ]);
  });

  it('listens only for DOM events the element dispatches itself', () => {
    const events = [
      { name: 'p-x:open', description: 'Opened' },
      { name: 'x:mount', channel: 'bus', description: 'Mounted' },
      { name: 'p-x:show', channel: 'both', description: 'Shown' },
      { name: 'p-x:refresh', inbound: true, description: 'Asked to refresh' },
      { name: 'p-x:target', on: 'target', description: 'On the target' },
    ];

    expect(listenableEvents({ events }).map(event => event.name)).toEqual(['p-x:open', 'p-x:show']);
  });

  it.each([
    ['a detail as a CustomEvent', { detail: '{ id: number }' }, 'CustomEvent<{ id: number }>'],
    ['no detail as an Event', {}, 'Event'],
  ])('types an event with %s', (_, event, expected) => {
    expect(eventType(event)).toBe(expected);
  });
});
