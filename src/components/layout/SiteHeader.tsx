"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigationItems = [
  { href: "/", label: "Startseite" },
  { href: "/schwarzes-brett", label: "Schwarzes Brett" },
  { href: "/aktuelles", label: "Aktuelles der BSV" },
  { href: "/mitmachen", label: "Mitmachen - BDK" },
  { href: "/ueber-uns", label: "Über uns" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuButtonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menuRef.current) return;
      menuRef.current.open = false;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    if (!menuRef.current) return;
    menuRef.current.open = false;
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner shell">
        <Link className="site-header-brand" href="/" aria-label="BSV Höxter – Startseite">
          <Image src="/logo-bsv-hoexter.webp" width={900} height={900} sizes="(max-width: 780px) 56px, 64px" alt="" priority />
        </Link>
        <nav id="primary-navigation" className="site-navigation site-desktop-navigation" aria-label="Hauptnavigation">
          {navigationItems.map((item) => (
            <Link className="site-navigation-link" href={item.href} key={item.href} aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ? "page" : undefined}>{item.label}</Link>
          ))}
        </nav>
        <details ref={menuRef} className="site-navigation-container" onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
          <summary ref={menuButtonRef} role="button" className="site-menu-button" aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}>
            <span>Menü</span>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </summary>
          <nav id="mobile-navigation" className="site-navigation" aria-label="Hauptnavigation">
            {navigationItems.map((item) => (
              <Link className="site-navigation-link" href={item.href} key={item.href} aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ? "page" : undefined} onClick={closeMenu}>{item.label}</Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
