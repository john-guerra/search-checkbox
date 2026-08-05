# search-checkbox 🔎☑

A [reactive widget](https://reactivewidgets.org) that pairs a search box with a
checkbox list, for selecting from a long list of options.

Its reason to exist: **All / None act on the options currently matching the
search**, not on the whole list. That turns "select the twelve goalkeeping
attributes out of these eighty-eight" into two actions instead of twelve.

- [Try the demo](https://github.com/john-guerra/search-checkbox/blob/main/example/index.html) — run `npx http-server .` and open it
- [The original Observable notebook](https://observablehq.com/@john-guerra/search-checkbox)
- [CodePen example](https://codepen.io/duto_guerra/pen/gOWMxmM)

## Install

```sh
npm install @john-guerra/search-checkbox
```

Or from a CDN. The UMD bundle inlines its dependencies, so this one tag is all
you need:

```html
<!-- integrity hash added at first npm publish -->
<script src="https://cdn.jsdelivr.net/npm/@john-guerra/search-checkbox@0.1.0/dist/SearchCheckbox.min.js"></script>
```

Pin the version and add `integrity`/`crossorigin` once published — an unpinned,
unverified CDN tag is a supply-chain hole.

Observable Inputs ships its own stylesheet. Without it the widget works but
looks unstyled:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@observablehq/inputs@0.12/dist/index.css"
  integrity="sha384-2Rrhg9mYHabUfNPNAJlfwvKrGsf0pHEBlahVJQEFOyqoVUqB2qgLnFizfFMPX9JO"
  crossorigin="anonymous"
/>
```

## Usage

### ES modules

```js
import searchCheckbox from "@john-guerra/search-checkbox";

const widget = searchCheckbox(["Crossing", "Finishing", "HeadingAccuracy"], {
  label: "Attributes",
  value: ["Crossing"],
  height: 200,
});

widget.addEventListener("input", () => console.log(widget.value));
document.body.append(widget);
```

### Vanilla JS

```html
<div id="target"></div>
<label>You selected: <output id="output"></output></label>

<!-- integrity hash added at first npm publish -->
<script src="https://cdn.jsdelivr.net/npm/@john-guerra/search-checkbox@0.1.0/dist/SearchCheckbox.min.js"></script>
<script>
  const widget = SearchCheckbox([1, 2, 3, 4]);
  document.querySelector("#target").append(widget);

  const show = () => (document.querySelector("#output").value = widget.value);
  widget.addEventListener("input", show);
  show();
</script>
```

### Observable

```js
import { default as searchCheckbox } from "@john-guerra/search-checkbox";
```

```js
viewof selected = searchCheckbox(data, { label: "Variables", value: data })
```

### Binding to another input

```js
import * as Inputs from "@observablehq/inputs";

const source = searchCheckbox(data, { label: "Skills" });
const target = Inputs.checkbox(data);

// Outside Observable, pass a never-resolving invalidation. Inputs.bind
// defaults it to disposal(target), which resolves immediately when the element
// is not inside an `.observablehq` cell — and on resolution bind tears down the
// source→target direction.
Inputs.bind(target, source, new Promise(() => {}));
```

See [`example/bind.html`](https://github.com/john-guerra/search-checkbox/blob/main/example/bind.html) for a working page.

## API

```js
searchCheckbox(data, options);
```

`data` is any iterable of options. Returns a `<div class="search-checkbox">`
element with a `.value` property and an `input` event.

| Option              | Default  | Meaning                                                        |
| ------------------- | -------- | -------------------------------------------------------------- |
| `value`             | `[]`     | Initially selected options. Entries not in `data` are ignored. |
| `label`             | —        | Label above the widget; also the search box's accessible name. |
| `height`            | `300`    | Max height in px of the scrolling checkbox area.               |
| `format`            | `d => d` | Format an option for display.                                  |
| `optionsCheckboxes` | —        | Replace the options forwarded to `Inputs.checkbox`.            |
| `optionsSearch`     | —        | Merged over the default `Inputs.search` options.               |
| `debug`             | `false`  | Log selection changes to the console.                          |

Any other option is forwarded to `Inputs.checkbox`.

**`.value`** — get the array of selected options, or assign one. Assigning
refreshes the checkboxes and the counter but does **not** fire an `input` event;
only user actions do. That is what keeps `Inputs.bind` from double-firing.

**`input` event** — dispatched on every user-driven selection change, exactly
once. Typing in the search box does not fire it, because searching changes what
is visible, not what is selected.

### Search behavior

The search matches a term **anywhere** in the text, including mid-word: typing
`Accuracy` finds both `HeadingAccuracy` and `FKAccuracy`. Observable's default
search filter anchors at word start and finds neither. That filter is exported
separately if you want it elsewhere:

```js
import { fullSearchFilter } from "@john-guerra/search-checkbox/filter";
```

Multiple whitespace-separated terms are ANDed.

## Differences from the notebook

This is a behavior-faithful port of
[`@john-guerra/search-checkbox@509`](https://observablehq.com/@john-guerra/search-checkbox).
Ten intentional differences, none of which change how the widget looks:

1. Filtering is O(n) per keystroke instead of O(n²).
2. The reflow after a change uses `offsetHeight` rather than a stray `z-index`.
3. `optionsSearch` merges with the defaults instead of replacing them, so
   setting a placeholder no longer disables the search filter.
4. Widget-only options no longer leak into `Inputs.checkbox`.
5. Notebook globals are real imports.
6. The counter announces to screen readers; the search input has an accessible
   name.
7. Returns a single `<div>` rather than a `DocumentFragment` — the notebook's
   return value was emptied when appended, so it could not be re-appended,
   styled, or measured.
8. Assigning `.value` refreshes the display. The notebook updated internal state
   only, leaving the checkboxes stale.
9. Typing in the search box no longer leaks an `input` event to consumers.
10. Options outside `data` are ignored rather than inflating the counter
    forever — `value: ["A","B","C"]` on a two-option widget used to read
    `(3 of 2 selected)`.

Full rationale in
[`docs/superpowers/specs/`](https://github.com/john-guerra/search-checkbox/blob/main/docs/superpowers/specs/2026-08-04-search-checkbox-port-design.md).

## Development

```sh
npm ci
npm run lint          # ESLint + Prettier
npm test              # unit tests for the search filters
npm run typecheck     # tsc over the declarations
npm run test:e2e      # Playwright, Chromium — builds dist/ first
npm run build         # rollup → dist/
```

Contributors and agents: read [`CLAUDE.md`](https://github.com/john-guerra/search-checkbox/blob/main/CLAUDE.md) first. It documents the
ten traps in this codebase — several lines look like bugs and are not — and the
mandatory red→green test discipline.

## License

MIT © John Alexis Guerra Gómez
