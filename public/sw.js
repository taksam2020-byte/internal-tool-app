self.addEventListener('push', function(event) {
  const body = event.data?.text() ?? '新しい通知が届きました';
  event.waitUntil(
    self.registration.showNotification('社内ツール', {
      body: body,
      icon: '/logo.png'
    })
  );
});
