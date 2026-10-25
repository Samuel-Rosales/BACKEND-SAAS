const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:lfFodWJSTtGvsNKregsvHhPEaQfIYmpN@metro.proxy.rlwy.net:15113/railway' });

async function createArmandoDepot() {
  console.log('Verificando si ya existe EMTOP - Depósito Central en PROD...');
  const existing = await pool.query(`SELECT id, name FROM "Business" WHERE name = 'EMTOP - Depósito Central'`);
  if (existing.rows.length > 0) {
    console.log('Ya existe el negocio en PROD:', existing.rows[0]);
    pool.end();
    return;
  }

  console.log('Creando EMTOP - Depósito Central para Armando (User ID: 82)...');

  // 1. Crear el Negocio exento de pago y como Almacén Principal
  const insertBiz = await pool.query(`
    INSERT INTO "Business" (
      name,
      address,
      "logoUrl",
      document,
      "businessCategoryId",
      "currentExchangeRate",
      "rateStrategy",
      "defaultCreditLimit",
      "enableGlobalCredit",
      "closingNotificationPhone",
      "billingExempt",
      "isWarehouseHub",
      "ticketConfig",
      "createdAt",
      "updatedAt"
    ) VALUES (
      'EMTOP - Depósito Central',
      'AV VARGAS ENTRE CARRERAS 24 Y 25 BARQUISIMETO',
      'https://res.cloudinary.com/dd80jjnub/image/upload/v1788271094/guardian/business/logos/atml5qmmmx7azafg5nqw.jpg',
      '',
      10,
      '884.7496',
      'API_BCV',
      '10000.00',
      true,
      '04126664427',
      true,
      true,
      '{"documentTitle": "NOTA DE DESPACHO / VENTA MAYORISTA", "currencyMode": "BOTH", "fontSize": "normal", "footerMessage": "Mercancía despachada desde Depósito Central", "qrCodeUrl": "", "showAddress": true, "showBarcode": true, "showBusinessName": true, "showCashier": true, "showClient": true, "showClientAddress": false, "showClientDocument": true, "showClientPhone": false, "showDate": true, "showDiscounts": true, "showLogo": true, "showPaymentDetails": true, "showPhone": false, "showPolicies": false, "showQrCode": false, "showRemainingBalance": true, "showRif": true, "showSku": false, "showTaxDetails": true, "ticketWidth": "80mm"}',
      NOW(),
      NOW()
    ) RETURNING id, name
  `);

  const newBiz = insertBiz.rows[0];
  console.log('Negocio creado con éxito en PROD:', newBiz);

  // 2. Asociar a Armando como Dueño (roleId = 1)
  const memberRes = await pool.query(`
    INSERT INTO "BusinessMember" (
      "businessId",
      "userId",
      "roleId",
      "createdAt",
      "updatedAt"
    ) VALUES (
      $1,
      82,
      1,
      NOW(),
      NOW()
    ) RETURNING id
  `, [newBiz.id]);
  console.log('Armando vinculado como Dueño (BusinessMember ID):', memberRes.rows[0].id);

  // 3. Crear Depósito Principal vacío
  const depotRes = await pool.query(`
    INSERT INTO "Depot" (
      "businessId",
      name,
      location,
      "isActive"
    ) VALUES (
      $1,
      'Depósito Principal',
      'Almacén Central Mayorista',
      true
    ) RETURNING id, name
  `, [newBiz.id]);
  console.log('Depósito creado:', depotRes.rows[0]);

  // 4. Crear Categoría inicial 'General'
  const catRes = await pool.query(`
    INSERT INTO "Category" (
      name,
      "businessId",
      "isActive",
      "createdAt",
      "updatedAt"
    ) VALUES (
      'General',
      $1,
      true,
      NOW(),
      NOW()
    ) RETURNING id, name
  `, [newBiz.id]);
  console.log('Categoría creada:', catRes.rows[0]);

  // 5. Vincular a Armando también en UserMembership / BusinessMembership si existe
  console.log('Empresa creada y limpia al 100% (cero productos, cero ventas, lista para cargar)');
  pool.end();
}

createArmandoDepot().catch(e => { console.error('Error al crear depósito en PROD:', e); pool.end(); });
