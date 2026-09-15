/**
 * Trusted Types for the markup and scripts the library inserts
 *
 * On pages that enforce Trusted Types (`require-trusted-types-for 'script'`), HTML goes through a
 * policy named `parallelogram`, and scripts and script URLs through one named
 * `parallelogram-scripts`. Both pass values through unchanged: they only mark what the library
 * already inserts, so the page's `trusted-types` directive must list them. Each policy is created
 * once, on first use. Where Trusted Types aren't supported, or a policy can't be created, the
 * helpers return the string they are given.
 */

const pass = value => value;

const RULES = {
  parallelogram: { createHTML: pass },
  'parallelogram-scripts': { createScript: pass, createScriptURL: pass },
};

/** Policies by name, null when unavailable */
const policies = {};

const policy = name => {
  if (!(name in policies)) {
    policies[name] = null;
    try {
      policies[name] = globalThis.trustedTypes?.createPolicy(name, RULES[name]) ?? null;
    } catch {
      console.warn(
        `Allow the Trusted Types policy "${name}": trusted-types parallelogram parallelogram-scripts, with 'allow-duplicates' if the library loads twice`
      );
    }
  }
  return policies[name];
};

/**
 * HTML the library inserts, as TrustedHTML where the `parallelogram` policy is available
 *
 * @param {string} html
 * @returns {string|TrustedHTML}
 */
export const trustedHTML = html => policy('parallelogram')?.createHTML(html) ?? html;

/**
 * Script code the library runs, as TrustedScript where the `parallelogram-scripts` policy is
 * available
 *
 * @param {string} code
 * @returns {string|TrustedScript}
 */
export const trustedScript = code => policy('parallelogram-scripts')?.createScript(code) ?? code;

/**
 * A script address the library loads, as TrustedScriptURL where the `parallelogram-scripts`
 * policy is available
 *
 * @param {string} url
 * @returns {string|TrustedScriptURL}
 */
export const trustedScriptURL = url => policy('parallelogram-scripts')?.createScriptURL(url) ?? url;
