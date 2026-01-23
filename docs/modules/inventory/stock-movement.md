# Módulo Inventory - Movimientos de Stock

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/inventory/stock-movement`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear movimiento
- `GET /` — Listar movimientos
- `GET /:id` — Obtener movimiento
- `GET /product/:productId` — Listar por producto
- `GET /depot/:depotId` — Listar por depósito
- `GET /type/:type` — Listar por tipo
- `PATCH /:id` — Actualizar movimiento
- `DELETE /:id` — Eliminar movimiento

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/inventory/stock-movement`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Movimiento de Stock

Registra un movimiento de stock (entrada, salida, ajuste, transferencia o devolución).

**Endpoint:** `POST /api/v1/inventory/stock-movement`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "productId": 1,
  "memberId": 5,
  "depotId": 1,
  "type": "IN",
  "quantity": 50,
  "reason": "Compra #123",
  "date": "2024-01-15T10:30:00.000Z"
}
```

#### Validaciones

- `productId`: Obligatorio, number, debe existir el producto en el negocio
- `memberId`: Obligatorio, number, debe existir el miembro activo en el negocio
- `depotId`: Obligatorio, number, debe existir el depósito en el negocio
- `type`: Obligatorio, enum (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `RETURN`)
- `quantity`: Obligatorio, number
  - Para `IN`: debe ser > 0 (positivo)
  - Para `OUT`: debe ser < 0 (negativo)
- `reason`: Opcional, string, máximo 500 caracteres
- `date`: Opcional, string (ISO 8601), por defecto usa la fecha actual

**Nota:** No se puede gestionar movimientos de productos servicios (excepto ajustes).

#### Tipos de Movimiento

- **IN**: Entrada de stock (compra, recepción)
- **OUT**: Salida de stock (venta, consumo)
- **ADJUSTMENT**: Ajuste manual (inventario físico)
- **TRANSFER**: Transferencia entre depósitos
- **RETURN**: Devolución de productos

#### Response (201 Created)

```json
{
  "message": "Movimiento de stock creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "productId": 1,
    "memberId": 5,
    "depotId": 1,
    "type": "IN",
    "quantity": 50,
    "reason": "Compra #123",
    "date": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal",
      "location": "Av. Principal 123"
    },
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    }
  }
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio
- `404`: Depósito no encontrado o no pertenece a este negocio
- `404`: Miembro no encontrado, no pertenece a este negocio o está inactivo
- `400`: No se puede gestionar movimientos de productos servicios
- `400`: La cantidad debe ser positiva para movimientos de entrada
- `400`: La cantidad debe ser negativa para movimientos de salida

---

### 2. Listar Movimientos de Stock

Obtiene todos los movimientos de stock del negocio, ordenados por fecha descendente.

**Endpoint:** `GET /api/v1/inventory/stock-movement`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Movimientos de stock obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "productId": 1,
      "memberId": 5,
      "depotId": 1,
      "type": "IN",
      "quantity": 50,
      "reason": "Compra #123",
      "date": "2024-01-15T10:30:00.000Z",
      "product": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001"
      },
      "depot": {
        "id": 1,
        "name": "Bodega Principal",
        "location": "Av. Principal 123"
      },
      "member": {
        "id": 5,
        "user": {
          "id": 3,
          "name": "Juan Pérez"
        }
      }
    }
  ]
}
```

**Ordenamiento:** Por fecha descendente (más recientes primero).

#### Errores

- `404`: No hay movimientos de stock disponibles (retorna array vacío)

---

### 3. Obtener Movimiento por ID

Obtiene un movimiento de stock específico.

**Endpoint:** `GET /api/v1/inventory/stock-movement/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del movimiento (número)

#### Response (200 OK)

```json
{
  "message": "Movimiento de stock obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "productId": 1,
    "memberId": 5,
    "depotId": 1,
    "type": "IN",
    "quantity": 50,
    "reason": "Compra #123",
    "date": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal",
      "location": "Av. Principal 123"
    },
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    }
  }
}
```

#### Errores

- `404`: Movimiento de stock no encontrado o no pertenece a este negocio

---

### 4. Listar Movimientos por Producto

Obtiene todos los movimientos de stock de un producto específico.

**Endpoint:** `GET /api/v1/inventory/stock-movement/product/:productId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `productId`: ID del producto (número)

#### Response (200 OK)

```json
{
  "message": "Movimientos de stock obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "memberId": 5,
      "depotId": 1,
      "type": "IN",
      "quantity": 50,
      "reason": "Compra #123",
      "date": "2024-01-15T10:30:00.000Z",
      "depot": {
        "id": 1,
        "name": "Bodega Principal",
        "location": "Av. Principal 123"
      },
      "member": {
        "id": 5,
        "user": {
          "id": 3,
          "name": "Juan Pérez"
        }
      }
    }
  ]
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio

---

### 5. Listar Movimientos por Depósito

Obtiene todos los movimientos de stock de un depósito específico.

**Endpoint:** `GET /api/v1/inventory/stock-movement/depot/:depotId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `depotId`: ID del depósito (número)

#### Response (200 OK)

```json
{
  "message": "Movimientos de stock obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "memberId": 5,
      "depotId": 1,
      "type": "IN",
      "quantity": 50,
      "reason": "Compra #123",
      "date": "2024-01-15T10:30:00.000Z",
      "product": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001"
      },
      "member": {
        "id": 5,
        "user": {
          "id": 3,
          "name": "Juan Pérez"
        }
      }
    }
  ]
}
```

#### Errores

- `404`: Depósito no encontrado o no pertenece a este negocio

---

### 6. Listar Movimientos por Tipo

Obtiene todos los movimientos de stock de un tipo específico.

**Endpoint:** `GET /api/v1/inventory/stock-movement/type/:type`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `type`: Tipo de movimiento (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `RETURN`)

#### Response (200 OK)

```json
{
  "message": "Movimientos de stock obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "memberId": 5,
      "depotId": 1,
      "type": "IN",
      "quantity": 50,
      "reason": "Compra #123",
      "date": "2024-01-15T10:30:00.000Z",
      "product": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001"
      },
      "depot": {
        "id": 1,
        "name": "Bodega Principal",
        "location": "Av. Principal 123"
      },
      "member": {
        "id": 5,
        "user": {
          "id": 3,
          "name": "Juan Pérez"
        }
      }
    }
  ]
}
```

#### Errores

- `404`: No hay movimientos de stock de este tipo (retorna array vacío)

---

### 7. Actualizar Movimiento

Actualiza un movimiento de stock existente.

**Endpoint:** `PATCH /api/v1/inventory/stock-movement/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del movimiento (número)

#### Request Body

```json
{
  "quantity": 60,
  "reason": "Compra #123 - Actualizado"
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `type`: Opcional, enum (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `RETURN`)
- `quantity`: Opcional, number
  - Si el tipo es `IN`: debe ser > 0
  - Si el tipo es `OUT`: debe ser < 0
- `reason`: Opcional, string, máximo 500 caracteres
- `date`: Opcional, string (ISO 8601)

#### Response (200 OK)

```json
{
  "message": "Movimiento de stock actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "productId": 1,
    "memberId": 5,
    "depotId": 1,
    "type": "IN",
    "quantity": 60,
    "reason": "Compra #123 - Actualizado",
    "date": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal"
    },
    "member": {
      "id": 5,
      "user": {
        "id": 3,
        "name": "Juan Pérez"
      }
    }
  }
}
```

#### Errores

- `404`: Movimiento de stock no encontrado o no pertenece a este negocio
- `400`: La cantidad debe ser positiva para movimientos de entrada
- `400`: La cantidad debe ser negativa para movimientos de salida

---

### 8. Eliminar Movimiento

Elimina un movimiento de stock.

**Endpoint:** `DELETE /api/v1/inventory/stock-movement/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del movimiento (número)

#### Response (200 OK)

```json
{
  "message": "Movimiento de stock eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Movimiento de stock no encontrado o no pertenece a este negocio

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios movimientos
- Validación de cantidad según el tipo de movimiento
- Registro de quién realizó el movimiento (miembro)
- No se puede gestionar movimientos de productos servicios (excepto ajustes)
