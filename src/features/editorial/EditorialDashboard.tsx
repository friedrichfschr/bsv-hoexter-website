"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Article } from "@/lib/editorial";
import { formatArticleDate } from "@/features/news/article-model";
import { EventModerationPanel } from "@/features/notice-board/EventModerationPanel";
import { PosterModerationPanel } from "@/features/notice-board/PosterModerationPanel";
import { AboutEditorialPanel } from "@/features/about/AboutEditorialPanel";

type EditorValues = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  status: "draft" | "published";
  imageId: string;
  imageAlt: string;
};

const emptyValues: EditorValues = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  status: "draft",
  imageId: "",
  imageAlt: "",
};

function valuesFromArticle(article: Article): EditorValues {
  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    body: article.body,
    publishedAt: article.publishedAt,
    status: article.status,
    imageId: article.imageId,
    imageAlt: article.imageAlt || "",
  };
}

export function EditorialDashboard() {
  const [activeTab, setActiveTab] = useState<"articles" | "events" | "posters" | "about">("articles");
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [values, setValues] = useState<EditorValues>(emptyValues);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadArticles() {
    const response = await fetch("/api/redaktion/articles", { cache: "no-store" });
    if (response.status === 401) {
      window.location.reload();
      return;
    }
    const result = await response.json();
    setArticles(result.articles || []);
    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/redaktion/articles", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const result = await response.json();
      if (!active) return;
      setArticles(result.articles || []);
      setBusy(false);
    });
    return () => { active = false; };
  }, []);

  function selectArticle(article: Article) {
    setSelectedId(article.id);
    setValues(valuesFromArticle(article));
    setMessage("");
    setError("");
  }

  function startNewArticle() {
    setSelectedId(undefined);
    setValues({ ...emptyValues, publishedAt: new Date().toISOString().slice(0, 10) });
    setMessage("");
    setError("");
  }

  function updateField<K extends keyof EditorValues>(field: K, value: EditorValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function saveArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch(selectedId ? `/api/redaktion/articles/${selectedId}` : "/api/redaktion/articles", {
      method: selectedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "Artikel konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }
    const saved = result.article as Article;
    setSelectedId(saved.id);
    setValues(valuesFromArticle(saved));
    setMessage(saved.status === "published" ? "Artikel veröffentlicht." : "Entwurf gespeichert.");
    await loadArticles();
    setSaving(false);
  }

  async function uploadImage(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/redaktion/upload", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "Bild konnte nicht hochgeladen werden.");
      return;
    }
    updateField("imageId", result.id);
    setMessage("Bild hochgeladen. Bitte noch einen Alternativtext eintragen und speichern.");
  }

  async function logout() {
    await fetch("/api/redaktion/session", { method: "DELETE" });
    window.location.reload();
  }

  if (busy) return <section className="editorial-page shell"><p>Redaktion wird geladen …</p></section>;

  const headings = {
    articles: "Artikel verwalten",
    events: "Veranstaltungen prüfen",
    posters: "Poster platzieren",
    about: "Über uns verwalten",
  } as const;

  return (
    <section className="editorial-page shell" aria-labelledby="editorial-heading">
      <header className="editorial-header">
        <div>
          <p className="news-eyebrow">Redaktion</p>
          <h1 id="editorial-heading">{headings[activeTab]}</h1>
        </div>
        <div className="editorial-actions">
          {activeTab === "articles" ? <button className="editorial-button editorial-button-secondary" type="button" onClick={startNewArticle}>Neuer Artikel</button> : null}
          <button className="editorial-button editorial-button-quiet" type="button" onClick={logout}>Abmelden</button>
        </div>
      </header>
      <div className="editorial-tabs" role="tablist" aria-label="Redaktionsbereiche">
        <button type="button" role="tab" aria-selected={activeTab === "articles"} onClick={() => setActiveTab("articles")}>Aktuelles</button>
        <button type="button" role="tab" aria-selected={activeTab === "events"} onClick={() => setActiveTab("events")}>Veranstaltungen</button>
        <button type="button" role="tab" aria-selected={activeTab === "posters"} onClick={() => setActiveTab("posters")}>Poster</button>
        <button type="button" role="tab" aria-selected={activeTab === "about"} onClick={() => setActiveTab("about")}>Über uns</button>
      </div>
      {activeTab === "events" ? <EventModerationPanel /> : null}
      {activeTab === "posters" ? <PosterModerationPanel /> : null}
      {activeTab === "about" ? <AboutEditorialPanel /> : null}
      {activeTab === "articles" ? <div className="editorial-layout">
        <aside className="editorial-article-list" aria-label="Artikel">
          <h2>Vorhandene Artikel</h2>
          {articles.length === 0 ? <p className="editorial-muted">Noch keine Artikel.</p> : (
            <ul>
              {articles.map((article) => (
                <li key={article.id}>
                  <button className={article.id === selectedId ? "editorial-article-link editorial-article-link-active" : "editorial-article-link"} type="button" onClick={() => selectArticle(article)}>
                    <strong>{article.title}</strong>
                    <span>{article.status === "published" ? "Veröffentlicht" : "Entwurf"} · {formatArticleDate(article.publishedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <form className="editorial-form editorial-editor" onSubmit={saveArticle}>
          <div className="editorial-form-heading">
            <h2>{selectedId ? "Artikel bearbeiten" : "Artikel anlegen"}</h2>
            <p className="editorial-muted">Speichere zunächst einen Entwurf. Erst der Status „Veröffentlicht“ macht ihn öffentlich sichtbar.</p>
          </div>
          <label htmlFor="article-title">Titel</label>
          <input id="article-title" value={values.title} onChange={(event) => updateField("title", event.target.value)} minLength={3} maxLength={160} required />
          <label htmlFor="article-slug">URL-Kürzel</label>
          <input id="article-slug" value={values.slug} onChange={(event) => updateField("slug", event.target.value)} pattern="[a-z0-9-]+" maxLength={100} required />
          <label htmlFor="article-summary">Zusammenfassung</label>
          <textarea id="article-summary" value={values.summary} onChange={(event) => updateField("summary", event.target.value)} minLength={10} maxLength={320} rows={3} required />
          <label htmlFor="article-body">Artikeltext</label>
          <textarea id="article-body" value={values.body} onChange={(event) => updateField("body", event.target.value)} minLength={20} maxLength={30000} rows={10} required />
          <div className="editorial-form-grid">
            <div>
              <label htmlFor="article-date">Veröffentlichungsdatum</label>
              <input id="article-date" type="date" value={values.publishedAt} onChange={(event) => updateField("publishedAt", event.target.value)} required />
            </div>
            <div>
              <label htmlFor="article-status">Status</label>
              <select id="article-status" value={values.status} onChange={(event) => updateField("status", event.target.value as EditorValues["status"])}>
                <option value="draft">Entwurf</option>
                <option value="published">Veröffentlicht</option>
              </select>
            </div>
          </div>
          <label htmlFor="article-image">Bild (optional)</label>
          <input id="article-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} />
          {values.imageId ? <p className="editorial-muted">Bild ausgewählt: {values.imageId}</p> : null}
          <label htmlFor="article-image-alt">Bild-Alternativtext</label>
          <input id="article-image-alt" value={values.imageAlt} onChange={(event) => updateField("imageAlt", event.target.value)} maxLength={240} />
          {message ? <p className="editorial-success" role="status">{message}</p> : null}
          {error ? <p className="editorial-error" role="alert">{error}</p> : null}
          <button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Speichern"}</button>
        </form>
      </div> : null}
    </section>
  );
}
