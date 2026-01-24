# Módulo Finance - Tasas de Cambio

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/finance/exchange-rate`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear tasa
- `GET /` — Listar tasas
- `GET /latest` — Obtener última tasa
- `GET /:id` — Obtener tasa
- `PATCH /:id` — Actualizar tasa
- `DELETE /:id` — Eliminar tasa

**Nota:** Enviar `x-business-id` para contexto de negocio si aplica.

## 📍 Endpoints

Base URL: `/api/v1/finance/exchange-rate`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Tasa de Cambio

Registra una nueva tasa de cambio para el negocio. Las tasas se mantienen históricamente para trazabilidad.

**Endpoint:** `POST /api/v1/finance/exchange-rate`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "rate": 54.3000,
  "source": "MANUAL" 
}
```

#### Validaciones

- `rate`: Obligatorio, number, debe ser > 0 (4 decimales de precisión)
- `source`: Opcional, enum (`MANUAL`, `API_BCV`, `API_PARALLEL`) (default: `MANUAL`)

#### Response (201 Created)

```json
{
  "message": "Tasa de cambio creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "rate": 54.3000,
    "source": "MANUAL",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "business": {
      "id": 1,
      "name": "Mi Negocio"
    }
  }
}
```

#### Errores

- `404`: Negocio no encontrado

---

### 2. Listar Tasas de Cambio

Obtiene todas las tasas de cambio del negocio, ordenadas por fecha descendente (más recientes primero).

**Endpoint:** `GET /api/v1/finance/exchange-rate`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Tasas de cambio obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "rate": 54.3000,
      "source": "MANUAL",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "businessId": 1,
      "rate": 54.5000,
      "source": "MANUAL",
      "isActive": true,
      "createdAt": "2024-01-14T10:30:00.000Z"
    }
  ]
}
```

#### Errores

- `404`: No hay tasas de cambio registradas (retorna array vacío)

---

### 3. Obtener Última Tasa

Obtiene la tasa de cambio más reciente (por negocio). Útil para inicializar el POS.

**Endpoint:** `GET /api/v1/finance/exchange-rate/latest`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "rate": 54.3000,
    "source": "MANUAL",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Obtener Tasa de Cambio por ID

Obtiene una tasa de cambio específica.

**Endpoint:** `GET /api/v1/finance/exchange-rate/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la tasa de cambio (número)

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "rate": 54.3000,
    "source": "MANUAL",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "business": {
      "id": 1,
      "name": "Mi Negocio"
    }
  }
}
```

#### Errores

- `404`: Tasa de cambio no encontrada o no pertenece a este negocio

---

### 5. Actualizar Tasa de Cambio

Actualiza una tasa de cambio existente.

**Endpoint:** `PATCH /api/v1/finance/exchange-rate/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la tasa de cambio (número)

#### Request Body

```json
{
  "rate": 54.5000
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `rate`: Opcional, number, debe ser > 0
- `source`: Opcional, enum (`MANUAL`, `API_BCV`, `API_PARALLEL`)
- `isActive`: Opcional, boolean

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "rate": 54.5000,
    "source": "MANUAL",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `404`: Tasa de cambio no encontrada o no pertenece a este negocio

---

### 6. Eliminar Tasa de Cambio

Elimina una tasa de cambio. No se puede eliminar si tiene registros asociados (ventas, compras, pagos, conteos de caja).

**Endpoint:** `DELETE /api/v1/finance/exchange-rate/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la tasa de cambio (número)

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio eliminada exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Tasa de cambio no encontrada o no pertenece a este negocio
- `400`: No se puede eliminar la tasa de cambio porque tiene registros asociados (ventas, compras, pagos, etc.)

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias tasas de cambio
- Protección de integridad: no se puede eliminar tasas con registros asociados
- Histórico: se mantienen todas las tasas para trazabilidad de transacciones antiguas
