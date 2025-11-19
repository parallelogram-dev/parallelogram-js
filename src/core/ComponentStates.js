/**
 * ComponentStates - Standard state values for component lifecycle
 *
 * These states are used in data attributes to track component initialization
 * and lifecycle. Each component uses its selector attribute (e.g., data-lazysrc)
 * to store its current state.
 *
 * @example
 * // Initial HTML
 * <img data-lazysrc data-lazysrc-src="/image.jpg">
 *
 * // After mounting
 * <img data-lazysrc="mounted" data-lazysrc-src="/image.jpg">
 *
 * // After loading
 * <img data-lazysrc="loaded" data-lazysrc-src="/image.jpg" src="/image.jpg">
 *
 * @example
 * // CSS Hooks
 * [data-lazysrc="loading"] { opacity: 0.5; }
 * [data-lazysrc="loaded"] { opacity: 1; }
 * [data-lazysrc="error"] { border: 2px solid red; }
 */

/**
 * Core lifecycle states - common to all components
 */
export const ComponentStates = {
  /**
   * PENDING - Initial state (empty string or original config value)
   * Component has not been initialized yet
   */
  PENDING: '',

  /**
   * INITIALIZING - Component is running _init() method
   * Temporary state during setup
   */
  INITIALIZING: 'initializing',

  /**
   * MOUNTED - Component has been initialized and is ready
   * This is the baseline "active" state for most components
   */
  MOUNTED: 'mounted',

  /**
   * ERROR - Component initialization or operation failed
   * Check console for error details
   */
  ERROR: 'error',

  /**
   * DESTROYED - Component has been unmounted and cleaned up
   * Element may be reused but component instance is gone
   */
  DESTROYED: 'destroyed',
};

/**
 * Extended states for specific component behaviors
 * Components can use these in addition to core states
 */
export const ExtendedStates = {
  // Loading states (for Lazysrc, async components)
  LOADING: 'loading',
  LOADED: 'loaded',

  // Animation/reveal states (for Scrollreveal, transitions)
  HIDDEN: 'hidden',
  REVEALING: 'revealing',
  REVEALED: 'revealed',

  // Interactive states (for Toggle, Modal, etc.)
  OPEN: 'open',
  CLOSED: 'closed',
  OPENING: 'opening',
  CLOSING: 'closing',

  // Processing states (for forms, uploaders)
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  VALIDATING: 'validating',
  VALIDATED: 'validated',

  // Media states (for video, audio)
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
};

/**
 * Check if a state value indicates the component is mounted
 * @param {string} stateValue - The current state value
 * @returns {boolean}
 */
export function isMountedState(stateValue) {
  if (!stateValue) return false;

  // Core mounted states
  const mountedStates = [
    ComponentStates.INITIALIZING,
    ComponentStates.MOUNTED,
    ComponentStates.ERROR, // Error state still means component tried to mount
  ];

  // Extended states also indicate mounted
  const extendedMountedStates = Object.values(ExtendedStates);

  return (
    mountedStates.includes(stateValue) ||
    extendedMountedStates.includes(stateValue)
  );
}

/**
 * Check if a state value indicates an error condition
 * @param {string} stateValue - The current state value
 * @returns {boolean}
 */
export function isErrorState(stateValue) {
  return stateValue === ComponentStates.ERROR;
}

/**
 * Check if a state value indicates initialization in progress
 * @param {string} stateValue - The current state value
 * @returns {boolean}
 */
export function isInitializingState(stateValue) {
  return stateValue === ComponentStates.INITIALIZING;
}

/**
 * Get a safe initial state value
 * Preserves original attribute value if it looks like configuration
 * @param {string} currentValue - Current attribute value
 * @returns {string}
 */
export function getInitialState(currentValue) {
  // If empty or already a state value, return pending
  if (
    !currentValue ||
    isMountedState(currentValue) ||
    currentValue === ComponentStates.PENDING
  ) {
    return ComponentStates.PENDING;
  }

  // Preserve original value (might be legacy configuration)
  return currentValue;
}

export default ComponentStates;
