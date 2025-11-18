import { BaseComponent } from '@parallelogram-js/core';
import PUploader from './PUploader.js';

/**
 * PUploaderLoader - BaseComponent wrapper for lazy-loading PUploader Web Component
 *
 * This wrapper allows PUploader to work with ComponentRegistry/PageManager
 * while maintaining its Web Component architecture.
 *
 * Usage in ComponentRegistry:
 * .component('Uploader', 'p-uploader', {
 *   loader: () => import('@parallelogram-js/core/components/PUploaderLoader')
 * })
 */
export default class Uploader extends BaseComponent {
  _init(element) {
    /* The PUploader Web Component is already registered via the import above */
    /* No mounting needed - Web Components handle their own lifecycle */

    /* Store reference to the element for potential future use */
    const state = {
      element,
      cleanup: () => {
        /* Cleanup if needed in the future */
      }
    };

    return state;
  }
}