import { test, expect } from "@playwright/test";

const TOTAL = 88; // DATA.length in example/index.html — verified against the notebook
const INITIAL = ["Name", "Age", "Club"];

test.beforeEach(async ({ page }) => {
  await page.goto("/example/index.html");
  await expect(page.locator(".search-checkbox")).toBeVisible();
});

/** Rows that are actually visible (search hides the rest with display:none). */
function visibleRows(page) {
  return page.locator(".search-checkbox-list label:visible");
}

function counter(page) {
  return page.locator(".search-checkbox-count");
}

function searchBox(page) {
  return page.locator('.search-checkbox input[type="search"]');
}

function row(page, name) {
  return page
    .locator(".search-checkbox-list label")
    .filter({ hasText: new RegExp(`^${name}$`) });
}

test("1. renders every option and the initial counter", async ({ page }) => {
  await expect(page.locator(".search-checkbox-list label")).toHaveCount(TOTAL);
  await expect(counter(page)).toHaveText(
    `(${INITIAL.length} of ${TOTAL} selected)`
  );
  await expect(page.locator("#status")).toHaveText(INITIAL.join(", "));
});

test("2. typing filters the visible rows", async ({ page }) => {
  await searchBox(page).fill("Club");
  // "Club" and "Club Logo"
  await expect(visibleRows(page)).toHaveCount(2);
});

test("3. search matches mid-string, not just at word start", async ({
  page,
}) => {
  await searchBox(page).fill("Accuracy");
  // HeadingAccuracy and FKAccuracy — Observable's default filter finds neither.
  await expect(visibleRows(page)).toHaveCount(2);
  const texts = (await visibleRows(page).allInnerTexts()).join(" ");
  expect(texts).toContain("HeadingAccuracy");
  expect(texts).toContain("FKAccuracy");
});

test("4. All selects only the filtered options", async ({ page }) => {
  await searchBox(page).fill("Accuracy");
  await page.getByRole("button", { name: "All" }).click();
  // The 3 initial selections survive, plus the 2 filtered ones.
  await expect(counter(page)).toHaveText(`(5 of ${TOTAL} selected)`);
  const status = await page.locator("#status").innerText();
  expect(status).toContain("HeadingAccuracy");
  expect(status).toContain("FKAccuracy");
  expect(status).toContain("Name"); // untouched by the filter
});

test("5. None deselects only the filtered options", async ({ page }) => {
  await searchBox(page).fill("Club");
  await page.getByRole("button", { name: "None" }).click();
  // "Club" was selected initially; "Name" and "Age" are outside the filter.
  await expect(counter(page)).toHaveText(`(2 of ${TOTAL} selected)`);
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
  await expect(counter(page)).toHaveText(
    `(${INITIAL.length} of ${TOTAL} selected)`
  );
});

test("7. clicking one checkbox updates value and counter", async ({ page }) => {
  await row(page, "Overall").locator("input").check();
  await expect(counter(page)).toHaveText(`(4 of ${TOTAL} selected)`);
  await expect(page.locator("#status")).toContainText("Overall");
});

test("8. one change dispatches exactly one input event", async ({ page }) => {
  await expect(page.locator("#event-count")).toHaveText("0");
  await row(page, "Overall").locator("input").check();
  await expect(page.locator("#event-count")).toHaveText("1");
  await row(page, "Potential").locator("input").check();
  await expect(page.locator("#event-count")).toHaveText("2");
});

test("9. the value setter checks the right boxes", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector(".search-checkbox").value = ["Vision", "Balance"];
  });
  await expect(counter(page)).toHaveText(`(2 of ${TOTAL} selected)`);
  const checked = await page.evaluate(
    () => document.querySelector(".search-checkbox").value
  );
  expect(checked.sort()).toEqual(["Balance", "Vision"]);
});

test("10. the checkbox list scrolls at the configured height", async ({
  page,
}) => {
  const box = page.locator(".search-checkbox-list");
  await expect(box).toHaveCSS("max-height", "200px");
  await expect(box).toHaveCSS("overflow", "auto");
});

test("11. the counter is announced to assistive technology", async ({
  page,
}) => {
  const output = counter(page);
  await expect(output).toHaveAttribute("aria-live", "polite");
  // The node must be updated in place; replacing it would not announce.
  const before = await output.elementHandle();
  await row(page, "Overall").locator("input").check();
  const after = await output.elementHandle();
  expect(await before.evaluate((a, b) => a === b, after)).toBe(true);
});

test("12. typing in the search box fires no input event on the widget", async ({
  page,
}) => {
  // Deviation #9. The <input type=search> emits a native, bubbling `input`
  // event that reaches the widget root, so consumers saw one event per
  // keystroke even though the selection never changed. @509 has this too: its
  // author commented out an explicit dispatch here, not realising the native
  // event was already bubbling underneath it.
  await expect(page.locator("#event-count")).toHaveText("0");
  await searchBox(page).pressSequentially("Accu", { delay: 30 });
  await expect(visibleRows(page)).toHaveCount(2); // filtering still works
  await expect(page.locator("#event-count")).toHaveText("0");
});

test("13. an initial value outside data is ignored", async ({ page }) => {
  // Deviation #10. @509 seeds its Map straight from options.value with no
  // membership check, so a stray option inflates the count forever and leaks
  // out of .value — "(3 of 2 selected)" for a two-option widget.
  const result = await page.evaluate(() => {
    const w = SearchCheckbox(["A", "B"], { value: ["A", "B", "C"] });
    document.body.append(w);
    return {
      text: w.querySelector(".search-checkbox-count").textContent,
      value: w.value,
    };
  });
  expect(result.text).toBe("(2 of 2 selected)");
  expect(result.value).toEqual(["A", "B"]);
});

test("14. a stray value assigned later is also ignored", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector(".search-checkbox").value = ["Vision", "NotAThing"];
  });
  await expect(counter(page)).toHaveText(`(1 of ${TOTAL} selected)`);
  const value = await page.evaluate(
    () => document.querySelector(".search-checkbox").value
  );
  expect(value).toEqual(["Vision"]);
});

test("15. the search input has an accessible name", async ({ page }) => {
  // The other half of deviation #6, previously untested.
  await expect(searchBox(page)).toHaveAttribute(
    "aria-label",
    "Search Variables"
  );
});
