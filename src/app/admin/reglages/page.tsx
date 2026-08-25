import { PushSetup } from "@/components/admin/PushSetup";
import { Badge, Card, DataRow, Empty, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { atelierMailbox, isMailConfigured, mailFrom, verifyMail } from "@/lib/mail";
import { isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const mailConfigured = isMailConfigured();
  const pushConfigured = isPushConfigured();

  const [mailCheck, devices] = await Promise.all([
    mailConfigured ? verifyMail() : Promise.resolve(null),
    prisma.pushSubscription.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réglages"
        subtitle="Envoi d'e-mails et notifications de l'application"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Envoi d'e-mails">
          <dl>
            <DataRow
              label="Configuration"
              value={
                mailConfigured ? (
                  <Badge tone="green">Renseignée</Badge>
                ) : (
                  <Badge tone="red">Incomplète</Badge>
                )
              }
            />
            <DataRow label="Serveur" value={process.env.SMTP_HOST ?? "—"} />
            <DataRow label="Port" value={process.env.SMTP_PORT ?? "465"} />
            <DataRow label="Compte" value={process.env.SMTP_USER ?? "—"} />
            <DataRow label="Expéditeur" value={mailConfigured ? mailFrom() : "—"} />
            <DataRow label="Boîte de l'atelier" value={atelierMailbox() ?? "—"} />
            <DataRow
              label="Connexion"
              value={
                !mailCheck ? (
                  "—"
                ) : mailCheck.sent ? (
                  <Badge tone="green">Serveur joignable</Badge>
                ) : (
                  <Badge tone="red">Échec</Badge>
                )
              }
            />
          </dl>

          {mailCheck && !mailCheck.sent ? (
            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {mailCheck.reason}
            </p>
          ) : null}

          {!mailConfigured ? (
            <p className="mt-3 text-sm text-slate-600">
              Renseignez <code>SMTP_HOST</code>, <code>SMTP_USER</code> et{" "}
              <code>SMTP_PASSWORD</code> dans le fichier <code>.env</code> du
              serveur, puis relancez <code>docker compose up -d</code>.
            </p>
          ) : null}
        </Card>

        <Card title="Notifications de l'application">
          {pushConfigured ? (
            <PushSetup
              vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string}
            />
          ) : (
            <p className="text-sm text-slate-600">
              Clés VAPID absentes. Générez-les avec{" "}
              <code>npx web-push generate-vapid-keys</code>, puis renseignez{" "}
              <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> et{" "}
              <code>VAPID_PRIVATE_KEY</code> dans le <code>.env</code>.
            </p>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
              Appareils abonnés
            </h3>
            {devices.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Aucun appareil pour l&apos;instant.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {devices.map((device) => (
                  <li key={device.id} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 text-sm text-slate-800">
                      {device.label || "Appareil"}
                      <span className="block truncate text-xs text-slate-400">
                        {device.user?.name ?? "—"} · ajouté le{" "}
                        {formatDate(device.createdAt)}
                      </span>
                    </span>
                    <Badge tone="green">Actif</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card title="Installer l'application sur iPhone">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Ouvrir <strong>https://asphalte.walautao.fr/admin</strong> dans
            Safari (pas Chrome : sur iOS, seul Safari sait installer une app).
          </li>
          <li>
            Toucher le bouton <strong>Partager</strong> (le carré avec une
            flèche), puis <strong>Sur l&apos;écran d&apos;accueil</strong>.
          </li>
          <li>
            L&apos;icône Asphalte apparaît avec les autres applications. Ouvrir
            l&apos;app depuis cette icône.
          </li>
          <li>
            Revenir sur cette page depuis l&apos;app, puis toucher{" "}
            <strong>Activer les notifications</strong> et accepter la demande
            d&apos;autorisation.
          </li>
        </ol>
        <p className="mt-3 text-sm text-slate-500">
          iOS 16.4 minimum. Les notifications web n&apos;existent sur iPhone que
          depuis l&apos;application installée : depuis le navigateur, le bouton
          n&apos;apparaîtra pas.
        </p>
      </Card>
    </div>
  );
}
