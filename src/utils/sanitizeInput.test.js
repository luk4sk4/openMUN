import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeString,
  sanitizeId,
  isValidId,
  sanitizePin,
  sanitizeEmail,
  sanitizeTopic,
  sanitizeDatabaseId,
  sanitizeJsonObject
} from './sanitizeInput.js';

test('sanitizeString elimina bytes nulos, recorta y respeta límite de longitud', () => {
  const input = '   MUN Madrid\0 2026   ';
  assert.equal(sanitizeString(input, 50), 'MUN Madrid 2026');
  assert.equal(sanitizeString('Texto muy largo que debe truncarse', 10), 'Texto muy');
});

test('sanitizeString neutraliza inyecciones SQL si stripSqlMeta está activado', () => {
  const sqlPayload = "Asamblea'; DROP TABLE comites; --";
  const cleaned = sanitizeString(sqlPayload, 100, { stripSqlMeta: true });
  assert.equal(cleaned.includes('--'), false);
  assert.equal(cleaned.includes(';'), false);
  assert.equal(cleaned.toLowerCase().includes('drop table'), false);
});

test('sanitizeId previene inyecciones SQL en identificadores', () => {
  // Intentos de inyección SQL
  assert.equal(sanitizeId("conf' OR 1=1; --"), 'confor11--');
  assert.equal(sanitizeId('ADMIN"; DROP TABLE conferencias; --'), 'admindroptableconferencias--');
  assert.equal(sanitizeId('../../etc/passwd'), 'etcpasswd');
  assert.equal(sanitizeId('MUN-Madrid_2026!'), 'mun-madrid_2026');

  // Identificador legítimo
  assert.equal(sanitizeId('mun2026'), 'mun2026');
  assert.equal(isValidId('mun-2026_unsc'), true);
  assert.equal(isValidId("conf' OR '1'='1"), false);
  assert.equal(isValidId('-invalido'), false);
});

test('sanitizePin recorta espacios y elimina bytes nulos sin alterar formato numérico', () => {
  assert.equal(sanitizePin('  1234\0  '), '1234');
  assert.equal(sanitizePin('000123'), '000123'); // Preserva ceros a la izquierda
});

test('sanitizeEmail valida y sanitiza formato de correo', () => {
  assert.equal(sanitizeEmail('  ADMIN@OpenMUN.org  '), 'admin@openmun.org');
  assert.equal(sanitizeEmail('admin@openmun.org\0'), 'admin@openmun.org');
  assert.equal(sanitizeEmail("admin' OR 1=1--@evil.com"), null);
  assert.equal(sanitizeEmail('no-es-un-email'), null);
});

test('sanitizeDatabaseId valida identificadores enteros de base de datos', () => {
  assert.equal(sanitizeDatabaseId('42'), '42');
  assert.equal(sanitizeDatabaseId('1234567890'), '1234567890');
  assert.equal(sanitizeDatabaseId("1 OR 1=1"), null);
  assert.equal(sanitizeDatabaseId("1; DROP TABLE mensajes;"), null);
  assert.equal(sanitizeDatabaseId("-5"), null);
  assert.equal(sanitizeDatabaseId("99999999999999999999999999"), null); // Excede BIGINT
});

test('sanitizeJsonObject previene contaminación de prototipos y sanitiza claves', () => {
  const dirty = JSON.parse('{"__proto__": {"polluted": true}, "normal": "valor", "sub": {"otro": 123}}');
  const clean = sanitizeJsonObject(dirty);
  assert.equal(clean.__proto__, Object.prototype);
  assert.equal(clean.polluted, undefined);
  assert.equal(clean.normal, 'valor');
  assert.equal(clean.sub.otro, 123);
});
