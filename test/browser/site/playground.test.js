import { afterEach, describe, expect, it } from 'vitest';
import { exampleBlock } from '../../../site/build/render.js';
import Toggle from '../../../src/components/Toggle.contract.js';
import ExamplePlayground from '../../../site/src/playground/ExamplePlayground.js';

const mountExample = (contract, exampleId) => {
  const host = document.createElement('div');
  host.innerHTML = exampleBlock(
    contract,
    contract.examples.find(example => example.id === exampleId)
  );
  document.body.append(host);
  const element = host.querySelector('[data-example]');
  const playground = new ExamplePlayground();
  playground.mount(element);
  return { element, playground };
};

const stageOf = element => element.querySelector('[data-example-stage]');
const control = (element, attribute) => element.querySelector(`[data-attribute="${attribute}"]`);

describe('example playground', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('starts its controls from the example markup', () => {
    const { element } = mountExample(Toggle, 'menu');

    expect([
      element.querySelector('[data-example-controls]').hidden,
      control(element, 'data-toggle-capture').value,
      control(element, 'data-toggle-animate').value,
    ]).toEqual([false, 'true', '']);
  });

  it('renders the example again with a changed attribute and shows the new markup', () => {
    const { element } = mountExample(Toggle, 'menu');
    const field = control(element, 'data-toggle-close-escape');

    field.value = 'false';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    expect([
      stageOf(element).querySelector('[data-toggle]').getAttribute('data-toggle-close-escape'),
      element
        .querySelector('[data-example-code]')
        .textContent.includes('data-toggle-close-escape="false"'),
    ]).toEqual(['false', true]);
  });

  it('puts the original markup back when reset', async () => {
    const { element } = mountExample(Toggle, 'menu');
    const field = control(element, 'data-toggle-capture');
    field.value = 'false';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    element.querySelector('[data-example-controls]').reset();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect([
      stageOf(element).querySelector('[data-toggle]').getAttribute('data-toggle-capture'),
      field.value,
    ]).toEqual(['', 'true']);
  });

  it("lists the component's events as they are dispatched in the example", () => {
    const { element } = mountExample(Toggle, 'menu');
    const trigger = stageOf(element).querySelector('[data-toggle]');

    trigger.dispatchEvent(
      new CustomEvent('toggle:show', {
        bubbles: true,
        detail: { target: document.createElement('nav'), trigger },
      })
    );

    const entry = element.querySelector('[data-example-log-list] li');
    expect([
      entry?.querySelector('code').textContent,
      entry?.querySelector('.log__detail').textContent,
    ]).toEqual(['toggle:show', '{"target":"<nav>","trigger":"<button>"}']);
  });
});
