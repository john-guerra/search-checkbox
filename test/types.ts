// Compile-only check that the published declarations actually work for a
// TypeScript consumer. Run via `npm run typecheck`; never executed.
import searchCheckbox from "../src/index.js";
import type { SearchCheckboxElement } from "../src/index.js";
import { fullSearchFilter, escapeRegExp } from "../src/filter.js";

const widget: SearchCheckboxElement = searchCheckbox(["a", "b"], {
  label: "Letters",
  value: ["a"],
  height: 120,
  debug: false,
});

widget.addEventListener("input", () => {
  const selected: unknown[] = widget.value;
  void selected;
});
widget.value = ["b"];

// Statics are reachable from the default export.
const viaStatic: (d: unknown) => boolean = searchCheckbox.fullSearchFilter("x");
const viaSubpath: (d: unknown) => boolean = fullSearchFilter("x");
const escaped: string = escapeRegExp("a.b");

void viaStatic;
void viaSubpath;
void escaped;
