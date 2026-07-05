# Conectar Google Calendar — setup (una sola vez)

Objetivo: obtener un **Client ID** + **Client Secret** de Google para que el app cree eventos en el calendario "Hogar".

## 1. Proyecto
- Entra a **console.cloud.google.com** (con `capuzr@gmail.com`).
- Barra superior → **Select a project** → **New Project**.
- Name: `Mantenimiento Hogar` → **Create** → selecciónalo.

## 2. Habilitar la API
- Menú ☰ → **APIs & Services** → **Library**.
- Busca **Google Calendar API** → **Enable**.

## 3. Pantalla de consentimiento (Google Auth Platform)
> La consola nueva se llama **Google Auth Platform** y reparte lo que antes era
> un solo asistente en varias pestañas del menú izquierdo: **Público** (tipo de
> usuario + publicar + test users), **Acceso a los datos** (los *scopes*) y
> **Clientes** (las credenciales del paso 4). No hay un flujo de "Save and
> Continue"; cada pestaña se guarda por su cuenta.

### 3a. Información de la marca
- ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (o directo a **Google Auth Platform**).
- Si es la primera vez: **Comenzar** → App name `Mantenimiento Hogar` · correo de asistencia: tu correo · **Tipo de usuario: Externo** · correo del desarrollador: tu correo → **Crear**.

### 3b. Scopes → menú **Acceso a los datos**
- Menú izquierdo → **Acceso a los datos** → botón **Agregar o quitar permisos** (se abre un panel a la derecha).
- Baja hasta **"Agregar permisos de forma manual"** y pega los 3 (uno por línea):
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/calendar`
- **Agregar a la tabla** → **Actualizar** → **Guardar**.
- Si el scope `.../calendar` no lo acepta, falta habilitar la API (paso 2); habilítala y repite.
- `openid` + `email` = no sensibles; `calendar` = sensible (es lo que deja crear eventos). No hace falta nada más.

### 3c. Test users + Publicar → menú **Público**
- Menú izquierdo → **Público** → **Usuarios de prueba** → **Add users** → agrega `capuzr@gmail.com` y `mariaeugeniaalvarezb@gmail.com`.
- ⚠️ **Importante:** en **Público** → **Estado de publicación** → **Publicar app** → **Confirmar** (pásalo a *En producción*).
  - Sin esto (modo *Prueba*), el token **caduca a los 7 días** y habría que reconectar cada semana.
  - Saldrá un aviso de "app no verificada" al conectar: es normal para uso personal → **Avanzado** → **Ir a Mantenimiento Hogar (no seguro)** → continuar.

## 4. Credenciales (OAuth client)
- Menú izquierdo → **Clientes** → **Crear cliente** (o ☰ → **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**).
- Tipo de aplicación: **Aplicación web** · Nombre: `mantenimiento-carro`.
- **Authorized redirect URIs** → **Add URI** (agrega las que apliquen):
  - Local: `http://localhost:8787/api/google/callback`
  - Producción: `https://<TU-WORKER>.workers.dev/api/google/callback`  ← reemplaza por el dominio real del Worker
- **Create** → copia el **Client ID** y el **Client Secret**.

## 5. Poner las credenciales en el app
- **Local** — en `mantenimiento-carro/.dev.vars`:
  - `GOOGLE_CLIENT_ID="...apps.googleusercontent.com"`
  - `GOOGLE_CLIENT_SECRET="..."`
- **Producción:**
  - `GOOGLE_CLIENT_ID` → en `wrangler.jsonc` → `vars` (o el dashboard del Worker).
  - `GOOGLE_CLIENT_SECRET` → `npx wrangler secret put GOOGLE_CLIENT_SECRET` (nunca en el repo).

## 6. Conectar
- Abre el app → **Ajustes** → **Conectar Google Calendar**.
- Inicia sesión con `capuzr@gmail.com` → acepta el permiso de Calendar.
- El app crea (o reutiliza) el calendario **"Hogar"** y queda conectado.
- Listo: al **Aprobar** una sugerencia se crea el evento e invita a los 2 correos.

## Notas
- El **refresh token** se guarda en la base D1 del Worker (server-side), no en el navegador.
- Cambiar de dominio (workers.dev → dominio propio) = agregar esa nueva redirect URI en el paso 4.
- Para desconectar: **Ajustes** → **Desconectar**.
