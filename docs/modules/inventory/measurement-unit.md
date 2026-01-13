# Módulo Inventory - Unidades de Medida

## 📍 Endpoints

Base URL: `/api/v1/inventory/measurement-unit`

**Autenticación:** ✅ Requerida

**Nota:** Este módulo es global (no multi-tenant), las unidades de medida son compartidas por todos los negocios.

---

### 1. Crear Unidad de Medida

Crea una nueva unidad de medida global para el sistema.

**Endpoint:** `POST /api/v1/inventory/measurement-unit`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "name": "Kilogramo",
  "symbol": "kg"
}
```

#### Validaciones

- `name`: Obligatorio, string, debe ser único
- `symbol`: Obligatorio, string, debe ser único

#### Response (201 Created)

```json
{
  "message": "Unidad de medida creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "name": "Kilogramo",
    "symbol": "kg",
    "isActive": true
  }
}
```

#### Errores

- `409`: Ya existe una unidad con el mismo nombre o símbolo

---

### 2. Listar Unidades de Medida

Obtiene todas las unidades de medida activas del sistema.

**Endpoint:** `GET /api/v1/inventory/measurement-unit`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Unidades obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Kilogramo",
      "symbol": "kg",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Litro",
      "symbol": "L",
      "isActive": true
    },
    {
      "id": 3,
      "name": "Unidad",
      "symbol": "u",
      "isActive": true
    }
  ]
}
```

---

### 3. Obtener Unidad de Medida por ID

Obtiene una unidad de medida específica.

**Endpoint:** `GET /api/v1/inventory/measurement-unit/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros de URL

- `id` (number): ID de la unidad de medida

#### Response (200 OK)

```json
{
  "message": "Unidad de medida encontrada",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Kilogramo",
    "symbol": "kg",
    "isActive": true
  }
}
```

#### Response (404 Not Found)

```json
{
  "message": "Unidad de medida no encontrada",
  "status": 404,
  "data": null
}
```

---

### 4. Actualizar Unidad de Medida

Actualiza una unidad de medida existente.

**Endpoint:** `PATCH /api/v1/inventory/measurement-unit/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros de URL

- `id` (number): ID de la unidad de medida

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Kilogramo (kg)",
  "symbol": "kg",
  "isActive": false
}
```

#### Validaciones

- `name`: Opcional, string, debe ser único
- `symbol`: Opcional, string, debe ser único
- `isActive`: Opcional, boolean

#### Response (200 OK)

```json
{
  "message": "Unidad de medida actualizada",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Kilogramo (kg)",
    "symbol": "kg",
    "isActive": false
  }
}
```

#### Errores

- `404`: Unidad de medida no encontrada
- `409`: Nombre o símbolo ya en uso por otra unidad

---

### 5. Eliminar Unidad de Medida

Elimina una unidad de medida. No se puede eliminar si tiene productos asociados.

**Endpoint:** `DELETE /api/v1/inventory/measurement-unit/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros de URL

- `id` (number): ID de la unidad de medida

#### Response (200 OK)

```json
{
  "message": "Unidad de medida eliminada exitosamente",
  "status": 200,
  "data": null
}
```

#### Response (409 Conflict)

```json
{
  "message": "No se puede eliminar: La unidad \"Kilogramo\" está asignada a 15 producto(s).",
  "status": 409,
  "data": null
}
```

#### Errores

- `404`: Unidad de medida no encontrada
- `409`: No se puede eliminar porque tiene productos asociados

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Este módulo es global (no multi-tenant)
- El nombre y símbolo deben ser únicos
- Protección de integridad: no se puede eliminar unidades con productos asociados

## 📝 Notas

- Las unidades de medida son compartidas por todos los negocios
- Se recomienda desactivar unidades en lugar de eliminarlas para mantener el historial
- El campo `isActive` permite ocultar unidades sin eliminarlas
