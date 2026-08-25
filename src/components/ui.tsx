import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {title || action ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold tracking-[0.1em] text-slate-500 uppercase">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

const BADGE_TONES = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  gold: "border-gold-400 bg-gold-50 text-gold-800",
  green: "border-emerald-300 bg-emerald-50 text-emerald-800",
  red: "border-red-300 bg-red-50 text-red-800",
  blue: "border-sky-300 bg-sky-50 text-sky-800",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-50";

export const buttonGoldClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-50";

export const buttonGhostClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50";

export const buttonDangerClass =
  "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-50";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20 focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium tracking-wide text-slate-600 uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function FileInput(props: ComponentProps<"input">) {
  return (
    <input
      type="file"
      accept="image/*"
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white ${props.className ?? ""}`}
    />
  );
}

export function Alert({
  tone = "red",
  children,
}: {
  tone?: "red" | "green";
  children: ReactNode;
}) {
  const styles =
    tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-red-300 bg-red-50 text-red-900";
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</p>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      {ok ? <Alert tone="green">{ok}</Alert> : null}
    </div>
  );
}

export function DataRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "ghost",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "gold" | "ghost";
}) {
  const className =
    variant === "primary"
      ? buttonClass
      : variant === "gold"
        ? buttonGoldClass
        : buttonGhostClass;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Vignette carrée : photo produit, document véhicule… */
export function Thumb({
  src,
  alt = "",
  size = "md",
}: {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "sm" ? "h-11 w-11" : size === "lg" ? "h-24 w-24" : "h-16 w-16";

  return (
    <span
      className={`${dimensions} shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
          photo
        </span>
      )}
    </span>
  );
}
