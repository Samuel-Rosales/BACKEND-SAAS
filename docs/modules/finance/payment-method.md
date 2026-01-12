# Módulo Finance - Métodos de Pago

## 📍 Endpoints

Base URL: `/api/v1/finance/payment-method`

**Autenticación:** ✅ Requerida

**Nota:** Este módulo es global (no multi-tenant), los métodos de pago son compartidos por todos los negocios.

---

### 1. Crear Método de Pago

Crea un nuevo método de pago global para el sistema.

**Endpoint:** `POST /api/v1/finance/payment-method`

**Headers:**
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "name": "Zelle Banesco",
  "type": "ZELLE",
  "isActive": true
}
```

#### Validaciones

- `name`: Obligatorio, string, 2-100 caracteres, único en el sistema
- `type`: Obligatorio, enum (`CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `MOBILE_PAYMENT`, `ZELLE`, `OTHER`)
- `isActive`: Opcional, boolean (default: true)

#### Tipos de Pago Disponibles

- **CASH**: Efectivo
- **DEBIT_CARD**: Tarjeta de débito
- **CREDIT_CARD**: Tarjeta de crédito
- **TRANSFER**: Transferencia bancaria
- **MOBILE_PAYMENT**: Pago móvil
- **ZELLE**: Zelle
- **OTHER**: Otro

#### Response (201 Created)

```json
{
  "message": "Método de pago creado exitosamente",
  "status": 201,
  "data": {
    "id": 1,
    "name": "Zelle Banesco",
    "type": "ZELLE",
    "isActive": true
  }
}
```

#### Errores

- `400`: Ya existe un método de pago con ese nombre

---

### 2. Listar Métodos de Pago

Obtiene todos los métodos de pago del sistema.

**Endpoint:** `GET /api/v1/finance/payment-method`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Métodos de pago obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Zelle Banesco",
      "type": "ZELLE",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Efectivo",
      "type": "CASH",
      "isActive": true
    }
  ]
}
```

#### Errores

- `404`: No hay métodos de pago registrados (retorna array vacío)

---

### 3. Listar Métodos de Pago Activos

Obtiene solo los métodos de pago activos.

**Endpoint:** `GET /api/v1/finance/payment-method/active`

**Headers:**
```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "message": "Métodos de pago activos obtenidos exitosamente",
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Zelle Banesco",
      "type": "ZELLE",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Efectivo",
      "type": "CASH",
      "isActive": true
    }
  ]
}
```

---

### 4. Obtener Método de Pago por ID

Obtiene un método de pago específico.

**Endpoint:** `GET /api/v1/finance/payment-method/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros

- `id`: ID del método de pago (número)

#### Response (200 OK)

```json
{
  "message": "Método de pago obtenido exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Zelle Banesco",
    "type": "ZELLE",
    "isActive": true
  }
}
```

#### Errores

- `404`: Método de pago no encontrado

---

### 5. Actualizar Método de Pago

Actualiza un método de pago existente.

**Endpoint:** `PATCH /api/v1/finance/payment-method/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros

- `id`: ID del método de pago (número)

#### Request Body

```json
{
  "isActive": false
}
```

**Todos los campos son opcionales**, pero al menos uno debe ser enviado.

**Nota:** El campo `name` no se puede actualizar (es único y se usa como identificador).

#### Validaciones

- `type`: Opcional, enum (`CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `MOBILE_PAYMENT`, `ZELLE`, `OTHER`)
- `isActive`: Opcional, boolean

#### Response (200 OK)

```json
{
  "message": "Método de pago actualizado exitosamente",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Zelle Banesco",
    "type": "ZELLE",
    "isActive": false
  }
}
```

#### Errores

- `404`: Método de pago no encontrado

---

### 6. Eliminar Método de Pago

Elimina un método de pago. No se puede eliminar si tiene pagos asociados (ventas o compras).

**Endpoint:** `DELETE /api/v1/finance/payment-method/:id`

**Headers:**
```
Authorization: Bearer <token>
```

#### Parámetros

- `id`: ID del método de pago (número)

#### Response (200 OK)

```json
{
  "message": "Método de pago eliminado exitosamente",
  "status": 200,
  "data": null
}
```

#### Errores

- `404`: Método de pago no encontrado
- `400`: No se puede eliminar el método de pago porque tiene pagos asociados. Se recomienda desactivarlo en su lugar.

---

## 🔒 Seguridad

- Todos los endpoints requieren autenticación
- Este módulo es global (no multi-tenant)
- El nombre del método de pago debe ser único
- Protección de integridad: no se puede eliminar métodos con pagos asociados
- Se recomienda desactivar métodos en lugar de eliminarlos para mantener el historial
