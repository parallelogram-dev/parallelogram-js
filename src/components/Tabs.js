import { BaseComponent } from '@peptolab/parallelogram';
/**
 * Tabs Component
 *
 * Progressive enhancement for tab navigation with accessibility and keyboard support.
 * Works with existing HTML structure and enhances it with tab functionality.
 *
 * @example
 * HTML:
 * <div data-tabs>
 *   <div data-tabs-list>
 *     <button data-tab="panel-1" aria-selected="true">Tab 1</button>
 *     <button data-tab="panel-2">Tab 2</button>
 *     <button data-tab="panel-3">Tab 3</button>
 *   </div>
 *   <div data-tabs-panels>
 *     <div id="panel-1" data-tab-panel>Panel 1 content</div>
 *     <div id="panel-2" data-tab-panel style="display: none;">Panel 2 content</div>
 *     <div id="panel-3" data-tab-panel style="display: none;">Panel 3 content</div>
 *   </div>
 * </div>
 *
 * JavaScript (standalone):
 * import { Tabs } from './components/Tabs.js';
 * const tabs = new Tabs();
 * document.querySelectorAll('[data-tabs]')
 *   .forEach(container => tabs.mount(container));
 */
export default class Tabs extends BaseComponent {
  /**
   * Default configuration for tabs component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      activeClass: 'tab--active',
      panelActiveClass: 'tab-panel--active',
      defaultTab: null, // If null, uses first tab or aria-selected="true"
      keyboardNavigation: true,
      autoFocus: false,
      transitionDuration: 200,
      transitionClass: 'tab-panel--transitioning',
    };
  }

  /**
   * Initialize the tabs functionality on a container element
   * @param {HTMLElement} element - Container element with data-tabs attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Find tab elements
    const tabsList = element.querySelector('[data-tabs-list]');
    const tabsContainer = element.querySelector('[data-tabs-panels]');

    if (!tabsList || !tabsContainer) {
      this.logger?.warn(
        'Tabs: Missing required elements (data-tabs-list or data-tabs-panels)',
        element
      );
      return state;
    }

    const tabs = [...tabsList.querySelectorAll('[data-tab]')];
    const panels = [...tabsContainer.querySelectorAll('[data-tab-panel]')];

    if (tabs.length === 0 || panels.length === 0) {
      this.logger?.warn('Tabs: No tabs or panels found', element);
      return state;
    }

    // Get configuration from data attributes
    const defaultTab = this._getDataAttr(element, 'tabs-default-tab', Tabs.defaults.defaultTab);
    const keyboardNav = this._getDataAttr(
      element,
      'tabs-keyboard',
      Tabs.defaults.keyboardNavigation
    );
    const autoFocus = this._getDataAttr(element, 'tabs-autofocus', Tabs.defaults.autoFocus);

    // Store elements and config in state
    state.tabsList = tabsList;
    state.tabsContainer = tabsContainer;
    state.tabs = tabs;
    state.panels = panels;
    state.activeTab = null;
    state.activePanel = null;
    state.keyboardNavigation = keyboardNav;
    state.autoFocus = autoFocus;

    // Setup tabs
    this._setupTabs(element, state);

    // Set initial active tab
    const initialTab = this._getInitialTab(tabs, defaultTab);
    if (initialTab) {
      this._activateTab(element, initialTab.dataset.tab, state, false); // false = no animation on init
    }

    // Setup event listeners
    this._setupEventListeners(element, state);

    // Mark as enhanced
    element.setAttribute('data-tabs-enhanced', 'true');
    element.classList.add('tabs--enhanced');

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this._removeEventListeners(element, state);
      element.removeAttribute('data-tabs-enhanced');
      element.classList.remove('tabs--enhanced');
      originalCleanup();
    };

    this.eventBus?.emit('tabs:mount', {
      element,
      tabCount: tabs.length,
      panelCount: panels.length,
      timestamp: performance.now(),
    });

    this.logger?.info('Tabs initialized', {
      element,
      tabCount: tabs.length,
      panelCount: panels.length,
    });

    return state;
  }

  /**
   * Setup accessibility attributes and IDs for tabs
   */
  _setupTabs(element, state) {
    state.tabs.forEach((tab, index) => {
      // Setup tab attributes
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', '-1');

      // Generate IDs if needed
      if (!tab.id) {
        tab.id = `tab-${Math.random().toString(36).slice(2)}`;
      }

      // Find corresponding panel
      const panelId = tab.dataset.tab;
      const panel = state.panels.find(p => p.id === panelId);

      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.setAttribute('tabindex', '0');
      }
    });

    // Setup tab list
    state.tabsList.setAttribute('role', 'tablist');
  }

  /**
   * Determine which tab should be active initially
   */
  _getInitialTab(tabs, defaultTab) {
    // Check for explicitly selected tab
    const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (selectedTab) return selectedTab;

    // Check for default tab by ID
    if (defaultTab) {
      const defaultTabElement = tabs.find(tab => tab.dataset.tab === defaultTab);
      if (defaultTabElement) return defaultTabElement;
    }

    // Fall back to first tab
    return tabs[0];
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners(element, state) {
    // Click handlers for tabs
    state.clickHandlers = new Map();
    state.keydownHandlers = new Map();

    state.tabs.forEach(tab => {
      const clickHandler = event => this._handleTabClick(event, element, state);
      const keydownHandler = event => this._handleKeyDown(event, element, state);

      tab.addEventListener('click', clickHandler);
      if (state.keyboardNavigation) {
        tab.addEventListener('keydown', keydownHandler);
      }

      state.clickHandlers.set(tab, clickHandler);
      state.keydownHandlers.set(tab, keydownHandler);
    });
  }

  /**
   * Remove event listeners
   */
  _removeEventListeners(element, state) {
    if (state.clickHandlers) {
      state.clickHandlers.forEach((handler, tab) => {
        tab.removeEventListener('click', handler);
      });
    }

    if (state.keydownHandlers) {
      state.keydownHandlers.forEach((handler, tab) => {
        tab.removeEventListener('keydown', handler);
      });
    }
  }

  /**
   * Handle tab click events
   */
  _handleTabClick(event, element, state) {
    event.preventDefault();
    const tab = event.currentTarget;
    const panelId = tab.dataset.tab;

    if (panelId && panelId !== state.activeTab) {
      this._activateTab(element, panelId, state, true);
    }
  }

  /**
   * Handle keyboard navigation
   */
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
      case ' ':
        event.preventDefault();
        const panelId = event.currentTarget.dataset.tab;
        this._activateTab(element, panelId, state, true);
        return;
    }

    if (targetIndex >= 0) {
      const targetTab = state.tabs[targetIndex];
      if (state.autoFocus) {
        targetTab.focus();
      }
      this._activateTab(element, targetTab.dataset.tab, state, true);
    }
  }

  /**
   * Activate a specific tab and show its panel
   */
  async _activateTab(element, panelId, state, animate = true) {
    const targetTab = state.tabs.find(tab => tab.dataset.tab === panelId);
    const targetPanel = state.panels.find(panel => panel.id === panelId);

    if (!targetTab || !targetPanel) {
      this.logger?.warn('Tabs: Invalid tab or panel ID', { panelId, element });
      return;
    }

    const previousTab = state.activeTab;
    const previousPanel = state.activePanel;

    // Update tab states
    state.tabs.forEach(tab => {
      const isActive = tab.dataset.tab === panelId;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
      tab.classList.toggle(Tabs.defaults.activeClass, isActive);
    });

    // Handle panel transition
    if (animate && previousPanel && previousPanel !== targetPanel) {
      await this._transitionPanels(previousPanel, targetPanel, state);
    } else {
      // Simple show/hide without animation
      state.panels.forEach(panel => {
        const shouldShow = panel.id === panelId;
        panel.style.display = shouldShow ? '' : 'none';
        panel.classList.toggle(Tabs.defaults.panelActiveClass, shouldShow);
      });
    }

    // Update state
    state.activeTab = panelId;
    state.activePanel = targetPanel;

    // Focus management
    if (state.autoFocus) {
      targetTab.focus();
    }

    // Dispatch events
    this._dispatch(element, 'tabs:change', {
      activeTab: panelId,
      previousTab,
      tab: targetTab,
      panel: targetPanel,
    });

    this.eventBus?.emit('tabs:change', {
      element,
      activeTab: panelId,
      previousTab,
      tab: targetTab,
      panel: targetPanel,
      timestamp: performance.now(),
    });

    this.logger?.debug('Tab activated', { panelId, previousTab });
  }

  /**
   * Transition between panels with animation support
   */
  async _transitionPanels(fromPanel, toPanel, state) {
    const duration = Tabs.defaults.transitionDuration;

    // Add transition class
    fromPanel.classList.add(Tabs.defaults.transitionClass);
    toPanel.classList.add(Tabs.defaults.transitionClass);

    // Show target panel
    toPanel.style.display = '';
    toPanel.classList.add(Tabs.defaults.panelActiveClass);

    // Transition out current panel
    fromPanel.style.opacity = '0';

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, duration / 2));

    // Hide previous panel
    fromPanel.style.display = 'none';
    fromPanel.classList.remove(Tabs.defaults.panelActiveClass);
    fromPanel.style.opacity = '';

    // Transition in new panel
    toPanel.style.opacity = '0';
    requestAnimationFrame(() => {
      toPanel.style.transition = `opacity ${duration}ms ease-in-out`;
      toPanel.style.opacity = '1';
    });

    // Cleanup after transition
    setTimeout(() => {
      toPanel.style.transition = '';
      toPanel.style.opacity = '';
      fromPanel.classList.remove(Tabs.defaults.transitionClass);
      toPanel.classList.remove(Tabs.defaults.transitionClass);
    }, duration);
  }

  /**
   * Programmatically activate a tab
   * @param {HTMLElement} element - Tabs container
   * @param {string} panelId - ID of panel to activate
   */
  activateTab(element, panelId) {
    const state = this.getState(element);
    if (state) {
      this._activateTab(element, panelId, state, true);
    }
  }

  /**
   * Get the currently active tab
   * @param {HTMLElement} element - Tabs container
   * @returns {string|null} Active panel ID
   */
  getActiveTab(element) {
    const state = this.getState(element);
    return state ? state.activeTab : null;
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const containers = document.querySelectorAll('[data-tabs-enhanced="true"]');
    let totalTabs = 0;
    let totalPanels = 0;

    containers.forEach(container => {
      const state = this.getState(container);
      if (state) {
        totalTabs += state.tabs.length;
        totalPanels += state.panels.length;
      }
    });

    return {
      containers: containers.length,
      totalTabs,
      totalPanels,
      keyboardNavigationSupported: true,
      defaults: Tabs.defaults,
    };
  }

  /**
   * Enhance all tabs containers on the page
   * @param {string} selector - CSS selector for tabs containers
   * @param {Object} options - Component options
   * @returns {Tabs} Component instance
   */
  static enhanceAll(selector = '[data-tabs]', options) {
    const instance = new Tabs(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}
