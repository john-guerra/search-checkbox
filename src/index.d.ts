import type {
  escapeRegExp,
  termFilter,
  valuesof,
  fullSearchFilter,
} from "./filter.js";

export interface SearchCheckboxOptions {
  /** Initially selected options. Entries not present in `data` are ignored. */
  value?: readonly unknown[];
  /** Label rendered above the widget, and the search box's accessible name. */
  label?: string;
  /** Max height in px of the scrolling checkbox area. Default 300. */
  height?: number;
  /** Format an option for display. */
  format?: (d: unknown, i: number, data: unknown[]) => unknown;
  /** Replace the options forwarded to `Inputs.checkbox`. */
  optionsCheckboxes?: Record<string, unknown>;
  /** Merged over the default `Inputs.search` options. */
  optionsSearch?: Record<string, unknown>;
  /** Log selection changes to the console. */
  debug?: boolean;
  /** Any other option is forwarded to `Inputs.checkbox`. */
  [key: string]: unknown;
}

export interface SearchCheckboxElement extends HTMLDivElement {
  /**
   * The selected options. Assigning refreshes the checkboxes and the counter
   * but does **not** dispatch an `input` event — only user-driven changes do.
   */
  value: unknown[];
}

/**
 * A search box combined with a checkbox list, for picking from a long list.
 * The All / None buttons act on the currently filtered options.
 *
 * Typed as a callable with properties rather than a `declare function` plus
 * namespace: the helpers are attached as statics on the function at runtime so
 * the UMD global stays directly callable (see the note at the foot of
 * src/index.js), and only this form actually surfaces them on the type.
 */
declare const searchCheckbox: {
  (
    data: Iterable<unknown>,
    options?: SearchCheckboxOptions
  ): SearchCheckboxElement;
  escapeRegExp: typeof escapeRegExp;
  termFilter: typeof termFilter;
  valuesof: typeof valuesof;
  fullSearchFilter: typeof fullSearchFilter;
};

export default searchCheckbox;
