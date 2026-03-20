import { createDriverRuntime } from './app/core/runtime';

const socketUrl =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.LOGIFLOW_SOCKET_URL ?? 'http://localhost:3001';

const runtime = createDriverRuntime({
  socketUrl,
});

runtime.start();
