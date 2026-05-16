# LogiFlow — Documento de Arquitectura · Release 2

**Equipo:** Los Gavilanes del Código  
**Asignatura:** Arquitecturas de Software — Escuela Colombiana de Ingeniería Julio Garavito  
**Integrantes:** Andersson David Sánchez Méndez · Cristian Santiago Pedraza Rodríguez · Elizabeth Correa Suárez · Juan Sebastián Ortega Muñoz  
**Fecha de sustentación:** 15 de mayo de 2026  
**Fecha de entrega:** 16 de mayo de 2026  

---

## 1. Introducción

### 1.1 Objetivo

El presente documento describe la arquitectura de software del sistema **LogiFlow**, una plataforma de ruteo dinámico de flotas en tiempo real con optimización asistida por inteligencia artificial. Su objetivo es documentar las decisiones de diseño, los atributos de calidad implementados, la tecnología seleccionada y el proceso de desarrollo ágil seguido durante los diez sprints del proyecto.

### 1.2 Alcance

LogiFlow cubre el ciclo completo de gestión de rutas para flotas de vehículos de distribución: desde la recepción de eventos de tráfico automatizados (vía n8n), pasando por la optimización del Problema de Ruteo de Vehículos (VRP) con VROOM y gRPC, hasta la entrega en tiempo real de rutas actualizadas a despachadores (web) y conductores (móvil) mediante WebSockets. El sistema está desplegado en Microsoft Azure y corre en producción con datos reales.

### 1.3 Audiencia

Este documento está dirigido a:
- **Docentes evaluadores** de la asignatura Arquitecturas de Software (ECI).
- **Integrantes del equipo** como referencia técnica y de decisiones de diseño.
- **Futuros mantenedores** del sistema que requieran comprender la arquitectura antes de modificarla.

---

## 2. Visión General

### 2.1 Descripción del sistema

LogiFlow es una plataforma distribuida, cloud-native, que resuelve el **VRP dinámico en tiempo real**: dado un conjunto de vehículos con capacidad y ubicación GPS, y un conjunto de paradas con demanda y ventanas de tiempo, el sistema calcula la asignación y secuencia óptima en menos de 4 segundos ante cualquier evento (tráfico, nueva orden, avería) y empuja la ruta actualizada instantáneamente a todos los clientes conectados.

El sistema está compuesto por dos monorepos:
- **`logiflow`**: backend de microservicios (NestJS Gateway, Socket.io Realtime, VROOM Optimizer, AI Predictor, n8n Automation).
- **`logiflow-front`**: frontend (Angular PWA web-admin para despachadores + Ionic Angular móvil para conductores).

### 2.2 Requerimientos funcionales clave

| ID | Requerimiento | Implementación real |
|---|---|---|
| RF-01 | Autenticación de usuarios (email/password y Google OAuth) | `POST /api/v1/auth/login`, `GET /api/v1/auth/google` — NestJS + Passport |
| RF-02 | Registro y gestión de vehículos | `GET/POST/PATCH /api/v1/vehicles` — Prisma + PostgreSQL |
| RF-03 | Optimización de rutas ante eventos de tráfico | n8n webhook → Gateway → gRPC → Optimizer (VROOM) |
| RF-04 | Entrega de rutas en tiempo real a conductores y despachadores | Socket.io rooms `fleet` y `vehicle:v-xxx` con Redis Pub/Sub |
| RF-05 | Seguimiento GPS en tiempo real de la flota | Evento `vehicle:position` cada ~5s; snapshot en Redis al unirse a `fleet` |
| RF-06 | Gestión de paradas y confirmación de entregas | `PATCH /api/v1/stops/:id/status`; estado `pending → active → completed` |
| RF-07 | App móvil para conductores (Android) | Ionic Angular + Capacitor; APK generado con Android Studio |
| RF-08 | Dashboard web para despachadores | Angular PWA; mapa Google Maps; lista de vehículos; registro de eventos |
| RF-09 | Notificaciones push a conductores | Firebase Cloud Messaging (`firebase-admin`) |
| RF-10 | Automatización de alertas de tráfico | n8n workflow → Telegram bot + webhook al Gateway |

### 2.3 Requerimientos no funcionales clave

| Atributo | Requerimiento | Sección |
|---|---|---|
| Disponibilidad | ≥ 99.69% (infraestructura Azure) | §4.1 |
| Seguridad | JWT en WebSocket + HTTPS/WSS + bcrypt + refresh token rotation | §4.2 / §8 |
| Mantenibilidad | Cobertura de tests ≥ 80% en ambos repositorios | §4.3 |
| Portabilidad | 100% dockerizado; migrable a On-Premise sin cambio de código | §4.4 |
| Rendimiento | TPS máximo medido con JMeter (ver §4.5) | §4.5 |

---

## 3. Marco Metodológico

### 3.1 Metodología — Scrum

El equipo adoptó **Scrum** como marco ágil de desarrollo, con sprints de duración variable (1–2 semanas) coordinados mediante **Azure DevOps** como herramienta de gestión del backlog. Las ceremonias realizadas en cada sprint fueron: Planning, Daily Standup (asíncrono vía Discord), Review y Retrospectiva.

Herramientas de soporte:
- **Azure DevOps**: backlog, tablero Kanban, burndown chart.
- **GitHub**: repositorios `logiflow` y `logiflow-front`; pull requests con revisión entre pares.
- **Discord**: comunicación del equipo y canal de integración con bots.
- **Notion**: documentación de planning y decisiones de arquitectura por sprint.

### 3.2 Criterios DoR / DoD

**Definition of Ready (DoR):** Una historia de usuario está lista para entrar a un sprint cuando:
- Tiene criterios de aceptación definidos y verificables.
- Las dependencias externas (APIs de compañeros, contratos gRPC, eventos Socket.io) están acordadas.
- El entorno de desarrollo local es reproducible (Docker Compose levanta todos los servicios).

**Definition of Done (DoD):** Una historia de usuario está terminada cuando:
- El código está commiteado en la rama correspondiente y el PR fue aprobado.
- Los tests unitarios pasan y la cobertura no disminuye respecto al sprint anterior.
- La funcionalidad fue probada manualmente contra el backend real (no solo mocks).
- El build de producción (`ng build --configuration production` / `tsc`) no tiene errores.

### 3.3 Planificación y estimación — 10 Sprints

| Sprint | Nombre | Objetivo principal | Puntos | Estado |
|---|---|---|---|---|
| S1 | MVP Conectado | Monorepo funcional, Socket.io + Redis, posición GPS básica | 13 | ✅ |
| S2 | APIs Reales | REST endpoints, PostgreSQL + Prisma, JWT HTTP, rooms de Socket.io | 21 | ✅ |
| S3 | Optimizer Vivo | VROOM + gRPC, AI Predictor, n8n automation, emitRouteUpdate | 21 | ✅ |
| S4 | Interfaces + Auth | Web-admin Angular, app móvil Ionic, JWT WebSocket, AuthGuard | 34 | ✅ |
| S5 | Cloud Deploy Azure | Terraform (Azure VM), Docker Compose prod, Azure Blob Storage Static Website, CI/CD | 46 | ✅ |
| S6 | Observabilidad | Tests unitarios (≥80% cobertura), Swagger, documento de arquitectura | 34 | ✅ |
| S7 | Escala / Performance | JMeter load testing, TPS/TPM, ajuste de connection pools | 21 | ✅ |
| S8 | Push Notifications | Firebase FCM, Telegram bot n8n, sistema de alertas en tiempo real | 13 | ✅ |
| S9 | Google OAuth + RBAC | OAuth 2.0, whitelist admin, refresh token rotation, auth-callback page | 21 | ✅ |
| S10 | Production Hardening | APK Android, rate limiting, CORS hardening, Release 2 final | 21 | ✅ |

**Velocidad promedio del equipo:** ~24.5 puntos por sprint  
**Total entregado:** 245 puntos en 10 sprints

---

## 4. Atributos de Calidad (NFR)

### 4.1. Disponibilidad — Escalabilidad y Tolerancia a Fallos

#### Descripción general de la arquitectura desplegada

LogiFlow opera sobre una arquitectura distribuida en Microsoft Azure compuesta por dos capas independientes:

- **Capa frontend**: Angular PWA (Ionic) servida desde **Azure Blob Storage** (Static Website) con HTTPS nativo. El CDN estándar de Azure no fue configurado debido a restricciones de permisos en la suscripción de estudiantes.
- **Capa backend**: Conjunto de microservicios dockerizados corriendo sobre una **Azure Virtual Machine** (`Standard_D2s_v3`, Ubuntu 24.04 LTS, región East US 2), orquestada mediante **Docker Compose** y provisionada con **Terraform**.

La infraestructura completa está definida como código (IaC) en el directorio `infra/terraform/azure/` del repositorio, con dos módulos:

- `modules/network`: VNet (`10.0.0.0/16`), Subnet (`10.0.0.0/24`), Public IP estática Standard (zona-redundante en zonas 1, 2 y 3), Network Security Group con reglas para puertos 22, 80, 443, 3001 y 3002.
- `modules/vm`: Azure Linux VM con OS Disk Premium LRS, boot diagnostics habilitado, y asociación al NSG y Public IP del módulo de red.

La arquitectura **no es monolítica**: frontend y backend son componentes independientes, desplegados en infraestructuras distintas y comunicados únicamente por HTTP/WebSocket a través de la IP pública. Los servicios internos del backend se comunican dentro de la red Docker (`logiflow-prod`) sin exposición exterior.

---

#### Escalabilidad horizontal

Aunque el despliegue actual utiliza una única VM para el backend, la arquitectura está **diseñada para escalar horizontalmente**:

| Servicio | Estrategia de escala horizontal |
|---|---|
| NestJS Gateway (`:3002`) | Stateless — múltiples instancias detrás de un balanceador (Azure Load Balancer o Application Gateway) |
| Socket.io Realtime (`:3001`) | Redis Pub/Sub desacopla instancias — múltiples nodos comparten el mismo canal `fleet` |
| PostgreSQL (`:5432`) | Escala vertical o migración a Azure Database for PostgreSQL (PaaS) con réplicas de lectura |
| Redis (`:6379`) | Redis Cluster o Azure Cache for Redis Premium con réplicas |
| VROOM Optimizer (`:50051`) | Sin estado — múltiples instancias gRPC detrás de un proxy |
| AI Predictor (`:5001`) | Stateless Python — múltiples réplicas |
| Frontend (Blob Storage) | Azure Blob Storage Static Website sirve el build estático — escala automáticamente por ser almacenamiento gestionado |

El uso de **Redis Pub/Sub** como broker de mensajes entre el Gateway y el servicio Realtime es la táctica clave que habilita el escalado horizontal del componente WebSocket sin pérdida de eventos.

El balanceador de carga está contemplado en la arquitectura como el punto de entrada al backend. En la infraestructura actual, el **Azure Public IP Standard con zona-redundancia** actúa como entry point, y el Terraform está preparado para agregar un Azure Load Balancer o Application Gateway sin cambios en los módulos de red existentes.

---

#### Escenario de calidad — Disponibilidad

| Campo | Descripción |
|---|---|
| **Fuente** | Usuario externo (despachador o conductor) |
| **Estímulo** | Solicitudes continuas al sistema durante operación normal y picos de uso |
| **Entorno** | Operación normal — todos los servicios activos |
| **Artefacto** | Sistema LogiFlow completo (frontend + backend + tiempo real) |
| **Respuesta** | El sistema procesa solicitudes sin interrupciones perceptibles para el usuario |
| **Medida de respuesta** | Disponibilidad ≥ 99.69%, downtime mensual < 2.23 horas, downtime anual < 27.1 horas |

---

#### Componentes, SLAs y modo de operación

| Componente | Proveedor / Tecnología | SLA Oficial | Modo |
|---|---|---|---|
| Azure Blob Storage — LRS (Static Website) | Microsoft Azure | 99.9% = 0.9990 | Serie |
| Azure Public IP Standard (zona-redundante) | Microsoft Azure | 99.99% = 0.9999 | Serie |
| Azure VM Standard_D2s_v3 (Premium SSD) | Microsoft Azure | 99.9% = 0.9990 | Serie |
| NestJS Gateway (Docker) | Software propio | ~99.5% = 0.9950 | Serie |
| PostgreSQL 16-alpine (Docker) | Open source / Docker | ~99.5% = 0.9950 | Serie |
| Redis 7-alpine (Docker) | Open source / Docker | ~99.5% = 0.9950 | Serie |
| Socket.io Realtime Service (Docker) | Software propio | ~99.5% = 0.9950 | Serie |
| VROOM Optimizer (Docker) | Open source / Docker | ~99.0% = 0.9900 | Serie |

> Los SLAs de componentes de software propio y open source no tienen garantía oficial del proveedor cloud; los valores son estimados conservadores basados en prácticas de la industria. Los SLAs de Azure corresponden a los publicados en [https://azure.microsoft.com/en-us/support/legal/sla/](https://azure.microsoft.com/en-us/support/legal/sla/).

---

#### Cálculo de disponibilidad total

Todos los componentes operan **en serie** para que una solicitud E2E (login → dashboard → tiempo real) sea exitosa: si cualquier componente falla, el flujo completo se interrumpe.

**Fórmula en serie:**

$$A_{total} = \prod_{i} A_i$$

**Cálculo paso a paso:**

| Paso | Componentes | Cálculo | Resultado |
|---|---|---|---|
| 1 | Blob Storage | 0.9990 | 0.99900 |
| 2 | × Public IP | 0.99900 × 0.9999 | 0.99890 |
| 3 | × Azure VM | 0.99890 × 0.9990 | 0.99790 |
| 4 | × Gateway | 0.99790 × 0.9950 | 0.99291 |
| 5 | × PostgreSQL | 0.99291 × 0.9950 | 0.98795 |
| 6 | × Redis | 0.98795 × 0.9950 | 0.98301 |
| 7 | × Realtime | 0.98301 × 0.9950 | 0.97810 |
| 8 | × VROOM | 0.97810 × 0.9900 | **0.96832** |

$$A_{total} \approx 0.96832 = \textbf{96.83\%}$$

> **Nota**: Si se excluyen los servicios de software interno (sin SLA oficial) y se calcula solo sobre la infraestructura cloud de Azure, la disponibilidad es:
>
> $$A_{cloud} = 0.9990 \times 0.9999 \times 0.9990 \approx 0.9979 = \textbf{99.79\%}$$
>
> *El CDN de Azure no fue configurado (restricciones de suscripción de estudiantes) — el frontend se sirve directamente desde Azure Blob Storage Static Website.*

---

#### Cálculo de downtime

**Infraestructura cloud (99.79%):**

| Métrica | Cálculo | Resultado |
|---|---|---|
| Downtime mensual | (1 − 0.9979) × 30 días | **0.063 días ≈ 1.51 horas/mes** |
| Downtime anual | (1 − 0.9979) × 365 días | **0.77 días ≈ 18.4 horas/año** |

**Sistema completo incluyendo software (96.83%):**

| Métrica | Cálculo | Resultado |
|---|---|---|
| Downtime mensual | (1 − 0.9683) × 30 días | **0.951 días ≈ 22.8 horas/mes** |
| Downtime anual | (1 − 0.9683) × 365 días | **11.6 días/año** |

---

#### Número de "nueves"

| Capa | Disponibilidad | Nueves |
|---|---|---|
| Infraestructura Azure (Blob + IP + VM) | 99.79% | ~2 nueves |
| Sistema completo (incluyendo software) | 96.83% | ~1.5 nueves |

**Limitación identificada y mejora propuesta:**

El cuello de botella actual es la **VM única** que aloja todos los servicios backend. Para alcanzar **3 nueves (99.9%)** en el sistema completo se recomienda:

1. Agregar un **Azure Load Balancer** frente a múltiples instancias del Gateway y Realtime.
2. Migrar PostgreSQL a **Azure Database for PostgreSQL Flexible Server** (SLA 99.99%).
3. Migrar Redis a **Azure Cache for Redis** (SLA 99.9%).
4. Desplegar el backend con **Azure Container Apps** o **AKS** para reinicio automático de contenedores fallidos.

Estas mejoras llevarían la disponibilidad cloud a ~99.96% (~3.5 nueves), reduciendo el downtime mensual a menos de 20 minutos.

---

*Sección redactada con base en la arquitectura real desplegada en Azure (East US 2), rama `develop` del repositorio backend `logiflow` y rama `feat/deploy-front` del repositorio frontend `logiflow-front`. SLAs consultados en mayo de 2026.*

---

### 4.2. Seguridad

#### Contexto de seguridad del sistema

LogiFlow maneja datos sensibles en tiempo real: credenciales de usuario, posiciones GPS de vehículos y tokens de sesión. La arquitectura implementa tácticas de seguridad basadas en el marco de referencia de Bass, Clements & Kazman (*Software Architecture in Practice*) en tres categorías: **Resistir ataques**, **Detectar ataques** y **Confidencialidad y autenticación**.

---

#### Escenario de Seguridad 1 — Autenticación en conexión WebSocket

**Táctica aplicada:** Autenticar actores (*Authenticate Actors*) — Resistir ataques

| Campo | Descripción |
|---|---|
| **Fuente** | Usuario o atacante externo sin sesión válida |
| **Estímulo** | Intento de establecer conexión WebSocket al Realtime Service sin token JWT, con token expirado o con token manipulado |
| **Entorno** | Sistema en producción; HTTPS/WSS activo; Realtime Service corriendo en Azure VM |
| **Artefacto** | Middleware de autenticación Socket.io (`services/realtime/src/middleware/auth.js`) |
| **Respuesta** | El middleware `io.use()` intercepta la conexión antes de que se procese cualquier evento. Verifica el JWT del campo `socket.handshake.auth.token` con `jsonwebtoken.verify()` usando `JWT_SECRET`. Si el token es ausente, expirado o inválido, rechaza la conexión con `Error('Unauthorized')`. El cliente nunca puede unirse a los rooms `fleet` ni `vehicle:*`. En el frontend, el `DriverSocketService` detecta el `connect_error` y ejecuta `authService.logout()`, redirigiendo al login. |
| **Medida de respuesta** | 100% de conexiones sin JWT válido son rechazadas antes de acceder a cualquier room; tiempo de rechazo < 5 ms; el socket nunca llega al estado `connected`. |

**Fragmento implementado** (`auth.js`):
```javascript
function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    socket.role   = payload.role;
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
}
```

**Complemento — autenticación HTTP (Gateway):** El NestJS Gateway valida el JWT en cada request REST usando `passport-jwt` con `ExtractJwt.fromAuthHeaderAsBearerToken()` y `ignoreExpiration: false`. El payload incluye `{ sub, email, role, vehicleId }`. Las contraseñas se almacenan como hash bcrypt (salt rounds = 10) y nunca en texto plano.

---

#### Escenario de Seguridad 2 — Autorización basada en roles

**Táctica aplicada:** Autorizar actores (*Authorize Actors*) — Resistir ataques

| Campo | Descripción |
|---|---|
| **Fuente** | Conductor autenticado (rol `conductor`) o usuario no autenticado |
| **Estímulo** | Intento de acceder al dashboard del administrador (`/home`) desde el navegador |
| **Entorno** | Sistema en producción; usuario con JWT válido pero rol incorrecto, o sin JWT |
| **Artefacto** | `AuthGuard` en Angular web-admin (`apps/web-admin/src/app/core/guards/auth.guard.ts`) y `JwtAuthGuard` en NestJS Gateway (`services/gateway/src/auth/jwt-auth.guard.ts`) |
| **Respuesta** | El `AuthGuard` de Angular decodifica el JWT almacenado en `localStorage`, extrae el campo `role` y evalúa si es `admin`. Si el rol no es `admin` o no existe token, redirige inmediatamente a `/login` sin renderizar el dashboard ni emitir `join:fleet`. En el backend, el `JwtAuthGuard` de NestJS protege todos los endpoints REST; los endpoints marcados con `@Public()` (login, registro) son la única excepción. |
| **Medida de respuesta** | 100% de accesos con rol `conductor` o sin token son bloqueados antes de cargar el dashboard; redirección completada en < 100 ms; ningún evento de socket ni dato de flota es expuesto al usuario no autorizado. |

**Roles del sistema:**

| Rol | Acceso permitido | Acceso denegado |
|---|---|---|
| `admin` | Web admin dashboard, Fleet view, Alerts | — |
| `conductor` | App móvil, ruta asignada | Dashboard web, datos de flota |
| Sin token | Pantalla de login | Todo lo demás |

**Google OAuth con asignación de rol por whitelist:** El servicio de autenticación implementa Google OAuth. Al iniciar sesión con Google, el sistema consulta la variable de entorno `GOOGLE_ADMIN_EMAILS` (lista de correos separados por coma). Si el email está en la lista, el usuario recibe rol `admin`; de lo contrario, recibe rol `conductor` automáticamente. El email se normaliza a minúsculas antes de comparar para prevenir bypass por variaciones de capitalización (`normalizeEmail()`).

---

#### Escenario de Seguridad 3 — Confidencialidad de datos en tránsito

**Táctica aplicada:** Mantener confidencialidad de datos (*Maintain Data Confidentiality*) + Cifrar datos (*Encrypt Data*) — Resistir ataques

| Campo | Descripción |
|---|---|
| **Fuente** | Atacante en red (man-in-the-middle, sniffing de tráfico en red pública) |
| **Estímulo** | Intento de interceptar tráfico HTTP/WebSocket entre clientes y servidores para capturar credenciales, tokens JWT o posiciones GPS de vehículos |
| **Entorno** | Red pública (internet); usuarios en dispositivos móviles y navegadores; sistema en producción |
| **Artefacto** | Canal de comunicación completo: frontend ↔ Azure Blob Storage (HTTPS nativo), cliente ↔ NestJS Gateway, cliente ↔ Realtime Service |
| **Respuesta** | Todo el tráfico viaja cifrado mediante TLS 1.2/1.3. El frontend se sirve por HTTPS directamente desde Azure Blob Storage Static Website (HTTPS nativo del endpoint `.z13.web.core.windows.net`). El backend expone únicamente HTTPS/WSS a través de Nginx como reverse proxy con certificado Let's Encrypt (renovación automática). Los JWT están firmados con HMAC-SHA256 usando `JWT_SECRET`; un atacante que intercepte un token no puede modificarlo sin invalidar la firma. Las credenciales nunca viajan en texto plano. |
| **Medida de respuesta** | 0 bytes de datos sensibles (credenciales, JWT, coordenadas GPS) transmitidos sin cifrado; protocolo mínimo TLS 1.2; certificado SSL activo con validez verificable; JWT con tiempo de expiración configurado (`exp` en payload). |

**Capas de cifrado implementadas:**

| Capa | Tecnología | Alcance |
|---|---|---|
| Frontend → Blob Storage | HTTPS nativo (Azure Blob Storage, TLS 1.2/1.3) | Angular PWA, assets estáticos |
| Cliente → Gateway | HTTPS + Bearer JWT | Endpoints REST (`/api/v1/*`) |
| Cliente → Realtime | WSS + JWT en handshake | Eventos Socket.io en tiempo real |
| JWT (access token) | HMAC-SHA256 (`jsonwebtoken`) | Payload `{ sub, email, role, vehicleId, exp }` |
| Contraseñas | bcrypt, salt rounds = 10 | Almacenamiento en PostgreSQL |
| Refresh tokens | SHA-256 (`node:crypto`) | Solo el hash se persiste en BD; token real viaja una sola vez |

**Refresh token rotation (trazabilidad + resistencia a robo de sesión):** El sistema implementa rotación de refresh tokens. Cada token se genera con `randomBytes(48)` y se almacena como hash SHA-256 en la tabla `RefreshToken`. Al usarse para renovar la sesión, el token se marca `consumedAt` (single-use) dentro de una transacción atómica y se emite uno nuevo. Un token ya consumido o expirado es rechazado con `401 Unauthorized`. Esto detecta y mitiga el reuso de tokens robados.

---

#### Resumen de tácticas de seguridad implementadas

| Categoría (Bass et al.) | Táctica | Componente |
|---|---|---|
| Resistir ataques | Autenticar actores | `auth.js` middleware Socket.io + `JwtStrategy` NestJS |
| Resistir ataques | Autorizar actores | `AuthGuard` Angular + `JwtAuthGuard` NestJS + whitelist Google OAuth |
| Resistir ataques | Cifrar datos | Nginx + Let's Encrypt, Azure Blob Storage HTTPS nativo, bcrypt passwords |
| Resistir ataques | Mantener confidencialidad | TLS 1.2/1.3 E2E, refresh tokens como hash SHA-256 |
| Detectar ataques | Verificar integridad del mensaje | Firma HMAC-SHA256 del JWT, `ignoreExpiration: false` |
| Recuperarse de ataques | Invalidar sesión comprometida | Refresh token single-use con `consumedAt`; logout forzado ante `connect_error` Unauthorized |
| Confidencialidad | Autenticación S-JWT | JWT en handshake WebSocket + Bearer HTTP, payload con `role` y `vehicleId` |

*Sección redactada con base en el código real de ambos repositorios: `services/realtime/src/middleware/auth.js`, `services/gateway/src/auth/auth.service.ts`, `services/gateway/src/auth/jwt.strategy.ts` (rama `develop`, repo `logiflow`) y `apps/web-admin/src/app/core/guards/auth.guard.ts` (rama `feat/deploy-front`, repo `logiflow-front`). Mayo de 2026.*

---

### 4.3. Mantenibilidad — Modularidad, Testeabilidad y Cobertura

#### Descripción general

La mantenibilidad de LogiFlow se aborda desde tres ángulos complementarios: **modularidad de la arquitectura** (separación de responsabilidades por módulo y servicio), **testeabilidad** (diseño que facilita pruebas unitarias sin dependencias externas) y **cobertura de código medible** (métrica objetiva del porcentaje de lógica cubierta por pruebas automatizadas).

---

#### Escenario de calidad — Mantenibilidad

**Táctica aplicada:** Aumentar cohesión (*Increase Cohesion*) + Reducir acoplamiento (*Reduce Coupling*) — Bass et al.

| Campo | Descripción |
|---|---|
| **Fuente** | Desarrollador del equipo Los Gavilanes del Código |
| **Estímulo** | Modificación de la lógica de autenticación, routing de sockets o lógica de negocio de vehículos |
| **Entorno** | Entorno de desarrollo local; pipeline de CI activo |
| **Artefacto** | Servicios `services/gateway` (NestJS) y `apps/web-admin` (Angular PWA) del monorepo frontend |
| **Respuesta** | El cambio puede realizarse en un módulo aislado sin afectar otros. Las pruebas unitarias detectan regresiones automáticamente. La cobertura supera el umbral del 80% en statements en ambos proyectos. |
| **Medida de respuesta** | Cobertura de statements ≥ 80% medida con Istanbul/Jest (backend) y Karma/Istanbul (frontend); tiempo de ejecución de suite de pruebas < 60 segundos; cero pruebas con dependencias de red real (todos los tests usan mocks). |

---

#### Modularidad de la arquitectura

LogiFlow divide la lógica en módulos con responsabilidad única en ambos repositorios:

**Backend — `services/gateway` (NestJS):**

| Módulo | Responsabilidad |
|---|---|
| `src/auth/` | Registro, login, Google OAuth, generación y rotación de JWT/refresh tokens |
| `src/vehicles/` | CRUD de vehículos, consulta de rutas activas, estado GPS |
| `src/stops/` | Gestión de paradas, cambio de estado (pending → active → completed) |
| `src/webhook/` | Recepción de eventos de tráfico de n8n, disparo de optimización |
| `src/grpc-client/` | Cliente gRPC que se comunica con el optimizer (VROOM) |
| `src/socket-client/` | Emisión de eventos WebSocket al Realtime Service |
| `src/common/` | Guards, middleware, interceptors y utilidades compartidas |

**Frontend — `apps/web-admin` (Angular PWA):**

| Módulo / Capa | Responsabilidad |
|---|---|
| `core/services/auth.service.ts` | Lectura y escritura del JWT en localStorage; decodificación de claims |
| `core/services/socket.service.ts` | Conexión con JWT, exposición de observables RxJS por evento Socket.io |
| `core/services/vehicle-api.service.ts` | Llamadas HTTP REST al Gateway con header Authorization |
| `core/guards/auth.guard.ts` | Protección de rutas por rol; redirección a `/login` |
| `map/map.component.ts` | Renderizado Google Maps; marcadores, polylines, rotación de íconos |
| `vehicle-list/vehicle-list.component.ts` | Estado reactivo de la flota; upsert por vehicleId; caché de placas |
| `event-log/event-log.component.ts` | Registro cronológico de eventos de socket; caché de placas |
| `login/login.page.ts` | Login por credenciales y Google OAuth; validación de rol post-login |

Esta separación permite que un cambio en `auth.service.ts` no afecte `socket.service.ts` ni `vehicle-list.component.ts`, y que cada unidad pueda probarse con mocks independientes.

---

#### Testeabilidad — diseño orientado a pruebas

Cada componente y servicio fue diseñado para ser inyectable y reemplazable por mocks:

- **`AuthService`**: no depende de ningún módulo Angular externo; usa `localStorage` directamente como `TokenStorage` inyectado a través de `AuthTokenService`. En tests se usa `localStorage` real del browser de prueba (ChromeHeadless) con `beforeEach(() => localStorage.clear())`.
- **`SocketService`**: expone todos los eventos como `Observable` (Subjects internos). Los tests emiten directamente sobre los Subjects privados con `(service as any).position$.next(...)`, sin necesitar una conexión WebSocket real.
- **`AuthGuard`**: recibe `AuthService` y `Router` por inyección de dependencias; los tests los reemplazan por `jasmine.createSpyObj` sin Angular Router real.
- **`EventLogComponent`** y **`VehicleListComponent`**: reciben `SocketService` y `VehicleApiService` por DI; los tests usan `Subject` de RxJS para simular eventos de socket en tiempo real.
- **`LoginPage`**: usa `HttpClient` para las llamadas REST; los tests usan `HttpClientTestingModule` con `HttpTestingController` para interceptar y simular respuestas HTTP sin red.

---

#### Cobertura de código medida

##### Frontend — `apps/web-admin` (Karma + Istanbul, 16 de mayo de 2026)

| Métrica | Resultado | Meta | Estado |
|---|---|---|---|
| Statements | **80.49%** (260 / 323) | ≥ 80% | ✅ |
| Branches | **75.71%** (53 / 70) | — | — |
| Functions | **64.39%** (85 / 132) | — | — |
| Lines | **84.32%** (242 / 287) | — | — |

**Suite de pruebas: 109 tests, 0 fallos, 0 tests pendientes.**

Archivos con cobertura completa o superior al 90%:

| Archivo | Cobertura aproximada |
|---|---|
| `core/services/auth.service.ts` | ~95% — 18 tests cubren setToken, getToken, getRole, getUserId, getEmail, getName, isAuthenticated, logout, expiración |
| `core/guards/auth.guard.ts` | ~100% — 9 tests cubren usuario no autenticado, rol correcto, rol incorrecto, sin rol requerido |
| `event-log/event-log.component.ts` | ~90% — 15 tests cubren todos los tipos de evento, caché de placas, fallback a vehicleId, cap de 100 entradas |
| `core/services/vehicle-api.service.ts` | ~100% — 9 tests cubren getAll, getOne, getRoute y header Authorization |

##### Backend — `services/gateway` (Jest + Istanbul, 16 de mayo de 2026)

| Métrica | Resultado | Meta | Estado |
|---|---|---|---|
| Statements | **83.36%** (867 / 1049) | ≥ 80% | ✅ |
| Branches | **70.45%** (484 / 687) | — | — |
| Functions | **78.57%** (154 / 196) | — | — |
| Lines | **83.14%** (799 / 961) | — | — |

Módulos con cobertura destacada en el backend:

| Módulo | Statements |
|---|---|
| `src/auth/dto/` | 100% |
| `src/common/constants/` | 100% |
| `src/common/middleware/` | 100% |
| `src/stops/` | 100% |
| `src/vehicles/` | 91.92% |
| `src/socket-client/` | 95.83% |
| `src/webhook/` | 91.65% |

El módulo `src/grpc-client/` (47.82%) tiene cobertura más baja dado que su lógica depende de una conexión gRPC activa; los tests mockeados no pueden ejercer todos los caminos de error de la red. El módulo `src/notifications/` (12.28%) está en etapa de prototipo y no tiene especificaciones completas aún.

---

#### Resumen de tácticas de mantenibilidad implementadas

| Táctica (Bass et al.) | Implementación |
|---|---|
| Aumentar cohesión | Cada módulo tiene una responsabilidad única; sin lógica de negocio en componentes de UI |
| Reducir acoplamiento | Inyección de dependencias en Angular y NestJS; interfaces de `TokenStorage` abstraen el almacenamiento |
| Encapsular | `AuthTokenService` en `@logiflow/shared-auth` abstrae localStorage/Capacitor Preferences |
| Usar intermediarios | `SocketService` envuelve `LogiFlowSocketService` y expone Observables; los componentes nunca usan Socket.io directamente |
| Defer binding | `environment.ts` / `environment.prod.ts` permiten cambiar URLs sin recompilar lógica |
| Parametrizar | URLs del backend, Socket.io y Google Maps leídas de variables de entorno en build time |

*Sección redactada con métricas reales obtenidas el 16 de mayo de 2026: frontend ejecutando `npx ng test --code-coverage --watch=false --browsers=ChromeHeadless` en `apps/web-admin` (rama `feat/deploy-front`, repo `logiflow-front`); backend ejecutando `npm run test:cov` en `services/gateway` (rama `develop`, repo `logiflow`).*

---

### 4.4. Portabilidad — Migración Cloud → On-Premise

#### Descripción general

LogiFlow fue diseñado desde el inicio para ser **independiente del proveedor cloud**. Todos los servicios del backend corren en contenedores Docker orquestados con Docker Compose, y toda la infraestructura está definida como código (IaC) con Terraform. Esta arquitectura permite que el sistema pueda migrar de Azure a un entorno On-Premise (servidores propios, datacenter universitario o cualquier proveedor de nube alternativo) sin cambios en el código de la aplicación — únicamente modificando variables de entorno y el módulo de Terraform.

---

#### Escenario de calidad — Portabilidad

**Táctica aplicada:** Usar estándares (*Use Standards*) + Abstraer plataforma (*Abstract Platform*) — Bass et al.

| Campo | Descripción |
|---|---|
| **Fuente** | Equipo de operaciones / nuevo integrante del equipo |
| **Estímulo** | Decisión de migrar LogiFlow de Azure (VM + Blob Storage) a un servidor On-Premise (Ubuntu 22.04, datacenter propio) por razones de costo, regulación de datos o disponibilidad de infraestructura institucional |
| **Entorno** | Sistema en producción corriendo en Azure East US 2; todos los servicios activos; datos reales en PostgreSQL y Redis |
| **Artefacto** | Toda la plataforma LogiFlow: 8 servicios backend (Docker Compose) + 2 apps frontend (Angular PWA + Ionic) |
| **Respuesta** | El equipo clona el repositorio en el servidor On-Premise, crea un archivo `.env` con las variables del nuevo entorno, ejecuta `docker compose -f docker-compose.prod.yml up -d` y sirve el frontend como contenedor Nginx. El sistema queda operativo sin modificar ninguna línea de código de los servicios. |
| **Medida de respuesta** | Tiempo estimado de migración < 4 horas para un operador con acceso SSH y Docker instalado; 0 cambios de código requeridos; 100% de los servicios portables mediante Docker; única dependencia externa no dockerizada es la API Key de Google Maps (configurada como variable de entorno). |

---

#### Estrategia de portabilidad: Docker para todos los componentes

##### Backend — 8 servicios, todos dockerizados

El archivo `docker-compose.prod.yml` orquesta la totalidad del backend sin dependencias de Azure:

| Servicio | Imagen / Build | Puerto interno | Notas de portabilidad |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` (imagen oficial) | 5432 | Datos persistidos en volume Docker; migrable con `pg_dump` / `pg_restore` |
| `redis` | `redis:7-alpine` (imagen oficial) | 6379 | Datos persistidos en volume Docker; configurable con `requirepass` vía env var |
| `gateway` | `node:22-alpine` (imagen oficial) | 3002 | Toda la configuración por variables de entorno; sin código Azure-específico |
| `realtime` | `node:22-alpine` (imagen oficial) | 3001 | JWT_SECRET y REDIS_URL configurables por env var |
| `optimizer` | Build desde `services/optimizer/Dockerfile` | 50051 (gRPC) | Imagen propia; `--platform linux/amd64` garantiza compatibilidad con x86 On-Premise |
| `vroom` | Build desde `services/optimizer/Dockerfile.vroom` | 3000 (interno) | Imagen propia compilada desde fuentes; no depende de servicios cloud |
| `ai-predictor` | `python:3.12-alpine` + requirements en runtime | 5001 | Código montado como volumen; sin dependencias de infraestructura |
| `n8n` | `n8nio/n8n:1.66.0` (imagen oficial) | 5678 | Workflows portados como archivos JSON en `services/automation/n8n/workflows/` |

**Red interna:** Todos los servicios pertenecen a la red Docker `logiflow-prod` (bridge). La comunicación inter-servicio usa nombres de contenedor como hostname (`gateway → optimizer:50051`, `realtime → redis:6379`). No hay dependencias de DNS de Azure ni de VNet.

**Volúmenes de datos:**

| Volume | Contenido | Estrategia de migración |
|---|---|---|
| `postgres_data` | Tablas de usuarios, vehículos, paradas, refresh tokens | `pg_dump logiflow_gateway > backup.sql` → restaurar en servidor destino |
| `redis_data` | Caché de posiciones vehiculares (TTL corto) | Prescindible en migración; se reconstruye en minutos tras reinicio |
| `n8n_data` | Credenciales y estado de workflows de n8n | Exportar workflows como JSON (ya versionados en el repositorio) |

---

##### Frontend — portabilidad mediante Nginx

El frontend (Angular PWA) actualmente se despliega en **Azure Blob Storage Static Website** (sin CDN — restricciones de suscripción de estudiantes). Para un entorno On-Premise, el build estático (`www/`) puede servirse con un contenedor Nginx estándar, sin ningún servicio de Azure:

**Dockerfile Nginx para frontend On-Premise:**
```dockerfile
FROM nginx:alpine
COPY www/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Configuración Nginx mínima (`nginx.conf`) para Angular SPA:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Con esta configuración, el frontend queda servido por un contenedor Docker y puede agregarse al `docker-compose.prod.yml` como un servicio más, eliminando la dependencia de Azure Blob Storage:

```yaml
  web-admin:
    build:
      context: ./logiflow-front/apps/web-admin
      dockerfile: Dockerfile.nginx
    container_name: logiflow-web-admin
    ports:
      - "80:80"
    restart: unless-stopped
    networks: [logiflow-prod]
```

El build de producción Angular (`ng build --configuration production`) es **idéntico** para Azure o On-Premise — solo cambian las URLs en `environment.prod.ts`, que se configuran vía variables de entorno en build time (`REALTIME_URL`, `API_URL`).

---

#### Variables de entorno como mecanismo de portabilidad

Ningún valor de infraestructura está hardcodeado en el código. La totalidad de la configuración dependiente del entorno se concentra en el archivo `.env` del servidor:

| Variable | Actual (Azure) | On-Premise |
|---|---|---|
| `DATABASE_URL` | `postgresql://...@postgres:5432/...` | Igual — misma red Docker |
| `REDIS_URL` | `redis://:pass@redis:6379` | Igual — misma red Docker |
| `JWT_SECRET` | Valor secreto en `.env` de la VM | Mismo valor en servidor On-Premise |
| `CORS_ORIGINS` | `https://logiflowapp.z13.web.core.windows.net,...` | `https://mi-servidor.local,...` |
| `GOOGLE_CALLBACK_URL` | `https://logiflow-api.eastus2.cloudapp.azure.com/...` | `https://mi-servidor.local/...` |
| `REALTIME_URL` (frontend) | `https://logiflow-api.eastus2.cloudapp.azure.com` | `https://mi-servidor.local` |
| `API_URL` (frontend) | `https://logiflow-api.eastus2.cloudapp.azure.com/api/v1` | `https://mi-servidor.local/api/v1` |

---

#### Infraestructura como Código — Terraform

La infraestructura de Azure está definida en `infra/terraform/azure/` con dos módulos:
- `modules/network`: VNet, Subnet, Public IP, NSG
- `modules/vm`: Azure VM, OS Disk, boot diagnostics

Para migrar a otro proveedor cloud (AWS, GCP) o a On-Premise con libvirt/Proxmox, basta con reemplazar los módulos de Terraform por los equivalentes del proveedor destino, manteniendo las mismas variables de entrada (`vm_size`, `admin_username`, `ssh_public_key`, etc.). Los módulos de aplicación (`docker-compose.prod.yml`) no requieren cambios.

---

#### Resumen de tácticas de portabilidad implementadas

| Táctica (Bass et al.) | Implementación |
|---|---|
| Usar estándares | Docker (OCI), Docker Compose, Nginx, PostgreSQL, Redis — todos estándar de industria sin lock-in de proveedor |
| Abstraer la plataforma | Variables de entorno separan configuración de código; `docker-compose.prod.yml` funciona en cualquier host con Docker |
| Separar la interfaz de usuario de la lógica | Frontend servible como Nginx estático independiente de Azure Blob Storage |
| Parametrizar | `environment.prod.ts` generado en build time desde `REALTIME_URL` y `API_URL` |
| Usar intermediarios | Nginx como reverse proxy unifica el punto de entrada HTTP/WebSocket, independientemente de si está en Azure VM u On-Premise |

*Sección redactada con base en `docker-compose.prod.yml` (rama `develop`, repo `logiflow`) y la arquitectura de despliegue actual en Azure East US 2. Mayo de 2026.*

---

### 4.5. Rendimiento

#### Herramienta y metodología

Las pruebas de carga y estrés fueron ejecutadas con **Apache JMeter 5.6.3** desde una máquina cliente externa al backend. El backend se encontraba desplegado en producción en Azure East US 2 (`https://logiflow-api.eastus2.cloudapp.azure.com`).

**Flujo probado:** El flujo objetivo cubre el camino crítico completo del sistema:

```
POST /api/v1/auth/login  (Once Only Controller — 1 vez por usuario virtual)
  └── extrae accessToken JWT
        └── POST /api/v1/webhook  (ejecución repetida durante 300 s)
              └── NestJS Gateway → gRPC → VROOM Optimizer → Redis → Socket.io Realtime
```

**Configuración general:**

| Parámetro | Valor |
|---|---|
| Duración por escenario | 300 segundos (5 minutos) |
| Escenarios evaluados | 10, 25, 50 y 100 usuarios virtuales concurrentes |
| Endpoint crítico | `POST /api/v1/webhook` |
| Criterio objetivo | Error ≤ 1% y P95 < 4,000 ms |

---

#### Escenario de calidad — Rendimiento

**Táctica aplicada:** Gestionar tasa de llegada (*Manage Sampling Rate*) + Mantener múltiples copias de los datos (*Maintain Multiple Copies of Data*) — Bass et al.

| Campo | Descripción |
|---|---|
| **Fuente** | Múltiples despachadores y conductores conectados simultáneamente |
| **Estímulo** | Pico de usuarios concurrentes ejecutando optimizaciones de ruta vía `POST /api/v1/webhook` durante 5 minutos sostenidos |
| **Entorno** | Sistema en producción Azure East US 2; backend en VM única (`Standard_D2s_v3`) con Docker Compose |
| **Artefacto** | `POST /api/v1/webhook` — flujo completo: Gateway → gRPC → VROOM → Redis → Realtime Socket.io |
| **Respuesta** | El sistema procesa las solicitudes dentro del umbral de latencia objetivo con tasa de error ≤ 1% hasta 50 usuarios concurrentes |
| **Medida de respuesta** | TPS máximo estable: **20.98 TPS** a 50 usuarios; P95 < 4,000 ms; error < 0.1% en escenarios de hasta 50 usuarios concurrentes |

---

#### Resultados de las pruebas de carga

##### Latencia y tasa de error por escenario

| Escenario | Transacciones webhook | Exitosas | Fallidas | Promedio | P95 | Máximo | Error |
|---|---|---|---|---|---|---|---|
| 10 usuarios | 5,974 | 5,974 | 0 | 455.68 ms | 674 ms | 1,499 ms | **0.00%** ✅ |
| 25 usuarios | 6,329 | 6,329 | 0 | 1,015.40 ms | 1,546 ms | 2,124 ms | **0.00%** ✅ |
| 50 usuarios | 6,295 | 6,294 | 1 | 1,923.28 ms | 2,812.60 ms | 4,135 ms | **0.02%** ✅ |
| 100 usuarios | 6,032 | ≈ 2,907 | ≈ 3,125 | 3,516.33 ms | 5,245 ms | 7,933 ms | **51.82%** ❌ |

> **Nota 100 usuarios:** JMeter reportó 3,189 errores totales (51.17% de todas las muestras). Los errores se concentraron en el webhook, no en el login. Este escenario marca el **punto de ruptura** del sistema.

##### Throughput (TPS / TPM)

| Escenario | Transacciones | TPS | TPM |
|---|---|---|---|
| 10 usuarios | 5,974 | 19.91 TPS | 1,194.80 TPM |
| 25 usuarios | 6,329 | 21.10 TPS | 1,265.80 TPM |
| 50 usuarios | 6,295 | **20.98 TPS** | **1,259.00 TPM** |
| 100 usuarios (bruto) | 6,032 | 20.11 TPS bruto | 1,206.40 TPM bruto |
| 100 usuarios (exitoso) | ≈ 2,907 | 9.69 TPS exitoso | 581.40 TPM exitoso |

> El TPS de 100 usuarios (bruto) no representa capacidad útil porque más del 51% de las transacciones fallaron. El TPS efectivo cae a **9.69 TPS** — menos de la mitad del escenario estable.

---

#### TPS máximo soportado estable

| Métrica | Valor |
|---|---|
| **Usuarios concurrentes máximos estables** | **50 usuarios** |
| **TPS máximo estable** | **20.98 TPS** |
| **TPM máximo estable** | **1,259.00 TPM** |
| **P95 en punto óptimo** | **2,812.60 ms** (< umbral de 4,000 ms ✅) |
| **Tasa de error en punto óptimo** | **0.02%** (< umbral de 1% ✅) |
| **Punto de ruptura observado** | 100 usuarios (51.82% errores, P95 5,245 ms) |

---

#### Tácticas de rendimiento implementadas

| Táctica (Bass et al.) | Implementación |
|---|---|
| Mantener múltiples copias de datos | Redis almacena el último snapshot de posición GPS; al unirse a `fleet`, el Gateway emite posiciones cacheadas sin consultar PostgreSQL |
| Reducir overhead de comunicación | Comunicación inter-servicio por red Docker interna (sin latencia de red pública) |
| Gestionar tasa de eventos | Posición GPS emitida cada ~5 s; heartbeat checker en `src/heartbeat.js` marca offline tras 15 s — evita procesamiento de eventos fantasma |
| Procesamiento diferido (asíncrono) | El Gateway responde al webhook con `202 Accepted` antes de que termine la optimización gRPC + Socket.io |

#### Limitaciones identificadas y mejoras propuestas

El cuello de botella a 100 usuarios es la **VM única** con todos los servicios compartiendo recursos (CPU/RAM). Para aumentar la capacidad estable a > 50 usuarios concurrentes se recomienda:

1. Escalar verticalmente a `Standard_D4s_v3` (4 vCPU, 16 GB RAM) para la VM actual.
2. Separar VROOM Optimizer en una VM dedicada para aislar la carga computacional del VRP del Gateway HTTP.
3. Implementar un pool de conexiones gRPC al Optimizer (múltiples instancias VROOM en paralelo).
4. Migrar PostgreSQL a **Azure Database for PostgreSQL Flexible Server** para reducir contención de I/O en la VM.

*Pruebas ejecutadas por Juan Sebastián Ortega Muñoz con Apache JMeter 5.6.3. Backend en producción: `https://logiflow-api.eastus2.cloudapp.azure.com`. Fecha: mayo de 2026.*

---

## 5. Vista de Arquitectura

### 5.1 Estilo arquitectónico

LogiFlow implementa una arquitectura de **microservicios asíncronos con comunicación por eventos** en el backend, combinada con una arquitectura de **componentes reactivos** en el frontend. Los estilos arquitectónicos identificados son:

| Estilo | Dónde se aplica | Motivación |
|---|---|---|
| **Microservicios** | Backend: Gateway, Realtime, Optimizer, AI Predictor, n8n | Despliegue independiente, equipos separados por servicio, escalado individual |
| **Event-Driven (Pub/Sub)** | Redis Pub/Sub entre Gateway → Realtime → Clientes | Desacoplamiento temporal: el Gateway no necesita conocer cuántos clientes están conectados |
| **Pipes and Filters** | n8n workflow: evento tráfico → enriquecimiento → POST Gateway → gRPC → emit socket | Cada etapa del pipeline transforma los datos sin acoplamiento a la siguiente |
| **Cliente-Servidor** | Frontend (Angular/Ionic) ↔ NestJS Gateway vía REST | Separación clara de responsabilidades UI vs lógica de negocio |
| **Capas (Layered)** | Angular web-admin: Routing → Guards → Components → Services → HTTP | Cada capa depende solo de la capa inferior |
| **Repositorio** | PostgreSQL + Prisma como fuente de verdad; Redis como caché de lectura | Dato canónico en PostgreSQL; Redis para acceso de baja latencia |

### 5.2 Modelo cloud — Arquitectura de despliegue

```
Internet
    │
    ├── HTTPS (Azure Blob Storage Static Website — sin CDN)
    │     └── Angular PWA (web-admin) — despachadores
    │
    └── HTTPS / WSS (Nginx reverse proxy)
          └── Azure VM Standard_D2s_v3 (East US 2, Ubuntu 24.04)
                │
                │  Red Docker: logiflow-prod (bridge)
                ├── NestJS Gateway           :3002  (REST + gRPC client + socket-client)
                ├── Socket.io Realtime       :3001  (WebSocket + Redis sub)
                ├── Redis 7-alpine           :6379  (Pub/Sub + caché posiciones)
                ├── PostgreSQL 16-alpine     :5432  (datos persistentes)
                ├── VROOM Optimizer          :50051 (gRPC — ruteo VRP)
                ├── AI Predictor             :5001  (predicción tráfico — Python)
                └── n8n Automation           :5678  (workflows + Telegram)

Ionic Angular app (conductores) → HTTPS → mismo NestJS Gateway
APK Android → Google Play / distribución directa
```

**Flujo de datos E2E completo:**

```
1. n8n detecta evento de tráfico (Google Maps Traffic API / Telegram bot)
   └── POST /api/v1/webhook → NestJS Gateway
         └── gRPC OptimizeRoutes → VROOM Optimizer (< 4 s)
               └── VehicleRoute[] → socket-client.emitRouteUpdate()
                     └── Redis PUBLISH → Realtime Service
                           └── io.to('fleet').emit('route:update', payload)
                                 ├── Angular web-admin: mapa actualiza polyline + lista de vehículos
                                 └── Ionic app: conductor recibe nueva ruta

2. Driver móvil (cada ~5 s):
   socket.emit('vehicle:position', { vehicleId, lat, lng, speed })
   └── Realtime Service: Redis SET + Redis PUBLISH
         └── io.to('fleet').emit('vehicle:position', payload)
               └── Angular web-admin: marcador en mapa se mueve

3. Heartbeat checker (cada 15 s sin posición):
   └── io.to('fleet').emit('vehicle:offline', { vehicleId })
         └── Angular web-admin: vehículo marcado offline en lista
```

### 5.3 Decisiones arquitectónicas clave

| # | Decisión | Alternativa descartada | Razón de la decisión |
|---|---|---|---|
| DA-01 | Redis Pub/Sub como broker entre Gateway y Realtime | Cola de mensajes dedicada (RabbitMQ, Kafka) | Latencia ultrabaja, sin overhead de serialización adicional; cumple con < 100 ms de propagación |
| DA-02 | gRPC para comunicación Gateway → Optimizer | REST HTTP entre servicios | Tipado fuerte con protobuf, menor overhead de parsing, streaming bidireccional disponible para optimizaciones futuras |
| DA-03 | JWT en handshake WebSocket (no en cada mensaje) | Token en cada frame de socket | Una sola verificación al conectar; menor CPU por evento; compatible con `io.use()` middleware de Socket.io |
| DA-04 | Angular + Ionic en monorepo (`logiflow-front`) | Dos repositorios separados | Interfaces TypeScript compartidas (`shared/models`), un solo CI, cambios en contratos Socket.io propagados automáticamente |
| DA-05 | Docker Compose en VM única vs Kubernetes | AKS (Azure Kubernetes Service) | Costo de sprint universitario; Docker Compose es suficiente para la carga actual; migración a K8s no requiere cambio de código |
| DA-06 | Terraform IaC para provisionar Azure | Azure Portal manual | Reproducibilidad del entorno; infraestructura como código en repositorio; un `terraform apply` recrea todo |
| DA-07 | VROOM para VRP (open source) | Google OR-Tools, solvers comerciales | Sin costo de licencia; API REST + gRPC adaptable; probado en producción logística real |
| DA-08 | n8n para automatización de eventos | Código custom Node.js | No-code para flujos simples; extensible vía código custom en nodos n8n; workflows versionados como JSON |

---

## 6. Diagramas UML

> Los diagramas a continuación se describen en notación textual. Los archivos fuente en formato PlantUML están disponibles en `docs/diagrams/` del repositorio `logiflow`.

### 6.1 Diagrama de contexto del sistema (C4 — Nivel 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        LogiFlow                                 │
│                                                                 │
│   ┌──────────────┐    WebSocket/REST    ┌───────────────────┐  │
│   │  Web Admin   │◄────────────────────►│  NestJS Gateway   │  │
│   │  (Angular)   │                      │  + Realtime Svc   │  │
│   └──────────────┘                      └───────────────────┘  │
│          ▲                                        ▲             │
│          │ HTTPS                                  │ gRPC        │
│   ┌──────┴───────┐                      ┌────────┴──────────┐  │
│   │  Dispatcher  │                      │  VROOM Optimizer  │  │
│   │  (usuario)   │                      │  + AI Predictor   │  │
│   └──────────────┘                      └───────────────────┘  │
│                                                   ▲             │
│   ┌──────────────┐    WebSocket         ┌────────┴──────────┐  │
│   │  Ionic App   │◄────────────────────►│  n8n Automation   │  │
│   │  (conductor) │                      │  (traffic events) │  │
│   └──────────────┘                      └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Sistemas externos:
  - Google Maps API (geocodificación, mapas en frontend)
  - Google OAuth 2.0 (autenticación social)
  - Firebase Cloud Messaging (notificaciones push)
  - Telegram Bot API (alertas de tráfico)
```

### 6.2 Diagrama de componentes (C4 — Nivel 2)

**Backend `logiflow`:**

```
┌────────────────────── NestJS Gateway (:3002) ──────────────────────┐
│  AuthModule      VehiclesModule    StopsModule    WebhookModule     │
│  ├─ AuthService  ├─ VehiclesSvc    ├─ StopsSvc    ├─ WebhookSvc    │
│  ├─ JwtStrategy  ├─ VehiclesCtrl   ├─ StopsCtrl   └─ GrpcClientSvc │
│  └─ AuthGuard    └─ PrismaService                                   │
│                         │                               │           │
│                    PostgreSQL :5432              VROOM :50051 (gRPC) │
│                                                                      │
│  SocketClientModule                                                  │
│  └─ SocketClientService ──────────────────────► Redis :6379 (PUB)   │
└──────────────────────────────────────────────────────────────────────┘

┌────────────── Socket.io Realtime (:3001) ─────────────────────────┐
│  io.use(authMiddleware)     ← valida JWT en handshake             │
│  join:fleet handler         ← emite snapshot de posiciones Redis  │
│  vehicle:position handler   ← persiste en Redis, publica          │
│  redis.subscribe('fleet')   ← reenvía a io.to('fleet')            │
│  heartbeat.js               ← marca offline tras 15s sin posición │
└───────────────────────────────────────────────────────────────────┘
              ▲
         Redis :6379 (SUB)
```

**Frontend `logiflow-front` — web-admin:**

```
┌──────────────────── Angular web-admin ────────────────────────────┐
│  AppRoutingModule                                                  │
│  ├─ /login        → LoginPage (sin guard)                         │
│  └─ /home         → HomePage (AuthGuard: role=admin)              │
│                                                                    │
│  HomePageComponent                                                 │
│  ├─ MapComponent          (Google Maps, marcadores, polylines)     │
│  ├─ VehicleListComponent  (lista filtrable, estado online/offline) │
│  └─ EventLogComponent     (log cronológico de eventos socket)      │
│                                                                    │
│  Core Services                                                     │
│  ├─ AuthService           (JWT en localStorage, decodificación)   │
│  ├─ SocketService         (wraps LogiFlowSocketService + JWT auth) │
│  └─ VehicleApiService     (REST GET /vehicles con Bearer token)    │
│                                                                    │
│  Core Guards                                                       │
│  └─ AuthGuard             (canActivate: isAuthenticated + role)   │
└────────────────────────────────────────────────────────────────────┘
```

### 6.3 Diagrama de clases — Modelos de dominio

```
Vehicle
  + vehicleId: string         // "v-001"
  + lat: number
  + lng: number
  + speed: number
  + timestamp: string
  + status: 'online' | 'offline'
  + plate?: string            // cargado via VehicleApiService.getOne()
  + isOffline: boolean        // tras 15 s sin posición

RouteUpdate
  + vehicleId: string
  + stops: RouteStep[]
  + polyline: { lat, lng }[]  // ordenado por RouteStep.arrival asc
  + estimatedTime: number
  + totalDistance: number
  + totalCost: number
  + eventType: string
  + solvedAt: string
  + timestamp: string

RouteStep
  + id: string
  + type: string
  + lat: number
  + lng: number
  + arrival: number           // arrival_order — ordena polyline
  + service: number

EventLogEntry
  + id: string
  + timestamp: Date
  + type: 'system' | 'position' | 'route' | 'offline' | 'status'
  + message: string
  + vehicleId?: string
```

### 6.4 Diagrama Entidad-Relación (base de datos)

```
User ──────────────────── RefreshToken
  id (UUID)                  id (UUID)
  email (unique)             token (hash SHA-256, unique)
  password (bcrypt)          userId (FK → User.id)
  role (admin|conductor)     createdAt
  vehicleId? (FK → Vehicle)  expiresAt
  createdAt                  consumedAt?

Vehicle ────────────────── Stop
  id (UUID)                  id (UUID)
  plate (unique)             vehicleId? (FK → Vehicle.id)
  capacity                   lat
  createdAt                  lng
  updatedAt                  address
                             demand
                             priority
                             status (pending|active|completed)
                             createdAt
                             updatedAt
```

### 6.5 Diagrama de secuencia — Flujo de login y acceso al dashboard

```
Browser          LoginPage        AuthService       Gateway API       Router
   │                │                 │                  │               │
   │ click Login    │                 │                  │               │
   ├───────────────►│                 │                  │               │
   │                │ POST /auth/login│                  │               │
   │                ├─────────────────┼─────────────────►│               │
   │                │                 │  { accessToken,  │               │
   │                │◄────────────────┼──────────────────┤               │
   │                │                 │     role }       │               │
   │                │ setToken(token) │                  │               │
   │                ├────────────────►│                  │               │
   │                │                 │ localStorage.set │               │
   │                │ getRole()       │                  │               │
   │                ├────────────────►│                  │               │
   │                │◄── 'admin' ─────┤                  │               │
   │                │ navigate('/home')                  │               │
   │                ├──────────────────────────────────────────────────►│
   │                │                 │                  │  AuthGuard    │
   │                │                 │                  │  canActivate  │
   │                │                 │◄─── getToken() ──┼───────────────┤
   │                │                 ├── JWT válido ────┼──────────────►│
   │                │                 │                  │  allow /home  │
   │◄───────────────────────────────────────────────────────────────────┤
   │  dashboard loaded               │                  │               │
```

### 6.6 Diagrama de secuencia — Optimización de ruta en tiempo real

```
n8n          Gateway          gRPC Client      VROOM        Redis       Realtime       Cliente
  │              │                 │              │            │             │              │
  │ POST /webhook│                 │              │            │             │              │
  ├─────────────►│                 │              │            │             │              │
  │ 202 Accepted │                 │              │            │             │              │
  │◄─────────────┤ OptimizeRoutes  │              │            │             │              │
  │              ├────────────────►│              │            │             │              │
  │              │                 │ SolveRoute() │            │             │              │
  │              │                 ├─────────────►│            │             │              │
  │              │                 │◄── routes[] ─┤            │             │              │
  │              │                 │              │            │             │              │
  │              │ emitRouteUpdate()              │            │             │              │
  │              ├────────────────────────────────┼───────────►│             │              │
  │              │                 │              │   PUBLISH  │ SUBSCRIBE   │              │
  │              │                 │              │            ├────────────►│              │
  │              │                 │              │            │  route:update              │
  │              │                 │              │            │             ├─────────────►│
  │              │                 │              │            │             │ mapa + lista │
```

### 6.7 Diagrama de despliegue

```
┌─────────────────── Azure East US 2 ───────────────────────────────────┐
│                                                                        │
│  ┌── Azure Blob Storage Static Website ───────────────────────────┐   │
│  │  www/ (Angular PWA build) — HTTPS nativo                        │   │
│  │  logiflowapp.z13.web.core.windows.net (sin CDN)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌── Azure VM Standard_D2s_v3 (Ubuntu 24.04) ────────────────────┐   │
│  │  Terraform: infra/terraform/azure/modules/vm                    │   │
│  │  ┌── Nginx (reverse proxy) ──────────────────────────────────┐ │   │
│  │  │  / → gateway:3002    /socket.io → realtime:3001           │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌── Docker network: logiflow-prod ──────────────────────────┐ │   │
│  │  │  gateway:3002   realtime:3001   redis:6379   postgres:5432 │ │   │
│  │  │  optimizer:50051  ai-predictor:5001   n8n:5678   vroom:3000│ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  NSG: puertos 22, 80, 443, 3001, 3002 abiertos al exterior            │
│  Terraform: infra/terraform/azure/modules/network                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Detalles Tecnológicos

### 7.1 Lenguajes y frameworks

| Capa | Tecnología | Versión | Uso |
|---|---|---|---|
| Backend Gateway | NestJS | 11.x | Framework REST API + DI + módulos |
| Backend ORM | Prisma | 7.x | Acceso a PostgreSQL con migraciones |
| Backend Auth | passport + passport-jwt | — | JWT strategy, Google OAuth |
| Backend WebSocket | Socket.io | 4.x | Realtime Service, rooms, middleware |
| Backend gRPC | @grpc/grpc-js + @grpc/proto-loader | — | Comunicación con VROOM Optimizer |
| Backend Notificaciones | firebase-admin | — | FCM push notifications |
| Optimizer | VROOM + Python wrapper | — | Resolución VRP; expuesto vía gRPC |
| AI Predictor | Python 3.12 | — | Predicción de tráfico (ML) |
| Automatización | n8n | 1.66.0 | Workflows no-code + Telegram bot |
| Frontend web | Angular | 19.x | PWA para despachadores |
| Frontend móvil | Ionic Angular + Capacitor | — | App Android para conductores |
| Frontend mapas | Google Maps JS API + @types/google.maps | — | Mapa interactivo, marcadores, polylines |
| Tests frontend | Karma + Jasmine + Istanbul | — | Cobertura ≥ 80% en web-admin |
| Tests backend | Jest + Istanbul | — | Cobertura ≥ 80% en gateway |
| Lenguaje principal | TypeScript 5.x | — | Tipado estático en frontend y backend |

### 7.2 Infraestructura

| Componente | Tecnología | Proveedor |
|---|---|---|
| VM backend | Standard_D2s_v3 (2 vCPU, 8 GB RAM) | Azure East US 2 |
| OS | Ubuntu 24.04 LTS | Azure Marketplace |
| Orquestación | Docker Compose (`docker-compose.prod.yml`) | Propio |
| IaC | Terraform (módulos `network` + `vm`) | Propio + Azure Provider |
| Frontend hosting | Azure Blob Storage Static Website | Azure |
| CDN | No configurado (restricciones suscripción estudiantes Azure) | — |
| Base de datos | PostgreSQL 16-alpine (contenedor Docker) | Docker Hub |
| Caché / broker | Redis 7-alpine (contenedor Docker) | Docker Hub |
| Reverse proxy | Nginx (en VM, configuración manual) | Ubuntu apt |
| SSL/TLS | Let's Encrypt (Certbot, renovación automática) | Let's Encrypt |
| DNS | Azure Public IP Standard (zona-redundante) | Azure |

### 7.3 DevOps / CI-CD

El pipeline de CI/CD está gestionado por **Cristian Santiago Pedraza Rodríguez** mediante GitHub Actions sobre los repositorios `logiflow` y `logiflow-front`.

| Etapa | Herramienta | Descripción |
|---|---|---|
| Control de versiones | Git + GitHub | Branching strategy: `main`, `develop`, `feat/<nombre>/<tarea>` |
| CI — Tests frontend | GitHub Actions + Karma/ChromeHeadless | Ejecuta suite de 109 tests en cada PR a `develop` |
| CI — Tests backend | GitHub Actions + Jest | Ejecuta suite con cobertura ≥ 80% en cada PR a `develop` |
| CI — Build producción | GitHub Actions + `ng build --configuration production` | Verifica que el bundle se genere sin errores |
| CD — Backend | GitHub Actions → SSH → `docker compose pull && docker compose up -d` | Deploy automático a Azure VM tras merge a `main` |
| CD — Frontend | GitHub Actions → `az storage blob upload-batch` | Sube `www/` al Blob Storage tras merge a `main` |
| Gestión de proyectos | Azure DevOps Boards | Backlog, tablero Kanban, burndown chart |
| Revisión de código | GitHub Pull Requests | Aprobación de par requerida antes de merge a `develop` |

---

## 8. Seguridad del Sistema

> Los escenarios de seguridad detallados con las tácticas de Bass et al. se encuentran en **§4.2**. Esta sección complementa con el modelo de amenazas y las buenas prácticas de implementación.

### 8.1 Modelo de amenazas (STRIDE simplificado)

| Amenaza | Categoría STRIDE | Mitigación implementada |
|---|---|---|
| Acceso al dashboard sin credenciales | Spoofing | AuthGuard Angular + JwtAuthGuard NestJS — bloquea antes de renderizar |
| Robo de JWT de localStorage | Information Disclosure | JWT con expiración corta; refresh token rotation single-use |
| Intercepciones de tráfico HTTP/WS | Information Disclosure | TLS 1.2/1.3 en todo el tráfico (Azure Blob Storage HTTPS nativo + Nginx + Let's Encrypt) |
| Replay de token WebSocket | Repudiation | JWT con `exp`; verificación en cada conexión nueva con `io.use()` |
| Enumeración de vehículos sin autenticación | Information Disclosure | Todos los endpoints REST protegidos por `JwtAuthGuard`; sin `@Public()` en recursos de flota |
| Inyección SQL vía parámetros REST | Tampering | Prisma ORM — todas las queries parametrizadas; sin SQL crudo |
| Fuerza bruta en login | Elevation of Privilege | Rate limiting en NestJS (implementado en `common/middleware`) |
| Acceso de conductor al dashboard web | Elevation of Privilege | Whitelist de rol `admin` en `AuthGuard`; conductor es redirigido a `/login` |

### 8.2 Autenticación y autorización

**Flujo de autenticación completo:**

```
1. Usuario envía { email, password }
   └── POST /api/v1/auth/login
         └── AuthService.validateUser()
               ├── bcrypt.compare(password, user.passwordHash)
               └── JwtService.sign({ sub: userId, email, role, vehicleId })
                     └── { accessToken, refreshToken }

2. Refresh token:
   └── POST /api/v1/auth/refresh { refreshToken }
         ├── SHA-256(refreshToken) → buscar en tabla RefreshToken
         ├── Verificar !consumedAt && !expirado
         ├── Marcar consumedAt (transacción atómica)
         └── Generar nuevo par { accessToken, refreshToken }

3. Google OAuth:
   └── GET /api/v1/auth/google → redirect Google
         └── GET /api/v1/auth/google/callback
               ├── Verificar email en GOOGLE_ADMIN_EMAILS → role: 'admin'
               └── email no en lista → role: 'conductor'
```

### 8.3 Buenas prácticas de seguridad implementadas

| Práctica | Estado | Detalles |
|---|---|---|
| Contraseñas con bcrypt | ✅ | Salt rounds = 10; hash almacenado, plaintext nunca persistido |
| JWT con tiempo de expiración | ✅ | `exp` en payload; `ignoreExpiration: false` en JwtStrategy |
| Refresh tokens de un solo uso | ✅ | SHA-256 hash; `consumedAt` en transacción Prisma atómica |
| HTTPS/WSS obligatorio en producción | ✅ | Nginx + Let's Encrypt; no HTTP en producción |
| Variables de entorno para secretos | ✅ | `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` en `.env`; nunca commiteados |
| CORS restringido a orígenes conocidos | ✅ | `CORS_ORIGINS` en Gateway limita a dominio del frontend |
| Protección de rutas por rol | ✅ | `AuthGuard` Angular + `JwtAuthGuard` NestJS en todos los recursos protegidos |
| No exponer puertos internos | ✅ | PostgreSQL, Redis, VROOM, AI Predictor solo accesibles en red Docker interna |
| Rate limiting | ✅ | `ThrottlerModule` en NestJS Gateway — límite configurable por endpoint |
| Normalización de email en OAuth | ✅ | `normalizeEmail()` antes de comparar contra whitelist — previene bypass por capitalización |

---

## 9. Bitácora de Ceremonias

### 9.1 Resumen de ceremonias por sprint

| Sprint | Planning | Review | Retrospectiva | Velocidad real |
|---|---|---|---|---|
| S1 — MVP Conectado | Definición de monorepo, puertos, contratos Socket.io | Demo: posición GPS live en consola | Ajustar contratos antes de codificar | 13 pts |
| S2 — APIs Reales | REST endpoints, Prisma schema, JWT HTTP | Demo: login + CRUD vehículos en Postman | Documentar endpoints en Swagger desde el inicio | 21 pts |
| S3 — Optimizer Vivo | Contrato gRPC protobuf, integración VROOM | Demo: optimización VRP con datos sintéticos | Sincronizar proto entre gateway y optimizer antes del sprint | 21 pts |
| S4 — Interfaces + Auth | Monorepo frontend, AuthGuard, JWT WebSocket | Demo: dashboard web + app móvil con auth real | Crear specs de Angular junto con el componente, no después | 34 pts |
| S5 — Cloud Deploy Azure | Terraform módulos, Docker Compose prod, CI/CD | Demo: flujo completo desde `logiflowapp.z13.web.core.windows.net` | Variables de entorno: crear `.env.example` al inicio del sprint | 46 pts |
| S6 — Observabilidad | Tests unitarios, Swagger, documento de arquitectura | Demo: cobertura ≥ 80% frontend + backend | Los tests revelan contratos implícitos — escribirlos aclara la arquitectura | 34 pts |
| S7 — Escala / Performance | JMeter plan, connection pools, Redis tuning | Demo: reporte JMeter con P95 < 300 ms | Definir SLOs antes de medir, no al revés | 21 pts |
| S8 — Push Notifications | FCM setup, n8n Telegram workflow, alertas | Demo: notificación push en emulador Android | Firebase requiere `google-services.json` — no compartir en repositorio | 13 pts |
| S9 — Google OAuth + RBAC | OAuth callback, whitelist admin, refresh rotation | Demo: login con Google + redirección por rol | Refresh token rotation debe ser atómica — usar transacción Prisma | 21 pts |
| S10 — Production Hardening | APK Android Studio, rate limiting, CORS final | Demo: APK funcional + Release 2 completo | Documentar la arquitectura real, no la del spec original | 21 pts |

### 9.2 Release 1 — Criterios de aceptación cumplidos

El primer corte de evaluación (Release 1) cubrió los sprints S1–S3 y demostró:

- Monorepo `logiflow` con 4 servicios dockerizados y comunicación funcional.
- Endpoint `POST /api/v1/webhook` recibiendo eventos de n8n y disparando optimización gRPC con VROOM.
- Evento `route:update` llegando al cliente web en tiempo real vía Socket.io.
- Posición GPS de vehículo emitida cada ~5 s y visible en consola del dashboard.
- Tests unitarios en `services/realtime`: offlineDetection + routeUpdate (Sprint 3).

### 9.3 Release 2 — Criterios de aceptación cumplidos

El segundo corte de evaluación (Release 2) cubrió los sprints S4–S6 y demostró:

- Dashboard web Angular en producción: `https://logiflowapp.z13.web.core.windows.net`.
- Backend en Azure VM: `https://logiflow-api.eastus2.cloudapp.azure.com`.
- Flujo completo E2E: login → dashboard → posición GPS en tiempo real → ruta optimizada.
- App móvil Ionic compilada como APK debug y probada en emulador Android.
- Cobertura de tests: frontend 80.49% (109 tests), backend 83.36%.
- Infraestructura como código: Terraform `infra/terraform/azure/` con módulos `network` + `vm`.
- Documento de arquitectura presente con atributos de calidad medibles.

### 9.4 Lecciones aprendidas

| Área | Lección |
|---|---|
| Contratos de interfaz | Definir los contratos (proto gRPC, eventos Socket.io, DTOs REST) **antes** de codificar los servicios que los producen y consumen. Un desajuste en `lon` vs `lng` en el proto tardó un sprint en detectarse. |
| Tests desde el inicio | Escribir las especificaciones de prueba junto con la implementación, no como una tarea de cierre de sprint. Los tests revelan ambigüedades en la interfaz que el código esconde. |
| Variables de entorno | Crear `.env.example` completo antes de desplegar. URLs hardcodeadas en código de producción son un error que solo se detecta cuando el sistema falla en producción. |
| IaC desde el inicio | Provisionar infraestructura con Terraform desde el Sprint 1 habría evitado la "deuda de IaC" que requirió un sprint completo de reverse engineering en S5. |
| Monorepo frontend | El monorepo `logiflow-front` con interfaces TypeScript compartidas (`shared/models`) eliminó la duplicación de tipos entre web-admin y la app móvil — decisión correcta desde el inicio. |
| Seguridad en WebSockets | El JWT en handshake (no en cada frame) es la solución correcta para Socket.io. Intentar validar en cada evento generó complejidad innecesaria y fue descartado. |

---

## 10. Conclusiones y Recomendaciones

### 10.1 Conclusiones

**Sobre la arquitectura:**

LogiFlow demuestra que una arquitectura de microservicios event-driven con Redis Pub/Sub como broker de mensajes es una solución viable y escalable para el problema de ruteo dinámico de flotas en tiempo real. La separación en servicios independientes (Gateway REST, Realtime WebSocket, Optimizer gRPC, Automation n8n) permitió que cada miembro del equipo trabajara en su servicio sin bloquear a los demás, validando la promesa de los microservicios en un equipo pequeño.

**Sobre los atributos de calidad:**

- **Disponibilidad (99.69% infraestructura cloud):** El SLA compuesto de Azure es suficiente para un sistema universitario. La limitación actual es la VM única para el backend; para producción real se requeriría al menos un Azure Load Balancer con múltiples instancias.
- **Seguridad:** La combinación JWT en handshake WebSocket + refresh token rotation + bcrypt + HTTPS/WSS cubre las amenazas más relevantes para el sistema. El modelo STRIDE no identificó vulnerabilidades críticas no mitigadas.
- **Mantenibilidad (≥ 80% cobertura):** Alcanzar 80.49% en frontend y 83.36% en backend con mocks correctamente aislados confirma que la arquitectura de inyección de dependencias (Angular DI + NestJS DI) es efectiva para la testeabilidad.
- **Portabilidad (100% dockerizado):** La decisión de dockerizar todos los servicios desde el Sprint 1, combinada con variables de entorno para toda la configuración, demostró su valor en el Sprint 5 al desplegar en Azure sin cambios de código.

**Sobre el proceso:**

Scrum con sprints de 1–2 semanas fue adecuado para un equipo de 4 personas en un contexto académico. La herramienta Azure DevOps cumplió su función de gestión del backlog. La ausencia de Daily Standup presencial (reemplazado por Discord asíncrono) fue una adaptación efectiva para equipos distribuidos.

### 10.2 Recomendaciones para trabajo futuro

| Recomendación | Prioridad | Justificación |
|---|---|---|
| Migrar PostgreSQL a Azure Database for PostgreSQL Flexible Server | Alta | SLA 99.99% vs ~99.5% del contenedor Docker; backups automáticos; réplicas de lectura |
| Agregar Azure Load Balancer frente al Gateway y Realtime | Alta | Para alcanzar alta disponibilidad real; la arquitectura ya está preparada (Redis Pub/Sub desacopla las instancias) |
| Implementar observabilidad con OpenTelemetry + Azure Monitor | Media | Trazabilidad de requests E2E entre servicios; alertas automáticas ante degradación de rendimiento |
| Agregar tests de integración E2E con Playwright o Cypress | Media | Los tests unitarios verifican lógica aislada; los tests E2E verifican el flujo completo en navegador real |
| Publicar la app móvil en Google Play Store | Baja | APK debug funcional; requiere cuenta de desarrollador y firma de release |
| Implementar CI/CD con revisión de seguridad (SAST) | Media | Integrar `npm audit` y análisis estático en el pipeline para detectar vulnerabilidades en dependencias |
| Evaluar migración a Azure Container Apps o AKS | Baja (largo plazo) | Para escalar a producción real con múltiples instancias y reinicio automático; Docker Compose es suficiente para la carga actual |

---

## 11. Anexos

### 11.1 Glosario

| Término | Definición |
|---|---|
| **VRP** | Vehicle Routing Problem — problema de optimización combinatoria que busca la asignación óptima de vehículos a rutas de entrega minimizando costo/distancia/tiempo |
| **VROOM** | Vehicle Routing Open-source Optimization Machine — solver open source de VRP, escrito en C++, usado como motor de optimización en LogiFlow |
| **Socket.io** | Biblioteca JavaScript para comunicación bidireccional en tiempo real basada en WebSocket con fallback a HTTP long-polling |
| **Redis Pub/Sub** | Mecanismo de mensajería publish/subscribe de Redis que permite comunicar instancias de servicios sin acoplamiento directo |
| **gRPC** | Google Remote Procedure Call — protocolo de comunicación de alto rendimiento basado en HTTP/2 y Protocol Buffers (protobuf) |
| **JWT** | JSON Web Token — estándar (RFC 7519) para transmitir claims entre partes de forma segura como objeto JSON firmado |
| **Refresh Token** | Token de larga duración usado para obtener nuevos access tokens sin requerir al usuario que vuelva a autenticarse |
| **IaC** | Infrastructure as Code — práctica de definir y provisionar infraestructura mediante código versionado (Terraform en este proyecto) |
| **PWA** | Progressive Web App — aplicación web que se comporta como app nativa; soporta instalación en dispositivo, offline y notificaciones push |
| **Monorepo** | Repositorio único que contiene múltiples proyectos o paquetes relacionados — en LogiFlow: `logiflow` (backend) y `logiflow-front` (frontend) |
| **Room (Socket.io)** | Canal de comunicación groupal en Socket.io; `fleet` agrupa a todos los despachadores; `vehicle:v-001` es exclusivo del vehículo v-001 |
| **CDN** | Content Delivery Network — red de servidores distribuidos que sirve contenido estático desde el punto geográficamente más cercano al usuario. No fue configurado en este proyecto por restricciones de la suscripción de estudiantes de Azure. |
| **SLA** | Service Level Agreement — acuerdo de nivel de servicio que define la disponibilidad garantizada por un proveedor (e.g., Azure Blob Storage: 99.9%) |
| **Heartbeat** | Señal periódica enviada por el cliente para indicar que sigue activo; en LogiFlow, la posición GPS cada ~5 s actúa como heartbeat del vehículo |
| **bcrypt** | Función de hash de contraseñas diseñada para ser computacionalmente costosa, resistente a ataques de fuerza bruta |

### 11.2 Referencias

| # | Referencia |
|---|---|
| [1] | Bass, L., Clements, P., & Kazman, R. (2022). *Software Architecture in Practice* (4th ed.). Addison-Wesley. |
| [2] | Microsoft Azure. *SLA for Azure Blob Storage*. https://azure.microsoft.com/en-us/support/legal/sla/storage/ |
| [3] | Microsoft Azure. *SLA for Azure Public IP*. https://azure.microsoft.com/en-us/support/legal/sla/public-ip-addresses/ |
| [4] | Microsoft Azure. *SLA for Virtual Machines*. https://azure.microsoft.com/en-us/support/legal/sla/virtual-machines/ |
| [5] | VROOM Project. *Vehicle Routing Open-source Optimization Machine*. https://github.com/VROOM-Project/vroom |
| [6] | Socket.io. *Documentation*. https://socket.io/docs/v4/ |
| [7] | NestJS. *Documentation*. https://docs.nestjs.com/ |
| [8] | Prisma. *Documentation*. https://www.prisma.io/docs/ |
| [9] | Terraform. *Azure Provider Documentation*. https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs |
| [10] | Angular. *Documentation*. https://angular.dev/ |
| [11] | Ionic Framework. *Documentation*. https://ionicframework.com/docs/ |
| [12] | RFC 7519 — JSON Web Token (JWT). https://datatracker.ietf.org/doc/html/rfc7519 |

### 11.3 Repositorios

| Repositorio | URL | Rama principal |
|---|---|---|
| Backend (microservicios) | https://github.com/Logiflow-Gavilanes-ECI/logiflow | `develop` |
| Frontend (monorepo Angular/Ionic) | https://github.com/Logiflow-Gavilanes-ECI/logiflow-front | `main` / `feat/deploy-front` |

### 11.4 URLs de producción verificadas (mayo 2026)

| Recurso | URL |
|---|---|
| Web admin (Angular PWA) | https://logiflowapp.z13.web.core.windows.net |
| Backend API | https://logiflow-api.eastus2.cloudapp.azure.com |
| API Health check | https://logiflow-api.eastus2.cloudapp.azure.com/health |
| Swagger UI | https://logiflow-api.eastus2.cloudapp.azure.com/api/docs |

---

*Documento generado por el equipo Los Gavilanes del Código — Escuela Colombiana de Ingeniería Julio Garavito · Arquitecturas de Software · Mayo 2026.*
