import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the navigation, foundation heading, and retained footer", async ({ page }) => {
  await page.goto("/");
  const navigation = page.locator("#primary-navigation");
  await expect(page.getByRole("link", { name: "BSV Höxter – Startseite" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Schwarzes Brett", includeHidden: true })).toHaveAttribute("href", "/schwarzes-brett");
  await expect(navigation.getByRole("link", { name: "Aktuelles der BSV", includeHidden: true })).toHaveAttribute("href", "/aktuelles");
  await expect(navigation.getByRole("link", { name: "Mitmachen", includeHidden: true })).toHaveAttribute("href", "/mitmachen");
  await expect(navigation.getByRole("link", { name: "Über uns", includeHidden: true })).toHaveAttribute("href", "/ueber-uns");
  await expect(page.getByRole("heading", { level: 1, name: "BSV Höxter" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.locator("main").getByRole("heading")).toHaveCount(1);
});

test("navigation destinations render placeholder pages", async ({ page }) => {
  const destinations = [
    ["/schwarzes-brett", "Schwarzes Brett"],
    ["/mitmachen", "Mitmachen"],
    ["/ueber-uns", "Über uns"],
  ] as const;

  for (const [route, heading] of destinations) {
    await page.goto(route);
    await expect(page.locator("main").getByRole("heading", { level: 1, name: heading })).toBeVisible();
    if (route === "/schwarzes-brett") {
      await expect(page.locator("main").getByRole("heading", { level: 1, name: heading })).toHaveClass(/bulletin-board-heading/);
      await expect(page.locator("main .bulletin-board-image")).toHaveCount(2);
      await expect(page.locator("main .bulletin-board-poster:not(.bulletin-board-poster-approved)")).toHaveCount(0);
      await expect(page.locator("main .bulletin-board-image").first()).toHaveAttribute("src", /bulletin-board-transparent/);
      await expect(page.getByRole("heading", { level: 2, name: "Veranstaltungen" })).toBeVisible();
    }
    if (route !== "/schwarzes-brett") {
      await expect(page.locator("main").getByRole("heading")).toHaveCount(1);
      await expect(page.locator("main").locator("p, article, aside, form, ul, ol")).toHaveCount(0);
    }
  }
});

test("phone navigation opens on demand and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-only navigation behavior");
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Menü öffnen" });
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });

  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();

  await menuButton.click();
  await expect(page.getByRole("button", { name: "Menü schließen" })).toHaveAttribute("aria-expanded", "true");
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link")).toHaveCount(4);

  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("board submission form supports poster, event, and combined entries", async ({ page }) => {
  await page.goto("/schwarzes-brett");
  await page.getByRole("link", { name: "Eintrag einreichen" }).click();
  await expect(page).toHaveURL(/\/schwarzes-brett\/einreichen$/);
  await expect(page.getByRole("heading", { level: 1, name: "Poster oder Veranstaltung einreichen" })).toBeVisible();

  await expect(page.getByLabel("Posterdatei")).toBeVisible();
  await expect(page.getByLabel("Beschreibung")).toBeVisible();
  await expect(page.getByLabel("Kategorie").locator("option")).toHaveText(["Kategorie auswählen", "Freizeit", "Berufsorientierung", "Hobbys"]);

  await page.getByLabel("Nur Poster").check();
  await expect(page.getByLabel("Posterdatei")).toBeVisible();
  await expect(page.getByLabel("Ablaufdatum des Posters")).toBeVisible();
  await expect(page.getByLabel("Beschreibung")).toHaveCount(0);

  await page.getByLabel("Nur Veranstaltung").check();
  await expect(page.getByLabel("Posterdatei")).toHaveCount(0);
  await expect(page.getByLabel("Beschreibung")).toBeVisible();
});

test("foundation has no serious or critical accessibility violations", async ({ page }) => {
  const routes = ["/", "/schwarzes-brett", "/schwarzes-brett/einreichen", "/aktuelles", "/mitmachen", "/ueber-uns"];
  for (const route of routes) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"), route).toEqual([]);
  }
});
