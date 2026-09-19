import Toggle from './Toggle.js';
import { whenAnimationsFinish } from '../utils/motion.js';
import { placeBeside } from '../utils/position.js';

const PLACEMENTS = [
  'bottom-start',
  'bottom-end',
  'bottom',
  'top-start',
  'top-end',
  'top',
  'left',
  'right',
];
/** What counts as an item in a menu, in document order */
const ITEMS = 'a[href], button:not([disabled]), [role^="menuitem"]:not([aria-disabled="true"])';
/** The attribute prefix a trigger's params are read from: data-dropdown-param-<name> */
const PARAM = 'param-';
/** Attributes whose presence is their value; a param fills them as true or false, not as text */
const BOOLEAN = new Set([
  'disabled',
  'hidden',
  'checked',
  'selected',
  'readonly',
  'required',
  'inert',
  'open',
]);
const FALSE = new Set(['', 'false', '0', 'null', 'undefined']);
/** A name list on the trigger: comma or space separated */
const names = text => (text ?? '').split(/[\s,]+/).filter(Boolean);
/** Room to leave between a menu and the edge of the viewport */
const MARGIN = 8;

/**
 * Dropdown - a menu that opens beside its button, from markup on the page or from a template filled
 * in per button
 *
 * Dropdown is Toggle with a place to sit and a menu to keep. The menu is either on the page,
 * named by `data-dropdown-target`, or built the first time the trigger opens from a `<template>`
 * named by `data-dropdown-template`, with every `{name}` in its text and attribute values filled
 * from the trigger's `data-dropdown-param-<name>` attributes and removed again when it closes
 * unless `data-dropdown-keep` says otherwise. Values are put in as text, never parsed as markup.
 *
 * It opens on the side `data-dropdown-placement` asks for, flips when there is no room, stays
 * inside the viewport and follows the trigger while the page scrolls; `data-dropdown-offset` is
 * the gap, `data-dropdown-match-width` makes it at least the trigger's width, and
 * `data-dropdown-portal` moves it to the end of the body while open. Toggle's own attributes
 * apply -- `data-dropdown-group`, `data-dropdown-capture`, `data-dropdown-close-navigation`,
 * `data-dropdown-close-escape`, `data-dropdown-manual`, `data-dropdown-animate` -- with a menu's
 * defaults: outside clicks close it, and every dropdown shares one group unless given its own.
 * The menu carries `data-dropdown-state` and `data-dropdown-side`, the trigger
 * `data-dropdown-enhanced`; choosing an item dispatches dropdown:select and closes the menu unless
 * the item or the menu carries `data-dropdown-stay`.
 *
 * @example
 * <button type="button" data-dropdown data-dropdown-target="#account-menu">Account</button>
 * <div id="account-menu" class="menu" hidden>
 *   <a href="/profile">Profile</a>
 *   <button type="button">Sign out</button>
 * </div>
 *
 * @example
 * <template id="row-actions">
 *   <div class="menu"><a href="/bookings/{id}/edit">Edit {name}</a></div>
 * </template>
 * <button type="button" data-dropdown data-dropdown-template="#row-actions"
 *         data-dropdown-param-id="12" data-dropdown-param-name="Ada">Actions</button>
 */
export default class Dropdown extends Toggle {
  static selector = 'data-dropdown';

  static events = { show: 'dropdown:show', hide: 'dropdown:hide', mount: 'dropdown:mount' };

  /** A templated menu exists only while open, so a trigger mounts without one */
  static defersTarget = true;

  static defaults = {
    ...Toggle.defaults,
    capture: true,
    group: 'dropdown',
    placement: 'bottom-start',
    offset: 4,
    keep: false,
    matchWidth: false,
    portal: false,
  };

  _init(element) {
    const state = super._init(element);
    const { defaults } = this.constructor;
    const config = this._getConfigFromAttrs(element, {
      placement: 'placement',
      offset: 'offset',
      keep: 'keep',
      matchWidth: 'match-width',
      portal: 'portal',
    });
    state.config = {
      ...config,
      placement: PLACEMENTS.includes(config.placement) ? config.placement : defaults.placement,
    };
    state.templateSelector = this.getAttr(element, 'template');
    state.params = this._params(element);
    state.built = null;
    state.home = null;
    state.menuListeners = null;
    state.reposition = () => this._position(element, state);
    /* Every dropdown shares one group unless given its own; an empty name, read raw because the
       attribute helpers treat an empty value as absent, makes one independent */
    const group = element.getAttribute(`${this._getSelector()}-group`);
    state.group = group === null ? defaults.group : group;
    if (!state.target && !state.templateSelector) {
      this.logger?.warn('Dropdown: neither a target nor a template to open', element);
    }

    state.hadPopup = element.getAttribute('aria-haspopup');
    element.setAttribute('aria-haspopup', 'menu');
    element.addEventListener(
      'keydown',
      event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        if (state.target && this._isTargetOpen(state.target)) return;
        event.preventDefault();
        this.show(element);
        if (event.key === 'ArrowUp')
          this._items(state.target).at(-1)?.focus({ preventScroll: true });
      },
      { signal: state.controller.signal }
    );

    const toggleCleanup = state.cleanup;
    state.cleanup = () => {
      this._unwatch(state);
      state.menuListeners?.abort();
      const { built } = state;
      toggleCleanup();
      built?.remove();
      if (state.hadPopup === null) element.removeAttribute('aria-haspopup');
      else element.setAttribute('aria-haspopup', state.hadPopup);
    };
    return state;
  }

  /**
   * Build the menu from the trigger's template, filled in with its params, the first time it opens
   */
  _ensureTarget(element, state) {
    if (state.target || !state.templateSelector) return;
    const template = document.querySelector(state.templateSelector);
    if (!(template instanceof HTMLTemplateElement)) {
      this.logger?.warn('Dropdown: template not found', {
        selector: state.templateSelector,
        element,
      });
      return;
    }
    const fragment = template.content.cloneNode(true);
    this._fill(fragment, state.params);
    const menu = fragment.firstElementChild;
    if (!menu) {
      this.logger?.warn('Dropdown: the template has no element to be the menu', { element });
      return;
    }
    this._restrict(element, menu, { remove: true });
    menu.hidden = true;
    if (state.config.portal) document.body.append(menu);
    else element.after(menu);
    state.built = menu;
    this._attachTarget(element, state, menu);
  }

  /**
   * Disable or drop the items the trigger names in data-dropdown-disabled and data-dropdown-hidden,
   * by their data-dropdown-item: left out of a menu built from a template, hidden in one on the page
   */
  _restrict(element, menu, { remove }) {
    const disabled = names(this.getAttr(element, 'disabled'));
    const hidden = names(this.getAttr(element, 'hidden'));
    for (const item of menu.querySelectorAll(`[${this._getSelector()}-item]`)) {
      const name = this.getAttr(item, 'item');
      if (hidden.includes(name)) {
        if (remove) item.remove();
        else item.hidden = true;
      } else if (!remove) {
        item.hidden = false;
      }
      if (disabled.includes(name)) {
        if ('disabled' in item) item.disabled = true;
        else item.setAttribute('aria-disabled', 'true');
      }
    }
  }

  /**
   * The trigger's data-dropdown-param-<name> attributes, by name
   *
   * @returns {Record<string, string>}
   */
  _params(element) {
    const params = this._parseParams(this.getAttr(element, 'params'));
    const prefix = `${this._getSelector()}-${PARAM}`;
    for (const { name, value } of element.attributes) {
      if (name.startsWith(prefix)) params[name.slice(prefix.length)] = value;
    }
    return params;
  }

  /**
   * The params in one attribute: JSON, or the looser `{id: 1, name: Ada}` -- key:value pairs
   * separated by commas, braces and quotes optional -- every value a string
   *
   * @param {string|null} text
   * @returns {Record<string, string>}
   */
  _parseParams(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return {};
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, String(value)])
        );
      } catch {
        /* Not JSON: read as pairs */
      }
    }
    const params = {};
    for (const pair of trimmed.replace(/^\{|\}$/g, '').split(',')) {
      const at = pair.indexOf(':');
      if (at === -1) continue;
      const key = pair
        .slice(0, at)
        .trim()
        .replace(/^["']|["']$/g, '');
      const value = pair
        .slice(at + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (key) params[key] = value;
    }
    return params;
  }

  /**
   * Put every {name} in the fragment's text and attribute values to its param, as text: a value
   * is written into a text node or an attribute, never parsed, so it cannot bring markup with it
   */
  _fill(root, params) {
    const fill = text =>
      text.replace(/\{([\w-]+)\}/g, (match, key) => (key in params ? params[key] : match));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.data.includes('{')) node.data = fill(node.data);
      } else {
        for (const attribute of [...node.attributes]) {
          if (!attribute.value.includes('{')) continue;
          const filled = fill(attribute.value);
          if (!BOOLEAN.has(attribute.name)) {
            attribute.value = filled;
          } else if (FALSE.has(filled.trim().toLowerCase()) || /\{[\w-]+\}/.test(filled)) {
            /* A boolean attribute is its presence: an empty, false or unfilled value takes it away */
            node.removeAttribute(attribute.name);
          } else {
            attribute.value = '';
          }
        }
      }
    }
  }

  show(element) {
    super.show(element);
    const state = this.getState(element);
    const target = state?.target;
    if (!target || this._open.get(target) !== element) return;

    if (!state.built) this._restrict(element, target, { remove: false });
    this._prepareMenu(target);
    if (state.config.portal && !state.built && target.parentNode !== document.body) {
      state.home = { parent: target.parentNode, next: target.nextSibling };
      document.body.append(target);
    }
    this._position(element, state);
    window.addEventListener('scroll', state.reposition, { capture: true, passive: true });
    window.addEventListener('resize', state.reposition, { passive: true });

    state.menuListeners?.abort();
    state.menuListeners = new AbortController();
    const { signal } = state.menuListeners;
    target.addEventListener('keydown', event => this._onMenuKeydown(element, state, event), {
      signal,
    });
    target.addEventListener('click', event => this._onMenuClick(element, state, event), { signal });
    this._items(target)[0]?.focus({ preventScroll: true });
  }

  hide(element, options) {
    const state = this.getState(element);
    const target = state?.target;
    super.hide(element, options);
    if (!target || this._isTargetOpen(target)) return;

    this._unwatch(state);
    state.menuListeners?.abort();
    state.menuListeners = null;
    whenAnimationsFinish(target).then(() => {
      if (this._isTargetOpen(target)) return;
      this._unplace(target);
      if (state.built === target && !state.config.keep) {
        this._detachTarget(element, state);
        target.remove();
        state.built = null;
      } else if (state.home) {
        state.home.parent.insertBefore(target, state.home.next);
        state.home = null;
      }
    });
  }

  _unwatch(state) {
    window.removeEventListener('scroll', state.reposition, { capture: true });
    window.removeEventListener('resize', state.reposition);
  }

  /** The menu's items, in document order */
  _items(target) {
    return target ? [...target.querySelectorAll(ITEMS)].filter(item => !item.hidden) : [];
  }

  /** The roles a menu needs, where the markup has not given them */
  _prepareMenu(target) {
    if (!target.hasAttribute('role')) target.setAttribute('role', 'menu');
    for (const item of this._items(target)) {
      if (!item.hasAttribute('role')) item.setAttribute('role', 'menuitem');
    }
  }

  /**
   * Put the menu beside the trigger on the side asked for, or the opposite when that one has no
   * room, inside the viewport
   */
  _position(element, state) {
    const { target, config } = state;
    if (!target || target.hidden) return;
    if (config.matchWidth) {
      target.style.minWidth = `${Math.round(element.getBoundingClientRect().width)}px`;
    }
    const { side, left, top } = placeBeside(
      element.getBoundingClientRect(),
      { width: target.offsetWidth, height: target.offsetHeight },
      { placement: config.placement, offset: config.offset, margin: MARGIN }
    );
    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
    this.setAttr(target, 'side', side);
  }

  _unplace(target) {
    target.style.left = '';
    target.style.top = '';
    target.style.minWidth = '';
    this.removeAttr(target, 'side');
  }

  _onMenuKeydown(element, state, event) {
    const items = this._items(state.target);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    const go = index => {
      event.preventDefault();
      items.at(index % items.length)?.focus({ preventScroll: true });
    };
    switch (event.key) {
      case 'ArrowDown':
        return go(current + 1);
      case 'ArrowUp':
        return go(current <= 0 ? -1 : current - 1);
      case 'Home':
        return go(0);
      case 'End':
        return go(-1);
      case 'Tab':
        return this.hide(element, { returnFocus: false });
      default:
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const letter = event.key.toLowerCase();
      const order = [...items.slice(current + 1), ...items.slice(0, current + 1)];
      const match = order.find(item => item.textContent.trim().toLowerCase().startsWith(letter));
      if (match) {
        event.preventDefault();
        match.focus({ preventScroll: true });
      }
    }
  }

  /** An item was chosen: say so, then close unless the item or the menu says to stay */
  _onMenuClick(element, state, event) {
    const { target } = state;
    const item = event.target.closest(ITEMS);
    if (!item || !target.contains(item)) return;
    this._dispatch(element, 'dropdown:select', {
      item,
      params: { ...state.params },
      target,
      trigger: element,
      timestamp: performance.now(),
    });
    if (this.hasAttr(item, 'stay') || this.hasAttr(target, 'stay')) return;
    this.hide(element, { returnFocus: !item.matches('a[href]') });
  }

  /**
   * Mount on every matching element without the framework
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {Dropdown}
   */
  static enhanceAll(selector = '[data-dropdown]', options) {
    const instance = new Dropdown(options);
    for (const element of document.querySelectorAll(selector)) instance.mount(element);
    return instance;
  }
}
