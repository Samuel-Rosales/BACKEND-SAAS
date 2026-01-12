# Módulo Inventory - Depósitos

## 📍 Endpoints

Base URL: `/api/v1/inventory/depot`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Depósito

Crea un nuevo depósito (bodega/almacén) para el negocio.

**Endpoint:** `POST /api/v1/inventory/depot`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "name": "Bodega Principal",
  "location": "Av. Principal 123, Caracas",
  "description": "Depósito principal del negocio"
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-100 caracteres, único por negocio
- `location`: Obligatorio, string, 5-200 caracteres
- `description`: Opcional, string, máximo 500 caracteres

#### Response (201 Created)

```json
{
  "message": "Depósito creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Bodega Principal",
    "location": "Av. Principal 123, Caracas",
    "description": "Depósito principal del negocio",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "stockGenerals": 0,
      "stockLots": 0,
      "stockMovements": 0
    }
  }
}
```

#### Errores

- `400`: El nombre de depósito ya existe en este negocio
- `404`: Negocio no encontrado

---

### 2. Listar Depósitos

Obtiene todos los depósitos del negocio.

**Endpoint:** `GET /api/v1/inventory/depot`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Depósitos obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "name": "Bodega Principal",
      "location": "Av. Principal 123, Caracas",
      "description": "Depósito principal del negocio",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "_count": {
        "stockGenerals": 15,
        "stockLots": 8,
        "stockMovements": 45
      }
    }
  ]
}
```

#### Errores

- `404`: No hay depósitos registrados (retorna array vacío)

---

### 3. Obtener Depósito por ID

Obtiene un depósito específico del negocio.

**Endpoint:** `GET /api/v1/inventory/depot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del depósito (número)

#### Response (200 OK)

```json
{
  "message": "Depósito obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Bodega Principal",
    "location": "Av. Principal 123, Caracas",
    "description": "Depósito principal del negocio",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "stockGenerals": 15,
      "stockLots": 8,
      "stockMovements": 45
    }
  }
}
```

#### Errores

- `404`: Depósito no encontrado o no pertenece a este negocio

---

### 4. Actualizar Depósito

Actualiza un depósito existente.

**Endpoint:** `PATCH /api/v1/inventory/depot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del depósito (número)

#### Request Body

```json
{
  "name": "Bodega Central",
  "location": "Nueva dirección 456",
  "description": "Depósito centralizado"
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `name`: Opcional, string, 2-100 caracteres, único por negocio
- `location`: Opcional, string, 5-200 caracteres
- `description`: Opcional, string, máximo 500 caracteres

#### Response (200 OK)

```json
{
  "message": "Depósito actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Bodega Central",
    "location": "Nueva dirección 456",
    "description": "Depósito centralizado",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `404`: Depósito no encontrado o no pertenece a este negocio
- `400`: El nombre ya existe en este negocio

---

### 5. Eliminar Depósito

Elimina un depósito. No se puede eliminar si tiene registros de stock asociados.

**Endpoint:** `DELETE /api/v1/inventory/depot/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del depósito (número)

#### Response (200 OK)

```json
{
  "message": "Depósito eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Depósito no encontrado o no pertenece a este negocio
- `400`: No se puede eliminar el depósito porque tiene registros de stock asociados

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios depósitos
- Protección de integridad: no se puede eliminar depósitos con stock asociado
