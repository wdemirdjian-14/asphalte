import Link from "next/link";

import { AdminSidebar, AdminTabBar } from "@/components/admin/AdminNav";
import { logoutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: { default: "Backoffice", template: "%s · Atelier" } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <img
              src="/images/logo.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-md"
            />
            <span className="text-gilded text-lg font-bold">Asphalte</span>
          </Link>
          <span className="hidden text-xs tracking-[0.16em] text-ink-500 uppercase sm:inline">
            Espace atelier
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-400 sm:inline">
              {user.name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-gold-500/50 hover:text-gold-300"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 lg:pb-10">{children}</main>
      </div>

      <AdminTabBar />
    </div>
  );
}
