const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(process.env.DATABASE_PATH || path.join(__dirname, 'openmun.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS conferencias (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, pin_admin TEXT NOT NULL,
    pin_acceso TEXT, email_admin TEXT,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_cambio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS comites (
    id TEXT PRIMARY KEY, conferencia_id TEXT NOT NULL REFERENCES conferencias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, pin_mesa TEXT, tipo_sesion TEXT DEFAULT 'formal',
    topico_actual TEXT DEFAULT '', datos_json TEXT NOT NULL DEFAULT '{}',
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS comites_conferencia ON comites(conferencia_id);
  CREATE TABLE IF NOT EXISTS avisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conferencia_id TEXT NOT NULL REFERENCES conferencias(id) ON DELETE CASCADE,
    comite_id TEXT, emisor TEXT NOT NULL, tipo TEXT NOT NULL, mensaje TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS avisos_conferencia ON avisos(conferencia_id, activo, creado_en);
  CREATE TABLE IF NOT EXISTS checklist_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conferencia_id TEXT NOT NULL REFERENCES conferencias(id) ON DELETE CASCADE,
    comite_id TEXT, titulo TEXT NOT NULL, asignado_a TEXT,
    completado INTEGER NOT NULL DEFAULT 0, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS checklist_conferencia ON checklist_staff(conferencia_id);
`);

if (!db.prepare('PRAGMA table_info(avisos)').all().some(column => column.name === 'creado_por')) {
  db.exec('ALTER TABLE avisos ADD COLUMN creado_por TEXT');
}
module.exports = db;
