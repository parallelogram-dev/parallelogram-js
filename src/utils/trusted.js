/**
 * Trusted Types for the markup and scripts the library inserts
 *
 * On pages that enforce Trusted Types (`require-trusted-types-for 'script'`), HTML goes through a
 * policy named `parallelogram`, and scripts and script URLs through one named
 * `parallelogram-scripts`. Both pass values through unchanged: they only mark what the library
 * already inserts, so the page's `trusted-types` directive must list them. Each policy is created
 * once, on first use, and the module does nothing when it loads, so bundles that only need one
 * helper leave the rest out. Where Trusted Types aren't supported, or a policy can't be created, the
 * helpers return the string they are given.
 */

const pass = value => value;

/**
 * Create a policy, or return false when Trusted Types are unsupported or the page blocks the name
 */
const create = (name, rules) => {
  let policy = false;
  try {
    /* eslint-disable-next-line compat/compat -- detected: undefined where Trusted Types are missing */
    policy = globalThis.trustedTypes?.createPolicy(name, rules) ?? false;
  } catch {
    console.warn(`Trusted Types policy "${name}" was blocked; add it to trusted-types`);
  }
  return policy;
};

/** The policies once created, false when unavailable */
let htmlPolicy;
let scriptPolicy;

const html = () => (htmlPolicy ??= create('parallelogram', { createHTML: pass }));

const scripts = () =>
  (scriptPolicy ??= create('parallelogram-scripts', { createScript: pass, createScriptURL: pass }));

/**
 * HTML the library inserts, as TrustedHTML where the `parallelogram` policy is available
 *
 * @param {string} markup
 * @returns {string|TrustedHTML}
 */
export const trustedHTML = markup => (html() ? htmlPolicy.createHTML(markup) : markup);

/**
 * Script code the library runs, as TrustedScript where the `parallelogram-scripts` policy is
 * available
 *
 * @param {string} code
 * @returns {string|TrustedScript}
 */
export const trustedScript = code => (scripts() ? scriptPolicy.createScript(code) : code);

/**
 * A script address the library loads, as TrustedScriptURL where the `parallelogram-scripts`
 * policy is available
 *
 * @param {string} url
 * @returns {string|TrustedScriptURL}
 */
export const trustedScriptURL = url => (scripts() ? scriptPolicy.createScriptURL(url) : url);
