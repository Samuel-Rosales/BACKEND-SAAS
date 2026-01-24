SELECT COUNT(*) AS tax_count, MIN(id) AS min_id, MAX(id) AS max_id FROM "Tax";
SELECT COUNT(*) AS product_count FROM "Product";
SELECT column_name FROM information_schema.columns WHERE table_name = 'Business' ORDER BY ordinal_position;
