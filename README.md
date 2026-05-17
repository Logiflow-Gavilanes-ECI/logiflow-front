<div align="center">

# LogiFlow — Frontend Monorepo

**Real-time fleet management interfaces for drivers and dispatchers**

[![CI](https://github.com/Logiflow-Gavilanes-ECI/logiflow-front/actions/workflows/ci.yml/badge.svg)](https://github.com/Logiflow-Gavilanes-ECI/logiflow-front/actions/workflows/ci.yml)
[![Deploy Web Admin](https://github.com/Logiflow-Gavilanes-ECI/logiflow-front/actions/workflows/deploy-web-admin.yml/badge.svg)](https://github.com/Logiflow-Gavilanes-ECI/logiflow-front/actions/workflows/deploy-web-admin.yml)
[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular)](https://angular.dev)
[![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?logo=ionic)](https://ionicframework.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor)](https://capacitorjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[**Web Admin (live)**](https://logiflowapp.z13.web.core.windows.net) · [**Backend API**](https://logiflow-api.eastus2.cloudapp.azure.com/api/v1/docs)

</div>

---

## Overview

This monorepo contains two Angular applications sharing a set of typed libraries:

| App | Platform | Audience | Description |
|-----|----------|----------|-------------|
| **mobile** | Android (Capacitor) | Drivers | View active delivery route on a live map, report trip status, receive push notifications |
| **web-admin** | Web browser | Dispatchers | Real-time fleet map, vehicle tracking, event log, alert management |

Both apps authenticate exclusively via **Google OAuth** — no email/password login exists.

---

## Table of Contents

- [Apps](#apps)
- [Shared Libraries](#shared-libraries)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [CI/CD](#cicd)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Apps

### Mobile — Driver App

> `apps/mobile` · `@logiflow/mobile` · Ionic 8 + Angular 20 + Capacitor 8

The driver-facing Android app. Drivers sign in with Google, see their assigned delivery route on an interactive map, and report their status in real time.

**Key features:**

- Google OAuth sign-in (browser-based redirect via `?app=mobile`)
- Live route map with Google Maps — stop markers color-coded by status (pending / active / delivered)
- Ordered polyline overlay connecting all stops
- Trip status panel: **Start** / **Arrived** / **Delivered** buttons with optimistic UI
- Receives real-time route updates via Socket.io (`vehicle:<id>` room)
- Firebase Cloud Messaging push notifications for route updates
- Offline-resilient: gracefully handles network errors on login and route load

**Screens / routes:**

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `LoginPage` | Google sign-in with error handling |
| `/route` | `RoutePage` | Live map + stop list + status buttons |
| `/auth/callback` | `AuthCallbackComponent` | Handles OAuth redirect, stores JWT |

**Trip status flow:**

```text
[not started] ──Start──► [in_transit] ──Arrived──► [at_stop] ──Delivered──► advances to next stop
```

Each status change emits a `vehicle:status` event to the realtime server, which forwards it to the fleet room for dispatchers.

**Android build:**

```bash
cd apps/mobile
npm run build:android   # ng build + cap sync
npx cap open android    # open in Android Studio
```

APK output: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Capacitor plugins: `@capacitor/geolocation` · `@capacitor/push-notifications` · `@capacitor/preferences` · `@capacitor/browser` · `@capacitor/app`

---

### Web Admin — Dispatcher Dashboard

> `apps/web-admin` · `@logiflow/web-admin` · Angular 20 + Ionic 8

The dispatcher-facing web dashboard. Admins sign in with Google and monitor the entire fleet in real time.

**Key features:**

- Google OAuth sign-in (redirect via `?app=admin`)
- **Dashboard view:** live Google Maps with vehicle markers (directional cyan arrows), route polylines, vehicle info windows; sidebar with vehicle cards and color-coded event log
- **Fleet view:** full vehicle roster with status, plate, model, capacity, and position; click any vehicle to see its active route steps
- **Alerts view:** real-time alert feed from the event log
- Vehicle markers: cyan (`#00e5ff`) = online · red (`#ff1744`) = offline · 15-second offline grace timer
- Route polylines follow streets via Google Directions API with straight-line fallback
- Route toast: auto-dismissing 6-second notification on new route received
- Profile menu: user avatar, name, email, role, and logout
- Connection status indicator with reconnect button

**Screens / routes:**

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/login` | `LoginPage` | None | Google sign-in |
| `/auth/callback` | `AuthCallbackComponent` | None | OAuth redirect handler |
| `/home` | `HomePage` | `AuthGuard` (role: admin) | Full dashboard |

**Deploy target:** Azure Blob Storage static website —
`https://logiflowapp.z13.web.core.windows.net`

**Local dev:**

```bash
cd apps/web-admin
npm start
# http://localhost:4200
```

---

## Shared Libraries

Four typed libraries under `shared/` consumed by both apps via npm workspace paths.

### `@logiflow/shared-models`

TypeScript interfaces and constants shared across the entire platform.

```typescript
// Route step statuses
ROUTE_STEP_STATUS.Pending   // 'pending'
ROUTE_STEP_STATUS.Active    // 'active'
ROUTE_STEP_STATUS.Completed // 'completed'

// Socket event names
SOCKET_EVENTS.RouteUpdate      // 'route:update'
SOCKET_EVENTS.VehiclePosition  // 'vehicle:position'
SOCKET_EVENTS.VehicleOffline   // 'vehicle:offline'
```

Key interfaces: `Vehicle` · `Stop` · `DriverRoute` · `RouteStep` · `VehiclePositionEvent` · `RouteUpdateEvent` · `VehicleStatusEvent` · `JoinRoomAck`

### `@logiflow/shared-socket`

`LogiFlowSocketService` — typed socket.io-client wrapper.

```typescript
const socket = new LogiFlowSocketService({ url, auth: { token } });
await socket.connect();
socket.joinFleet();
socket.onRouteUpdate().subscribe(data => { /* ... */ });
socket.onVehiclePosition().subscribe(data => { /* ... */ });
```

Reconnect config: 10 attempts · 2s delay. Exports all event/room constants.

### `@logiflow/shared-auth`

`AuthTokenService` — JWT storage and decoding.

```typescript
authToken.setToken(jwt);
authToken.decodeClaims();   // → { sub, email, role, vehicleId, ... }
authToken.isExpired();
authToken.clearToken();
```

Storage key: `logiflow.auth.token` (localStorage on web, Capacitor Preferences on native).

### `@logiflow/shared-maps`

Angular injectable `MapsService` — Google Maps loader and geo utilities.

```typescript
await mapsService.loadGoogleMapsApi(apiKey);
const map = mapsService.createMap(element, options);

haversineDistanceKm(pointA, pointB);
totalPolylineDistanceKm(points);
toGoogleLatLngLiteral(coordinates);
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- A running [LogiFlow backend](https://github.com/Logiflow-Gavilanes-ECI/logiflow) (or use the live API)
- Google Maps API key (for map features)

### Install

```bash
git clone https://github.com/Logiflow-Gavilanes-ECI/logiflow-front.git
cd logiflow-front
npm install   # installs all workspaces
```

### Run web-admin

```bash
cd apps/web-admin
npm start
# http://localhost:4200
```

### Run mobile (browser preview)

```bash
cd apps/mobile
npm start
# http://localhost:8100
```

### Typecheck all packages

```bash
# from repo root
npm run typecheck
```

---

## Environment Variables

### Mobile (`apps/mobile/src/environments/environment.ts`)

| Variable | Dev default | Description |
|----------|-------------|-------------|
| `apiBaseUrl` | `http://localhost:3002/api/v1` | Gateway REST API base |
| `socketUrl` | `http://localhost:3001` | Realtime Socket.io URL |
| `googleMapsApiKey` | `''` | Google Maps JavaScript API key |
| `adminAppUrl` | `http://localhost:4200` | Web admin URL (redirect for admin-role users) |

> `environment.prod.ts` is not committed. Create it manually or inject via CI. The `android/app/google-services.json` (Firebase) is also excluded from the repo.

### Web Admin (`apps/web-admin`)

Injected at build time by `set-env.js` from OS environment variables:

| OS variable | Build target | Description |
|-------------|-------------|-------------|
| `API_URL` | `environment.apiUrl` | Gateway REST base URL |
| `REALTIME_URL` | `environment.realtimeUrl` | Socket.io URL |
| `GOOGLE_MAPS_API_KEY` | `environment.googleMapsApiKey` | Google Maps key |
| `DRIVER_APP_URL` | `environment.driverAppUrl` | Driver app URL (empty in prod — APK) |

**Production values (set in CI):**

```text
API_URL        = https://logiflow-api.eastus2.cloudapp.azure.com/api/v1
REALTIME_URL   = https://logiflow-api.eastus2.cloudapp.azure.com
DRIVER_APP_URL = (empty — driver app is an Android APK, not a URL)
```

---

## CI/CD

### Continuous Integration

Runs on every push and PR to `main`, `develop`, `feat/**`, `fix/**`.

```text
npm ci (root)
  ├── npm run typecheck      tsc -b across all apps + shared libs
  └── npm run lint -w @logiflow/web-admin
```

> Mobile lint is not yet wired into CI. Web-admin uses Angular ESLint.

### Continuous Deployment — Web Admin

Triggers automatically on every merge to `main` after CI passes.

```text
npm ci
  └── npm run build --configuration=production   (apps/web-admin)
      └── set-env.js injects API_URL, REALTIME_URL, GOOGLE_MAPS_API_KEY
  └── az storage blob upload-batch → Azure $web container
  └── index.html cache-control: no-cache, no-store, must-revalidate
```

**Required GitHub secrets:** `GOOGLE_MAPS_API_KEY` · `AZURE_STORAGE_ACCOUNT_NAME` · `AZURE_STORAGE_ACCOUNT_KEY`

> The mobile app has no automated deploy pipeline. APKs are built and distributed manually via Android Studio.

---

## Project Structure

```text
logiflow-front/
├── .github/
│   └── workflows/
│       ├── ci.yml                    Typecheck + lint on every push/PR
│       └── deploy-web-admin.yml      Build + deploy to Azure on main
├── apps/
│   ├── mobile/                       Ionic + Angular + Capacitor driver app
│   │   ├── android/                  Native Android project (Capacitor-managed)
│   │   ├── src/app/
│   │   │   ├── auth-callback/        OAuth redirect handler
│   │   │   ├── core/                 Services, constants, runtime config
│   │   │   ├── login/                Login page (Google OAuth)
│   │   │   ├── route/                Active route map + stop list
│   │   │   └── shared/components/    TripStatusComponent
│   │   └── capacitor.config.ts
│   └── web-admin/                    Angular dispatcher dashboard
│       ├── src/app/
│       │   ├── auth-callback/        OAuth redirect handler
│       │   ├── core/                 Services, guards, models
│       │   ├── event-log/            Real-time event stream component
│       │   ├── home/                 Dashboard shell (dashboard / fleet / alerts views)
│       │   ├── login/                Login page (Google OAuth)
│       │   ├── map/                  Google Maps component
│       │   └── vehicle-list/         Fleet sidebar component
│       └── set-env.js                Build-time env injection script
├── shared/
│   ├── auth/                         AuthTokenService + JWT utilities
│   ├── maps/                         MapsService + haversine geo utilities
│   ├── models/                       Shared TypeScript interfaces + constants
│   └── socket/                       LogiFlowSocketService wrapper
├── tsconfig.base.json                Path aliases for all shared libs
└── package.json                      npm workspaces root
```

---

## Team

**Los Gavilanes del Codigo — ARSW, Escuela Colombiana de Ingenieria Julio Garavito**

| Name | Handle | Area |
|------|--------|------|
| **Andersson David Sanchez Mendez** | [@AnderssonProgramming](https://github.com/AnderssonProgramming) | Architecture, CI/CD, infra |
| **Cristian Santiago Pedraza Rodriguez** | [@cris-eci](https://github.com/cris-eci) | Maps, route visualization |
| **Elizabeth Correa Suarez** | [@Eliza-05](https://github.com/Eliza-05) | Mobile app, Capacitor |
| **Juan Sebastian Ortega Munoz** | [@Juanseom](https://github.com/Juanseom) | Web admin, socket integration |

---

## License

MIT © 2026 LogiFlow — Escuela Colombiana de Ingenieria Julio Garavito
