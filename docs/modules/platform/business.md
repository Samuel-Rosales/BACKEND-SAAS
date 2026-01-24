# Módulo Platform - Negocios

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/platform/business`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear negocio
- `GET /my-businesses` — Listar negocios del usuario
- `GET /:id` — Obtener negocio
- `PATCH /:id` — Actualizar negocio
- `PATCH /:id/exchange-rate-config` — Configurar tasa de cambio del negocio

## 📍 Endpoints

Base URL: `/api/v1/platform/business`

**Autenticación:** ✅ Requerida

---

### 1. Crear Negocio

Crea un nuevo negocio con suscripción trial y asigna al usuario como propietario.

**Endpoint:** `POST /api/v1/platform/business`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "name": "Mi Super Negocio",
  "address": "Av. Principal 123",
  "logoUrl": "https://ejemplo.com/logo.png",
  "businessCategoryId": 1
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-100 caracteres
- `address`: Obligatorio, string, 5-200 caracteres
- `logoUrl`: Opcional, string, debe ser URL válida
- `businessCategoryId`: Obligatorio, number, debe existir la categoría

#### Comportamiento

1. Busca el rol `OWNER` en el sistema
2. Crea el negocio
3. Crea automáticamente la relación BusinessMember (usuario como OWNER)
4. Crea automáticamente una suscripción TRIAL (7 días)
5. Todo en una transacción atómica

#### Response (201 Created)

```json
{
  "message": "Negocio creado exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Super Negocio",
    "address": "Av. Principal 123",
    "logoUrl": "https://ejemplo.com/logo.png",
    "businessCategoryId": 1,
    "rateStrategy": "MANUAL",
    "manualRate": "1.0000",
    "currentExchangeRate": "1.0000",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "subscription": {
      "id": 1,
      "planType": "TRIAL",
      "status": "ACTIVE",
      "startDate": "2024-01-15T10:30:00Z",
      "endDate": "2024-01-22T10:30:00Z"
    },
    "members": [
      {
        "role": {
            "name": "Dueño"
        }
      }
    ],
    "businessCategory": {
      "name": "Tecnología y desarollo de sotfware"
    }
  }
}
```

---

### 2. Listar Mis Negocios

Obtiene todos los negocios donde el usuario es miembro activo.

**Endpoint:** `GET /api/v1/platform/business/my-businesses`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Negocios obtenidos exitosamente",
  "data": [
    {
      "id": 1,
      "name": "Mi Super Negocio",
      "address": "Av. Principal 123",
      "logoUrl": "https://ejemplo.com/logo.png",
      "subscription": {
        "status": "ACTIVE",
        "planType": "TRIAL",
        "endDate": "2024-01-22T10:30:00Z"
      }
    }
  ]
}
```

---

### 3. Obtener Negocio por ID

Obtiene un negocio específico (solo si el usuario es miembro).

**Endpoint:** `GET /api/v1/platform/business/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros de URL

- `id` (number): ID del negocio

#### Response (200 OK)

```json
{
  "message": "Empresa obtenida exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Super Negocio",
    "address": "Av. Principal 123",
    "logoUrl": "https://ejemplo.com/logo.png",
    "members": [
      {
        "user": {
          "name": "Juan Pérez",
          "ci": "12345678"
        }
      }
    ]
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Empresa no encontrada o no tienes acceso.",
  "data": null
}
```

---

### 4. Actualizar Negocio

Actualiza los datos de un negocio (solo si el usuario es miembro activo).

**Endpoint:** `PATCH /api/v1/platform/business/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros de URL

- `id` (number): ID del negocio

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Mi Negocio Actualizado",
  "address": "Nueva Dirección 456",
  "logoUrl": "https://ejemplo.com/nuevo-logo.png",
  "businessCategoryId": 2
}
```

#### Validaciones

- `name`: Opcional, string, 2-100 caracteres
- `address`: Opcional, string, 5-200 caracteres
- `logoUrl`: Opcional, string, URL válida
- `businessCategoryId`: Opcional, number, debe existir

#### Response (200 OK)

```json
{
  "message": "Empresa actualizada exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Negocio Actualizado",
    "address": "Nueva Dirección 456",
    "logoUrl": "https://ejemplo.com/nuevo-logo.png"
  }
}
```

#### Response (403 Forbidden)

```json
{
  "message": "No tienes permisos para modificar esta empresa.",
  "data": null
}
```

---

### 5. Configurar Tasa de Cambio del Negocio

Actualiza la configuración de tasa del negocio (cache `currentExchangeRate`) según `rateStrategy` y crea un histórico cuando es manual.

**Endpoint:** `PATCH /api/v1/platform/business/:id/exchange-rate-config`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "strategy": "MANUAL",
  "manualRate": 54.30
}
```

#### Validaciones

- `strategy`: Obligatorio, enum (`MANUAL`, `API_BCV`, `API_PARALLEL`)
- `manualRate`: Requerido si `strategy = MANUAL`, number > 0

#### Response (200 OK)

```json
{
  "message": "Configuración de tasa actualizada exitosamente",
  "data": {
    "strategy": "MANUAL",
    "currentRate": "54.3000"
  }
}
```

---

## 🔒 Seguridad

- Todas las rutas requieren autenticación
- El `userId` se obtiene del token JWT (`req.user.id`)
- Solo se pueden ver/modificar negocios donde el usuario es miembro activo
- Se valida pertenencia antes de actualizar

## 📝 Notas

- Al crear un negocio, se crea automáticamente:
  - Suscripción TRIAL de 7 días
  - Relación BusinessMember con rol OWNER
- Todo se hace en una transacción atómica
- El rol `OWNER` debe existir en el sistema antes de crear negocios
- La tasa usada por el frontend se expone como `currentExchangeRate` (cache).
- Si `rateStrategy = MANUAL`, el valor de referencia es `manualRate`.
