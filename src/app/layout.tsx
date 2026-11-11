import type { Metadata } from "next";
import "@fontsource/anuphan/thai-400.css";
import "@fontsource/anuphan/thai-500.css";
import "@fontsource/anuphan/thai-600.css";
import "@fontsource/anuphan/thai-700.css";
import "@fontsource/anuphan/latin-400.css";
import "@fontsource/anuphan/latin-500.css";
import "@fontsource/anuphan/latin-600.css";
import "@fontsource/anuphan/latin-700.css";
import "./globals.css";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: { siteName: site.name, locale: "th_TH", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <RevealObserver />
        <AnnouncementBar />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
