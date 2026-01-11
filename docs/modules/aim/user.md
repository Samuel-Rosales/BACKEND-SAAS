# Módulo AIM - Usuarios

## 📍 Endpoints

Base URL: `/api/v1/aim/user`

**Autenticación:** No requerida (puede configurarse)

---

### 1. Crear Usuario

Crea un nuevo usuario en el sistema.

**Endpoint:** `POST /api/v1/aim/user`

#### Request Body

```json
{
  "ci": "12345678",
  "name": "Juan Pérez",
  "password": "contraseña123"
}
```

#### Validaciones

- `ci`: Obligatorio, string, debe ser único
- `name`: Obligatorio, string, mínimo 2 caracteres
- `password`: Obligatorio, string, mínimo 6 caracteres

#### Response (201 Created)

```json
{
  "message": "Usuario creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "ci": "12345678"
  }
}
```

#### Response (400 Bad Request)

```json
{
  "message": "Error al crear el usuario",
  "status": 400,
  "data": null
}
```

---

### 2. Listar Usuarios

Obtiene todos los usuarios del sistema.

**Endpoint:** `GET /api/v1/aim/user`

#### Response (200 OK)

```json
{
  "message": "Usuarios obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Juan Pérez",
      "ci": "12345678"
    },
    {
      "id": 2,
      "name": "María García",
      "ci": "87654321"
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay usuarios registrados",
  "status": 404,
  "data": null
}
```

---

### 3. Obtener Usuario por ID

Obtiene un usuario específico por su ID.

**Endpoint:** `GET /api/v1/aim/user/:id`

#### Parámetros de URL

- `id` (number): ID del usuario

#### Response (200 OK)

```json
{
  "message": "Usuario obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "memberships": [],
    "contacts": null
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Usuario no encontrado",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Usuario

Actualiza los datos de un usuario existente.

**Endpoint:** `PATCH /api/v1/aim/user/:id`

#### Parámetros de URL

- `id` (number): ID del usuario

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Juan Carlos Pérez",
  "password": "nuevaContraseña123"
}
```

#### Validaciones

- `name`: Opcional, string, mínimo 2 caracteres
- `password`: Opcional, string, mínimo 6 caracteres (se encripta automáticamente)

#### Response (200 OK)

```json
{
  "message": "Usuario actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Juan Carlos Pérez",
    "contacts": null
  }
}
```

---

### 5. Eliminar Usuario

Elimina un usuario del sistema.

**Endpoint:** `DELETE /api/v1/aim/user/:id`

#### Parámetros de URL

- `id` (number): ID del usuario

#### Response (200 OK)

```json
{
  "message": "Usuario eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Response (404 Not Found)

```json
{
  "message": "Usuario no encontrado",
  "status": 404,
  "data": null
}
```

---

## 🔒 Seguridad

- Las contraseñas se encriptan con bcrypt antes de guardarse
- La contraseña nunca se retorna en las respuestas
- Se valida la unicidad de la cédula (CI)

## 📝 Notas

- El campo `ci` (cédula) debe ser único en el sistema
- Al actualizar la contraseña, se encripta automáticamente
- La eliminación es permanente (soft delete no implementado)
