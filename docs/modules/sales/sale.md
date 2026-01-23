# Módulo Sales - Ventas

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/sales/sale`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear venta
- `GET /` — Listar ventas (query: `page`, `limit`, `startDate`, `endDate`, `status`)
- `GET /credit` — Listar ventas a crédito
- `GET /:id` — Obtener venta
- `GET /:id/sale-payment` — Obtener historial de pagos
- `PATCH /:id` — Actualizar venta
- `POST /:id/sale-payment` — Agregar pago

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/sales/sale`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Venta

Registra una nueva venta de productos. Este endpoint realiza múltiples operaciones en una transacción:
- Crea la cabecera de venta con número de recibo consecutivo
- Registra los items de venta
- Registra los pagos realizados
- Actualiza el inventario (reduce stock usando FIFO/FEFO)
- Registra movimientos de stock tipo `OUT`
- Crea trazabilidad de lotes (`SaleItemLot`)

**Endpoint:** `POST /api/v1/sales/sale`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "clientId": 1,
  "memberId": 5,
  "exchangeRateId": 1,
  "conditions": "CASH",
  "type": "RETAIL",
  "subTotal": 1000.00,
  "taxAmount": 160.00,
  "discount": 50.00,
  "totalAmount": 1110.00,
  "paymentDueDate": null,
  "items": [
    {
      "productId": 1,
      "productPresentationId": 2,
      "quantity": 10,
      "unitPrice": 100.00,
      "subTotal": 1000.00
    }
  ],
  "payments": [
    {
      "paymentMethodId": 1,
      "exchangeRateId": 1,
      "amount": 1110.00,
      "currency": "USD",
      "reference": "EFECTIVO-001"
    }
  ]
}
```

#### Validaciones

**Cabecera:**
- `clientId`: Obligatorio, number, debe existir el cliente y pertenecer al negocio
- `memberId`: Opcional, number, ID del vendedor (si no se envía, se usa el usuario autenticado)
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio y estar activa
- `conditions`: Obligatorio, enum (`CASH`, `CREDIT`)
- `type`: Opcional, enum (`RETAIL`, `WHOLESALE`), default: `RETAIL`
- `subTotal`: Obligatorio, number, debe ser >= 0
- `taxAmount`: Obligatorio, number, debe ser >= 0
- `discount`: Opcional, number, debe ser >= 0
- `totalAmount`: Obligatorio, number, debe ser >= 0 (debe ser igual a subTotal + taxAmount - discount)
- `paymentDueDate`: Opcional, string (YYYY-MM-DD), **obligatorio si conditions es `CREDIT`**

**Items:**
- `productId`: Obligatorio, number, debe existir el producto, estar activo y pertenecer al negocio
- `productPresentationId`: Opcional, number, debe existir la presentación si se proporciona
- `quantity`: Obligatorio, number, debe ser > 0
- `unitPrice`: Obligatorio, number, debe ser >= 0
- `subTotal`: Obligatorio, number, debe ser igual a quantity × unitPrice (con tolerancia de 0.05)

**Pagos:**
- `paymentMethodId`: Obligatorio, number, debe existir el método de pago y estar activo
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio
- `amount`: Obligatorio, number, debe ser > 0
- `currency`: Obligatorio, enum (`USD`, `VES`)
- `reference`: Opcional, string, referencia bancaria o de pago

**Validaciones Adicionales:**
- La suma de `items.subTotal` debe coincidir con `subTotal` (con tolerancia de 0.05)
- El `totalAmount` debe ser igual a `subTotal + taxAmount - discount` (con tolerancia de 0.05)
- Para productos físicos (no servicios), se valida que haya stock suficiente
- Los productos marcados como `isService: true` no requieren validación de stock
- Si `conditions` es `CREDIT`, debe proporcionarse `paymentDueDate`

#### Response (201 Created)

```json
{
  "message": "Venta registrada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "receiptNumber": 1,
    "memberId": 5,
    "clientId": 1,
    "exchangeRateId": 1,
    "type": "RETAIL",
    "status": "COMPLETED",
    "subTotal": 1000.00,
    "taxAmount": 160.00,
    "discount": 50.00,
    "totalAmount": 1110.00,
    "remainingBalance": 0,
    "paymentDueDate": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "client": {
      "name": "Juan Pérez",
      "ci": "V-12345678"
    },
    "member": {
      "user": {
        "name": "Carlos Vendedor"
      }
    },
    "exchangeRate": {
      "id": 1,
      "rate": 36.50,
      "currency": "USD"
    },
    "items": [
      {
        "id": 1,
        "saleId": 1,
        "productId": 1,
        "productPresentationId": 2,
        "quantity": 10,
        "unitPrice": 100.00,
        "subTotal": 1000.00,
        "product": {
          "id": 1,
          "name": "Producto A",
          "sku": "PROD-A-001",
          "imageUrl": "https://example.com/image.jpg"
        },
        "productPresentation": {
          "id": 2,
          "name": "Caja x12",
          "factor": 12
        }
      }
    ],
    "payments": [
      {
        "id": 1,
        "saleId": 1,
        "paymentMethodId": 1,
        "amount": 1110.00,
        "currency": "USD",
        "reference": "EFECTIVO-001",
        "paymentMethod": {
          "name": "Efectivo",
          "type": "CASH"
        },
        "exchangeRate": {
          "rate": 36.50,
          "currency": "USD"
        }
      }
    ]
  }
}
```

#### Errores

- `404`: La tasa de cambio no existe o está inactiva
- `404`: El cliente no existe o no pertenece a este negocio
- `404`: El vendedor no existe o no pertenece a este negocio
- `404`: Uno o más productos no existen, están inactivos o no pertenecen al negocio
- `404`: Uno o más métodos de pago no existen o están inactivos
- `400`: Error matemático: La suma de items no coincide con el SubTotal
- `400`: Error matemático: El total no coincide con subTotal + taxAmount - discount
- `400`: Stock insuficiente para uno o más productos
- `400`: Si conditions es CREDIT, paymentDueDate es obligatorio

---

### 2. Listar Ventas

Obtiene todas las ventas del negocio con paginación y filtros opcionales.

**Endpoint:** `GET /api/v1/sales/sale`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Query Parameters

- `page`: Opcional, number, número de página (default: 1)
- `limit`: Opcional, number, cantidad de resultados por página (default: 20, máximo: 100)
- `fromDate`: Opcional, string (YYYY-MM-DD), fecha inicial del rango
- `toDate`: Opcional, string (YYYY-MM-DD), fecha final del rango
- `clientId`: Opcional, number, filtrar por ID de cliente
- `status`: Opcional, enum (`PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED`), filtrar por estado

**Nota:** Si se proporcionan `fromDate` y `toDate`, se filtran las ventas por ese rango.

#### Response (200 OK)

```json
{
  "message": "Ventas obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "receiptNumber": 1,
      "clientId": 1,
      "type": "RETAIL",
      "status": "COMPLETED",
      "totalAmount": 1110.00,
      "remainingBalance": 0,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "client": {
        "name": "Juan Pérez",
        "ci": "V-12345678"
      },
      "member": {
        "user": {
          "name": "Carlos Vendedor"
        }
      },
      "exchangeRate": {
        "rate": 36.50,
        "currency": "USD"
      },
      "_count": {
        "items": 1,
        "payments": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3. Obtener Venta por ID

Obtiene una venta específica con todos sus items, pagos y trazabilidad de lotes.

**Endpoint:** `GET /api/v1/sales/sale/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID de la venta

#### Response (200 OK)

```json
{
  "message": "Venta obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "receiptNumber": 1,
    "memberId": 5,
    "clientId": 1,
    "exchangeRateId": 1,
    "type": "RETAIL",
    "status": "COMPLETED",
    "subTotal": 1000.00,
    "taxAmount": 160.00,
    "discount": 50.00,
    "totalAmount": 1110.00,
    "remainingBalance": 0,
    "paymentDueDate": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "client": {
      "id": 1,
      "name": "Juan Pérez",
      "ci": "V-12345678",
      "phone": "+58 212 1234567",
      "email": "juan.perez@example.com"
    },
    "member": {
      "id": 5,
      "user": {
        "name": "Carlos Vendedor",
        "ci": "V-11111111"
      }
    },
    "exchangeRate": {
      "id": 1,
      "rate": 36.50,
      "currency": "USD",
      "createdAt": "2024-01-15T00:00:00.000Z"
    },
    "items": [
      {
        "id": 1,
        "saleId": 1,
        "productId": 1,
        "productPresentationId": 2,
        "quantity": 10,
        "unitPrice": 100.00,
        "subTotal": 1000.00,
        "product": {
          "id": 1,
          "name": "Producto A",
          "sku": "PROD-A-001",
          "imageUrl": "https://example.com/image.jpg"
        },
        "productPresentation": {
          "id": 2,
          "name": "Caja x12",
          "factor": 12
        },
        "lotAllocations": [
          {
            "id": 1,
            "saleItemId": 1,
            "stockLotId": 5,
            "quantity": 10,
            "stockLot": {
              "id": 5,
              "expirationDate": "2024-12-31T00:00:00.000Z",
              "lotCost": 80.00
            }
          }
        ]
      }
    ],
    "payments": [
      {
        "id": 1,
        "saleId": 1,
        "paymentMethodId": 1,
        "amount": 1110.00,
        "currency": "USD",
        "reference": "EFECTIVO-001",
        "date": "2024-01-15T10:30:00.000Z",
        "paymentMethod": {
          "name": "Efectivo",
          "type": "CASH"
        },
        "exchangeRate": {
          "rate": 36.50,
          "currency": "USD"
        }
      }
    ]
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Venta no encontrada",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Venta

Actualiza el estado y saldo pendiente de una venta existente. Solo se pueden actualizar campos específicos.

**Endpoint:** `PATCH /api/v1/sales/sale/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID de la venta

#### Request Body (todos los campos son opcionales)

```json
{
  "status": "CANCELLED",
  "remainingBalance": 500.00,
  "paymentDueDate": "2024-02-15"
}
```

#### Validaciones

- `status`: Opcional, enum (`PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED`)
- `remainingBalance`: Opcional, number, debe ser >= 0
- `paymentDueDate`: Opcional, string (YYYY-MM-DD), fecha de vencimiento

#### Response (200 OK)

```json
{
  "message": "Venta actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "receiptNumber": 1,
    "status": "CANCELLED",
    "remainingBalance": 500.00,
    "paymentDueDate": "2024-02-15T00:00:00.000Z",
    "client": {
      "name": "Juan Pérez"
    },
    "member": {
      "user": {
        "name": "Carlos Vendedor"
      }
    }
  }
}
```

#### Errores

- `404`: Venta no encontrada o no pertenece a este negocio
- `400`: El saldo pendiente no puede ser negativo

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias ventas
- Validación matemática de totales en el backend
- Transacciones atómicas: si falla algo, se revierte todo
- Validación de stock antes de procesar la venta

## 📝 Notas

- **Número de Recibo:** Se genera automáticamente de forma consecutiva por negocio (`receiptNumber`)
- **Actualización de Inventario:** Al crear una venta, automáticamente:
  - Se reduce el stock usando FIFO/FEFO (lotes más antiguos primero)
  - Se crean registros `SaleItemLot` para trazabilidad exacta
  - Se registran movimientos de stock tipo `OUT` con costo histórico del lote
- **Productos Servicio:** Los productos marcados como `isService: true` no requieren validación ni reducción de stock
- **Ventas a Crédito:** 
  - Si `conditions` es `CREDIT`, se calcula `remainingBalance` automáticamente (totalAmount - suma de pagos)
  - Se requiere `paymentDueDate` para ventas a crédito
  - El `remainingBalance` se puede actualizar cuando se registren pagos adicionales
- **Presentaciones:** El campo `productPresentationId` es opcional. Si no se proporciona, se usa la unidad base del producto
- **Múltiples Pagos:** Se pueden registrar múltiples pagos con diferentes métodos y monedas
- **Estado:** Las ventas se crean con estado `COMPLETED` automáticamente
- **Trazabilidad:** Cada item de venta mantiene relación con los lotes específicos de los que se extrajo el stock (`lotAllocations`)
