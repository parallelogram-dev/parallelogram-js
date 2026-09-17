# Upgrading within 0.7

Three 0.7 releases renamed or removed something, or changed what a page already had. Each is marked **Breaking** in the [changelog](https://github.com/parallelogram-dev/parallelogram-js/blob/main/CHANGELOG.md); this is the same list as what to change.

## 0.7.9

- `--brand-complimentary`, `--color-complimentary` and their `-hover` and `-contrast` are spelled `complementary`. A page that set the old names sets the new ones; nothing else moves.
- Fourteen design tokens nothing read are gone: `--surface-control-shadow`, `--surface-button-shadow`, `--surface-dropdown-color-text`, `--surface-item-radius`, `-border-width`, `-color-bg` and `-shadow`, `--surface-touch-border-color`, `-color-bg`, `-color-text`, `-hover-bg` and `-hover-border-color`, `--surface-card-border-color` and `--panel-color`. Setting any of them changed nothing, so removing the line that set one changes nothing either.

## 0.7.8

- An enhancement's `defaults` is one object rather than a getter that handed back a fresh copy, so `Toggle.defaults.openClass = 'is-open'` now takes effect. A page that mutated what it got back and relied on the class being unaffected -- which nothing in the library did -- should copy first.
- `<p-datetime>` formats dates, times and month names in the language of the nearest `lang`, where it used the browser's whatever the page said. A page with `<html lang="fr">` and English visitors sees French month names now, which is what the attribute means. A language without a region keeps the visitor's own conventions.
- Every control on an uploader file card has one label for its tooltip and its accessible name -- "Save details" where the tooltip read "Save".
- `<p-datetime>`'s placeholders read "Select date and time..." where they read "date & time".

## 0.7.7

- The tinted grounds behind a status message are `--color-danger-tint`, `--color-success-tint` and `--color-warning-tint`, not `-bg`.
- `<p-uploader>`'s custom properties are `--uploader-*`, not `--puploader-*`: `--uploader-radius`, `-border-width`, `-border-color`, `-bg`, `-color`, `-shadow`, `-padding` and `-files-gap`.

Coming from 0.6 or earlier, work through [Upgrading from 0.5 to 0.6](upgrading.html) first.
