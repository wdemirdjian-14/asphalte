import type { BadgeTone } from "@/components/ui";

export const INTERVENTION_TYPES = {
  DEPANNAGE: "Dépannage",
  REPARATION: "Réparation",
  ENTRETIEN: "Entretien",
  DIAGNOSTIC: "Diagnostic",
} as const;

export const INTERVENTION_STATUSES = {
  OUVERT: "Ouvert",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  FACTURE: "Facturé",
  ANNULE: "Annulé",
} as const;

export const INTERVENTION_STATUS_TONES: Record<
  keyof typeof INTERVENTION_STATUSES,
  BadgeTone
> = {
  OUVERT: "gold",
  EN_COURS: "blue",
  TERMINE: "green",
  FACTURE: "neutral",
  ANNULE: "red",
};

export const PRODUCT_CATEGORIES = {
  PIECE: "Pièce",
  ACCESSOIRE: "Accessoire",
  PNEU: "Pneu",
  LUBRIFIANT: "Lubrifiant",
  EQUIPEMENT: "Équipement",
  CONSOMMABLE: "Consommable",
  AUTRE: "Autre",
} as const;

export const MOVEMENT_TYPES = {
  RECEPTION: "Réception",
  VENTE: "Vente",
  INTERVENTION: "Intervention",
  AJUSTEMENT: "Ajustement",
  RETOUR: "Retour",
  INVENTAIRE: "Inventaire",
} as const;

export const RECEPTION_STATUSES = {
  BROUILLON: "Brouillon",
  VALIDE: "Validée",
} as const;

export const MESSAGE_STATUSES = {
  NOUVEAU: "Nouveau",
  LU: "Lu",
  TRAITE: "Traité",
} as const;

export const MESSAGE_STATUS_TONES: Record<
  keyof typeof MESSAGE_STATUSES,
  BadgeTone
> = {
  NOUVEAU: "gold",
  LU: "blue",
  TRAITE: "green",
};

export const MEDIA_KINDS = {
  GARAGE: "Garage",
  ATELIER: "Atelier",
  EQUIPE: "Équipe",
  REALISATION: "Réalisation",
  AUTRE: "Autre",
} as const;

export function options<T extends Record<string, string>>(map: T) {
  return Object.entries(map) as [keyof T & string, string][];
}
