<div align="center">

# LogiFlow Mobile App

Ionic Angular driver-facing app with real-time route tracking, Google OAuth, and Firebase push notifications.

[![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)

</div>

---

## Overview

The mobile app is the driver-facing interface for LogiFlow. Drivers authenticate (email/password or Google OAuth), view their assigned delivery route on an interactive map, control trip status (Start → Arrived → Delivered), and receive push notifications when routes are re-optimized.

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| **Login** | `/login` | Email/password authentication + Google OAuth sign-in |
| **Register** | `/register` | New user registration + Google sign-up option |
| **Route** | `/route` | Active route with live map, stop list, trip controls |
| **Auth Callback** | `/auth-callback` | Handles Google OAuth redirect, stores JWT, redirects by role |

---

## Authentication

### Email + Password

1. User enters email and password on the login screen.
2. `POST /auth/login` returns `accessToken` + `refreshToken`.
3. Tokens stored via `AuthTokenService` from `@logiflow/shared-auth`.
4. Automatic redirect: `conductor` → `/route`, `admin` → web dashboard.

### Google OAuth

1. User taps **"Sign in with Google"** button.
2. Browser redirects to `GET /auth/google` on the Gateway API.
3. Google consent screen → callback → Gateway issues JWT.
4. Redirect to `/auth-callback?token=...&refreshToken=...&role=...`.
5. `AuthCallbackPage` stores tokens and redirects by role.

---

## Push Notifications (Firebase)

The app uses **Capacitor Push Notifications** to receive route updates from Firebase Cloud Messaging.

```text
App Launch → requestPermissions() → register()
         → FCM token received
         → POST /notifications/register-device (JWT-protected)
         → Ready to receive push notifications
```

- Initialized in `RoutePage.ionViewWillEnter()` (not constructor, to comply with async rules).
- Dynamic import of `@capacitor/push-notifications` for web fallback.
- Expired tokens are automatically cleaned up server-side.

---

## Key Features

- **Real-time tracking** — Socket.io connection for live position updates
- **Interactive map** — Google Maps with route polyline visualization
- **Trip controls** — Start / Arrived / Delivered status buttons
- **Role-based redirect** — Conductors go to route view, admins to web dashboard
- **Responsive** — 320px mobile to 768px+ tablet
- **Pulse animations** — Active stop badges with visual feedback

---

## Project Structure

```text
apps/mobile/src/
├── app/
│   ├── login/                ← Email + Google OAuth login
│   ├── register/             ← Registration + Google sign-up
│   ├── route/                ← Map, stops, trip controls, push init
│   ├── auth-callback/        ← OAuth redirect handler
│   ├── core/services/
│   │   ├── auth.service.ts
│   │   ├── push-notification.service.ts
│   │   ├── route.service.ts
│   │   └── driver-socket.service.ts
│   └── shared/components/
│       └── trip-status/      ← Start/Arrive/Deliver controls
├── theme/
│   └── variables.scss        ← Design system tokens
└── environments/
    └── environment.ts
```

---

## Run Locally

```bash
# From workspace root
cd apps/mobile
npx ionic serve --port 4200
```

Use Chrome DevTools device toolbar (`Ctrl+Shift+M`) for mobile viewport preview.

## Build

```bash
npm run typecheck --workspace=@logiflow/mobile
npm run build --workspace=@logiflow/mobile
```

---

## Shared Libraries Used

| Library | Purpose |
|---------|---------|
| `@logiflow/shared-models` | Vehicle, stop, and event interfaces |
| `@logiflow/shared-socket` | Typed Socket.io client for `vehicle:{id}` room |
| `@logiflow/shared-auth` | Token storage, JWT decode, expiration checks |
| `@logiflow/shared-maps` | Google Maps loader, Haversine distance |

---

## Cómo compilar el APK

Sigue estos pasos para generar el APK debug de la app móvil en Android Studio.

### Requisitos previos

- **Node.js** 18+ y **npm** 9+
- **Android Studio** Hedgehog (2023.1.1) o superior — incluye el SDK de Android y un emulador
- **JDK 17** (incluido en Android Studio)
- **Gradle** — Android Studio lo descarga automáticamente

Verifica que Android Studio esté instalado y que la variable `ANDROID_HOME` apunte al SDK:

```bash
# Windows PowerShell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

---

### Paso 1 — Instalar dependencias de Capacitor

Desde la raíz del monorepo:

```bash
npm install
```

Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/push-notifications`) ya está declarado en `apps/mobile/package.json`. El `npm install` de la raíz lo resuelve.

---

### Paso 2 — Build de producción del proyecto Ionic

```bash
# Desde la raíz del monorepo
npm run build --workspace=@logiflow/mobile
```

Esto genera la carpeta `apps/mobile/www/` con el bundle de producción.

> Si necesitas apuntar al backend de producción (`https://api.logiflow.app`), usa:
> ```bash
> npm run build -- --configuration production --workspace=@logiflow/mobile
> ```

---

### Paso 3 — Sincronizar con el proyecto Android nativo

```bash
# Desde apps/mobile/
cd apps/mobile
npx cap sync android
```

Esto copia el contenido de `www/` al proyecto Android en `apps/mobile/android/` y actualiza los plugins de Capacitor.

---

### Paso 4 — Configurar `google-services.json`

Coloca el archivo `google-services.json` (descargado desde Firebase Console → Proyecto LogiFlow → Android → `com.logiflow.app`) en:

```
apps/mobile/android/app/google-services.json
```

> **Nota:** Este archivo está en `.gitignore` — no lo subas al repositorio.

---

### Paso 5 — Abrir en Android Studio

```bash
npx cap open android
```

Android Studio se abre con el proyecto nativo en `apps/mobile/android/`.

La primera vez que abres el proyecto, Android Studio descarga las dependencias de Gradle automáticamente (puede tardar 2-5 minutos).

---

### Paso 6 — Compilar el APK debug

En Android Studio:

1. Espera a que termine la sincronización de Gradle (barra de progreso en la parte inferior).
2. Menú **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Cuando termine, aparece una notificación en la parte inferior derecha con el enlace **"locate"**.

El APK se genera en:

```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Paso 7 — Instalar en un emulador o dispositivo

**Emulador (Android Studio):**

1. Menú **Tools → Device Manager → Create Virtual Device**.
2. Selecciona un teléfono (ej. Pixel 7) con API 33 (Android 13) o superior.
3. Inicia el emulador y presiona **Run ▶** o arrastra el APK al emulador.

**Dispositivo físico:**

```bash
# Con el dispositivo conectado por USB y depuración USB habilitada
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Verificación del APK

Una vez instalada la app en el emulador:

- La pantalla de login debe cargar.
- Ingresa con un usuario `conductor` — credenciales de prueba en `.env.prod.example` del backend.
- El login exitoso debe navegar a la pantalla de ruta con el mapa de Google Maps.
- Verifica en los logs de Android Studio (**Logcat**) que no hay errores de CORS ni de conexión al backend.

---

### Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| `Gradle sync failed` | JDK no encontrado | En Android Studio: **File → Project Structure → SDK Location** → verifica JDK 17 |
| `google-services.json not found` | Archivo no copiado | Coloca el archivo en `android/app/google-services.json` |
| `ERR_CLEARTEXT_NOT_PERMITTED` | HTTP en producción | El build de producción usa `https://` — verifica `environment.prod.ts` |
| Mapa en blanco | API key no configurada | Verifica que `google-services.json` tiene la API key de Google Maps para Android |
| `adb: command not found` | `platform-tools` no en PATH | Agrega `$ANDROID_HOME/platform-tools` al PATH |

</div>
