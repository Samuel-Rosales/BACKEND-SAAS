# Módulo AIM - Roles

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/aim/role`

**Autenticación:** ❌ No requerida

**Endpoints:**
- `POST /` — Crear rol
- `GET /` — Listar roles
- `GET /:id` — Obtener rol
- `PATCH /:id` — Actualizar rol
- `DELETE /:id` — Eliminar rol

## 📍 Endpoints

Base URL: `/api/v1/aim/role`

**Autenticación:** No requerida (puede configurarse)

---

### 1. Crear Rol

Crea un nuevo rol en el sistema.

**Endpoint:** `POST /api/v1/aim/role`

#### Request Body

```json
{
  "name": "Super Administrador",
  "code": "SUPER_ADMIN"
}
```

#### Validaciones

- `name`: Obligatorio, string, mínimo 3 caracteres
- `code`: Obligatorio, string, solo mayúsculas y guiones bajos, debe ser único
  - Ejemplos válidos: `ADMIN`, `SUPER_ADMIN`, `CASHIER`
  - Ejemplos inválidos: `admin`, `super-admin`, `Admin123`

#### Response (201 Created)

```json
{
  "message": "Rol creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "name": "Super Administrador",
    "code": "SUPER_ADMIN"
  }
}
```

#### Response (400 Bad Request)

```json
{
  "message": "No se pudo crear el rol",
  "status": 400,
  "data": null
}
```

---

### 2. Listar Roles

Obtiene todos los roles del sistema.

**Endpoint:** `GET /api/v1/aim/role`

#### Response (200 OK)

```json
{
  "message": "Roles obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Super Administrador",
      "code": "SUPER_ADMIN"
    },
    {
      "id": 2,
      "name": "Administrador",
      "code": "ADMIN"
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay roles disponibles",
  "status": 404,
  "data": []
}
```

---

### 3. Obtener Rol por ID

Obtiene un rol específico por su ID.

**Endpoint:** `GET /api/v1/aim/role/:id`

#### Parámetros de URL

- `id` (number): ID del rol

#### Response (200 OK)

```json
{
  "message": "Rol obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Super Administrador",
    "code": "SUPER_ADMIN"
  }
}
```

---

### 4. Actualizar Rol

Actualiza los datos de un rol existente.

**Endpoint:** `PATCH /api/v1/aim/role/:id`

#### Parámetros de URL

- `id` (number): ID del rol

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Administrador Principal",
  "code": "ADMIN_PRINCIPAL"
}
```

#### Validaciones

- `name`: Opcional, string, mínimo 3 caracteres
- `code`: Opcional, string, solo mayúsculas y guiones bajos, debe ser único (excepto el mismo rol)

#### Response (200 OK)

```json
{
  "message": "Rol actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Administrador Principal",
    "code": "ADMIN_PRINCIPAL"
  }
}
```

---

### 5. Eliminar Rol

Elimina un rol del sistema.

**Endpoint:** `DELETE /api/v1/aim/role/:id`

#### Parámetros de URL

- `id` (number): ID del rol

#### Response (200 OK)

```json
{
  "message": "Rol eliminado exitosamente",
  "status": 200,
  "data": null
}
```

---

## 📝 Notas

- El código del rol (`code`) debe estar en **MAYÚSCULAS** y solo puede contener letras y guiones bajos
- El código debe ser único en el sistema
- Los roles se usan para asignar permisos a los miembros de los negocios

## 🔒 Seguridad

- Se valida que el código no esté duplicado antes de crear/actualizar
- La eliminación es permanente
