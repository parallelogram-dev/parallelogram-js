import { BaseComponent } from '../../../src/core/BaseComponent.js';
import { exportCss } from './tokens.js';

const THEMES = ['light', 'dark'];

/**
 * Resolve once a frame has loaded its document
 *
 * @param {HTMLIFrameElement} frame
 * @param {AbortSignal} signal
 * @returns {Promise<void>}
 */
const loaded = (frame, signal) =>
  new Promise(resolve => {
    const doc = frame.contentDocument;
    if (doc && doc.readyState === 'complete' && doc.URL !== 'about:blank') {
      resolve();
      return;
    }
    frame.addEventListener('load', () => resolve(), { once: true, signal });
  });

/**
 * DesignWorkbench - live design token controls for the light and dark preview frames
 *
 * Each control starts with the value the frame's stylesheet gives the token. Changing it sets the
 * custom property on that frame's root, so every component in the frame that uses the token
 * follows, and the changed values are listed as CSS to copy.
 */
export default class DesignWorkbench extends BaseComponent {
  static selector = 'data-design-workbench';

  _init(element) {
    const state = super._init(element);
    const frames = Object.fromEntries(
      THEMES.map(theme => [theme, element.querySelector(`[data-workbench-frame="${theme}"]`)])
    );
    const form = element.querySelector('[data-workbench-controls]');
    const output = element.querySelector('[data-workbench-output]');
    if (!frames.light || !frames.dark || !form || !output) return state;

    Object.assign(state, {
      frames,
      form,
      output,
      count: element.querySelector('[data-workbench-count]'),
      defaults: { light: new Map(), dark: new Map() },
      changes: { light: new Map(), dark: new Map() },
    });

    const { signal } = state.controller;
    Promise.all(THEMES.map(theme => loaded(frames[theme], signal))).then(() => {
      if (signal.aborted) return;
      this._readDefaults(state);
      this._connectControls(state, signal);
      this._syncScroll(state, signal);
    });
    return state;
  }

  _root(state, theme) {
    return state.frames[theme].contentDocument.documentElement;
  }

  _readDefaults(state) {
    for (const theme of THEMES) {
      const style = getComputedStyle(this._root(state, theme));
      for (const input of state.form.querySelectorAll('[data-token-input]')) {
        const name = input.name;
        state.defaults[theme].set(name, style.getPropertyValue(name).trim());
      }
    }

    for (const input of state.form.querySelectorAll('[data-token-input]')) {
      const theme = input.dataset.tokenInput === 'dark' ? 'dark' : 'light';
      input.value = state.defaults[theme].get(input.name) ?? '';
      input.disabled = false;
      this._paintSwatch(input);
    }
  }

  _connectControls(state, signal) {
    state.form.addEventListener('input', event => this._change(state, event.target), { signal });
    state.form.addEventListener(
      'reset',
      event => {
        event.preventDefault();
        this._resetAll(state);
      },
      { signal }
    );
    state.form.addEventListener('submit', event => event.preventDefault(), { signal });
  }

  _change(state, input) {
    if (!input.matches?.('[data-token-input]')) return;
    const scope = input.dataset.tokenInput;
    const themes = scope === 'both' ? THEMES : [scope];
    const bucket = scope === 'dark' ? 'dark' : 'light';
    const value = input.value.trim();
    const unchanged = value === '' || value === state.defaults[bucket].get(input.name);

    for (const theme of themes) {
      const root = this._root(state, theme);
      if (unchanged) {
        root.style.removeProperty(input.name);
      } else {
        root.style.setProperty(input.name, value);
      }
    }

    if (unchanged) {
      state.changes[bucket].delete(input.name);
    } else {
      state.changes[bucket].set(input.name, value);
    }
    this._paintSwatch(input);
    this._writeOutput(state);
  }

  _resetAll(state) {
    for (const theme of THEMES) {
      const root = this._root(state, theme);
      for (const name of [...state.changes.light.keys(), ...state.changes.dark.keys()]) {
        root.style.removeProperty(name);
      }
    }
    state.changes.light.clear();
    state.changes.dark.clear();

    for (const input of state.form.querySelectorAll('[data-token-input]')) {
      const theme = input.dataset.tokenInput === 'dark' ? 'dark' : 'light';
      input.value = state.defaults[theme].get(input.name) ?? '';
      this._paintSwatch(input);
    }
    this._writeOutput(state);
  }

  _paintSwatch(input) {
    const swatch = input.parentElement?.querySelector(
      `[data-token-swatch="${input.dataset.tokenInput}"]`
    );
    if (swatch) swatch.style.background = input.value;
  }

  _writeOutput(state) {
    state.output.textContent = exportCss(state.changes);
    if (state.count) {
      state.count.textContent = String(state.changes.light.size + state.changes.dark.size);
    }
  }

  /**
   * Scroll the other frame to the same relative position, so both show the same components
   */
  _syncScroll(state, signal) {
    let following = null;
    for (const theme of THEMES) {
      const other = theme === 'light' ? 'dark' : 'light';
      const view = state.frames[theme].contentWindow;
      view.addEventListener(
        'scroll',
        () => {
          if (following === theme) {
            following = null;
            return;
          }
          const from = view.document.documentElement;
          const to = state.frames[other].contentWindow;
          const range = from.scrollHeight - view.innerHeight;
          const ratio = range > 0 ? view.scrollY / range : 0;
          following = other;
          to.scrollTo(0, ratio * (to.document.documentElement.scrollHeight - to.innerHeight));
        },
        { passive: true, signal }
      );
    }
  }
}
