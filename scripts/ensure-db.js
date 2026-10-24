const { Client } = require('pg');

async function ensureDb() {
  let connected = false;
  let attempts = 0;
  while (!connected && attempts < 30) {
    attempts++;
    try {
      const client = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'postgres' });
      await client.connect();
      console.log('Connected to PostgreSQL server!');
      connected = true;
      try {
        await client.query('CREATE DATABASE backend_saas');
        console.log('Database backend_saas created successfully.');
      } catch (err) {
        if (err.code === '42P04') {
          console.log('Database backend_saas already exists.');
        } else {
          console.log('Database creation note:', err.message);
        }
      }
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Waiting for PostgreSQL to be ready... (${attempts}/30): ${err.message}`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  console.error('Could not connect to PostgreSQL after 30 attempts.');
  process.exit(1);
}

ensureDb();
