self.addEventListener('push', (event) => {
  let data = { title: 'Campus Inteligente', body: 'Tenés una novedad universitaria.', url: '/dashboard' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/campus.svg',
    badge: '/icons/campus.svg',
    data: { url: data.url || '/dashboard' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = event.notification.data?.url || '/dashboard'
  const destination = new URL(path, self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) {
      existing.navigate(destination)
      return existing.focus()
    }
    return self.clients.openWindow(destination)
  }))
})
