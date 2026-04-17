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

</div>
