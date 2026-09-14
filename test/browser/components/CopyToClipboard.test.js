import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CopyToClipboard from '../../../src/components/CopyToClipboard.js';

const liveRegion = () => document.querySelector('[data-copytoclipboard-status]');

const button = (attributes = {}, children = ['Copy']) => {
  const element = document.createElement('button');
  element.setAttribute('data-copytoclipboard', '');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.append(...children);
  document.body.append(element);
  return element;
};

const mount = element => {
  const component = new CopyToClipboard();
  component.mount(element);
  return component;
};

describe('CopyToClipboard', () => {
  let writeText;

  beforeEach(() => {
    writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('copies the text of the element named by data-copytoclipboard-target', async () => {
    const code = document.createElement('pre');
    code.id = 'snippet';
    code.textContent = "logger.info('Hello');";
    document.body.append(code);
    const trigger = button({ 'data-copytoclipboard-target': '#snippet' }, ['Copy code']);
    mount(trigger);

    trigger.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("logger.info('Hello');"));
  });

  it('copies the value of a targeted input', async () => {
    const input = document.createElement('input');
    input.id = 'invite-link';
    input.value = 'https://example.com/invite/abc';
    document.body.append(input);
    const trigger = button({ 'data-copytoclipboard-target': '#invite-link' });
    mount(trigger);

    trigger.click();

    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://example.com/invite/abc')
    );
  });

  it('copies the literal text from data-copytoclipboard-text', async () => {
    const trigger = button({ 'data-copytoclipboard-text': 'npm install @parallelogram-js/core' });
    mount(trigger);

    trigger.click();

    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('npm install @parallelogram-js/core')
    );
  });

  it('keeps the button enabled, focused and intact while confirming the copy', async () => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const label = document.createElement('span');
    label.setAttribute('data-copytoclipboard-label', '');
    label.textContent = 'Copy';
    const trigger = button({ 'data-copytoclipboard-text': 'abc' }, [icon, label]);
    mount(trigger);
    trigger.focus();

    trigger.click();

    await vi.waitFor(() =>
      expect(trigger.getAttribute('data-copytoclipboard-state')).toBe('copied')
    );
    expect(trigger.disabled).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.querySelector('svg')).toBe(icon);
    expect(label.textContent).toBe('Copied!');
    await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Copied!'));
  });

  it('reports a failed copy', async () => {
    writeText.mockRejectedValue(new Error('Permission denied'));
    const trigger = button({ 'data-copytoclipboard-text': 'abc' });
    mount(trigger);

    trigger.click();

    await vi.waitFor(() =>
      expect(trigger.getAttribute('data-copytoclipboard-state')).toBe('failed')
    );
    await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Copy failed'));
  });

  it('enhances documented markup when enhanceAll is called without arguments', async () => {
    const trigger = button({ 'data-copytoclipboard-text': 'abc' });

    CopyToClipboard.enhanceAll();
    trigger.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('abc'));
  });
});
