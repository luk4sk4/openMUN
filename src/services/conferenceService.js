/**
 * Servicio de Cliente HTTP para la API de Conferencias y Sincronización OpenMUN
 * Conectado al backend Node.js + Express + SQLite + Socket.io
 */

import { SOCKET_SERVER_URL } from './peerService.js';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('openmun_api_server_url');
    if (customUrl) return customUrl.replace(/\/$/, '');
  }
  const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_SOCKET_SERVER_URL) : null;
  return envApiUrl || SOCKET_SERVER_URL || 'https://api.openmun.app';
};

export const API_BASE_URL = getApiBaseUrl();

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openmun_network_failure'));
    }
    throw err;
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || `Error ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Caché en memoria para optimizar peticiones repetitivas a la base de datos
const requestCache = new Map();
const inFlightRequests = new Map();

function invalidateConferenceCache(conferenciaId) {
  if (!conferenciaId) return;
  const cleanId = String(conferenciaId).trim().toLowerCase();
  for (const key of requestCache.keys()) {
    if (key.includes(encodeURIComponent(cleanId))) {
      requestCache.delete(key);
    }
  }
}

async function fetchWithDeduplication(url, ttlMs = 4000) {
  const now = Date.now();
  const cached = requestCache.get(url);
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const promise = (async () => {
    try {
      const res = await safeFetch(url);
      const data = await handleResponse(res);
      requestCache.set(url, { data, timestamp: Date.now() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openmun_network_restored'));
      }
      return data;
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openmun_network_failure'));
      }
      throw err;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

export const conferenceService = {
  // ── 1. GESTIÓN DE CONFERENCIAS ──
  async crearConferencia({ id, nombre, pin_admin, pin_acceso, email_admin }) {
    const cleanId = id.toLowerCase().trim();
    const cleanEmail = email_admin ? email_admin.trim() : null;
    const res = await fetch(`${API_BASE_URL}/api/conferencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cleanId,
        nombre: nombre.trim(),
        pin_admin: pin_admin.trim(),
        pin_acceso: pin_acceso ? pin_acceso.trim() : null,
        email_admin: cleanEmail
      })
    });
    const data = await handleResponse(res);
    if (!data.id) data.id = cleanId;
    if (cleanEmail && !data.email_admin) data.email_admin = cleanEmail;
    invalidateConferenceCache(cleanId);
    return data;
  },

  async accederConferencia(id, pin = '') {
    const cleanId = String(id).trim().toLowerCase();
    const effectivePin = pin ? String(pin).trim() : (localStorage.getItem(`openmun_conf_pin_${cleanId}`) || '');
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: effectivePin ? effectivePin : undefined })
    });
    const data = await handleResponse(res);
    if (!data.id) data.id = cleanId;
    
    if (effectivePin) {
      try {
        localStorage.setItem(`openmun_conf_pin_${cleanId}`, effectivePin);
      } catch (e) {}
    }

    // Preservar email_admin desde la sesión activa guardada si el endpoint no lo retornó
    const active = this.obtenerSesionActiva();
    if (active?.id === cleanId && active?.email_admin && !data.email_admin && !data.email) {
      data.email_admin = active.email_admin;
    }
    return data;
  },

  async obtenerResumen(id) {
    const cleanId = String(id).trim().toLowerCase();
    const url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}/resumen`;
    const data = await fetchWithDeduplication(url, 4000);
    const active = this.obtenerSesionActiva();
    if (active?.id === cleanId && active?.email_admin && !data.email_admin) {
      data.email_admin = active.email_admin;
    }
    return data;
  },

  async actualizarConferencia(id, { pin_admin_actual, nombre, nuevo_pin_admin, pin_acceso, email_admin }) {
    const cleanId = String(id).trim().toLowerCase();
    
    // Obtener pin_admin_actual del argumento o de la sesión activa
    let pinActual = pin_admin_actual;
    if (!pinActual) {
      const active = this.obtenerSesionActiva();
      if (active?.id === cleanId && active?.pin_admin) {
        pinActual = active.pin_admin;
      }
    }

    const payload = {
      pin_admin_actual: pinActual ? String(pinActual).trim() : ''
    };

    if (nombre !== undefined && nombre !== null) payload.nombre = String(nombre).trim();
    if (nuevo_pin_admin !== undefined && nuevo_pin_admin !== null && String(nuevo_pin_admin).trim() !== '') {
      payload.nuevo_pin_admin = String(nuevo_pin_admin).trim();
    }
    if (pin_acceso !== undefined) {
      payload.pin_acceso = pin_acceso ? String(pin_acceso).trim() : null;
    }
    if (email_admin !== undefined) {
      payload.email_admin = email_admin ? String(email_admin).trim() : null;
    }

    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(res);

    // Invalidar caché tras actualización
    invalidateConferenceCache(cleanId);

    // Actualizar sesión activa local si fue exitoso
    const active = this.obtenerSesionActiva() || {};
    if (active.id === cleanId) {
      const updated = { ...active };
      if (payload.nombre) updated.nombre = payload.nombre;
      if (payload.nuevo_pin_admin) updated.pin_admin = payload.nuevo_pin_admin;
      if (payload.email_admin !== undefined) updated.email_admin = payload.email_admin;
      if (payload.pin_acceso !== undefined) updated.pin_acceso = payload.pin_acceso;
      this.guardarSesionActiva(updated);
    }

    return data;
  },

  async actualizarEmailAdmin(id, email_admin, pin_admin = null) {
    return this.actualizarConferencia(id, {
      pin_admin_actual: pin_admin,
      email_admin: email_admin
    });
  },

  // ── 2. GESTIÓN DE COMITÉS ──
  async crearOActualizarComite(conferenciaId, { id, nombre, pin_mesa, datos_json }) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    const finalId = id ? id.toLowerCase().trim() : `${cleanConfId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/comites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: finalId,
        nombre: nombre ? nombre.trim() : undefined,
        pin_mesa: pin_mesa ? pin_mesa.trim() : null,
        datos_json: datos_json || {}
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  async actualizarComite(comiteId, { nombre, pin_mesa, tipo_sesion, topico_actual, datos_json } = {}) {
    if (!comiteId) throw new Error('ID de comité requerido');
    const cleanComiteId = String(comiteId).trim();
    const payload = {};
    if (nombre !== undefined) payload.nombre = nombre !== null ? String(nombre).trim() : null;
    if (pin_mesa !== undefined) payload.pin_mesa = pin_mesa !== null ? String(pin_mesa).trim() : null;
    if (tipo_sesion !== undefined) payload.tipo_sesion = String(tipo_sesion).toLowerCase();
    if (topico_actual !== undefined) payload.topico_actual = topico_actual !== null ? String(topico_actual).trim() : '';
    if (datos_json !== undefined) payload.datos_json = datos_json;

    try {
      const res = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 404 && (payload.tipo_sesion || payload.topico_actual)) {
        const estadoRes = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo_sesion: payload.tipo_sesion,
            topico_actual: payload.topico_actual
          })
        });
        if (estadoRes.ok) {
          requestCache.clear();
          return await handleResponse(estadoRes);
        }
      }
      const data = await handleResponse(res);
      requestCache.clear();
      return data;
    } catch (e) {
      if (payload.tipo_sesion || payload.topico_actual) {
        try {
          const estadoRes = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_sesion: payload.tipo_sesion,
              topico_actual: payload.topico_actual
            })
          });
          if (estadoRes.ok) {
            requestCache.clear();
            return await estadoRes.json().catch(() => ({ ok: true }));
          }
        } catch (errEstado) {}
      }
      throw e;
    }
  },

  async actualizarEstadoComite(comiteIdOrConfId, comiteIdOrData, maybeData = null) {
    let targetComiteId = comiteIdOrConfId;
    let payloadData = comiteIdOrData;
    if (maybeData !== null) {
      targetComiteId = comiteIdOrData;
      payloadData = maybeData;
    }
    return this.actualizarComite(targetComiteId, payloadData);
  },

  // ── 3. AVISOS Y BROADCAST ──
  async crearAviso(conferenciaId, { comite_id, emisor, tipo, mensaje }) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/avisos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comite_id: comite_id ? comite_id.trim() : null,
        emisor: emisor || 'organizacion',
        tipo: tipo || 'info',
        mensaje: mensaje.trim()
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  async obtenerAvisos(conferenciaId, comiteId = null, role = null, comiteNombre = null) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/avisos`;
    const params = [];
    if (comiteId) {
      params.push(`comite_id=${encodeURIComponent(String(comiteId).trim())}`);
    }
    if (role) {
      params.push(`role=${encodeURIComponent(String(role).trim())}`);
    }
    if (comiteNombre) {
      params.push(`comite_nombre=${encodeURIComponent(String(comiteNombre).trim())}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return fetchWithDeduplication(url, 4000);
  },

  async desactivarAviso(avisoId, conferenciaId = null) {
    const res = await fetch(`${API_BASE_URL}/api/avisos/${encodeURIComponent(avisoId)}/desactivar`, {
      method: 'PATCH'
    });
    const data = await handleResponse(res);
    if (conferenciaId) {
      invalidateConferenceCache(conferenciaId);
    } else {
      requestCache.clear();
    }
    return data;
  },

  // ── 4. CHECKLIST DE STAFF ──
  async obtenerChecklist(conferenciaId, comiteId = null) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist`;
    if (comiteId) {
      url += `?comite_id=${encodeURIComponent(String(comiteId).trim())}`;
    }
    return fetchWithDeduplication(url, 4000);
  },

  async crearTareaChecklist(conferenciaId, { comite_id, titulo, asignado_a }) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comite_id: comite_id ? String(comite_id).trim() : null,
        titulo: String(titulo).trim(),
        asignado_a: asignado_a ? String(asignado_a).trim() : null
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  async toggleTareaChecklist(tareaId, completado) {
    const res = await fetch(`${API_BASE_URL}/api/checklist/${encodeURIComponent(tareaId)}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado: Boolean(completado) })
    });
    const data = await handleResponse(res);
    requestCache.clear();
    return data;
  },

  async eliminarTareaChecklist(tareaId) {
    const res = await fetch(`${API_BASE_URL}/api/checklist/${encodeURIComponent(tareaId)}`, {
      method: 'DELETE'
    });
    const data = await handleResponse(res);
    requestCache.clear();
    return data;
  },

  async eliminarTareasCompletadas(conferenciaId, comiteId = null) {
    const cleanConfId = String(conferenciaId).trim().toLowerCase();
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist/completados`;
    if (comiteId) {
      url += `?comite_id=${encodeURIComponent(String(comiteId).trim())}`;
    }
    const res = await fetch(url, {
      method: 'DELETE'
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  // ── 5. VERIFICACIÓN Y UTILIDADES ──
  async verificarAdmin(conferenciaId, pin) {
    const cleanId = String(conferenciaId).trim().toLowerCase();
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      const err = new Error('PIN de Secretaría requerido.');
      err.status = 400;
      throw err;
    }

    const active = this.obtenerSesionActiva();
    
    // Si la sesión activa tiene un pin_admin guardado localmente, compararlo primero
    if (active && active.id === cleanId && active.pin_admin) {
      if (String(active.pin_admin).trim() !== cleanPin) {
        const err = new Error('PIN de Secretaría incorrecto.');
        err.status = 401;
        throw err;
      }
    }

    // Validar siempre con el servidor backend mediante PATCH /api/conferencias/:id
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin_admin_actual: cleanPin })
    });

    const data = await handleResponse(res);

    // Guardar PIN verificado en la sesión activa local y en localStorage
    try {
      localStorage.setItem(`openmun_conf_admin_pin_${cleanId}`, cleanPin);
    } catch (e) {}

    this.guardarSesionActiva({
      ...(active || {}),
      id: cleanId,
      pin_admin: cleanPin
    });

    return { ...data, admin: true };
  },

  async verificarPinMesa(comiteId, pin, pinEsperado = null) {
    if (!comiteId) throw new Error('ID de comité requerido');
    const cleanComiteId = String(comiteId).trim();
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      const err = new Error('PIN de mesa directiva requerido.');
      err.status = 400;
      throw err;
    }

    // 1. Si se conoce el pin_mesa esperado del comité, verificar coincidencia estricta
    if (pinEsperado && String(pinEsperado).trim() !== cleanPin) {
      const err = new Error('PIN de mesa directiva incorrecto.');
      err.status = 401;
      throw err;
    }

    // 2. Intentar validación en el backend si el endpoint existe
    try {
      const res = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}/acceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });
      if (res.status === 404) {
        try {
          localStorage.setItem(`openmun_comite_pin_${cleanComiteId}`, cleanPin);
        } catch (e) {}
        return { ok: true, comiteId: cleanComiteId };
      }
      const data = await handleResponse(res);
      try {
        localStorage.setItem(`openmun_comite_pin_${cleanComiteId}`, cleanPin);
      } catch (e) {}
      return data;
    } catch (e) {
      if (e.status === 401 || e.status === 403) throw e;
      if (pinEsperado) {
        try {
          localStorage.setItem(`openmun_comite_pin_${cleanComiteId}`, cleanPin);
        } catch (e) {}
        return { ok: true, comiteId: cleanComiteId };
      }
      throw e;
    }
  },

  async obtenerComite(comiteId) {
    if (!comiteId) throw new Error('ID de comité requerido');
    const cleanId = String(comiteId).trim();
    const res = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      return await handleResponse(res);
    }

    // Respaldo de datos locales del comité
    try {
      const local = localStorage.getItem(`openmun_comite_data_${cleanId}`);
      if (local) {
        const parsed = JSON.parse(local);
        return {
          id: cleanId,
          nombre: parsed.nombreComite || parsed.comision || cleanId,
          datos_json: parsed,
          tipo_sesion: parsed.tipoSesion || 'formal'
        };
      }
    } catch (e) {}

    return await handleResponse(res);
  },

  async eliminarComite(comiteId, conferenciaId = null) {
    if (!comiteId) throw new Error('ID de comité requerido');
    const cleanComiteId = String(comiteId).trim();

    let res = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}`, {
      method: 'DELETE'
    });

    if (res.status === 404 && conferenciaId) {
      const cleanConfId = String(conferenciaId).trim().toLowerCase();
      res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/comites/${encodeURIComponent(cleanComiteId)}`, {
        method: 'DELETE'
      });
    }

    const data = await handleResponse(res);

    if (conferenciaId) {
      invalidateConferenceCache(conferenciaId);
    } else {
      requestCache.clear();
    }

    return data;
  },

  getExportarUrl(id) {
    if (!id) return '#';
    const cleanId = String(id).trim().toLowerCase();
    return `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}/resumen`;
  },

  invalidarCache(conferenciaId = null) {
    if (conferenciaId) {
      invalidateConferenceCache(conferenciaId);
    } else {
      requestCache.clear();
    }
  },

  // ── 4. GESTIÓN LOCAL DE CONFERENCIA ACTIVA ──
  guardarSesionActiva(conferenciaData) {
    try {
      const actual = this.obtenerSesionActiva() || {};
      const merged = { ...actual, ...conferenciaData };
      localStorage.setItem('openmun_active_conference', JSON.stringify(merged));
      
      if (merged.id) {
        const cleanId = String(merged.id).trim().toLowerCase();
        if (merged.pin_admin) {
          localStorage.setItem(`openmun_conf_admin_pin_${cleanId}`, String(merged.pin_admin).trim());
        }
        if (merged.pin_acceso) {
          localStorage.setItem(`openmun_conf_pin_${cleanId}`, String(merged.pin_acceso).trim());
        }
      }
    } catch (e) {
      console.warn('Error guardando conferencia activa en storage:', e);
    }
  },

  obtenerSesionActiva() {
    try {
      const saved = localStorage.getItem('openmun_active_conference');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  },

  limpiarSesionActiva() {
    try {
      localStorage.removeItem('openmun_active_conference');
    } catch (e) {}
  }
};

export default conferenceService;
