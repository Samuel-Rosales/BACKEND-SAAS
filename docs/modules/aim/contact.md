# Módulo AIM - Contactos de Usuario

## 📍 Endpoints

Base URL: `/api/v1/aim/contact`

**Autenticación:** ✅ Requerida

---

### 1. Crear Contacto

Crea la información de contacto para un usuario. Un usuario solo puede tener un contacto (relación 1:1).

**Endpoint:** `POST /api/v1/aim/contact`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "email": "usuario@ejemplo.com",
  "phone": "+584121234567",
  "address": "Av. Principal 123",
  "city": "Caracas",
  "state": "Distrito Capital"
}
```

#### Validaciones

- `email`: Obligatorio, string, debe ser email válido y único
- `phone`: Obligatorio, string, 10-20 caracteres
- `address`: Obligatorio, string, 5-200 caracteres
- `city`: Obligatorio, string, 2-100 caracteres
- `state`: Obligatorio, string, 2-100 caracteres

**Nota:** El `userId` se obtiene automáticamente del token de autenticación.

#### Response (201 Created)

```json
{
  "message": "Contacto creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "userId": 5,
    "email": "usuario@ejemplo.com",
    "phone": "+584121234567",
    "address": "Av. Principal 123",
    "city": "Caracas",
    "state": "Distrito Capital"
  }
}
```

#### Errores

- `400`: El usuario ya tiene un contacto registrado
- `400`: El email ya está en uso por otro usuario
- `404`: Usuario no encontrado

---

### 2. Obtener Contacto del Usuario Autenticado

Obtiene la información de contacto del usuario autenticado.

**Endpoint:** `GET /api/v1/aim/contact`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Contacto obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "userId": 5,
    "email": "usuario@ejemplo.com",
    "phone": "+584121234567",
    "address": "Av. Principal 123",
    "city": "Caracas",
    "state": "Distrito Capital"
  }
}
```

#### Errores

- `404`: El usuario no tiene contacto registrado

---

### 3. Actualizar Contacto

Actualiza la información de contacto del usuario autenticado.

**Endpoint:** `PATCH /api/v1/aim/contact`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "email": "nuevo@ejemplo.com",
  "phone": "+584129876543",
  "address": "Nueva dirección 456",
  "city": "Valencia",
  "state": "Carabobo"
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

#### Validaciones

- `email`: Opcional, string, debe ser email válido y único (si se proporciona)
- `phone`: Opcional, string, 10-20 caracteres
- `address`: Opcional, string, 5-200 caracteres
- `city`: Opcional, string, 2-100 caracteres
- `state`: Opcional, string, 2-100 caracteres

#### Response (200 OK)

```json
{
  "message": "Contacto actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "userId": 5,
    "email": "nuevo@ejemplo.com",
    "phone": "+584129876543",
    "address": "Nueva dirección 456",
    "city": "Valencia",
    "state": "Carabobo"
  }
}
```

#### Errores

- `404`: El usuario no tiene contacto registrado
- `400`: El email ya está en uso por otro usuario

---

### 4. Eliminar Contacto

Elimina la información de contacto del usuario autenticado.

**Endpoint:** `DELETE /api/v1/aim/contact`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Contacto eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: El usuario no tiene contacto registrado

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- El `userId` se obtiene automáticamente del token JWT
- Un usuario solo puede gestionar su propio contacto
- El email debe ser único en todo el sistema
