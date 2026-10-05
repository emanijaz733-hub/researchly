import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Researchly — research answers you can trace",
  description:
    "Researchly searches Wikipedia, arXiv, Hacker News, GitHub, Stack Exchange, and Open Library in parallel and answers with footnoted citations.",
};

/* Fonts (EB Garamond, Special Elite, Caveat) are loaded in globals.css. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-ink">{children}</body>
    </html>
  );
}
