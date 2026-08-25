import { redirect } from "next/navigation";

import { buildReference } from "@/lib/refs";

export function text(formData: FormData, key: string): string {
  return (formData.get(key) ?? "").toString().trim();
}

export function optionalText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

export function number(formData: FormData, key: string, fallback = 0): number {
  const raw = text(formData, key).replace(",", ".");
  if (raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function integer(
  formData: FormData,
  key: string,
  fallback = 0,
): number {
  return Math.trunc(number(formData, key, fallback));
}

export function optionalInteger(
  formData: FormData,
  key: string,
): number | null {
  const raw = text(formData, key);
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) !== null;
}

/** Renvoie l'utilisateur sur le formulaire avec le message d'erreur. */
export function failWith(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

export function successAt(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}ok=${encodeURIComponent(message)}`);
}

/**
 * Référence séquentielle par année, ex. DEP-2026-0007.
 * On boucle en cas de collision (deux saisies simultanées à l'atelier).
 */
export async function nextReference(
  prefix: string,
  count: (year: number) => Promise<number>,
  exists: (reference: string) => Promise<boolean>,
): Promise<string> {
  const year = new Date().getFullYear();
  let sequence = (await count(year)) + 1;
  let reference = buildReference(prefix, year, sequence);

  while (await exists(reference)) {
    sequence += 1;
    reference = buildReference(prefix, year, sequence);
  }

  return reference;
}

export function yearRange(year: number): { gte: Date; lt: Date } {
  return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
}


/** Sécurise une valeur d'énumération venue d'un formulaire. */
export function pickEnum<T extends Record<string, string>>(
  map: T,
  raw: string,
  fallback: keyof T & string,
): keyof T & string {
  return (Object.prototype.hasOwnProperty.call(map, raw)
    ? raw
    : fallback) as keyof T & string;
}
