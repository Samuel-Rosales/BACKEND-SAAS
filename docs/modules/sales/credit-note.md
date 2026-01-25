# Módulo Sales - Notas de Crédito

## ✅ Endpoints actuales (v2026-01-25)

Base URL: `/api/v1/sales/credit-note`

**Autenticación:** ✅ Requerida (Bearer Token)
**Header Multi-tenant:** 🟢 Requerido (`x-business-id`)

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
- Ajusta deuda del cliente y/o devuelve efectivo según corresponda.

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

#### Response (201)

```json
{
  "message": "Nota de crédito procesada exitosamente",
  "data": {
    "creditNote": {
      "id": 1,
      "saleId": 88,
      "number": 1,
      "totalAmount": "25.00"
    },
    "financialAction": {
      "action": "REFUND_CASH",
      "totalRefunded": "25.00",
      "appliedToDebt": "0.00",
      "cashToReturn": "25.00",
      "message": "⚠️ ENTREGAR EFECTIVO: $25.00"
    }
  }
}
```

---

### 2. Listar Notas de Crédito

**Endpoint:** `GET /api/v1/sales/credit-note`

#### Query Params

- `page`: number (def: 1)
- `limit`: number (def: 20)
- `fromDate`: ISO date
- `toDate`: ISO date
- `clientId`: number
- `saleId`: number
- `search`: string (busca por `reason` o por `number`)

#### Response (200)

```json
{
  "message": "Notas de crédito obtenidas exitosamente",
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
    "lastPage": 1,
    "limit": 20
  }
}
```
