# Módulo Finance - Tasas de Cambio

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
  "currency": "USD",
  "rate": 54.3000
}
```

#### Validaciones

- `currency`: Obligatorio, string, código ISO de 3 caracteres en mayúsculas (ej: USD, VES, EUR)
- `rate`: Obligatorio, number, debe ser >= 0 (4 decimales de precisión)

**Nota:** El `createdById` se obtiene automáticamente del token de autenticación.

#### Response (201 Created)

```json
{
  "message": "Tasa de cambio creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "currency": "USD",
    "rate": 54.3000,
    "createdById": 5,
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
      "currency": "USD",
      "rate": 54.3000,
      "createdById": 5,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "businessId": 1,
      "currency": "USD",
      "rate": 54.5000,
      "createdById": 5,
      "createdAt": "2024-01-14T10:30:00.000Z"
    }
  ]
}
```

#### Errores

- `404`: No hay tasas de cambio registradas (retorna array vacío)

---

### 3. Obtener Última Tasa por Moneda

Obtiene la tasa de cambio más reciente para una moneda específica.

**Endpoint:** `GET /api/v1/finance/exchange-rate/currency/:currency`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `currency`: Código ISO de la moneda (3 caracteres, mayúsculas)

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "currency": "USD",
    "rate": 54.3000,
    "createdById": 5,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `404`: No se encontró tasa de cambio para la moneda especificada

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
    "currency": "USD",
    "rate": 54.3000,
    "createdById": 5,
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

- `currency`: Opcional, string, código ISO de 3 caracteres en mayúsculas
- `rate`: Opcional, number, debe ser >= 0

#### Response (200 OK)

```json
{
  "message": "Tasa de cambio actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "currency": "USD",
    "rate": 54.5000,
    "createdById": 5,
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
