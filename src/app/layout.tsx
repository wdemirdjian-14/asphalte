import type { Metadata, Viewport } from "next";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://asphalte.walautao.fr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Asphalte — Dépannage et réparation 2 roues à Boulogne-Billancourt",
    template: "%s · Asphalte",
  },
  description:
    "Asphalte, spécialiste du dépannage 2 roues à Boulogne-Billancourt depuis 2002. Réparation et entretien de motos et scooters, toutes marques. 31 bis route de la Reine.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Asphalte",
    title: "Asphalte — Dépannage 2 roues à Boulogne-Billancourt",
    description:
      "Dépannage, réparation et entretien de motos et scooters, toutes marques, depuis 2002.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
