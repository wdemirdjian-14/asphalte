import Link from "next/link";

import {
  Badge,
  Card,
  Empty,
  PageHeader,
  Select,
  buttonClass,
  buttonDangerClass,
  buttonGhostClass,
} from "@/components/ui";
import { deleteMessageAction, setMessageStatusAction } from "@/lib/actions/messages";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPlate, telHref } from "@/lib/format";
import {
  MESSAGE_STATUS_TONES,
  MESSAGE_STATUSES,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status in MESSAGE_STATUSES ? params.status : "";

  const messages = await prisma.contactMessage.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages du site"
        subtitle="Demandes envoyées depuis le widget de contact"
      />

      <form method="get" className="flex gap-2">
        <Select name="status" defaultValue={status} className="sm:w-56">
          <option value="">Tous les messages</option>
          {options(MESSAGE_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      {messages.length === 0 ? (
        <Empty>Aucun message.</Empty>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-100">
                      {message.name}
                      {message.subject ? (
                        <span className="ml-2 text-xs text-ink-400">
                          {message.subject}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      <a href={telHref(message.phone)} className="text-gold-300 hover:underline">
                        {message.phone}
                      </a>
                      {message.email ? ` · ${message.email}` : ""} ·{" "}
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {message.plate ? (
                      <Badge tone="gold">{formatPlate(message.plate)}</Badge>
                    ) : null}
                    <Badge tone={MESSAGE_STATUS_TONES[message.status]}>
                      {MESSAGE_STATUSES[message.status]}
                    </Badge>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 p-3 text-sm whitespace-pre-line text-ink-200">
                  {message.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {message.status !== "LU" ? (
                    <form action={setMessageStatusAction}>
                      <input type="hidden" name="id" value={message.id} />
                      <input type="hidden" name="status" value="LU" />
                      <button type="submit" className={buttonGhostClass}>
                        Marquer lu
                      </button>
                    </form>
                  ) : null}
                  {message.status !== "TRAITE" ? (
                    <form action={setMessageStatusAction}>
                      <input type="hidden" name="id" value={message.id} />
                      <input type="hidden" name="status" value="TRAITE" />
                      <button type="submit" className={buttonClass}>
                        Marquer traité
                      </button>
                    </form>
                  ) : null}
                  <Link href="/admin/clients/nouveau" className={buttonGhostClass}>
                    Créer une fiche client
                  </Link>
                  <form action={deleteMessageAction}>
                    <input type="hidden" name="id" value={message.id} />
                    <button type="submit" className={buttonDangerClass}>
                      Supprimer
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
