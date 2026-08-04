import * as Inputs from "@observablehq/inputs";
import { html } from "htl";
import {
  fullSearchFilter,
  termFilter,
  escapeRegExp,
  valuesof,
} from "./filter.js";

// Options the widget consumes itself. Everything else is forwarded to
// Inputs.checkbox, so these must not leak across that boundary.
const WIDGET_ONLY = [
  "height",
  "debug",
  "optionsCheckboxes",
  "optionsSearch",
  "label",
];

function forwardable(options) {
  const rest = { ...options };
  for (const key of WIDGET_ONLY) delete rest[key];
  return rest;
}

/**
 * A search box combined with a checkbox list, for picking from a long list.
 *
 * The All / None buttons act on the *currently filtered* options, not the
 * whole list — that is what this widget adds over a plain Inputs.checkbox.
 *
 * Ported from the Observable notebook @john-guerra/search-checkbox@509.
 *
 * @param {Iterable} data  The selectable options.
 * @param {object} [options]
 * @returns {HTMLDivElement} A node with `.value` that emits `input` events.
 */
export default function searchCheckbox(data, options) {
  options = {
    value: [],
    optionsCheckboxes: undefined,
    format: (d) => d,
    height: 300,
    debug: false,
    ...options,
  };

  // Deviation #3 from @509: merge over the defaults instead of replacing them,
  // so passing `{placeholder}` does not silently cost you the search filter.
  const optionsSearch = {
    format: () => "",
    filter: fullSearchFilter,
    ...options.optionsSearch,
  };

  const debug = options.debug;
  data = Array.from(data);

  const checkboxes = Inputs.checkbox(
    data,
    options.optionsCheckboxes || forwardable(options)
  );
  const search = Inputs.search(data, optionsSearch);

  // a11y: the search input has no visible label of its own — the widget's
  // label sits above the whole control — so give it an accessible name.
  const searchInput = search.querySelector('input[type="search"]');
  if (searchInput && options.label) {
    searchInput.setAttribute("aria-label", `Search ${options.label}`);
  }

  const btnAll = html`<button type="button">All</button>`;
  const btnNone = html`<button type="button">None</button>`;

  // The Map is the source of truth. Reading state back out of the checkboxes
  // would desynchronize as soon as a filter hides selected rows.
  const selected = new Map(Array.from(options.value).map((d) => [d, true]));

  function countSelected() {
    return Array.from(selected.values()).filter(Boolean).length;
  }

  function changeSome(sel, changeTo) {
    for (const o of sel) selected.set(o, changeTo);
  }

  function selectedFromArray(sel) {
    changeSome(data, false);
    changeSome(sel, true);
  }

  function selectedToArray() {
    return Array.from(selected.entries())
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  function counterText() {
    return `(${countSelected()} of ${data.length} selected)`;
  }

  // aria-live so the count is announced; the node is updated in place, since
  // replacing it would not announce (e2e spec 11 guards this).
  // The class is a public hook, not decoration: Inputs.search renders its own
  // <output> for the result count, so `.search-checkbox output` is ambiguous.
  const output = html`<output
    class="search-checkbox-count"
    aria-live="polite"
    style="font-size: 80%; font-style: italic"
    >${counterText()}</output
  >`;

  const list = html`<div
    class="search-checkbox-list"
    style="max-height: ${options.height}px; overflow: auto"
  >
    ${checkboxes}
  </div>`;

  // Deviation #7: a single <div> root rather than htl's DocumentFragment.
  // htl returns a fragment for any multi-root template; a fragment is emptied
  // when appended and has no .style or .offsetHeight, which breaks the
  // documented vanilla-JS usage.
  const component = html`<div class="search-checkbox">
    ${options.label ? html`<label>${options.label}</label>` : ""} ${output}
    <div style="display:flex">
      ${search}
      <div style="margin: 0 5px">${btnAll}</div>
      <div>${btnNone}</div>
    </div>
    ${list}
  </div>`;

  Object.defineProperty(component, "value", {
    get() {
      return selectedToArray();
    },
    set(v) {
      // Deviation #8: refresh the UI, but do NOT dispatch. @509 did neither,
      // leaving the checkboxes stale after a programmatic set. Dispatching here
      // instead would break Inputs.bind, which writes `source.value` and then
      // dispatches on the source itself — every bound change would fire twice.
      // e2e/bind.spec.js guards this.
      selectedFromArray(v);
      render();
    },
  });

  /** Sync the DOM to `selected`. Never dispatches. */
  function render() {
    checkboxes.value = selectedToArray();
    output.textContent = counterText();
    // Deviation #2: force a reflow. Needed when a `format` function sets
    // max-height. In @509 this was `style.zIndex = 1`, a no-op on a fragment.
    void component.offsetHeight;
  }

  /** Sync the DOM and notify listeners. Use for user-driven changes only. */
  function updateValueFromSelected() {
    render();
    if (debug) console.log("searchCheckbox", checkboxes.value);
    component.dispatchEvent(new Event("input", { bubbles: true }));
  }

  btnAll.addEventListener("click", () => {
    changeSome(search.value, true);
    updateValueFromSelected();
  });

  btnNone.addEventListener("click", () => {
    changeSome(search.value, false);
    updateValueFromSelected();
  });

  checkboxes.value = selectedToArray();

  search.addEventListener("input", () => {
    // TRAP: `check.value` is the index into the ORIGINAL `data` array, even
    // under Inputs' `sort`/`unique` (see chooser.js). Do NOT replace this with
    // positional pairing against the rendered rows — that is subtly wrong.
    // The Set hoist keeps this O(n) instead of O(n²) per keystroke.
    const visible = new Set(search.value);
    for (const check of checkboxes.querySelectorAll("input")) {
      check.parentElement.style.display = visible.has(data[+check.value])
        ? "inline-flex"
        : "none";
    }
  });

  checkboxes.addEventListener("input", (evt) => {
    // TRAP: load-bearing. Without this the widget emits two input events per
    // change (notebook bug @357). e2e spec 8 guards it.
    evt.stopPropagation();
    selectedFromArray(checkboxes.value);
    updateValueFromSelected();
  });

  return component;
}

// Attached as statics rather than re-exported as named exports. A module with
// both a default and named exports makes Rollup emit a UMD *namespace object*,
// so `SearchCheckbox(data)` from a <script> tag would not be callable — which
// is the entire point of shipping a UMD bundle. Statics work in both worlds.
searchCheckbox.fullSearchFilter = fullSearchFilter;
searchCheckbox.termFilter = termFilter;
searchCheckbox.escapeRegExp = escapeRegExp;
searchCheckbox.valuesof = valuesof;
