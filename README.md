# BACKEND-SAAS

Backend API REST para un sistema SaaS multi-tenant (Inventario, Ventas, Compras, Finanzas, Plataforma y AIM/RBAC).

## Contenido

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Variables de entorno](#variables-de-entorno)
- [Instalación rápida](#instalación-rápida)
- [Prisma y Base de Datos](#prisma-y-base-de-datos)
- [Scripts](#scripts)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Autenticación y multi-tenant](#autenticación-y-multi-tenant)
- [Rutas principales](#rutas-principales)
- [Documentación de la API](#documentación-de-la-api)
- [Troubleshooting](#troubleshooting)

---

## Stack

- **Runtime:** Node.js
- **Lenguaje:** TypeScript
- **Framework:** Express (v5)
- **DB:** PostgreSQL
- **ORM:** Prisma (Prisma Client)
- **Auth:** JWT
- **Validación:** express-validator
- **Logs:** morgan + winston

---

## Requisitos

- Node.js (recomendado LTS)
- PostgreSQL disponible local o remoto
- (Opcional) Prisma Studio para explorar datos

---

## Variables de entorno

Este proyecto usa `dotenv`.

Crea un archivo `.env` en la raíz y define al menos:

```env
# Base de datos
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"

# API
API_PORT=3000
API_URL=http://localhost:3000

# JWT
JWT_SECRET=super_secret_change_me
JWT_EXPIRES_IN=1d
```

Notas:

- `DATABASE_URL` es requerida por Prisma/pg.
- `API_URL` es solo informativo para logs.
- Si no defines `JWT_SECRET`, se usa un valor dev por defecto (no recomendado en producción).

---

## Instalación rápida

```bash
npm install
```

Luego prepara la base de datos (ver siguiente sección) y arranca el servidor en modo dev:

```bash
npm run dev
```

Por defecto la API queda en:

- `http://localhost:3000/api/v1`

---

## Prisma y Base de Datos

### 1) Migraciones

Este repo mantiene migraciones en `prisma/migrations`.

Flujo típico en desarrollo:

```bash
# Ejecutar migraciones pendientes (si aplica)
npx prisma migrate dev

# Generar cliente
npm run prisma:generate
```

### 2) Seed

Para cargar datos base (catálogos/valores iniciales):

```bash
npm run prisma:seed
```

### 3) Prisma Studio

```bash
npm run prisma:studio
```

---

## Scripts

Los scripts principales están en `package.json`:

- `npm run dev`: desarrollo con nodemon + ts-node
- `npm run build`: compila TypeScript a `dist/`
- `npm start`: ejecuta `dist/app.js`
- `npm run prisma:generate`: genera Prisma Client
- `npm run prisma:format`: formatea `schema.prisma`
- `npm run prisma:push`: sincroniza esquema (útil en prototipos)
- `npm run prisma:seed`: ejecuta `prisma/seed.ts`
- `npm run db:reset`: resetea DB (solo desarrollo)

---

## Arquitectura del proyecto

Estructura principal:

```text
src/
	app.ts                  # entrypoint
	server/server.server.ts  # configuración Express + rutas
	configs/                 # prisma + logger
	middlewares/             # auth, validation, etc.
	modules/                 # módulos de negocio (AIM, Platform, Inventory, Finance, Procurement, Sales)
	utils/                   # helpers (jwt, exchange-rate resolver, errores, etc.)
prisma/
	schema.prisma
	migrations/
	seed.ts
docs/
	README.md                # índice docs API
	modules/                 # docs por entidad
```

Patrón por módulo (convención):

- `*.route.ts`: define rutas Express
- `*.controller.ts`: recibe req/res y llama al service
- `*.service.ts`: lógica de negocio + Prisma
- `*.validator.ts`: reglas de validación con express-validator
- `interfaces/`: DTOs de entrada/salida (cuando aplica)

---

## Autenticación y multi-tenant

### Auth (JWT)

- La mayoría de endpoints requieren `Authorization: Bearer <token>`.
- Login expone un token JWT que se usa en llamadas posteriores.

### Multi-tenant (`x-business-id`)

Algunos módulos son multi-tenant. En esos casos debes enviar:

```text
x-business-id: <businessId>
```

El middleware:

- valida que el usuario exista
- valida que el usuario pertenezca al negocio (`BusinessMember` activo)
- inyecta en `req.user`:
	- `businessId`
	- `membershipId`
	- `roleId`

Documentación detallada: `docs/authentication.md`.

---

## Rutas principales

Prefijo global:

- `/api/v1`

Rutas montadas en el servidor (ver `src/server/server.server.ts`):

### AIM

- `/api/v1/aim/auth`
- `/api/v1/aim/user`
- `/api/v1/aim/role`
- `/api/v1/aim/business-member`
- `/api/v1/aim/contact`

### Platform

- `/api/v1/platform/business-category`
- `/api/v1/platform/subscription`
- `/api/v1/platform/business`

### Inventory

- `/api/v1/inventory/category`
- `/api/v1/inventory/depot`
- `/api/v1/inventory/product`
- `/api/v1/inventory/product-presentation`
- `/api/v1/inventory/measurement-unit`
- `/api/v1/inventory/stock-lot`
- `/api/v1/inventory/stock-movement`

### Finance

- `/api/v1/finance/exchange-rate`
- `/api/v1/finance/payment-method`
- `/api/v1/finance/tax`
- `/api/v1/finance/cash-register`
- `/api/v1/finance/cash-count`

### Procurement

- `/api/v1/procurement/supplier`
- `/api/v1/procurement/purchase`
- `/api/v1/procurement/purchase-payment`
- `/api/v1/procurement/purchase-item`

### Sales

- `/api/v1/sales/client`
- `/api/v1/sales/sale`
- `/api/v1/sales/credit-note`

---

## Documentación de la API

La documentación REST está en la carpeta `docs/`.

- Índice: `docs/README.md`
- Autenticación: `docs/authentication.md`
- Docs por módulo/entidad: `docs/modules/**`

---

## Troubleshooting

### Error: no conecta a la DB

- Verifica `DATABASE_URL`.
- Verifica que PostgreSQL esté corriendo.
- Si estás en Windows, revisa firewall/puerto.

### Error 401/403 en endpoints multi-tenant

- Asegúrate de enviar `Authorization`.
- Si el endpoint requiere contexto, envía `x-business-id`.
- El usuario debe tener una membresía activa (`BusinessMember`) para ese negocio.

### Prisma Client desactualizado

Si cambiaste `schema.prisma`:

```bash
npm run prisma:generate
```

---

## Licencia

Proyecto privado/interno.
