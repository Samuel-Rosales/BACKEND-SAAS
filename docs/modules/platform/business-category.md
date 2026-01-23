# Módulo Platform - Categorías de Negocio

## ✅ Endpoints actuales (v2026-01-23)

Base URL: `/api/v1/platform/business-category`

**Autenticación:** ❌ No requerida

**Endpoints:**
- `POST /` — Crear categoría
- `GET /` — Listar categorías
- `GET /:id` — Obtener categoría
- `PATCH /:id` — Actualizar categoría
- `DELETE /:id` — Eliminar categoría

## 📍 Endpoints

Base URL: `/api/v1/platform/business-category`

**Autenticación:** No requerida (puede configurarse)

---

### 1. Crear Categoría

Crea una nueva categoría de negocio.

**Endpoint:** `POST /api/v1/platform/business-category`

#### Request Body

```json
{
  "name": "Restaurante",
  "description": "Negocios dedicados a la preparación y venta de alimentos"
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-100 caracteres
- `description`: Obligatorio, string, 5-500 caracteres

#### Response (201 Created)

```json
{
  "message": "Categoría de negocio creada exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "name": "Restaurante",
    "description": "Negocios dedicados a la preparación y venta de alimentos"
  }
}
```

---

### 2. Listar Categorías

Obtiene todas las categorías de negocio con el conteo de negocios asociados.

**Endpoint:** `GET /api/v1/platform/business-category`

#### Response (200 OK)

```json
{
  "message": "Categorías de negocio obtenidas exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Restaurante",
      "description": "Negocios dedicados a la preparación y venta de alimentos",
      "_count": {
        "businesses": 5
      }
    },
    {
      "id": 2,
      "name": "Retail",
      "description": "Tiendas de venta al por menor",
      "_count": {
        "businesses": 3
      }
    }
  ]
}
```

#### Response (404 Not Found)

```json
{
  "message": "No hay categorías de negocio disponibles",
  "status": 404,
  "data": []
}
```

---

### 3. Obtener Categoría por ID

Obtiene una categoría específica con el conteo de negocios.

**Endpoint:** `GET /api/v1/platform/business-category/:id`

#### Parámetros de URL

- `id` (number): ID de la categoría

#### Response (200 OK)

```json
{
  "message": "Categoría de negocio obtenida exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Restaurante",
    "description": "Negocios dedicados a la preparación y venta de alimentos",
    "_count": {
      "businesses": 5
    }
  }
}
```

---

### 4. Actualizar Categoría

Actualiza los datos de una categoría.

**Endpoint:** `PATCH /api/v1/platform/business-category/:id`

#### Parámetros de URL

- `id` (number): ID de la categoría

#### Request Body (todos los campos son opcionales)

```json
{
  "name": "Restaurante y Cafetería",
  "description": "Negocios de comida y bebidas"
}
```

#### Validaciones

- `name`: Opcional, string, 2-100 caracteres
- `description`: Opcional, string, 5-500 caracteres

#### Response (200 OK)

```json
{
  "message": "Categoría de negocio actualizada exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Restaurante y Cafetería",
    "description": "Negocios de comida y bebidas"
  }
}
```

---

### 5. Eliminar Categoría

Elimina una categoría (solo si no tiene negocios asociados).

**Endpoint:** `DELETE /api/v1/platform/business-category/:id`

#### Parámetros de URL

- `id` (number): ID de la categoría

#### Response (200 OK)

```json
{
  "message": "Categoría de negocio eliminada exitosamente",
  "status": 200,
  "data": null
}
```

#### Response (400 Bad Request)

```json
{
  "message": "No se puede eliminar la categoría porque tiene 5 negocio(s) asociado(s)",
  "status": 400,
  "data": null
}
```

---

## 🔒 Protección de Integridad

- No se puede eliminar una categoría si tiene negocios asociados
- El sistema verifica el conteo antes de permitir la eliminación
- Se muestra cuántos negocios están asociados en el mensaje de error

## 📝 Notas

- Las categorías se usan para clasificar los negocios
- El conteo de negocios (`_count.businesses`) se incluye en las respuestas
- La eliminación es permanente si no hay negocios asociados
