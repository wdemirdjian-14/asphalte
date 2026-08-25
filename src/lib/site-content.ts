import { prisma } from "@/lib/db";

/**
 * Contenu de la page publique. Les valeurs ci-dessous sont les valeurs par
 * défaut ; toute clé présente en base (table SiteContent) les remplace.
 * C'est ce qui rendra la page administrable depuis le backoffice.
 */
export const SITE_DEFAULTS = {
  "hero.badge": "Dépannage 2 roues · Boulogne-Billancourt",
  "hero.title": "Asphalte",
  "hero.tagline": "Réparation de motocyclettes · Depuis 2002",
  "hero.subtitle":
    "Spécialiste du dépannage 2 roues. Nous intervenons sur toutes les marques, de la panne au bord de la route jusqu'à la remise en route à l'atelier.",
  "hero.image": "/images/garage.svg",
  "hero.imageAlt": "Le garage Asphalte, 31 bis route de la Reine à Boulogne-Billancourt",
  "hero.ctaPrimary": "Appeler l'atelier",
  "hero.ctaSecondary": "Écrire un message",

  "about.title": "L'atelier",
  "about.text":
    "Asphalte répare et dépanne les deux-roues à Boulogne-Billancourt depuis 2002. Moto, scooter, toutes marques : diagnostic, réparation, entretien et dépannage sont réalisés dans notre atelier du 31 bis route de la Reine.",
  "about.since": "2002",
  "about.brands": "Toutes marques",

  "services.title": "Nos prestations",
  "services.items": JSON.stringify([
    {
      title: "Dépannage 2 roues",
      text: "Immobilisé ? On récupère la machine et on la ramène à l'atelier.",
    },
    {
      title: "Réparation toutes marques",
      text: "Moteur, freinage, transmission, électricité : moto et scooter, toutes marques.",
    },
    {
      title: "Entretien & révision",
      text: "Vidange, plaquettes, pneus, courroie, contrôle avant grand trajet.",
    },
    {
      title: "Diagnostic",
      text: "Recherche de panne et devis avant intervention.",
    },
    {
      title: "Pièces & accessoires",
      text: "Pièces d'origine ou adaptables, équipements et consommables.",
    },
  ]),

  "info.title": "Infos pratiques",
  "info.address": "31 bis route de la Reine",
  "info.postalCode": "92100",
  "info.city": "Boulogne-Billancourt",
  "info.phone": "01 47 12 12 12",
  "info.email": "",
  "info.hours": JSON.stringify([
    { day: "Lundi – Vendredi", hours: "À compléter" },
    { day: "Samedi", hours: "À compléter" },
    { day: "Dimanche", hours: "Fermé" },
  ]),
  "info.mapsUrl":
    "https://www.google.com/maps/search/?api=1&query=31+bis+route+de+la+Reine+92100+Boulogne-Billancourt",

  "contact.title": "Un souci sur votre 2 roues ?",
  "contact.text":
    "Décrivez la panne en deux lignes, on vous rappelle. Précisez votre immatriculation si vous la connaissez, ça nous fait gagner du temps.",
  "contact.success":
    "Message bien reçu. L'atelier vous rappelle au plus vite.",
} as const;

export type SiteContentKey = keyof typeof SITE_DEFAULTS;
export type SiteContentMap = Record<SiteContentKey, string>;

export const SITE_CONTENT_KEYS = Object.keys(SITE_DEFAULTS) as SiteContentKey[];

/** Libellés du backoffice pour chaque bloc éditable. */
export const SITE_CONTENT_LABELS: Record<SiteContentKey, string> = {
  "hero.badge": "Bandeau — accroche",
  "hero.title": "Bandeau — titre",
  "hero.tagline": "Bandeau — sous-titre du logo",
  "hero.subtitle": "Bandeau — texte d'introduction",
  "hero.image": "Bandeau — photo du garage (URL)",
  "hero.imageAlt": "Bandeau — description de la photo",
  "hero.ctaPrimary": "Bandeau — bouton d'appel",
  "hero.ctaSecondary": "Bandeau — bouton message",
  "about.title": "À propos — titre",
  "about.text": "À propos — texte",
  "about.since": "À propos — année de création",
  "about.brands": "À propos — marques",
  "services.title": "Prestations — titre",
  "services.items": "Prestations — liste (JSON: title, text)",
  "info.title": "Infos pratiques — titre",
  "info.address": "Adresse",
  "info.postalCode": "Code postal",
  "info.city": "Ville",
  "info.phone": "Téléphone",
  "info.email": "E-mail",
  "info.hours": "Horaires (JSON: day, hours)",
  "info.mapsUrl": "Lien itinéraire",
  "contact.title": "Widget contact — titre",
  "contact.text": "Widget contact — texte",
  "contact.success": "Widget contact — message de confirmation",
};

export async function getSiteContent(): Promise<SiteContentMap> {
  const content: SiteContentMap = { ...SITE_DEFAULTS };

  try {
    const rows = await prisma.siteContent.findMany();
    for (const row of rows) {
      if (row.key in content && row.value.trim() !== "") {
        content[row.key as SiteContentKey] = row.value;
      }
    }
  } catch {
    // Base indisponible (build, première installation) : on sert les défauts.
  }

  return content;
}

export function parseJsonList<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export type ServiceItem = { title: string; text: string };
export type OpeningHours = { day: string; hours: string };
