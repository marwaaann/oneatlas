import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CompareProvider } from "@/components/compare/compare-context";
import { CompareTray } from "@/components/compare/compare-controls";
import { CommandPalette } from "@/components/search/command-palette";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OneAtlas — AI model discovery & intelligence", template: "%s · OneAtlas" },
  description:
    "Discover, compare and evaluate AI models across labs and providers: pricing, context windows, capabilities and benchmarks in one place.",
};

export const viewport: Viewport = { themeColor: "#0a0b0d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col font-sans">
        <CompareProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-subtle md:flex-row md:justify-between md:px-6">
              <span>
                OneAtlas MVP · Sample dataset: prices and scores are approximate and for demonstration only.
              </span>
              <span className="flex gap-4">
                <Link href="/api/models" className="hover:text-muted">API</Link>
                <Link href="/api/health" className="hover:text-muted">Status</Link>
              </span>
            </div>
          </footer>
          <CompareTray />
          <CommandPalette />
        </CompareProvider>
      </body>
    </html>
  );
}
