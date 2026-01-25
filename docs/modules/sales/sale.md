# Módulo Sales - Ventas (POS & B2B)

## ✅ Resumen de Endpoints (v2026-01-25)

**Base URL:** `/api/v1/sales/sale`

**Autenticación:** ✅ Requerida (Bearer Token)

**Header Multi-tenant:** 🟢 Requerido (`x-business-id`)

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/` | Registrar Venta (facturación, descargo de stock y pagos) |
| `GET` | `/` | Listar Ventas (histórico con filtros + paginado) |
| `GET` | `/credit` | Cuentas por Cobrar (ventas con saldo pendiente) |
| `GET` | `/:id` | Obtener Venta (detalle completo) |
| `GET` | `/:id/sale-payment` | Historial de Pagos (detalle financiero) |
| `POST` | `/:id/sale-payment` | Registrar Pago (abono) |
| `PATCH` | `/:id` | Actualizar Venta (status/saldo/fecha venc.) |

---

## 📍 Detalle de Endpoints

### 1. Registrar Venta (Create Sale)

Es el corazón del sistema. Ejecuta una **Transacción Atómica** compleja:

1. **Validación Preventiva:** Verifica stock disponible (incluyendo recetas recursivas) antes de crear la factura.
2. **Anti-Sorpresas:** Valida que la tasa de cambio (`exchangeRateId`) no haya variado.
3. **Inventario:** Descuenta stock FIFO y genera trazabilidad (Lotes -> SaleItems).
4. **Finanzas:** Calcula impuestos, descuentos prorrateados y registra pagos iniciales.

**Endpoint:** `POST /api/v1/sales/sale`

#### Request Body

**Escenario: Venta Mixta (Contado + Crédito)**
*Vende 2 productos, paga una parte en Zelle (USD) y el resto queda a Crédito.*

```json
{
  "clientId": 45,
  "exchangeRateId": 102,
  "type": "RETAIL",
  "condition": "CREDIT",
  "depotId": 1,
  "paymentDueDate": "2026-02-28",

  "discount": 0,

  "items": [
    {
      "productId": 10,
      "quantity": 2,
      "productPresentationId": 5
    }
  ],

  "payments": [
    {
      "paymentMethodId": 2,
      "amount": 50.0,
      "reference": "REF-12345"
    }
  ],

  "installments": [
    { "number": 1, "amount": 50.0, "dueDate": "2026-02-10" },
    { "number": 2, "amount": 95.5, "dueDate": "2026-02-28" }
  ]
}
```

#### Validaciones Clave (Backend)

* **Stock:** Si envías `depotId`, se descuenta solo de ese almacén. Si no lo envías, puede resolver globalmente.
* **Tasa:** Si el `exchangeRateId` enviado es diferente a la tasa actual, devuelve `409 Conflict`.
* **Matemática:** El sistema usa `Decimal` (precisión bancaria).
* `CASH`: Si `pagos < total`, error 400.
* `CREDIT`: Requiere `installments` y la suma de cuotas debe cuadrar con la deuda.



#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Venta registrada exitosamente",
  "data": {
    "id": 88,
    "receiptNumber": 1045,
    "totalAmount": "195.50",
    "remainingBalance": "145.50", // Lo que quedó debiendo
    "paymentStatus": "PARTIAL",   // PENDING, PARTIAL, PAID
    "items": [...]
  }
}

```

---

### 2. Listar Ventas (Find All)

Listado general con filtros avanzados.

**Endpoint:** `GET /api/v1/sales/sale`

#### Query Params

* `page`: number (def: 1)
* `limit`: number (def: 20)
* `fromDate`: YYYY-MM-DD
* `toDate`: YYYY-MM-DD
* `clientId`: number
* `status`: `COMPLETED` | `CANCELLED`

---

### 3. Cuentas por Cobrar (Find Credits)

Endpoint optimizado para la gestión de cobranza. Devuelve solo las ventas que tienen saldo pendiente (`remainingBalance > 0`).

**Endpoint:** `GET /api/v1/sales/sale/credit`

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Créditos obtenidos exitosamente",
  "data": [
    {
      "id": 88,
      "saleId": 1045, // Nro Factura Visual
      "clientName": "Farmacia Saas",
      "totalAmount": 195.50,
      "paidAmount": 50.00,
      "remainingBalance": 145.50, // Lo que debe mostrarse en rojo
      "dueDate": "2026-02-28T00:00:00.000Z",
      "status": "PARTIAL"
    }
  ]
}

```

---

### 4. Registrar Pago / Abono (Add Payment)

Registra un abono a una venta existente. Usa lógica **Waterfall (Cascada)**: el pago cubre automáticamente las cuotas más antiguas primero.

**Endpoint:** `POST /api/v1/sales/sale/:id/sale-payment`

#### Request Body

**Escenario: Cliente paga en Bolívares (VES)**

```json
{
  "paymentMethodId": 3,  // Pago Móvil (Moneda: VES)
  "exchangeRateId": 103, // Tasa DEL DÍA del pago (ej: 50.00)
  "amount": 2500.00,     // Monto en Bolívares
  "reference": "PM-998877"
}

```

#### Lógica Interna

1. El backend detecta que el método es `VES`.
2. Convierte: `2500 VES / 50.00 Tasa = $50.00 USD`.
3. Verifica que `$50.00 <= Deuda Pendiente`.
4. Resta $50.00 del `remainingBalance`.
5. Busca las cuotas pendientes más viejas y las marca como `PAID` hasta agotar los $50.

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Abono registrado correctamente",
  "data": {
    "payment": { "id": 12, "amount": "2500", "reference": "PM-998877" },
    "newBalance": 95.50,    // Nuevo saldo en USD
    "status": "PARTIAL"
  }
}

```

---

### 5. Historial Financiero (Payment History)

Obtiene la radiografía completa de los pagos de una venta. Útil para auditoría o para mostrar al cliente "qué ha pagado".

**Endpoint:** `GET /api/v1/sales/sale/:id/sale-payment`

#### Response (200 OK)

**Nota:** `currency` se obtiene de `paymentMethod.currency` (no se guarda como columna en `SalePayment`).

```json
{
  "status": 200,
  "data": {
    "saleInfo": {
      "receiptNumber": 1045,
      "status": "PARTIAL"
    },
    "summary": {
      "totalDebt": 195.50,
      "totalPaid": 100.00,
      "currentDebt": 95.50
    },
    "history": [
      {
        "id": 12,
        "date": "2026-01-25...",
        "methodName": "Pago Móvil",
        "currency": "VES",
        "originalAmount": 2500,  // Lo que salió del banco del cliente
        "rateUsed": 50.00,       // Tasa usada ese día
        "usdEquivalent": 50.00   // Lo que realmente bajó la deuda
      },
      {
        "id": 5,
        "date": "2026-01-24...",
        "methodName": "Zelle",
        "currency": "USD",
        "originalAmount": 50,
        "rateUsed": 50.00,
        "usdEquivalent": 50.00
      }
    ]
  }
}

```

---

## ⚠️ Enums y Constantes

Para evitar errores `400 Bad Request`, el Frontend debe respetar estrictamente:

**SaleType:**

* `RETAIL` (PVP)
* `WHOLESALE` (Mayorista)

**Conditions (Condición de Pago):**

* `CASH` (Contado)
* `CREDIT` (Crédito)

**PaymentStatus (Estado de la Venta):**

* `PENDING` (No ha pagado nada - *Solo posible en Crédito*)
* `PARTIAL` (Abonó algo, debe algo)
* `PAID` (Deuda saldada, saldo <= 0.05)
* `REFUNDED` (Se devolvió el dinero)