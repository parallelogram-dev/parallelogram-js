import { ComponentHost } from '../core/ComponentHost.js';

/**
 * PageManager - Enhanced page lifecycle and component management
 * Handles fragment replacement and delegates component loading, mounting and DOM
 * observation to a ComponentHost (available as `pageManager.host`).
 */
export class PageManager {
  constructor({ containerSelector, registry, eventBus, logger, router, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    this.containerSelector = containerSelector;
    this.registry = registry;

    // Configuration options
    this.options = {
      // Delay before mounting non-critical components after a fragment swap
      mountDelay: 1200,
      scrollPosition: 'top', // 'top', 'preserve', 'element'
      scrollElement: null,
      // Component loading
      retryFailedLoads: true,
      maxRetryAttempts: 3,
      // Element or selector whose subtree components mount in and are observed (defaults to the container)
      observeRoot: null,
      // Debug
      trackPerformance: false,
      // Fragment target groups - define which fragments update together
      targetGroups: {
        main: ['main', 'menubar', 'breadcrumb'], // When 'main' is requested, also update nav and breadcrumbs
        panel: ['panel'], // When 'panel' is requested, only update that
        sidebar: ['sidebar', 'toolbar'], // Sidebar updates might also update related toolbar
        modal: ['modal'], // Modal content standalone
      },
      ...options,
    };

    this.host = new ComponentHost({
      registry: registry ?? [],
      eventBus,
      logger,
      router,
      maxRetryAttempts: this.options.retryFailedLoads ? this.options.maxRetryAttempts : 0,
    });

    // Performance tracking
    this.performanceMetrics = {
      fragmentReplacements: 0,
      componentMounts: 0,
      componentUnmounts: 0,
      totalMountTime: 0,
      averageMountTime: 0,
    };

    // Session-persistent component tracking
    this.sessionTracking = {
      componentsLoaded: new Set(), // Components that have been loaded this session
      loadHistory: [], // History of component loads with timestamps
      mountCount: new Map(), // Total mount count per component
      lastMountTime: new Map(), // Last mount time per component
    };

    this._initialize();
  }

  /**
   * Initialize the PageManager with event listeners
   */
  _initialize() {
    this._listeners = new AbortController();

    this.logger?.info('PageManager initializing', {
      containerSelector: this.containerSelector,
      registrySize: this.registry.length,
    });

    // Router event handlers
    this._subscribe(
      'router:navigate-success',
      ({ html, url, trigger, viewTarget, viewTargets, waitUntil }) => {
        const fromPopstate = trigger === 'popstate';
        const swap = this.replaceFragments(html, {
          fromNavigation: true,
          fromPopstate,
          url,
          trigger,
          viewTargets: this._resolveTargetGroups(viewTargets || [viewTarget || 'main']),
          preserveScroll: fromPopstate && this.options.scrollPosition === 'preserve',
        });

        if (waitUntil) {
          waitUntil(swap);
        } else {
          /* replaceFragments reports its own failures through page:fragments-replace-error */
          swap.catch(() => {});
        }
      }
    );

    // Component lifecycle events
    this._subscribe('component:lazy-load', ({ element, componentName }) => {
      this._handleLazyLoad(element, componentName);
    });
    this._subscribe('page:component-mounted', () => {
      this.performanceMetrics.componentMounts++;
    });
    this._subscribe('page:component-unmounted', () => {
      this.performanceMetrics.componentUnmounts++;
    });
    this._subscribe('page:component-loaded', ({ componentName }) => {
      this._trackComponentLoad(componentName);
    });

    // Initial component mounting
    this._initialMount();

    this.eventBus.emit('page-manager:initialized', {
      containerSelector: this.containerSelector,
      options: this.options,
    });
  }

  /**
   * Subscribe to an event bus event until this manager is destroyed.
   */
  _subscribe(event, handler) {
    return this.eventBus.on(event, handler, { signal: this._listeners.signal });
  }

  /**
   * Get the container element
   */
  get container() {
    const element = document.querySelector(this.containerSelector);
    if (!element) {
      const error = new Error(`Container not found: ${this.containerSelector}`);
      this.logger?.error('Container element not found', { selector: this.containerSelector });
      throw error;
    }
    return element;
  }

  /**
   * Resolve target groups based on configuration
   */
  _resolveTargetGroups(requestedTargets) {
    const resolved = new Set();

    for (const target of requestedTargets) {
      if (this.options.targetGroups[target]) {
        // Add all targets from the group
        for (const groupTarget of this.options.targetGroups[target]) {
          resolved.add(groupTarget);
        }
        this.logger?.info(
          `Resolved target group '${target}' to:`,
          this.options.targetGroups[target]
        );
      } else {
        // Use the target as-is if no group defined
        resolved.add(target);
        this.logger?.debug(`Using target '${target}' directly (no group defined)`);
      }
    }

    const finalTargets = Array.from(resolved);
    this.logger?.info('Final resolved targets:', finalTargets);

    return finalTargets;
  }

  /**
   * Replace multiple fragments content with enhanced fragment-based targeting
   */
  async replaceFragments(html, options = {}) {
    const {
      fromNavigation = false,
      fromPopstate = false,
      preserveScroll = false,
      url = null,
      trigger = 'unknown',
      viewTargets = ['main'], // Array of fragment targets
    } = options;

    const startTime = this.options.trackPerformance ? performance.now() : 0;

    this.logger?.group('Multiple fragments replacement', {
      fromNavigation,
      fromPopstate,
      preserveScroll,
      url: url?.toString(),
      trigger,
      viewTargets,
    });

    try {
      // Store current scroll position if needed for preservation
      let scrollPosition = null;
      if (preserveScroll) {
        scrollPosition = {
          x: window.scrollX,
          y: window.scrollY,
        };
      }

      // Parse the incoming HTML once
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const replacementResults = [];
      let hasMainContentUpdate = false;

      // Process each target fragment
      for (const viewTarget of viewTargets) {
        try {
          const result = await this._processSingleFragment(doc, viewTarget, html, options);
          replacementResults.push(result);

          if (viewTarget === 'main') {
            hasMainContentUpdate = true;
          }
        } catch (error) {
          this.logger?.error(`Failed to replace fragment ${viewTarget}`, { error });
          replacementResults.push({
            viewTarget,
            success: false,
            error: error.message,
          });
        }
      }

      // Handle scroll restoration and head updates only if main content changed
      if (hasMainContentUpdate) {
        this._handleScrollRestoration(scrollPosition, options);
        this._updateDocumentHead(html);
      }

      // Mount components for all successfully updated fragments
      const successfulTargets = replacementResults.filter(r => r.success);

      for (const result of successfulTargets) {
        // Mount components within the updated fragment
        this.mountAllWithin(result.targetFragment, {
          priority: 'critical',
          fragmentTarget: result.viewTarget,
        });

        // Emit dom:content-loaded for router link enhancement
        this.eventBus.emit('dom:content-loaded', {
          fragment: result.targetFragment,
          viewTarget: result.viewTarget,
          trigger: 'fragment-replacement',
        });

        // Schedule non-critical component mounting
        if (this.options.mountDelay > 0) {
          setTimeout(() => {
            this.mountAllWithin(result.targetFragment, {
              priority: 'normal',
              fragmentTarget: result.viewTarget,
            });
          }, this.options.mountDelay);
        } else {
          this.mountAllWithin(result.targetFragment, {
            priority: 'normal',
            fragmentTarget: result.viewTarget,
          });
        }
      }

      // Update performance metrics
      if (this.options.trackPerformance) {
        const duration = performance.now() - startTime;
        this.performanceMetrics.fragmentReplacements++;
        this.logger?.info('Multiple fragments replacement completed', {
          duration: `${duration.toFixed(2)}ms`,
          targetsProcessed: viewTargets.length,
          successfulReplacements: successfulTargets.length,
          metrics: this.performanceMetrics,
        });
      }

      this.eventBus.emit('page:fragments-replaced', {
        results: replacementResults,
        viewTargets,
        duration: this.options.trackPerformance ? performance.now() - startTime : null,
        options,
      });
    } catch (error) {
      this.logger?.error('Multiple fragments replacement failed', {
        error,
        viewTargets,
        html: html.slice(0, 100),
      });
      this.eventBus.emit('page:fragments-replace-error', {
        viewTargets,
        error,
        options,
      });
      throw error;
    } finally {
      this.logger?.groupEnd();
    }
  }

  /**
   * Process a single fragment replacement with transitions
   */
  async _processSingleFragment(doc, viewTarget, originalHtml, options) {
    // Extract target fragment from parsed HTML and find matching fragment in current document
    const { sourceFragment, targetFragment } = this._extractTargetFragmentFromDoc(doc, viewTarget);

    if (!sourceFragment) {
      throw new Error(`Source fragment with data-view="${viewTarget}" not found in fetched HTML`);
    }

    if (!targetFragment) {
      throw new Error(
        `Target fragment with data-view="${viewTarget}" not found in current document`
      );
    }

    // Get transition configuration for this target
    const transitionConfig = this.options.targetGroupTransitions?.[viewTarget];

    // Emit pre-unmount event
    this.eventBus.emit('page:fragment-will-replace', {
      sourceFragment,
      targetFragment,
      viewTarget,
      html: originalHtml,
      options,
      transitionConfig,
    });

    try {
      // 1. OUT transition (if configured)
      if (transitionConfig?.out) {
        await this._performFragmentTransition(targetFragment, 'out', transitionConfig);
      }

      // 2. Scroll to top immediately after out transition (before content swap)
      // This creates a smoother experience - content fades out, then scroll snaps, then new content fades in
      // Use 'instant' behavior to override any CSS scroll-behavior: smooth on the document
      // Only scroll for the 'main' fragment to avoid scrolling when other fragments (navbar, etc.) are processed
      if (
        viewTarget === 'main' &&
        !options.preserveScroll &&
        this.options.scrollPosition === 'top' &&
        !options.fromPopstate
      ) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }

      // 3. Unmount components only within the target fragment
      this.unmountAllWithin(targetFragment);

      // 3 & 4. Replace content and prepare for IN transition in same frame
      if (transitionConfig?.in) {
        // Set initial state for in-transition before replacing content
        await this._replaceContentWithTransition(targetFragment, sourceFragment, transitionConfig);
      } else {
        // No transition - just replace
        targetFragment.innerHTML = sourceFragment.innerHTML;
        this._copyFragmentAttributes(sourceFragment, targetFragment);
      }

      // Emit post-mount event
      this.eventBus.emit('page:fragment-did-replace', {
        targetFragment,
        viewTarget,
        options,
        transitionConfig,
      });
    } catch (transitionError) {
      this.logger?.error(`Fragment transition failed for ${viewTarget}`, {
        error: transitionError,
        viewTarget,
        transitionConfig,
      });

      // Continue with replacement even if transition fails
      this.unmountAllWithin(targetFragment);
      targetFragment.innerHTML = sourceFragment.innerHTML;
      this._copyFragmentAttributes(sourceFragment, targetFragment);
    }

    return {
      viewTarget,
      success: true,
      sourceFragment,
      targetFragment,
      transitionConfig,
    };
  }

  /**
   * Replace content and start IN transition in same frame to prevent flash
   * @private
   * @param {HTMLElement} targetFragment - Target fragment element
   * @param {HTMLElement} sourceFragment - Source fragment element
   * @param {Object} config - Transition configuration
   */
  async _replaceContentWithTransition(targetFragment, sourceFragment, config) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        /* Replace content and copy attributes */
        targetFragment.innerHTML = sourceFragment.innerHTML;
        this._copyFragmentAttributes(sourceFragment, targetFragment);

        /* Trigger IN transition in same frame */
        this._performFragmentTransition(targetFragment, 'in', config).then(resolve);
      });
    });
  }

  /**
   * Perform fragment transition animation
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} direction - 'in' or 'out'
   * @param {Object} config - Transition configuration
   */
  async _performFragmentTransition(fragment, direction, config) {
    const transitionType = config[direction];
    const duration = config.duration || 300;
    const easing = config.easing || 'ease';

    this.logger?.debug(`Performing ${direction} transition: ${transitionType}`, {
      fragment,
      duration,
      easing,
    });

    try {
      // Check if it's a CSS class-based transition
      if (typeof transitionType === 'string' && !transitionType.includes('(')) {
        /* Pass the out class name to the in transition so it can remove it */
        const outClassName = direction === 'in' ? config.out : null;
        await this._performCSSTransition(
          fragment,
          transitionType,
          duration,
          direction,
          outClassName
        );
      } else {
        // Use TransitionManager or inline styles
        await this._performJSTransition(fragment, direction, config);
      }

      this.eventBus.emit(`page:fragment-transition-${direction}`, {
        fragment,
        viewTarget: fragment.dataset.view,
        transitionType,
        duration,
      });
    } catch (error) {
      this.logger?.warn(`Fragment transition failed`, {
        fragment,
        direction,
        transitionType,
        error,
      });
      throw error;
    }
  }

  /**
   * Perform CSS class-based transition
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} className - CSS class name
   * @param {number} duration - Duration in ms (ignored for CSS transitions)
   * @param {string} direction - 'in' or 'out'
   * @param {string} outClassName - Name of the 'out' class to remove when 'in' starts
   */
  _performCSSTransition(fragment, className, duration, direction = 'in', outClassName = null) {
    return new Promise(resolve => {
      requestAnimationFrame(async () => {
        fragment.classList.add(className);

        /* Remove the 'out' class a frame later so the 'in' class applies first, avoiding a flicker */
        if (direction === 'in' && outClassName) {
          requestAnimationFrame(() => {
            fragment.classList.remove(outClassName);
          });
        }

        await this._whenAnimationsFinish(fragment, duration);

        if (direction === 'in') {
          fragment.classList.remove(className);
        }

        resolve();
      });
    });
  }

  /**
   * Resolve once the element's own CSS animations and transitions have finished
   *
   * Resolves straight away when nothing animates (the class defines no animation, or the element
   * is hidden) and otherwise no later than shortly after the longest animation should end, so an
   * animation that never finishes cannot stall navigation.
   */
  _whenAnimationsFinish(element, duration) {
    const animations = element.getAnimations?.() ?? [];
    if (animations.length === 0) {
      return Promise.resolve();
    }

    const endTimes = animations
      .map(animation => animation.effect?.getComputedTiming().endTime)
      .filter(Number.isFinite);
    const timeout = Math.max(duration, ...endTimes) + 250;

    let timer;
    return Promise.race([
      Promise.allSettled(animations.map(animation => animation.finished)),
      new Promise(resolve => {
        timer = setTimeout(resolve, timeout);
      }),
    ]).then(() => clearTimeout(timer));
  }

  /**
   * Perform JavaScript-based transition
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} direction - 'in' or 'out'
   * @param {Object} config - Transition configuration
   */
  async _performJSTransition(fragment, direction, config) {
    const duration = config.duration || 300;
    const easing = config.easing || 'ease';

    // Apply transition styles
    fragment.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;

    if (direction === 'out') {
      // Fade out with slide
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(-20px)';
    } else {
      // Reset and fade in
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(20px)';

      // Force reflow then animate in
      fragment.getBoundingClientRect();

      fragment.style.opacity = '1';
      fragment.style.transform = 'translateX(0)';
    }

    // Wait for transition to complete
    await new Promise(resolve => {
      setTimeout(() => {
        fragment.style.transition = '';
        if (direction === 'in') {
          fragment.style.opacity = '';
          fragment.style.transform = '';
        }
        resolve();
      }, duration);
    });
  }

  /**
   * Extract target fragment from already parsed document
   */
  _extractTargetFragmentFromDoc(doc, viewTarget) {
    let targetFragment;

    // Find the source fragment in the parsed document
    let sourceFragment = doc.querySelector(`[data-view="${viewTarget}"]`);

    // If not found, try some fallback strategies
    if (!sourceFragment) {
      this.logger?.warn(`Fragment data-view="${viewTarget}" not found, trying fallbacks`);

      // Fallback 1: Try to find by ID (common pattern)
      sourceFragment = doc.querySelector(`#${viewTarget}`);

      // Fallback 2: If viewTarget is 'main', try common main selectors
      if (!sourceFragment && viewTarget === 'main') {
        sourceFragment =
          doc.querySelector('main') ||
          doc.querySelector('[role="main"]') ||
          doc.querySelector('#app') ||
          doc.querySelector('.main-content');
      }

      // Fallback 3: For other targets, try class-based selector
      if (!sourceFragment) {
        sourceFragment = doc.querySelector(`.${viewTarget}`);
      }
    }

    // Find the target fragment in the current document
    targetFragment = document.querySelector(`[data-view="${viewTarget}"]`);

    // Apply same fallback strategies for target
    if (!targetFragment) {
      this.logger?.warn(
        `Target fragment data-view="${viewTarget}" not found in current document, trying fallbacks`
      );

      targetFragment = document.querySelector(`#${viewTarget}`);

      if (!targetFragment && viewTarget === 'main') {
        targetFragment =
          document.querySelector('main') ||
          document.querySelector('[role="main"]') ||
          document.querySelector('#app') ||
          document.querySelector('.main-content');
      }

      if (!targetFragment) {
        targetFragment = document.querySelector(`.${viewTarget}`);
      }
    }

    this.logger?.info('Fragment extraction result', {
      viewTarget,
      sourceFound: !!sourceFragment,
      targetFound: !!targetFragment,
      sourceSelector:
        sourceFragment?.tagName + (sourceFragment?.className ? '.' + sourceFragment.className : ''),
      targetSelector:
        targetFragment?.tagName + (targetFragment?.className ? '.' + targetFragment.className : ''),
    });

    return { sourceFragment, targetFragment };
  }

  /**
   * Replace fragment content with enhanced fragment-based targeting (kept for backwards compatibility)
   */
  replaceFragment(html, options = {}) {
    const {
      fromNavigation = false,
      fromPopstate = false,
      preserveScroll = false,
      url = null,
      trigger = 'unknown',
      viewTarget = 'main', // Single fragment target
    } = options;

    // Delegate to the multi-fragment method
    return this.replaceFragments(html, {
      fromNavigation,
      fromPopstate,
      preserveScroll,
      url,
      trigger,
      viewTargets: [viewTarget],
    });
  }

  /**
   * Update document head metadata when replacing main content
   */
  _updateDocumentHead(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const sourceHead = doc.querySelector('head');

      if (!sourceHead) {
        this.logger?.warn('No head element found in source HTML');
        return;
      }

      this.logger?.group('Updating document head metadata');

      // Define which head elements should be updated
      const updateableSelectors = [
        'title',
        'meta[name="description"]',
        'meta[name="keywords"]',
        'meta[name="robots"]',
        'meta[name="author"]',
        'meta[property^="og:"]', // Open Graph tags
        'meta[name^="twitter:"]', // Twitter Card tags
        'meta[property^="article:"]', // Article-specific OG tags
        'link[rel="canonical"]',
        'link[rel="alternate"]',
        'meta[name="theme-color"]',
      ];

      let updatedCount = 0;

      for (const selector of updateableSelectors) {
        const sourceElements = sourceHead.querySelectorAll(selector);

        if (sourceElements.length === 0) continue;

        // Handle title specially (only one allowed)
        if (selector === 'title') {
          const sourceTitle = sourceElements[0];
          if (sourceTitle && sourceTitle.textContent.trim()) {
            document.title = sourceTitle.textContent.trim();
            updatedCount++;
            this.logger?.info('Updated document title', {
              newTitle: document.title,
            });
          }
          continue;
        }

        // Handle canonical link specially (only one should exist)
        if (selector === 'link[rel="canonical"]') {
          // Remove existing canonical links
          document.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());

          const sourceCanonical = sourceElements[0];
          if (sourceCanonical && sourceCanonical.href) {
            const newCanonical = document.createElement('link');
            newCanonical.rel = 'canonical';
            newCanonical.href = sourceCanonical.href;
            document.head.appendChild(newCanonical);
            updatedCount++;
            this.logger?.info('Updated canonical URL', {
              canonicalUrl: sourceCanonical.href,
            });
          }
          continue;
        }

        // Handle meta tags
        for (const sourceElement of sourceElements) {
          if (sourceElement.tagName.toLowerCase() === 'meta') {
            this._updateMetaTag(sourceElement);
            updatedCount++;
          } else if (sourceElement.tagName.toLowerCase() === 'link') {
            this._updateLinkTag(sourceElement);
            updatedCount++;
          }
        }
      }

      // Emit head update event
      this.eventBus.emit('page:head-updated', {
        updatedElements: updatedCount,
        newTitle: document.title,
      });

      this.logger?.info(`Updated ${updatedCount} head elements`);
    } catch (error) {
      this.logger?.error('Failed to update document head', { error });
      this.eventBus.emit('page:head-update-error', { error });
    } finally {
      this.logger?.groupEnd();
    }
  }

  /**
   * Update or create a meta tag
   */
  _updateMetaTag(sourceMetaTag) {
    const name = sourceMetaTag.getAttribute('name');
    const property = sourceMetaTag.getAttribute('property');
    const content = sourceMetaTag.getAttribute('content');

    if (!content) return; // Skip empty content

    let selector;
    if (name) {
      selector = `meta[name="${name}"]`;
    } else if (property) {
      selector = `meta[property="${property}"]`;
    } else {
      return; // Can't identify the meta tag
    }

    // Remove existing meta tag(s) with same name/property
    document.querySelectorAll(selector).forEach(el => el.remove());

    // Create new meta tag
    const newMeta = document.createElement('meta');
    if (name) newMeta.setAttribute('name', name);
    if (property) newMeta.setAttribute('property', property);
    newMeta.setAttribute('content', content);

    // Copy other relevant attributes
    ['charset', 'http-equiv', 'scheme'].forEach(attr => {
      if (sourceMetaTag.hasAttribute(attr)) {
        newMeta.setAttribute(attr, sourceMetaTag.getAttribute(attr));
      }
    });

    document.head.appendChild(newMeta);

    this.logger?.debug('Updated meta tag', {
      selector,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    });
  }

  /**
   * Update or create a link tag
   */
  _updateLinkTag(sourceLinkTag) {
    const rel = sourceLinkTag.getAttribute('rel');
    const href = sourceLinkTag.getAttribute('href');

    if (!rel || !href) return;

    // Don't update critical link tags
    const criticalRels = ['stylesheet', 'icon', 'manifest', 'preload', 'prefetch'];
    if (criticalRels.includes(rel)) {
      this.logger?.debug('Skipping critical link tag', { rel, href });
      return;
    }

    const selector = `link[rel="${rel}"]`;

    // For alternate links, also match hreflang if present
    const hreflang = sourceLinkTag.getAttribute('hreflang');
    const fullSelector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : selector;

    // Remove existing link(s)
    document.querySelectorAll(fullSelector).forEach(el => el.remove());

    // Create new link tag
    const newLink = document.createElement('link');
    newLink.setAttribute('rel', rel);
    newLink.setAttribute('href', href);

    // Copy other relevant attributes
    ['hreflang', 'type', 'media', 'sizes'].forEach(attr => {
      if (sourceLinkTag.hasAttribute(attr)) {
        newLink.setAttribute(attr, sourceLinkTag.getAttribute(attr));
      }
    });

    document.head.appendChild(newLink);

    this.logger?.debug('Updated link tag', { rel, href });
  }

  /**
   * Copy relevant attributes from source fragment to target fragment
   */
  _copyFragmentAttributes(sourceFragment, targetFragment) {
    // Attributes to copy (excluding core structural ones)
    const attributesToCopy = [
      'data-state',
      'data-loading',
      'data-error',
      'data-version',
      'aria-live',
      'aria-label',
      'aria-describedby',
    ];

    attributesToCopy.forEach(attr => {
      if (sourceFragment.hasAttribute(attr)) {
        targetFragment.setAttribute(attr, sourceFragment.getAttribute(attr));
      } else {
        targetFragment.removeAttribute(attr);
      }
    });

    // Copy CSS classes if source has any (but preserve existing target classes that might be needed)
    if (sourceFragment.className) {
      // Keep important target classes like component mount states
      const preserveClasses = Array.from(targetFragment.classList).filter(
        cls => cls.startsWith('component-') || cls.startsWith('router-') || cls.startsWith('page-')
      );

      targetFragment.className = sourceFragment.className;
      preserveClasses.forEach(cls => targetFragment.classList.add(cls));
    }
  }

  /**
   * Handle scroll restoration based on configuration
   * Note: For 'top' scroll position, scrolling is handled in _processSingleFragment
   * after the out transition completes for a smoother experience
   */
  _handleScrollRestoration(storedPosition, options) {
    if (options.preserveScroll && storedPosition) {
      // Restore exact scroll position
      window.scrollTo({ top: storedPosition.y, left: storedPosition.x, behavior: 'instant' });
      return;
    }

    switch (this.options.scrollPosition) {
      case 'top':
        // Scroll to top is now handled in _processSingleFragment after out transition
        // Only scroll here for popstate events (browser back/forward)
        if (options.fromPopstate) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        break;
      case 'element':
        if (this.options.scrollElement) {
          const element = document.querySelector(this.options.scrollElement);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
        break;
      case 'preserve':
        // Do nothing - keep current position
        break;
    }
  }

  /**
   * Mount components within a root
   *
   * @param {Element} root - Scope to search for component selectors
   * @param {Object} [options]
   * @param {Element[]|null} [options.addedNodes] - Only search these nodes
   * @param {'all'|'critical'|'normal'} [options.priority='all'] - Which registry entries to
   *   mount. 'all' mounts critical entries first, then the rest.
   * @param {string|null} [options.fragmentTarget] - Fragment being mounted, if any
   */
  mountAllWithin(root, { addedNodes = null, priority = 'all', fragmentTarget = null } = {}) {
    const startTime = this.options.trackPerformance ? performance.now() : 0;

    this.host.mountWithin(root, { priority, nodes: addedNodes, fragmentTarget });

    if (this.options.trackPerformance) {
      this.performanceMetrics.totalMountTime += performance.now() - startTime;
      this.performanceMetrics.averageMountTime =
        this.performanceMetrics.totalMountTime /
        Math.max(1, this.performanceMetrics.fragmentReplacements);
    }
  }

  /**
   * Unmount every component within a root
   */
  unmountAllWithin(root) {
    this.host.unmountWithin(root);
  }

  /**
   * Mount a registered component on an element requested through component:lazy-load
   */
  _handleLazyLoad(element, componentName) {
    if (!this.host.mount(componentName, element)) {
      this.logger?.warn(`Lazy load requested for unknown component: ${componentName}`);
    }
  }

  /**
   * Mount components in the observed root and start watching it
   */
  _initialMount() {
    try {
      this.host.start(this._observeRoot());
    } catch (error) {
      this.logger?.error('Initial component mounting failed', { error });
    }
  }

  _observeRoot() {
    const { observeRoot } = this.options;
    if (observeRoot instanceof Element) return observeRoot;
    if (typeof observeRoot === 'string') {
      return document.querySelector(observeRoot) ?? this.container;
    }
    return this.container;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get component instances
   */
  getInstances() {
    return this.host.getInstances();
  }

  /**
   * Loaded component instances by name
   *
   * @returns {Map<string, Object>}
   */
  get instances() {
    return this.host.getInstances();
  }

  /**
   * Get loading status
   */
  getLoadingStatus() {
    return this.host.getLoadingStatus();
  }

  getComponentRegistry() {
    return this.registry || [];
  }

  getComponentStates() {
    // Return current state of all components based on actual instances
    const states = {};
    const loadingStatus = this.getLoadingStatus();

    this.registry.forEach(comp => {
      const instance = this.instances.get(comp.name);
      const isLoading = loadingStatus.loading.includes(comp.name);

      // Count actual DOM elements that match this component's selector
      const elements = document.querySelectorAll(comp.selector);
      const elementCount = elements.length;

      let status = 'not-loaded';
      if (isLoading) {
        status = 'loading';
      } else if (instance) {
        status = 'loaded';
      } else if (elementCount > 0) {
        status = 'available'; // Elements exist but component not instantiated yet
      }

      states[comp.name] = {
        status,
        hasInstance: !!instance,
        instanceType: instance ? instance.constructor.name : null,
        elementsFound: elementCount,
        isLoading,
        retryCount: loadingStatus.retries[comp.name] || 0,
        selector: comp.selector,
      };
    });

    return states;
  }

  getMetrics() {
    return {
      componentMounts: this.performanceMetrics?.componentMounts || 0,
      componentUnmounts: this.performanceMetrics?.componentUnmounts || 0,
      averageMountTime: this.performanceMetrics?.averageMountTime || 0,
      fragmentReplacements: this.performanceMetrics?.fragmentReplacements || 0,
      totalMountTime: this.performanceMetrics?.totalMountTime || 0,
    };
  }

  /**
   * Track component loading for session persistence
   */
  _trackComponentLoad(componentName) {
    const now = Date.now();

    // Add to session tracking
    this.sessionTracking.componentsLoaded.add(componentName);
    this.sessionTracking.loadHistory.push({
      component: componentName,
      timestamp: now,
      page: window.location.pathname,
    });

    // Update counts
    const currentCount = this.sessionTracking.mountCount.get(componentName) || 0;
    this.sessionTracking.mountCount.set(componentName, currentCount + 1);
    this.sessionTracking.lastMountTime.set(componentName, now);

    // Keep history to reasonable size (last 100 loads)
    if (this.sessionTracking.loadHistory.length > 100) {
      this.sessionTracking.loadHistory.shift();
    }
  }

  /**
   * Get session tracking data for performance dashboard
   */
  getSessionTracking() {
    return {
      totalComponentsLoaded: this.sessionTracking.componentsLoaded.size,
      componentsLoadedThisSession: Array.from(this.sessionTracking.componentsLoaded),
      loadHistory: [...this.sessionTracking.loadHistory],
      mountCounts: Object.fromEntries(this.sessionTracking.mountCount),
      lastMountTimes: Object.fromEntries(this.sessionTracking.lastMountTime),
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.logger?.info('PageManager destroying');

    // Unmount every component and stop observing the page
    this.host.stop();

    // Remove event bus listeners
    this._listeners?.abort();

    this.eventBus.emit('page-manager:destroyed', {});

    this.logger?.info('PageManager destroyed');
  }
}
