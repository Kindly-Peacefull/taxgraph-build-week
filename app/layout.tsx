import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxGraph for Software & AI Services",
  description:
    "Source-backed tax touchpoint mapping for a Serbian software or AI seller.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
