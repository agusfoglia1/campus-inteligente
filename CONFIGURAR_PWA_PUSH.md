# Campus como app y notificaciones push

## Instalación

El frontend ahora puede instalarse como aplicación desde el navegador. Abrí Campus en el navegador y usá **Instalar app** (o la opción equivalente del navegador). En iPhone/iPad, abrilo con Safari, tocá **Compartir** y elegí **Añadir a pantalla de inicio**.

La PWA necesita servirse mediante HTTPS para que funcione en un dominio publicado. En desarrollo local, `localhost` está permitido por los navegadores.

## Activar avisos push

Las claves VAPID identifican al servidor que envía notificaciones. Generá un único par y conservá la clave privada fuera de Git. El repositorio solo contiene nombres de variables vacías en `backend/.env.example`.

```bash
npm install -g web-push
web-push generate-vapid-keys --json
```

Copiá el valor `publicKey` a `VAPID_PUBLIC_KEY` y el `privateKey` a `VAPID_PRIVATE_KEY` en `backend/.env`. Completá `VAPID_SUBJECT` con una dirección de contacto válida. No compartas ni subas `backend/.env`.

Instalá las dependencias del backend y actualizá la base de datos:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

Luego reiniciá el backend y el frontend. Iniciá sesión en Campus, tocá **Activar avisos push** y aceptá el permiso del navegador. Los comunicados nuevos se notifican a las suscripciones activas; también se notifica cuando un comunicado borrador se publica. Si desactivás los avisos, se quita la suscripción de ese dispositivo.

El servidor y el sitio tienen que estar accesibles para que el navegador reciba los avisos. El envío push se ejecuta al publicar un comunicado. Los recordatorios de horarios no se envían aún como push.
