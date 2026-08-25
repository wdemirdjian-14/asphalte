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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
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
      className={`rounded-card border border-ink-800 bg-ink-900/60 ${className}`}
    >
      {title || action ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold tracking-[0.12em] text-gold-300 uppercase">
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
    <p className="rounded-lg border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-ink-400">
      {children}
    </p>
  );
}

const BADGE_TONES = {
  neutral: "border-ink-600 bg-ink-800 text-ink-200",
  gold: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  red: "border-brake-500/40 bg-brake-500/10 text-red-300",
  blue: "border-sky-500/40 bg-sky-500/10 text-sky-300",
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
  "inline-flex items-center justify-center rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-60";

export const buttonGhostClass =
  "inline-flex items-center justify-center rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-semibold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300";

export const buttonDangerClass =
  "inline-flex items-center justify-center rounded-lg border border-brake-500/50 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-brake-500/10";

export const inputClass =
  "w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-base text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none";

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
      <span className="text-[11px] tracking-[0.12em] text-ink-400 uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
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

export function Alert({
  tone = "red",
  children,
}: {
  tone?: "red" | "green";
  children: ReactNode;
}) {
  const styles =
    tone === "green"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-brake-500/40 bg-brake-500/10 text-red-200";
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</p>
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
    <div className="flex justify-between gap-4 border-b border-ink-800/70 py-2 last:border-0">
      <dt className="text-sm text-ink-400">{label}</dt>
      <dd className="text-right text-sm text-ink-100">{value}</dd>
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
  variant?: "primary" | "ghost";
}) {
  return (
    <Link href={href} className={variant === "primary" ? buttonClass : buttonGhostClass}>
      {children}
    </Link>
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
