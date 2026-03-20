# Mobile App Scaffold (Ionic Angular)

This folder is prepared for the driver-facing mobile app.

## Intent
- Keep the framework-specific code here (Ionic Angular pages, components, guards).
- Keep reusable business logic in shared libraries.

## Next implementation step
1. Generate an Ionic Angular app directly in this folder.
2. Keep existing `src/app/core` and wire it into Angular DI.
3. Keep imports from shared packages (`@logiflow/shared-*`) for realtime, models, auth, and maps.
