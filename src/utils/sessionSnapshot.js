import { sessionStore as localStorage } from './sessionStorage.js';
export function readStoredJSON(key, fallback, storage = localStorage) {
  let value;
  try {
    value = storage.getItem(key);
    if (value === null) return fallback;
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback) ? !Array.isArray(parsed) : fallback && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) throw new Error('Formato de almacenamiento incorrecto.');
    return parsed;
  } catch (error) {
    try { if (typeof value === 'string') storage.setItem?.(`openmun_recovery_${Date.now()}_${key}`, value); } catch { /* A full disk must not prevent opening the session. */ }
    console.warn(`No se pudo recuperar ${key}.`, error);
    return fallback;
  }
}

export function createSessionSnapshot(state, storage = localStorage) {
  const resolution = state.enmiendasSesion || {};
  return {
    version: '2.0',
    tipo: 'openmun_full_backup',
    fechaExportacion: new Date().toISOString(),
    comision: state.nombreComite || 'Asamblea General - openMUN',
    nombreComite: state.nombreComite || '',
    tipoSesion: state.tipoSesion,
    paises: state.paises || [],
    oradoresCola: state.oradoresCola || [],
    oradoresCaucus: state.oradoresCaucus || [],
    registroIntervenciones: state.registroIntervenciones || [],
    mociones: state.mociones || [],
    historicoMociones: state.historicoMociones || [],
    caucusActivo: state.caucusActivo,
    votacionSesion: state.votacionSesion,
    agendaSesion: state.agendaSesion,
    enmiendasSesion: resolution,
    proyectoResolucion: {
      titulo: resolution.tituloProyecto || resolution.titulo || 'Proyecto de Resolución A/RES/79/1',
      texto: resolution.textoResolucion || resolution.texto || '',
      articulos: resolution.articulos || [],
      enmiendas: resolution.enmiendas || []
    },
    eventosCrisis: readStoredJSON('openmun_crisis_eventos', [], storage),
    relojCrisis: readStoredJSON('openmun_crisis_reloj', null, storage),
    notes: readStoredJSON('openmun_notes', [], storage),
    announcements: readStoredJSON('openmun_announcements', [], storage),
    roomSettings: readStoredJSON('openmun_room_settings', {}, storage),
    config: readStoredJSON('openmun_config', {}, storage)
  };
}
