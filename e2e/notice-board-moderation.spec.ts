import { expect, request as playwrightRequest, test } from "@playwright/test";

const editorialKey = "e2e-editorial-key";
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

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
  await api.dispose();
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
  await page.getByRole("button", { name: "E2E Poster vergrößern" }).click();
  await expect(page.getByRole("dialog", { name: "E2E Poster" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "E2E Poster" })).toHaveCount(0);
  await api.dispose();
});
