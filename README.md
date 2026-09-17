<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://dev.parallelogram.com.au/brand/logo-dark.svg">
    <img src="https://dev.parallelogram.com.au/brand/logo.svg" alt="Parallelogram" width="320">
  </picture>
</h1>

`@parallelogram-js/core` adds behaviour to server-rendered HTML through data attributes and a small set of web components. Components load the first time a page uses them, and links swap the page in place instead of reloading it.

```bash
npm install @parallelogram-js/core
```

The package is ESM only and targets Baseline 2023 browsers: Chrome and Edge 120, Firefox 121, and Safari 17.2 or later.

The framework is optional. Any enhancement can be used on its own — `import Toggle from '@parallelogram-js/core/components/Toggle'`, then `Toggle.enhanceAll()` mounts it on every matching element, with no framework and no build step beyond your bundler.

## Versions and browser support

- Releases follow [semantic versioning](https://semver.org). Before 1.0, a minor release (0.x.0) may include breaking changes and a patch release (0.x.y) never does.
- Deprecations are announced in the [changelog](CHANGELOG.md) and keep working for at least one minor release before they are removed. Each breaking release has an upgrade guide.
- The browser floor is Baseline 2023: Chrome and Edge 120, Firefox 121, and Safari 17.2 on macOS and iOS, or later. Older browsers aren't tested or supported.
- Only the latest minor release line gets security fixes. See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## Documentation

- [Documentation site](https://dev.parallelogram.com.au), with a page and live example for every component
- [Getting started](https://dev.parallelogram.com.au/getting-started.html)
- [Pages and the router](https://dev.parallelogram.com.au/pages-and-router.html)
- [Writing a component](https://dev.parallelogram.com.au/writing-components.html)
- [Events and alerts](https://dev.parallelogram.com.au/events-and-alerts.html)
- [Upgrading from 0.5 to 0.6](https://dev.parallelogram.com.au/upgrading.html)
- [Upgrading from 0.4 to 0.5](https://dev.parallelogram.com.au/upgrading-from-0-4.html)
- [llms.txt](https://dev.parallelogram.com.au/llms.txt), the documentation index for coding agents
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE)
