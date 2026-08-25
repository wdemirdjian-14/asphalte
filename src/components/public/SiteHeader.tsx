import { telHref } from "@/lib/format";

export function SiteHeader({ phone }: { phone: string }) {
  return (
    <header className="safe-top sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <img
          src="/images/logo.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-gilded text-lg leading-tight font-semibold tracking-tight">
            Asphalte
          </p>
          <p className="truncate text-[11px] tracking-wide text-ink-300 uppercase">
            Dépannage 2 roues · Boulogne
          </p>
        </div>
        <a
          href={telHref(phone)}
          className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400"
        >
          Appeler
        </a>
      </div>
    </header>
  );
}
