/**
 * Pure search predicates, ported from the Observable notebook
 * @john-guerra/search-checkbox@509. No DOM, no dependencies.
 *
 * `fullSearchFilter` is the reason this module exists: Observable's default
 * `Inputs.search` filter only matches at the start of a word, so searching
 * "Accuracy" would miss "HeadingAccuracy". This one matches anywhere a term
 * begins, which is what users expect from a long attribute list.
 *
 * Proposed upstream as https://github.com/observablehq/inputs/pull/226
 */

/** Escape every regex metacharacter so `text` is matched literally. */
export function escapeRegExp(text) {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

/**
 * Build a case-insensitive matcher for one search term. The term may appear
 * *anywhere* in the text, including mid-word: "Accuracy" matches both
 * "HeadingAccuracy" and "FKAccuracy".
 *
 * Observable's own filter is `(?:^|[^\p{L}-])term`, which anchors at the start
 * of a word and so finds neither. The only difference here is `^.*` in place of
 * `^` — and that one change is the reason this widget searches usefully over a
 * long list of concatenated attribute names.
 *
 * Note `^.*` subsumes the `[^\p{L}-]` alternative, leaving that branch
 * unreachable. It is kept verbatim from @509 so the port stays byte-faithful to
 * the notebook and to the upstream PR; do not "clean it up" without changing
 * the tests that pin this behavior.
 */
export function termFilter(term) {
  return new RegExp(`(?:^.*|[^\\p{L}-])${escapeRegExp(term)}`, "iu");
}

/** Yield each own enumerable value of an object. */
export function* valuesof(d) {
  for (const key in d) {
    yield d[key];
  }
}

/**
 * Build a predicate for a whitespace-separated query. Every term must match
 * (AND semantics). For objects, a term matches if it matches any value.
 */
export function fullSearchFilter(query) {
  const filters = `${query}`
    .split(/\s+/g)
    .filter((t) => t)
    .map(termFilter);
  return (d) => {
    if (d == null) return false;
    if (typeof d === "object") {
      out: for (const filter of filters) {
        for (const value of valuesof(d)) {
          if (filter.test(value)) {
            continue out;
          }
        }
        return false;
      }
    } else {
      for (const filter of filters) {
        if (!filter.test(d)) {
          return false;
        }
      }
    }
    return true;
  };
}
