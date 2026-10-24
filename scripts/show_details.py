import json

with open(r'c:\Users\e\Documents\Guardian\back\scripts\emtop_audit_report.json', 'r', encoding='utf-8') as f:
    rep = json.load(f)

print('=== 1. MISSING IN DB (Excel rows not matched to DB) ===')
for m in rep['missingInDb']:
    print(f"Row {m['row']}: SKU='{m['sku']}' | Name='{m['name']}' | Stock={m['stock']} | Cost={m['costPrice']}")

print('\n=== 2. SURPLUS IN DB (Products in DB not matched in Excel) ===')
for s in rep['surplusInDb']:
    print(f"ID {s['id']}: SKU='{s['sku']}' | Name='{s['name']}' | Stock={s['currentStock']} | Cost={s['costPrice']} | Cat='{s['categoryName']}'")

print('\n=== 3. COST DISCREPANCIES ===')
for c in rep['costDiscrepancies']:
    print(f"SKU='{c['sku']}' | Name='{c['name']}' | Excel Cost={c['excelCost']} | DB Cost={c['dbCost']} | Diff={c['costDiff']}")

print('\n=== 4. SUMMARY OF UNEXPLAINED STOCK DISCREPANCIES ===')
print(f"Total unexplained: {len(rep['unexplainedDiscrepancies'])}")
for u in rep['unexplainedDiscrepancies'][:15]:
    print(f"SKU='{u['sku']}' | Name='{u['name']}' | Excel Stock={u['excelStock']} (piso={u['excelPiso']}, alm={u['excelAlmacen']}) | DB Stock={u['dbStock']} | Diff={u['stockDiff']} | Sold={u['soldSinceOct5']} | Pur={u['purchasedSinceOct5']}")
