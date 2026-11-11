/**
 * Utilidades de sanitización y validación de inputs para prevenir SQL Injection,
 * XSS y ataques de manipulación de identificadores en OpenMUN.
 */

// Patrón estricto para identificadores de conferencias y comités: solo minúsculas, números, guiones y guiones bajos
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// Caracteres y palabras clave comunes en vectores de inyección SQL
const SQL_META_PATTERN = /(--|;|\/\*|\*\/|xp_|exec\s+|union\s+select|insert\s+into|drop\s+table)/gi;

/**
 * Sanitiza una cadena de texto genérica:
 * - Elimina bytes nulos (\0)
 * - Recorta espacios en extremos
 * - Limita la longitud máxima
 * - Opcionalmente neutraliza secuencias SQL maliciosas
 */
export function sanitizeString(val, maxLength = 255, { stripSqlMeta = false } = {}) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/\0/g, '').trim();
  if (stripSqlMeta) {
    str = str.replace(SQL_META_PATTERN, '');
  }
  if (str.length > maxLength) {
    str = str.slice(0, maxLength).trim();
  }
  return str;
}

/**
 * Sanitiza y valida un identificador (ID de conferencia o de comité).
 * Solo permite caracteres alfanuméricos en minúsculas, guiones y guiones bajos (hasta 64 caracteres).
 * Cualquier carácter malicioso como comillas, punto y coma, espacios o barras es eliminado o rechazado.
 */
export function sanitizeId(val, maxLength = 64) {
  if (val === null || val === undefined) return '';
  let clean = String(val)
    .replace(/\0/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, maxLength);
  return clean;
}

/**
 * Valida si un ID cumple con el estándar seguro de la base de datos.
 */
export function isValidId(val) {
  if (typeof val !== 'string') return false;
  return ID_PATTERN.test(val);
}

/**
 * Sanitiza un PIN o contraseña numérica/alfanumérica:
 * - Elimina bytes nulos
 * - Recorta espacios
 * - Limita a 64 caracteres
 */
export function sanitizePin(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\0/g, '').trim().slice(0, 64);
}

/**
 * Sanitiza una dirección de correo electrónico:
 * - Minúsculas, recorte de espacios, sin bytes nulos
 * - Longitud máxima de 255 caracteres
 */
export function sanitizeEmail(val) {
  if (!val) return null;
  const str = String(val).replace(/\0/g, '').toLowerCase().trim().slice(0, 255);
  // Validación básica de formato email
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  return emailRegex.test(str) ? str : null;
}

/**
 * Sanitiza el texto de un tópico de debate:
 * - Hasta 2000 caracteres, sin bytes nulos
 */
export function sanitizeTopic(val, maxLength = 2000) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\0/g, '').trim().slice(0, maxLength);
}

/**
 * Sanitiza un identificador numérico de base de datos (por ejemplo, ID de tarea o aviso).
 * Retorna null si no es un entero positivo válido o supera el límite de BIGINT de PostgreSQL.
 */
export function sanitizeDatabaseId(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!/^[1-9][0-9]{0,18}$/.test(str)) return null;
  try {
    const big = BigInt(str);
    if (big > 9223372036854775807n) return null;
    return str;
  } catch {
    return null;
  }
}

/**
 * Sanitiza un objeto JSON contra prototype pollution y elimina claves maliciosas
 */
export function sanitizeJsonObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonObject);
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const safeKey = sanitizeString(key, 128);
    clean[safeKey] = typeof obj[key] === 'object' && obj[key] !== null
      ? sanitizeJsonObject(obj[key])
      : obj[key];
  }
  return clean;
}
