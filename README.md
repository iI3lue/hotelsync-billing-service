# HotelSync — Billing Service

Microservicio de facturación de HotelSync: folios por reserva, cargos, cierre de folio y emisión de facturas.

- **Producción:** https://hotelsync-billing-service.onrender.com
- **Puerto local:** 3007
- **Base de datos:** `billing_db` (PostgreSQL 16)

## Responsabilidad

| Hace | No hace |
| --- | --- |
| Abrir el folio cuando la reserva se confirma | Procesar pagos (solo registra el estado) |
| Registrar cargos (minibar, servicios, etc.) | Hacer check-in/check-out |
| Cerrar el folio al recibir `checkout.completed` | Gestionar inventario ni tarifas |
| Emitir facturas y publicar `folio.closed` | Ser dueño de los datos de la reserva |

## Tecnologías

Node.js ≥20 · TypeScript · Express · Prisma · PostgreSQL 16 · Zod · RabbitMQ (outbox + consumidor).

## Arquitectura interna

`Route → Controller → Service → Prisma`, con Zod y `AppError`. El folio nace de forma event-driven: `booking.confirmed` abre el folio y `checkout.completed` lo cierra. Al cerrar se calcula el total y se publica `folio.closed` desde `EventOutbox` dentro de la misma transacción.

## Endpoints

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | — | Estado del servicio |
| GET | `/v1/folios` | JWT + RECEPTIONIST / MANAGER / SUPER_ADMIN | Lista folios |
| GET | `/v1/folios/guest/:id` | JWT + staff | Folios de un huésped |
| GET | `/v1/folios/by-booking/:bookingId` | JWT + staff | Folio de una reserva |
| GET | `/v1/folios/:id` | JWT + staff | Detalle de folio con cargos |
| POST | `/v1/folios/:id/close` | JWT + staff | Cierra el folio |
| POST | `/v1/charges` | JWT + RECEPTIONIST / MANAGER / SUPER_ADMIN | Agrega cargo |
| GET | `/v1/invoices` | JWT + staff | Lista facturas |
| GET | `/v1/invoices/:id` | JWT + staff | Detalle de factura |

## Modelo de datos

Tablas: `Folio`, `Charge`, `Invoice`, `EventOutbox`.

Migraciones en `prisma/migrations` (1). No requiere seed: los folios y facturas se generan por eventos de reserva y check-out.

## Comunicación

- **Consume:** `booking.confirmed` y `checkout.completed` (cola durable `billing.folio`).
- **Publica:** `folio.closed` (vía outbox).
- **REST saliente:** Booking `GET /v1/bookings/:id` (header `x-billing-key`) y Property `GET /v1/hotels/:id` (datos del hotel para la factura).

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NODE_ENV` | No | `development` / `production` |
| `PORT` | No | Puerto HTTP (default 3007) |
| `DATABASE_URL` | Sí | PostgreSQL de `billing_db` |
| `DIRECT_URL` | No | Conexión directa prevista para migraciones |
| `AUTH_JWT_SECRET` | Sí | HS256 compartido |
| `BOOKING_SERVICE_URL` | Sí | Base de booking-service |
| `BOOKING_SERVICE_KEY` | Sí | Debe coincidir con `BILLING_SERVICE_KEY` de Booking |
| `PROPERTY_SERVICE_URL` | Sí | Base de property-service |
| `DEFAULT_CURRENCY` | No | Moneda por defecto (default `COP`) |
| `RABBITMQ_URL` | No | Sin ella no se abren/cierran folios por eventos |

Copiar `.env.example` a `.env` y completar los valores.

## Ejecución local

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev                 # http://localhost:3007
```

## Despliegue

Render (Oregon, free): build `npm ci && npx prisma generate && npm run build`; start `npx prisma migrate deploy && npm start`; Neon `billing_db`. El plan free duerme a los 15 minutos.

## Pruebas y verificación

```bash
npm test
npm run lint
curl https://hotelsync-billing-service.onrender.com/health
```

## Respaldo de base de datos

```bash
pg_dump "$DATABASE_URL" -Fc -f billing_db.dump
pg_restore --clean --if-exists -d "$DATABASE_URL" billing_db.dump
```

## Estructura

```
src/{routes,controllers,services,validators,middleware,lib}
prisma/{schema.prisma,seed.ts,migrations}
tests/
```
