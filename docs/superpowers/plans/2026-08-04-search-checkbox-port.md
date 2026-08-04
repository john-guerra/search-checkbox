# search-checkbox Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Observable notebook `@john-guerra/search-checkbox@509` into a standalone, tested, publishable npm package in the reactivewidgets.org family.

**Architecture:** Two source units with one boundary — `src/filter.js` holds pure, DOM-free search predicates (unit tested with `node --test`), and `src/index.js` composes `Inputs.checkbox` + `Inputs.search` into the widget (verified end-to-end in a real browser with Playwright). Rollup emits a self-contained UMD bundle for CDN/CodePen use and an ESM bundle with dependencies left external.

**Tech Stack:** `@observablehq/inputs@^0.12`, `htl@^0.3`, Rollup 4, Playwright (Chromium), ESLint 9 flat config, Prettier 3, `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-04-search-checkbox-port-design.md`

## Global Constraints

- Package name is exactly `@john-guerra/search-checkbox`. UMD global is `SearchCheckbox`. Bundle basename is `SearchCheckbox`.
- Node 20+ (`node --test` and CI both assume it).
- Public API must not change from @509: `searchCheckbox(data, options)` returning a node with a `.value` getter/setter that dispatches a bubbling `input` event.
- **Strict red → green.** Write the test, run it, confirm it fails for the right reason, then implement. Never edit a test to make it pass.
- Every deviation from @509 must preserve visible behavior and be listed in `CLAUDE.md`.
- `dist/` is generated and gitignored — never hand-edit, never commit.
- Author: `John Alexis Guerra Gómez`. License: MIT.
- Conventional commit messages. Commit at the end of every task.

## Spec amendment discovered during planning

**Deviation #7 — the widget returns a single `<div>` root, not a DocumentFragment.**

Verified against `htl@0.3` source (`src/index.js:14-15`): `html` returns a
`DocumentFragment` whenever the template has more than one root node. The @509
component template has four roots (label, output, search row, checkbox box), so
`searchCheckbox()` in the notebook returns a fragment. Consequences:

- `component.style.zIndex = 1` in @509 is a **silent no-op** — fragments have no
  `.style`. The relayout hack never actually did anything.
- `append(component)` **empties** the fragment, so the node cannot be re-appended
  and has no `offsetHeight`, `classList`, or `style` afterwards.

This breaks the vanilla-JS/CodePen usage the spec's §5 exists to support. The port
therefore wraps the contents in one `<div class="search-checkbox">`. This adds a
block-level wrapper to the DOM but does not change the visual result — the same
children render in the same order — and it makes deviation #2's reflow actually
work. It also gives users a CSS hook, matching `multi-auto-select`'s
`.multi-auto-select` class.

## File Structure

| File | Responsibility |
|---|---|
| `src/filter.js` | Pure predicates: `escapeRegExp`, `termFilter`, `valuesof`, `fullSearchFilter`. No DOM, no imports. |
| `src/index.js` | The widget. The only file that touches the DOM or `@observablehq/inputs`. |
| `src/index.d.ts` | Public types for both modules. |
| `test/filter.test.js` | `node --test` unit tests for `src/filter.js`. |
| `e2e/search-checkbox.spec.js` | Playwright specs driving `example/index.html`. |
| `example/index.html` | Human demo **and** e2e fixture. Exposes `#status` and `#event-count`. |
| `rollup.config.js` | UMD (deps bundled) + UMD min + ESM (deps external). |
| `playwright.config.js` | `webServer` builds `dist/` then serves the repo root. |
| `CLAUDE.md` | Agent guide: build/test/run, conventions, the six traps, guardrails. |

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `LICENSE`, `.npmignore`, `eslint.config.js`, `.prettierrc`
- Modify: `.gitignore` (already exists from the spec commit)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` as the only entry points every later task uses. Committed `package-lock.json`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@john-guerra/search-checkbox",
  "version": "0.1.0",
  "description": "A reactive widget combining a search box with checkboxes, for selecting from long lists. Select all/none respects the active filter.",
  "keywords": ["observable", "observablehq", "inputs", "checkbox", "search", "reactive-widgets", "widget"],
  "license": "MIT",
  "author": { "name": "John Alexis Guerra Gómez", "url": "https://johnguerra.co" },
  "homepage": "https://github.com/john-guerra/search-checkbox",
  "repository": { "type": "git", "url": "git+https://github.com/john-guerra/search-checkbox.git" },
  "bugs": { "url": "https://github.com/john-guerra/search-checkbox/issues" },
  "type": "module",
  "main": "src/index.js",
  "module": "src/index.js",
  "types": "src/index.d.ts",
  "browser": "dist/SearchCheckbox.min.js",
  "unpkg": "dist/SearchCheckbox.min.js",
  "jsdelivr": "dist/SearchCheckbox.min.js",
  "exports": {
    ".": {
      "types": "./src/index.d.ts",
      "umd": "./dist/SearchCheckbox.min.js",
      "import": "./src/index.js",
      "default": "./src/index.js"
    },
    "./filter": { "import": "./src/filter.js", "default": "./src/filter.js" },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "files": ["src/**/*.js", "src/**/*.d.ts", "dist/**/*.js"],
  "scripts": {
    "lint": "eslint src test e2e && prettier --check .",
    "format": "prettier --write .",
    "test": "node --test test/",
    "test:e2e": "playwright test",
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@observablehq/inputs": "^0.12.0",
    "htl": "^0.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@rollup/plugin-commonjs": "^28.0.1",
    "@rollup/plugin-node-resolve": "^15.3.0",
    "@rollup/plugin-terser": "^0.4.4",
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "globals": "^15.14.0",
    "http-server": "^14.1.1",
    "prettier": "^3.4.2",
    "rollup": "^4.28.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: Write `LICENSE`**

MIT, copied from `/Users/aguerra/workspace/multi-auto-select/LICENSE`, with the copyright line:

```
Copyright (c) 2026 John Alexis Guerra Gómez
```

- [ ] **Step 3: Write `eslint.config.js`**

```js
import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  { ignores: ["dist/", "node_modules/", "playwright-report/", "test-results/"] },
];
```

- [ ] **Step 4: Write `.prettierrc` and `.npmignore`**

`.prettierrc`:

```json
{ "printWidth": 80, "trailingComma": "es5" }
```

`.npmignore` (belt and braces — the `files` field already restricts the tarball):

```
example/
e2e/
docs/
test/
.claude/
.github/
.mcp.json
playwright.config.js
eslint.config.js
CLAUDE.md
AGENTS.md
```

- [ ] **Step 5: Install and verify the toolchain**

Run: `npm install`
Expected: creates `package-lock.json`, exits 0.

Run: `npx eslint --version && npx prettier --version && npx rollup --version`
Expected: all three print versions.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json LICENSE eslint.config.js .prettierrc .npmignore
git commit -m "chore: scaffold package, lint, and format tooling"
```

---

### Task 2: Pure filter module (red → green)

**Files:**
- Create: `test/filter.test.js`, `src/filter.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `escapeRegExp(text: string) => string`
  - `termFilter(term: string) => RegExp`
  - `valuesof(d: object) => Generator<unknown>`
  - `fullSearchFilter(query: string) => (d: unknown) => boolean`

  All are **named** exports of `src/filter.js`. Task 4 imports `fullSearchFilter` from `./filter.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/filter.test.js`:

```js
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

test("termFilter does not match mid-word", () => {
  // "ing" sits inside "Heading", preceded by a letter — must not match.
  assert.equal(termFilter("ing").test("HeadingAccuracy"), false);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/filter.js'`. Confirm the failure is the missing module, not a typo in the test file. **Paste this red output into the PR.**

- [ ] **Step 3: Write `src/filter.js`**

```js
/**
 * Pure search predicates, ported verbatim from the Observable notebook
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
 * Build a case-insensitive matcher for one search term. The term must appear
 * at the start of the string or immediately after a non-letter — so "Clause"
 * matches "Release Clause", but "ing" does not match "HeadingAccuracy".
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 13 tests.

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/filter.js test/filter.test.js
git commit -m "feat: add pure search filter predicates with unit tests"
```

---

### Task 3: Demo page, build config, and e2e specs (red)

This task produces the *failing* browser suite. `src/index.js` does not exist yet, so the build fails and every spec fails — that is the point.

**Files:**
- Create: `example/index.html`, `rollup.config.js`, `playwright.config.js`, `e2e/search-checkbox.spec.js`

**Interfaces:**
- Consumes: `src/filter.js` (indirectly, via the widget).
- Produces: the DOM contract every later task must satisfy —
  - `SearchCheckbox(data, options)` on `window` from the UMD bundle
  - demo mount points `#demo`, readouts `#status` and `#event-count`
  - widget root `.search-checkbox`, counter `output`, buttons with text `All`/`None`, search `input[type=search]`, checkbox rows `label` inside `.search-checkbox-list`

- [ ] **Step 1: Write `rollup.config.js`**

```js
import { readFileSync } from "fs";
import node from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import meta from "./package.json" with { type: "json" };

const copyrights = readFileSync("./LICENSE", "utf-8")
  .split(/\n/g)
  .filter((line) => /^copyright\s+/i.test(line))
  .map((line) => line.replace(/^copyright\s+/i, ""));

const filename = "SearchCheckbox";
const banner = `// ${meta.name} v${meta.version} Copyright ${copyrights.join(", ")}`;

const base = {
  input: "src/index.js",
  output: { indent: false, banner, extend: true, name: filename },
  plugins: [commonjs(), node()],
};

// UMD bundles @observablehq/inputs and htl so a single <script> tag works
// standalone on CodePen. ESM leaves them external so bundlers can dedupe.
const external = ["@observablehq/inputs", "htl"];
const globals = { "@observablehq/inputs": "Inputs", htl: "htl" };

export default [
  {
    ...base,
    output: { ...base.output, format: "umd", file: `dist/${filename}.js` },
  },
  {
    ...base,
    output: { ...base.output, format: "umd", file: `dist/${filename}.min.js` },
    plugins: [...base.plugins, terser({ output: { preamble: banner } })],
  },
  {
    ...base,
    external,
    output: {
      ...base.output,
      format: "esm",
      file: `dist/${filename}.esm.js`,
      globals,
    },
  },
];
```

- [ ] **Step 2: Write `example/index.html`**

`#status` and `#event-count` are genuinely useful to a human reading the demo, and double as the e2e assertions' read-out.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>search-checkbox — demo</title>
    <!--
      Served from node_modules, not a CDN. Two reasons: this page is also the
      e2e fixture, and a network fetch is a CI flake source; and a CDN <link>
      with no Subresource Integrity is a supply-chain hole.
    -->
    <link
      rel="stylesheet"
      href="../node_modules/@observablehq/inputs/dist/index.css"
    />
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 2rem;
        max-width: 760px;
      }
      section {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.5rem;
      }
      h2 {
        margin: 0 0 0.25rem;
        font-size: 1rem;
      }
      .hint {
        color: #666;
        font-size: 0.85rem;
        margin: 0 0 0.75rem;
      }
      .readout {
        font: 13px ui-monospace, monospace;
        color: #444;
        margin-top: 0.75rem;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <h1>search-checkbox 🔎☑</h1>
    <p class="hint">
      Type to filter. <b>All</b> and <b>None</b> apply to the
      <i>currently filtered</i> options only — that is the whole point of this
      widget. Try typing <code>Accuracy</code>, then clicking <b>None</b>.
    </p>

    <section>
      <h2>FIFA player attributes</h2>
      <div id="demo"></div>
      <div class="readout">selected: <span id="status"></span></div>
      <div class="readout">input events: <span id="event-count">0</span></div>
    </section>

    <script src="../dist/SearchCheckbox.js"></script>
    <script>
      const DATA = [
        "ID", "Name", "Age", "Photo", "Nationality", "Flag", "Overall",
        "Potential", "Club", "Club Logo", "Value", "Wage", "Special",
        "Preferred Foot", "International Reputation", "Weak Foot",
        "Skill Moves", "Work Rate", "Body Type", "Real Face", "Position",
        "Jersey Number", "Joined", "Loaned From", "Contract Valid Until",
        "Height", "Weight", "LS", "ST", "RS", "LW", "LF", "CF", "RF", "RW",
        "LAM", "CAM", "RAM", "LM", "LCM", "CM", "RCM", "RM", "LWB", "LDM",
        "CDM", "RDM", "RWB", "LB", "LCB", "CB", "RCB", "RB", "Crossing",
        "Finishing", "HeadingAccuracy", "ShortPassing", "Volleys",
        "Dribbling", "Curve", "FKAccuracy", "LongPassing", "BallControl",
        "Acceleration", "SprintSpeed", "Agility", "Reactions", "Balance",
        "ShotPower", "Jumping", "Stamina", "Strength", "LongShots",
        "Aggression", "Interceptions", "Positioning", "Vision", "Penalties",
        "Composure", "Marking", "StandingTackle", "SlidingTackle",
        "GKDiving", "GKHandling", "GKKicking", "GKPositioning", "GKReflexes",
        "Release Clause",
      ];

      const widget = SearchCheckbox(DATA, {
        label: "Variables",
        value: ["Name", "Age", "Club"],
        height: 200,
      });

      let events = 0;
      const status = document.getElementById("status");
      const counter = document.getElementById("event-count");

      widget.addEventListener("input", () => {
        events += 1;
        counter.textContent = String(events);
        status.textContent = widget.value.join(", ");
      });

      document.getElementById("demo").append(widget);
      status.textContent = widget.value.join(", ");
    </script>
  </body>
</html>
```

- [ ] **Step 3: Write `playwright.config.js`**

```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Always rebuild before serving, so e2e can never test a stale dist/.
  webServer: {
    command: "npm run build && npx http-server . -p 4173 --silent -c-1",
    url: "http://127.0.0.1:4173/example/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Write `e2e/search-checkbox.spec.js`**

```js
import { test, expect } from "@playwright/test";

const TOTAL = 87; // DATA.length in example/index.html
const INITIAL = ["Name", "Age", "Club"];

test.beforeEach(async ({ page }) => {
  await page.goto("/example/index.html");
  await expect(page.locator(".search-checkbox")).toBeVisible();
});

/** Rows that are actually visible (search hides the rest with display:none). */
function visibleRows(page) {
  return page.locator(".search-checkbox-list label:visible");
}

function searchBox(page) {
  return page.locator('.search-checkbox input[type="search"]');
}

test("1. renders every option and the initial counter", async ({ page }) => {
  await expect(page.locator(".search-checkbox-list label")).toHaveCount(TOTAL);
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(${INITIAL.length} of ${TOTAL} selected)`
  );
  await expect(page.locator("#status")).toHaveText(INITIAL.join(", "));
});

test("2. typing filters the visible rows", async ({ page }) => {
  await searchBox(page).fill("Club");
  // "Club" and "Club Logo"
  await expect(visibleRows(page)).toHaveCount(2);
  await expect(visibleRows(page).first()).toContainText("Club");
});

test("3. search matches mid-string, not just at word start", async ({ page }) => {
  await searchBox(page).fill("Accuracy");
  // HeadingAccuracy and FKAccuracy — Observable's default filter finds neither.
  await expect(visibleRows(page)).toHaveCount(2);
  const texts = await visibleRows(page).allInnerTexts();
  expect(texts.join(" ")).toContain("HeadingAccuracy");
  expect(texts.join(" ")).toContain("FKAccuracy");
});

test("4. All selects only the filtered options", async ({ page }) => {
  await searchBox(page).fill("Accuracy");
  await page.getByRole("button", { name: "All" }).click();
  // The 3 initial selections survive, plus the 2 filtered ones.
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(5 of ${TOTAL} selected)`
  );
  const status = await page.locator("#status").innerText();
  expect(status).toContain("HeadingAccuracy");
  expect(status).toContain("FKAccuracy");
  expect(status).toContain("Name"); // untouched by the filter
});

test("5. None deselects only the filtered options", async ({ page }) => {
  await searchBox(page).fill("Club");
  await page.getByRole("button", { name: "None" }).click();
  // "Club" was selected initially; "Name" and "Age" are outside the filter.
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(2 of ${TOTAL} selected)`
  );
  const status = await page.locator("#status").innerText();
  expect(status).not.toContain("Club");
  expect(status).toContain("Name");
  expect(status).toContain("Age");
});

test("6. clearing the search restores every row", async ({ page }) => {
  await searchBox(page).fill("Accuracy");
  await expect(visibleRows(page)).toHaveCount(2);
  await searchBox(page).fill("");
  await expect(visibleRows(page)).toHaveCount(TOTAL);
  // Searching never changes the value.
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(${INITIAL.length} of ${TOTAL} selected)`
  );
});

test("7. clicking one checkbox updates value and counter", async ({ page }) => {
  await page.locator(".search-checkbox-list label").filter({ hasText: "Overall" }).locator("input").check();
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(4 of ${TOTAL} selected)`
  );
  await expect(page.locator("#status")).toContainText("Overall");
});

test("8. one change dispatches exactly one input event", async ({ page }) => {
  await expect(page.locator("#event-count")).toHaveText("0");
  await page.locator(".search-checkbox-list label").filter({ hasText: "Overall" }).locator("input").check();
  await expect(page.locator("#event-count")).toHaveText("1");
  await page.locator(".search-checkbox-list label").filter({ hasText: "Potential" }).locator("input").check();
  await expect(page.locator("#event-count")).toHaveText("2");
});

test("9. the value setter checks the right boxes", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector(".search-checkbox").value = ["Vision", "Balance"];
  });
  await expect(page.locator(".search-checkbox output")).toHaveText(
    `(2 of ${TOTAL} selected)`
  );
  const checked = await page.evaluate(() =>
    document.querySelector(".search-checkbox").value
  );
  expect(checked.sort()).toEqual(["Balance", "Vision"]);
});

test("10. the checkbox list scrolls at the configured height", async ({ page }) => {
  const box = page.locator(".search-checkbox-list");
  await expect(box).toHaveCSS("max-height", "200px");
  await expect(box).toHaveCSS("overflow", "auto");
});

test("11. the counter is announced to assistive technology", async ({ page }) => {
  const output = page.locator(".search-checkbox output");
  await expect(output).toHaveAttribute("aria-live", "polite");
  // The node must be updated in place; replacing it would not announce.
  const before = await output.elementHandle();
  await page.locator(".search-checkbox-list label").filter({ hasText: "Overall" }).locator("input").check();
  const after = await output.elementHandle();
  expect(await before.evaluate((a, b) => a === b, after)).toBe(true);
});
```

- [ ] **Step 5: Run the suite to verify it fails**

Run: `npx playwright install --with-deps chromium` (once per machine)
Run: `npm run test:e2e`
Expected: FAIL. The `webServer` command runs `npm run build`, which fails with `Could not resolve entry module "src/index.js"`. **Paste this red output into the PR.**

- [ ] **Step 6: Commit**

```bash
git add rollup.config.js playwright.config.js example/index.html e2e/search-checkbox.spec.js
git commit -m "test: add failing e2e suite, demo fixture, and build config"
```

---

### Task 4: The widget (green)

**Files:**
- Create: `src/index.js`

**Interfaces:**
- Consumes: `fullSearchFilter` from `./filter.js`; `Inputs.checkbox` / `Inputs.search` from `@observablehq/inputs`; `html` from `htl`.
- Produces: `export default function searchCheckbox(data, options)` returning an `HTMLDivElement` with `.value` (get/set, `Array`) that dispatches a bubbling `input` event.

- [ ] **Step 1: Write `src/index.js`**

```js
import * as Inputs from "@observablehq/inputs";
import { html } from "htl";
import { fullSearchFilter } from "./filter.js";

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
  const output = html`<output
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
  // A fragment is emptied when appended and has no .style or .offsetHeight,
  // which breaks the documented vanilla-JS usage.
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
      selectedFromArray(v);
      updateValueFromSelected();
    },
  });

  function updateValueFromSelected() {
    checkboxes.value = selectedToArray();
    if (debug) console.log("searchCheckbox", checkboxes.value);
    output.textContent = counterText();
    component.dispatchEvent(new Event("input", { bubbles: true }));
    // Deviation #2: force a reflow. Needed when a `format` function sets
    // max-height. In @509 this was `style.zIndex = 1`, a no-op on a fragment.
    void component.offsetHeight;
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

export { fullSearchFilter, termFilter, escapeRegExp, valuesof } from "./filter.js";
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e`
Expected: 11 passed.

If spec 2 or 3 fails on row counts, check that `visibleRows` matches how
`Inputs.checkbox` nests its `<label>` elements — adjust the *selector helper*,
never the assertion.

- [ ] **Step 3: Run the full gate**

Run: `npm test && npm run lint && npm run build`
Expected: all exit 0; `dist/` contains three bundles.

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "feat: port searchCheckbox widget from Observable notebook @509"
```

---

### Task 5: TypeScript declarations

**Files:**
- Create: `src/index.d.ts`, `src/filter.d.ts`

**Interfaces:**
- Consumes: the runtime signatures from Tasks 2 and 4.
- Produces: `SearchCheckboxOptions` and `SearchCheckboxElement` types.

- [ ] **Step 1: Write `src/index.d.ts`**

```ts
export interface SearchCheckboxOptions {
  /** Initially selected options. */
  value?: unknown[];
  /** Label rendered above the widget. */
  label?: string;
  /** Max height in px of the scrolling checkbox area. Default 300. */
  height?: number;
  /** Format an option for display. */
  format?: (d: unknown, i: number, data: unknown[]) => unknown;
  /** Replace the options forwarded to Inputs.checkbox. */
  optionsCheckboxes?: Record<string, unknown>;
  /** Merged over the default Inputs.search options. */
  optionsSearch?: Record<string, unknown>;
  /** Log selection changes to the console. */
  debug?: boolean;
  [key: string]: unknown;
}

export interface SearchCheckboxElement extends HTMLDivElement {
  value: unknown[];
}

export default function searchCheckbox(
  data: Iterable<unknown>,
  options?: SearchCheckboxOptions
): SearchCheckboxElement;

export { escapeRegExp, termFilter, valuesof, fullSearchFilter } from "./filter.js";
```

- [ ] **Step 2: Write `src/filter.d.ts`**

```ts
export function escapeRegExp(text: string): string;
export function termFilter(term: string): RegExp;
export function valuesof(d: object): Generator<unknown, void, unknown>;
export function fullSearchFilter(query: string): (d: unknown) => boolean;
```

- [ ] **Step 3: Verify the declarations resolve**

Run: `npx --yes tsc --noEmit --allowJs false src/index.d.ts src/filter.d.ts`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add src/index.d.ts src/filter.d.ts
git commit -m "feat: add TypeScript declarations"
```

---

### Task 6: AI-coding readiness harness

**Files:**
- Create: `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.mcp.json`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the trap list from the spec and the scripts from Task 1.
- Produces: nothing code depends on.

- [ ] **Step 1: Write `CLAUDE.md`**

Must contain, in this order:

1. **What this is** — one paragraph, plus a pointer to the spec and the original notebook.
2. **Build / test / run**, one command each: `npm test`, `npm run test:e2e`, `npm run build`, `npm run lint`, `npx http-server . -p 4173` then open `/example/index.html`.
3. **The six traps**, each stating the *mechanism*, copied from the spec's "The traps" section:
   - `data[+check.value]` is correct — do not "simplify" it.
   - `evt.stopPropagation()` in the checkbox listener is load-bearing (@357).
   - `selected` (a `Map`) is the source of truth, not the DOM.
   - Search hides rows; it never changes the value.
   - e2e needs a built `dist/`.
   - UMD bundles `@observablehq/inputs`; ESM does not.
4. **Guardrails** — never hand-edit `dist/`; do not publish to npm; no secrets.
5. **Red → green is mandatory.** Write the failing test, run it, paste the red output, then implement. Never edit a test to make it pass.
6. **Conventions** — conventional commits; semver policy (patch = bugfix, minor = new option, major = breaking API change); update `CHANGELOG.md` in the same commit as the change.
7. **Remote follow-ups still open** — CodeQL, branch protection, Issues grooming.

- [ ] **Step 2: Write `AGENTS.md`**

```markdown
# AGENTS.md

This repository's agent guide lives in [`CLAUDE.md`](./CLAUDE.md). It covers the
build/test/run commands, the six non-obvious traps in this codebase, the
guardrails, and the mandatory red→green test discipline.

Read it before making changes.
```

- [ ] **Step 3: Write `.claude/settings.json`**

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm ci:*)",
      "Bash(npm install:*)",
      "Bash(npx playwright:*)",
      "Bash(npx http-server:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)"
    ]
  }
}
```

- [ ] **Step 4: Write `.mcp.json`**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

- [ ] **Step 5: Write `CHANGELOG.md`**

Keep a Changelog format. Seed `## [Unreleased]` with the port, then carry the
notebook history verbatim under a `## Notebook history (Observable)` heading:

```
* @507 Nov 18, 2024 — Bugfix when using max-height and format
* @459 Jan 30, 2023 — Adding a height parameter
* @433 Jan 30, 2023 — Reorganizing all/none buttons and add count of selected elements
* @357 Oct 12, 2022 — Bugfix multiple input events were triggered
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md AGENTS.md CHANGELOG.md .claude/settings.json .mcp.json
git commit -m "docs: add agent guide, changelog, and committed agent/MCP config"
```

---

### Task 7: CI and GitHub automation

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`

**Interfaces:**
- Consumes: the npm scripts from Task 1.
- Produces: green CI as the definition of done.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      # Build runs even when tests pass: it catches import/integration
      # breakage a unit suite cannot see.
      - run: npm run build
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

- [ ] **Step 3: Write the issue templates**

`.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Something behaves incorrectly
labels: bug
---

## What happened

## What you expected

## Steps to reproduce

1.
2.
3.

## Environment

- search-checkbox version:
- Browser / Node version:
- Used via: npm / CDN `<script>` / Observable

## Minimal reproduction

A CodePen, a snippet, or the option object you passed.
```

`.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature request
about: Suggest an option or behavior
labels: enhancement
---

## What problem does this solve

## Proposed API

## Alternatives considered
```

- [ ] **Step 4: Write `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## What changed

## Why

## Verification

- [ ] Wrote the test first and **confirmed it failed** — red output pasted below
- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `CHANGELOG.md` updated in this same commit

<details><summary>Red test output</summary>

```
paste here
```

</details>
```

- [ ] **Step 5: Verify CI passes**

```bash
git add .github
git commit -m "ci: add test/build workflow, dependabot, issue and PR templates"
git push -u origin main
gh run watch
```

Expected: the CI run completes green.

---

### Task 8: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the final API from Tasks 4 and 5.
- Produces: nothing code depends on.

- [ ] **Step 1: Write `README.md`**

Sections, in order:

1. Title `# search-checkbox 🔎☑` and a one-line description, with a
   "[reactive widget](https://reactivewidgets.org)" link matching how
   `multi-auto-select` opens.
2. Links: the original Observable notebook, the CodePen, and the demo page.
3. **Install** — `npm i @john-guerra/search-checkbox`, and the CDN tag, with a
   note that the UMD bundle is self-contained. Pin the version and include
   Subresource Integrity, so a CDN compromise cannot silently swap the bundle:

   ```html
   <script
     src="https://cdn.jsdelivr.net/npm/@john-guerra/search-checkbox@0.1.0/dist/SearchCheckbox.min.js"
     integrity="sha384-REPLACE_AFTER_PUBLISH"
     crossorigin="anonymous"></script>
   ```

   The hash can only be computed once the version is published, so this step
   is blocked until then. Until publish, the README must show the pinned URL
   with an explicit `<!-- integrity hash added at first publish -->` comment
   rather than an unpinned, unverified tag.
4. **Usage** — ESM, vanilla `<script>` (adapted from the notebook's own
   vanilla-JS section), and Observable `viewof`.
5. **Options** — a table generated from `SearchCheckboxOptions`, matching the
   defaults in `src/index.js` exactly.
6. **Why not just `Inputs.checkbox`?** — All/None respect the active filter, the
   count readout, the scrolling height cap, and mid-word search.
7. **Differences from the notebook** — the seven deviations, one line each.
8. **Development** — the four npm commands, and a pointer to `CLAUDE.md`.

- [ ] **Step 2: Verify every code sample in the README actually runs**

Copy each snippet into `example/scratch.html`, load it, confirm no console
errors. Delete `example/scratch.html` afterwards — do not commit it.

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with install, usage, and options"
git push
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Architecture / file structure | 2, 4, 5 |
| Public API | 4, 5 |
| Internal data flow | 4 |
| Deviations 1–6 | 4 (code) + 8 (documented) |
| Deviation 7 (found while planning) | 4 + amendment above |
| Build and distribution | 1, 3 |
| Testing — unit | 2 |
| Testing — e2e (11 specs) | 3 (red) + 4 (green) |
| AI-coding harness | 6, 7 |
| Deliverables | 1, 6, 7, 8 |
| Remote follow-ups (CodeQL, branch protection) | documented in `CLAUDE.md` Task 6 step 1.7 |

No gaps.

**Placeholder scan:** none — every code step contains runnable content. Tasks 6
step 1 and 8 step 1 specify document *contents by required section* rather than
full prose, which is appropriate for prose deliverables whose source material
(the trap list, the options table) is fully specified elsewhere in this plan.

**Type consistency:** `fullSearchFilter`, `termFilter`, `escapeRegExp`,
`valuesof` are named identically in Task 2 (implementation), Task 4 (re-export),
and Task 5 (declarations). `SearchCheckboxOptions` fields match the `options`
defaults in Task 4. The DOM contract published in Task 3's Interfaces block
(`.search-checkbox`, `.search-checkbox-list`, `output`, `All`/`None`) is exactly
what Task 4 renders.
