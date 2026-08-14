import { expect, request as playwrightRequest, test } from "@playwright/test";

const editorialKey = "e2e-editorial-key";
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const tinyPdf = Buffer.from("%PDF-1.4\n%%EOF", "ascii");
const longBdkSummary = "Ein ausführlicher E2E-Rückblick auf die Bezirksdelegiertenkonferenz mit Beratungen, Beschlüssen und Ergebnissen für die Schüler*innenvertretungen im Kreis Höxter. ".repeat(3);
const longBoardMessage = "Der Bezirksvorstand und die Landesdelegierten berichten ausführlich über ihre Arbeit, Gespräche und gemeinsamen Vorhaben im Kreis Höxter. ".repeat(3);

test("admin edits and approves an event submission", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Moderation mutation is covered once; mobile rendering is covered by accessibility and visual checks.");
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const submitted = await api.post("/api/einreichen", {
    multipart: {
      submissionKind: "event",
      title: "E2E Veranstaltung",
      organizer: "E2E Veranstalter",
      category: "Freizeit",
      website: "https://example.org/e2e",
      date: "2099-11-08",
      location: "Höxter",
      ageRange: "14 bis 18 Jahre",
      contactEmail: "e2e@example.org",
      description: "Eine ausreichend lange E2E Beschreibung für die Moderation.",
      consent: "true",
    },
  });
  expect(submitted.status()).toBe(202);

  await page.goto("/redaktion");
  await page.getByLabel("Redaktionsschlüssel").fill(editorialKey);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("tab", { name: "Veranstaltungen" }).click();
  await page.getByRole("button", { name: "E2E Veranstaltung Ausstehend · 2099-11-08", exact: true }).last().click();
  await expect(page.getByRole("link", { name: "e2e@example.org" })).toBeVisible();
  await page.getByLabel("Titel").fill("E2E Veranstaltung korrigiert");
  await page.getByLabel("Status").selectOption("approved");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Veranstaltung freigegeben.");
  await page.goto("/schwarzes-brett");
  await expect(page.getByRole("heading", { level: 3, name: "E2E Veranstaltung korrigiert" })).toBeVisible();
  const categoryFilters = page.getByRole("group", { name: "Veranstaltungen nach Kategorie filtern" });
  await expect(categoryFilters.getByRole("button")).toHaveText(["Alle", "Freizeit", "Berufsorientierung", "Hobbys"]);
  await categoryFilters.getByRole("button", { name: "Berufsorientierung" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "E2E Veranstaltung korrigiert" })).toHaveCount(0);
  await categoryFilters.getByRole("button", { name: "Freizeit" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "E2E Veranstaltung korrigiert" })).toBeVisible();
  await api.dispose();
});

test("admin can edit About and BDK records", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Editorial mutation is covered once.");
  await page.goto("/redaktion");
  await page.getByLabel("Redaktionsschlüssel").fill(editorialKey);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("tab", { name: "Über uns" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Über uns verwalten" })).toBeVisible();
  await expect(page.getByLabel("Aktiver Bezirksvorstand")).toHaveValue("bezirksvorstand-2026-27");
  await expect(page.getByText("Aktiver Vorstand", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bildergalerie" })).toHaveCount(0);
  const activeBoardDetails = page.locator("details.about-editor-record").filter({ hasText: "2026/27" });
  await activeBoardDetails.locator("summary").click();
  const activeBoard = page.getByRole("group", { name: "Vorstand 1" });
  await activeBoard.getByLabel("Text Vorstand 1").fill(longBoardMessage);
  await activeBoard.getByLabel("Fotos Vorstand 1").setInputFiles([
    { name: "vorstand.png", mimeType: "image/png", buffer: tinyPng },
    { name: "landesdelegierte.png", mimeType: "image/png", buffer: tinyPng },
  ]);
  await activeBoard.getByLabel("Alternativtext Foto 1 Vorstand 1").fill("Der aktuelle Bezirksvorstand");
  await activeBoard.getByLabel("Alternativtext Foto 2 Vorstand 1").fill("Die Landesdelegierten");
  await activeBoardDetails.locator("summary").click();
  await page.locator("details.about-editor-record").filter({ hasText: "Gründungs-BDK" }).locator("summary").click();
  const foundingBdk = page.getByRole("group", { name: "BDK 1" });
  await expect(foundingBdk.getByLabel("Neuen Anhang BDK 1")).toBeVisible();
  await expect(foundingBdk.getByLabel("Titel BDK 1", { exact: true })).toHaveCount(0);
  await expect(foundingBdk.getByLabel("Neues Foto BDK 1")).toHaveCount(0);
  await expect(page.locator("details.about-editor-record").first()).not.toHaveAttribute("open", "");
  await page.getByLabel("Was wir sind").fill("Die BSV Höxter ist die gemeinsame demokratische Stimme der Schülervertretungen im Kreis Höxter.");
  await page.getByRole("button", { name: "BDK hinzufügen" }).click();
  await page.locator("details.about-editor-record").filter({ hasText: "BDK 2" }).locator("summary").click();
  const newestBdk = page.getByRole("group", { name: "BDK 2" });
  await expect(newestBdk.getByLabel("Neuen Anhang BDK 2")).toBeVisible();
  await expect(newestBdk.getByLabel("Neues Foto BDK 2")).toHaveCount(0);
  await expect(newestBdk.getByLabel("Status BDK 2")).toHaveCount(0);
  await expect(newestBdk.getByText("Pflichtfeld · 10–3.000 Zeichen")).toBeVisible();
  await newestBdk.getByLabel("ID BDK 2").fill("test-bdk-2025");
  await newestBdk.getByLabel("Titel BDK 2", { exact: true }).fill("Test-BDK 2025");
  await newestBdk.getByLabel("Datum BDK 2").fill("2025-10-01");

  await newestBdk.getByLabel("Zusammenfassung BDK 2").fill(longBdkSummary);
  await newestBdk.getByLabel("Neuen Anhang BDK 2").setInputFiles({ name: "protokoll.pdf", mimeType: "application/pdf", buffer: tinyPdf });
  await newestBdk.getByLabel("Titel Anhang 1 BDK 2").fill("Protokoll der BDK");
  await newestBdk.getByRole("button", { name: "Link hinzufügen" }).click();
  await newestBdk.getByLabel("Linktitel BDK 2 Link 1").fill("Beschlüsse der BDK");
  await newestBdk.getByLabel("Adresse BDK 2 Link 1").fill("https://example.org/bdk-beschluesse");
  await page.getByRole("button", { name: "Alle Über-uns-Inhalte speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Über-uns-Inhalte gespeichert.");
  await page.goto("/ueber-uns");
  const bdkCard = page.locator(".about-bdk-archive-card").filter({ hasText: "Test-BDK 2025" });
  await expect(bdkCard.locator("strong", { hasText: "Test-BDK 2025" })).toBeVisible();
  await expect(bdkCard.locator("p").first()).toContainText("Ein ausführlicher E2E-Rückblick");
  const readMore = bdkCard.getByRole("button", { name: "Mehr lesen: Test-BDK 2025" });
  await readMore.click();
  const bdkDialog = page.getByRole("dialog", { name: "Test-BDK 2025" });
  await expect(bdkDialog.getByText(longBdkSummary.trim(), { exact: true })).toBeVisible();
  await expect(bdkDialog.getByRole("link", { name: "Protokoll der BDK" })).toBeVisible();
  await expect(bdkDialog.getByRole("link", { name: "Beschlüsse der BDK" })).toHaveAttribute("href", "https://example.org/bdk-beschluesse");
  await page.keyboard.press("Escape");
  await expect(bdkDialog).not.toBeVisible();
  await expect(readMore).toBeFocused();

  const carousel = page.getByRole("region", { name: "Bilder Vorstand 2026/27" });
  const previousPhoto = carousel.getByRole("button", { name: "Vorheriges Bild" });
  const nextPhoto = carousel.getByRole("button", { name: "Nächstes Bild" });
  await expect(previousPhoto).toBeDisabled();
  await expect(carousel.getByRole("img", { name: "Der aktuelle Bezirksvorstand" })).toBeVisible();
  await nextPhoto.click();
  await expect(carousel.getByRole("img", { name: "Die Landesdelegierten" })).toBeVisible();
  await expect(nextPhoto).toBeDisabled();

  const boardReadMore = page.getByRole("button", { name: "Mehr lesen: Vorstand 2026/27" });
  await boardReadMore.click();
  const boardDialog = page.getByRole("dialog", { name: "Vorstand 2026/27" });
  await expect(boardDialog.getByRole("region", { name: "Bilder Vorstand 2026/27 im Dialog" })).toBeVisible();
  const dialogBox = await boardDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs((dialogBox!.x + dialogBox!.width / 2) - viewport!.width / 2)).toBeLessThan(3);
  expect(Math.abs((dialogBox!.y + dialogBox!.height / 2) - viewport!.height / 2)).toBeLessThan(3);

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("/ueber-uns");
  const mobileCarousel = mobilePage.getByRole("region", { name: "Bilder Vorstand 2026/27" });
  await mobileCarousel.getByRole("button", { name: "Nächstes Bild" }).tap();
  await expect(mobileCarousel.getByRole("img", { name: "Die Landesdelegierten" })).toBeVisible();
  await mobilePage.getByRole("button", { name: "Mehr lesen: Vorstand 2026/27" }).tap();
  const mobileDialog = mobilePage.getByRole("dialog", { name: "Vorstand 2026/27" });
  await expect(mobileDialog).toBeVisible();
  const mobileDialogBox = await mobileDialog.boundingBox();
  expect(mobileDialogBox).not.toBeNull();
  expect(Math.abs((mobileDialogBox!.x + mobileDialogBox!.width / 2) - 195)).toBeLessThan(3);
  expect(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mobileContext.close();
});

test("admin places, resizes, and approves a poster", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Moderation mutation is covered once; mobile rendering is covered by accessibility and visual checks.");
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const submitted = await api.post("/api/einreichen", {
    multipart: {
      submissionKind: "poster",
      title: "E2E Poster",
      posterExpiresAt: "2099-11-08",
      contactEmail: "poster@example.org",
      consent: "true",
      posterFile: { name: "poster.png", mimeType: "image/png", buffer: tinyPng },
    },
  });
  expect(submitted.status()).toBe(202);

  const { posterId } = await submitted.json() as { posterId: string };
  const moderation = await api.get("/api/redaktion/notice-board", { headers: { Authorization: `Bearer ${editorialKey}` } });
  const records = await moderation.json() as { posters: { id: string; mediaId: string }[] };
  const mediaId = records.posters.find((poster) => poster.id === posterId)?.mediaId;
  expect(mediaId).toBeTruthy();
  expect((await api.get(`/api/notice-board/media/${mediaId}`)).status()).toBe(404);
  expect((await api.get(`/api/redaktion/notice-board/media/${mediaId}`, { headers: { Authorization: `Bearer ${editorialKey}` } })).status()).toBe(200);

  await page.goto("/redaktion");
  if (await page.getByLabel("Redaktionsschlüssel").isVisible().catch(() => false)) {
    await page.getByLabel("Redaktionsschlüssel").fill(editorialKey);
    await page.getByRole("button", { name: "Anmelden" }).click();
  }
  await page.getByRole("tab", { name: "Poster", exact: true }).click();
  await expect(page.getByLabel("Poster auf den Bulletin Boards platzieren")).toBeVisible();
  await page.getByRole("button", { name: /E2E Poster Ausstehend · bis 2099-11-08/, exact: true }).last().click();
  await expect(page.getByRole("link", { name: "poster@example.org" })).toBeVisible();
  await expect(page.getByLabel("Poster auf den Bulletin Boards platzieren")).toBeVisible();
  const selectedPoster = page.locator(".editorial-placed-poster-selected");
  const posterBox = await selectedPoster.boundingBox();
  expect(posterBox).not.toBeNull();
  await page.mouse.move(posterBox!.x + posterBox!.width / 2, posterBox!.y + posterBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(posterBox!.x + posterBox!.width / 2 + 13, posterBox!.y + posterBox!.height / 2 + 7);
  await page.mouse.up();
  await expect(page.getByLabel("Position links \(%)")).toHaveValue(/^\d+(?:\.\d)?$/);
  expect(await page.getByLabel("Position links \(%)").evaluate((input: HTMLInputElement) => input.validity.stepMismatch)).toBe(false);
  await page.getByLabel("Breite \(%)").fill("30");
  await page.getByLabel("Höhe \(%)").fill("45");
  await page.getByLabel("Ablaufdatum").fill("2099-11-08");
  await page.getByLabel("Status").selectOption("approved");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Poster platziert und freigegeben.");
  const publishedMedia = await api.get(`/api/notice-board/media/${mediaId}`);
  expect(publishedMedia.status()).toBe(200);
  expect(publishedMedia.headers()["cache-control"]).toContain("no-store");
  await page.reload();
  await page.getByRole("tab", { name: "Poster", exact: true }).click();
  await expect(page.locator(".editorial-placed-poster-existing")).toBeVisible();
  const secondSubmission = await api.post("/api/einreichen", {
    multipart: {
      submissionKind: "poster",
      title: "Zweites E2E Poster",
      posterExpiresAt: "2099-12-08",
      contactEmail: "zweites-poster@example.org",
      consent: "true",
      posterFile: { name: "poster-zwei.png", mimeType: "image/png", buffer: tinyPng },
    },
  });
  expect(secondSubmission.status()).toBe(202);
  await page.reload();
  await page.getByRole("tab", { name: "Poster", exact: true }).click();
  await page.getByRole("button", { name: /Zweites E2E Poster Ausstehend · bis 2099-12-08/, exact: true }).click();
  await expect(page.locator(".editorial-placed-poster-existing")).toBeVisible();
  await expect(page.locator(".editorial-placed-poster-selected")).toBeVisible();
  await page.goto("/schwarzes-brett");
  await page.getByRole("link", { name: "E2E Poster vergrößern" }).click();
  await expect(page.getByRole("dialog", { name: "E2E Poster" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "E2E Poster" })).toHaveCount(0);
  await api.dispose();
});

test("poster enlargement works by touch on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch regression is specific to the mobile project.");
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const submitted = await api.post("/api/einreichen", {
    multipart: {
      submissionKind: "poster",
      title: "Mobiles E2E Poster",
      posterExpiresAt: "2099-11-08",
      contactEmail: "mobile-poster@example.org",
      consent: "true",
      posterFile: { name: "mobile-poster.png", mimeType: "image/png", buffer: tinyPng },
    },
  });
  expect(submitted.status()).toBe(202);
  const { posterId } = await submitted.json() as { posterId: string };
  const approved = await api.put(`/api/redaktion/notice-board/posters/${posterId}`, {
    headers: { Authorization: "Bearer " + editorialKey },
    data: {
      status: "approved",
      expiresAt: "2099-11-08",
      placement: { boardId: "left", left: 10, top: 10, width: 30, height: 45, rotation: 0 },
    },
  });
  expect(approved.status()).toBe(200);

  await page.goto("/schwarzes-brett");
  const trigger = page.getByRole("link", { name: "Mobiles E2E Poster vergrößern" });
  await expect(trigger).toBeVisible();
  await trigger.tap();
  await expect(page.getByRole("dialog", { name: "Mobiles E2E Poster" })).toBeVisible();
  await page.getByRole("button", { name: "Großansicht schließen" }).tap();
  await expect(trigger).toBeFocused();
  await api.dispose();
});

test("poster enlargement keeps a no-JavaScript mobile fallback", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch fallback is specific to the mobile project.");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/schwarzes-brett");
  await expect(page.getByRole("link", { name: /vergrößern/ }).first()).toHaveAttribute("href", /\/api\/notice-board\/media\//);
  await context.close();
});
