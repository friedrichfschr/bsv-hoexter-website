import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteUrl } from "@/lib/site";
import "./foundation.css";

const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  robots: siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1") ? { index: false, follow: false } : { index: true, follow: true },
  title: "BSV Höxter",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${sourceSans.variable} ${newsreader.variable}`}>
      <body>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
