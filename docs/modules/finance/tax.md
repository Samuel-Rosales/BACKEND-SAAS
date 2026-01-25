# Módulo Finance - Impuestos (Tax)

## ✅ Endpoints actuales (v2026-01-25)

Base URL: `/api/v1/finance/tax`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear impuesto
- `GET /` — Listar impuestos
- `GET /active` — Listar activos
- `GET /:id` — Obtener impuesto
- `PATCH /:id` — Actualizar impuesto
- `DELETE /:id` — Eliminar impuesto

**Nota:** Este módulo es **global** (no multi-tenant). No requiere `x-business-id`.

---

## 📍 Endpoints

### 1. Crear Impuesto

**Endpoint:** `POST /api/v1/finance/tax`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

**Importante:** `rate` se maneja como **porcentaje** (ej: `16` = 16%).

```json
{
  "name": "IVA General",
  "rate": 16,
  "code": "IVA",
  "isActive": true
}
```

#### Validaciones

- `name`: obligatorio, string (2-100), único por nombre
- `rate`: obligatorio, number (0-100)
- `code`: opcional, string (max 50)
- `isActive`: opcional, boolean (default: true)

#### Response (201)

```json
{
  "message": "Impuesto creado exitosamente",
  "data": {
    "id": 1,
    "name": "IVA General",
    "rate": "16.0000",
    "code": "IVA",
    "isActive": true
  }
}
```

---

### 2. Listar Impuestos

**Endpoint:** `GET /api/v1/finance/tax`

#### Response (200)

```json
{
  "message": "Impuestos obtenidos exitosamente",
  "data": [
    {
      "id": 1,
      "name": "IVA General",
      "rate": "16.0000",
      "code": "IVA",
      "isActive": true
    }
  ]
}
```

---

### 3. Listar Impuestos Activos

**Endpoint:** `GET /api/v1/finance/tax/active`

---

### 4. Obtener Impuesto

**Endpoint:** `GET /api/v1/finance/tax/:id`

---

### 5. Actualizar Impuesto

**Endpoint:** `PATCH /api/v1/finance/tax/:id`

#### Request Body (campos opcionales)

```json
{
  "rate": 8,
  "isActive": false
}
```

---

### 6. Eliminar Impuesto

**Endpoint:** `DELETE /api/v1/finance/tax/:id`

**Regla:** Si el impuesto está asociado a productos, el backend devuelve error y recomienda **desactivarlo**.
