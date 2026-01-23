# Módulo Inventory - Categorías de Productos

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/inventory/category`

**Autenticación:** ✅ Requerida

**Endpoints:**
- `POST /` — Crear categoría
- `GET /` — Listar categorías
- `GET /:id` — Obtener categoría
- `PATCH /:id` — Actualizar categoría
- `DELETE /:id` — Eliminar categoría

**Nota:** Enviar `x-business-id` para contexto de negocio.

## 📍 Endpoints

Base URL: `/api/v1/inventory/category`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Categoría

Crea una nueva categoría de productos para el negocio.

**Endpoint:** `POST /api/v1/inventory/category`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "name": "Electrónica",
  "description": "Productos electrónicos y accesorios"
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-100 caracteres, único por negocio
- `description`: Opcional, string, máximo 500 caracteres

#### Response (201 Created)

```json
{
  "message": "Categoría creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Electrónica",
    "description": "Productos electrónicos y accesorios",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "products": 0
    }
  }
}
```

#### Errores

- `400`: El nombre de categoría ya existe en este negocio
- `404`: Negocio no encontrado

---

### 2. Listar Categorías

Obtiene todas las categorías del negocio.

**Endpoint:** `GET /api/v1/inventory/category`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Categorías obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "name": "Electrónica",
      "description": "Productos electrónicos y accesorios",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "_count": {
        "products": 5
      }
    }
  ]
}
```

#### Errores

- `404`: No hay categorías registradas (retorna array vacío)

---

### 3. Obtener Categoría por ID

Obtiene una categoría específica del negocio.

**Endpoint:** `GET /api/v1/inventory/category/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la categoría (número)

#### Response (200 OK)

```json
{
  "message": "Categoría obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Electrónica",
    "description": "Productos electrónicos y accesorios",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "products": 5
    }
  }
}
```

#### Errores

- `404`: Categoría no encontrada o no pertenece a este negocio

---

### 4. Actualizar Categoría

Actualiza una categoría existente.

**Endpoint:** `PATCH /api/v1/inventory/category/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la categoría (número)

#### Request Body

```json
{
  "name": "Electrónica y Tecnología",
  "description": "Productos electrónicos, tecnología y accesorios"
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `name`: Opcional, string, 2-100 caracteres, único por negocio
- `description`: Opcional, string, máximo 500 caracteres

#### Response (200 OK)

```json
{
  "message": "Categoría actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Electrónica y Tecnología",
    "description": "Productos electrónicos, tecnología y accesorios",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `404`: Categoría no encontrada o no pertenece a este negocio
- `400`: El nombre ya existe en este negocio

---

### 5. Eliminar Categoría

Elimina una categoría. No se puede eliminar si tiene productos asociados.

**Endpoint:** `DELETE /api/v1/inventory/category/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID de la categoría (número)

#### Response (200 OK)

```json
{
  "message": "Categoría eliminada exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Categoría no encontrada o no pertenece a este negocio
- `400`: No se puede eliminar la categoría porque tiene productos asociados

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propias categorías
- Protección de integridad: no se puede eliminar categorías con productos asociados
