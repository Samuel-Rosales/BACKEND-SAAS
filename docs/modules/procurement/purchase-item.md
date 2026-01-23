# Módulo Procurement - Items de Compra

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/procurement/purchase-item`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear item
- `GET /` — Listar items (requiere `purchaseId` query)
- `GET /:id` — Obtener item
- `PATCH /:id` — Actualizar item
- `DELETE /:id` — Eliminar item

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/procurement/purchase-item`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Item de Compra

Registra un nuevo item (producto) en una compra existente.

**Endpoint:** `POST /api/v1/procurement/purchase-item`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "purchaseId": 1,
  "productId": 5,
  "depotId": 2,
  "productPresentationId": 3,
  "quantity": 50,
  "unitCost": 25.50,
  "expirationDate": "2024-12-31"
}
```

#### Validaciones

- `purchaseId`: Obligatorio, number, debe existir la compra y pertenecer al negocio
- `productId`: Obligatorio, number, debe existir el producto y pertenecer al negocio
- `depotId`: Obligatorio, number, debe existir el almacén, pertenecer al negocio y estar activo
- `productPresentationId`: Opcional, number, debe existir la presentación y estar activa (si se proporciona)
- `quantity`: Obligatorio, number, debe ser > 0
- `unitCost`: Obligatorio, number, debe ser > 0
- `expirationDate`: Opcional, string (YYYY-MM-DD), **obligatorio si el producto es perecedero**

#### Response (201 Created)

```json
{
  "message": "Item de compra creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "productId": 5,
    "depotId": 2,
    "productPresentationId": 3,
    "quantity": 50,
    "unitCost": 25.50,
    "expirationDate": "2024-12-31T00:00:00.000Z",
    "product": {
      "id": 5,
      "name": "Arroz Premium",
      "sku": "ARROZ-001",
      "imageUrl": "https://example.com/arroz.jpg"
    },
    "depot": {
      "id": 2,
      "name": "Almacén Principal"
    },
    "productPresentation": {
      "id": 3,
      "name": "Saco 50kg",
      "factor": 50
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459"
    }
  }
}
```

#### Errores

- `404`: La compra no existe
- `403`: La compra no pertenece a este negocio
- `404`: El producto no existe
- `403`: El producto no pertenece a este negocio
- `404`: El almacén no existe
- `403`: El almacén no pertenece a este negocio
- `400`: El almacén está inactivo
- `404`: La presentación de producto no existe
- `400`: La presentación de producto está inactiva
- `400`: La cantidad debe ser mayor a cero
- `400`: El costo unitario debe ser mayor a cero
- `400`: El producto es perecedero y requiere fecha de vencimiento

---

### 2. Listar Items de Compra

Obtiene todos los items de compra del negocio, opcionalmente filtrados por compra.

**Endpoint:** `GET /api/v1/procurement/purchase-item`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Query Parameters

- `purchaseId`: Opcional, number, filtra los items por ID de compra

**Ejemplo:** `GET /api/v1/procurement/purchase-item?purchaseId=1`

#### Response (200 OK)

```json
{
  "message": "Items de compra obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "purchaseId": 1,
      "productId": 5,
      "depotId": 2,
      "productPresentationId": 3,
      "quantity": 50,
      "unitCost": 25.50,
      "expirationDate": "2024-12-31T00:00:00.000Z",
      "product": {
        "id": 5,
        "name": "Arroz Premium",
        "sku": "ARROZ-001",
        "imageUrl": "https://example.com/arroz.jpg"
      },
      "depot": {
        "id": 2,
        "name": "Almacén Principal"
      },
      "productPresentation": {
        "id": 3,
        "name": "Saco 50kg",
        "factor": 50
      },
      "purchase": {
        "id": 1,
        "totalCost": 1160.00,
        "reference": "A-00459",
        "date": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "id": 2,
      "purchaseId": 1,
      "productId": 6,
      "depotId": 2,
      "quantity": 30,
      "unitCost": 15.00,
      "expirationDate": "2099-12-31T00:00:00.000Z",
      "product": {
        "id": 6,
        "name": "Aceite Vegetal",
        "sku": "ACEITE-001"
      },
      "depot": {
        "id": 2,
        "name": "Almacén Principal"
      },
      "productPresentation": null,
      "purchase": {
        "id": 1,
        "totalCost": 1160.00,
        "reference": "A-00459",
        "date": "2024-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay items de compra registrados",
  "status": 404,
  "data": []
}
```

---

### 3. Obtener Item de Compra por ID

Obtiene un item de compra específico con toda su información relacionada.

**Endpoint:** `GET /api/v1/procurement/purchase-item/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del item de compra

#### Response (200 OK)

```json
{
  "message": "Item de compra obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "productId": 5,
    "depotId": 2,
    "productPresentationId": 3,
    "quantity": 50,
    "unitCost": 25.50,
    "expirationDate": "2024-12-31T00:00:00.000Z",
    "product": {
      "id": 5,
      "name": "Arroz Premium",
      "sku": "ARROZ-001",
      "imageUrl": "https://example.com/arroz.jpg",
      "isPerishable": true
    },
    "depot": {
      "id": 2,
      "name": "Almacén Principal"
    },
    "productPresentation": {
      "id": 3,
      "name": "Saco 50kg",
      "factor": 50
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459",
      "date": "2024-01-15T10:30:00.000Z",
      "supplier": {
        "id": 1,
        "nameCompany": "Distribuidora ABC S.A."
      }
    }
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Item de compra no encontrado",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Item de Compra

Actualiza los datos de un item de compra existente.

**Endpoint:** `PATCH /api/v1/procurement/purchase-item/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del item de compra

#### Request Body (todos los campos son opcionales)

```json
{
  "quantity": 60,
  "unitCost": 26.00,
  "expirationDate": "2025-01-31"
}
```

#### Validaciones

- `purchaseId`: Opcional, number, debe existir la compra y pertenecer al negocio
- `productId`: Opcional, number, debe existir el producto y pertenecer al negocio
- `depotId`: Opcional, number, debe existir el almacén, pertenecer al negocio y estar activo
- `productPresentationId`: Opcional, number, debe existir la presentación y estar activa
- `quantity`: Opcional, number, debe ser > 0 (si se proporciona)
- `unitCost`: Opcional, number, debe ser > 0 (si se proporciona)
- `expirationDate`: Opcional, string (YYYY-MM-DD)

#### Response (200 OK)

```json
{
  "message": "Item de compra actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "purchaseId": 1,
    "productId": 5,
    "depotId": 2,
    "productPresentationId": 3,
    "quantity": 60,
    "unitCost": 26.00,
    "expirationDate": "2025-01-31T00:00:00.000Z",
    "product": {
      "id": 5,
      "name": "Arroz Premium",
      "sku": "ARROZ-001",
      "imageUrl": "https://example.com/arroz.jpg"
    },
    "depot": {
      "id": 2,
      "name": "Almacén Principal"
    },
    "productPresentation": {
      "id": 3,
      "name": "Saco 50kg",
      "factor": 50
    },
    "purchase": {
      "id": 1,
      "totalCost": 1160.00,
      "reference": "A-00459"
    }
  }
}
```

#### Errores

- `404`: Item de compra no encontrado o no pertenece a este negocio
- `404`: El producto no existe
- `403`: El producto no pertenece a este negocio
- `404`: El almacén no existe
- `403`: El almacén no pertenece a este negocio
- `400`: El almacén está inactivo
- `404`: La presentación de producto no existe
- `400`: La presentación de producto está inactiva
- `400`: La cantidad debe ser mayor a cero
- `400`: El costo unitario debe ser mayor a cero

---

### 5. Eliminar Item de Compra

Elimina un item de compra. Esta operación es permanente.

**Endpoint:** `DELETE /api/v1/procurement/purchase-item/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del item de compra

#### Response (200 OK)

```json
{
  "message": "Item de compra eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Response (404 Not Found)

```json
{
  "message": "Item de compra no encontrado o no pertenece a este negocio",
  "status": 404,
  "data": null
}
```

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar items de sus propias compras
- Validación de pertenencia: compra, producto y almacén deben pertenecer al negocio
- Validación de estado: el almacén debe estar activo

## 📝 Notas

- **Fecha de Expiración:** 
  - Para productos perecederos (`isPerishable: true`), la fecha de expiración es obligatoria
  - Para productos no perecederos, se usa automáticamente la fecha `2099-12-31`
- **Presentación de Producto:** 
  - Es opcional y permite especificar la presentación usada (caja, pack, unidad, etc.)
  - Si se proporciona, debe estar activa
- **Almacén:** 
  - Cada item puede ir a un almacén diferente dentro de la misma compra
  - El almacén debe estar activo para poder recibir productos
- **Cantidad y Costo:** 
  - Ambos valores deben ser mayores a cero
  - El costo unitario se usa para calcular el total del item (quantity × unitCost)
- **Eliminación:** 
  - La eliminación es permanente
  - Se recomienda verificar que el item no esté siendo usado en otros procesos antes de eliminarlo
