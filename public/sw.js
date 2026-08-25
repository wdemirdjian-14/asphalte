/* Service worker d'Asphalte.
 *
 * Volontairement minimal : il sert aux notifications push, pas au cache.
 * Un backoffice doit toujours afficher l'état réel du stock — on ne met
 * donc rien en cache.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passe-plat : nécessaire pour que le navigateur considère l'app installable.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Asphalte",
    body: "Nouvelle activité sur l'atelier.",
    url: "/admin",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "asphalte",
      data: { url: payload.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
