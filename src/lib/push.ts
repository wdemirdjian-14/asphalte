import "server-only";

import webpush from "web-push";

import { prisma } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

function ensureConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (configured) return true;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contact@asphalte.walautao.fr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
  return true;
}

/**
 * Notifie tous les appareils abonnés. Un abonnement périmé (404/410) est
 * supprimé : un iPhone qui désinstalle l'app ne doit pas rester en base.
 */
export async function notifyAll(payload: PushPayload): Promise<{
  sent: number;
  removed: number;
  failed: number;
}> {
  if (!ensureConfigured()) return { sent: 0, removed: 0, failed: 0 };

  const subscriptions = await prisma.pushSubscription.findMany();
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => undefined);
          removed += 1;
        } else {
          failed += 1;
        }
      }
    }),
  );

  return { sent, removed, failed };
}
