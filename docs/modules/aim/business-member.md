# Módulo AIM - Miembros de Negocio

## 📍 Endpoints

Base URL: `/api/v1/aim/business-member`

**Autenticación:** ✅ Requerida

---

### 1. Agregar Miembro

Agrega un empleado a un negocio. Si el usuario no existe, lo crea automáticamente.

**Endpoint:** `POST /api/v1/aim/business-member`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: <business_id>
```

#### Request Body

```json
{
  "ci": "12345678",
  "name": "María García",
  "roleId": 2
}
```

#### Validaciones

- `ci`: Obligatorio, string, cédula del usuario
- `name`: Obligatorio, string, nombre del usuario
- `roleId`: Obligatorio, number, ID del rol a asignar

#### Comportamiento

1. Busca el usuario por CI
2. Si no existe, lo crea con contraseña = CI (encriptada)
3. Verifica que no esté ya vinculado al negocio
4. Crea la relación BusinessMember

#### Response (201 Created)

```json
{
  "message": "Miembro creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "userId": 2,
    "roleId": 2,
    "isActive": true,
    "joinedAt": "2024-01-15T10:30:00Z",
    "user": {
      "id": 2,
      "name": "María García",
      "ci": "12345678"
    },
    "role": {
      "id": 2,
      "name": "Cajero",
      "code": "CASHIER"
    }
  }
}
```

#### Response (400 Bad Request)

```json
{
  "message": "El usuario María García ya es parte de tu equipo.",
  "status": 400,
  "data": null
}
```

---

### 2. Listar Miembros

Obtiene todos los miembros activos de un negocio.

**Endpoint:** `GET /api/v1/aim/business-member`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: <business_id>
```

#### Response (200 OK)

```json
{
  "message": "Miembros obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "userId": 1,
      "roleId": 1,
      "isActive": true,
      "joinedAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": 1,
        "name": "Juan Pérez",
        "ci": "87654321"
      },
      "role": {
        "code": "OWNER",
        "name": "Propietario"
      }
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay miembros registrados",
  "status": 404,
  "data": null
}
```

---

### 3. Obtener Miembro por ID

Obtiene un miembro específico de un negocio.

**Endpoint:** `GET /api/v1/aim/business-member/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: <business_id>
```

#### Parámetros de URL

- `id` (number): ID del miembro (BusinessMember)

#### Response (200 OK)

```json
{
  "message": "Empleado obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "ci": "87654321"
    },
    "role": {
      "code": "OWNER",
      "name": "Propietario"
    }
  }
}
```

---

### 4. Actualizar Miembro

Actualiza el rol o estado de un miembro.

**Endpoint:** `PATCH /api/v1/aim/business-member/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: <business_id>
```

#### Parámetros de URL

- `id` (number): ID del miembro

#### Request Body (todos los campos son opcionales)

```json
{
  "roleId": 3,
  "isActive": false
}
```

#### Validaciones

- `roleId`: Opcional, number, ID del nuevo rol
- `isActive`: Opcional, boolean, estado del miembro

#### Response (200 OK)

```json
{
  "message": "Miembro actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "role": {
      "id": 3,
      "name": "Gerente",
      "code": "MANAGER"
    },
    "user": {
      "id": 1,
      "name": "Juan Pérez"
    }
  }
}
```

---

### 5. Eliminar Miembro

Desvincula un miembro de un negocio.

**Endpoint:** `DELETE /api/v1/aim/business-member/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: <business_id>
```

#### Parámetros de URL

- `id` (number): ID del miembro

#### Response (200 OK)

```json
{
  "message": "Miembro eliminado exitosamente",
  "status": 200,
  "data": {
    "id": 1
  }
}
```

---

## 🔒 Seguridad

- **Todas las rutas requieren autenticación**: El middleware `authMiddleware` protege todas las rutas del módulo
- **Verificación de token**: El middleware valida el token JWT y verifica que el usuario exista en la base de datos
- **Multi-tenant**: El `businessId` se obtiene del header `x-business-id` y se valida en cada operación
- **Aislamiento de datos**: Solo se pueden ver/modificar miembros del negocio del usuario autenticado
- **Validación de pertenencia**: Se valida que el miembro pertenezca al negocio antes de actualizar/eliminar
- **Transacciones**: Las operaciones críticas (como agregar miembro) se realizan en transacciones para garantizar integridad

## 📝 Notas

- Al agregar un miembro, si el usuario no existe, se crea automáticamente
- La contraseña inicial del nuevo usuario es su CI (encriptada)
- `isActive: false` se usa para "despedir" sin eliminar el historial
- La eliminación es permanente y desvincula completamente al usuario del negocio
