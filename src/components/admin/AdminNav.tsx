"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", short: "Bord" },
  { href: "/admin/recherche", label: "Recherche", short: "Recherche" },
  { href: "/admin/clients", label: "Clients", short: "Clients" },
  { href: "/admin/interventions", label: "Interventions", short: "Interv." },
  { href: "/admin/produits", label: "Produits & stock", short: "Stock" },
  { href: "/admin/receptions", label: "Réceptions", short: "Colis" },
  { href: "/admin/messages", label: "Messages", short: "Messages" },
  { href: "/admin/contenu", label: "Page publique", short: "Site" },
  { href: "/admin/reglages", label: "Réglages", short: "Réglages" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
      <ul className="sticky top-20 space-y-1">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(pathname, link.href)
                  ? "bg-gold-50 font-semibold text-gold-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
      <ul className="flex overflow-x-auto px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap ${
                isActive(pathname, link.href)
                  ? "bg-gold-50 text-gold-800"
                  : "text-slate-500"
              }`}
            >
              {link.short}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
