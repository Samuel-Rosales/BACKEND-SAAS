# Módulo Inventory - Productos

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/inventory/product`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear producto
- `GET /` — Listar productos
- `GET /:id` — Obtener producto
- `PATCH /:id` — Actualizar producto
- `DELETE /:id` — Eliminar producto

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/inventory/product`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Producto

Crea un nuevo producto para el negocio.

**Endpoint:** `POST /api/v1/inventory/product`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "name": "Laptop Dell XPS 15",
  "sku": "LAP-DELL-XPS15-001",
  "description": "Laptop de alta gama con procesador Intel i7",
  "categoryId": 1,
  "unitId": 1,
  "costPrice": 899.99,
  "salePrice": 1299.99,
  "minStock": 5,
  "isService": false,
  "isPerishable": false,
  "imageUrl": "https://example.com/image.jpg"
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-200 caracteres
- `categoryId`: Obligatorio, number, debe existir la categoría en el negocio
- `unitId`: Obligatorio, number, debe existir la unidad de medida
- `costPrice`: Obligatorio, number, debe ser >= 0
- `salePrice`: Obligatorio, number, debe ser >= 0
- `sku`: Opcional, string, 3-50 caracteres, único por negocio
- `description`: Opcional, string, máximo 1000 caracteres
- `imageUrl`: Opcional, string, URL válida
- `minStock`: Opcional, number, debe ser >= 0 (default: 0)
- `isService`: Opcional, boolean (default: false) - Si es true, no se gestiona stock
- `isPerishable`: Opcional, boolean (default: false) - Si es true, requiere fecha de vencimiento en compras

#### Response (201 Created)

```json
{
  "message": "Producto creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "categoryId": 1,
    "name": "Laptop Dell XPS 15",
    "sku": "LAP-DELL-XPS15-001",
    "description": "Laptop de alta gama con procesador Intel i7",
    "price": 1299.99,
    "cost": 899.99,
    "minStock": 5,
    "isService": false,
    "createdById": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "category": {
      "id": 1,
      "name": "Electrónica"
    }
  }
}
```

#### Errores

- `400`: El SKU ya existe en este negocio
- `404`: Categoría no encontrada o no pertenece a este negocio
- `404`: Negocio no encontrado
- `400`: El costo no puede ser mayor que el precio

---

### 2. Listar Productos

Obtiene todos los productos del negocio con paginación y búsqueda opcional.

**Endpoint:** `GET /api/v1/inventory/product`

#### Query Parameters

- `page`: Opcional, number, número de página (default: 1)
- `limit`: Opcional, number, cantidad de resultados por página (default: 20)
- `search`: Opcional, string, busca por nombre o SKU

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Productos obtenidos exitosamente",
  "status": 200,
  "data": {
    "products": [
      {
        "id": 1,
        "businessId": 1,
        "categoryId": 1,
        "unitId": 1,
        "name": "Laptop Dell XPS 15",
        "sku": "LAP-DELL-XPS15-001",
        "description": "Laptop de alta gama con procesador Intel i7",
        "costPrice": 899.99,
        "salePrice": 1299.99,
        "minStock": 5,
        "isService": false,
        "isPerishable": false,
        "category": {
          "id": 1,
          "name": "Electrónica"
        },
        "unit": {
          "id": 1,
          "name": "Unidad",
          "symbol": "u"
        },
        "currentStock": 200
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

#### Errores

- `404`: No hay productos registrados (retorna array vacío)

---

### 3. Obtener Producto por ID

Obtiene un producto específico del negocio.

**Endpoint:** `GET /api/v1/inventory/product/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del producto (número)

#### Response (200 OK)

```json
{
  "message": "Producto obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "categoryId": 1,
    "name": "Laptop Dell XPS 15",
    "sku": "LAP-DELL-XPS15-001",
    "description": "Laptop de alta gama con procesador Intel i7",
    "price": 1299.99,
    "cost": 899.99,
    "minStock": 5,
    "isService": false,
    "createdById": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "category": {
      "id": 1,
      "name": "Electrónica"
    }
  }
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio

---

### 4. Actualizar Producto

Actualiza un producto existente.

**Endpoint:** `PATCH /api/v1/inventory/product/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del producto (número)

#### Request Body

```json
{
  "name": "Laptop Dell XPS 15 (Actualizado)",
  "salePrice": 1199.99,
  "minStock": 10
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `name`: Opcional, string, 2-200 caracteres
- `categoryId`: Opcional, number, debe existir la categoría en el negocio
- `unitId`: Opcional, number, debe existir la unidad de medida
- `costPrice`: Opcional, number, debe ser >= 0
- `salePrice`: Opcional, number, debe ser >= 0
- `sku`: Opcional, string, 3-50 caracteres, único por negocio
- `description`: Opcional, string, máximo 1000 caracteres
- `imageUrl`: Opcional, string, URL válida
- `minStock`: Opcional, number, debe ser >= 0
- `isService`: Opcional, boolean
- `isPerishable`: Opcional, boolean

#### Response (200 OK)

```json
{
  "message": "Producto actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "categoryId": 1,
    "unitId": 1,
    "name": "Laptop Dell XPS 15 (Actualizado)",
    "sku": "LAP-DELL-XPS15-001",
    "salePrice": 1199.99,
    "minStock": 10,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio
- `400`: El SKU ya existe en este negocio
- `404`: Categoría no encontrada o no pertenece a este negocio
- `404`: Unidad de medida no encontrada

---

### 5. Eliminar Producto

Elimina un producto. No se puede eliminar si tiene registros de stock, ventas o compras asociados.

**Endpoint:** `DELETE /api/v1/inventory/product/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del producto (número)

#### Response (200 OK)

```json
{
  "message": "Producto eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio
- `400`: No se puede eliminar el producto porque tiene registros de stock, ventas o compras asociados

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios productos
- Protección de integridad: no se puede eliminar productos con registros asociados
- Auditoría: se registra quién creó y actualizó cada producto
