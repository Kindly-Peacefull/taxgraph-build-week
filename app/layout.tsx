import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://taxgraph-build-week.vercel.app"),
  title: "TaxGraph — Source-backed AI deal mapping",
  description:
    "Decompose a cross-border AI deal, identify missing facts, and map source-gated tax touchpoints before the deal is signed.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    title: "TaxGraph — Source-backed AI deal mapping",
    description:
      "Turn a cross-border AI sale into a reviewable map of tax touchpoints, missing facts, evidence, and adviser questions.",
    url: "/",
    siteName: "TaxGraph",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TaxGraph — See the tax questions hiding inside an AI deal.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxGraph — Source-backed AI deal mapping",
    description: "See the tax questions hiding inside a cross-border AI deal.",
    images: ["/opengraph-image"],
  },
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
