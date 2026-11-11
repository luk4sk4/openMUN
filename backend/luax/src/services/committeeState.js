const { httpError } = require('./auth');

const publicKeys = new Set(['comision', 'nombreComite', 'tipoSesion', 'paises', 'oradoresCola',
  'oradoresCaucus', 'mociones', 'caucusActivo', 'agendaSesion', 'votacionSesion', 'enmiendasSesion',
  'roomSettings', 'speakingRequests', 'enmiendasPropuestas', 'relojGSLState']);
const secretKey = /(?:pin|password|passwd|secret|token|credential|^__proto__$|^constructor$|^prototype$)/i;
const privateKey = /^(notes|openmun_notes|notas|speakerNotes|registroIntervenciones|historicoMociones|config|email|correo|telefono)$/i;

function cleanJson(value, publicOnly = false, depth = 0) {
  if (depth > 24) throw httpError(400, 'Estado demasiado profundo');
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && !value.includes('\0')) return value;
  if (Array.isArray(value)) return value.map(item => cleanJson(item, publicOnly, depth + 1));
  if (typeof value !== 'object') throw httpError(400, 'Estado inválido');
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !secretKey.test(key) && !(publicOnly && privateKey.test(key)))
    .map(([key, item]) => [key, cleanJson(item, publicOnly, depth + 1)]));
}

function privateState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Buffer.byteLength(JSON.stringify(value)) > 1024 * 1024) throw httpError(400, 'Estado inválido');
  return cleanJson(value);
}

function publicState(value) {
  const state = cleanJson(Object.fromEntries(Object.entries(privateState(value)).filter(([key]) => publicKeys.has(key))), true);
  for (const name of ['paises', 'oradoresCola', 'oradoresCaucus']) {
    if (state[name] == null) continue;
    if (!Array.isArray(state[name]) || state[name].length > 1000) throw httpError(400, 'Lista inválida');
    state[name] = state[name].map(item => {
      if (typeof item === 'string') return { nombre: item };
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw httpError(400, 'Delegación inválida');
      return Object.fromEntries(Object.entries(item).filter(([key]) => ['id', 'nombre', 'bandera', 'flag', 'estatus', 'veto', 'tieneVeto'].includes(key)));
    });
  }
  return state;
}

function chairState(backup, snapshot) {
  const stored = privateState(backup || {});
  const current = publicState(snapshot || {});
  const merged = { ...stored, ...current };
  for (const name of ['paises', 'oradoresCola', 'oradoresCaucus']) {
    if (!Array.isArray(current[name])) continue;
    const previous = Array.isArray(stored[name]) ? stored[name] : [];
    merged[name] = current[name].map(item => ({
      ...previous.find(old => old && (item.id != null ? old.id === item.id : old.nombre === item.nombre)),
      ...item
    }));
  }
  return merged;
}

module.exports = { privateState, publicState, chairState };
