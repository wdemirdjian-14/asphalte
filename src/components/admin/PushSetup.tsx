"use client";

import { useEffect, useState } from "react";

type State =
  | "chargement"
  | "non-supporte"
  | "a-installer"
  | "desactive"
  | "refuse"
  | "actif";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS expose l'information sur navigator
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PushSetup({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("chargement");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // Sur iPhone, l'API n'apparaît qu'une fois l'app sur l'écran d'accueil
        setState(isIos() && !isStandalone() ? "a-installer" : "non-supporte");
        return;
      }

      if (Notification.permission === "denied") {
        setState("refuse");
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "actif" : "desactive");
    }

    detect().catch(() => setState("non-supporte"));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "refuse" : "desactive");
        setMessage("Notification refusée par l'appareil.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscription.toJSON(),
          label: isIos() ? "iPhone" : "Navigateur",
        }),
      });

      if (!response.ok) throw new Error("Enregistrement refusé par le serveur.");

      setState("actif");
      setMessage("Cet appareil recevra les nouveaux messages.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Activation impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("desactive");
      setMessage("Notifications coupées sur cet appareil.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const result = (await response.json()) as { sent?: number };
      setMessage(
        result.sent
          ? `Notification envoyée à ${result.sent} appareil(s).`
          : "Aucun appareil abonné.",
      );
    } finally {
      setBusy(false);
    }
  }

  const button =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="space-y-3">
      {state === "chargement" ? (
        <p className="text-sm text-slate-500">Vérification de l&apos;appareil…</p>
      ) : null}

      {state === "a-installer" ? (
        <div className="rounded-lg border border-gold-400 bg-gold-50 p-3 text-sm text-gold-900">
          <p className="font-semibold">Ajoutez d&apos;abord l&apos;app à l&apos;écran d&apos;accueil</p>
          <p className="mt-1 text-gold-800">
            Sur iPhone, les notifications ne sont possibles que depuis
            l&apos;application installée. Dans Safari : bouton{" "}
            <strong>Partager</strong> → <strong>Sur l&apos;écran d&apos;accueil</strong>.
            Rouvrez ensuite Asphalte depuis l&apos;icône, et revenez ici.
          </p>
        </div>
      ) : null}

      {state === "non-supporte" ? (
        <p className="text-sm text-slate-500">
          Cet appareil ou ce navigateur ne gère pas les notifications web.
        </p>
      ) : null}

      {state === "refuse" ? (
        <p className="text-sm text-red-700">
          Les notifications ont été refusées pour ce site. Réautorisez-les dans
          les réglages du navigateur, puis rechargez la page.
        </p>
      ) : null}

      {state === "desactive" ? (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className={`${button} bg-gold-500 text-ink-950 hover:bg-gold-400`}
        >
          {busy ? "Activation…" : "Activer les notifications"}
        </button>
      ) : null}

      {state === "actif" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
            Notifications actives
          </span>
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className={`${button} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Tester
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className={`${button} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Désactiver
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
