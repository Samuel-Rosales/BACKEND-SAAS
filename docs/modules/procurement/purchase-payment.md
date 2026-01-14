# Módulo Procurement - Pagos de Compra

## 📍 Endpoints

Base URL: `/api/v1/procurement/purchase-payment`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Pago de Compra

Registra un nuevo pago para una compra existente.

**Endpoint:** `POST /api/v1/procurement/purchase-payment`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "purchaseId": 1,
  "paymentMethodId": 2,
  "amount": 600.00,
  "currency": "USD",
  "exchangeRateId": 1,
  "reference": "TRF-123456"
}
```

#### Validaciones

- `purchaseId`: Obligatorio, number, debe existir la compra y pertenecer al negocio
- `paymentMethodId`: Obligatorio, number, debe existir el método de pago y estar activo
- `amount`: Obligatorio, number, debe ser > 0
- `currency`: Obligatorio, enum (`USD`, `VES`)
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio y estar activa
- `reference`: Opcional, string, referencia bancaria o de pago (máximo 200 caracteres)

#### Response (201 Created)

```json
{
  "message": "Pago de compra creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "paymentMethodId": 2,
    "amount": 600.00,
    "currency": "USD",
    "exchangeRateId": 1,
    "reference": "TRF-123456",
    "paymentDate": "2024-01-15T10:30:00.000Z",
    "paymentMethod": {
      "id": 2,
      "name": "Transferencia Bancaria",
      "type": "BANK_TRANSFER"
    },
    "exchangeRate": {
      "id": 1,
      "rate": 36.50,
      "currency": "USD",
      "createdAt": "2024-01-15T00:00:00.000Z"
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459"
    }
  }
}
```

#### Errores

- `404`: La compra no existe
- `403`: La compra no pertenece a este negocio
- `404`: El método de pago no existe
- `400`: El método de pago está inactivo
- `404`: La tasa de cambio no existe
- `400`: La moneda debe ser USD o VES
- `400`: El monto debe ser mayor a cero

---

### 2. Listar Pagos de Compra

Obtiene todos los pagos de compra del negocio, opcionalmente filtrados por compra.

**Endpoint:** `GET /api/v1/procurement/purchase-payment`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Query Parameters

- `purchaseId`: Opcional, number, filtra los pagos por ID de compra

**Ejemplo:** `GET /api/v1/procurement/purchase-payment?purchaseId=1`

#### Response (200 OK)

```json
{
  "message": "Pagos de compra obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "purchaseId": 1,
      "paymentMethodId": 2,
      "amount": 600.00,
      "currency": "USD",
      "exchangeRateId": 1,
      "reference": "TRF-123456",
      "paymentDate": "2024-01-15T10:30:00.000Z",
      "paymentMethod": {
        "id": 2,
        "name": "Transferencia Bancaria",
        "type": "BANK_TRANSFER"
      },
      "exchangeRate": {
        "id": 1,
        "rate": 36.50,
        "currency": "USD",
        "createdAt": "2024-01-15T00:00:00.000Z"
      },
      "purchase": {
        "id": 1,
        "totalCost": 1160.00,
        "reference": "A-00459",
        "date": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "id": 2,
      "purchaseId": 1,
      "paymentMethodId": 3,
      "amount": 560.00,
      "currency": "VES",
      "exchangeRateId": 1,
      "reference": "ZELLE-789012",
      "paymentDate": "2024-01-15T10:35:00.000Z",
      "paymentMethod": {
        "id": 3,
        "name": "Zelle",
        "type": "DIGITAL_WALLET"
      },
      "exchangeRate": {
        "id": 1,
        "rate": 36.50,
        "currency": "USD",
        "createdAt": "2024-01-15T00:00:00.000Z"
      },
      "purchase": {
        "id": 1,
        "totalCost": 1160.00,
        "reference": "A-00459",
        "date": "2024-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay pagos de compra registrados",
  "status": 404,
  "data": []
}
```

---

### 3. Obtener Pago de Compra por ID

Obtiene un pago de compra específico con toda su información relacionada.

**Endpoint:** `GET /api/v1/procurement/purchase-payment/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del pago de compra

#### Response (200 OK)

```json
{
  "message": "Pago de compra obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "paymentMethodId": 2,
    "amount": 600.00,
    "currency": "USD",
    "exchangeRateId": 1,
    "reference": "TRF-123456",
    "paymentDate": "2024-01-15T10:30:00.000Z",
    "paymentMethod": {
      "id": 2,
      "name": "Transferencia Bancaria",
      "type": "BANK_TRANSFER"
    },
    "exchangeRate": {
      "id": 1,
      "rate": 36.50,
      "currency": "USD",
      "createdAt": "2024-01-15T00:00:00.000Z"
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459",
      "date": "2024-01-15T10:30:00.000Z",
      "supplier": {
        "id": 1,
        "nameCompany": "Distribuidora ABC S.A."
      }
    }
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Pago de compra no encontrado",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Pago de Compra

Actualiza los datos de un pago de compra existente.

**Endpoint:** `PATCH /api/v1/procurement/purchase-payment/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del pago de compra

#### Request Body (todos los campos son opcionales)

```json
{
  "amount": 650.00,
  "currency": "USD",
  "reference": "TRF-123456-UPDATED"
}
```

#### Validaciones

- `purchaseId`: Opcional, number, debe existir la compra y pertenecer al negocio
- `paymentMethodId`: Opcional, number, debe existir el método de pago y estar activo (si se proporciona)
- `amount`: Opcional, number, debe ser > 0 (si se proporciona)
- `currency`: Opcional, enum (`USD`, `VES`) (si se proporciona)
- `exchangeRateId`: Opcional, number, debe existir la tasa de cambio (si se proporciona)
- `reference`: Opcional, string, referencia bancaria o de pago (máximo 200 caracteres)

#### Response (200 OK)

```json
{
  "message": "Pago de compra actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "paymentMethodId": 2,
    "amount": 650.00,
    "currency": "USD",
    "exchangeRateId": 1,
    "reference": "TRF-123456-UPDATED",
    "paymentDate": "2024-01-15T10:30:00.000Z",
    "paymentMethod": {
      "id": 2,
      "name": "Transferencia Bancaria",
      "type": "BANK_TRANSFER"
    },
    "exchangeRate": {
      "id": 1,
      "rate": 36.50,
      "currency": "USD",
      "createdAt": "2024-01-15T00:00:00.000Z"
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459"
    }
  }
}
```

#### Errores

- `404`: Pago de compra no encontrado o no pertenece a este negocio
- `404`: El método de pago no existe
- `400`: El método de pago está inactivo
- `404`: La tasa de cambio no existe
- `400`: La moneda debe ser USD o VES
- `400`: El monto debe ser mayor a cero

---

### 5. Eliminar Pago de Compra

Elimina un pago de compra. Esta operación es permanente.

**Endpoint:** `DELETE /api/v1/procurement/purchase-payment/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del pago de compra

#### Response (200 OK)

```json
{
  "message": "Pago de compra eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Response (404 Not Found)

```json
{
  "message": "Pago de compra no encontrado o no pertenece a este negocio",
  "status": 404,
  "data": null
}
```

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar pagos de sus propias compras
- Validación de pertenencia: la compra debe pertenecer al negocio
- Validación de estado: el método de pago y la tasa de cambio deben estar activos

## 📝 Notas

- **Múltiples Pagos:** 
  - Una compra puede tener múltiples pagos con diferentes métodos y monedas
  - Cada pago se registra independientemente
- **Monedas:** 
  - Se soportan dos monedas: `USD` y `VES`
  - La tasa de cambio se usa para conversiones y registros históricos
- **Referencia:** 
  - Campo opcional para almacenar números de referencia bancaria, transferencias, etc.
  - Si no se proporciona, se guarda como "N/A"
- **Método de Pago:** 
  - Debe estar activo para poder ser usado
  - Los métodos de pago son globales (no multi-tenant)
- **Tasa de Cambio:** 
  - Debe estar activa para poder ser usada
  - Se usa para registrar el valor de conversión al momento del pago
- **Eliminación:** 
  - La eliminación es permanente
  - Se recomienda verificar que el pago no esté siendo usado en otros procesos antes de eliminarlo
- **Nota:** El endpoint DELETE está comentado en las rutas por seguridad. Descomentar si se requiere esta funcionalidad.
