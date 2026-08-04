import { test, expect } from "@playwright/test";

// Drives example/bind.html, which loads the ESM build through an import map —
// so this file is also the only browser coverage of the ESM output.

const source = ".search-checkbox";

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/example/bind.html");
  await expect(page.locator(source)).toBeVisible();
  expect(errors, "ESM build must load without page errors").toEqual([]);
});

/** A row in the plain Inputs.checkbox on the right. */
function targetRow(page, name) {
  return page
    .locator("#target label")
    .filter({ hasText: new RegExp(`^${name}$`) });
}

/** A row in the searchCheckbox on the left. */
function sourceRow(page, name) {
  return page
    .locator(".search-checkbox-list label")
    .filter({ hasText: new RegExp(`^${name}$`) });
}

test("the ESM build exports a callable default", async ({ page }) => {
  await expect(page.locator(".search-checkbox-list label")).toHaveCount(10);
  await expect(page.locator(".search-checkbox-count")).toHaveText(
    "(2 of 10 selected)"
  );
});

test("bind copies the initial value from source to target", async ({
  page,
}) => {
  await expect(page.locator("#in-sync")).toHaveText("yes");
  await expect(page.locator("#target-value")).toHaveText("Curve, Dribbling");
});

test("changing the searchCheckbox updates the plain checkbox", async ({
  page,
}) => {
  await sourceRow(page, "Volleys").locator("input").check();
  await expect(page.locator("#target-value")).toContainText("Volleys");
  await expect(page.locator("#in-sync")).toHaveText("yes");
});

test("changing the plain checkbox updates the searchCheckbox", async ({
  page,
}) => {
  await targetRow(page, "Finishing").locator("input").check();
  await expect(page.locator("#source-value")).toContainText("Finishing");
  await expect(page.locator(".search-checkbox-count")).toHaveText(
    "(3 of 10 selected)"
  );
  await expect(page.locator("#in-sync")).toHaveText("yes");
});

test("All respects the filter and propagates through the binding", async ({
  page,
}) => {
  await page.locator('.search-checkbox input[type="search"]').fill("Accuracy");
  await page.getByRole("button", { name: "All" }).click();
  // HeadingAccuracy + FKAccuracy added to the two already selected.
  await expect(page.locator(".search-checkbox-count")).toHaveText(
    "(4 of 10 selected)"
  );
  await expect(page.locator("#target-value")).toContainText("HeadingAccuracy");
  await expect(page.locator("#target-value")).toContainText("FKAccuracy");
  await expect(page.locator("#in-sync")).toHaveText("yes");
});

test("a bound change fires exactly one input event on the source", async ({
  page,
}) => {
  // The regression guard. Inputs.bind writes source.value and then dispatches
  // `input` on the source itself. If the widget's own value setter dispatches
  // too, every target-driven change double-fires — the @357 bug, reintroduced
  // through the binding rather than through the checkbox listener.
  await expect(page.locator("#source-events")).toHaveText("0");
  await targetRow(page, "Finishing").locator("input").check();
  await expect(page.locator("#source-events")).toHaveText("1");
  await targetRow(page, "Volleys").locator("input").check();
  await expect(page.locator("#source-events")).toHaveText("2");
});

test("toggling off through the binding stays in sync", async ({ page }) => {
  await targetRow(page, "Curve").locator("input").uncheck();
  await expect(page.locator("#source-value")).not.toContainText("Curve");
  await expect(page.locator(".search-checkbox-count")).toHaveText(
    "(1 of 10 selected)"
  );
  await expect(page.locator("#in-sync")).toHaveText("yes");
});
