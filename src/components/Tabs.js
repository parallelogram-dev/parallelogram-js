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
  'data-tab-panel',
];

/**
 * Tabs - tabbed panels built from a list of tab buttons or in-page links
 *
 * Without JavaScript the panels are ordinary stacked sections, and links used as tabs jump to them.
 * While scripts are enabled but Tabs hasn't loaded yet, the shipped stylesheet shows only the first
 * panel, so the page doesn't jump when it does. Once mounted, Tabs follows the WAI-ARIA tabs
 * pattern: arrow keys, Home and End move focus between tabs, inactive panels get the `hidden`
 * attribute, and a newly chosen panel fades in unless the user prefers reduced motion. Unmounting
 * puts the markup back as it was.
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
 * - data-tabs-list: the element that holds the tabs
 * - data-tab: on each tab button or link, the id of its panel
 * - data-tabs-panels: the element that holds the panels
 * - data-tab-panel: on each panel; Tabs sets it to active, entering or inactive
 * - data-tabs-default-tab: id of the panel to show first when no tab has aria-selected="true"
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
    state.keyboardNavigation = this.getBoolAttr(
      element,
      'keyboard',
      Tabs.defaults.keyboardNavigation
    );
    state.activation =
      this.getAttr(element, 'activation', Tabs.defaults.activation) === 'manual'
        ? 'manual'
        : 'auto';
    state.original = this._remember([tabsList, ...tabs, ...panels]);
    state.originalClass = element.getAttribute('class');

    this._setupTabs(state);

    const defaultTab = this.getAttr(element, 'default-tab', Tabs.defaults.defaultTab);
    const initialTab = this._getInitialTab(tabs, defaultTab);
    if (initialTab) {
      this._activateTab(element, initialTab.dataset.tab, state, false);
    }

    const { signal } = state.controller;
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
  }

  /**
   * Determine which tab should be active initially
   */
  _getInitialTab(tabs, defaultTab) {
    const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (selectedTab) return selectedTab;

    if (defaultTab) {
      const defaultTabElement = tabs.find(tab => tab.dataset.tab === defaultTab);
      if (defaultTabElement) return defaultTabElement;
    }

    return tabs[0];
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
      defaults: Tabs.defaults,
    };
  }

  static enhanceAll(selector = '[data-tabs]', options) {
    const instance = new Tabs(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
