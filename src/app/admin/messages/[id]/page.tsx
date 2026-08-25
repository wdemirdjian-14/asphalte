import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  DataRow,
  Flash,
  LinkButton,
  PageHeader,
  Textarea,
  buttonDangerClass,
  buttonGhostClass,
  buttonGoldClass,
} from "@/components/ui";
import {
  deleteMessageAction,
  replyToMessageAction,
  setMessageStatusAction,
} from "@/lib/actions/messages";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPlate, telHref } from "@/lib/format";
import { MESSAGE_STATUS_TONES, MESSAGE_STATUSES } from "@/lib/labels";
import { isMailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const message = await prisma.contactMessage.findUnique({
    where: { id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });

  if (!message) notFound();

  const mailReady = isMailConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title={message.name}
        subtitle={message.subject ?? "Message du site"}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={MESSAGE_STATUS_TONES[message.status]}>
              {MESSAGE_STATUSES[message.status]}
            </Badge>
            <LinkButton href="/admin/messages">Messagerie</LinkButton>
          </div>
        }
      />

      <Flash error={error} ok={ok} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Le fil : la demande, puis les réponses de l'atelier */}
          <Card title="Conversation">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {message.name} · {formatDateTime(message.createdAt)}
              </p>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-800">
                {message.message}
              </p>
            </article>

            {message.replies.map((reply) => (
              <article
                key={reply.id}
                className="mt-3 rounded-lg border border-gold-300 bg-gold-50 p-4"
              >
                <p className="flex flex-wrap items-center gap-2 text-xs text-gold-900">
                  <span>
                    {reply.authorName} · {formatDateTime(reply.createdAt)}
                  </span>
                  {reply.emailSent ? (
                    <Badge tone="green">Envoyé par e-mail</Badge>
                  ) : (
                    <Badge tone="red">Non envoyé</Badge>
                  )}
                </p>
                <p className="mt-2 text-sm whitespace-pre-line text-slate-800">
                  {reply.body}
                </p>
                {reply.emailError ? (
                  <p className="mt-2 text-xs text-red-700">{reply.emailError}</p>
                ) : null}
              </article>
            ))}
          </Card>

          <Card title="Répondre au client">
            {!mailReady ? (
              <p className="mb-3 rounded-lg border border-gold-400 bg-gold-50 px-3 py-2 text-sm text-gold-900">
                SMTP non configuré : la réponse sera enregistrée mais pas
                envoyée. Renseignez SMTP_HOST, SMTP_USER et SMTP_PASSWORD.
              </p>
            ) : null}

            {!message.email ? (
              <p className="mb-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Ce client n&apos;a pas laissé d&apos;adresse e-mail. La réponse
                restera dans le fil ; rappelez-le au{" "}
                <a href={telHref(message.phone)} className="font-semibold text-gold-700">
                  {message.phone}
                </a>
                .
              </p>
            ) : null}

            <form action={replyToMessageAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <Textarea
                name="body"
                rows={6}
                required
                placeholder={`Bonjour ${message.name}, nous pouvons intervenir…`}
              />
              <button type="submit" className={buttonGoldClass}>
                {message.email ? `Envoyer à ${message.email}` : "Enregistrer la réponse"}
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Contact">
            <dl>
              <DataRow
                label="Téléphone"
                value={
                  <a href={telHref(message.phone)} className="text-gold-700">
                    {message.phone}
                  </a>
                }
              />
              <DataRow label="E-mail" value={message.email ?? "—"} />
              <DataRow
                label="Immatriculation"
                value={message.plate ? formatPlate(message.plate) : "—"}
              />
              <DataRow label="Motif" value={message.subject ?? "—"} />
              <DataRow label="Reçu le" value={formatDateTime(message.createdAt)} />
            </dl>
          </Card>

          <Card title="Suivi">
            <div className="flex flex-wrap gap-2">
              {(["NOUVEAU", "LU", "TRAITE"] as const)
                .filter((status) => status !== message.status)
                .map((status) => (
                  <form key={status} action={setMessageStatusAction}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value={status} />
                    <input type="hidden" name="origin" value={`/admin/messages/${id}`} />
                    <button type="submit" className={buttonGhostClass}>
                      Marquer {MESSAGE_STATUSES[status].toLowerCase()}
                    </button>
                  </form>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <LinkButton href="/admin/clients/nouveau">
                Créer une fiche client
              </LinkButton>
              <form action={deleteMessageAction}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className={buttonDangerClass}>
                  Supprimer le message
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
