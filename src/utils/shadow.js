/** Constructable stylesheets shared by every instance, keyed by their CSS text */
const sheets = new Map();

/** The Trusted Types policy for static templates, created on first use; null when unavailable */
let policy;

const canAdopt = root =>
  'adoptedStyleSheets' in root &&
  typeof CSSStyleSheet === 'function' &&
  typeof CSSStyleSheet.prototype.replaceSync === 'function';

/**
 * Apply component styles to a shadow root through shared constructable stylesheets
 *
 * One `CSSStyleSheet` is built per stylesheet and adopted by every instance, so the CSS is parsed
 * once and isn't blocked by a `style-src` Content Security Policy. Where constructable stylesheets
 * aren't supported, `<style>` elements are added to the root instead.
 *
 * @param {ShadowRoot} root
 * @param {...string} styles CSS text
 */
export function adoptStyles(root, ...styles) {
  if (canAdopt(root)) {
    root.adoptedStyleSheets = styles.map(css => {
      let sheet = sheets.get(css);
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        sheets.set(css, sheet);
      }
      return sheet;
    });
    return;
  }

  for (const css of [...styles].reverse()) {
    const style = document.createElement('style');
    style.textContent = css;
    root.prepend(style);
  }
}

/**
 * Set a component's static template markup
 *
 * On pages that enforce Trusted Types the markup goes through a policy named `parallelogram`, which
 * the page's `trusted-types` directive must allow. Only pass markup written in the component itself,
 * never text that comes from users or servers.
 *
 * @param {Element|ShadowRoot} target
 * @param {string} markup
 */
export function setStaticHTML(target, markup) {
  if (policy === undefined) {
    try {
      policy =
        globalThis.trustedTypes?.createPolicy('parallelogram', { createHTML: value => value }) ??
        null;
    } catch {
      policy = null;
    }
  }

  target.innerHTML = policy ? policy.createHTML(markup) : markup;
}
