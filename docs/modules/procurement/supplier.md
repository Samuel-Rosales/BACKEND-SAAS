# Módulo Procurement - Proveedores

## 📍 Endpoints

Base URL: `/api/v1/procurement/supplier`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Proveedor

Registra un nuevo proveedor para el negocio.

**Endpoint:** `POST /api/v1/procurement/supplier`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "nameCompany": "Distribuidora ABC S.A.",
  "contactName": "Juan Pérez",
  "address": "Av. Principal 123, Caracas",
  "phone": "+58 212 1234567"
}
```

#### Validaciones

- `nameCompany`: Obligatorio, string, nombre de la empresa proveedora
- `contactName`: Obligatorio, string, nombre del contacto
- `address`: Obligatorio, string, dirección del proveedor
- `phone`: Obligatorio, string, teléfono de contacto

#### Response (201 Created)

```json
{
  "message": "Proveedor registrado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "nameCompany": "Distribuidora ABC S.A.",
    "contactName": "Juan Pérez",
    "address": "Av. Principal 123, Caracas",
    "phone": "+58 212 1234567",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `500`: Error interno al registrar el proveedor

---

### 2. Listar Proveedores

Obtiene todos los proveedores del negocio, ordenados por nombre de empresa.

**Endpoint:** `GET /api/v1/procurement/supplier`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Proveedores obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "nameCompany": "Distribuidora ABC S.A.",
      "contactName": "Juan Pérez",
      "address": "Av. Principal 123, Caracas",
      "phone": "+58 212 1234567",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "businessId": 1,
      "nameCompany": "Importadora XYZ",
      "contactName": "María García",
      "address": "Calle Comercial 456",
      "phone": "+58 212 7654321",
      "isActive": true,
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

#### Response (200 OK) - Sin Proveedores

```json
{
  "message": "No hay proveedores registrados aún",
  "status": 200,
  "data": []
}
```

---

### 3. Obtener Proveedor por ID

Obtiene un proveedor específico del negocio.

**Endpoint:** `GET /api/v1/procurement/supplier/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del proveedor

#### Response (200 OK)

```json
{
  "message": "Proveedor encontrado",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "nameCompany": "Distribuidora ABC S.A.",
    "contactName": "Juan Pérez",
    "address": "Av. Principal 123, Caracas",
    "phone": "+58 212 1234567",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Proveedor no encontrado",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Proveedor

Actualiza los datos de un proveedor existente.

**Endpoint:** `PATCH /api/v1/procurement/supplier/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del proveedor

#### Request Body (todos los campos son opcionales)

```json
{
  "contactName": "Juan Carlos Pérez",
  "phone": "+58 212 9999999",
  "isActive": false
}
```

#### Validaciones

- `nameCompany`: Opcional, string
- `contactName`: Opcional, string
- `address`: Opcional, string
- `phone`: Opcional, string
- `isActive`: Opcional, boolean

#### Response (200 OK)

```json
{
  "message": "Proveedor actualizado correctamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "nameCompany": "Distribuidora ABC S.A.",
    "contactName": "Juan Carlos Pérez",
    "address": "Av. Principal 123, Caracas",
    "phone": "+58 212 9999999",
    "isActive": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errores

- `404`: Proveedor no encontrado para actualizar

---

### 5. Eliminar Proveedor

Elimina un proveedor. No se puede eliminar si tiene compras registradas.

**Endpoint:** `DELETE /api/v1/procurement/supplier/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del proveedor

#### Response (200 OK)

```json
{
  "message": "Proveedor eliminado correctamente",
  "status": 200,
  "data": null
}
```

#### Response (409 Conflict)

```json
{
  "message": "No se puede eliminar: El proveedor tiene 5 compras registradas.",
  "status": 409,
  "data": null
}
```

#### Errores

- `404`: Proveedor no encontrado
- `409`: No se puede eliminar porque tiene compras registradas

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios proveedores
- Protección de integridad: no se puede eliminar proveedores con compras asociadas

## 📝 Notas

- El campo `isActive` permite desactivar proveedores sin eliminarlos
- Se recomienda desactivar proveedores en lugar de eliminarlos para mantener el historial
- La eliminación es permanente si no hay compras asociadas
