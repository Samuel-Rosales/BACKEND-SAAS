# Módulo Finance - Caja Registradora

## ✅ Endpoints actuales (v2026-01-29)

Base URL: `/api/v1/finance/cash-register`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /open` — Abrir caja
- `GET /status` — Estado de mi caja (dashboard del POS)
- `GET /` — Histórico de cajas (admin)
- `PATCH /:id/close` — Cerrar caja

**Nota:** Enviar `x-business-id` para contexto de negocio (el `authMiddleware` lo usa para inyectar `businessId` y `membershipId` en `req.user`).

## 📍 Endpoints

Base URL: `/api/v1/finance/cash-register`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Abrir Caja

Abre una nueva caja registradora para el miembro autenticado.

Regla actual de negocio (según implementación): un miembro no puede tener dos cajas abiertas al mismo tiempo.

**Endpoint:** `POST /api/v1/finance/cash-register/open`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "memberId": 5,
  "initialAmount": 100.00,
  "denominations": [
    {
      "denomination": 20.0,
      "quantity": 5,
      "currency": "USD",
      "exchangeRateId": 1
    }
  ]
}
```

#### Validaciones

- `memberId`: Obligatorio, number (actualmente se valida, pero el backend usa el `membershipId` inyectado en `req.user`)
- `initialAmount`: Obligatorio, number, debe ser >= 0
- `denominations`: Opcional, array de denominaciones iniciales
  - `denominations.*.denomination`: number
  - `denominations.*.quantity`: int >= 1
  - `denominations.*.currency`: `USD` | `VES`
  - `denominations.*.exchangeRateId`: int

#### Response (201 Created)

```json
{
  "message": "Caja abierta exitosamente",
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "OPEN",
    "openTime": "2024-01-15T10:30:00.000Z",
    "initialAmount": 100.00,
    "finalAmount": null,
    "member": {
      "id": 5,
      "user": {
        "name": "Juan Pérez"
      }
    }
  }
}
```

#### Errores

- `400`: Header `x-business-id` faltante o inválido
- `404`: Miembro no válido (no pertenece al negocio o está inactivo)
- `409`: Ya tienes una caja abierta. Debes cerrarla primero.

---

### 2. Estado de mi Caja (Dashboard POS)

Obtiene la caja abierta del miembro autenticado y un resumen calculado por el sistema (`systemSummary`) basado en los pagos registrados en la caja.

**Endpoint:** `GET /api/v1/finance/cash-register/status`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Estado de caja obtenido",
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "OPEN",
    "openTime": "2024-01-15T10:30:00.000Z",
    "initialAmount": 100.0,
    "finalAmount": null,
    "member": {
      "user": {
        "name": "Juan Pérez"
      }
    },
    "systemSummary": [
      {
        "method": "Efectivo",
        "type": "CASH",
        "currency": "USD",
        "total": 250.0
      }
    ]
  }
}
```

#### Errores

- `404`: No tienes caja abierta

---

### 3. Listar Cajas (Histórico)

Obtiene el histórico de cajas del negocio (máximo 50), ordenadas por fecha de apertura descendente.

**Endpoint:** `GET /api/v1/finance/cash-register`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Histórico obtenido",
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "memberId": 5,
      "status": "OPEN",
      "openTime": "2024-01-15T10:30:00.000Z",
      "initialAmount": 100.00,
      "finalAmount": null,
      "member": {
        "id": 5,
        "user": {
          "name": "Juan Pérez"
        }
      },
      "_count": {
        "payments": 2
      }
    }
  ]
}
```

#### Errores

- `200`: Si no hay registros, retorna array vacío

---

### 4. Cerrar Caja

Cierra una caja abierta. La caja debe estar en estado OPEN.

**Endpoint:** `PATCH /api/v1/finance/cash-register/:id/close`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la caja (número)

#### Request Body

```json
{
  "finalAmount": 500.00,
  "closeTime": "2024-01-15T18:00:00.000Z",
  "counts": [
    {
      "denomination": 20.0,
      "quantity": 25,
      "currency": "USD",
      "exchangeRateId": 1
    }
  ]
}
```

#### Validaciones

- `finalAmount`: Obligatorio, number, debe ser >= 0
- `counts`: Obligatorio, array con al menos 1 ítem
  - `counts.*.denomination`: number
  - `counts.*.quantity`: int >= 1
  - `counts.*.currency`: `USD` | `VES`
  - `counts.*.exchangeRateId`: int
- `closeTime`: Opcional, string (ISO 8601), por defecto usa la fecha actual

#### Response (200 OK)

```json
{
  "message": "Caja cerrada correctamente",
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "CLOSED",
    "openTime": "2024-01-15T10:30:00.000Z",
    "closeTime": "2024-01-15T18:00:00.000Z",
    "initialAmount": 100.00,
    "finalAmount": 500.00
  }
}
```

#### Errores

- `404`: Caja no encontrada o ya está cerrada

---

## 🧩 Notas de implementación (Importante)

- Actualmente no existen endpoints `GET /open` ni `GET /:id` en las rutas del módulo; el frontend debe usar `GET /status` para consultar la caja abierta.
- El cierre guarda el conteo físico en `cashCount` (tipo `FINAL`), pero el endpoint no retorna esos conteos.

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias cajas
- Un miembro no puede tener dos cajas abiertas a la vez
- Solo se puede cerrar una caja que esté en estado OPEN
- Registro de quién abrió/cerró la caja (miembro)
