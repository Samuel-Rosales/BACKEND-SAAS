# Módulo Sales - Notas de Crédito

## ✅ Endpoints actuales (v2026-01-31)

Base URL: `/api/v1/sales/credit-note`

**Autenticación:** ✅ Requerida (Bearer Token)
**Header Multi-tenant:** 🟢 Requerido (`x-business-id`)

Notas:
- Si el `x-business-id` no se puede resolver a un negocio/membresía válida para el usuario, la API responde `400`.

**Endpoints:**
- `GET /` — Listar notas de crédito (paginado + filtros)
- `POST /` — Crear nota de crédito (devolución parcial con opción de re-stock)

---

## 📍 Endpoints

### 1. Crear Nota de Crédito

Crea una nota de crédito asociada a una venta existente.

- Valida que la venta exista y no esté anulada.
- No permite devolver más de lo vendido (considera devoluciones previas).
- Si `returnToStock=true`, restaura stock a los lotes originales y registra kardex.
- Ajusta deuda del cliente y/o procesa devolución al cliente según corresponda.
- Si corresponde devolver dinero al cliente, debes enviar `refundPayments` (desglose por método de pago). La API valida que el total (convertido a moneda base) coincida con el monto a devolver.

**Endpoint:** `POST /api/v1/sales/credit-note`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "saleId": 88,
  "reason": "Devolución por producto defectuoso",
  "items": [
    {
      "productId": 10,
      "quantity": 1,
      "returnToStock": false
    }
  ],
  "refundPayments": [
    {
      "paymentMethodId": 3,
      "amount": 25,
      "reference": "REF-123",
      "cashRegisterId": 2
    }
  ]
}
```

#### Validaciones

- `saleId`: obligatorio, int
- `reason`: obligatorio, string (3-255)
- `items`: obligatorio, array (min 1)
- `items[].productId`: obligatorio, int
- `items[].quantity`: obligatorio, float (> 0)
- `items[].returnToStock`: obligatorio, boolean

Campos opcionales (si hay devolución al cliente):
- `refundPayments`: array
- `refundPayments[].paymentMethodId`: int
- `refundPayments[].amount`: number
- `refundPayments[].reference`: string (opcional)
- `refundPayments[].cashRegisterId`: int (requerido si el método es tipo `CASH`)

Reglas de negocio relevantes:
- Si el producto es tipo `SERVICE`, nunca impacta inventario aunque `returnToStock=true`.
- Si `returnToStock=false`, no se restaura inventario físico (solo se procesa la devolución financiera/ajuste).
- Si la venta tiene deuda (`remainingBalance > 0`), la devolución se aplica primero a deuda (FIFO sobre cuotas) y solo el remanente se devuelve al cliente.

#### Response (201)

```json
{
  "message": "Nota de crédito procesada exitosamente",
  "data": {
    "creditNote": {
      "id": 1,
      "saleId": 88,
      "number": 1,
      "reason": "Devolución por producto defectuoso",
      "totalAmount": "25.00"
    },
    "financialAction": {
      "action": "REFUND",
      "totalRefunded": "25.00",
      "appliedToDebt": "0.00",
      "totalReturnedToCustomer": "25.00",
      "message": "Devolución procesada: $25.00 (Revise métodos de pago)"
    }
  }
}
```

---

### 2. Listar Notas de Crédito

**Endpoint:** `GET /api/v1/sales/credit-note`

#### Query Params

- `page`: number (def: 1)
- `limit`: number (def: 20, max: 100)
- `fromDate`: ISO date (aplica filtro solo si viene junto con `toDate`)
- `toDate`: ISO date (aplica filtro solo si viene junto con `fromDate`)
- `clientId`: number
- `saleId`: number
- `search`: string (busca por `reason` o por `number`)

#### Response (200)

```json
{
  "message": "Listado obtenido correctamente",
  "data": {
    "data": [
      {
        "id": 1,
        "number": 1,
        "reason": "Devolución...",
        "totalAmount": "25.00",
        "sale": {
          "id": 88,
          "receiptNumber": 1045,
          "client": { "id": 45, "name": "Farmacia Saas", "ci": "12345678" }
        },
        "_count": { "items": 1 }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```
