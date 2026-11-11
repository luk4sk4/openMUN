import i18n from '../languages/index.js';
/**
 * Servicio de Cliente HTTP para la API de Conferencias y Sincronización OpenMUN
 * Conectado al backend Node.js + Express + SQLite + Socket.io
 */

import { SOCKET_SERVER_URL } from './peerService.js';
import { registrarAvisoPropio } from '../utils/announcementHelpers.jsx';
import { luaxAccess as luax, LUAX_API_URL } from './luaxAccess.js';
import {
  sanitizeId,
  sanitizeString,
  sanitizePin,
  sanitizeEmail,
  sanitizeTopic,
  sanitizeDatabaseId,
  sanitizeJsonObject
} from '../utils/sanitizeInput.js';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('openmun_api_server_url');
    if (customUrl) return customUrl.replace(/\/$/, '');
  }
  const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_SOCKET_SERVER_URL) : null;
  return envApiUrl || SOCKET_SERVER_URL || 'https://api.openmun.app';
};

export const API_BASE_URL = LUAX_API_URL || getApiBaseUrl();

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
    const errorMsg = data.error || i18n.t('ui.error2', { v0: response.status, v1: response.statusText });
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

if (typeof window !== 'undefined') {
  window.addEventListener('openmun_avisos_actualizados', e => {
    invalidateConferenceCache(e.detail?.conferencia_id);
  });
}

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
  usesLuaxSessions: Boolean(luax),
  hasLuaxOrganization: id => Boolean(luax?.hasOrganization(id)),
  hasLuaxChair: id => Boolean(luax?.hasChair(id)),
  lockLuaxOrganization: id => luax?.lockOrganization(id),
  enterLuaxChairWithoutPin: (confId, comiteId) => luax.enterChairWithoutPin(confId, comiteId),
  // ── 1. GESTIÓN DE CONFERENCIAS ──
  async crearConferencia({ id, nombre, pin_admin, pin_acceso, email_admin }) {
    const cleanId = sanitizeId(id);
    const cleanNombre = sanitizeString(nombre, 255);
    const cleanPinAdmin = sanitizePin(pin_admin);
    const cleanPinAcceso = pin_acceso ? sanitizePin(pin_acceso) : null;
    const cleanEmail = sanitizeEmail(email_admin);
    if (luax) return luax.registerConference({ id: cleanId, nombre: cleanNombre, pin_admin: cleanPinAdmin, pin_acceso: cleanPinAcceso, email_admin: cleanEmail });
    const res = await fetch(`${API_BASE_URL}/api/conferencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cleanId,
        nombre: cleanNombre,
        pin_admin: cleanPinAdmin,
        pin_acceso: cleanPinAcceso,
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
    const cleanId = sanitizeId(id);
    const cleanPin = sanitizePin(pin);
    if (luax) return luax.accessConference(cleanId, cleanPin);
    const effectivePin = cleanPin || sanitizePin(localStorage.getItem(`openmun_conf_pin_${cleanId}`) || '');
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
    const cleanId = sanitizeId(id);
    if (luax) return luax.getSummary(cleanId);
    const url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanId)}/resumen`;
    const data = await fetchWithDeduplication(url, 4000);
    const active = this.obtenerSesionActiva();
    if (active?.id === cleanId && active?.email_admin && !data.email_admin) {
      data.email_admin = active.email_admin;
    }
    return data;
  },

  async actualizarConferencia(id, { pin_admin_actual, nombre, nuevo_pin_admin, pin_acceso, email_admin }) {
    const cleanId = sanitizeId(id);
    const cleanNombre = nombre !== undefined && nombre !== null ? sanitizeString(nombre, 255) : undefined;
    const cleanNuevoPin = nuevo_pin_admin !== undefined && nuevo_pin_admin !== null && String(nuevo_pin_admin).trim() !== '' ? sanitizePin(nuevo_pin_admin) : undefined;
    const cleanPinAcceso = pin_acceso !== undefined ? (pin_acceso ? sanitizePin(pin_acceso) : null) : undefined;
    const cleanEmail = email_admin !== undefined ? sanitizeEmail(email_admin) : undefined;

    if (luax) {
      const result = await luax.updateConference(cleanId, { nombre: cleanNombre, nuevo_pin_admin: cleanNuevoPin, pin_acceso: cleanPinAcceso, email_admin: cleanEmail });
      if (result.reauthenticate) {
        luax.clear();
        await luax.verifyOrganization(cleanId, cleanNuevoPin || pin_admin_actual);
      }
      this.guardarSesionActiva({ id: cleanId, ...result });
      return result;
    }
    
    // Obtener pin_admin_actual del argumento o de la sesión activa
    let pinActual = pin_admin_actual;
    if (!pinActual) {
      const active = this.obtenerSesionActiva();
      if (active?.id === cleanId && active?.pin_admin) {
        pinActual = active.pin_admin;
      }
    }

    const payload = {
      pin_admin_actual: pinActual ? sanitizePin(pinActual) : ''
    };

    if (cleanNombre !== undefined) payload.nombre = cleanNombre;
    if (cleanNuevoPin !== undefined) payload.nuevo_pin_admin = cleanNuevoPin;
    if (cleanPinAcceso !== undefined) payload.pin_acceso = cleanPinAcceso;
    if (cleanEmail !== undefined) payload.email_admin = cleanEmail;

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
  async exportarHistorialComite(conferenciaId, comiteId) {
    const { mensajes } = await luax.getCommitteeHistory(sanitizeId(comiteId), sanitizeId(conferenciaId));
    return mensajes;
  },

  async restaurarHistorialComite(conferenciaId, comiteId, mensajes) {
    if (!luax || !Array.isArray(mensajes)) throw new Error(i18n.t('ui.couldNotExtractValidCommitteeData'));
    for (let start = 0; start < mensajes.length; start += 10) {
      await luax.restoreCommitteeHistory(sanitizeId(comiteId), sanitizeId(conferenciaId), mensajes.slice(start, start + 10));
    }
  },

  async crearOActualizarComite(conferenciaId, { id, nombre, pin_mesa, datos_json }) {
    const cleanConfId = sanitizeId(conferenciaId);
    const finalId = id ? sanitizeId(id) : `${cleanConfId}_${crypto.randomUUID().slice(0, 8)}`;
    const cleanNombre = nombre ? sanitizeString(nombre, 255) : undefined;
    const cleanPinMesa = pin_mesa ? sanitizePin(pin_mesa) : null;
    const cleanDatos = sanitizeJsonObject(datos_json || {});
    if (luax) return luax.createCommittee(cleanConfId, { id: finalId, nombre: cleanNombre, pin_mesa: cleanPinMesa, datos_json: cleanDatos });
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/comites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: finalId,
        nombre: cleanNombre,
        pin_mesa: cleanPinMesa,
        datos_json: cleanDatos
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  async actualizarComite(comiteId, { nombre, pin_mesa, tipo_sesion, topico_actual, datos_json, backupOnly } = {}) {
    if (!comiteId) throw new Error(i18n.t('ui.committeeIdRequired'));
    const cleanComiteId = sanitizeId(comiteId);
    const payload = {};
    if (nombre !== undefined) payload.nombre = nombre !== null ? sanitizeString(nombre, 255) : null;
    if (pin_mesa !== undefined) payload.pin_mesa = pin_mesa !== null ? sanitizePin(pin_mesa) : null;
    if (tipo_sesion !== undefined) payload.tipo_sesion = sanitizeString(tipo_sesion, 32).toLowerCase();
    if (topico_actual !== undefined) payload.topico_actual = topico_actual !== null ? sanitizeTopic(topico_actual, 2000) : '';
    if (datos_json !== undefined) payload.datos_json = sanitizeJsonObject(datos_json);
    if (luax && backupOnly === true) payload.backupOnly = true;
    if (luax) return luax.updateCommittee(cleanComiteId, this.obtenerSesionActiva()?.id, payload);

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
    const cleanConfId = sanitizeId(conferenciaId);
    const cleanComiteId = comite_id ? sanitizeString(comite_id, 64) : null;
    const cleanEmisor = emisor ? sanitizeString(emisor, 128) : 'organizacion';
    const cleanTipo = tipo ? sanitizeString(tipo, 32) : 'info';
    const cleanMensaje = sanitizeString(mensaje, 8000);
    if (luax) return luax.createNotice(cleanConfId, localStorage.getItem('openmun_current_comite_id'), { comite_id: cleanComiteId, tipo: cleanTipo, mensaje: cleanMensaje });
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/avisos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comite_id: cleanComiteId,
        emisor: cleanEmisor,
        tipo: cleanTipo,
        mensaje: cleanMensaje
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    const avisoId = data?.aviso?.id || data?.id;
    if (avisoId) {
      registrarAvisoPropio(avisoId);
    }
    return data;
  },

  async obtenerAvisos(conferenciaId, comiteId = null, role = null, comiteNombre = null, todos = false) {
    const cleanConfId = sanitizeId(conferenciaId);
    if (luax) return luax.getNotices(cleanConfId, comiteId || localStorage.getItem('openmun_current_comite_id'), todos);
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/avisos`;
    const params = [];
    if (comiteId) {
      params.push(`comite_id=${encodeURIComponent(sanitizeString(comiteId, 64))}`);
    }
    if (role) {
      params.push(`role=${encodeURIComponent(sanitizeString(role, 32))}`);
    }
    if (comiteNombre) {
      params.push(`comite_nombre=${encodeURIComponent(sanitizeString(comiteNombre, 255))}`);
    }
    if (todos) {
      params.push('todos=true');
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return fetchWithDeduplication(url, 4000);
  },

  async desactivarAviso(avisoId, conferenciaId = null) {
    const cleanAvisoId = sanitizeDatabaseId(avisoId) || sanitizeString(avisoId, 64);
    const cleanConfId = conferenciaId ? sanitizeId(conferenciaId) : null;
    if (luax) return luax.deactivateNotice(cleanConfId || this.obtenerSesionActiva()?.id, localStorage.getItem('openmun_current_comite_id'), cleanAvisoId);
    const res = await fetch(`${API_BASE_URL}/api/avisos/${encodeURIComponent(cleanAvisoId)}/desactivar`, {
      method: 'PATCH'
    });
    const data = await handleResponse(res);
    if (cleanConfId) {
      invalidateConferenceCache(cleanConfId);
    } else {
      requestCache.clear();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openmun_aviso_desactivado', { detail: { id: cleanAvisoId } }));
    }
    return data;
  },

  // ── 4. CHECKLIST DE STAFF ──
  async obtenerChecklist(conferenciaId, comiteId = null) {
    const cleanConfId = sanitizeId(conferenciaId);
    if (luax) return luax.getChecklist(cleanConfId, comiteId);
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist`;
    if (comiteId) {
      url += `?comite_id=${encodeURIComponent(sanitizeString(comiteId, 64))}`;
    }
    return fetchWithDeduplication(url, 4000);
  },

  async crearTareaChecklist(conferenciaId, { comite_id, titulo, asignado_a }) {
    const cleanConfId = sanitizeId(conferenciaId);
    const cleanComiteId = comite_id ? sanitizeString(comite_id, 64) : null;
    const cleanTitulo = sanitizeString(titulo, 255);
    const cleanAsignadoA = asignado_a ? sanitizeString(asignado_a, 128) : null;
    if (luax) return luax.createChecklistTask(cleanConfId, { comite_id: cleanComiteId, titulo: cleanTitulo, asignado_a: cleanAsignadoA });
    const res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comite_id: cleanComiteId,
        titulo: cleanTitulo,
        asignado_a: cleanAsignadoA
      })
    });
    const data = await handleResponse(res);
    invalidateConferenceCache(cleanConfId);
    return data;
  },

  async toggleTareaChecklist(tareaId, completado, conferenciaId) {
    const cleanTareaId = sanitizeDatabaseId(tareaId) || sanitizeString(tareaId, 64);
    const cleanConfId = conferenciaId ? sanitizeId(conferenciaId) : null;
    if (luax) return luax.setChecklistTaskDone(cleanConfId, cleanTareaId, completado);
    const res = await fetch(`${API_BASE_URL}/api/checklist/${encodeURIComponent(cleanTareaId)}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado: Boolean(completado) })
    });
    const data = await handleResponse(res);
    requestCache.clear();
    return data;
  },

  async eliminarTareaChecklist(tareaId, conferenciaId) {
    const cleanTareaId = sanitizeDatabaseId(tareaId) || sanitizeString(tareaId, 64);
    const cleanConfId = conferenciaId ? sanitizeId(conferenciaId) : null;
    if (luax) return luax.removeChecklistTask(cleanConfId, cleanTareaId);
    const res = await fetch(`${API_BASE_URL}/api/checklist/${encodeURIComponent(cleanTareaId)}`, {
      method: 'DELETE'
    });
    const data = await handleResponse(res);
    requestCache.clear();
    return data;
  },

  async eliminarTareasCompletadas(conferenciaId, comiteId = null) {
    const cleanConfId = sanitizeId(conferenciaId);
    const cleanComiteId = comiteId ? sanitizeString(comiteId, 64) : null;
    if (luax) return luax.removeCompletedChecklistTasks(cleanConfId, cleanComiteId);
    let url = `${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/checklist/completados`;
    if (cleanComiteId) {
      url += `?comite_id=${encodeURIComponent(cleanComiteId)}`;
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
    const cleanId = sanitizeId(conferenciaId);
    const cleanPin = sanitizePin(pin);
    if (!cleanPin) {
      const err = new Error(i18n.t('ui.secretariatPinRequired'));
      err.status = 400;
      throw err;
    }

    if (luax) return luax.verifyOrganization(cleanId, cleanPin);
    const active = this.obtenerSesionActiva();
    
    // Si la sesión activa tiene un pin_admin guardado localmente, compararlo primero
    if (active && active.id === cleanId && active.pin_admin) {
      if (String(active.pin_admin).trim() !== cleanPin) {
        const err = new Error(i18n.t('ui.incorrectSecretariatPin'));
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
    if (!comiteId) throw new Error(i18n.t('ui.committeeIdRequired'));
    const cleanComiteId = sanitizeId(comiteId);
    const cleanPin = sanitizePin(pin);
    if (!cleanPin) {
      const err = new Error(i18n.t('ui.chairPinRequired'));
      err.status = 400;
      throw err;
    }

    if (luax) return luax.verifyChair(cleanComiteId, cleanPin);
    // 1. Si se conoce el pin_mesa esperado del comité, verificar coincidencia estricta
    if (pinEsperado && sanitizePin(pinEsperado) !== cleanPin) {
      const err = new Error(i18n.t('ui.incorrectChairPin'));
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
    if (!comiteId) throw new Error(i18n.t('ui.committeeIdRequired'));
    const cleanId = sanitizeId(comiteId);
    if (luax) return luax.getCommittee(cleanId, this.obtenerSesionActiva()?.id);
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
    if (!comiteId) throw new Error(i18n.t('ui.committeeIdRequired'));
    const cleanComiteId = sanitizeId(comiteId);
    const cleanConfId = conferenciaId ? sanitizeId(conferenciaId) : (this.obtenerSesionActiva()?.id ? sanitizeId(this.obtenerSesionActiva().id) : null);
    if (luax) return luax.deleteCommittee(cleanComiteId, cleanConfId);

    let res = await fetch(`${API_BASE_URL}/api/comites/${encodeURIComponent(cleanComiteId)}`, {
      method: 'DELETE'
    });

    if (res.status === 404 && cleanConfId) {
      res = await fetch(`${API_BASE_URL}/api/conferencias/${encodeURIComponent(cleanConfId)}/comites/${encodeURIComponent(cleanComiteId)}`, {
        method: 'DELETE'
      });
    }

    const data = await handleResponse(res);

    if (cleanConfId) {
      invalidateConferenceCache(cleanConfId);
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

  // ── 4. GESTIÓN LOCAL DE CONFERENCIA ACTIVA Y AVISOS ──
  guardarSesionActiva(conferenciaData) {
    try {
      const actual = this.obtenerSesionActiva() || {};
      const merged = { ...actual, ...conferenciaData };
      if (luax) {
        delete merged.pin_admin;
        delete merged.pin_acceso;
      }
      localStorage.setItem('openmun_active_conference', JSON.stringify(merged));
      
      if (merged.id) {
        const cleanId = String(merged.id).trim().toLowerCase();
        localStorage.setItem('openmun_current_conf_id', cleanId);
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
      const fallbackConfId = localStorage.getItem('openmun_current_conf_id');
      if (fallbackConfId && fallbackConfId.trim()) {
        return { id: fallbackConfId.trim().toLowerCase() };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  limpiarSesionActiva() {
    luax?.clear();
    try {
      localStorage.removeItem('openmun_active_conference');
      localStorage.removeItem('openmun_current_conf_id');
      localStorage.removeItem('openmun_current_comite_id');
      localStorage.removeItem('openmun_current_comite_nombre');
      localStorage.removeItem('openmun_user_role');
      localStorage.removeItem('openmun_mesa_activa');
      localStorage.removeItem('openmun_cloud_active_comite');
      localStorage.removeItem('openmun_cloud_account');
      localStorage.removeItem('openmun_descartados_avisos');
      localStorage.removeItem('openmun_mis_avisos');
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage).forEach(k => {
          if (
            k.startsWith('openmun_conf_') ||
            k.startsWith('openmun_comite_') ||
            k.startsWith('openmun_cloud_')
          ) {
            try { localStorage.removeItem(k); } catch (e) {}
          }
        });
      }
    } catch (e) {
      console.warn('Error al limpiar sesión activa de conferencia:', e);
    }
  }
};

export default conferenceService;
