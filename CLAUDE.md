# CLAUDE.md

## What this is

`@john-guerra/search-checkbox` — a [reactive widget](https://reactivewidgets.org)
that pairs a search box with a checkbox list, for selecting from a long list of
options. Its reason to exist is that **All / None act on the currently filtered
options**, not the whole list.

It is a port of the Observable notebook
[`@john-guerra/search-checkbox@509`](https://observablehq.com/@john-guerra/search-checkbox).
The port is behavior-faithful; every intentional difference is listed under
[Deviations](#deviations-from-509) and in
`docs/superpowers/specs/2026-08-04-search-checkbox-port-design.md`.

Two source files, one boundary:

- `src/filter.js` — pure search predicates. No DOM, no dependencies.
- `src/index.js` — the widget. The only file that touches the DOM or
  `@observablehq/inputs`.

## Build, test, run

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm test`          | Unit tests for `src/filter.js` (`node --test`). Fast, no browser.      |
| `npm run test:e2e`  | Playwright, Chromium. **Builds `dist/` first.** The only DOM coverage. |
| `npm run typecheck` | `tsc --noEmit` over `src/**/*.d.ts` + `test/types.ts`.                 |
| `npm run lint`      | ESLint + Prettier check.                                               |
| `npm run build`     | Rollup → `dist/SearchCheckbox.{js,min.js,esm.js}`.                     |
| `npm run format`    | Prettier write.                                                        |

To look at it by hand: `npx http-server . -p 4173`, then open
`/example/index.html` (UMD build) or `/example/bind.html` (ESM build +
`Inputs.bind`).

Full gate, matching CI:

```bash
npm run lint && npm test && npm run typecheck && npm run test:e2e && npm run build
```

## Traps

Each of these looks like a bug and is not. They cost real time to rediscover.

**1. `data[+check.value]` is correct — do not "simplify" it to positional pairing.**
`Inputs.checkbox` renders `<input value=${i}>` where `i` indexes the _original_
`data` array. `chooser.js` builds its `index` as a permutation of those original
indices, so the mapping survives `sort` and `unique`. Pairing rendered rows
positionally against `data` looks cleaner and is wrong. Verified against
`@observablehq/inputs@0.12` source.

**2. `evt.stopPropagation()` in the checkbox listener is load-bearing.**
Remove it and every selection change dispatches two `input` events. That was
notebook bug @357. e2e spec 8 guards it.

**3. `evt.stopPropagation()` in the _search_ listener is also load-bearing.**
`<input type=search>` emits a native, bubbling `input` event. Without the stop,
it reaches the widget root and fires consumers' handlers once per keystroke even
though nothing was selected. @509 has this bug — its author commented out an
explicit dispatch here without noticing the native event underneath. e2e spec 12
guards it.

**4. `selected` (a `Map`) is the source of truth, not the DOM.**
Reading state back out of the checkboxes desynchronizes the moment a filter is
active, because filtered-out rows are hidden but still checked.

**5. Search changes what is _visible_, never the value.**
All / None deliberately operate on `search.value` — the filtered set.

**6. `render()` vs `updateValueFromSelected()`.**
`render()` syncs the DOM and **never dispatches**. `updateValueFromSelected()`
renders _and_ dispatches. The `.value` setter must call `render()` only —
dispatching there double-fires under `Inputs.bind`, which writes `source.value`
and then dispatches on the source itself. e2e `bind.spec.js` guards it.

**7. e2e needs a freshly built `dist/`.**
`npm run test:e2e` rebuilds via Playwright's `webServer`. But `webServer` has
`reuseExistingServer: true` locally — **if you already have something listening
on port 4173, Playwright skips the build entirely and silently tests a stale
bundle.** Kill stray servers before trusting a green run:
`pkill -f "http-server . -p 4173"`.

**8. UMD bundles `@observablehq/inputs`; ESM leaves it external.**
So the CDN `<script>` tag works standalone while bundlers still dedupe. Also:
`src/index.js` must keep a **single default export** with helpers attached as
statics. Adding named exports makes Rollup emit a UMD namespace object, and the
CDN global stops being callable.

**9. `Inputs.bind` is one-way outside Observable.**
Its default invalidation is `disposal(target)`, which resolves immediately when
the element is not inside an `.observablehq` cell; `bind` then removes its source
listener. Pass a never-resolving promise as the third argument. See
`example/bind.html`.

## Deviations from @509

| #   | Change                                                                     |
| --- | -------------------------------------------------------------------------- |
| 1   | `Set` hoisted out of the row-hiding loop — O(n²) → O(n) per keystroke      |
| 2   | `void component.offsetHeight` replaces `style.zIndex = 1` for the reflow   |
| 3   | `optionsSearch` merges over the defaults instead of replacing them         |
| 4   | Widget-only options are stripped before forwarding to `Inputs.checkbox`    |
| 5   | Notebook globals become real imports                                       |
| 6   | `aria-live` on the counter, `aria-label` on the search input               |
| 7   | Single `<div class="search-checkbox">` root, not an htl `DocumentFragment` |
| 8   | `.value` setter refreshes the UI but does not dispatch (@509 did neither)  |
| 9   | Searching no longer leaks a native `input` event to consumers              |
| 10  | Values outside `data` are rejected instead of inflating the counter        |

## Working here

**Red → green is mandatory.** Write the failing test, run it, confirm it fails
_for the right reason_, then implement. A test that never failed proves nothing.
Paste the red output into the PR. Never edit a test to make it pass — if a test
is wrong, fix it as a separate, explained change.

Both of those matter here specifically: a test in this repo once failed for the
wrong reason (Node 24 rejecting `node --test test/` as a directory), which
briefly disguised a missing module as a passing red step.

**Guardrails.**

- Never hand-edit `dist/` — generated and gitignored.
- Do not publish to npm. The repo is left ready to publish, not published.
- No secrets in this repo; it needs none.
- Don't add a CDN `<script>`/`<link>` without Subresource Integrity. The demo
  pages load `@observablehq/inputs` from `node_modules` on purpose — a network
  fetch in the e2e fixture is a CI flake source as well as a supply-chain hole.

**Conventions.**

- Conventional commits. Commit at the end of each task.
- Semver: patch = bugfix, minor = new option, major = breaking API change.
- Update `CHANGELOG.md` in the _same commit_ as the change.
- When a bug is fixed, add a test at the tier that would have caught it —
  pure-logic bug → `test/`, DOM or load-order bug → `e2e/`.

## Still open

Repository settings that cannot be done from a clone — tracked as
[issue #9](https://github.com/john-guerra/search-checkbox/issues/9):

- Enable CodeQL default setup
- Branch protection on `main`: require green CI before merge
- Label and groom the backlog
