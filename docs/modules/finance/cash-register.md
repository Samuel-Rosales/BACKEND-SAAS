# Módulo Finance - Caja Registradora

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/finance/cash-register`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /open` — Abrir caja
- `GET /` — Listar cajas
- `GET /open` — Obtener caja abierta
- `GET /:id` — Obtener caja
- `PATCH /:id/close` — Cerrar caja

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/finance/cash-register`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Abrir Caja

Abre una nueva caja registradora. Solo puede haber una caja abierta por negocio a la vez.

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
  "initialAmount": 100.00
}
```

#### Validaciones

- `memberId`: Obligatorio, number, debe existir el miembro activo en el negocio
- `initialAmount`: Opcional, number, debe ser >= 0 (default: 0)

#### Response (201 Created)

```json
{
  "message": "Caja abierta exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "OPEN",
    "openTime": "2024-01-15T10:30:00.000Z",
    "closeTime": null,
    "initialAmount": 100.00,
    "finalAmount": null,
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    }
  }
}
```

#### Errores

- `404`: Negocio no encontrado
- `404`: Miembro no encontrado, no pertenece a este negocio o está inactivo
- `400`: Ya existe una caja abierta para este negocio. Debe cerrarla antes de abrir una nueva.

---

### 2. Listar Cajas

Obtiene todas las cajas del negocio, ordenadas por fecha de apertura descendente.

**Endpoint:** `GET /api/v1/finance/cash-register`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Cajas obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "memberId": 5,
      "status": "OPEN",
      "openTime": "2024-01-15T10:30:00.000Z",
      "closeTime": null,
      "initialAmount": 100.00,
      "finalAmount": null,
      "member": {
        "id": 5,
        "user": {
          "id": 3,
          "name": "Juan Pérez"
        }
      },
      "_count": {
        "counts": 2
      }
    }
  ]
}
```

#### Errores

- `404`: No hay cajas registradas (retorna array vacío)

---

### 3. Obtener Caja Abierta

Obtiene la caja abierta actual del negocio, incluyendo los conteos iniciales.

**Endpoint:** `GET /api/v1/finance/cash-register/open`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Caja abierta obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "OPEN",
    "openTime": "2024-01-15T10:30:00.000Z",
    "closeTime": null,
    "initialAmount": 100.00,
    "finalAmount": null,
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    },
    "counts": [
      {
        "id": 1,
        "denomination": 20.00,
        "quantity": 5,
        "currency": "USD",
        "type": "INITIAL",
        "exchangeRate": {
          "id": 1,
          "currency": "USD",
          "rate": 1.0000
        }
      }
    ]
  }
}
```

#### Errores

- `404`: No hay caja abierta

---

### 4. Obtener Caja por ID

Obtiene una caja específica con todos sus conteos.

**Endpoint:** `GET /api/v1/finance/cash-register/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la caja (número)

#### Response (200 OK)

```json
{
  "message": "Caja obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "CLOSED",
    "openTime": "2024-01-15T10:30:00.000Z",
    "closeTime": "2024-01-15T18:00:00.000Z",
    "initialAmount": 100.00,
    "finalAmount": 500.00,
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    },
    "counts": [
      {
        "id": 1,
        "denomination": 20.00,
        "quantity": 5,
        "currency": "USD",
        "type": "INITIAL",
        "exchangeRate": {
          "id": 1,
          "currency": "USD",
          "rate": 1.0000
        }
      },
      {
        "id": 2,
        "denomination": 20.00,
        "quantity": 25,
        "currency": "USD",
        "type": "FINAL",
        "exchangeRate": {
          "id": 1,
          "currency": "USD",
          "rate": 1.0000
        }
      }
    ]
  }
}
```

#### Errores

- `404`: Caja no encontrada o no pertenece a este negocio

---

### 5. Cerrar Caja

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
  "closeTime": "2024-01-15T18:00:00.000Z"
}
```

**Todos los campos son opcionales**, pero se recomienda enviar `finalAmount`.

#### Validaciones

- `finalAmount`: Opcional, number, debe ser >= 0
- `closeTime`: Opcional, string (ISO 8601), por defecto usa la fecha actual

#### Response (200 OK)

```json
{
  "message": "Caja cerrada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "status": "CLOSED",
    "openTime": "2024-01-15T10:30:00.000Z",
    "closeTime": "2024-01-15T18:00:00.000Z",
    "initialAmount": 100.00,
    "finalAmount": 500.00,
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    },
    "counts": [
      {
        "id": 1,
        "denomination": 20.00,
        "quantity": 5,
        "currency": "USD",
        "type": "INITIAL",
        "exchangeRate": {
          "id": 1,
          "currency": "USD",
          "rate": 1.0000
        }
      },
      {
        "id": 2,
        "denomination": 20.00,
        "quantity": 25,
        "currency": "USD",
        "type": "FINAL",
        "exchangeRate": {
          "id": 1,
          "currency": "USD",
          "rate": 1.0000
        }
      }
    ]
  }
}
```

#### Errores

- `404`: Caja no encontrada o ya está cerrada

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias cajas
- Solo puede haber una caja abierta por negocio a la vez
- Solo se puede cerrar una caja que esté en estado OPEN
- Registro de quién abrió/cerró la caja (miembro)
