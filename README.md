# LogiFlow Frontend Monorepo Scaffold

This repository is a frontend monorepo scaffold for LogiFlow, aligned with the existing backend services in the main LogiFlow workspace.

It is intentionally simple for sprint speed:
- No Nx or Turborepo yet.
- Shared TypeScript libraries are used directly by both apps.
- You can migrate to a full monorepo toolchain later when structure stabilizes.

## Why this structure

The backend already exposes shared contracts and realtime behavior that both frontend clients need:
- Same socket events and payloads (fleet and vehicle rooms, position and route updates).
- Same vehicle and stop domain shapes.
- Same token handling needs.
- Same map utility logic.

Keeping these in one `shared` layer avoids code duplication and drift.

## Workspace layout

```
apps/
	mobile/        # Driver-facing app scaffold (Ionic Angular target)
	web-admin/     # Dispatcher/admin dashboard scaffold (Angular or Ionic PWA target)
shared/
	auth/          # JWT/token helpers
	maps/          # Geometry and map helpers
	models/        # Domain models and socket event contracts
	socket/        # Socket.io client service
```

## Backend alignment used for this scaffold

This scaffold is based on the current backend implementation:
- Realtime rooms: `join:fleet`, `join:vehicle`.
- Realtime events: `vehicle:position`, `route:update`, `vehicle:offline`, `vehicle:online`, `joined`.
- API resources: `vehicles` and `stops`.
- Domain constraints from gateway DTOs and Prisma schema (lat/lng/capacity/demand/priority).

## Requirements

- Node.js 20+
- npm 10+

## Getting started

1. Install dependencies:

	 `npm install`

2. Copy environment template:

	 `copy .env.example .env`

3. Type-check all workspaces:

	 `npm run typecheck`

4. Build all workspaces:

	 `npm run build`

## Environment variables

Use `.env.example` as reference.

- `LOGIFLOW_API_BASE_URL`: Nest gateway base URL (example: `http://localhost:3000`)
- `LOGIFLOW_SOCKET_URL`: realtime socket URL (example: `http://localhost:3001`)
- `LOGIFLOW_GOOGLE_MAPS_API_KEY`: maps API key for frontend maps features

## Implementation notes

This is a scaffold, not a generated Angular/Ionic app yet.

Use this flow:
1. Generate Ionic Angular inside `apps/mobile`.
2. Generate Angular (or Ionic PWA) inside `apps/web-admin`.
3. Keep shared imports from `@logiflow/shared-*` packages.
4. Keep app-specific UI/state in each app, and shared business contracts in `shared/*`.

## Shared package summary

- `@logiflow/shared-models`
	- Central interfaces for vehicles, stops, and realtime payloads.
	- Socket event name constants.

- `@logiflow/shared-socket`
	- Typed socket service for join/subscribe workflows.
	- Handlers for route and position updates plus online/offline status.

- `@logiflow/shared-auth`
	- Token storage abstraction.
	- JWT payload decode and expiration checks.

- `@logiflow/shared-maps`
	- Haversine distance helpers.
	- Route distance fallback helper for polyline points.

## Suggested next sprint tasks

1. Replace app runtime placeholders with real Angular/Ionic modules and DI providers.
2. Add REST API clients for `vehicles` and `stops` in a shared data-access layer.
3. Add route board and fleet map UI modules in `web-admin`.
4. Add driver trip/session screens in `mobile`.
5. Add tests per workspace and CI checks for build/typecheck.