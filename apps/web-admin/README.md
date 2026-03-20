# Web Admin Scaffold (Dispatcher/Admin)

This folder is prepared for the dispatcher and admin web dashboard.

## Intent
- Keep dashboard-specific UI logic here.
- Reuse shared domain contracts and services from `shared/*`.

## Next implementation step
1. Generate an Angular app (or Ionic PWA) directly in this folder.
2. Keep existing `src/app/core` as the shared-logic integration layer.
3. Build feature modules (fleet monitor, route board, stop management) on top.
