import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the navigation, foundation heading, and retained footer", async ({ page }, testInfo) => {
  await page.goto("/");
  const navigation = page.locator("#primary-navigation");
  if (testInfo.project.name === "chromium") await expect(navigation).toBeVisible();
  await expect(page.getByRole("link", { name: "BSV Höxter – Startseite" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Startseite", exact: true, includeHidden: true })).toHaveAttribute("href", "/");
  await expect(navigation.getByRole("link", { name: "Schwarzes Brett", includeHidden: true })).toHaveAttribute("href", "/schwarzes-brett");
  await expect(navigation.getByRole("link", { name: "Aktuelles der BSV", includeHidden: true })).toHaveAttribute("href", "/aktuelles");
  await expect(navigation.getByRole("link", { name: "Mitmachen - BDK", includeHidden: true })).toHaveAttribute("href", "/mitmachen");
  await expect(navigation.getByRole("link", { name: "Über uns", includeHidden: true })).toHaveAttribute("href", "/ueber-uns");
  await expect(page.getByRole("heading", { level: 1, name: "BSV Höxter" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.locator("main").getByRole("heading")).toHaveCount(1);
});

test("navigation destinations render placeholder pages", async ({ page }) => {
  const destinations = [
    ["/schwarzes-brett", "Schwarzes Brett"],
    ["/mitmachen", "Mitmachen - BDK"],
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
      await expect(page.getByRole("group", { name: "Veranstaltungen nach Kategorie filtern" }).getByRole("button")).toHaveText(["Alle", "Freizeit", "Berufsorientierung", "Hobbys"]);
    }
    if (route !== "/schwarzes-brett" && route !== "/mitmachen" && route !== "/ueber-uns") {
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
  await expect(navigation.getByRole("link")).toHaveCount(5);

  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menuButton).toBeFocused();

  await menuButton.click();
  await navigation.getByRole("link", { name: "Mitmachen - BDK" }).click();
  await expect(page).toHaveURL(/\/mitmachen$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mitmachen - BDK" })).toBeVisible();
});

test("BDK page shows the unknown-date state and dedicated signup form", async ({ page }, testInfo) => {
  await page.goto("/mitmachen");
  await expect(page.getByRole("heading", { level: 1, name: "Mitmachen - BDK" })).toBeVisible();
  await expect(page.getByText("Termin wird noch bekannt gegeben", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Für die nächste BDK anmelden" }).click();

  await expect(page).toHaveURL(/\/mitmachen\/anmelden$/);
  await expect(page.getByRole("heading", { level: 1, name: "Zur nächsten BDK anmelden" })).toBeVisible();
  await expect(page.getByText("Der Termin steht noch nicht fest", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  await expect(page.getByLabel("Schule")).toBeVisible();
  await expect(page.getByLabel("Ich vertrete meine Schülervertretung")).toBeVisible();

  if (testInfo.project.name === "chromium") {
    await page.getByLabel("Name").fill("E2E BDK Anmeldung");
    await page.getByLabel("E-Mail-Adresse").fill("bdk-e2e@example.org");
    await page.getByLabel("Schule").fill("E2E Schule");
    await page.getByLabel("Ich vertrete meine Schülervertretung").check();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Anmeldung vormerken" }).click();
    await expect(page.getByRole("status")).toContainText("Deine Anmeldung wurde vorgemerkt");
  }
});

test("About page renders the dynamic founding archive and source files", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && message.text().includes("Hydration failed")) hydrationErrors.push(message.text()); });
  await page.goto("/ueber-uns");
  await expect(page.getByRole("heading", { level: 2, name: "Was wir sind" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Wofür wir stehen" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Der aktuelle Bezirksvorstand" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Unsere Satzung" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Frühere Bezirksvorstände" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Frühere Satzungen" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "BDKs, Protokolle und Dateien" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Die Gründung der BSV Höxter" })).toBeVisible();
  await expect(page.getByLabel("Zeit seit der Gründung")).toBeVisible();
  await expect(page.getByRole("img", { name: "Arbeitsphase bei der Gründungs-BDK am 2. Juli 2026." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Die Teilnehmenden der ersten Bezirksdelegiertenkonferenz." })).toBeVisible();
  expect((await page.request.get("/api/about/medien/gruendungs-bdk-konferenz-2026")).status()).toBe(200);
  const invitation = page.getByRole("link", { name: "Originale Schuleinladungen zur Gründungs-BDK" });
  await expect(invitation).toHaveAttribute("href", "/api/about/dokumente/gruendungs-bdk-einladungen-2026");
  const response = await page.request.get(await invitation.getAttribute("href") ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(hydrationErrors).toEqual([]);
});

test("phone navigation opens without client-side JavaScript", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-only progressive enhancement regression");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Menü öffnen" }).click();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  await context.close();
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
  const routes = ["/", "/schwarzes-brett", "/schwarzes-brett/einreichen", "/aktuelles", "/mitmachen", "/mitmachen/anmelden", "/ueber-uns"];
  for (const route of routes) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"), route).toEqual([]);
  }
});
