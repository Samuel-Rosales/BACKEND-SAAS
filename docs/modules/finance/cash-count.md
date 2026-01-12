# Módulo Finance - Conteo de Caja

## 📍 Endpoints

Base URL: `/api/v1/finance/cash-count`

**Autenticación:** ✅ Requerida

**Header Multi-tenant:** `x-business-id: <businessId>`

---

### 1. Crear Conteo de Caja

Registra un conteo de billetes/monedas para una caja. Se usa para apertura, cierre o arqueo de caja.

**Endpoint:** `POST /api/v1/finance/cash-count`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Request Body

```json
{
  "cashRegisterId": 1,
  "denomination": 20.00,
  "quantity": 5,
  "currency": "USD",
  "exchangeRateId": 1,
  "type": "INITIAL"
}
```

#### Validaciones

- `cashRegisterId`: Obligatorio, number, debe existir la caja en el negocio
- `denomination`: Obligatorio, number, debe ser >= 0 (valor del billete/moneda)
- `quantity`: Obligatorio, number, debe ser >= 0 (cantidad de billetes/monedas)
- `currency`: Obligatorio, string, código ISO de 3 caracteres en mayúsculas
- `exchangeRateId`: Obligatorio, number, debe existir la tasa de cambio en el negocio
- `type`: Obligatorio, enum (`INITIAL`, `FINAL`, `AUDIT`)

#### Tipos de Conteo

- **INITIAL**: Conteo al abrir la caja
- **FINAL**: Conteo al cerrar la caja
- **AUDIT**: Arqueo sorpresa o auditoría

#### Response (201 Created)

```json
{
  "message": "Conteo de caja creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "cashRegisterId": 1,
    "denomination": 20.00,
    "quantity": 5,
    "currency": "USD",
    "exchangeRateId": 1,
    "type": "INITIAL",
    "cashRegister": {
      "id": 1,
      "status": "OPEN"
    },
    "exchangeRate": {
      "id": 1,
      "currency": "USD",
      "rate": 1.0000
    }
  }
}
```

#### Errores

- `404`: Caja no encontrada o no pertenece a este negocio
- `404`: Tasa de cambio no encontrada o no pertenece a este negocio

---

### 2. Listar Conteos por Caja

Obtiene todos los conteos de una caja específica, ordenados por tipo y denominación.

**Endpoint:** `GET /api/v1/finance/cash-count/cash-register/:cashRegisterId`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `cashRegisterId`: ID de la caja (número)

#### Response (200 OK)

```json
{
  "message": "Conteos de caja obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "cashRegisterId": 1,
      "denomination": 20.00,
      "quantity": 5,
      "currency": "USD",
      "exchangeRateId": 1,
      "type": "INITIAL",
      "exchangeRate": {
        "id": 1,
        "currency": "USD",
        "rate": 1.0000
      }
    },
    {
      "id": 2,
      "cashRegisterId": 1,
      "denomination": 20.00,
      "quantity": 25,
      "currency": "USD",
      "exchangeRateId": 1,
      "type": "FINAL",
      "exchangeRate": {
        "id": 1,
        "currency": "USD",
        "rate": 1.0000
      }
    }
  ]
}
```

**Ordenamiento:** Por tipo (INITIAL, FINAL, AUDIT) y luego por denominación descendente.

#### Errores

- `404`: Caja no encontrada o no pertenece a este negocio
- `404`: No hay conteos de caja registrados (retorna array vacío)

---

### 3. Obtener Conteo por ID

Obtiene un conteo específico.

**Endpoint:** `GET /api/v1/finance/cash-count/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del conteo (número)

#### Response (200 OK)

```json
{
  "message": "Conteo de caja obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "cashRegisterId": 1,
    "denomination": 20.00,
    "quantity": 5,
    "currency": "USD",
    "exchangeRateId": 1,
    "type": "INITIAL",
    "cashRegister": {
      "id": 1,
      "status": "OPEN"
    },
    "exchangeRate": {
      "id": 1,
      "currency": "USD",
      "rate": 1.0000
    }
  }
}
```

#### Errores

- `404`: Conteo de caja no encontrado o no pertenece a este negocio

---

### 4. Actualizar Conteo

Actualiza un conteo existente.

**Endpoint:** `PATCH /api/v1/finance/cash-count/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del conteo (número)

#### Request Body

```json
{
  "quantity": 10,
  "denomination": 20.00
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

**Nota:** Los campos `cashRegisterId` y `type` no se pueden actualizar.

#### Validaciones

- `denomination`: Opcional, number, debe ser >= 0
- `quantity`: Opcional, number, debe ser >= 0
- `currency`: Opcional, string, código ISO de 3 caracteres
- `exchangeRateId`: Opcional, number, debe existir la tasa de cambio en el negocio

#### Response (200 OK)

```json
{
  "message": "Conteo de caja actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "cashRegisterId": 1,
    "denomination": 20.00,
    "quantity": 10,
    "currency": "USD",
    "exchangeRateId": 1,
    "type": "INITIAL",
    "cashRegister": {
      "id": 1,
      "status": "OPEN"
    },
    "exchangeRate": {
      "id": 1,
      "currency": "USD",
      "rate": 1.0000
    }
  }
}
```

#### Errores

- `404`: Conteo de caja no encontrado o no pertenece a este negocio
- `404`: Tasa de cambio no encontrada o no pertenece a este negocio

---

### 5. Eliminar Conteo

Elimina un conteo de caja.

**Endpoint:** `DELETE /api/v1/finance/cash-count/:id`

**Headers:**
```
Authorization: Bearer <token>
x-business-id: 1
```

#### Parámetros

- `id`: ID del conteo (número)

#### Response (200 OK)

```json
{
  "message": "Conteo de caja eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Conteo de caja no encontrado o no pertenece a este negocio

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Filtrado multi-tenant por `businessId` (header `x-business-id`)
- Un negocio solo puede gestionar sus propios conteos
- Los conteos están vinculados a una caja específica
- Se requiere una tasa de cambio válida para cada conteo
- El tipo de conteo (INITIAL, FINAL, AUDIT) no se puede modificar después de creado
