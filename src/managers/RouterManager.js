/**
 * RouterManager - Enhanced routing component for the Enhancement Framework
 * Handles client-side navigation, history management, and fragment loading
 */
export class RouterManager {
  constructor({ eventBus, logger, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.options = {
      // Default options
      baseUrl: '',
      timeout: 10000,
      retryAttempts: 0,
      fragmentSelector: '[data-router-fragment]',
      loadingClass: 'router-loading',
      errorClass: 'router-error',
      // Smooth scroll options
      scrollDuration: 800, // 800ms default for snappy feel
      scrollEasing: 'ease-in-out', // CSS easing function
      ...options,
    };

    this.controller = null;
    this.currentUrl = new URL(location.href);
    this.isNavigating = false;
    this.scrollAnimationFrame = null;

    // Bind event handlers
    this.boundPopState = this._onPopState.bind(this);
    this.boundLinkClick = this._onLinkClick.bind(this);

    this._initialize();
  }

  /**
   * Initialize the router with event listeners
   */
  _initialize() {
    this.logger?.info('RouterManager initializing');

    // History events
    window.addEventListener('popstate', this.boundPopState);
    window.addEventListener('pageshow', e => {
      if (e.persisted) {
        this.eventBus.emit('router:bfcache-restore', { url: this.currentUrl });
      }
    });
    window.addEventListener('pagehide', () => {
      this.eventBus.emit('router:bfcache-store', { url: this.currentUrl });
    });

    // Enhance existing links
    this._enhanceLinks();

    // Listen for dynamic content changes
    this.eventBus.on('dom:content-loaded', () => {
      this._enhanceLinks();
    });

    this.eventBus.emit('router:initialized', { currentUrl: this.currentUrl });
  }

  /**
   * Enhance links for progressive navigation
   */
  _enhanceLinks() {
    const links = document.querySelectorAll('a[href]:not([data-router-enhanced])');
    links.forEach(link => {
      if (this._shouldEnhanceLink(link)) {
        link.addEventListener('click', this.boundLinkClick);
        link.setAttribute('data-router-enhanced', 'true');
        this.logger?.debug('Enhanced link', { href: link.href });
      } else {
        // Handle hash-only links for smooth scrolling
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          link.addEventListener('click', this._onAnchorClick.bind(this));
          link.setAttribute('data-router-enhanced', 'anchor');
          this.logger?.debug('Enhanced anchor link', { href });
        }
      }
    });
  }

  /**
   * Determine if a link should be enhanced for SPA navigation
   */
  _shouldEnhanceLink(link) {
    const href = link.getAttribute('href');

    // Skip if external, mailto, tel, etc.
    if (
      !href ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      return false;
    }

    // Skip hash-only links (in-page anchors)
    if (href.startsWith('#')) {
      return false;
    }

    // Skip if explicitly marked to skip
    if (link.hasAttribute('data-router-skip')) {
      return false;
    }

    // Skip if different origin (unless explicitly marked for enhancement)
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin && !link.hasAttribute('data-router-enhance')) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * Smooth scroll to element using native browser behavior
   */
  _smoothScrollTo(targetElement) {
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  /**
   * Handle anchor link clicks for smooth scrolling
   */
  _onAnchorClick(event) {
    // Allow default behavior with modifier keys
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    // Allow default for middle mouse button
    if (event.which === 2) {
      return;
    }

    const link = event.currentTarget;
    const href = link.getAttribute('href');

    if (!href || !href.startsWith('#')) {
      return;
    }

    // Get the target element
    const targetId = href.substring(1);
    const targetElement = targetId ? document.getElementById(targetId) : null;

    if (targetElement) {
      event.preventDefault();

      // Use native smooth scrolling
      this._smoothScrollTo(targetElement);

      // Update URL hash without triggering navigation
      if (targetId) {
        history.replaceState(null, '', href);
      }

      this.eventBus.emit('router:anchor-scroll', {
        target: targetElement,
        hash: href,
        trigger: 'anchor-click',
        element: link,
      });

      this.logger?.debug('Scrolled to anchor', { href, targetId });
    }
  }

  /**
   * Handle link clicks for SPA navigation
   */
  _onLinkClick(event) {
    // Allow default behavior with modifier keys
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    // Allow default for middle mouse button
    if (event.which === 2) {
      return;
    }

    const link = event.currentTarget;
    const href = link.getAttribute('href');
    const viewTarget = link.getAttribute('data-view-target') || 'main';

    // Check if link OR any parent container has data-router-immutable-url
    const immutableContainer = link.closest('[data-router-immutable-url]');
    const immutableUrl = link.hasAttribute('data-router-immutable-url')
      ? link.getAttribute('data-router-immutable-url') !== 'false'
      : immutableContainer
        ? immutableContainer.getAttribute('data-router-immutable-url') !== 'false'
        : false;

    try {
      const url = new URL(href, location.href);

      // Same page anchor links - allow default behavior
      if (url.pathname === location.pathname && url.hash) {
        return;
      }

      event.preventDefault();
      this.navigate(url, {
        viewTarget,
        replace: link.hasAttribute('data-router-replace'),
        immutableUrl,
        trigger: 'link-click',
        element: link,
      });
    } catch (error) {
      this.logger?.error('Failed to parse link URL', { href, error });
    }
  }

  /**
   * Handle browser back/forward navigation
   */
  _onPopState(event) {
    const url = new URL(location.href);
    this.currentUrl = url;
    this.eventBus.emit('router:popstate', {
      url,
      state: event.state,
      trigger: 'popstate',
    });
  }

  /**
   * Perform HTTP GET request with enhanced error handling and logging
   */
  async get(url, init = {}) {
    const requestUrl = typeof url === 'string' ? url : url.toString();
    this.logger?.group(`RouterManager GET ${requestUrl}`);

    // Abort any in-flight request
    this._abortInFlight();

    // Create new abort controller
    const controller = new AbortController();
    this.controller = controller;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.options.timeout);

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/html,application/json,*/*',
          ...init.headers,
        },
        ...init,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this._createHttpError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      this.logger?.info('GET successful', {
        url: requestUrl,
        status: response.status,
        contentType,
      });

      return { response, data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        this.logger?.warn('GET aborted', { url: requestUrl });
        throw error;
      }

      this.logger?.error('GET failed', { url: requestUrl, error });
      throw error;
    } finally {
      this.logger?.groupEnd();
      this.controller = null;
    }
  }

  /**
   * Navigate to a new URL with enhanced options
   */
  async navigate(url, options = {}) {
    const { replace = false, trigger = 'programmatic', element = null, force = false, immutableUrl = false } = options;

    const targetUrl = typeof url === 'string' ? new URL(url, location.href) : url;
    const targetUrlString = targetUrl.toString();

    // Prevent navigation to same URL unless forced
    if (!force && targetUrlString === this.currentUrl.toString()) {
      this.logger?.debug('Navigation skipped - same URL', { url: targetUrlString });
      return;
    }

    // Prevent concurrent navigation
    if (this.isNavigating) {
      this.logger?.warn('Navigation in progress, aborting new navigation', {
        url: targetUrlString,
      });
      return;
    }

    this.isNavigating = true;
    this.currentUrl = targetUrl;

    // Emit navigation start event
    this.eventBus.emit('router:navigate-start', {
      url: targetUrl,
      trigger,
      element,
      replace,
    });

    // Add loading state
    if (element) {
      element.classList.add(this.options.loadingClass);
    }
    document.body.classList.add(this.options.loadingClass);

    try {
      const { data } = await this.get(targetUrlString);

      if (typeof data !== 'string') {
        throw new Error('Expected HTML string response for navigation');
      }

      // Update browser history only if URL is not immutable
      if (!immutableUrl) {
        const historyState = { timestamp: Date.now(), trigger };
        if (replace) {
          history.replaceState(historyState, '', targetUrlString);
        } else {
          history.pushState(historyState, '', targetUrlString);
        }
      }

      // Emit success event with HTML data
      this.eventBus.emit('router:navigate-success', {
        url: targetUrl,
        html: data,
        trigger,
        element,
        replace,
        viewTarget: options.viewTarget,
        immutableUrl,
      });

      this.logger?.info('Navigation successful', {
        url: targetUrlString,
        trigger,
        replace,
        immutableUrl,
      });

      return data;
    } catch (error) {
      // Add error state
      if (element) {
        element.classList.add(this.options.errorClass);
      }
      document.body.classList.add(this.options.errorClass);

      this.eventBus.emit('router:navigate-error', {
        url: targetUrl,
        error,
        trigger,
        element,
      });

      this.logger?.error('Navigation failed', {
        url: targetUrlString,
        error,
        trigger,
      });

      throw error;
    } finally {
      // Clean up loading states
      if (element) {
        element.classList.remove(this.options.loadingClass, this.options.errorClass);
      }
      document.body.classList.remove(this.options.loadingClass, this.options.errorClass);

      this.isNavigating = false;

      this.eventBus.emit('router:navigate-end', {
        url: targetUrl,
        trigger,
      });
    }
  }

  /**
   * Programmatically go back in history
   */
  back() {
    this.logger?.info('Navigating back');
    history.back();
  }

  /**
   * Programmatically go forward in history
   */
  forward() {
    this.logger?.info('Navigating forward');
    history.forward();
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.currentUrl;
  }

  /**
   * Check if currently navigating
   */
  isNavigating() {
    return this.isNavigating;
  }

  /**
   * Abort any in-flight request
   */
  _abortInFlight() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /**
   * Create HTTP error with enhanced information
   */
  _createHttpError(response) {
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    error.name = 'HttpError';
    error.status = response.status;
    error.statusText = response.statusText;
    error.response = response;
    error.url = response.url;
    return error;
  }

  /**
   * Clean up event listeners and abort any pending requests
   */
  destroy() {
    this.logger?.info('RouterManager destroying');

    // Remove event listeners
    window.removeEventListener('popstate', this.boundPopState);

    // Remove enhanced link listeners
    document.querySelectorAll('a[data-router-enhanced="true"]').forEach(link => {
      link.removeEventListener('click', this.boundLinkClick);
      link.removeAttribute('data-router-enhanced');
    });

    // Remove anchor link listeners
    document.querySelectorAll('a[data-router-enhanced="anchor"]').forEach(link => {
      link.removeEventListener('click', this._onAnchorClick);
      link.removeAttribute('data-router-enhanced');
    });

    // Cancel any ongoing scroll animation
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
      this.scrollAnimationFrame = null;
    }

    // Abort any pending requests
    this._abortInFlight();

    // Remove event bus listeners
    this.eventBus.off('dom:content-loaded');

    this.eventBus.emit('router:destroyed', {});

    this.logger?.info('RouterManager destroyed');
  }
}
