/**
 * Everything in one file, for a page with no build step
 *
 * The ordinary entry points load a component the first time a page uses one, which is the right
 * shape behind a bundler. Straight from a CDN that becomes a waterfall: the browser learns about
 * each module only once the one before it has arrived. This bundle trades that for a single
 * request, so it carries every component whether the page uses them or not.
 */

export {
  Parallelogram,
  ComponentRegistry,
  WebComponentLoader,
  DevLogger,
  BaseComponent,
  EventManager,
  RouterManager,
  PageManager,
} from './index.js';

export { default as Accordion } from './components/Accordion.js';
export { default as CopyToClipboard } from './components/CopyToClipboard.js';
export { default as DataTable } from './components/DataTable.js';
export { default as DeferTracker } from './components/DeferTracker.js';
export { default as FormEnhancer } from './components/FormEnhancer.js';
export { default as Lazysrc } from './components/Lazysrc.js';
export { default as Lightbox } from './components/Lightbox.js';
export { default as Modal } from './components/Modal.js';
export { default as Scrollhide } from './components/Scrollhide.js';
export { default as Scrollreveal } from './components/Scrollreveal.js';
export { default as SelectLoader } from './components/SelectLoader.js';
export { default as Tabs } from './components/Tabs.js';
export { default as Toast } from './components/Toast.js';
export { default as Toggle } from './components/Toggle.js';
export { default as Tooltip } from './components/Tooltip.js';
export { default as Videoplay } from './components/Videoplay.js';

/* Importing an element's module defines it, so markup already on the page upgrades */
import './components/PDatetime.js';
import './components/PModal.js';
import './components/PSelect.js';
import './components/PToasts.js';
import './components/PUploader.js';
