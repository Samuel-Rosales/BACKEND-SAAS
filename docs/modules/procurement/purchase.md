# Módulo Procurement - Compras

## 📍 Endpoints

Base URL: `/api/v1/procurement/purchase`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Compra

Registra una nueva compra de productos. Este endpoint realiza múltiples operaciones en una transacción:
- Crea la cabecera de compra
- Registra los items de compra
- Registra los pagos realizados
- Actualiza el inventario (crea/actualiza lotes)
- Registra movimientos de stock

**Endpoint:** `POST /api/v1/procurement/purchase`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "supplierId": 1,
  "exchangeRateId": 1,
  "reference": "A-00459",
  "observation": "Compra mensual de productos",
  "subTotal": 1000.00,
  "taxAmount": 160.00,
  "totalCost": 1160.00,
  "items": [
    {
      "productId": 1,
      "depotId": 1,
      "quantity": 50,
      "unitCost": 20.00,
      "expirationDate": "2024-12-31"
    },
    {
      "productId": 2,
      "depotId": 1,
      "quantity": 30,
      "unitCost": 15.00
    }
  ],
  "payments": [
    {
      "paymentMethodId": 1,
      "exchangeRateId": 1,
      "amount": 600.00,
      "currency": "USD",
      "reference": "TRF-123456"
    },
    {
      "paymentMethodId": 2,
      "exchangeRateId": 1,
      "amount": 560.00,
      "currency": "VES",
      "reference": "ZELLE-789012"
    }
  ]
}
```

#### Validaciones

**Cabecera:**
- `supplierId`: Obligatorio, number, debe existir el proveedor y estar activo
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio
- `subTotal`: Obligatorio, number, debe ser >= 0
- `taxAmount`: Obligatorio, number, debe ser >= 0
- `totalCost`: Obligatorio, number, debe ser >= 0 (debe ser igual a subTotal + taxAmount)
- `reference`: Opcional, string, número de factura del proveedor
- `observation`: Obligatorio, string, notas adicionales

**Items:**
- `productId`: Obligatorio, number, debe existir el producto
- `depotId`: Obligatorio, number, debe existir el depósito
- `quantity`: Obligatorio, number, debe ser > 0
- `unitCost`: Obligatorio, number, debe ser >= 0
- `expirationDate`: Opcional, string (YYYY-MM-DD), obligatorio si el producto es perecedero

**Pagos:**
- `paymentMethodId`: Obligatorio, number, debe existir el método de pago
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio
- `amount`: Obligatorio, number, debe ser > 0
- `currency`: Obligatorio, enum (`USD`, `VES`)
- `reference`: Opcional, string, referencia bancaria o de pago

**Validaciones Adicionales:**
- La suma de `items.quantity * items.unitCost` debe coincidir con `subTotal` (con tolerancia de 0.05)
- Los productos perecederos deben incluir `expirationDate`
- Todos los productos y depósitos deben pertenecer al negocio

#### Response (201 Created)

```json
{
  "message": "Compra registrada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "supplierId": 1,
    "exchangeRateId": 1,
    "subTotal": 1000.00,
    "taxAmount": 160.00,
    "totalCost": 1160.00,
    "status": "COMPLETED",
    "reference": "A-00459",
    "observation": "Compra mensual de productos",
    "date": "2024-01-15T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "purchaseId": 1,
        "productId": 1,
        "depotId": 1,
        "quantity": 50,
        "unitCost": 20.00,
        "expirationDate": "2024-12-31T00:00:00.000Z",
        "product": {
          "id": 1,
          "name": "Producto A",
          "sku": "PROD-A-001"
        }
      }
    ],
    "payments": [
      {
        "id": 1,
        "purchaseId": 1,
        "paymentMethodId": 1,
        "amount": 600.00,
        "currency": "USD",
        "reference": "TRF-123456"
      }
    ]
  }
}
```

#### Errores

- `404`: La tasa de cambio no existe
- `404`: El proveedor no existe o está inactivo
- `404`: Uno o más productos no existen
- `404`: Uno o más almacenes no existen
- `404`: Uno o más métodos de pago no existen
- `400`: Error matemático: La suma de items no coincide con el SubTotal
- `400`: El producto es perecedero y requiere fecha de vencimiento

---

### 2. Listar Compras

Obtiene todas las compras del negocio con paginación y filtros opcionales por fecha.

**Endpoint:** `GET /api/v1/procurement/purchase`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Query Parameters

- `page`: Opcional, number, número de página (default: 1)
- `limit`: Opcional, number, cantidad de resultados por página (default: 20)
- `fromDate`: Opcional, string (YYYY-MM-DD), fecha inicial del rango
- `toDate`: Opcional, string (YYYY-MM-DD), fecha final del rango

**Nota:** Si se proporcionan `fromDate` y `toDate`, se filtran las compras por ese rango.

#### Response (200 OK)

```json
{
  "message": "Compras obtenidas exitosamente",
  "status": 200,
  "data": {
    "purchases": [
      {
        "id": 1,
        "businessId": 1,
        "supplierId": 1,
        "subTotal": 1000.00,
        "taxAmount": 160.00,
        "totalCost": 1160.00,
        "status": "COMPLETED",
        "reference": "A-00459",
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 3. Obtener Compra por ID

Obtiene una compra específica con todos sus items y pagos.

**Endpoint:** `GET /api/v1/procurement/purchase/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID de la compra

#### Response (200 OK)

```json
{
  "message": "Compra obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "memberId": 5,
    "supplierId": 1,
    "exchangeRateId": 1,
    "subTotal": 1000.00,
    "taxAmount": 160.00,
    "totalCost": 1160.00,
    "status": "COMPLETED",
    "reference": "A-00459",
    "observation": "Compra mensual de productos",
    "date": "2024-01-15T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "purchaseId": 1,
        "productId": 1,
        "depotId": 1,
        "quantity": 50,
        "unitCost": 20.00,
        "expirationDate": "2024-12-31T00:00:00.000Z",
        "product": {
          "id": 1,
          "name": "Producto A",
          "sku": "PROD-A-001"
        }
      }
    ],
    "payments": [
      {
        "id": 1,
        "purchaseId": 1,
        "paymentMethodId": 1,
        "amount": 600.00,
        "currency": "USD",
        "reference": "TRF-123456"
      }
    ],
    "supplier": {
      "id": 1,
      "nameCompany": "Distribuidora ABC S.A."
    }
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Compra no encontrada",
  "status": 404,
  "data": null
}
```

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias compras
- Validación matemática del subtotal en el backend
- Transacciones atómicas: si falla algo, se revierte todo

## 📝 Notas

- **Actualización de Inventario:** Al crear una compra, automáticamente:
  - Se crean o actualizan lotes de stock (FIFO)
  - Se registran movimientos de stock tipo `IN`
  - Se actualiza el stock general por depósito
- **Productos Perecederos:** Si un producto tiene `isPerishable: true`, debe incluirse `expirationDate` en el item
- **Múltiples Depósitos:** Cada item puede ir a un depósito diferente
- **Pagos Múltiples:** Se pueden registrar múltiples pagos con diferentes métodos y monedas
- **Estado:** Las compras se crean con estado `COMPLETED` automáticamente
- **Referencia:** El campo `reference` es opcional y puede contener el número de factura del proveedor
