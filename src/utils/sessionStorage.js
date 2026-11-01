const scopedKeys = new Set([
  'openmun_tipo_sesion', 'openmun_paises', 'openmun_oradores', 'openmun_oradores_caucus',
  'openmun_intervenciones', 'openmun_mociones', 'openmun_historico_mociones', 'openmun_caucus',
  'openmun_votacion', 'openmun_agenda', 'openmun_comite', 'openmun_enmiendas', 'sesion_activa.json',
  'openmun_crisis_eventos', 'openmun_crisis_reloj', 'openmun_cronometros', 'openmun_oradores_historial',
  'openmun_cronometro_enmiendas', 'openmun_notes', 'openmun_announcements', 'openmun_enmiendas_propuestas',
  'openmun_room_settings', 'openmun_descartados_avisos', 'openmun_mis_avisos', 'openmun_cronometro_dual',
  'openmun_timer_dual_active', 'openmun_debate_agenda'
]);
const tabKeys = new Set([
  'openmun_current_conf_id', 'openmun_current_comite_id', 'openmun_current_comite_nombre',
  'openmun_user_role', 'openmun_mesa_activa', 'openmun_last_room_id', 'openmun_last_country',
  'openmun_active_conference', 'openmun_drive_file_id', 'openmun_drive_file_name', 'openmun_cloud_active_comite'
]);
const scopeKey = 'openmun_session_scope';
const removed = '__OPENMUN_REMOVED__';
const unsaved = new Map();

function persist(target, key, value) {
  try {
    target.setItem(key, value);
    unsaved.delete(key);
  } catch (error) {
    const firstFailure = unsaved.size === 0;
    unsaved.set(key, String(value));
    if (firstFailure) window.dispatchEvent(new CustomEvent('openmun_storage_failure', { detail: error.message }));
  }
}

function read(target, key) {
  return unsaved.has(key) ? unsaved.get(key) : target.getItem(key);
}

function audience() {
  const mode = new URLSearchParams(window.location.search).get('mode');
  const role = ['delegate', 'staff', 'secretariat', 'backroom'].includes(mode) ? mode : read(globalThis.sessionStorage, 'openmun_user_role');
  if (role === 'delegate') return `delegate:${read(globalThis.sessionStorage, 'openmun_last_country') || ''}`;
  return ['staff', 'secretariat', 'backroom'].includes(role) ? role : 'chair';
}

function storageName(key) {
  return `openmun:${getSessionScope()}:${key}${key === 'openmun_notes' ? `:${encodeURIComponent(audience())}` : ''}`;
}

export function getSessionScope() {
  if (typeof window === 'undefined') return 'local';
  const urlRoom = new URLSearchParams(window.location.search).get('room');
  return (urlRoom || read(globalThis.sessionStorage, scopeKey) || read(globalThis.localStorage, 'openmun_last_session_scope') || 'local').trim().toLowerCase();
}

export function setSessionScope(id, copyCurrent = false) {
  const next = String(id || 'local').trim().toLowerCase();
  const previous = getSessionScope();
  if (next === previous) {
    persist(globalThis.localStorage, 'openmun_last_session_scope', next);
    persist(globalThis.sessionStorage, scopeKey, next);
    return;
  }
  if (copyCurrent && !read(globalThis.localStorage, `openmun:${next}:openmun_paises`)) {
    for (const key of scopedKeys) {
      const value = sessionStore.getItem(key);
      if (value !== null) persist(globalThis.localStorage, `openmun:${next}:${key}${key === 'openmun_notes' ? `:${encodeURIComponent(audience())}` : ''}`, value);
    }
  }
  persist(globalThis.sessionStorage, scopeKey, next);
  persist(globalThis.localStorage, 'openmun_last_session_scope', next);
  const url = new URL(window.location.href);
  if (url.searchParams.has('room')) {
    url.searchParams.set('room', next);
    window.history.replaceState({}, '', url);
  }
  window.dispatchEvent(new CustomEvent('openmun_session_scope_changed', { detail: { scope: next, copyCurrent } }));
}

const storage = {
  getItem(key) {
    if (tabKeys.has(key)) {
      const saved = read(globalThis.sessionStorage, key);
      if (saved !== null) return saved === removed ? null : saved;
      // Existing installations are migrated per tab without deleting the old data.
      const legacy = read(globalThis.localStorage, `openmun:${getSessionScope()}:meta:${key}`) ?? (getSessionScope() === 'local' ? read(globalThis.localStorage, key) : null);
      if (legacy !== null) persist(globalThis.sessionStorage, key, legacy);
      return legacy;
    }
    if (!scopedKeys.has(key)) return read(globalThis.localStorage, key);
    const name = storageName(key);
    const saved = read(globalThis.localStorage, name);
    if (key === 'openmun_notes' && saved === null) {
      if (audience() !== 'chair') return null;
      return read(globalThis.localStorage, `openmun:${getSessionScope()}:${key}`) || (getSessionScope() === 'local' ? read(globalThis.localStorage, key) : null);
    }
    if (saved !== null || getSessionScope() !== 'local') return saved === removed ? null : saved;
    return read(globalThis.localStorage, key);
  },
  setItem(key, value) {
    const notify = ['openmun_notes', 'openmun_crisis_eventos', 'openmun_announcements'].includes(key) && storage.getItem(key) !== String(value);
    const roleChanged = key === 'openmun_user_role' && value !== 'chair' && storage.getItem(key) !== String(value);
    if (key === 'openmun_current_comite_id') setSessionScope(value);
    if (tabKeys.has(key)) {
      persist(globalThis.sessionStorage, key, value);
      persist(globalThis.localStorage, `openmun:${getSessionScope()}:meta:${key}`, value);
    }
    else persist(globalThis.localStorage, scopedKeys.has(key) ? storageName(key) : key, value);
    if (notify) window.dispatchEvent(new CustomEvent('openmun_session_auxiliary_changed'));
    if (roleChanged) window.dispatchEvent(new CustomEvent('openmun_session_role_changed'));
  },
  removeItem(key) {
    if (tabKeys.has(key)) {
      persist(globalThis.sessionStorage, key, removed);
      persist(globalThis.localStorage, `openmun:${getSessionScope()}:meta:${key}`, removed);
    }
    else if (scopedKeys.has(key)) persist(globalThis.localStorage, storageName(key), removed);
    else { unsaved.delete(key); globalThis.localStorage.removeItem(key); }
  },
  eventKey(key) {
    const prefix = `openmun:${getSessionScope()}:`;
    if (key?.startsWith(`${prefix}meta:`)) return null;
    if (key?.startsWith(`${prefix}openmun_notes`)) return key === storageName('openmun_notes') ? 'openmun_notes' : null;
    if (key?.startsWith(prefix)) return key.slice(prefix.length);
    return key?.startsWith('openmun:') || scopedKeys.has(key) || tabKeys.has(key) ? null : key;
  }
};

export const sessionStore = new Proxy(storage, {
  ownKeys() {
    return [...new Set([...Object.keys(globalThis.localStorage), ...unsaved.keys()].map(key => storage.eventKey(key)).filter(key => key !== null))];
  },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; }
});
