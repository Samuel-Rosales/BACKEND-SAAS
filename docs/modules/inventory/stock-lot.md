# Módulo Inventory - Stock por Lotes

## 📍 Endpoints

Base URL: `/api/v1/inventory/stock-lot`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Lote

Crea un nuevo lote de stock para control FIFO y vencimientos.

**Endpoint:** `POST /api/v1/inventory/stock-lot`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "productId": 1,
  "depotId": 1,
  "quantity": 100,
  "expirationDate": "2024-12-31",
  "lotCost": 899.99
}
```

#### Validaciones

- `productId`: Obligatorio, number, debe existir el producto en el negocio
- `depotId`: Obligatorio, number, debe existir el depósito en el negocio
- `quantity`: Obligatorio, number, debe ser > 0
- `expirationDate`: Obligatorio, string (ISO 8601), fecha de vencimiento
- `lotCost`: Obligatorio, number, debe ser >= 0 (costo específico del lote)

**Nota:** No se puede gestionar lotes de productos que son servicios.

#### Response (201 Created)

```json
{
  "message": "Lote creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "productId": 1,
    "depotId": 1,
    "quantity": 100,
    "expirationDate": "2024-12-31T00:00:00.000Z",
    "lotCost": 899.99,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal",
      "location": "Av. Principal 123"
    }
  }
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio
- `404`: Depósito no encontrado o no pertenece a este negocio
- `400`: No se puede gestionar lotes de productos que son servicios

---

### 2. Listar Lotes

Obtiene todos los lotes del negocio, ordenados por fecha de vencimiento (FIFO).

**Endpoint:** `GET /api/v1/inventory/stock-lot`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Lotes obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "depotId": 1,
      "quantity": 100,
      "expirationDate": "2024-12-31T00:00:00.000Z",
      "lotCost": 899.99,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "product": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001"
      },
      "depot": {
        "id": 1,
        "name": "Bodega Principal",
        "location": "Av. Principal 123"
      }
    }
  ]
}
```

**Ordenamiento:** Los lotes se ordenan por fecha de vencimiento (ascendente) y luego por fecha de creación (FIFO).

#### Errores

- `404`: No hay lotes disponibles (retorna array vacío)

---

### 3. Obtener Lote por ID

Obtiene un lote específico.

**Endpoint:** `GET /api/v1/inventory/stock-lot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del lote (número)

#### Response (200 OK)

```json
{
  "message": "Lote obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "productId": 1,
    "depotId": 1,
    "quantity": 100,
    "expirationDate": "2024-12-31T00:00:00.000Z",
    "lotCost": 899.99,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal",
      "location": "Av. Principal 123"
    }
  }
}
```

#### Errores

- `404`: Lote no encontrado o no pertenece a este negocio

---

### 4. Listar Lotes por Producto

Obtiene todos los lotes de un producto específico.

**Endpoint:** `GET /api/v1/inventory/stock-lot/product/:productId`

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
  "message": "Lotes obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "depotId": 1,
      "quantity": 100,
      "expirationDate": "2024-12-31T00:00:00.000Z",
      "lotCost": 899.99,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "depot": {
        "id": 1,
        "name": "Bodega Principal",
        "location": "Av. Principal 123"
      }
    }
  ]
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio

---

### 5. Actualizar Lote

Actualiza un lote existente.

**Endpoint:** `PATCH /api/v1/inventory/stock-lot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del lote (número)

#### Request Body

```json
{
  "quantity": 80,
  "expirationDate": "2025-01-31",
  "lotCost": 850.00
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `quantity`: Opcional, number, debe ser >= 0
- `expirationDate`: Opcional, string (ISO 8601)
- `lotCost`: Opcional, number, debe ser >= 0

#### Response (200 OK)

```json
{
  "message": "Lote actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "productId": 1,
    "depotId": 1,
    "quantity": 80,
    "expirationDate": "2025-01-31T00:00:00.000Z",
    "lotCost": 850.00,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001"
    },
    "depot": {
      "id": 1,
      "name": "Bodega Principal"
    }
  }
}
```

#### Errores

- `404`: Lote no encontrado o no pertenece a este negocio

---

### 6. Eliminar Lote

Elimina un lote. No se puede eliminar si tiene ventas asociadas.

**Endpoint:** `DELETE /api/v1/inventory/stock-lot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del lote (número)

#### Response (200 OK)

```json
{
  "message": "Lote eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Lote no encontrado o no pertenece a este negocio
- `400`: No se puede eliminar el lote porque tiene ventas asociadas

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios lotes
- Protección de integridad: no se puede eliminar lotes con ventas asociadas
- Control FIFO: ordenamiento automático por fecha de vencimiento
- No se puede gestionar lotes de productos servicios
