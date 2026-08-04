import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeRegExp,
  termFilter,
  valuesof,
  fullSearchFilter,
} from "../src/filter.js";

test("escapeRegExp escapes regex metacharacters", () => {
  assert.equal(escapeRegExp("a.b"), "a\\.b");
  assert.equal(escapeRegExp("(x)"), "\\(x\\)");
  assert.equal(escapeRegExp("a+b*c?"), "a\\+b\\*c\\?");
  assert.equal(escapeRegExp("[]{}|^$"), "\\[\\]\\{\\}\\|\\^\\$");
  assert.equal(escapeRegExp("plain"), "plain");
});

test("escapeRegExp output is a literal match, not a pattern", () => {
  // Without escaping, "a.c" would match "abc". With escaping it must not.
  const re = new RegExp(escapeRegExp("a.c"));
  assert.equal(re.test("abc"), false);
  assert.equal(re.test("a.c"), true);
});

test("termFilter matches at the start of a string", () => {
  assert.equal(termFilter("Head").test("HeadingAccuracy"), true);
});

test("termFilter matches after a non-letter", () => {
  assert.equal(termFilter("Clause").test("Release Clause"), true);
  assert.equal(termFilter("Logo").test("Club Logo"), true);
});

test("termFilter is case-insensitive", () => {
  assert.equal(termFilter("head").test("HeadingAccuracy"), true);
  assert.equal(termFilter("HEAD").test("HeadingAccuracy"), true);
});

test("termFilter matches mid-word — this is the whole point", () => {
  // Observable's default search filter anchors with (?:^|[^\p{L}-]), so it
  // finds neither of these. Ours uses (?:^.*|...), which matches anywhere.
  // Searching a long attribute list for "Accuracy" must surface both.
  assert.equal(termFilter("Accuracy").test("HeadingAccuracy"), true);
  assert.equal(termFilter("Accuracy").test("FKAccuracy"), true);
  assert.equal(termFilter("ing").test("HeadingAccuracy"), true);
});

test("termFilter still rejects a term that is genuinely absent", () => {
  assert.equal(termFilter("Goalkeeper").test("HeadingAccuracy"), false);
  assert.equal(termFilter("zzz").test("Release Clause"), false);
});

test("valuesof yields every own enumerable value", () => {
  assert.deepEqual([...valuesof({ a: 1, b: "two" })], [1, "two"]);
  assert.deepEqual([...valuesof({})], []);
});

test("fullSearchFilter matches a single term", () => {
  const match = fullSearchFilter("Club");
  assert.equal(match("Club Logo"), true);
  assert.equal(match("Nationality"), false);
});

test("fullSearchFilter requires every term (AND semantics)", () => {
  const match = fullSearchFilter("Club Logo");
  assert.equal(match("Club Logo"), true);
  assert.equal(match("Club"), false);
});

test("fullSearchFilter ignores extra whitespace", () => {
  const match = fullSearchFilter("  Club   Logo  ");
  assert.equal(match("Club Logo"), true);
});

test("fullSearchFilter searches object values", () => {
  const match = fullSearchFilter("Messi");
  assert.equal(match({ name: "Messi", club: "Inter Miami" }), true);
  assert.equal(match({ name: "Mbappe", club: "Real Madrid" }), false);
});

test("fullSearchFilter rejects null and undefined", () => {
  const match = fullSearchFilter("anything");
  assert.equal(match(null), false);
  assert.equal(match(undefined), false);
});

test("fullSearchFilter with an empty query matches everything", () => {
  const match = fullSearchFilter("");
  assert.equal(match("whatever"), true);
});
