import { BaseComponent } from '../core/BaseComponent.js';
import { generateId } from '../utils/dom-utils.js';
import { whenAnimationsFinish } from '../utils/motion.js';

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** Attributes Tabs adds or changes on the list, tabs and panels, put back when it unmounts */
const MANAGED_ATTRIBUTES = [
  'id',
  'role',
  'type',
  'tabindex',
  'hidden',
  'aria-selected',
  'aria-controls',
  'aria-labelledby',
  'aria-orientation',
  'data-tab-panel',
];

/**
 * Tabs - tabbed panels built from a list of tab buttons or in-page links
 *
 * Without JavaScript the panels are ordinary stacked sections, and links used as tabs jump to them.
 * While scripts are enabled but Tabs hasn't loaded yet, the shipped stylesheet shows only the first
 * panel, or the one the markup marks `data-tab-panel="active"`, so the page doesn't jump when it does. Once mounted, Tabs follows the WAI-ARIA tabs
 * pattern: arrow keys, Home and End move focus between tabs, inactive panels get the `hidden`
 * attribute, and a newly chosen panel fades in unless the user prefers reduced motion. Unmounting
 * puts the markup back as it was.
 *
 * Deep links keep working: when the address names a panel, or an element inside one, Tabs selects
 * that panel's tab when it mounts and whenever the hash changes, ahead of `aria-selected` and the
 * default tab. Choosing a tab doesn't change the address.
 *
 * @example
 * <div data-tabs>
 *   <div data-tabs-list>
 *     <a href="#shipping" data-tab="shipping">Shipping</a>
 *     <a href="#returns" data-tab="returns">Returns</a>
 *   </div>
 *   <div data-tabs-panels>
 *     <section id="shipping" data-tab-panel><h3>Shipping</h3>…</section>
 *     <section id="returns" data-tab-panel><h3>Returns</h3>…</section>
 *   </div>
 * </div>
 *
 * @attributes
 * - data-tabs: on the container; Tabs adds data-tabs-enhanced and the tabs--enhanced class
 * - data-tabs-list: the element that holds the tabs; Tabs gives it aria-orientation="horizontal"
 *   unless it has one, and the Up and Down arrow keys move between tabs only when it is "vertical"
 * - data-tab: on each tab button or link, the id of its panel
 * - data-tabs-panels: the element that holds the panels
 * - data-tab-panel: on each panel; Tabs sets it to active, entering or inactive. Write active on the
 *   panel that starts selected to show it first, before and after Tabs loads, when no tab has
 *   aria-selected="true"
 * - data-tabs-default-tab: id of the panel to show first when the address names no panel and no tab
 *   has aria-selected="true"
 * - data-tabs-keyboard: "false" turns off arrow key, Home and End navigation (default true)
 * - data-tabs-activation: auto selects a tab when it receives focus, manual selects it on Enter or
 *   Space (default auto)
 *
 * @events
 * - tabs:change: with `{ activeTab, previousTab, tab, panel }`
 *
 * @cssprop --tabs-transition-duration - length of the panel fade and tab colour changes (default 0.2s)
 * @cssprop --tabs-color, --tabs-hover-color, --tabs-hover-bg - tab text and hover colours
 * @cssprop --tabs-selected-color, --tabs-selected-bg - the chosen tab's text, underline and background
 * @cssprop --tabs-border-color - the line under the tab list
 */
export default class Tabs extends BaseComponent {
  static selector = 'data-tabs';

  static get defaults() {
    return {
      defaultTab: null,
      keyboardNavigation: true,
      activation: 'auto',
    };
  }

  _init(element) {
    const state = super._init(element);
    const { defaults } = this.constructor;

    const tabsList = element.querySelector('[data-tabs-list]');
    const tabsContainer = element.querySelector('[data-tabs-panels]');

    if (!tabsList || !tabsContainer) {
      this.logger?.warn(
        'Tabs: Missing required elements (data-tabs-list or data-tabs-panels)',
        element
      );
      return state;
    }

    /* A tab set nested inside a panel keeps its own tabs and panels */
    const tabs = [...tabsList.querySelectorAll('[data-tab]')].filter(
      tab => tab.closest('[data-tabs-list]') === tabsList
    );
    const panels = [...tabsContainer.querySelectorAll('[data-tab-panel]')].filter(
      panel => panel.closest('[data-tabs-panels]') === tabsContainer
    );

    if (tabs.length === 0 || panels.length === 0) {
      this.logger?.warn('Tabs: No tabs or panels found', element);
      return state;
    }

    state.tabsList = tabsList;
    state.tabsContainer = tabsContainer;
    state.tabs = tabs;
    state.panels = panels;
    state.activeTab = null;
    state.activePanel = null;
    state.transition = null;
    state.keyboardNavigation = this.getBoolAttr(element, 'keyboard', defaults.keyboardNavigation);
    state.activation =
      this.getAttr(element, 'activation', defaults.activation) === 'manual' ? 'manual' : 'auto';
    state.original = this._remember([tabsList, ...tabs, ...panels]);
    state.originalClass = element.getAttribute('class');

    this._setupTabs(state);

    const defaultTab = this.getAttr(element, 'default-tab', defaults.defaultTab);
    const linkedTab = this._getLinkedTab(state);
    const initialTab = linkedTab ?? this._getInitialTab(tabs, defaultTab, panels);
    if (initialTab) {
      this._activateTab(element, initialTab.dataset.tab, state, false);
    }
    /* The browser couldn't scroll to a target in a hidden panel. Scroll now, unless the page has
       already been scrolled, as when a reload restores its position. */
    if (linkedTab && window.scrollX === 0 && window.scrollY === 0) {
      this._hashTarget()?.scrollIntoView({ block: 'start' });
    }

    const { signal } = state.controller;
    window.addEventListener('hashchange', () => this._handleHashChange(element, state), { signal });
    for (const tab of tabs) {
      tab.addEventListener('click', event => this._handleTabClick(event, element, state), {
        signal,
      });
      if (state.keyboardNavigation) {
        tab.addEventListener('keydown', event => this._handleKeyDown(event, element, state), {
          signal,
        });
      }
    }

    this.setAttr(element, 'enhanced', 'true');
    element.classList.add('tabs--enhanced');

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      baseCleanup();
      state.transition = null;
      this._restore(state.original);
      this.removeAttr(element, 'enhanced');
      element.classList.remove('tabs--enhanced');
      if (state.originalClass === null && element.classList.length === 0) {
        element.removeAttribute('class');
      }
    };

    this.eventBus?.emit('tabs:mount', {
      element,
      tabCount: tabs.length,
      panelCount: panels.length,
      timestamp: performance.now(),
    });

    return state;
  }

  /**
   * Record the managed attributes of each element as they were before Tabs changed them
   *
   * @returns {Map<Element, Map<string, string|null>>}
   */
  _remember(elements) {
    return new Map(
      elements.map(element => [
        element,
        new Map(MANAGED_ATTRIBUTES.map(name => [name, element.getAttribute(name)])),
      ])
    );
  }

  _restore(original) {
    for (const [element, attributes] of original) {
      for (const [name, value] of attributes) {
        if (value === null) {
          element.removeAttribute(name);
        } else {
          element.setAttribute(name, value);
        }
      }
    }
  }

  /**
   * Add the tab, tab list and panel roles, and link each tab to its panel
   */
  _setupTabs(state) {
    state.tabs.forEach(tab => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', '-1');
      if (tab.tagName === 'BUTTON' && !tab.hasAttribute('type')) {
        tab.type = 'button';
      }
      if (!tab.id) {
        tab.id = generateId('tab');
      }

      const panel = state.panels.find(candidate => candidate.id === tab.dataset.tab);
      if (panel) {
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        /* Panels with focusable content are reached through that content instead */
        if (!panel.querySelector(FOCUSABLE)) {
          panel.setAttribute('tabindex', '0');
        }
      }
    });

    state.tabsList.setAttribute('role', 'tablist');
    if (!state.tabsList.hasAttribute('aria-orientation')) {
      state.tabsList.setAttribute('aria-orientation', 'horizontal');
    }
  }

  /**
   * Determine which tab should be active initially
   */
  _getInitialTab(tabs, defaultTab, panels = []) {
    const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (selectedTab) return selectedTab;

    const activePanel = panels.find(panel => panel.getAttribute('data-tab-panel') === 'active');
    const activeTab = activePanel && tabs.find(tab => tab.dataset.tab === activePanel.id);
    if (activeTab) return activeTab;

    if (defaultTab) {
      const defaultTabElement = tabs.find(tab => tab.dataset.tab === defaultTab);
      if (defaultTabElement) return defaultTabElement;
    }

    return tabs[0];
  }

  /**
   * Find the tab whose panel is, or holds, the element the address's hash names
   *
   * @returns {HTMLElement|null}
   */
  _getLinkedTab(state) {
    const target = this._hashTarget();
    const panel = target && state.panels.find(candidate => candidate.contains(target));
    return panel ? (state.tabs.find(tab => tab.dataset.tab === panel.id) ?? null) : null;
  }

  /**
   * The element the address's hash names, or null
   *
   * @returns {HTMLElement|null}
   */
  _hashTarget() {
    try {
      const id = decodeURIComponent(location.hash.slice(1));
      return id ? document.getElementById(id) : null;
    } catch {
      return null;
    }
  }

  /**
   * Select the tab the new hash links to and scroll to its target, moving focus with the selection
   * only if the old tab had it
   */
  _handleHashChange(element, state) {
    const tab = this._getLinkedTab(state);
    if (!tab || tab.dataset.tab === state.activeTab) return;

    const oldTab = state.tabs.find(candidate => candidate.dataset.tab === state.activeTab);
    const hadFocus = Boolean(oldTab) && document.activeElement === oldTab;
    this._activateTab(element, tab.dataset.tab, state, true);
    if (hadFocus) tab.focus({ preventScroll: true });
    this._hashTarget()?.scrollIntoView({ block: 'start' });
  }

  _handleTabClick(event, element, state) {
    event.preventDefault();
    const panelId = event.currentTarget.dataset.tab;

    if (panelId && panelId !== state.activeTab) {
      this._activateTab(element, panelId, state, true);
    }
  }

  _handleKeyDown(event, element, state) {
    const currentIndex = state.tabs.findIndex(tab => tab === event.currentTarget);
    let targetIndex = -1;

    /* Up and Down only move between tabs stacked vertically, and scroll the page otherwise */
    const upOrDown = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    if (upOrDown && state.tabsList.getAttribute('aria-orientation') !== 'vertical') return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % state.tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        targetIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        targetIndex = state.tabs.length - 1;
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const panelId = event.currentTarget.dataset.tab;
        if (panelId !== state.activeTab) {
          this._activateTab(element, panelId, state, true);
        }
        return;
      }
    }

    if (targetIndex >= 0) {
      const targetTab = state.tabs[targetIndex];
      targetTab.focus();
      if (state.activation === 'auto' && targetTab.dataset.tab !== state.activeTab) {
        this._activateTab(element, targetTab.dataset.tab, state, true);
      }
    }
  }

  /**
   * Select a tab and show its panel
   *
   * The selection, ARIA attributes and hidden panels all change straight away, so a quick second
   * choice always starts from the first. The new panel is marked `entering` while its fade-in runs,
   * and a later choice stops an earlier panel from being marked active.
   */
  _activateTab(element, panelId, state, animate = true) {
    const targetTab = state.tabs.find(tab => tab.dataset.tab === panelId);
    const targetPanel = state.panels.find(panel => panel.id === panelId);

    if (!targetTab || !targetPanel) {
      this.logger?.warn('Tabs: Invalid tab or panel ID', { panelId, element });
      return;
    }

    const previousTab = state.activeTab;
    const previousPanel = state.activePanel;
    state.activeTab = panelId;
    state.activePanel = targetPanel;

    for (const tab of state.tabs) {
      const isActive = tab === targetTab;
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    }

    for (const panel of state.panels) {
      if (panel !== targetPanel) {
        panel.hidden = true;
        panel.setAttribute('data-tab-panel', 'inactive');
      }
    }
    targetPanel.hidden = false;

    const transition = {};
    state.transition = transition;

    if (animate && previousPanel && previousPanel !== targetPanel) {
      targetPanel.setAttribute('data-tab-panel', 'entering');
      whenAnimationsFinish(targetPanel).then(() => {
        if (state.transition === transition) {
          targetPanel.setAttribute('data-tab-panel', 'active');
        }
      });
    } else {
      targetPanel.setAttribute('data-tab-panel', 'active');
    }

    this._dispatch(element, 'tabs:change', {
      activeTab: panelId,
      previousTab,
      tab: targetTab,
      panel: targetPanel,
      timestamp: performance.now(),
    });
  }

  /**
   * Programmatically activate a tab
   * @param {HTMLElement} element - Tabs container
   * @param {string} panelId - ID of panel to activate
   */
  activateTab(element, panelId) {
    const state = this.getState(element);
    if (state?.tabs) {
      this._activateTab(element, panelId, state, true);
    }
  }

  /**
   * Get the currently active tab
   * @param {HTMLElement} element - Tabs container
   * @returns {string|null} Active panel ID
   */
  getActiveTab(element) {
    return this.getState(element)?.activeTab ?? null;
  }

  getStatus() {
    const states = this.trackedElements()
      .map(container => this.getState(container))
      .filter(state => state?.tabs);

    return {
      containers: states.length,
      totalTabs: states.reduce((total, state) => total + state.tabs.length, 0),
      totalPanels: states.reduce((total, state) => total + state.panels.length, 0),
      keyboardNavigationSupported: true,
      defaults: this.constructor.defaults,
    };
  }

  static enhanceAll(selector = '[data-tabs]', options) {
    const instance = new Tabs(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
