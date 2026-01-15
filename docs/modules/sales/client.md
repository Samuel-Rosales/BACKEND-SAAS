# Módulo Sales - Clientes

## 📍 Endpoints

Base URL: `/api/v1/sales/client`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Cliente

Registra un nuevo cliente para el negocio.

**Endpoint:** `POST /api/v1/sales/client`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "name": "Juan Pérez",
  "ci": "V-12345678",
  "phone": "+58 212 1234567",
  "email": "juan.perez@example.com",
  "address": "Av. Principal 123, Caracas"
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-200 caracteres
- `ci`: Obligatorio, string, 3-20 caracteres, único por negocio (cédula/RIF/DNI)
- `phone`: Opcional, string, 1-50 caracteres
- `email`: Opcional, string, formato de email válido, máximo 255 caracteres
- `address`: Opcional, string, máximo 500 caracteres

#### Response (201 Created)

```json
{
  "message": "Cliente registrado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Juan Pérez",
    "ci": "V-12345678",
    "phone": "+58 212 1234567",
    "email": "juan.perez@example.com",
    "address": "Av. Principal 123, Caracas"
  }
}
```

#### Errores

- `400`: La cédula/RIF ya existe en este negocio
- `400`: El email tiene un formato inválido
- `500`: Error interno al registrar el cliente

---

### 2. Listar Clientes

Obtiene todos los clientes del negocio, ordenados por nombre.

**Endpoint:** `GET /api/v1/sales/client`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Response (200 OK)

```json
{
  "message": "Clientes obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "businessId": 1,
      "name": "Juan Pérez",
      "ci": "V-12345678",
      "phone": "+58 212 1234567",
      "email": "juan.perez@example.com",
      "address": "Av. Principal 123, Caracas"
    },
    {
      "id": 2,
      "businessId": 1,
      "name": "María García",
      "ci": "V-87654321",
      "phone": "+58 212 7654321",
      "email": "maria.garcia@example.com",
      "address": "Calle Comercial 456"
    }
  ]
}
```

#### Response (200 OK) - Sin Clientes

```json
{
  "message": "No hay clientes registrados aún",
  "status": 200,
  "data": []
}
```

---

### 3. Obtener Cliente por ID

Obtiene un cliente específico del negocio.

**Endpoint:** `GET /api/v1/sales/client/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del cliente

#### Response (200 OK)

```json
{
  "message": "Cliente encontrado",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Juan Pérez",
    "ci": "V-12345678",
    "phone": "+58 212 1234567",
    "email": "juan.perez@example.com",
    "address": "Av. Principal 123, Caracas"
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Cliente no encontrado",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Cliente

Actualiza los datos de un cliente existente.

**Endpoint:** `PATCH /api/v1/sales/client/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del cliente

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Juan Carlos Pérez",
  "phone": "+58 212 9999999",
  "email": "juan.carlos@example.com"
}
```

#### Validaciones

- `name`: Opcional, string, 2-200 caracteres
- `ci`: Opcional, string, 3-20 caracteres, único por negocio (no puede duplicar otra cédula)
- `phone`: Opcional, string, 1-50 caracteres
- `email`: Opcional, string, formato de email válido, máximo 255 caracteres
- `address`: Opcional, string, máximo 500 caracteres

#### Response (200 OK)

```json
{
  "message": "Cliente actualizado correctamente",
  "status": 200,
  "data": {
    "id": 1,
    "businessId": 1,
    "name": "Juan Carlos Pérez",
    "ci": "V-12345678",
    "phone": "+58 212 9999999",
    "email": "juan.carlos@example.com",
    "address": "Av. Principal 123, Caracas"
  }
}
```

#### Errores

- `404`: Cliente no encontrado para actualizar
- `400`: La cédula/RIF ya existe en otro cliente del negocio

---

### 5. Eliminar Cliente

Elimina un cliente. No se puede eliminar si tiene ventas registradas.

**Endpoint:** `DELETE /api/v1/sales/client/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros de URL

- `id` (number): ID del cliente

#### Response (200 OK)

```json
{
  "message": "Cliente eliminado permanentemente (No tenía historial de ventas)",
  "status": 200,
  "data": null
}
```

#### Response (409 Conflict)

```json
{
  "message": "No se puede eliminar: El cliente tiene 5 venta(s) registrada(s).",
  "status": 409,
  "data": null
}
```

#### Errores

- `404`: Cliente no encontrado
- `409`: No se puede eliminar porque tiene ventas registradas

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios clientes
- Protección de integridad: no se puede eliminar clientes con ventas asociadas
- Validación de cédula única por negocio

## 📝 Notas

- **Cédula/RIF/DNI:** El campo `ci` es único por negocio y se usa para identificar clientes
- **Eliminación:** Si el cliente tiene ventas registradas, no se puede eliminar para mantener el historial contable
- **Datos de Contacto:** Los campos `phone`, `email` y `address` son opcionales pero recomendados para mejor gestión
- **Multi-tenancy:** Cada negocio tiene su propia lista de clientes independiente
