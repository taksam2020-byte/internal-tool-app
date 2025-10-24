self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png', // publicフォルダに置くアイコンのパス
    badge: '/badge-72x72.png', // publicフォルダに置くバッジのパス
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});