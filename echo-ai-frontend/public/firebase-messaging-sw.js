importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA457B2eL45RHp9UipOhTWd6Rxv1mwEwyE',
  authDomain: 'echoai-27576.firebaseapp.com',
  projectId: 'echoai-27576',
  messagingSenderId: '944967725771',
  appId: '1:944967725771:web:682c26ef5a73d5ac4c214e',
});

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
