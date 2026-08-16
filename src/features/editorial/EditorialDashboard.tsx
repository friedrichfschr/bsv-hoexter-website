"use client";

import { useState } from "react";
import { AboutEditorialPanel } from "@/features/about/AboutEditorialPanel";
import { BdkEditorialPanel } from "@/features/bdk/BdkEditorialPanel";
import { ArticleEditor } from "@/features/news/editor/ArticleEditor";
import { EventModerationPanel } from "@/features/notice-board/EventModerationPanel";
import { PosterModerationPanel } from "@/features/notice-board/PosterModerationPanel";

type EditorialTab = "articles" | "events" | "posters" | "bdk" | "about";

const headings: Record<EditorialTab, string> = {
  articles: "Artikel verwalten",
  events: "Veranstaltungen prüfen",
  posters: "Poster platzieren",
  bdk: "BDK verwalten",
  about: "Über uns verwalten",
};

export function EditorialDashboard() {
  const [activeTab, setActiveTab] = useState<EditorialTab>("articles");
  const [newArticleRequest, setNewArticleRequest] = useState(0);

  async function logout() {
    await fetch("/api/redaktion/session", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <section className="editorial-page shell" aria-labelledby="editorial-heading">
      <header className="editorial-header">
        <div><p className="news-eyebrow">Redaktion</p><h1 id="editorial-heading">{headings[activeTab]}</h1></div>
        <div className="editorial-actions">
          {activeTab === "articles" ? <button className="editorial-button editorial-button-secondary" type="button" onClick={() => setNewArticleRequest((value) => value + 1)}>Neuer Artikel</button> : null}
          <button className="editorial-button editorial-button-quiet" type="button" onClick={logout}>Abmelden</button>
        </div>
      </header>
      <div className="editorial-tabs" role="tablist" aria-label="Redaktionsbereiche">
        <button type="button" role="tab" aria-selected={activeTab === "articles"} onClick={() => setActiveTab("articles")}>Aktuelles</button>
        <button type="button" role="tab" aria-selected={activeTab === "events"} onClick={() => setActiveTab("events")}>Veranstaltungen</button>
        <button type="button" role="tab" aria-selected={activeTab === "posters"} onClick={() => setActiveTab("posters")}>Poster</button>
        <button type="button" role="tab" aria-selected={activeTab === "bdk"} onClick={() => setActiveTab("bdk")}>BDK</button>
        <button type="button" role="tab" aria-selected={activeTab === "about"} onClick={() => setActiveTab("about")}>Über uns</button>
      </div>
      <div hidden={activeTab !== "articles"}>
        <ArticleEditor key={newArticleRequest} />
      </div>
      {activeTab === "events" && <EventModerationPanel />}
      {activeTab === "posters" ? <PosterModerationPanel /> : null}
      {activeTab === "bdk" ? <BdkEditorialPanel /> : null}
      {activeTab === "about" ? <AboutEditorialPanel /> : null}
    </section>
  );
}
