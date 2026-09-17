import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateContract } from '../../src/contract.js';
import { classNameFor, propertiesOf } from '../../scripts/types/members.mjs';

const root = `${process.cwd()}/`;
const read = file => readFileSync(`${root}${file}`, 'utf8');

const contracts = Object.values(
  import.meta.glob('../../src/components/*.contract.js', { eager: true, import: 'default' })
);
const modules = import.meta.glob([
  '../../src/components/*.js',
  '!../../src/components/*.contract.js',
]);

const styles = readdirSync(`${root}src/styles/framework/components`)
  .map(file => read(`src/styles/framework/components/${file}`))
  .join('\n');

const QUOTED_EVENT = /['"`]([a-z][a-z-]*:[a-z][a-z-]*)['"`]/g;
const HELPER_READ =
  /\b(?:getAttr|getBoolAttr|getNumberAttr|hasAttr|setAttr|removeAttr)\(\s*[\w.]+,\s*'([a-z-]+)'/g;
const CONFIG_MAP = /_getConfigFromAttrs\(\s*[\w.]+,\s*\{([^}]*)\}/g;
const PART = /part="([a-z -]+)"|setAttribute\('part', '([a-z -]+)'\)|\bpart: '([a-z -]+)'/g;
const SLOT = /<slot(?: name="([a-z-]+)")?/g;

const unique = values => [...new Set(values)].sort();

/** Rename custom element tags so parsing an example never constructs its elements */
const inertMarkup = markup => markup.replace(/<(\/?)p-/g, '<$1x-inert-p-');
const inertSelector = selector => selector.replace(/(^|[\s,>+~])p-/g, '$1x-inert-p-');
const withoutPlaceholder = name => name.replace(/<[a-z-]+>$/, '');
const itemsOf = contract => [contract, ...(contract.elements ?? [])];

/** A prototype chain's own value for a name, read without running any getter */
const valueOf = (prototype, name) => {
  for (let current = prototype; current; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor) return descriptor.value;
  }
  return undefined;
};

async function componentOf(contract) {
  const module = await modules[`../../src/${contract.module}.js`]();
  return module.default ?? module[contract.name];
}

describe.each(contracts.map(contract => [contract.name, contract]))(
  '%s contract',
  (_, contract) => {
    /* A child element defined in its own module contributes that module's source */
    const source = [...new Set(itemsOf(contract).map(item => item.module ?? contract.module))]
      .map(module => read(`src/${module}.js`))
      .join('\n');
    const attributes = itemsOf(contract).flatMap(item => item.attributes ?? []);
    const attributeNames = new Set(attributes.map(attribute => attribute.name));
    const events = itemsOf(contract).flatMap(item => item.events ?? []);
    const eventNames = new Set(events.map(event => event.name));
    const own = contract.match ?? contract.tag ?? `[${contract.selector}]`;

    it('is well formed', () => {
      expect(validateContract(contract)).toEqual([]);
    });

    it('describes the class its module exports', async () => {
      const Component = await componentOf(contract);

      if (contract.kind === 'element') {
        expect(customElements.get(contract.tag)).toBe(Component);
      } else {
        const declared = String(Component.selector).replace(/^\[|\]$/g, '');
        expect(declared.startsWith('data-') ? declared : `data-${declared}`).toBe(
          contract.selector
        );
      }
    });

    it('names attributes that appear in the source', () => {
      const missing = [...attributeNames].filter(name => {
        const bare = withoutPlaceholder(name);
        if (source.includes(bare)) return false;
        const prefix = `${contract.selector}-`;
        return !(
          contract.selector &&
          bare.startsWith(prefix) &&
          source.includes(`'${bare.slice(prefix.length)}'`)
        );
      });

      expect(missing).toEqual([]);
    });

    it('declares every attribute the component reads or observes', async () => {
      let used;
      if (contract.kind === 'enhancement') {
        const suffixes = [
          ...[...source.matchAll(HELPER_READ)].map(match => match[1]),
          ...[...source.matchAll(CONFIG_MAP)].flatMap(match =>
            [...match[1].matchAll(/'([a-z-]+)'/g)].map(value => value[1])
          ),
        ];
        used = suffixes.map(suffix => `${contract.selector}-${suffix}`);
      } else {
        await componentOf(contract);
        used = itemsOf(contract).flatMap(
          item => customElements.get(item.tag)?.observedAttributes ?? []
        );
      }

      expect(unique(used).filter(name => !attributeNames.has(name))).toEqual([]);
    });

    it('declares every event the source names under its prefixes', () => {
      const prefixes = new Set([...eventNames].map(name => name.split(':')[0]));
      itemsOf(contract).forEach(item => item.tag && prefixes.add(item.tag));
      if (contract.selector) prefixes.add(contract.selector.slice('data-'.length));

      const named = [...source.matchAll(QUOTED_EVENT)]
        .map(match => match[1])
        .filter(name => prefixes.has(name.split(':')[0]));

      expect(unique(named).filter(name => !eventNames.has(name))).toEqual([]);
    });

    it('names events that appear in the source', () => {
      const missing = [...eventNames].filter(name => {
        if (source.includes(`'${name}'`) || source.includes(`\`${name}\``)) return false;
        const [prefix, verb] = name.split(':');
        return !(verb && source.includes(`\`${prefix}:\${`) && source.includes(`'${verb}'`));
      });

      expect(missing).toEqual([]);
    });

    it.runIf(contract.kind === 'element')('declares its shadow parts and slots', () => {
      const parts = [...source.matchAll(PART)].flatMap(match =>
        (match[1] ?? match[2] ?? match[3]).split(' ')
      );
      const slots = [...source.matchAll(SLOT)].map(match => match[1] ?? '');

      expect({
        parts: unique(itemsOf(contract).flatMap(item => (item.parts ?? []).map(part => part.name))),
        slots: unique(itemsOf(contract).flatMap(item => (item.slots ?? []).map(slot => slot.name))),
      }).toEqual({ parts: unique(parts), slots: unique(slots) });
    });

    it.runIf(contract.kind === 'element')(
      'declares properties and methods its elements have',
      async () => {
        await componentOf(contract);

        const problems = [];
        for (const item of itemsOf(contract)) {
          const { prototype } = customElements.get(item.tag);
          for (const property of propertiesOf(item)) {
            if (!(property.name in prototype) && !source.includes(`this.${property.name} =`)) {
              problems.push(`${item.tag} has no ${property.name} property`);
            }
          }
          for (const method of item.methods ?? []) {
            if (typeof valueOf(prototype, method.name) !== 'function') {
              problems.push(`${item.tag} has no ${method.name}() method`);
            }
          }
        }

        expect(problems).toEqual([]);
      }
    );

    it.runIf(contract.kind === 'enhancement')('declares methods its class has', async () => {
      const { prototype } = await componentOf(contract);

      expect(
        (contract.methods ?? [])
          .map(method => method.name)
          .filter(name => typeof valueOf(prototype, name) !== 'function')
      ).toEqual([]);
    });

    it.runIf(contract.kind === 'element')(
      'names its child element classes after their tags',
      async () => {
        await componentOf(contract);
        const children = contract.elements ?? [];

        expect(children.map(element => customElements.get(element.tag)?.name)).toEqual(
          children.map(element => classNameFor(element.tag))
        );
      }
    );

    it('names CSS properties its styles or source use', () => {
      const missing = (contract.cssProperties ?? [])
        .map(property => property.name)
        .filter(name => !styles.includes(name) && !source.includes(name));

      expect(missing).toEqual([]);
    });

    it('gives the defaults the component uses', async () => {
      const Component = await componentOf(contract);
      const withOption = attributes.filter(attribute => attribute.option);

      expect(
        withOption.map(attribute => [attribute.name, Component.defaults?.[attribute.option]])
      ).toEqual(withOption.map(attribute => [attribute.name, attribute.default]));
    });

    it('keeps its defaults as one object, so a site can change them once', async () => {
      const Component = await componentOf(contract);

      /* A getter that hands back a fresh copy makes `Toggle.defaults.openClass = 'open'` a no-op
         nothing reports; every enhancement did that until 0.8.0 */
      expect(Component.defaults).toBe(Component.defaults);
    });

    it('has examples containing the component and the elements their controls change', () => {
      const problems = [];
      for (const example of contract.examples) {
        const inert = document.implementation.createHTMLDocument('');
        inert.body.innerHTML = inertMarkup(example.markup);
        if (!inert.body.querySelector(inertSelector(own))) {
          problems.push(`${example.id} has no ${own}`);
        }
        for (const control of example.controls ?? []) {
          const target = control.target ?? own;
          if (!inert.body.querySelector(inertSelector(target))) {
            problems.push(`${example.id} has no ${target} for ${control.attribute}`);
          }
        }
      }

      expect(problems).toEqual([]);
    });
  }
);

/* Deliberately not documented: a component reads these to stay consistent with itself, and listing
   them would bury the values a page would actually set. Named here so the omission is a decision on
   the record rather than something nobody noticed. */
const INTERNAL_PROPERTIES = new Set([
  '--modal-font-md',
  '--modal-font-sm',
  '--modal-radius-lg',
  '--modal-radius-xl',
  '--modal-space-lg',
  '--modal-space-xl',
  '--datetime-font-md',
  '--datetime-font-sm',
  '--datetime-radius-xl',
  '--datetime-space-lg',
  '--datetime-space-sm',
  '--datetime-space-xs',
]);

/**
 * Where a component is styled, from what it references: the scss its module imports, or the
 * stylesheet its contract names. Never inferred from a component's name, because `Modal` and
 * `PModal` would then claim each other's properties.
 */
const stylesheetsFor = contract => {
  const files = new Set();
  const source = read(`src/components/${contract.name}.js`);
  for (const match of source.matchAll(/from\s+['"]([^'"]+\.scss)['"]/g)) {
    files.add(`src/styles/framework/components/${match[1].split('/').pop()}`);
  }
  if (contract.stylesheet) {
    const name = contract.stylesheet
      .split('/')
      .pop()
      .replace(/\.css$/, '.scss');
    files.add(`src/styles/framework/components/${name}`);
  }
  return [...files].filter(file => existsSync(`${root}${file}`));
};

describe('custom properties', () => {
  it('documents every one a component reads of its own', () => {
    const undocumented = contracts.flatMap(contract => {
      const files = stylesheetsFor(contract);
      if (files.length === 0) return [];

      const css = files.map(file => read(file)).join('\n');
      /* A component owns the namespaces it declares properties in */
      const owned = unique(
        [...css.matchAll(/^\s*(--[a-z0-9]+(?:-[a-z0-9]+)?)-[a-z0-9-]+:/gm)].map(
          match => `${match[1]}-`
        )
      );
      const documented = new Set((contract.cssProperties ?? []).map(property => property.name));

      return unique([...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map(match => match[1]))
        .filter(name => owned.some(prefix => name.startsWith(prefix)))
        .filter(name => !documented.has(name) && !INTERNAL_PROPERTIES.has(name))
        .map(name => `${contract.name} ${name}`);
    });

    /* p-modal documented 14 of the 51 it read, and nothing failed */
    expect(undocumented).toEqual([]);
  });

  it('documents none that nothing reads', () => {
    const dead = contracts.flatMap(contract =>
      (contract.cssProperties ?? [])
        .map(property => property.name)
        /* var() may wrap, so the name need not follow the bracket on the same line */
        .filter(name => !new RegExp(`var\\(\\s*${name}\\s*[,)]`).test(styles))
        .map(name => `${contract.name} ${name}`)
    );

    expect(dead).toEqual([]);
  });
});
