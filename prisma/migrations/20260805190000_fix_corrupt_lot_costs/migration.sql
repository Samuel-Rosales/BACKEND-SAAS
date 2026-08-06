-- Corrección de datos: lotes con costo unitario corrupto.
-- Lotes donde se digitó el costo TOTAL del lote/paquete como costo unitario
-- (costo > 3x el costo maestro del producto) se revalorizan al costPrice.
UPDATE "StockLot" sl
SET "lotCost" = p."costPrice"
FROM "Product" p
WHERE sl."productId" = p.id
  AND sl.quantity > 0
  AND p."costPrice" > 0
  AND sl."lotCost" > p."costPrice" * 3;
