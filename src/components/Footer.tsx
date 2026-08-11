import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Image src="/logo-bsv-hoexter.webp" width={82} height={82} sizes="82px" alt="" loading="eager" />
          <div>
            <strong>BSV Höxter</strong>
            <p>Die gemeinsame Stimme der Schülervertretungen im Kreis Höxter.</p>
          </div>
        </div>

        <div>
          <h2>Direkt zu</h2>
          <ul>
            <li><Link href="/schwarzes-brett">Schwarzes Brett</Link></li>
            <li><Link href="/bdk">Bezirksdelegiertenkonferenz</Link></li>
            <li><Link href="/fuer-sven">Material für SVen</Link></li>
            <li><Link href="/schwarzes-brett/einreichen">Flyer einreichen</Link></li>
          </ul>
        </div>

        <div>
          <h2>BSV</h2>
          <ul>
            <li><Link href="/ueber-uns">Über uns</Link></li>
            <li><Link href="/mitmachen">Mitmachen & Kontakt</Link></li>
            <li><Link href="/aktuelles">Aktuelles</Link></li>
            <li><Link href="/redaktion">Redaktion</Link></li>
          </ul>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 Bezirksschülervertretung Kreis Höxter</span>
        <nav aria-label="Rechtliches">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/barrierefreiheit">Barrierefreiheit</Link>
        </nav>
      </div>
    </footer>
  );
}
