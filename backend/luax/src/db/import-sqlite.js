const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { databaseConfig, Pool } = require('../config/db');
const { hashPin, id } = require('../services/auth');
const { checkReadiness } = require('./init');

function readSnapshot(path) {
  const exportRows = spawnSync('python3', ['-c', `
import json, pathlib, sqlite3, sys
db = sqlite3.connect(pathlib.Path(sys.argv[1]).resolve().as_uri() + '?mode=ro', uri=True)
db.row_factory = sqlite3.Row
db.execute('BEGIN')
if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or db.execute('PRAGMA foreign_key_check').fetchone():
    raise SystemExit('SQLite integrity check failed')
tables = ('conferencias', 'comites', 'checklist_staff', 'avisos')
if {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")} != set(tables):
    raise SystemExit('Unexpected SQLite schema')
print(json.dumps({table: [dict(row) for row in db.execute('SELECT * FROM ' + table + ' ORDER BY id')] for table in tables}))
`, path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (exportRows.status !== 0) throw new Error('Could not validate SQLite snapshot');
  return JSON.parse(exportRows.stdout);
}

function date(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)?$/.test(value)) {
    throw new Error('Unexpected legacy timestamp');
  }
  const zoned = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z';
  return new Date(zoned.replace(' ', 'T')).toISOString();
}

async function importSnapshot(db, path) {
  const source = readSnapshot(path);
  const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
  const counts = Object.fromEntries(Object.entries(source).map(([table, rows]) => [table, rows.length]));
  const conferences = new Set(source.conferencias.map(row => id(row.id)));
  const committees = new Map(source.comites.map(row => [id(row.id), row.conferencia_id]));
  for (const row of [...source.comites, ...source.checklist_staff, ...source.avisos]) {
    if (!conferences.has(row.conferencia_id) ||
        (row.comite_id != null && committees.get(row.comite_id) !== row.conferencia_id)) {
      throw new Error('Invalid conference/committee relationship');
    }
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(485714004)');
    await checkReadiness(client);
    await client.query(`
      LOCK conferencias, comites, checklist_staff, mensajes, resoluciones, notas_intervenciones IN SHARE ROW EXCLUSIVE MODE;
      CREATE SCHEMA IF NOT EXISTS legacy_import;
      REVOKE ALL ON SCHEMA legacy_import FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS legacy_import.batch (digest text PRIMARY KEY, counts jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS legacy_import.committee_state (
        comite_id text PRIMARY KEY REFERENCES public.comites(id) ON DELETE CASCADE, original_json text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS legacy_import.notice (
        message_id bigint PRIMARY KEY REFERENCES public.mensajes(id) ON DELETE CASCADE, original jsonb NOT NULL
      );
    `);
    const existing = await client.query('SELECT digest FROM legacy_import.batch');
    if (existing.rows[0]?.digest === digest) {
      await client.query('COMMIT');
      return { digest, counts, alreadyImported: true };
    }
    const target = await client.query(`
      SELECT EXISTS(SELECT 1 FROM conferencias UNION ALL SELECT 1 FROM comites
        UNION ALL SELECT 1 FROM checklist_staff UNION ALL SELECT 1 FROM mensajes
        UNION ALL SELECT 1 FROM resoluciones UNION ALL SELECT 1 FROM notas_intervenciones) AS occupied
    `);
    if (existing.rowCount || target.rows[0].occupied) throw new Error('Destination is not empty');

    for (const row of source.conferencias) {
      await client.query(`
        INSERT INTO conferencias(id,nombre,pin_admin,pin_acceso,email_admin,ultimo_cambio,creado_en)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [row.id, row.nombre, await hashPin(row.pin_admin), row.pin_acceso ? await hashPin(row.pin_acceso) : null,
        row.email_admin, date(row.ultimo_cambio), date(row.creado_en)]);
    }
    for (const row of source.comites) {
      const original = JSON.parse(row.datos_json);
      if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error('Invalid committee state');
      await client.query(`
        INSERT INTO comites(id,conferencia_id,nombre,pin_mesa,tipo_sesion,topico_actual,actualizado_en)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [row.id, row.conferencia_id, row.nombre, row.pin_mesa ? await hashPin(row.pin_mesa) : null,
        row.tipo_sesion, row.topico_actual, date(row.actualizado_en)]);
      await client.query('INSERT INTO legacy_import.committee_state VALUES($1,$2)', [row.id, row.datos_json]);
    }
    for (const row of source.checklist_staff) {
      if (![0, 1, null].includes(row.completado)) throw new Error('Invalid checklist boolean');
      await client.query(`
        INSERT INTO checklist_staff(id,conferencia_id,comite_id,titulo,completado,asignado_a,creado_en)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [row.id, row.conferencia_id, row.comite_id, row.titulo,
        row.completado === null ? null : row.completado === 1, row.asignado_a, date(row.creado_en)]);
    }
    for (const row of source.avisos) {
      if (![0, 1, null].includes(row.activo) || !row.creado_en) throw new Error('Invalid legacy notice');
      await client.query(`
        INSERT INTO mensajes(id,conferencia_id,comite_id,emisor_rol,emisor_id,destino_tipo,contenido,estado,creado_en,tipo_aviso)
        VALUES($1,$2,$3,'legacy','legacy','all',$4,$5,$6,$7)
      `, [row.id, row.conferencia_id, row.comite_id, row.mensaje, row.activo === 1 ? 'delivered' : 'archived',
        date(row.creado_en), row.tipo]);
      await client.query('INSERT INTO legacy_import.notice VALUES($1,$2)', [row.id, row]);
    }

    for (const row of source.conferencias) {
      await client.query('UPDATE conferencias SET ultimo_cambio=$2 WHERE id=$1', [row.id, date(row.ultimo_cambio)]);
    }
    for (const [from, to] of [['checklist_staff', 'checklist_staff'], ['avisos', 'mensajes']]) {
      if (source[from].length) {
        const maxId = Math.max(...source[from].map(row => row.id));
        if (!Number.isSafeInteger(maxId) || maxId < 1) throw new Error('Invalid sequence identifier');
        await client.query('SELECT setval(pg_get_serial_sequence($1, $2), $3, true)', [to, 'id', maxId]);
      }
    }
    for (const [from, to] of [['conferencias','conferencias'], ['comites','comites'], ['checklist_staff','checklist_staff'], ['avisos','mensajes']]) {
      const actual = (await client.query('SELECT id FROM ' + to)).rows.map(row => String(row.id)).sort();
      const expected = source[from].map(row => String(row.id)).sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Imported identifiers do not reconcile');
    }
    const archived = (await client.query('SELECT comite_id,original_json FROM legacy_import.committee_state')).rows;
    const raw = new Map(archived.map(row => [row.comite_id, row.original_json]));
    if (source.comites.some(row => raw.get(row.id) !== row.datos_json)) throw new Error('Committee state does not reconcile');
    await client.query('INSERT INTO legacy_import.batch VALUES($1,$2)', [digest, counts]);
    await client.query('COMMIT');
    return { digest, counts, archivedCommitteeStates: archived.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = new Pool(databaseConfig({ ...process.env,
    DB_USER: process.env.MIGRATION_DB_USER, DB_PASSWORD: process.env.MIGRATION_DB_PASSWORD
  }));
  importSnapshot(pool, process.argv[2]).then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error('SQLite import failed:', error.code || error.name);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { importSnapshot };
