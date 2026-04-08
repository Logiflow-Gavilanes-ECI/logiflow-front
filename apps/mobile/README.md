# Mobile App (Ionic Angular)

Driver-facing mobile app for LogiFlow.

## Run locally

From workspace root:

```bash
npm run start --workspace=@logiflow/mobile -- --port 8100
```

Then open:

```text
http://localhost:8100/login
```

## Mobile viewport preview

Use Chrome or Edge DevTools and enable device toolbar (`Ctrl+Shift+M`) to preview iPhone/Android sizes.

## Build and checks

```bash
npm run typecheck --workspace=@logiflow/mobile
npm run build --workspace=@logiflow/mobile
```

## Current routes

- `/login`: Login screen with role-based redirect
- `/route`: Driver route view

