# Módulo Platform - Negocios

## ✅ Endpoints actuales (v2026-01-26)

Base URL: `/api/v1/platform/business`

**Autenticación:** ✅ Requerida (JWT)

**Endpoints:**

* **Creación y Listado:**
* `POST /` — Crear negocio
* `GET /my-businesses` — Listar negocios del usuario


* **Lectura:**
* `GET /:id` — Obtener datos básicos (Header/Dashboard)
* `GET /:id/settings` — **[NUEVO]** Obtener configuración completa (DTO para formulario)


* **Actualización Segmentada:**
* `PATCH /:id/general` — **[NUEVO]** Actualizar perfil (Nombre, Logo, Dirección)
* `PATCH /:id/policies` — **[NUEVO]** Actualizar reglas de negocio (Créditos)
* `PATCH /:id/exchange-rate` — Actualizar configuración de tasas



---

### 1. Crear Negocio

Crea un nuevo negocio con suscripción trial y asigna al usuario como propietario.

**Endpoint:** `POST /api/v1/platform/business`

#### Request Body

```json
{
  "name": "Mi Super Negocio",
  "address": "Av. Principal 123",
  "logoUrl": "https://ejemplo.com/logo.png",
  "businessCategoryId": 1
}

```

#### Validaciones

* `name`: Obligatorio, 2-100 caracteres.
* `address`: Obligatorio, 5-200 caracteres.
* `businessCategoryId`: Obligatorio, ID válido.

#### Response (201 Created)

Se inicializa con valores por defecto: `enableGlobalCredit: true`, `defaultCreditLimit: 100`.

```json
{
  "message": "Negocio creado exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Super Negocio",
    "enableGlobalCredit": true,
    "defaultCreditLimit": "100.00",
    "subscription": { "planType": "TRIAL", "status": "ACTIVE" },
    "memberRole": "Dueño"
    // ... resto de campos
  }
}

```

---

### 2. Listar Mis Negocios

Obtiene todos los negocios donde el usuario es miembro activo.

**Endpoint:** `GET /api/v1/platform/business/my-businesses`

#### Response (200 OK)

```json
{
  "message": "Negocios obtenidos exitosamente",
  "data": [
    {
      "id": 1,
      "name": "Mi Super Negocio",
      "memberRole": "Dueño",
      "subscription": { "status": "ACTIVE" }
    }
  ]
}

```

---

### 3. Obtener Negocio (Básico)

Obtiene la información básica del negocio. Ideal para headers, validación de acceso o dashboards generales.

**Endpoint:** `GET /api/v1/platform/business/:id`

#### Response (200 OK)

```json
{
  "message": "Empresa obtenida exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Super Negocio",
    "logoUrl": "https://ejemplo.com/logo.png",
    "memberRole": "Dueño",
    "exchangeRates": [{ "rate": "54.30" }] // Última tasa histórica
  }
}

```

---

### 4. Obtener Configuración (Settings DTO) [NUEVO]

Devuelve un objeto estructurado específicamente para poblar el formulario de configuración (tipo VS Code/Discord). Transforma los `Decimal` de base de datos a `number` nativos.

**Endpoint:** `GET /api/v1/platform/business/:id/settings`

#### Response (200 OK)

```json
{
  "message": "Configuración recuperada",
  "data": {
    "general": {
      "name": "Mi Super Negocio",
      "address": "Av. Principal 123",
      "logoUrl": "https://ejemplo.com/logo.png",
      "businessCategoryId": 1
    },
    "rates": {
      "strategy": "MANUAL",
      "manualRate": 45.50,      // number, no string
      "currentRate": 45.50      // number, no string
    },
    "policies": {
      "enableGlobalCredit": true,
      "defaultCreditLimit": 100.00 // number, no string
    }
  }
}

```

---

### 5. Actualizar General (Perfil) [NUEVO]

Actualiza únicamente información cosmética o de identificación.

**Endpoint:** `PATCH /api/v1/platform/business/:id/general`

**Permisos:** `OWNER`, `ADMIN`.

#### Request Body

```json
{
  "name": "Nuevo Nombre S.A.",
  "logoUrl": "", // Enviar vacío para eliminar logo
  "address": "Calle Nueva 123"
}

```

#### Response (200 OK)

```json
{
  "message": "Información general actualizada",
  "data": { "id": 1, "name": "Nuevo Nombre S.A." /*...*/ }
}

```

---

### 6. Actualizar Políticas (Reglas) [NUEVO]

Actualiza reglas financieras y operativas globales.

**Endpoint:** `PATCH /api/v1/platform/business/:id/policies`

**Permisos:** Estrictamente `OWNER`.

#### Request Body

```json
{
  "enableGlobalCredit": false,
  "defaultCreditLimit": 500.00
}

```

#### Validaciones

* `defaultCreditLimit`: Debe ser mayor o igual a 0.

#### Response (200 OK)

```json
{
  "message": "Políticas de negocio actualizadas",
  "data": {
    "enableGlobalCredit": false,
    "defaultCreditLimit": 500
  }
}

```

---

### 7. Configurar Tasa de Cambio

Actualiza la estrategia de tasa de cambio y el valor actual (si es manual).

**Endpoint:** `PATCH /api/v1/platform/business/:id/exchange-rate`

**Permisos:** `OWNER`, `ADMIN`.

#### Request Body

```json
{
  "strategy": "MANUAL", // o 'API_BCV', 'API_PARALLEL'
  "manualRate": 55.20   // Requerido solo si strategy es MANUAL
}

```

#### Validaciones

* `strategy`: Enum válido.
* `manualRate`: Obligatorio si es MANUAL, debe ser > 0.
* Si es `API_*`: El sistema debe tener una tasa global cargada previamente, de lo contrario retorna error `400`.

#### Response (200 OK)

```json
{
  "message": "Configuración de tasa actualizada exitosamente",
  "data": {
    "strategy": "MANUAL",
    "currentRate": "55.2000"
  }
}

```

---

## 🔒 Seguridad y Permisos (RBAC)

1. **Nivel Rutas:** Todas requieren token Bearer válido.
2. **Nivel Recurso:** El usuario debe ser miembro activo (`isActive: true`) del negocio `id`.
3. **Nivel Acción (Roles):**
* **Lectura (`GET`):** Cualquier miembro activo.
* **General (`PATCH .../general`):** `OWNER`, `ADMIN`.
* **Tasas (`PATCH .../exchange-rate`):** `OWNER`, `ADMIN`.
* **Políticas (`PATCH .../policies`):** Solo `OWNER` (Protección crítica de activos).



## ⚠️ Códigos de Error Clave

* **400 Bad Request:** Datos inválidos (ej. límite de crédito negativo, tasa manual <= 0).
* **403 Forbidden:**
* Usuario no pertenece al negocio.
* Usuario intenta editar Políticas sin ser `OWNER`.


* **404 Not Found:** Negocio no existe.