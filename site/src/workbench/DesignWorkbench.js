import { BaseComponent } from '../../../src/core/BaseComponent.js';
import { exportCss } from './tokens.js';

const THEMES = ['light', 'dark'];

/**
 * DesignWorkbench - live values for every design token, in both themes, on the page itself
 *
 * There are no preview frames here. The tokens resolve on this document, so a light value edited
 * on the root shows at once everywhere it is read. Dark values live on `:root[data-theme='dark']`
 * and cannot resolve at the same time as the light ones, so they are read once at the start by
 * setting the theme, reading, and setting it back within the same task -- nothing is painted in
 * between -- and the dark side of the page is drawn from the values held here.
 */
export default class DesignWorkbench extends BaseComponent {
  static selector = 'data-design-workbench';

  _init(element) {
    const state = super._init(element);
    const form = element.querySelector('[data-workbench-controls]');
    const output = element.querySelector('[data-workbench-output]');
    if (!form || !output) return state;

    Object.assign(state, {
      form,
      output,
      theme: 'light',
      toggle: element.querySelector('[data-token-theme]'),
      count: element.querySelector('[data-workbench-count]'),
      defaults: { light: new Map(), dark: new Map() },
      changes: { light: new Map(), dark: new Map() },
    });

    const { signal } = state.controller;
    this._whenStyled(state, signal);

    form.addEventListener('input', event => this._change(state, event.target), { signal });
    form.addEventListener(
      'reset',
      event => {
        event.preventDefault();
        this._resetAll(state);
      },
      { signal }
    );
    form.addEventListener('submit', event => event.preventDefault(), { signal });
    state.toggle?.addEventListener('click', () => this._switchTheme(state), { signal });
    return state;
  }

  /**
   * Read the values once the stylesheet that declares them has actually applied
   *
   * The tokens are declared in a stylesheet, and a development server may serve it after this
   * module has run, when every read comes back empty. Rather than assume an order, try until the
   * values are there, and give up after a second so a genuine absence does not spin.
   */
  _whenStyled(state, signal, attempt = 0) {
    if (signal.aborted) return;
    this._readDefaults(state);

    const read = [...state.defaults.light.values()].filter(Boolean).length;
    if (read === 0 && attempt < 60) {
      state.defaults.light.clear();
      state.defaults.dark.clear();
      requestAnimationFrame(() => this._whenStyled(state, signal, attempt + 1));
      return;
    }

    this._showValues(state);
    this._upgradeControls(state);
  }

  /** Both themes' values, read in one task so the page is never painted mid-read */
  _readDefaults(state) {
    const root = document.documentElement;
    const was = root.dataset.theme;
    const names = [
      ...new Set([...state.form.querySelectorAll('[data-token-input]')].map(i => i.name)),
    ];

    for (const theme of THEMES) {
      root.dataset.theme = theme;
      const style = getComputedStyle(root);
      for (const name of names) {
        state.defaults[theme].set(name, style.getPropertyValue(name).trim());
      }
    }

    if (was === undefined) delete root.dataset.theme;
    else root.dataset.theme = was;
  }

  _valueFor(state, name, theme) {
    return state.changes[theme].get(name) ?? state.defaults[theme].get(name) ?? '';
  }

  _showValues(state) {
    for (const input of state.form.querySelectorAll('[data-token-input]')) {
      const theme = input.dataset.tokenInput === 'both' ? 'light' : state.theme;
      input.value = this._valueFor(state, input.name, theme);
      input.disabled = false;
    }
  }

  /**
   * Put the page in a theme and write every change that belongs to it onto the root
   *
   * A value set for one theme would otherwise stay on the root and override the other, so the
   * inline properties are cleared and written again each time the theme changes.
   */
  _applyTheme(state) {
    const root = document.documentElement;
    root.dataset.theme = state.theme;

    for (const name of new Set([...state.changes.light.keys(), ...state.changes.dark.keys()])) {
      root.style.removeProperty(name);
    }
    for (const [name, value] of state.changes.light) root.style.setProperty(name, value);
    if (state.theme === 'dark') {
      for (const [name, value] of state.changes.dark) root.style.setProperty(name, value);
    }
  }

  _switchTheme(state) {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    this._applyTheme(state);
    this._showValues(state);
    this._syncControls(state);

    const { toggle } = state;
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
      toggle.textContent = state.theme === 'dark' ? 'Light theme' : 'Dark theme';
    }
  }

  /**
   * Give a field the control its value can actually take
   *
   * A colour picker or a slider is only honest where the value is a literal: a token that follows
   * another holds a reference, and replacing it with a colour would cut it out of the layer it was
   * following, which is the one thing this page exists to show. Those keep the plain field.
   */
  _upgradeControls(state) {
    for (const input of state.form.querySelectorAll('[data-token-input]')) {
      const token = input.closest('.tokens__token');
      if (!token || token.dataset.upgraded || token.dataset.tokenFollows) continue;
      token.dataset.upgraded = 'yes';

      const hex = this._asHex(input.value);
      if (hex) {
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.className = 'tokens__picker';
        picker.value = hex;
        picker.setAttribute('aria-label', `${input.name}, colour picker`);
        picker.addEventListener('input', () => this._drive(input, picker.value));
        input.closest('.tokens__control')?.prepend(picker);
        continue;
      }

      const size = this._asSize(input.value);
      if (size) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'tokens__slider';
        Object.assign(slider, size.bounds);
        slider.value = String(size.number);
        slider.setAttribute('aria-label', `${input.name}, slider`);
        slider.addEventListener('input', () => this._drive(input, slider.value + size.unit));
        token.append(slider);
      }
    }
  }

  /** Put a value into the field and let the ordinary change path handle it */
  _drive(input, value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** The value as #rrggbb, or null when it is not a plain colour */
  _asHex(value) {
    const text = (value ?? '').trim();
    const short = text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
    const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!rgb) return null;
    const hex = n =>
      Math.max(0, Math.min(255, Math.round(Number(n))))
        .toString(16)
        .padStart(2, '0');
    return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
  }

  /** The value as a number and unit a slider can move, or null */
  _asSize(value) {
    const match = (value ?? '').trim().match(/^(-?[\d.]+)(em|rem|px|%|ms|s)$/);
    if (!match) return null;
    const BOUNDS = {
      em: { min: 0, max: 4, step: 0.05 },
      rem: { min: 0, max: 4, step: 0.05 },
      px: { min: 0, max: 24, step: 1 },
      '%': { min: 0, max: 100, step: 1 },
      s: { min: 0, max: 2, step: 0.05 },
      ms: { min: 0, max: 2000, step: 10 },
    };
    return { number: Number(match[1]), unit: match[2], bounds: BOUNDS[match[2]] };
  }

  /** Keep a picker or slider in step when the field is set from elsewhere */
  _syncControls(state) {
    for (const input of state.form.querySelectorAll('[data-token-input]')) {
      const token = input.closest('.tokens__token');
      const picker = token?.querySelector('.tokens__picker');
      if (picker) {
        const hex = this._asHex(input.value);
        if (hex) picker.value = hex;
      }
      const slider = token?.querySelector('.tokens__slider');
      const size = slider ? this._asSize(input.value) : null;
      if (slider && size) slider.value = String(size.number);
    }
  }

  _change(state, input) {
    if (!input.matches?.('[data-token-input]')) return;
    const scope = input.dataset.tokenInput;
    const bucket = scope === 'both' ? 'light' : state.theme;
    const value = input.value.trim();
    const unchanged = value === '' || value === state.defaults[bucket].get(input.name);

    if (unchanged) {
      state.changes[bucket].delete(input.name);
    } else {
      state.changes[bucket].set(input.name, value);
    }

    /* Written onto the page, so everything reading it follows at once */
    if (unchanged) document.documentElement.style.removeProperty(input.name);
    else document.documentElement.style.setProperty(input.name, value);

    this._writeOutput(state);
  }

  _resetAll(state) {
    for (const name of state.changes.light.keys()) {
      document.documentElement.style.removeProperty(name);
    }
    state.changes.light.clear();
    state.changes.dark.clear();
    this._showValues(state);
    this._syncControls(state);
    this._writeOutput(state);
  }

  _writeOutput(state) {
    state.output.textContent = exportCss(state.changes);
    if (state.count) {
      state.count.textContent = String(state.changes.light.size + state.changes.dark.size);
    }
  }
}
