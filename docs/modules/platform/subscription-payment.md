# Módulo Platform - Pagos de Suscripción (Subscription Payment)

Este módulo registra los pagos de suscripción de un negocio (ledger) y permite que un administrador los revise.

## ✅ Concepto

- `Subscription` representa el **acceso vigente** del negocio (plan/fechas/estado).
- `SubscriptionPayment` representa un **intento de pago** (con referencia y comprobante) que luego se revisa.
- Solo un pago en estado `APPROVED` **extiende** la fecha `Subscription.endDate`.

## 🔐 Autenticación y multi-tenant

- Requiere **JWT**: `Authorization: Bearer <token>`
- Requiere contexto multi-tenant: `x-business-id: <businessId>`
- Endpoints admin requieren `isSuperAdmin` (middleware `requireSuperAdmin`).

---

## 1) Endpoints del Negocio

Base URL: `/api/v1/platform/subscription-payment`

### 1.1 Crear pago (queda en revisión)

**Endpoint:** `POST /api/v1/platform/subscription-payment`

**Headers requeridos:**
- `Authorization: Bearer <token>`
- `x-business-id: <businessId>`

#### Request Body

```json
{
  "planType": "PREMIUM",
  "monthsPurchased": 1,
  "amount": 30,
  "currency": "USD",
  "reference": "TRX-123456",
  "proofUrl": "https://.../comprobante.png",
  "reviewNote": "Pago vía transferencia"
}
```

#### Validaciones

- `planType`: obligatorio (`TRIAL`, `BASIC`, `PREMIUM`, `ENTERPRISE`)
- `monthsPurchased`: obligatorio (int, 1..12)
- `amount`: obligatorio (number > 0)
- `currency`: obligatorio (`USD`, `VES`, `EUR`)
- `reference`: obligatorio (string 3..80). Debe ser **única por negocio**.
- `proofUrl`: opcional (URL)
- `reviewNote`: opcional (max 500)

#### Comportamiento

- Crea un `SubscriptionPayment` en `UNDER_REVIEW`.
- El pago se asocia al `businessId`, a la `Subscription` del negocio, y al usuario que lo creó (`createdById`).

#### Respuestas comunes

- `201`: creado
- `404`: el negocio no tiene suscripción registrada
- `409`: ya existe un pago con esa referencia para el negocio

---

### 1.2 Listar mis pagos (del negocio actual)

**Endpoint:** `GET /api/v1/platform/subscription-payment/my`

**Headers requeridos:**
- `Authorization: Bearer <token>`
- `x-business-id: <businessId>`

---

### 1.3 Ver detalle de un pago

**Endpoint:** `GET /api/v1/platform/subscription-payment/my/:id`

**Headers requeridos:**
- `Authorization: Bearer <token>`
- `x-business-id: <businessId>`

---

## 2) Endpoints Admin (Revisión)

Base URL: `/api/v1/admin`

### 2.1 Listar pagos de suscripción

**Endpoint:** `GET /api/v1/admin/subscription-payments`

**Query params (opcionales):**
- `status`: `UNDER_REVIEW | APPROVED | REJECTED`
- `page`: number
- `limit`: number

**Notas:**
- Si `status` no es válido, se ignora el filtro.

---

### 2.2 Revisar pago (aprobar / rechazar)

**Endpoint:** `PATCH /api/v1/admin/subscription-payments/:id/review`

#### Request Body

```json
{ 
  "status": "APPROVED",
  "note": "Pago verificado en banco"
}
```

#### Reglas

- Solo se puede revisar si el pago está en `UNDER_REVIEW`.
- Si se aprueba (`APPROVED`):
  - Se extiende `Subscription.endDate` por `monthsPurchased` desde `max(endDate, now)`.
  - Se actualiza `Subscription.planType` al `planType` del pago.
  - Se setea `Subscription.lastPaymentRef` con la `reference`.
- Si se rechaza (`REJECTED`):
  - No se modifica la suscripción.

#### Respuestas comunes

- `200`: aprobado o rechazado
- `404`: pago no encontrado
- `409`: el pago ya fue revisado
- `400`: status inválido
