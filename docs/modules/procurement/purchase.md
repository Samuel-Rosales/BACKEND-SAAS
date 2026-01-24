# Módulo Procurement - Compras (v2)

## ✅ Resumen de Endpoints

Base URL: `/api/v1/procurement/purchase`

**Autenticación:** ✅ Requerida (Bearer Token)
**Header Multi-tenant:** 🟢 Requerido (`x-business-id`)

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/` | **Registrar Compra** (Contado o Crédito con Cuotas) |
| `GET` | `/` | **Listar Compras** (Histórico general) |
| `GET` | `/:id` | **Obtener Compra** (Detalle operativo) |
| `POST` | `/:id/purchase-payment` | **Abonar a Deuda** (Registrar pago a proveedor) |
| `GET` | `/payables` | **Cuentas por Pagar** (Listado de deudas pendientes) |
| `GET` | `/:id/purchase-payment/details` | **Detalle Financiero** (Historial de pagos y estado de cuotas) |

---

## 📍 Detalle de Endpoints

### 1. Crear Compra

Registra una nueva compra. Es una **Transacción Atómica** que realiza:

1. Registro de la cabecera (Deuda y Condiciones).
2. Ingreso de Stock (Gestión de Lotes y Costos Promedio).
3. Actualización de Costos en Cascada (Insumos -> Recetas).
4. Registro de Pagos Iniciales (Si hubo abono).
5. Creación de Plan de Cuotas (Si es Crédito).

**Endpoint:** `POST /api/v1/procurement/purchase`

#### Request Body

**Caso: Compra a Crédito con Cuotas**

```json
{
  "supplierId": 1,
  "exchangeRateId": 45,
  "reference": "FACT-00492",
  "observation": "Reposición de inventario semanal",
  
  // Montos (Validación matemática estricta en backend)
  "subTotal": 1000.00,
  "taxAmount": 160.00,
  "totalCost": 1160.00,

  // --- NUEVO: Condiciones de Pago ---
  "condition": "CREDIT", // "CASH" | "CREDIT"
  
  // Opcional: Solo si es CREDIT. La suma debe dar 1160.00 - (Pagos Iniciales)
  "installments": [
    { "number": 1, "amount": 580.00, "dueDate": "2026-02-01" },
    { "number": 2, "amount": 580.00, "dueDate": "2026-02-15" }
  ],

  "items": [
    {
      "productId": 10, // Debe ser tipo SIMPLE (No recetas)
      "depotId": 1,
      "productPresentationId": 2, // Opcional (ej: Caja x12)
      "quantity": 5, // 5 Cajas
      "unitCost": 24.00, // Costo de la Caja (Backend calcula unitario)
      "expirationDate": "2026-12-31"
    }
  ],

  // Opcional: Si das un abono inicial (ej: $0 si es crédito puro)
  "payments": [] 
}

```

#### Validaciones Clave

* **Productos Compuestos:** ❌ No se pueden comprar productos tipo `COMPOSITE` (Recetas). Debes comprar sus ingredientes.
* **Matemática:** `subTotal + taxAmount === totalCost`.
* **Cuotas:** Si es `CREDIT`, la suma de `installments` debe ser igual al `totalCost` menos lo que hayas pagado en `payments`.
* **Costo:** Si envías `productPresentationId`, el sistema dividirá el costo automáticamente para valorar el inventario unitario.

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Compra registrada exitosamente",
  "data": {
    "id": 105,
    "status": "COMPLETED",
    "paymentStatus": "PENDING", // PENDING, PARTIAL, PAID
    "remainingBalance": "1160.00",
    "paymentDueDate": "2026-02-15T00:00:00.000Z"
    // ... resto de la data
  }
}

```

---

### 2. Listar Compras (Histórico)

Listado general paginado.

**Endpoint:** `GET /api/v1/procurement/purchase`

#### Query Params

* `page`: number (def: 1)
* `limit`: number (def: 20)
* `fromDate`: string (YYYY-MM-DD)
* `toDate`: string (YYYY-MM-DD)

---

### 3. Obtener Compra por ID

Devuelve la "Foto" de la compra tal cual se registró (Items, Precios de ese momento, Depósitos destino).

**Endpoint:** `GET /api/v1/procurement/purchase/:id`

---

### 4. Cuentas por Pagar (Find Payables) 🆕

Lista todas las facturas de proveedores que tienen saldo pendiente (`remainingBalance > 0`). Ideal para la pantalla de "Cuentas por Pagar".

**Endpoint:** `GET /api/v1/procurement/purchase/payables`

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Cuentas por pagar obtenidas exitosamente",
  "data": [
    {
      "id": 105,
      "invoiceNumber": "FACT-00492",
      "supplierName": "Distribuidora Polar",
      "contact": "Juan Perez",
      "totalDebt": 1160,
      "pendingDebt": 580,
      "paidAmount": 580,
      "dueDate": "2026-02-15T00:00:00.000Z",
      "status": "PARTIAL",
      "daysUntilDue": 12 // Días faltantes (o negativos si está vencida)
    }
  ]
}

```

---

### 5. Abonar a Deuda (Add Payment) 🆕

Registra un pago a una compra existente. Utiliza lógica de **Cascada (Waterfall)**: el pago cubre primero las cuotas más antiguas.

**Endpoint:** `POST /api/v1/procurement/purchase/:id/purchase-payment`

#### Request Body

```json
{
  "paymentMethodId": 1, // Ej: Zelle, Efectivo, Pago Móvil
  "exchangeRateId": 50, // ID de la tasa DEL DÍA DEL PAGO
  "amount": 100.00,     // Monto NOMINAL (ej: 100 Bs o 100 USD)
  "reference": "REF-998877"
}

```

> **Nota:** El `amount` es lo que el usuario escribe. El backend usa `exchangeRateId` y la moneda del método para convertirlo a Dólares y descontarlo de la deuda.

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Abono a proveedor registrado",
  "data": {
    "newBalance": 480.00,
    "status": "PARTIAL", // PARTIAL o PAID
    "payment": { "id": 55, "amount": 100, ... }
  }
}

```

---

### 6. Detalle Financiero (Payment Details) 🆕

Obtiene la radiografía financiera de una compra específica: qué se ha pagado y qué falta (incluyendo el estado de cada cuota individual).

**Endpoint:** `GET /api/v1/procurement/purchase/:id/purchase-payment/details`

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Detalle financiero obtenido",
  "data": {
    "header": {
      "supplier": "Distribuidora Polar",
      "invoice": "FACT-00492",
      "status": "PARTIAL",
      "isCredit": true
    },
    "summary": {
      "totalDebt": 1160,
      "pending": 580,
      "paid": 580
    },
    "installments": [ // El Plan de Pagos
      { "number": 1, "amount": 580, "dueDate": "...", "status": "PAID", "paidAt": "..." },
      { "number": 2, "amount": 580, "dueDate": "...", "status": "PENDING", "paidAt": null }
    ],
    "history": [ // Los Pagos Reales
      {
        "id": 55,
        "date": "2026-01-24...",
        "methodName": "Zelle",
        "amountOriginal": 580,
        "amountUSD": 580
      }
    ]
  }
}

```

---

## ⚠️ Enums Importantes (Frontend)

Para evitar errores `400 Bad Request`, usa estos valores exactos:

**Conditions:**

* `CASH`
* `CREDIT`

**PaymentStatus (Estados de la Deuda):**

* `PENDING` (No se ha pagado nada)
* `PARTIAL` (Se abonó algo)
* `PAID` (Deuda saldada)

**InstallmentStatus (Estados de la Cuota):**

* `PENDING`
* `PAID`
* `OVERDUE` (Calculado visualmente por fecha)