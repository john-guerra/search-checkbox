import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p) =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const readme = read("../README.md");
const { version } = JSON.parse(read("../package.json"));

// The README pins a version and an SRI hash of the *published* bundle for that
// version. Bumping package.json without refreshing both leaves users copying a
// tag that points at the wrong release, or a hash the browser will reject.
test("README CDN snippets pin the current version", () => {
  const pinned = [
    ...readme.matchAll(/search-checkbox@(\d+\.\d+\.\d+)\/dist\//g),
  ].map((m) => m[1]);

  assert.ok(pinned.length > 0, "expected at least one pinned CDN URL");
  for (const p of pinned) {
    assert.equal(
      p,
      version,
      `README pins @${p} but package.json is ${version} — refresh the CDN ` +
        `URLs and recompute the SRI hash (see CLAUDE.md, Releasing)`
    );
  }
});

test("every pinned CDN script tag carries Subresource Integrity", () => {
  const tags = [...readme.matchAll(/<script[^>]*cdn\.jsdelivr[^>]*>/gs)];
  assert.ok(tags.length > 0, "expected CDN script tags in the README");
  for (const [tag] of tags) {
    assert.match(
      tag,
      /integrity="sha384-/,
      `script tag missing integrity: ${tag}`
    );
    assert.match(
      tag,
      /crossorigin="anonymous"/,
      `script tag missing crossorigin: ${tag}`
    );
  }
});
