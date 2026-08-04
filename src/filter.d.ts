/** Escape every regex metacharacter so `text` is matched literally. */
export function escapeRegExp(text: string): string;

/**
 * Build a case-insensitive matcher for one search term. The term may appear
 * anywhere in the text, including mid-word.
 */
export function termFilter(term: string): RegExp;

/** Yield each own enumerable value of an object. */
export function valuesof(d: object): Generator<unknown, void, unknown>;

/**
 * Build a predicate for a whitespace-separated query. Every term must match
 * (AND semantics). For objects, a term matches if it matches any value.
 */
export function fullSearchFilter(query: string): (d: unknown) => boolean;
