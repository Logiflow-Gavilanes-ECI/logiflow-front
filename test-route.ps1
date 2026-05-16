# ── LogiFlow E2E Test — Rutas coherentes en Bogotá ──────────────────
# Antes de correr: asegúrate de que ambos conductores tengan la app
# abierta y con GPS activo en las ubicaciones indicadas abajo.
#
# Conductores:
#   v-001 → conductor@logiflow.app   → zona NORTE (Suba)
#   v-002 → conductor2@logiflow.app  → zona SUR-OCCIDENTE (Kennedy)
#
# En el emulador de Android Studio puedes fijar la ubicación en:
#   Extended Controls (botón "..." en el emulador) → Location → GPS

$API = "https://logiflow-api.eastus2.cloudapp.azure.com/api/v1"

# ── 1. Login admin ───────────────────────────────────────────────────
Write-Host "Haciendo login..." -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$API/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"admin@logiflow.app","password":"Admin2026!"}'

$token = $login.access_token
Write-Host "Token obtenido OK" -ForegroundColor Green

# ── 2. Webhook con rutas coherentes ─────────────────────────────────
# v-001 sale desde Suba (NW) → paradas en zona noroccidente
# v-002 sale desde Kennedy (SW) → paradas en zona suroccidente
# Las zonas NO se cruzan → VROOM genera rutas limpias

$body = @{
  eventType = "TRAFFIC_UPDATE"
  vehicles  = @(
    @{ id = "v-001"; lat = 4.7411; lng = -74.0810; capacity = 100 },  # Suba
    @{ id = "v-002"; lat = 4.6281; lng = -74.1620; capacity = 100 }   # Kennedy
  )
  stops = @(
    # Zona Norte/Noroccidente → le toca a v-001
    @{ id = "stop-1"; lat = 4.7037; lng = -74.1152; demand = 20; priority = 1 },  # Engativá
    @{ id = "stop-2"; lat = 4.6728; lng = -74.1430; demand = 15; priority = 2 },  # Fontibón
    @{ id = "stop-3"; lat = 4.7200; lng = -74.0650; demand = 25; priority = 1 },  # Suba centro
    @{ id = "stop-4"; lat = 4.6935; lng = -74.0312; demand = 10; priority = 3 },  # Usaquén

    # Zona Sur/Suroccidente → le toca a v-002
    @{ id = "stop-5"; lat = 4.5861; lng = -74.1827; demand = 20; priority = 1 },  # Bosa
    @{ id = "stop-6"; lat = 4.6100; lng = -74.1550; demand = 15; priority = 2 },  # Kennedy sur
    @{ id = "stop-7"; lat = 4.6389; lng = -74.0858; demand = 25; priority = 1 },  # Teusaquillo
    @{ id = "stop-8"; lat = 4.5980; lng = -74.0761; demand = 10; priority = 3 }   # Centro
  )
} | ConvertTo-Json -Depth 5

Write-Host "`nDisparando webhook con 2 vehículos y 8 paradas..." -ForegroundColor Cyan
$result = Invoke-RestMethod -Uri "$API/webhook" `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body

Write-Host "Respuesta del webhook:" -ForegroundColor Green
$result | ConvertTo-Json -Depth 5
