importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const serviceWorkerUrl = new URL(self.location.href);
const firebaseConfig = {
  apiKey: serviceWorkerUrl.searchParams.get('apiKey') ?? '',
  authDomain: serviceWorkerUrl.searchParams.get('authDomain') ?? '',
  projectId: serviceWorkerUrl.searchParams.get('projectId') ?? '',
  messagingSenderId: serviceWorkerUrl.searchParams.get('messagingSenderId') ?? '',
  appId: serviceWorkerUrl.searchParams.get('appId') ?? '',
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

if (hasFirebaseConfig) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification ?? {};
    const data = payload.data ?? {};
    const title = notification.title ?? 'Echo AI Alert';

    self.registration.showNotification(title, {
      body: notification.body ?? 'A high-risk item needs your attention.',
      data: {
        meetingId: data.meetingId ?? '',
        itemId: data.itemId ?? '',
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const itemId = event.notification.data?.itemId ?? '';
  const targetPath = itemId ? `/review?item=${encodeURIComponent(itemId)}` : '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients[0];
      if (existingClient) {
        if ('navigate' in existingClient) {
          return existingClient.navigate(targetPath).then(() => existingClient.focus());
        }

        return existingClient.focus();
      }

      return self.clients.openWindow(targetPath);
    }),
  );
});
