import type { Prisma } from "@prisma/client";

type Money = Prisma.Decimal | number | string | null | undefined;

export function toNumber(value: Money): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function formatPrice(value: Money): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(toNumber(value));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Plaque de recherche : majuscules, sans espace, tiret ni point. */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Affichage AA-123-AA quand la plaque est au format SIV. */
export function formatPlate(plate: string): string {
  const raw = normalizePlate(plate);
  const siv = /^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(raw);
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`;
  return raw;
}

export function fullName(client: { firstName: string; lastName: string }): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
