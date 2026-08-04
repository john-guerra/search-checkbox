# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html): patch for
a bugfix, minor for a new option, major for a breaking API change.

## [Unreleased]

### Added

- Ported the Observable notebook
  [`@john-guerra/search-checkbox@509`](https://observablehq.com/@john-guerra/search-checkbox)
  to a standalone package, published as ESM, UMD, and a minified UMD bundle. The
  UMD bundle inlines `@observablehq/inputs`, so a single `<script>` tag works
  standalone.
- TypeScript declarations for the widget and the search filters.
- `example/index.html` — demo of the widget over the FIFA attribute list.
- `example/bind.html` — the widget bound to a plain `Inputs.checkbox` via
  `Inputs.bind`, which the notebook only sketched as "WIP".
- Screen-reader support: the selection counter announces changes
  (`aria-live="polite"`) and the search input gets an accessible name.

### Fixed

Behavior the notebook got wrong. None of these change what the widget looks
like; all are covered by tests.

- **Typing in the search box no longer fires an `input` event.** Searching
  changes what is visible, never the selection, but the native event from the
  search field was bubbling out to consumers once per keystroke.
- **Options outside `data` are ignored instead of corrupting the count.**
  Passing `value: ["A","B","C"]` to a two-option widget used to read
  `(3 of 2 selected)` forever, and `"C"` leaked out of `.value`.
- **Filtering a long list is no longer quadratic.** The visibility check was
  scanning the full result set once per checkbox on every keystroke.
- **Assigning `.value` now refreshes the checkboxes and the counter.**
  Previously a programmatic set updated the internal state but left the display
  stale. It still does not fire an `input` event — only user actions do, which
  is what keeps `Inputs.bind` from double-firing.

### Changed

- The widget returns a single `<div class="search-checkbox">` element. The
  notebook returned a `DocumentFragment`, which is emptied when you append it —
  so it could not be re-appended, styled, or measured.
- Passing `optionsSearch` now merges with the defaults rather than replacing
  them, so setting a placeholder no longer silently disables the search filter.

## Notebook history (Observable)

Versions before this package existed.

- **@507** — Nov 18, 2024 — Bugfix when using max-height and format
- **@459** — Jan 30, 2023 — Adding a height parameter
- **@433** — Jan 30, 2023 — Reorganizing all/none buttons and add count of
  selected elements
- **@357** — Oct 12, 2022 — Bugfix multiple input events were triggered
