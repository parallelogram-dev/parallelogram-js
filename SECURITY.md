# Security policy

## Supported versions

Before 1.0, only the latest minor release line gets security fixes. That is currently 0.7.x.

| Version | Security fixes |
| ------- | -------------- |
| 0.7.x   | Yes            |
| < 0.7   | No             |

If you are on an older 0.x release, upgrade to the latest 0.x minor. The [upgrade guides](https://dev.parallelogram.com.au/upgrading.html) list each breaking change and what to use instead.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/parallelogram-dev/parallelogram-js/security/advisories/new). Please don't open a public issue, pull request or discussion for a security problem.

Include:

- the affected version of `@parallelogram-js/core`
- the component, manager or adapter involved
- steps or a minimal page that reproduces the problem
- what an attacker could do with it, and under what conditions

## What happens next

This is a small project, so these are aims rather than guarantees:

1. We acknowledge the report within a few days.
2. We confirm the problem, or explain why we don't think it is one, and keep you updated in the advisory.
3. We release the fix as a patch on the supported release line, with a GitHub security advisory and an entry in the [changelog](CHANGELOG.md).
4. We credit you in the advisory if you would like to be named.

Please give us a chance to release a fix before disclosing the problem publicly.

## Scope

The library runs in the browser, on pages the site controls. Some behaviour is by design and worth knowing when you judge whether something is a vulnerability:

- The router fetches pages from the site's own origin only, and runs the scripts in the fragments and head it swaps in, as a full page load would. HTML the site serves from its own origin is trusted.
- On pages that enforce Trusted Types, the library inserts HTML through a policy named `parallelogram` and scripts through one named `parallelogram-scripts`. Both pass values through unchanged: they mark what the library already inserts rather than sanitising it. Strings given to `Modal.create()` and toast messages with `allowHTML` must only carry trusted HTML. See [Content Security Policy and Trusted Types](https://dev.parallelogram.com.au/pages-and-router.html#content-security-policy-and-trusted-types).
- DeferTracker loads third-party tracker scripts only from the page's own origin, the vendor origin an adapter declares, or origins the site allowlists, and can limit which tracker ids a block may use. See [Which scripts can load](https://dev.parallelogram.com.au/trackers.html#which-scripts-can-load).

Examples of reports we want: the router fetching or running content from another origin, library code inserting user-supplied text as HTML, a way around the Trusted Types policies, or DeferTracker loading a script from an origin that isn't allowed.

Out of scope: a site passing untrusted HTML to an API documented as taking trusted HTML, vulnerabilities in the third-party tracker scripts themselves, and problems in the site's own server or Content Security Policy.

## Verifying releases

Releases are published to npm from the GitHub Actions [Publish workflow](.github/workflows/publish.yml) with npm provenance, which links each version to the commit and workflow run that built it. To check the signatures and provenance of the packages installed in a project, run:

```bash
npm audit signatures
```
