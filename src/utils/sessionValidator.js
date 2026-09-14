/**
 * sessionValidator.js
 * Validador robusto de archivos de sesión JSON para OpenMUN.
 * Comprueba sintaxis, estructura requerida y tipos de datos antes de importar
 * para prevenir errores de ejecución y roturas de estado.
 */

export function validateSessionJSON(rawInput) {
  let parsed = null;

  // 1. Validar sintaxis JSON si viene como texto
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return {
        valid: false,
        errorType: 'EMPTY_CONTENT',
        message: 'El archivo está vacío.'
      };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch (syntaxErr) {
      return {
        valid: false,
        errorType: 'SYNTAX_ERROR',
        message: `Error de sintaxis JSON: ${syntaxErr.message}`
      };
    }
  } else if (rawInput && typeof rawInput === 'object') {
    parsed = rawInput;
  } else {
    return {
      valid: false,
      errorType: 'INVALID_TYPE',
      message: 'El contenido no es un objeto JSON válido.'
    };
  }

  // 2. Comprobar que sea un objeto plano (no null ni array de primer nivel)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errorType: 'NOT_AN_OBJECT',
      message: 'El archivo debe ser un objeto JSON con los datos de la sesión.'
    };
  }

  // 3. Descartar explícitamente formatos ajenos conocidos (ComfyUI workflows, etc.)
  if (
    parsed.last_node_id !== undefined ||
    parsed.last_link_id !== undefined ||
    (Array.isArray(parsed.nodes) && parsed.nodes.some(n => n && (n.widgets_values !== undefined || n.pos !== undefined)))
  ) {
    return {
      valid: false,
      errorType: 'NOT_OPENMUN_SESSION',
      message: 'El archivo corresponde a un formato no compatible (flujo de ComfyUI) y no a una sesión de OpenMUN.'
    };
  }

  // 4. Comprobar si tiene claves representativas de openMUN
  const snapshot = parsed.localStorageSnapshot && typeof parsed.localStorageSnapshot === 'object'
    ? parsed.localStorageSnapshot
    : {};

  const hasExplicitBackupTag = parsed.tipo === 'openmun_full_backup' || parsed.tipo === 'openmun_session';
  const hasSnapshotKey = Object.keys(snapshot).some(k => k.startsWith('openmun_'));
  const hasPrefixedKey = Object.keys(parsed).some(k => k.startsWith('openmun_'));

  const directSessionKeys = [
    'paises',
    'oradoresCola',
    'oradoresGSL',
    'oradoresCaucus',
    'registroIntervenciones',
    'intervenciones',
    'mociones',
    'historicoMociones',
    'caucusActivo',
    'votacionSesion',
    'agendaSesion',
    'enmiendasSesion',
    'proyectoResolucion',
    'resolucion',
    'alertasCrisis',
    'eventosCrisis',
    'crisisEventos',
    'relojCrisis',
    'relojSimulacion',
    'notes',
    'openmun_notes'
  ];

  const hasDirectSessionKey = directSessionKeys.some(k => k in parsed);

  // Validar si 'config' o 'openmun_config' es una configuración real de OpenMUN
  const rawConfig = parsed.config || parsed.openmun_config || snapshot.openmun_config;
  let hasValidOpenMunConfig = false;
  if (rawConfig) {
    try {
      const cfgObj = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
      if (cfgObj && typeof cfgObj === 'object' && !Array.isArray(cfgObj)) {
        if (cfgObj.layouts && typeof cfgObj.layouts === 'object' && !Array.isArray(cfgObj.layouts)) {
          hasValidOpenMunConfig = true;
        } else if (cfgObj.theme && typeof cfgObj.theme === 'object' && (cfgObj.theme.backgroundColor || cfgObj.theme.primaryColor)) {
          hasValidOpenMunConfig = true;
        } else if (cfgObj.accessibility && typeof cfgObj.accessibility === 'object' && (cfgObj.accessibility.themeMode !== undefined || cfgObj.accessibility.dyslexiaMode !== undefined)) {
          hasValidOpenMunConfig = true;
        }
      }
    } catch {
      hasValidOpenMunConfig = false;
    }
  }

  const hasComiteKey = typeof parsed.nombreComite === 'string' || typeof parsed.comision === 'string';

  const isRecognizedSession = hasExplicitBackupTag || hasSnapshotKey || hasDirectSessionKey || hasPrefixedKey || (hasComiteKey && hasValidOpenMunConfig) || hasValidOpenMunConfig;

  if (!isRecognizedSession) {
    return {
      valid: false,
      errorType: 'NOT_OPENMUN_SESSION',
      message: 'El archivo no contiene una estructura reconocida de sesión de OpenMUN.'
    };
  }

  // 5. Validar y sanear estructuras internas para evitar crashes
  const sanitized = { ...parsed };

  // Países
  const rawPaises = sanitized.paises || snapshot.openmun_paises;
  if (rawPaises !== undefined) {
    if (!Array.isArray(rawPaises)) {
      return {
        valid: false,
        errorType: 'CORRUPT_PAISES',
        message: 'El listado de países (paises) debe ser una lista/array.'
      };
    }
    // Asegurar que cada país tenga al menos un identificador y nombre válidos
    sanitized.paises = rawPaises.filter(p => p && typeof p === 'object').map((p, idx) => ({
      id: p.id || `pais_${Date.now()}_${idx}`,
      nombre: typeof p.nombre === 'string' ? p.nombre : (p.name || `Delegación ${idx + 1}`),
      estatus: typeof p.estatus === 'string' ? p.estatus : 'Presente',
      bandera: typeof p.bandera === 'string' ? p.bandera : (p.flag || '🌐'),
      tieneVeto: Boolean(p.tieneVeto || p.veto),
      ...p
    }));
  }

  // Oradores
  const rawOradores = sanitized.oradoresCola || sanitized.oradoresGSL || snapshot.openmun_oradores;
  if (rawOradores !== undefined && !Array.isArray(rawOradores)) {
    return {
      valid: false,
      errorType: 'CORRUPT_ORADORES',
      message: 'La lista de oradores (oradoresCola) debe ser una lista/array.'
    };
  }

  // Caucus Oradores
  const rawCaucusOradores = sanitized.oradoresCaucus || snapshot.openmun_oradores_caucus;
  if (rawCaucusOradores !== undefined && !Array.isArray(rawCaucusOradores)) {
    return {
      valid: false,
      errorType: 'CORRUPT_CAUCUS_ORADORES',
      message: 'La lista de oradores del caucus debe ser una lista/array.'
    };
  }

  // Caucus Activo
  const rawCaucus = sanitized.caucusActivo || snapshot.openmun_caucus;
  if (rawCaucus !== undefined && (typeof rawCaucus !== 'object' || rawCaucus === null || Array.isArray(rawCaucus))) {
    return {
      valid: false,
      errorType: 'CORRUPT_CAUCUS',
      message: 'La configuración de caucus activo debe ser un objeto.'
    };
  }

  // Votación
  const rawVotacion = sanitized.votacionSesion || snapshot.openmun_votacion;
  if (rawVotacion !== undefined && (typeof rawVotacion !== 'object' || rawVotacion === null || Array.isArray(rawVotacion))) {
    return {
      valid: false,
      errorType: 'CORRUPT_VOTACION',
      message: 'El estado de votación debe ser un objeto válido.'
    };
  }

  // Proyecto de Resolución y Enmiendas
  const rawEnmiendas = sanitized.enmiendasSesion || sanitized.proyectoResolucion || sanitized.resolucion || snapshot.openmun_enmiendas;
  if (rawEnmiendas !== undefined && (typeof rawEnmiendas !== 'object' || rawEnmiendas === null || Array.isArray(rawEnmiendas))) {
    return {
      valid: false,
      errorType: 'CORRUPT_ENMIENDAS',
      message: 'La estructura de enmiendas y proyecto de resolución debe ser un objeto válido.'
    };
  }

  // Configuración de Layouts / Widgets
  if (rawConfig !== undefined) {
    try {
      const parsedConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
      if (parsedConfig && typeof parsedConfig === 'object' && !Array.isArray(parsedConfig)) {
        // Asegurar que layouts sea un objeto válido si existe
        if (parsedConfig.layouts && (typeof parsedConfig.layouts !== 'object' || Array.isArray(parsedConfig.layouts))) {
          return {
            valid: false,
            errorType: 'CORRUPT_CONFIG_LAYOUTS',
            message: 'La configuración de layouts de la sesión está dañada.'
          };
        }
        if (parsedConfig.layouts || parsedConfig.theme || parsedConfig.accessibility) {
          sanitized.config = parsedConfig;
        } else {
          delete sanitized.config;
        }
      } else {
        delete sanitized.config;
      }
    } catch {
      return {
        valid: false,
        errorType: 'CORRUPT_CONFIG',
        message: 'La configuración de interfaz (config) no pudo ser leída.'
      };
    }
  }

  return {
    valid: true,
    data: sanitized
  };
}

/**
 * normalizarDatosComite
 * Desempaqueta y normaliza exhaustivamente el estado completo de un comité
 * admitiendo cualquier estructura (datos_json anidado, backups completos, snapshots o presets).
 */
export function normalizarDatosComite(rawInput, fallbackNombre = '') {
  if (!rawInput) return null;

  let obj = rawInput;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj.trim());
    } catch {
      return null;
    }
  }

  if (!obj || typeof obj !== 'object') return null;

  // 1. Desempaquetar si viene envuelto en datos_json, datos, state o tabla comites
  let inner = obj;
  if (obj.datos_json) {
    if (typeof obj.datos_json === 'string') {
      try { inner = { ...obj, ...JSON.parse(obj.datos_json) }; } catch { inner = obj; }
    } else if (typeof obj.datos_json === 'object') {
      inner = { ...obj, ...obj.datos_json };
    }
  } else if (obj.datos && typeof obj.datos === 'object') {
    inner = { ...obj, ...obj.datos };
  } else if (obj.state && typeof obj.state === 'object') {
    inner = { ...obj, ...obj.state };
  }

  const snapshot = inner.localStorageSnapshot && typeof inner.localStorageSnapshot === 'object'
    ? inner.localStorageSnapshot
    : {};

  // 2. Extraer nombre de comisión/comité
  const rawNombre = inner.comision || inner.nombreComite || inner.nombre || inner.name || snapshot.openmun_comite || fallbackNombre || 'Comité MUN';
  const cleanNombre = typeof rawNombre === 'string' ? rawNombre.trim() : 'Comité MUN';

  // 3. Extraer y normalizar lista de países / delegaciones
  let rawPaises = inner.paises || inner.delegaciones || inner.countries || snapshot.openmun_paises;
  if (typeof rawPaises === 'string') {
    try { rawPaises = JSON.parse(rawPaises); } catch { rawPaises = []; }
  }
  if (!Array.isArray(rawPaises)) rawPaises = [];

  const paisesNormalizados = rawPaises.filter(p => p && typeof p === 'object').map((p, idx) => ({
    id: p.id || `pais_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    nombre: typeof p.nombre === 'string' && p.nombre.trim() ? p.nombre.trim() : (p.name || `Delegación ${idx + 1}`),
    bandera: typeof p.bandera === 'string' ? p.bandera : (p.flag || '🌐'),
    veto: Boolean(p.veto !== undefined ? p.veto : (p.tieneVeto !== undefined ? p.tieneVeto : false)),
    estatus: typeof p.estatus === 'string' ? p.estatus : 'Ausente'
  }));

  // 4. Extraer Agenda
  let rawAgenda = inner.agendaSesion || inner.agenda || snapshot.openmun_agenda;
  if (typeof rawAgenda === 'string') {
    try { rawAgenda = JSON.parse(rawAgenda); } catch { rawAgenda = {}; }
  }
  if (!rawAgenda || typeof rawAgenda !== 'object' || Array.isArray(rawAgenda)) {
    rawAgenda = {};
  }
  const agendaNormalizada = {
    establecida: Boolean(rawAgenda.establecida),
    temaActual: typeof rawAgenda.temaActual === 'string' ? rawAgenda.temaActual : (rawAgenda.tema || rawAgenda.topico || ''),
    temasPropuestos: Array.isArray(rawAgenda.temasPropuestos) ? rawAgenda.temasPropuestos : (Array.isArray(rawAgenda.temas) ? rawAgenda.temas : []),
    ordenDia: Array.isArray(rawAgenda.ordenDia) ? rawAgenda.ordenDia : (Array.isArray(rawAgenda.agenda) ? rawAgenda.agenda : [])
  };

  // 5. Oradores y Listas
  let rawOradores = inner.oradoresCola || inner.oradoresGSL || snapshot.openmun_oradores;
  if (typeof rawOradores === 'string') {
    try { rawOradores = JSON.parse(rawOradores); } catch { rawOradores = []; }
  }
  const oradoresCola = Array.isArray(rawOradores) ? rawOradores : [];

  let rawCaucusOradores = inner.oradoresCaucus || snapshot.openmun_oradores_caucus;
  if (typeof rawCaucusOradores === 'string') {
    try { rawCaucusOradores = JSON.parse(rawCaucusOradores); } catch { rawCaucusOradores = []; }
  }
  const oradoresCaucus = Array.isArray(rawCaucusOradores) ? rawCaucusOradores : [];

  // 6. Registro de Intervenciones
  let rawIntervenciones = inner.registroIntervenciones || inner.intervenciones || snapshot.openmun_intervenciones;
  if (typeof rawIntervenciones === 'string') {
    try { rawIntervenciones = JSON.parse(rawIntervenciones); } catch { rawIntervenciones = []; }
  }
  const registroIntervenciones = Array.isArray(rawIntervenciones) ? rawIntervenciones : [];

  // 7. Mociones e Histórico
  let rawMociones = inner.mociones || snapshot.openmun_mociones;
  if (typeof rawMociones === 'string') {
    try { rawMociones = JSON.parse(rawMociones); } catch { rawMociones = []; }
  }
  const mociones = Array.isArray(rawMociones) ? rawMociones : [];

  let rawHistorico = inner.historicoMociones || snapshot.openmun_historico_mociones;
  if (typeof rawHistorico === 'string') {
    try { rawHistorico = JSON.parse(rawHistorico); } catch { rawHistorico = []; }
  }
  const historicoMociones = Array.isArray(rawHistorico) ? rawHistorico : [];

  // 8. Caucus Activo
  let rawCaucus = inner.caucusActivo || inner.caucus || snapshot.openmun_caucus;
  if (typeof rawCaucus === 'string') {
    try { rawCaucus = JSON.parse(rawCaucus); } catch { rawCaucus = null; }
  }
  const caucusActivo = (rawCaucus && typeof rawCaucus === 'object' && !Array.isArray(rawCaucus)) ? rawCaucus : null;

  // 9. Votación de Sesión
  let rawVotacion = inner.votacionSesion || inner.votacion || snapshot.openmun_votacion;
  if (typeof rawVotacion === 'string') {
    try { rawVotacion = JSON.parse(rawVotacion); } catch { rawVotacion = null; }
  }
  const votacionSesion = (rawVotacion && typeof rawVotacion === 'object' && !Array.isArray(rawVotacion)) ? rawVotacion : null;

  // 10. Proyecto de Resolución y Enmiendas
  let rawEnmiendas = inner.enmiendasSesion || inner.proyectoResolucion || inner.resolucion || snapshot.openmun_enmiendas;
  if (typeof rawEnmiendas === 'string') {
    try { rawEnmiendas = JSON.parse(rawEnmiendas); } catch { rawEnmiendas = null; }
  }
  let enmiendasSesion = null;
  if (rawEnmiendas && typeof rawEnmiendas === 'object' && !Array.isArray(rawEnmiendas)) {
    enmiendasSesion = {
      tituloProyecto: rawEnmiendas.tituloProyecto || rawEnmiendas.titulo || 'Proyecto de Resolución A/RES/79/1',
      textoResolucion: rawEnmiendas.textoResolucion || rawEnmiendas.texto || '',
      articulos: Array.isArray(rawEnmiendas.articulos) ? rawEnmiendas.articulos : [],
      enmiendas: Array.isArray(rawEnmiendas.enmiendas) ? rawEnmiendas.enmiendas : []
    };
  }

  // 11. Crisis
  let rawEventosCrisis = inner.eventosCrisis || inner.alertasCrisis || inner.crisisEventos || inner.crisis || snapshot.openmun_crisis_eventos;
  if (typeof rawEventosCrisis === 'string') {
    try { rawEventosCrisis = JSON.parse(rawEventosCrisis); } catch { rawEventosCrisis = []; }
  }
  const eventosCrisis = Array.isArray(rawEventosCrisis) ? rawEventosCrisis : [];

  let rawRelojCrisis = inner.relojCrisis || inner.relojSimulacion || inner.reloj || snapshot.openmun_crisis_reloj;
  if (typeof rawRelojCrisis === 'string') {
    try { rawRelojCrisis = JSON.parse(rawRelojCrisis); } catch { rawRelojCrisis = null; }
  }
  const relojCrisis = (rawRelojCrisis && typeof rawRelojCrisis === 'object' && !Array.isArray(rawRelojCrisis)) ? rawRelojCrisis : null;

  // 12. Notas, Ajustes de Sala y Configuración
  let rawNotes = inner.notes || inner.openmun_notes || snapshot.openmun_notes;
  if (typeof rawNotes === 'string') {
    try { rawNotes = JSON.parse(rawNotes); } catch { rawNotes = []; }
  }
  const notes = Array.isArray(rawNotes) ? rawNotes : [];

  let rawRoomSettings = inner.roomSettings || inner.openmun_room_settings || snapshot.openmun_room_settings;
  if (typeof rawRoomSettings === 'string') {
    try { rawRoomSettings = JSON.parse(rawRoomSettings); } catch { rawRoomSettings = null; }
  }
  const roomSettings = (rawRoomSettings && typeof rawRoomSettings === 'object' && !Array.isArray(rawRoomSettings)) ? rawRoomSettings : null;

  let rawConfig = inner.config || inner.openmun_config || snapshot.openmun_config;
  if (typeof rawConfig === 'string') {
    try { rawConfig = JSON.parse(rawConfig); } catch { rawConfig = null; }
  }
  const config = (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) ? rawConfig : null;

  // 13. Tipo de Sesión
  const rawTipo = inner.tipoSesion || inner.tipo_sesion || snapshot.openmun_tipo_sesion || 'formal';
  const tipoSesion = typeof rawTipo === 'string' ? rawTipo : 'formal';

  // 14. PIN de mesa
  const pin_mesa = inner.pin_mesa || inner.pinMesa || obj.pin_mesa || null;

  return {
    comision: cleanNombre,
    nombreComite: cleanNombre,
    tipoSesion,
    pin_mesa,
    paises: paisesNormalizados,
    agendaSesion: agendaNormalizada,
    oradoresCola,
    oradoresCaucus,
    registroIntervenciones,
    mociones,
    historicoMociones,
    caucusActivo,
    votacionSesion,
    proyectoResolucion: enmiendasSesion,
    enmiendasSesion,
    eventosCrisis,
    relojCrisis,
    notes,
    roomSettings,
    config
  };
}

