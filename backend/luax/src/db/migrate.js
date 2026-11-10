require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool, databaseConfig } = require('../config/db');
const { hashPin } = require('../services/auth');

async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(485714004)');
    await client.query('CREATE TABLE IF NOT EXISTS openmun_schema_versions (version integer PRIMARY KEY)');
    const result = await client.query('SELECT version FROM openmun_schema_versions');
    const applied = new Set(result.rows.map(row => row.version));
    if ([...applied].some(version => ![1, 2, 3].includes(version))) throw new Error('Unknown schema version');
    if (!applied.has(1)) {
      const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO openmun_schema_versions VALUES (1)');
    }
    if (!applied.has(2)) {
      if (Buffer.byteLength(process.env.PIN_PEPPER || '') < 32) throw new Error('PIN_PEPPER must be at least 32 bytes');
      await client.query(`
        ALTER TABLE conferencias ALTER COLUMN pin_admin TYPE text, ALTER COLUMN pin_acceso TYPE text;
        ALTER TABLE comites ALTER COLUMN pin_mesa TYPE text;
        ALTER TABLE comites ADD COLUMN debate_revision bigint NOT NULL DEFAULT 0;
        ALTER TABLE mensajes ADD COLUMN tipo_aviso text, ADD COLUMN motivo_moderacion text;
      `);
      const conferences = await client.query('SELECT id, pin_admin, pin_acceso FROM conferencias');
      for (const row of conferences.rows) {
        await client.query('UPDATE conferencias SET pin_admin=$2, pin_acceso=$3 WHERE id=$1', [
          row.id, await hashPin(row.pin_admin), row.pin_acceso ? await hashPin(row.pin_acceso) : null
        ]);
      }
      const committees = await client.query('SELECT id, pin_mesa FROM comites WHERE pin_mesa IS NOT NULL');
      for (const row of committees.rows) {
        await client.query('UPDATE comites SET pin_mesa=$2 WHERE id=$1', [
          row.id, row.pin_mesa ? await hashPin(row.pin_mesa) : null
        ]);
      }
      await client.query(`
        ALTER TABLE conferencias ADD CHECK (pin_admin ~ '^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$'),
          ADD CHECK (pin_acceso ~ '^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$');
        ALTER TABLE comites ADD CHECK (pin_mesa ~ '^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$');
        INSERT INTO openmun_schema_versions VALUES (2);
      `);
    }
    if (!applied.has(3)) {
      await client.query(await fs.readFile(path.join(__dirname, 'retention.sql'), 'utf8'));
      await client.query('INSERT INTO openmun_schema_versions VALUES (3)');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = new Pool(databaseConfig({ ...process.env,
    DB_USER: process.env.MIGRATION_DB_USER,
    DB_PASSWORD: process.env.MIGRATION_DB_PASSWORD
  }));
  migrate(pool).catch(error => {
    console.error('Database migration failed:', error.code || error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { migrate };
