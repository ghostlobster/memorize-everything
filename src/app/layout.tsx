import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { SiteHeader } from "@/components/layout/site-header";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Memorize Everything",
  description:
    "AI-powered Knowledge Architect: deep-dive any topic with Feynman synthesis, Mermaid graphs, and spaced-repetition flashcards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
