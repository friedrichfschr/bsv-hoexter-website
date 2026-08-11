"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigationItems = [
  { href: "/schwarzes-brett", label: "Schwarzes Brett" },
  { href: "/aktuelles", label: "Aktuelles der BSV" },
  { href: "/mitmachen", label: "Mitmachen" },
  { href: "/ueber-uns", label: "Über uns" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner shell">
        <div className="site-header-bar">
          <Link className="site-header-brand" href="/" aria-label="BSV Höxter – Startseite">
            <Image
              src="/logo-bsv-hoexter.webp"
              width={900}
              height={900}
              sizes="(max-width: 780px) 56px, 64px"
              alt=""
              priority
            />
          </Link>
          <button
            ref={menuButtonRef}
            className="site-menu-button"
            type="button"
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span>Menü</span>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        <nav id="primary-navigation" className="site-navigation" aria-label="Hauptnavigation" data-open={menuOpen}>
          {navigationItems.map((item) => (
            <Link
              className="site-navigation-link"
              href={item.href}
              key={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
