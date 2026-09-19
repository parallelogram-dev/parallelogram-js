import { afterEach, describe, expect, it } from 'vitest';
import {
  focusSource,
  followFocusSource,
  trackFocusSource,
} from '../../../src/utils/focus-source.js';

const press = (target, key, options = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true, ...options })
  );
const point = target => target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
const recorded = element => element.getAttribute('data-focus-source');

describe('focus source', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-focus-source');
    document.body.replaceChildren();
  });

  it('reports the last input method, and a keyboard until anything is recorded', () => {
    const beforeAnything = focusSource();
    trackFocusSource();

    point(document.body);
    const afterPointer = focusSource();
    press(document.body, 'Tab');

    expect([beforeAnything, afterPointer, focusSource()]).toEqual([
      'keyboard',
      'pointer',
      'keyboard',
    ]);
  });

  it('records pointer and keyboard input on the root element', () => {
    trackFocusSource();

    point(document.body);
    const afterPointer = recorded(document.documentElement);
    press(document.body, 'Tab');

    expect([afterPointer, recorded(document.documentElement)]).toEqual(['pointer', 'keyboard']);
  });

  it('keeps pointer input while typing in a text field, until Tab is pressed', () => {
    trackFocusSource();
    const field = document.createElement('input');
    document.body.append(field);

    point(field);
    press(field, 'a');
    const whileTyping = recorded(document.documentElement);
    press(field, 'Tab');

    expect([whileTyping, recorded(document.documentElement)]).toEqual(['pointer', 'keyboard']);
  });

  it('ignores shortcuts with modifier keys', () => {
    trackFocusSource();

    point(document.body);
    press(document.body, 'c', { metaKey: true });

    expect(recorded(document.documentElement)).toBe('pointer');
  });

  it('copies the input method onto a followed host as focus arrives and while it stays', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    document.body.append(host);
    followFocusSource(host);

    point(host);
    host.focus();
    const onFocus = recorded(host);
    press(host, 'ArrowDown');

    expect([onFocus, recorded(host)]).toEqual(['pointer', 'keyboard']);
  });
});
