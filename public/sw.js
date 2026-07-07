self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      // Se tiveres um ícone bonito na pasta public, podes colocar o nome dele aqui (ex: /logo.png)
      icon: "/logo.png", 
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  // Abre o sistema quando clica na notificação
  event.waitUntil(clients.openWindow(event.notification.data.url));
});