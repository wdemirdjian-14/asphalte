import Link from "next/link";

import {
  Badge,
  Card,
  Empty,
  PageHeader,
  Select,
  buttonClass,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPlate } from "@/lib/format";
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
    include: { _count: { select: { replies: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messagerie"
        subtitle="Demandes reçues depuis le widget du site"
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
        <Card>
          <ul className="divide-y divide-slate-100">
            {messages.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/admin/messages/${message.id}`}
                  className="block py-3 transition-colors hover:text-gold-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {message.name}
                      {message.subject ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {message.subject}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex items-center gap-2">
                      {message.plate ? (
                        <Badge>{formatPlate(message.plate)}</Badge>
                      ) : null}
                      {message._count.replies > 0 ? (
                        <Badge tone="blue">
                          {message._count.replies} réponse(s)
                        </Badge>
                      ) : null}
                      <Badge tone={MESSAGE_STATUS_TONES[message.status]}>
                        {MESSAGE_STATUSES[message.status]}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {message.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {message.phone}
                    {message.email ? ` · ${message.email}` : " · sans e-mail"} ·{" "}
                    {formatDateTime(message.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
