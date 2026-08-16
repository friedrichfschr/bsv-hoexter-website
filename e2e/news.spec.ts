import { expect, request as playwrightRequest, test } from "@playwright/test";
import type { Article } from "@/features/editorial/server/content-store";

const editorialKey = "e2e-editorial-key";
const publishedArticle: Article = {
  id: "test-published",
  slug: "test-published",
  title: "Test veröffentlichte Meldung",
  summary: "Eine generische Zusammenfassung für den Browser-Test.",
  body: "Dies ist ein generischer Testtext für die veröffentlichte Meldung.",
  publishedAt: "2099-02-01",
  status: "published" as const,
  imageId: "",
};
const draftArticle = { ...publishedArticle, id: "test-draft", slug: "test-draft", title: "Test Entwurf", status: "draft" as const };
const olderArticle = { ...publishedArticle, id: "test-older", slug: "test-older", title: "Ältere Testmeldung", publishedAt: "2099-01-01" };

async function replaceEditorialContent(articles: Article[] = [publishedArticle]) {
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const response = await api.put("/api/redaktion/content", {
    headers: { Authorization: `Bearer ${editorialKey}` },
    data: { articles, documents: [] },
  });
  expect(response.ok()).toBeTruthy();
  await api.dispose();
}

test.describe.configure({ mode: "serial" });

test("published articles appear in the index and detail route", async ({ page }) => {
  await replaceEditorialContent([
    publishedArticle,
    draftArticle,
    olderArticle,
  ]);

  await page.goto("/aktuelles");
  await expect(page.getByRole("heading", { level: 1, name: "Aktuelles der BSV" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Test veröffentlichte Meldung" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Ältere Testmeldung" })).toBeVisible();
  await expect(page.getByText("Test Entwurf")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Artikel lesen/ })).toHaveAttribute("href", "/aktuelles/test-published");

  await page.getByRole("link", { name: /Artikel lesen/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Test veröffentlichte Meldung" })).toBeVisible();
  await expect(page.getByText("Dies ist ein generischer Testtext")).toBeVisible();
  await expect(page.getByRole("link", { name: /Alle Meldungen/ })).toHaveAttribute("href", "/aktuelles");
});

test("admin can log in, publish an article, and log out", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Editorial mutation is covered once; responsive routes are covered separately.");
  await replaceEditorialContent([]);
  await page.goto("/redaktion");
  await expect(page.getByRole("heading", { level: 1, name: "Anmelden" })).toBeVisible();
  await page.getByLabel("Redaktionsschlüssel").fill(editorialKey);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Artikel verwalten" })).toBeVisible();
  await page.getByRole("button", { name: "Neuer Artikel" }).click();
  await page.getByLabel("Titel").fill("Testmeldung aus Redaktion");
  await page.getByLabel("URL-Kürzel").fill("testmeldung-aus-redaktion");
  await page.getByLabel("Zusammenfassung").fill("Eine generische Zusammenfassung aus dem Redaktions-Test.");
  await page.getByLabel("Artikeltext").fill("Dies ist ein ausreichend langer Testtext aus dem Redaktionsbereich.");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByRole("status")).toHaveText("Artikel veröffentlicht.");
  await page.goto("/aktuelles/testmeldung-aus-redaktion");
  await expect(page.getByRole("heading", { level: 1, name: "Testmeldung aus Redaktion" })).toBeVisible();

  await page.goto("/redaktion");
  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Anmelden" })).toBeVisible();
});

test("published article images are rendered with alternative text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Editorial upload mutation is covered once.");
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  const upload = await api.post("/api/redaktion/upload", {
    headers: { Authorization: `Bearer ${editorialKey}` },
    multipart: {
      file: {
        name: "test-image.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const { id } = await upload.json() as { id: string };
  await api.put("/api/redaktion/content", {
    headers: { Authorization: `Bearer ${editorialKey}` },
    data: { articles: [{ ...publishedArticle, imageId: id, imageAlt: "Generisches Testbild" }], documents: [] },
  });
  await api.dispose();

  await page.goto("/aktuelles");
  await expect(page.getByRole("img", { name: "Generisches Testbild" })).toBeVisible();
});
