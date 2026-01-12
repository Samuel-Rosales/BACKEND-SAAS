# Módulo Inventory - Stock General

## 📍 Endpoints

Base URL: `/api/v1/inventory/stock-general`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear o Actualizar Stock General

Crea o actualiza el stock general de un producto en un depósito específico. Si ya existe un registro para ese producto y depósito, lo actualiza; si no, lo crea (Upsert).

**Endpoint:** `POST /api/v1/inventory/stock-general`

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
  "quantity": 50
}
```

#### Validaciones

- `productId`: Obligatorio, number, debe existir el producto en el negocio
- `depotId`: Obligatorio, number, debe existir el depósito en el negocio
- `quantity`: Obligatorio, number, debe ser >= 0

**Nota:** No se puede gestionar stock de productos que son servicios.

#### Response (200 OK)

```json
{
  "message": "Stock general actualizado exitosamente",
  "status": 200,
  "data": {
    "productId": 1,
    "depotId": 1,
    "quantity": 50,
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
- `400`: No se puede gestionar stock de productos que son servicios

---

### 2. Listar Stock General

Obtiene todo el stock general del negocio.

**Endpoint:** `GET /api/v1/inventory/stock-general`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Stock general obtenido exitosamente",
  "status": 200,
  "data": [
    {
      "productId": 1,
      "depotId": 1,
      "quantity": 50,
      "product": {
        "id": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001",
        "minStock": 5
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

#### Errores

- `404`: No hay registros de stock general disponibles (retorna array vacío)

---

### 3. Obtener Stock General por Producto y Depósito

Obtiene el stock general de un producto específico en un depósito específico.

**Endpoint:** `GET /api/v1/inventory/stock-general/product/:productId/depot/:depotId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `productId`: ID del producto (número)
- `depotId`: ID del depósito (número)

#### Response (200 OK)

```json
{
  "message": "Stock general obtenido exitosamente",
  "status": 200,
  "data": {
    "productId": 1,
    "depotId": 1,
    "quantity": 50,
    "product": {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "sku": "LAP-DELL-XPS15-001",
      "minStock": 5
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
- `404`: Registro de stock general no encontrado

---

### 4. Actualizar Cantidad de Stock

Actualiza la cantidad de stock general de un producto en un depósito.

**Endpoint:** `PATCH /api/v1/inventory/stock-general/product/:productId/depot/:depotId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `productId`: ID del producto (número)
- `depotId`: ID del depósito (número)

#### Request Body

```json
{
  "quantity": 75
}
```

#### Validaciones

- `quantity`: Obligatorio, number, debe ser >= 0

#### Response (200 OK)

```json
{
  "message": "Stock general actualizado exitosamente",
  "status": 200,
  "data": {
    "productId": 1,
    "depotId": 1,
    "quantity": 75,
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

- `404`: Producto no encontrado o no pertenece a este negocio
- `404`: Registro de stock general no encontrado

---

### 5. Eliminar Stock General

Elimina el registro de stock general de un producto en un depósito.

**Endpoint:** `DELETE /api/v1/inventory/stock-general/product/:productId/depot/:depotId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `productId`: ID del producto (número)
- `depotId`: ID del depósito (número)

#### Response (200 OK)

```json
{
  "message": "Stock general eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio
- `404`: Registro de stock general no encontrado

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar su propio stock
- Clave compuesta: solo un registro por combinación de producto y depósito
- No se puede gestionar stock de productos servicios
