# Módulo Inventory - Productos (v2)

## ✅ Resumen de Endpoints

Base URL: `/api/v1/inventory/product`

**Autenticación:** ✅ Requerida (Bearer Token)
**Header Multi-tenant:** 🟢 Requerido (`x-business-id`)

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/` | **Crear Producto** (Soporta Recetas/Combos) |
| `GET` | `/` | **Listar Productos** (Con stock calculado y filtros) |
| `GET` | `/:id` | **Obtener Producto** (Detalle completo, receta y lotes) |
| `PATCH` | `/:id` | **Actualizar Producto** (Edición de datos y recetas) |
| `DELETE` | `/:id` | **Eliminar Producto** (Lógica Híbrida: Soft/Hard Delete) |

---

## 📍 Detalle de Endpoints

### 1. Crear Producto

Registra un nuevo producto en el catálogo. Soporta la creación transaccional de **Productos Compuestos (Recetas)** en un solo paso.

**Endpoint:** `POST /api/v1/inventory/product`

#### Request Body (Producto Simple)

```json
{
  "name": "Harina Pan 1kg",
  "sku": "HAR-001",
  "description": "Harina de maíz precocida",
  "imageUrl": "https://...",
  "categoryId": 5,
  "unitId": 1, // Unidad base (ej: Kg o Unidad)
  "taxId": 1,
  
  // Clasificación
  "type": "SIMPLE", // "SIMPLE" | "COMPOSITE" | "SERVICE"
  "isPerishable": true,

  // Finanzas
  "costPrice": 1.00,
  "profitMargin": 0.30,
  "salePrice": 1.30,
  "minStock": 10
}

```

#### Request Body (Producto Compuesto / Receta)

*Ejemplo: Una Hamburguesa que descuenta Pan y Carne.*

```json
{
  "name": "Hamburguesa Clásica",
  "sku": "FOOD-HAM-001",
  "categoryId": 10,
  "unitId": 1, 
  "taxId": 2,
  
  "type": "COMPOSITE", // <--- IMPORTANTE
  "isPerishable": false, // El plato servido no vence en stock (se cocina al momento)
  
  "costPrice": 2.50, // Costo calculado (puede ser manual o auto-sumado)
  "profitMargin": 0.50,
  "salePrice": 5.00,

  // La Receta: Qué se descuenta del inventario al vender esto
  "components": [
    { "childProductId": 50, "quantity": 1 },   // 1 Pan
    { "childProductId": 51, "quantity": 0.200 } // 0.200 Kg de Carne (200g)
  ]
}

```

#### Validaciones

* **SKU:** Debe ser único dentro del negocio.
* **Relaciones:** `categoryId`, `unitId`, `taxId` deben existir.
* **Recetas:** Si `type === COMPOSITE`, el array `components` es obligatorio y sus ingredientes (`childProductId`) deben existir y pertenecer al negocio.

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Producto creado exitosamente",
  "data": {
    "id": 100,
    "name": "Hamburguesa Clásica",
    "type": "COMPOSITE",
    "currentStock": 0, // Inicia en 0 hasta que haya producción o compra
    "components": [
       { "childProductId": 50, "quantity": 1, "child": { "name": "Pan" } }
    ]
  }
}

```

---

### 2. Listar Productos

Obtiene el catálogo con paginación y **Stock Actual Calculado** (suma de lotes).

**Endpoint:** `GET /api/v1/inventory/product`

#### Query Params

* `page`: number (def: 1)
* `limit`: number (def: 20)
* `search`: string (Busca por nombre o SKU)
* `categoryId`: number (Filtrar por categoría)

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Productos obtenidos exitosamente",
  "data": [
    {
      "id": 100,
      "name": "Harina Pan 1kg",
      "sku": "HAR-001",
      "category": { "name": "Víveres" },
      "unit": { "symbol": "und" },
      "salePrice": "1.30",
      "type": "SIMPLE",
      // Campo calculado en backend (Suma de todos los lotes en todos los depósitos)
      "currentStock": 150 
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "lastPage": 3
  }
}

```

---

### 3. Obtener Producto (Detalle)

Devuelve la radiografía completa del producto.

**Endpoint:** `GET /api/v1/inventory/product/:id`

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Producto encontrado",
  "data": {
    "id": 100,
    "name": "Hamburguesa Clásica",
    "type": "COMPOSITE",
    "currentStock": 0, // Stock físico directo (para recetas suele ser 0)
    
    // 1. Dónde está mi stock (si es físico)
    "stockLots": [
       { "quantity": 10, "depot": { "name": "Almacén Central" }, "expirationDate": "..." }
    ],

    // 2. Si soy Receta, qué ingredientes llevo
    "components": [
       { "childProductId": 50, "quantity": 1, "child": { "name": "Pan Burger" } }
    ],

    // 3. Si soy Ingrediente, en qué platos me usan
    "componentOf": [
       { "parent": { "id": 200, "name": "Combo Familiar" } }
    ],

    // 4. Estadísticas rápidas
    "_count": {
       "saleItems": 450, // Veces vendido
       "purchaseItems": 0
    }
  }
}

```

---

### 4. Actualizar Producto

Permite editar datos básicos y **reconfigurar la receta** (si aplica).

**Endpoint:** `PATCH /api/v1/inventory/product/:id`

#### Lógica de Actualización de Recetas

Si el producto es `COMPOSITE` y envías el array `components`, el sistema:

1. **Borra** los ingredientes anteriores de este producto.
2. **Crea** las nuevas relaciones con las nuevas cantidades.
*Esto permite editar recetas completas simplemente enviando la nueva versión.*

#### Request Body

```json
{
  "salePrice": 6.00,
  "components": [ // Receta actualizada (más carne)
    { "childProductId": 50, "quantity": 1 },
    { "childProductId": 51, "quantity": 0.250 } 
  ]
}

```

---

### 5. Eliminar Producto (Smart Delete)

Aplica una lógica híbrida de seguridad para proteger la integridad contable.

**Endpoint:** `DELETE /api/v1/inventory/product/:id`

#### Escenario A: Bloqueo por Stock (409 Conflict)

Si el producto tiene existencias físicas (`stockLots > 0`), **no se puede eliminar ni archivar**.

> *Solución:* El usuario debe hacer un "Ajuste de Salida" para llevar el stock a 0 primero.

#### Escenario B: Archivar (Soft Delete)

Si el producto tiene historial (se ha vendido, comprado o movido) pero ya no tiene stock:

* **Acción:** `isActive = false`
* **Mensaje:** "Producto archivado correctamente (Se mantiene el historial contable)"

#### Escenario C: Borrado Físico (Hard Delete)

Si el producto se creó por error, nunca se movió y no tiene stock:

* **Acción:** `DELETE FROM DB`
* **Mensaje:** "Producto eliminado permanentemente"

#### Response (Ejemplo Archivar)

```json
{
  "status": 200,
  "message": "Producto archivado correctamente (Se mantiene el historial contable)",
  "data": {
    "id": 100,
    "isActive": false
  }
}

```

---

## ⚠️ Enums Importantes (Frontend)

**ProductType:**

* `SIMPLE`: Producto físico estándar (se compra, almacena y vende).
* `COMPOSITE`: Producto lógico (Receta, Combo, Kit). Su stock depende de sus ingredientes.
* `SERVICE`: Intangible (Envío, Mano de obra). No maneja stock.