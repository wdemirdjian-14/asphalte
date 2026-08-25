import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

export type MailResult =
  | { sent: true }
  | { sent: false; reason: string };

let cached: Transporter | null = null;

function config() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 465);
  // Le port 465 est en TLS implicite, le 587 en STARTTLS.
  const secure = (process.env.SMTP_SECURE ?? String(port === 465)) === "true";

  return { host, user, pass, port, secure };
}

export function isMailConfigured(): boolean {
  const { host, user, pass } = config();
  return Boolean(host && user && pass);
}

function transporter(): Transporter {
  if (cached) return cached;

  const { host, user, pass, port, secure } = config();
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cached;
}

export function mailFrom(): string {
  return (
    process.env.MAIL_FROM ??
    `Asphalte <${process.env.SMTP_USER ?? "contact@asphalte.walautao.fr"}>`
  );
}

/** Adresse interne prévenue à l'arrivée d'un message du site. */
export function atelierMailbox(): string | null {
  return process.env.MAIL_TO_ATELIER ?? process.env.SMTP_USER ?? null;
}

/**
 * Envoi d'un e-mail. N'échoue jamais bruyamment : l'appelant décide quoi
 * faire du résultat, et l'application reste utilisable sans SMTP configuré.
 */
export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<MailResult> {
  if (!isMailConfigured()) {
    return { sent: false, reason: "SMTP non configuré (voir SMTP_HOST, SMTP_USER, SMTP_PASSWORD)." };
  }

  try {
    await transporter().sendMail({
      from: mailFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo ?? atelierMailbox() ?? undefined,
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Envoi impossible.",
    };
  }
}

/** Vérifie la connexion au serveur SMTP, pour la page de diagnostic. */
export async function verifyMail(): Promise<MailResult> {
  if (!isMailConfigured()) {
    return { sent: false, reason: "SMTP non configuré." };
  }

  try {
    await transporter().verify();
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Connexion refusée.",
    };
  }
}

/** Gabarit commun : un e-mail lisible, aux couleurs de l'atelier. */
export function emailLayout(options: {
  title: string;
  bodyHtml: string;
  footer?: string;
}): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f4f4f5;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1c1c1c;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;">
      <tr>
        <td style="background:#0a0a0a;padding:20px 24px;">
          <span style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:26px;color:#f5c518;">Asphalte</span>
          <span style="display:block;margin-top:4px;font-size:11px;letter-spacing:2px;color:#a3a3a3;text-transform:uppercase;">Dépannage 2 roues · depuis 2002</span>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 16px;font-size:19px;color:#1c1c1c;">${options.title}</h1>
          ${options.bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px;font-size:12px;color:#6e6e6e;">
          ${options.footer ?? "Asphalte — 31 bis route de la Reine, 92100 Boulogne-Billancourt"}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
