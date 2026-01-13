# Módulo Inventory - Presentaciones de Producto

## 📍 Endpoints

Base URL: `/api/v1/inventory/product-presentation`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Presentación

Crea una nueva presentación para un producto (ej: "Caja de 12", "Paquete de 6").

**Endpoint:** `POST /api/v1/inventory/product-presentation`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "productId": 1,
  "name": "Caja de 12",
  "factor": 12,
  "barCode": "1234567890123",
  "price": 120.00
}
```

#### Validaciones

- `productId`: Obligatorio, number, debe existir el producto en el negocio
- `name`: Obligatorio, string, único por producto (no puede haber dos "Caja de 12" para el mismo producto)
- `factor`: Obligatorio, number, debe ser > 0 (cantidad de unidades base que representa)
- `barCode`: Opcional, string, código de barras de la presentación
- `price`: Opcional, number, precio de venta de esta presentación

#### Response (201 Created)

```json
{
  "message": "Presentación agregada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "productId": 1,
    "name": "Caja de 12",
    "factor": 12,
    "barCode": "1234567890123",
    "price": 120.00,
    "isActive": true
  }
}
```

#### Errores

- `404`: El producto no existe o no pertenece a tu negocio
- `400`: Ya existe una presentación llamada "Caja de 12" para este producto

---

### 2. Listar Presentaciones por Producto

Obtiene todas las presentaciones de un producto específico.

**Endpoint:** `GET /api/v1/inventory/product-presentation?productId=1`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Query Parameters

- `productId`: Obligatorio, number, ID del producto
- `includeArchived`: Opcional, boolean (default: false) - Si es true, incluye presentaciones archivadas

#### Response (200 OK)

```json
{
  "message": "Presentaciones obtenidas",
  "status": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "name": "Caja de 12",
      "factor": 12,
      "barCode": "1234567890123",
      "price": 120.00,
      "isActive": true
    },
    {
      "id": 2,
      "productId": 1,
      "name": "Paquete de 6",
      "factor": 6,
      "barCode": "1234567890124",
      "price": 65.00,
      "isActive": true
    }
  ]
}
```

**Ordenamiento:** Por factor ascendente (presentaciones más pequeñas primero).

#### Errores

- `404`: Producto no encontrado o no pertenece a este negocio

---

### 3. Actualizar Presentación

Actualiza una presentación existente.

**Endpoint:** `PATCH /api/v1/inventory/product-presentation/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID de la presentación

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Caja de 24",
  "factor": 24,
  "price": 220.00
}
```

#### Validaciones

- `name`: Opcional, string, único por producto
- `factor`: Opcional, number, debe ser > 0
- `barCode`: Opcional, string
- `price`: Opcional, number

**Nota:** El `productId` no se puede actualizar.

#### Response (200 OK)

```json
{
  "message": "Presentación actualizada",
  "status": 200,
  "data": {
    "id": 1,
    "productId": 1,
    "name": "Caja de 24",
    "factor": 24,
    "barCode": "1234567890123",
    "price": 220.00,
    "isActive": true
  }
}
```

#### Errores

- `404`: Presentación no encontrada o sin permisos (el producto no pertenece a tu negocio)

---

### 4. Eliminar Presentación

Elimina o archiva una presentación. Si tiene historial de ventas/compras, se archiva (soft delete). Si no tiene historial, se elimina permanentemente.

**Endpoint:** `DELETE /api/v1/inventory/product-presentation/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID de la presentación

#### Response (200 OK) - Eliminación Permanente

```json
{
  "message": "Presentación eliminada permanentemente",
  "status": 200,
  "data": null
}
```

#### Response (200 OK) - Archivado (Soft Delete)

```json
{
  "message": "Presentación archivada (Tiene historial de ventas/compras)",
  "status": 200,
  "data": {
    "id": 1,
    "productId": 1,
    "name": "Caja de 12",
    "factor": 12,
    "isActive": false
  }
}
```

#### Errores

- `404`: Presentación no encontrada o sin permisos
- `400`: La presentación ya está archivada

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar presentaciones de sus propios productos
- Protección de integridad: presentaciones con historial se archivan en lugar de eliminarse

## 📝 Notas

- El `factor` indica cuántas unidades base representa la presentación (ej: factor 12 = 12 unidades)
- El nombre de la presentación debe ser único por producto
- Las presentaciones archivadas no aparecen en listados normales (usar `includeArchived=true`)
- Se usa soft delete cuando hay historial para mantener la integridad de facturas antiguas
