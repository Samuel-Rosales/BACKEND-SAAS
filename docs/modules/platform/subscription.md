# Módulo Platform - Suscripciones

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/platform/subscription`

**Autenticación:** ❌ No requerida

**Endpoints:**
- `POST /` — Crear suscripción
- `GET /` — Listar suscripciones
- `GET /:id` — Obtener suscripción
- `GET /business/:businessId` — Listar por negocio
- `PATCH /:id` — Actualizar suscripción
- `DELETE /:id` — Eliminar suscripción

## 📍 Endpoints

Base URL: `/api/v1/platform/subscription`

**Autenticación:** No requerida (puede configurarse)

---

### 1. Crear Suscripción

Crea una nueva suscripción para un negocio.

**Endpoint:** `POST /api/v1/platform/subscription`

#### Request Body

```json
{
  "businessId": 1,
  "planType": "PREMIUM",
  "status": "ACTIVE",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-02-15T00:00:00Z",
  "lastPaymentRef": "PAY-2024-001"
}
```

#### Validaciones

- `businessId`: Obligatorio, number, debe existir el negocio
- `planType`: Obligatorio, enum: `TRIAL`, `BASIC`, `PREMIUM`, `ENTERPRISE`
- `status`: Obligatorio, enum: `ACTIVE`, `INACTIVE`, `PAST_DUE`, `CANCELLED`
- `startDate`: Obligatorio, fecha ISO 8601
- `endDate`: Obligatorio, fecha ISO 8601, debe ser posterior a `startDate`
- `lastPaymentRef`: Obligatorio, string, 1-100 caracteres

#### Comportamiento

- Verifica que el negocio exista
- Verifica que el negocio no tenga ya una suscripción (relación 1:1)
- Crea la suscripción

#### Response (201 Created)

```json
{
  "message": "Suscripción creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "planType": "PREMIUM",
    "status": "ACTIVE",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "lastPaymentRef": "PAY-2024-001",
    "business": {
      "id": 1,
      "name": "Mi Negocio"
    }
  }
}
```

#### Response (400 Bad Request)

```json
{
  "message": "El negocio ya tiene una suscripción activa",
  "status": 400,
  "data": null
}
```

---

### 2. Listar Suscripciones

Obtiene todas las suscripciones del sistema.

**Endpoint:** `GET /api/v1/platform/subscription`

#### Response (200 OK)

```json
{
  "message": "Suscripciones obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "planType": "PREMIUM",
      "status": "ACTIVE",
      "startDate": "2024-01-15T00:00:00Z",
      "endDate": "2024-02-15T00:00:00Z",
      "lastPaymentRef": "PAY-2024-001"
    }
  ]
}
```

---

### 3. Obtener Suscripción por ID

Obtiene una suscripción específica con información del negocio.

**Endpoint:** `GET /api/v1/platform/subscription/:id`

#### Parámetros de URL

- `id` (number): ID de la suscripción

#### Response (200 OK)

```json
{
  "message": "Suscripción obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "planType": "PREMIUM",
    "status": "ACTIVE",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "lastPaymentRef": "PAY-2024-001",
    "business": {
      "id": 1,
      "name": "Mi Negocio",
      "logoUrl": "https://ejemplo.com/logo.png",
      "address": "Av. Principal 123"
    }
  }
}
```

---

### 4. Obtener Suscripción por Negocio

Obtiene la suscripción de un negocio específico.

**Endpoint:** `GET /api/v1/platform/subscription/business/:businessId`

#### Parámetros de URL

- `businessId` (number): ID del negocio

#### Response (200 OK)

```json
{
  "message": "Suscripción obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "planType": "PREMIUM",
    "status": "ACTIVE",
    "business": {
      "id": 1,
      "name": "Mi Negocio",
      "logoUrl": "https://ejemplo.com/logo.png"
    }
  }
}
```

---

### 5. Actualizar Suscripción

Actualiza los datos de una suscripción.

**Endpoint:** `PATCH /api/v1/platform/subscription/:id`

#### Parámetros de URL

- `id` (number): ID de la suscripción

#### Request Body (todos los campos son opcionales)

```json
{
  "planType": "ENTERPRISE",
  "status": "ACTIVE",
  "endDate": "2024-03-15T00:00:00Z",
  "lastPaymentRef": "PAY-2024-002"
}
```

#### Validaciones

- `planType`: Opcional, enum válido
- `status`: Opcional, enum válido
- `startDate`: Opcional, fecha ISO 8601
- `endDate`: Opcional, fecha ISO 8601
- `lastPaymentRef`: Opcional, string, 1-100 caracteres

#### Response (200 OK)

```json
{
  "message": "Suscripción actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "planType": "ENTERPRISE",
    "status": "ACTIVE",
    "business": {
      "id": 1,
      "name": "Mi Negocio"
    }
  }
}
```

---

### 6. Eliminar Suscripción

Elimina una suscripción.

**Endpoint:** `DELETE /api/v1/platform/subscription/:id`

#### Parámetros de URL

- `id` (number): ID de la suscripción

#### Response (200 OK)

```json
{
  "message": "Suscripción eliminada exitosamente",
  "status": 200,
  "data": null
}
```

---

## 📋 Enums

### PlanType
- `TRIAL` - Plan de prueba
- `BASIC` - Plan básico
- `PREMIUM` - Plan premium
- `ENTERPRISE` - Plan empresarial

### SubStatus
- `ACTIVE` - Activa
- `INACTIVE` - Inactiva
- `PAST_DUE` - Vencida
- `CANCELLED` - Cancelada

## 📝 Notas

- Relación 1:1 con Business (un negocio solo puede tener una suscripción)
- Al crear un negocio, se crea automáticamente una suscripción TRIAL
- La fecha de fin debe ser posterior a la fecha de inicio
- `lastPaymentRef` almacena la referencia del último pago procesado
