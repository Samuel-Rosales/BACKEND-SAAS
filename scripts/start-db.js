const { EmbeddedPostgres } = require('pg-embedded');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', '.pg_data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'backend_saas',
  persistent: true,
});

async function start() {
  try {
    console.log('[PG] Inicializando PostgreSQL embebido...');
    await pg.initialise();
  } catch (err) {
    console.log('[PG] Info al inicializar:', err.message);
  }

  try {
    console.log('[PG] Levantando PostgreSQL en puerto 5432...');
    await pg.start();
    console.log('[PG] PostgreSQL activo en localhost:5432, base de datos backend_saas.');
  } catch (err) {
    console.error('[PG] Error al iniciar:', err);
    process.exit(1);
  }

  const keepAlive = () => setTimeout(keepAlive, 10000);
  keepAlive();
}

start();
