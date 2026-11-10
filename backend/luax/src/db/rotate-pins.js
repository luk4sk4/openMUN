require('dotenv').config();
const { Pool, databaseConfig } = require('../config/db');
const { hashPin, id } = require('../services/auth');
const { checkReadiness } = require('./init');

async function rotatePins(db, entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('Expected an array of credential changes');
  const changes = new Set();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(485714004)');
    await checkReadiness(client);
    for (const entry of entries) {
      const { target, pin } = entry;
      const key = id(entry.id);
      const query = {
        admin: 'UPDATE conferencias SET pin_admin=$2 WHERE id=$1',
        access: 'UPDATE conferencias SET pin_acceso=$2 WHERE id=$1',
        chair: 'UPDATE comites SET pin_mesa=$2 WHERE id=$1'
      }[target];
      if (!['admin', 'access', 'chair'].includes(target) || changes.has(target + ':' + key)) {
        throw new Error('Invalid or duplicate credential change');
      }
      changes.add(target + ':' + key);
      const verifier = pin === null && target !== 'admin' ? null : await hashPin(pin);
      if (!(await client.query(query, [key, verifier])).rowCount) throw new Error('Credential target not found');
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
  async function main() {
    if (process.stdin.isTTY) throw new Error('Provide credential changes via private standard input');
    if (Buffer.byteLength(process.env.PIN_PEPPER || '') < 32) throw new Error('PIN_PEPPER must be at least 32 bytes');
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
      if (input.length > 1_000_000) throw new Error('Credential change list too large');
    }
    const db = new Pool(databaseConfig({ ...process.env,
      DB_USER: process.env.MIGRATION_DB_USER,
      DB_PASSWORD: process.env.MIGRATION_DB_PASSWORD
    }));
    try {
      await rotatePins(db, JSON.parse(input));
      console.log('Credential rotation committed');
    } finally {
      await db.end();
    }
  }
  main().catch(error => {
    console.error('Credential rotation failed:', error.code || error.name);
    process.exitCode = 1;
  });
}

module.exports = { rotatePins };
