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
# Módulo Inventory - Productos (v3)

Base URL: `/api/v1/inventory/product`

**Autenticación:** Requerida (Bearer Token)

**Header multi-tenant (requerido):** `x-business-id: <number>`

---

## Contrato común (frontend)

### Envelope de respuesta

Todos los endpoints responden con el mismo envelope:

```json
{
  "status": 200,
  "message": "...",
  "data": {}
}
```

En errores se mantiene el envelope, con `data: null`:

```json
{
  "status": 400,
  "message": "...",
  "data": null
}
```

### Importante: Decimals de Prisma en JSON

En este módulo hay endpoints que devuelven **objetos Prisma “crudos”** (con `Decimal`). En JSON, esos valores normalmente llegan como **string**.

Regla práctica para el frontend:

- `GET /` (listar): precios/márgenes/factores suelen venir como **string**.
- `GET /:id` (detalle): varios campos financieros vienen como **number** (sanitizado con `Decimal(...).toNumber()`).
- `POST /` (create) y `PATCH /:id` (update): devuelven Prisma crudo → decimales típicamente como **string**.

---

## ✅ Resumen de endpoints

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/` | Crear producto (SIMPLE/COMPOSITE/SERVICE) |
| `GET` | `/` | Listar productos (con `currentStock` calculado + filtros) |
| `GET` | `/:id` | Obtener un producto (detalle sanitizado + receta + stockByDepot) |
| `PATCH` | `/:id` | Actualizar producto (datos y/o receta, recalcula costo y puede recalcular precio) |
| `DELETE` | `/:id` | Eliminar inteligente (bloqueo por stock / soft delete / hard delete) |

---

## Tipos (shape esperado)

### ProductType

- `SIMPLE`: producto físico (maneja lotes y stock real)
- `COMPOSITE`: receta/combo/kit (stock calculado por “factor limitante”)
- `SERVICE`: intangible (stock siempre 0)

### Stock por depósito (`stockByDepot`)

Este módulo devuelve el stock agrupado por depósito en un array:

```ts
type StockLotSummary = {
  quantity: number;
  expirationDate: string; // ISO (DateTime)
  lotCost: number;        // actualmente no se expone el costo real (ver nota)
}

type DepotStockSummary = {
  depotId: number;
  name: string;
  stockLots: StockLotSummary[];
}
```

Nota importante: aunque el objeto incluye `lotCost`, la implementación actual **no está exponiendo el costo real** en este módulo, por lo que el frontend debe tratarlo como informativo/0.

---

## 1) Crear producto

**Endpoint:** `POST /api/v1/inventory/product`

### Body (SIMPLE / SERVICE)

```json
{
  "name": "Harina Pan 1kg",
  "sku": "HAR-001",
  "description": "Harina de maíz precocida",
  "imageUrl": "https://...",
  "categoryId": 5,
  "unitId": 1,
  "taxId": 1,
  "type": "SIMPLE",
  "isPerishable": true,
  "costPrice": 1.0,
  "profitMargin": 0.3,
  "salePrice": 1.3,
  "minStock": 10
}
```

### Body (COMPOSITE / receta)

```json
{
  "name": "Hamburguesa Clásica",
  "sku": "FOOD-HAM-001",
  "description": "",
  "imageUrl": null,
  "categoryId": 10,
  "unitId": 1,
  "taxId": 2,
  "type": "COMPOSITE",
  "isPerishable": false,
  "costPrice": 2.5,
  "profitMargin": 0.5,
  "salePrice": 5.0,
  "components": [
    { "childProductId": 50, "quantity": 1 },
    { "childProductId": 51, "quantity": 0.2 }
  ]
}
```

### Validaciones y errores

- `404`: negocio / categoría / unidad / impuesto no encontrados
- `400`: SKU duplicado dentro del negocio
- `400`: si `type = COMPOSITE` y `components` viene vacío o con IDs repetidos o ingredientes inválidos

### Response (201)

Devuelve el producto **tal como lo crea Prisma**, incluyendo:

- Todos los campos escalares del modelo `Product` (ej: `id`, `businessId`, `categoryId`, `unitId`, `taxId`, `name`, `sku`, `type`, `costPrice`, `salePrice`, `profitMargin`, `minStock`, `updatedAt`, `isActive`, `updatedById`, etc.)
- `unit`: `{ symbol }`
- `components`: si es composite, array de `ProductComponent` con `child: { id, name }`

Ejemplo reducido:

```json
{
  "status": 201,
  "message": "Producto creado exitosamente",
  "data": {
    "id": 100,
    "name": "Hamburguesa Clásica",
    "type": "COMPOSITE",
    "costPrice": "2.500000",
    "salePrice": "5.00",
    "profitMargin": "0.5000",
    "unit": { "symbol": "und" },
    "components": [
      {
        "id": 1,
        "parentProductId": 100,
        "childProductId": 50,
        "quantity": "1.000000",
        "child": { "id": 50, "name": "Pan" }
      }
    ]
  }
}
```

---

## 2) Listar productos

**Endpoint:** `GET /api/v1/inventory/product`

### Query params

- `page` (number, default 1)
- `limit` (number, default 20)
- `search` (string): busca por `name` o `sku` (case-insensitive)
- `categoryId` (number): filtra por categoría

### Qué calcula el backend

- `currentStock`:
  - `SERVICE`: `0`
  - `SIMPLE`: suma de lotes con `quantity > 0`
  - `COMPOSITE`: “factor limitante” (mínimo de `stockIngrediente / qtyReceta`, con `floor`)

### Response (200)

Cada item en `data[]` incluye:

- Todos los campos escalares del modelo `Product`.
- `category`: `{ id, name }`
- `unit`: `{ id, symbol }`
- `presentations`: array completo de `ProductPresentation` (incluye `price` y `factor` como string/Decimal)
- `tax`: `{ id, name, rate }` (rate normalmente string/Decimal)
- `currentStock`: number
- `stockByDepot`: `DepotStockSummary[]` (solo lotes con `quantity > 0`)

Campos **no incluidos** en el response de lista:

- `stockLots` (se usa internamente para calcular/agrupación)
- `components` (se usa internamente para calcular stock de compuestos)

Ejemplo reducido:

```json
{
  "status": 200,
  "message": "Productos obtenidos exitosamente",
  "data": [
    {
      "id": 101,
      "businessId": 1,
      "categoryId": 5,
      "unitId": 1,
      "taxId": 1,
      "name": "Coca Cola 1.5L",
      "sku": "BEB-001",
      "type": "SIMPLE",
      "isPerishable": true,
      "costPrice": "1.200000",
      "profitMargin": "0.3000",
      "salePrice": "2.50",
      "minStock": 10,
      "isActive": true,
      "updatedAt": "2026-02-01T12:00:00.000Z",
      "updatedById": 7,
      "category": { "id": 5, "name": "Bebidas" },
      "unit": { "id": 1, "symbol": "und" },
      "tax": { "id": 1, "name": "IVA", "rate": "0.1600" },
      "presentations": [],
      "currentStock": 150,
      "stockByDepot": [
        {
          "depotId": 1,
          "name": "Almacén Central",
          "stockLots": [
            { "quantity": 10, "expirationDate": "2026-05-01T00:00:00.000Z", "lotCost": 0 }
          ]
        }
      ]
    }
  ],
  "meta": { "total": 1, "page": 1, "lastPage": 1, "limit": 20 }
}
```

---

## 3) Obtener producto (detalle)

**Endpoint:** `GET /api/v1/inventory/product/:id`

### Response (200)

Este endpoint retorna un objeto **sanitizado** (más estable para frontend):

```ts
type ProductDetailResponse = {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  type: "SIMPLE" | "COMPOSITE" | "SERVICE";
  isPerishable: boolean;

  salePrice: number;
  costPrice: number;
  profitMargin: number;
  minStock: number;
  currentStock: number;

  category: { id: number; name: string };
  unit: { id: number; name: string; symbol: string };

  presentations: Array<{
    id: number;
    productId: number;
    name: string;
    factor: number;
    barCode: string | null;
    price: number;
    isActive: boolean;
  }>;

  components: Array<{
    id: number;              // id de ProductComponent
    childProductId: number;  // id del ingrediente
    ingredientName: string;
    sku: string | null;
    quantity: number;
    unitSymbol: string;
  }>;

  stockByDepot: DepotStockSummary[];
}
```

Ejemplo reducido:

```json
{
  "status": 200,
  "message": "Producto encontrado",
  "data": {
    "id": 100,
    "name": "Hamburguesa Clásica",
    "sku": "FOOD-HAM-001",
    "description": "",
    "imageUrl": null,
    "type": "COMPOSITE",
    "isPerishable": false,
    "salePrice": 5,
    "costPrice": 2.5,
    "profitMargin": 0.5,
    "minStock": 0,
    "currentStock": 12,
    "category": { "id": 10, "name": "Comida" },
    "unit": { "id": 1, "name": "Unidad", "symbol": "und" },
    "presentations": [],
    "components": [
      {
        "id": 1,
        "childProductId": 50,
        "ingredientName": "Pan",
        "sku": "PAN-001",
        "quantity": 1,
        "unitSymbol": "und"
      }
    ],
    "stockByDepot": []
  }
}
```

Errores:

- `404`: producto no encontrado

---

## 4) Actualizar producto

**Endpoint:** `PATCH /api/v1/inventory/product/:id`

### Body

Es un `Partial<CreateProductInterface>`; puedes enviar cualquier subset de campos. Ejemplos:

Actualizar precio manual:

```json
{ "salePrice": 6.0 }
```

Actualizar receta (reemplazo completo):

```json
{
  "type": "COMPOSITE",
  "components": [
    { "childProductId": 50, "quantity": 1 },
    { "childProductId": 51, "quantity": 0.25 }
  ]
}
```

### Comportamiento importante

- Si se envía `components` y el producto es (o pasa a ser) `COMPOSITE`, el backend:
  - recalcula `costPrice` basado en costos actuales de ingredientes
  - reemplaza ingredientes: borra los anteriores y crea los nuevos
- Si no envías `salePrice`, el backend recalcula `salePrice` usando el margen (`profitMargin`) y el costo final.
- Si cambias de `COMPOSITE` a `SIMPLE`, borra la receta (`components`).

### Response (200)

Devuelve Prisma crudo del `product.update(...)` con:

- campos escalares del producto (decimales usualmente string)
- `category` (objeto completo)
- `unit` (objeto completo)
- `components` (si aplica) con `child: { id, name, unit: { symbol } }`

Errores:

- `404`: producto no encontrado
- `400`: categoría/unidad inválida, SKU ya en uso, ingredientes inválidos

---

## 5) Eliminar producto (smart delete)

**Endpoint:** `DELETE /api/v1/inventory/product/:id`

### Reglas y respuestas

1) `404` si no existe.

2) `409` si tiene stock físico (lotes con `quantity > 0`):

```json
{
  "status": 409,
  "message": "No puedes eliminar ni archivar un producto con existencia física. Ajusta el inventario a 0 primero.",
  "data": null
}
```

3) Si no tiene stock físico pero tiene historial (ventas/compras/movimientos): **archiva** (`isActive=false`) y retorna el producto actualizado.

4) Si no tiene stock físico ni historial: **borra físicamente** y retorna `data: null`.

Response (archivar):

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

Response (hard delete):

```json
{
  "status": 200,
  "message": "Producto eliminado permanentemente (Sin historial previo)",
  "data": null
}
```