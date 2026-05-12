function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */


/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
class Tabs extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-tabs';
  }

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
    const defaultTab = this.getAttr(element, 'default-tab', Tabs.defaults.defaultTab);
    const keyboardNav = this.getAttr(
      element,
      'keyboard',
      Tabs.defaults.keyboardNavigation
    );
    const autoFocus = this.getAttr(element, 'autofocus', Tabs.defaults.autoFocus);

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
    this.setAttr(element, 'enhanced', 'true');
    element.classList.add('tabs--enhanced');

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this._removeEventListeners(element, state);
      this.removeAttr(element, 'enhanced');
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
        tab.id = generateId('tab');
      }

      // Find corresponding panel
      const panelId = tab.dataset.tab;
      const panel = state.panels.find(p => p.id === panelId);

      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.setAttribute('tabindex', '0');
        /* Initialize panel with inactive state */
        if (!panel.getAttribute('data-tab-panel')) {
          panel.setAttribute('data-tab-panel', 'inactive');
        }
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

    /* Update tab states */
    state.tabs.forEach(tab => {
      const isActive = tab.dataset.tab === panelId;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    /* Handle panel transition */
    if (animate && previousPanel && previousPanel !== targetPanel) {
      await this._transitionPanels(previousPanel, targetPanel, state);
    } else {
      /* Simple show/hide without animation */
      state.panels.forEach(panel => {
        const shouldShow = panel.id === panelId;
        panel.style.display = shouldShow ? '' : 'none';
        panel.setAttribute('data-tab-panel', shouldShow ? 'active' : 'inactive');
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

    /* Set transitioning state */
    fromPanel.setAttribute('data-tab-panel', 'transitioning');
    toPanel.setAttribute('data-tab-panel', 'transitioning');

    /* Show target panel */
    toPanel.style.display = '';

    /* Transition out current panel */
    fromPanel.style.opacity = '0';

    /* Wait for transition */
    await new Promise(resolve => setTimeout(resolve, duration / 2));

    /* Hide previous panel */
    fromPanel.style.display = 'none';
    fromPanel.setAttribute('data-tab-panel', 'inactive');
    fromPanel.style.opacity = '';

    /* Transition in new panel */
    toPanel.style.opacity = '0';
    requestAnimationFrame(() => {
      toPanel.style.transition = `opacity ${duration}ms ease-in-out`;
      toPanel.style.opacity = '1';
    });

    /* Cleanup after transition */
    setTimeout(() => {
      toPanel.style.transition = '';
      toPanel.style.opacity = '';
      toPanel.setAttribute('data-tab-panel', 'active');
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
    const containers = document.querySelectorAll('[data-tabs]');
    const enhancedContainers = [];
    let totalTabs = 0;
    let totalPanels = 0;

    containers.forEach(container => {
      const state = this.getState(container);
      if (state && this.hasAttr(container, 'enhanced')) {
        enhancedContainers.push(container);
        totalTabs += state.tabs.length;
        totalPanels += state.panels.length;
      }
    });

    return {
      containers: enhancedContainers.length,
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

export { Tabs as default };
