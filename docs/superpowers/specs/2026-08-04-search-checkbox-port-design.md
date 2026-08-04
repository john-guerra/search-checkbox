# Design: `@john-guerra/search-checkbox`

Date: 2026-08-04

Port the Observable notebook [`@john-guerra/search-checkbox@509`](https://observablehq.com/@john-guerra/search-checkbox)
into a standalone npm package and GitHub repository in the
[reactivewidgets.org](https://reactivewidgets.org) family, alongside
`multi-auto-select` and `d3ZoomableAxis`.

## Source

`search-checkbox.tgz` — an Observable notebook export containing
`600f1f80e771a771@509.js`, the Observable runtime, and a scaffold `index.html`.
Only the notebook module matters; the bundled runtime and inspector are discarded.

`searchCheckbox(data, options)` composes `Inputs.checkbox` and `Inputs.search`
into a single reactive input, adding:

- **All / None buttons that operate on the currently filtered set**, not the
  whole list. This is the widget's reason to exist.
- A `(n of N selected)` live counter.
- A scrolling checkbox area bounded by `max-height`.
- `fullSearchFilter` — matches a term anywhere in the text, where Observable's
  default `search` filter only matches at word start.

The notebook also exports the reusable pure helpers `termFilter`,
`escapeRegExp`, and `valuesof`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Observable Inputs | direct `dependencies` entry | Faithful port; the widget *is* a composition of `Inputs.checkbox` + `Inputs.search`. Reimplementing them would drift from Observable styling and behavior. |
| Repo shape | `d3ZoomableAxis` structure (ESM-first, `exports` map, `.d.ts`, tests, CI) **plus** a rollup UMD/min build (`multi-auto-select`) | ESM-first for bundler users; UMD keeps the CodePen/vanilla `<script>` workflow the notebook documents. |
| Port scope | Faithful behavior; fix internal fragility only | Notebook users upgrading must see no visible change. |
| Package name | `@john-guerra/search-checkbox` | Matches the existing Observable package name exactly; scoped names carry no npm collision risk. |
| Test strategy | Pure unit tests + Playwright e2e; **no jsdom** | See Testing. |
| Accessibility | Invisible-only fixes (`aria-live`, `aria-label`) | Reconciles "faithful port" with the readiness checklist's "accessibility is part of done": zero visual and zero behavioral change for sighted users. |
| TDD | Strict red → green, encoded in the plan and `CLAUDE.md` | "A test that never failed proves nothing." Agents default to implementation-first, so it must be written down. |

## Architecture

```
search-checkbox/
├── src/
│   ├── index.js          # searchCheckbox() — the only DOM code
│   ├── index.d.ts        # types
│   └── filter.js         # escapeRegExp, termFilter, valuesof, fullSearchFilter
├── test/
│   └── filter.test.js    # pure, no DOM, `node --test`
├── e2e/
│   └── search-checkbox.spec.js
├── example/
│   └── index.html        # demo AND Playwright fixture
├── docs/superpowers/specs/   # this document
├── .claude/settings.json     # committed permissions baseline
├── .github/
│   ├── workflows/ci.yml
│   ├── dependabot.yml
│   ├── ISSUE_TEMPLATE/{bug_report.md,feature_request.md}
│   └── PULL_REQUEST_TEMPLATE.md
├── .mcp.json                 # Playwright MCP for the verify loop
├── CLAUDE.md  AGENTS.md  CHANGELOG.md
├── playwright.config.js
├── rollup.config.js
└── package.json  README.md  LICENSE  .gitignore  .npmignore
    eslint.config.js  .prettierrc
```

Two source units, one boundary:

- **`src/filter.js`** — pure functions. Zero DOM, zero dependencies. Unit-testable
  in isolation and separately exported, since `fullSearchFilter` is advertised as
  reusable in its own right (it was proposed upstream as
  [observablehq/inputs#226](https://github.com/observablehq/inputs/pull/226)).
- **`src/index.js`** — the widget. Depends on `@observablehq/inputs`, `htl`, and
  `./filter.js`. Everything DOM-related lives here.

Someone can use `filter.js` without reading `index.js`, and `index.js` can change
its markup freely without affecting `filter.js`.

## Public API

Unchanged from @509:

```js
searchCheckbox(data, {
  value = [],            // initially selected options
  label,                 // label rendered above the widget
  height = 300,          // max-height (px) of the scrolling checkbox area
  format = d => d,       // forwarded to Inputs.checkbox
  optionsCheckboxes,     // override the options given to Inputs.checkbox
  optionsSearch,         // override the options given to Inputs.search
  debug = false,
})
```

`data` may be any iterable; it is materialized with `Array.from`.

Returns a DOM element with:

- a `.value` **getter** returning the array of selected options,
- a `.value` **setter** accepting an array of options to select,
- a bubbling `input` event dispatched on every selection change.

This is the reactivewidgets.org / Observable `viewof` contract.

## Internal data flow

`selected: Map<option, boolean>` is the single source of truth. The checkbox DOM
is a projection of it, never the authority.

| Trigger | Effect |
|---|---|
| checkbox `input` | `stopPropagation()`, rebuild `selected` from `checkboxes.value`, refresh counter, dispatch `input` |
| search `input` | show/hide rows only — **no** value change, **no** event |
| **All** click | set `true` for every option in `search.value` (the filtered set) |
| **None** click | set `false` for every option in `search.value` |

`stopPropagation()` on the inner checkbox event is what keeps exactly one `input`
event reaching the consumer — the @357 fix. It is load-bearing.

## Deviations from @509

All six preserve visible behavior.

| # | @509 | Port | Why |
|---|---|---|---|
| 1 | `search.value.includes(d)` evaluated inside the per-checkbox loop | hoist `const visible = new Set(search.value)` before the loop | O(n²) → O(n) per keystroke. At 87 options invisible; at 5,000 it is 25M comparisons per character typed. |
| 2 | `component.style.zIndex = 1` to force a relayout | `void component.offsetHeight` | Same intent — force reflow when a `format` function sets `max-height` — without leaving a stray inline style. |
| 3 | a user-supplied `optionsSearch` replaces the defaults wholesale, silently dropping `fullSearchFilter` | shallow-merge the user object over the defaults | Passing `{placeholder: "..."}` should not cost you the search filter. **This is the one deviation an existing notebook user could observe** — and only if they passed `optionsSearch` *and* relied on losing the filter, which is not a plausible intent. |
| 4 | `cloneIgnoring(options, "label")` leaks `height`, `debug`, `optionsSearch`, `optionsCheckboxes` into `Inputs.checkbox` | strip the widget-only keys explicitly | Harmless today (`chooser` ignores unknown keys) but it is noise crossing a module boundary. |
| 5 | notebook globals `Inputs`, `html`, `htl`, `Event` | real imports; `Event` from the global | Required to leave the notebook. |
| 6 | counter is a bare `<output>`; search input is unlabeled | `aria-live="polite"` on the counter; `aria-label` on the search input, derived from `label` | Screen readers announce "(12 of 87 selected)" as it changes. **No visual or behavioral change** — sighted users see an identical widget. |

### Explicitly NOT changed

`data[+check.value]` stays exactly as written. Verified against
`@observablehq/inputs@0.12`: `chooser.js` builds `index` as a permutation of
indices into the **original** `data` array (after `sort`/`unique`), and
`checkbox.js` renders `<input value=${i}>` with that original index. The lookup
is correct, including under `sort` and `unique`. A positional
row-to-option pairing would be *less* correct. A code comment must record this so
it is not "fixed" later.

## Build and distribution

Rollup. Output basename `SearchCheckbox`, UMD global `SearchCheckbox`.

| Target | File | `@observablehq/inputs`, `htl` |
|---|---|---|
| UMD | `dist/SearchCheckbox.js` | **bundled in** |
| UMD minified | `dist/SearchCheckbox.min.js` | **bundled in** |
| ESM | `dist/SearchCheckbox.esm.js` | **external** |

Bundling into UMD (~60KB) makes the CDN tag self-contained — one `<script>` works
on CodePen with no companion tags. Keeping them external in ESM lets bundlers
dedupe when the host app already uses Inputs.

`package.json` `exports`:

- `.` → `src/index.js` (types `src/index.d.ts`), with `umd` → the min bundle
- `./filter` → `src/filter.js` (the pure helpers)
- `./package.json`

Legacy fields, for tools that ignore `exports`: `main` and `module` →
`src/index.js`; `browser`, `unpkg`, `jsdelivr` → `dist/SearchCheckbox.min.js`.
`dist/SearchCheckbox.esm.js` exists for anyone loading a prebuilt ESM bundle
directly from a CDN; no `package.json` field points at it.

`files` ships `src/**` and `dist/**` only. `.npmignore` excludes `example/`,
`e2e/`, `docs/`, `playwright.config.js`, and `eslint.config.js`.

## Testing

Two layers, no overlap. **Strict red → green**: for every unit of work, write the
test, run it, confirm it fails for the right reason, then implement until green —
without editing the test. This is encoded as explicit numbered steps in the
implementation plan and as a rule in `CLAUDE.md`, because agents default to
implementation-first.

For the widget, the ten Playwright specs are written and confirmed failing
*before* `src/index.js` is ported. The notebook is the reference for intended
behavior, not a shortcut past the red step.

### Unit — `test/filter.test.js`, `node --test`, no dependencies

Pure functions only:

- `escapeRegExp` escapes every regex metacharacter it claims to.
- `termFilter` matches a term **anywhere**, including mid-word. *(Corrected
  during implementation: an earlier draft of this spec described the opposite.
  The regex is `(?:^.*|[^\p{L}-])term`; the `^.*` branch matches any prefix, so
  `termFilter("Accuracy")` matches `HeadingAccuracy`. Observable's own filter
  uses `^` rather than `^.*` and matches neither — that single character is the
  entire difference, and the reason this module exists.)*
- `termFilter` still rejects terms that are genuinely absent.
- `fullSearchFilter` applies multi-term AND semantics across whitespace-split queries.
- `fullSearchFilter` searches object values via `valuesof`.
- `fullSearchFilter` returns `false` for `null`/`undefined`.

### End-to-end — `e2e/search-checkbox.spec.js`, Playwright, Chromium

Runs against the real built UMD bundle in a real browser, driving
`example/index.html`.

Playwright's `webServer` runs `npm run build && npx http-server . -p 4173 --silent`
(with `http-server` as a devDependency) so the suite always tests a freshly built
`dist/`, served from the repo root — `example/index.html` references
`../dist/SearchCheckbox.js`, so the root is the correct document root.
`baseURL` is `http://127.0.0.1:4173`; specs navigate to `/example/index.html`.
Chromium only, to keep CI fast; adding Firefox and WebKit is a one-line
`projects` change if cross-browser coverage is ever wanted.

Scenarios, one per main feature:

1. **Render** — all options present; counter reads `(k of N selected)` for the
   initial `value`.
2. **Filter** — typing hides non-matching rows and keeps matching ones.
3. **Mid-word search** — typing `Accuracy` matches `HeadingAccuracy` and
   `FKAccuracy`. This is the `fullSearchFilter` behavior Observable's default
   filter would miss, verified through the real widget.
4. **All respects the filter** — with a filter active, **All** selects only the
   filtered options and leaves the rest untouched.
5. **None respects the filter** — symmetric; only filtered options are cleared.
6. **Clear search restores rows** — every row visible again, selection unchanged.
7. **Individual toggle** — clicking one checkbox updates `.value` and the counter.
8. **Single event** — one selection change dispatches exactly **one** `input`
   event (regression guard for @357).
9. **Value setter** — assigning `.value` checks the right boxes and updates the counter.
10. **Height** — the checkbox container carries the `max-height` from `height`
    and scrolls.

`example/index.html` therefore needs stable hooks — `#status` (current value) and
`#event-count` (input events received). Both are useful to a human reading the
demo, so they are not test-only scaffolding.

Add an eleventh spec for deviation #6: the counter carries `aria-live="polite"`
and its text updates in place (rather than the node being replaced, which would
not announce).

**Deliberately not tested:** the internals of `@observablehq/inputs`. The e2e
suite asserts our composition, not Observable's components.

## AI-coding readiness harness

Scoped from `autogallery/docs/AI-CODING-READINESS-CHECKLIST.md`. That checklist
says to skip anything that does not earn its keep, so Tier 0 is adopted in full,
Tier 1 selectively, and Tier 2 almost entirely declined — this is a
single-widget library with one maintainer, no server, no user data, and no auth.

### Adopted

| Artifact | Content |
|---|---|
| `CLAUDE.md` | What the project is; build/test/run in one command each; the conventions that matter; **the traps** (below); the guardrails (below); the red→green rule. |
| `AGENTS.md` | Thin cross-vendor pointer to `CLAUDE.md`. |
| `.claude/settings.json` | Committed permissions baseline so every contributor's agent starts the same: allow `npm`, `npx playwright`, `git` read commands, and the local static server. |
| `.mcp.json` | Playwright MCP — this project's actual UI verification loop, so the tool surface is reproducible rather than per-developer. |
| `.github/workflows/ci.yml` | On push and PR: lint → unit → e2e → **build**. The build step runs even when tests pass; it catches import/integration breakage a unit suite cannot. |
| `.github/dependabot.yml` | Weekly npm + GitHub Actions updates. The automated backstop against slopsquatted dependencies. |
| `.github/ISSUE_TEMPLATE/` | `bug_report.md` requiring **repro steps**; `feature_request.md`. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Requires the red-test output and a statement of what was verified. |
| `CHANGELOG.md` | Seeded with the notebook's @357 → @509 history, then Keep-a-Changelog going forward, updated **in the same commit as the change**. |
| ESLint + Prettier | Flat config matching `multi-auto-select`; style is never a review topic. |
| Conventional commits, semver policy | Documented in `CLAUDE.md`: patch = bugfix, minor = new option, major = breaking API change. |

### The traps (the highest-value content in `CLAUDE.md`)

Each states the *mechanism*, not just the rule:

1. **`data[+check.value]` is correct — do not "simplify" it.** `Inputs.checkbox`
   renders `<input value=${i}>` where `i` indexes the *original* `data` array,
   even under `sort`/`unique`. Positional pairing looks cleaner and is wrong.
2. **`evt.stopPropagation()` in the checkbox listener is load-bearing.** Removing
   it makes every selection dispatch two `input` events. This was notebook bug
   @357; e2e spec 8 guards it.
3. **`selected` (a `Map`) is the source of truth, not the DOM.** Reading state
   back out of the checkboxes will desynchronize as soon as a filter is active,
   because filtered-out rows are hidden but still checked.
4. **Search hides rows; it never changes the value.** All/None deliberately act
   on `search.value` — the filtered set — which is the widget's whole purpose.
5. **e2e needs a built `dist/`.** `npm run test:e2e` builds first via Playwright's
   `webServer`; running `npx playwright test` directly against a stale `dist/`
   tests yesterday's code.
6. **UMD bundles `@observablehq/inputs`; ESM does not.** Changing that changes
   whether the CDN `<script>` tag works standalone.

### Guardrails

- **Never hand-edit `dist/`** — it is generated, and gitignored.
- **Do not publish to npm.** Out of scope for this work; the repo is left
  ready to publish.
- No secrets in the repo; nothing here needs any.
- CI YAML passes untrusted values via env vars, never shell interpolation.

### Declined, with reasons

- **`docs/AGENT-NOTES.md`** — would duplicate `CLAUDE.md` and this spec on a repo
  this small. Two overlapping knowledge docs drift apart; one does not.
- **Tier 2 multi-agent, Generator/Evaluator split, risk-tiered approval gates,
  cloud-agent loop scoping** — no keep to earn on a single-widget library.

### Requires the GitHub remote — manual follow-ups, not silently skipped

These cannot be done from a local clone and are listed as explicit post-push
steps in `CLAUDE.md`:

- **CodeQL / code scanning** — a repository-settings toggle.
- **Branch protection** on `main` — require green CI before merge.
- **Backlog in GitHub Issues**, labeled `bug` / `enhancement`.

## Deliverables

- `git init`, initial commit.
- `LICENSE` — MIT, John Alexis Guerra Gómez.
- `README.md` — npm / CDN / Observable usage, options table, the vanilla-JS
  snippet and CodePen link carried over from the notebook, a link back to the
  original notebook, and the @357 → @509 changelog.
- `example/index.html` — demo using the notebook's 87 FIFA-dataset attribute names.
- `.github/workflows/ci.yml` — `npm ci`, `npm run lint`, `npm test`, `npx
  playwright install --with-deps chromium`, `npm run test:e2e`, `npm run build`.
- npm scripts: `lint`, `test` (unit), `test:e2e` (Playwright), `build`, `dev`,
  `prepublishOnly`.
- The AI-coding readiness harness above.

Publishing to npm is **out of scope** for this work — the repo is left ready to
publish, not published. Creating the GitHub remote is likewise out of scope; the
three remote-dependent checklist items are documented as follow-ups.
