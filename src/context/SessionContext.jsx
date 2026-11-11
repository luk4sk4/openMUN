import i18n from '../languages/index.js';
import { useTranslation } from 'react-i18next';
import { normalizarSesionesDebate, necesitaConfirmarSesion, fechaRegistro } from '../utils/debateSessions';
import NewDebateSessionModal from '../components/modals/NewDebateSessionModal';
import GavelAnimation from '../components/common/GavelAnimation';
import ConfettiAnimation from '../components/common/ConfettiAnimation';
import { registrarVotoConDerechos } from '../utils/votingRights';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { conferenceService } from '../services/conferenceService';
import {
  registrarConferencia,
  loginConferencia,
  cerrarSesionConferencia,
  guardarComite,
  listarComites,
  cargarComite,
  eliminarComite,
  obtenerCuentaActiva
} from '../services/supabaseService';
import { validateSessionJSON, normalizarDatosComite, SESSION_STORAGE_KEYS } from '../utils/sessionValidator';
import { getFlagEmoji } from '../utils/flags';
import { parsearResolucion, reconstruirTextoResolucion, aplicarEnmiendaAArticulos } from '../utils/resolutionUtils';

const SessionContext = createContext();

const PAISES_INICIALES = [];
const SESSION_SYNC_CHANNEL_NAME = 'openmun_session_sync';

export const SessionProvider = ({ children }) => {
  const { t } = useTranslation();
  const [confirmarSesion, setConfirmarSesion] = useState(false);
  const confirmarSesionRef = useRef(null);
  const tabInstanceId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).current;
  const broadcastChannelRef = useRef(null);

  const [tipoSesion, setTipoSesionState] = useState(() => {
    return localStorage.getItem('openmun_tipo_sesion') || 'formal';
  });

  const [paises, setPaisesState] = useState(() => {
    const saved = localStorage.getItem('openmun_paises');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return PAISES_INICIALES;
  });

  const [oradoresCola, setOradoresColaState] = useState(() => {
    const saved = localStorage.getItem('openmun_oradores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [oradoresCaucus, setOradoresCaucusState] = useState(() => {
    const saved = localStorage.getItem('openmun_oradores_caucus');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [registroIntervenciones, setRegistroIntervencionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_intervenciones');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [mociones, setMocionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_mociones');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [historicoMociones, setHistoricoMocionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_historico_mociones');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [caucusActivo, setCaucusActivoState] = useState(() => {
    const defaultCaucus = {
      activo: false,
      proponente: '',
      posicionProponente: 'Primero',
      tipo: 'Caucus Moderado',
      varianteConsulta: '',
      tema: '',
      tiempoTotal: 600,
      tiempoOrador: 45
    };
    const saved = localStorage.getItem('openmun_caucus');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return defaultCaucus;
  });

  const [votacionSesion, setVotacionSesionState] = useState(() => {
    const defaultVotacion = {
      asunto: i18n.t('ui.draftResolutionMotion'),
      tipoVotacion: 'procedural',
      tipoMayoria: 'simple',
      aplicarVeto: true,
      votos: {}
    };
    const saved = localStorage.getItem('openmun_votacion');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return defaultVotacion;
  });

  const [agendaSesion, setAgendaSesionState] = useState(() => {
    const defaultAgenda = {
      establecida: false,
      temaActual: '',
      temasPropuestos: []
    };
    const saved = localStorage.getItem('openmun_agenda');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return defaultAgenda;
  });

  const [nombreComite, setNombreComiteState] = useState(() => {
    return localStorage.getItem('openmun_comite') || '';
  });

  const [enmiendasSesion, setEnmiendasSesionState] = useState(() => {
    const defaultEnmiendas = {
      tituloProyecto: i18n.t('ui.draftResolutionARes791'),
      textoResolucion: '',
      articulos: [],
      enmiendas: []
    };
    const saved = localStorage.getItem('openmun_enmiendas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return defaultEnmiendas;
  });

  const [relojGSLState, setRelojGSLState] = useState({ segundosRestantes: 60, tiempoInicial: 60, corriendo: false });
  const [relojDebateState, setRelojDebateState] = useState(() => {
    const defaultReloj = {
      modo: 'GSL',
      corriendo: false,
      segundosRestantes: 60,
      tiempoInicial: 60,
      timestamp: Date.now(),
      tiempoTotalSeg: 600,
      tiempoTotalInicial: 600,
      tiempoOradorSeg: 45,
      limiteOradorSeg: 45
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('openmun_reloj_debate');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            if (parsed.corriendo && parsed.timestamp) {
              const transcurrido = Math.floor((Date.now() - parsed.timestamp) / 1000);
              parsed.segundosRestantes = (parsed.segundosRestantes ?? 60) - transcurrido;
              if (parsed.tiempoOradorSeg !== undefined) {
                parsed.tiempoOradorSeg = parsed.tiempoOradorSeg - transcurrido;
              }
              if (parsed.tiempoTotalSeg !== undefined) {
                parsed.tiempoTotalSeg = Math.max(0, parsed.tiempoTotalSeg - transcurrido);
              }
              parsed.timestamp = Date.now();
            }
            return { ...defaultReloj, ...parsed };
          }
        }
      } catch { /* ignore */ }
    }
    return defaultReloj;
  });
  const [yieldEvento, setYieldEvento] = useState(null);

  // Estados de Supabase Cloud
  const [cloudAccount, setCloudAccount] = useState(() => obtenerCuentaActiva());
  const [isCloudLinked, setIsCloudLinked] = useState(() => Boolean(obtenerCuentaActiva()));
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [cloudComitesList, setCloudComitesList] = useState([]);
  const [cloudLastSync, setCloudLastSync] = useState(null);
  const [cloudActiveComiteName, setCloudActiveComiteName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('openmun_cloud_active_comite') : '') || '';
  });
  const isInitialCloudSyncRef = useRef(false);

  // Mantener referencias actualizadas para lectura en callbacks
  const stateRef = useRef({
    tipoSesion,
    paises,
    oradoresCola,
    oradoresCaucus,
    registroIntervenciones,
    mociones,
    historicoMociones,
    caucusActivo,
    votacionSesion,
    agendaSesion,
    nombreComite,
    enmiendasSesion,
    relojGSLState,
    relojDebateState
  });

  useEffect(() => {
    stateRef.current = {
      tipoSesion,
      paises,
      oradoresCola,
      oradoresCaucus,
      registroIntervenciones,
      mociones,
      historicoMociones,
      caucusActivo,
      votacionSesion,
      agendaSesion,
      nombreComite,
      enmiendasSesion,
      relojGSLState,
      relojDebateState
    };
  }, [tipoSesion, paises, oradoresCola, oradoresCaucus, registroIntervenciones, mociones, historicoMociones, caucusActivo, votacionSesion, agendaSesion, nombreComite, enmiendasSesion, relojGSLState, relojDebateState]);

  // PERSISTENCIA EN LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem('openmun_tipo_sesion', tipoSesion);
    localStorage.setItem('openmun_paises', JSON.stringify(paises));
    localStorage.setItem('openmun_oradores', JSON.stringify(oradoresCola));
    localStorage.setItem('openmun_oradores_caucus', JSON.stringify(oradoresCaucus));
    localStorage.setItem('openmun_intervenciones', JSON.stringify(registroIntervenciones));
    localStorage.setItem('openmun_mociones', JSON.stringify(mociones));
    localStorage.setItem('openmun_historico_mociones', JSON.stringify(historicoMociones));
    localStorage.setItem('openmun_caucus', JSON.stringify(caucusActivo));
    localStorage.setItem('openmun_votacion', JSON.stringify(votacionSesion));
    localStorage.setItem('openmun_agenda', JSON.stringify(agendaSesion));
    localStorage.setItem('openmun_comite', nombreComite);
    localStorage.setItem('openmun_enmiendas', JSON.stringify(enmiendasSesion));
    localStorage.setItem('openmun_reloj_debate', JSON.stringify(relojDebateState));

    const sesionDataCompleta = {
      version: '2.0',
      ultimaActualizacion: new Date().toISOString(),
      comision: nombreComite || 'Asamblea General - openMUN',
      tipoSesion,
      paises,
      oradoresCola,
      oradoresCaucus,
      registroIntervenciones,
      mociones,
      historicoMociones,
      caucusActivo,
      votacionSesion,
      agendaSesion,
      proyectoResolucion: {
        titulo: enmiendasSesion?.tituloProyecto || i18n.t('ui.draftResolutionARes791'),
        texto: enmiendasSesion?.textoResolucion || '',
        articulos: enmiendasSesion?.articulos || [],
        enmiendas: enmiendasSesion?.enmiendas || []
      },
      enmiendasSesion
    };

    localStorage.setItem('sesion_activa.json', JSON.stringify(sesionDataCompleta));
  }, [tipoSesion, paises, oradoresCola, oradoresCaucus, registroIntervenciones, mociones, historicoMociones, caucusActivo, votacionSesion, agendaSesion, nombreComite, enmiendasSesion]);

  // EMITIR ACCIONES A CANALES LOCALES Y EVENTOS DOM PARA P2P
  const emitirAccion = useCallback((accion, payload) => {
    // 1. Canal local BroadcastChannel (sincroniza entre pestañas del mismo navegador)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'SESSION_ACTION',
          accion,
          payload,
          senderTab: tabInstanceId,
          timestamp: Date.now()
        });
      } catch (err) {
        console.warn('Error publicando en BroadcastChannel:', err);
      }
    }

    // 2. Disparar evento DOM para que P2PContext lo transmita al Host remoto si somos cliente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openmun_session_action', {
        detail: { action: accion, payload, timestamp: Date.now() }
      }));
    }
  }, [tabInstanceId]);

  const actualizarSesionesDebate = useCallback((sesiones, ultimaActividad, emitir = true) => {
    const agenda = {
      ...stateRef.current.agendaSesion,
      sesionesDebate: normalizarSesionesDebate(sesiones),
      ultimaActividadDebate: Number.isSafeInteger(ultimaActividad) && ultimaActividad > 0 ? ultimaActividad : null
    };
    stateRef.current.agendaSesion = agenda;
    setAgendaSesionState(agenda);
    if (emitir) emitirAccion('actualizarSesionesDebate', { sesiones: agenda.sesionesDebate, ultimaActividad: agenda.ultimaActividadDebate });
  }, [emitirAccion]);

  const registrarActividadDebate = useCallback(() => {
    const agenda = stateRef.current.agendaSesion;
    if (agenda.sesionesDebate?.length) actualizarSesionesDebate(agenda.sesionesDebate, Date.now());
  }, [actualizarSesionesDebate]);

  const iniciarActividadDebate = useCallback(async () => {
    if (confirmarSesionRef.current) return confirmarSesionRef.current.promise;
    const agenda = stateRef.current.agendaSesion;
    const sesiones = normalizarSesionesDebate(agenda.sesionesDebate);
    const ultimaActividad = agenda.ultimaActividadDebate ?? stateRef.current.registroIntervenciones.reduce(
      (ultima, i) => Math.max(ultima, fechaRegistro(i) || 0), 0);
    let nueva = sesiones.length === 0;
    if (ultimaActividad > 0 && necesitaConfirmarSesion(ultimaActividad)) {
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      confirmarSesionRef.current = { promise, resolve };
      setConfirmarSesion(true);
      nueva = await promise;
      confirmarSesionRef.current = null;
      setConfirmarSesion(false);
    }
    const ahora = Date.now();
    if (nueva || sesiones.length === 0) {
      // Legacy records stay unassigned unless the chair explicitly continues them.
      const inicio = !nueva && ultimaActividad > 0
        ? stateRef.current.registroIntervenciones.reduce((inicio, i) => Math.min(inicio, fechaRegistro(i) || inicio), ahora)
        : ahora;
      sesiones.push(inicio);
    }
    actualizarSesionesDebate(sesiones, ahora);
  }, [actualizarSesionesDebate]);

  // CARGAR / REEMPLAZAR ESTADO COMPLETO Y AISLADO DE UN COMITÉ ESPECÍFICO
  const establecerEstadoComiteCompleto = useCallback((datosComite, defaultNombre = '') => {
    const normalizado = normalizarDatosComite(datosComite, defaultNombre);
    if (!normalizado) return;

    const {
      comision,
      paises: nuevosPaises,
      agendaSesion: nuevaAgenda,
      oradoresCola: nuevosOradores,
      oradoresCaucus: nuevosCaucus,
      registroIntervenciones: nuevasIntervenciones,
      mociones: nuevasMociones,
      historicoMociones: nuevoHistorico,
      caucusActivo: nuevoCaucus,
      votacionSesion: nuevaVotacion,
      enmiendasSesion: nuevasEnmiendas,
      tipoSesion: nuevoTipo,
      eventosCrisis,
      relojCrisis,
      notes,
      roomSettings,
      config
    } = normalizado;

    setNombreComiteState(comision);
    setPaisesState(nuevosPaises);
    setAgendaSesionState(nuevaAgenda);
    setOradoresColaState(nuevosOradores);
    setOradoresCaucusState(nuevosCaucus);
    setRegistroIntervencionesState(nuevasIntervenciones);
    setMocionesState(nuevasMociones);
    setHistoricoMocionesState(nuevoHistorico);
    setCaucusActivoState(nuevoCaucus);
    setTipoSesionState(nuevoTipo);
    setVotacionSesionState(nuevaVotacion || {
      asunto: i18n.t('ui.draftResolutionMotion'),
      tipoVotacion: 'procedural',
      tipoMayoria: 'simple',
      aplicarVeto: true,
      votos: {}
    });
    setEnmiendasSesionState(nuevasEnmiendas || {
      tituloProyecto: i18n.t('ui.draftResolutionARes791'),
      textoResolucion: '',
      articulos: [],
      enmiendas: []
    });

    // Persistir claves en localStorage para mantener sincronía inmediata
    try {
      localStorage.setItem('openmun_comite', comision);
      localStorage.setItem('openmun_paises', JSON.stringify(nuevosPaises));
      localStorage.setItem('openmun_agenda', JSON.stringify(nuevaAgenda));
      localStorage.setItem('openmun_oradores', JSON.stringify(nuevosOradores));
      localStorage.setItem('openmun_oradores_caucus', JSON.stringify(nuevosCaucus));
      localStorage.setItem('openmun_intervenciones', JSON.stringify(nuevasIntervenciones));
      localStorage.setItem('openmun_mociones', JSON.stringify(nuevasMociones));
      localStorage.setItem('openmun_historico_mociones', JSON.stringify(nuevoHistorico));
      localStorage.setItem('openmun_tipo_sesion', nuevoTipo);
      if (nuevoCaucus) {
        localStorage.setItem('openmun_caucus', JSON.stringify(nuevoCaucus));
      }
      if (nuevaVotacion) {
        localStorage.setItem('openmun_votacion', JSON.stringify(nuevaVotacion));
      }
      if (nuevasEnmiendas) {
        localStorage.setItem('openmun_enmiendas', JSON.stringify(nuevasEnmiendas));
      }
      if (eventosCrisis && eventosCrisis.length > 0) {
        localStorage.setItem('openmun_crisis_eventos', JSON.stringify(eventosCrisis));
      }
      if (relojCrisis) {
        localStorage.setItem('openmun_crisis_reloj', JSON.stringify(relojCrisis));
      }
      if (notes && notes.length > 0) {
        localStorage.setItem('openmun_notes', JSON.stringify(notes));
      }
      if (roomSettings) {
        localStorage.setItem('openmun_room_settings', JSON.stringify(roomSettings));
      }
      if (config) {
        localStorage.setItem('openmun_config', JSON.stringify(config));
      }
    } catch (e) {
      console.warn('Error persistiendo estado de comité en localStorage:', e);
    }

    // Notificar a todos los widgets y subsistemas de la aplicación
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', {
        detail: { eventos: eventosCrisis, reloj: relojCrisis }
      }));
      window.dispatchEvent(new CustomEvent('openmun_session_imported', { detail: normalizado }));
    }
  }, []);

  // AUTO-GUARDADO / SINCRONIZACIÓN CADA 1 MINUTO A LA BASE DE DATOS PARA MESA DIRECTIVA
  useEffect(() => {
    const sincronizarMesaBD = async () => {
      try {
        const isMesaActiva = localStorage.getItem('openmun_mesa_activa') === 'true';
        if (!isMesaActiva) return;

        const comiteId = localStorage.getItem('openmun_current_comite_id');
        const confId = localStorage.getItem('openmun_current_conf_id');
        if (!comiteId || !confId) return;

        const currentPaises = stateRef.current.paises || [];
        const currentNombre = stateRef.current.nombreComite || '';
        const currentTipo = stateRef.current.tipoSesion || 'formal';
        const currentAgenda = stateRef.current.agendaSesion || {};

        const sesionData = {
          version: '2.0',
          ultimaActualizacion: new Date().toISOString(),
          comision: currentNombre,
          nombreComite: currentNombre,
          tipoSesion: currentTipo,
          paises: currentPaises,
          oradoresCola: stateRef.current.oradoresCola || [],
          oradoresCaucus: stateRef.current.oradoresCaucus || [],
          registroIntervenciones: stateRef.current.registroIntervenciones || [],
          mociones: stateRef.current.mociones || [],
          historicoMociones: stateRef.current.historicoMociones || [],
          caucusActivo: stateRef.current.caucusActivo || null,
          votacionSesion: stateRef.current.votacionSesion || null,
          agendaSesion: currentAgenda,
          enmiendasSesion: stateRef.current.enmiendasSesion || null
        };

        // Guardar snapshot local indexado por id de comité
        localStorage.setItem(`openmun_comite_data_${comiteId}`, JSON.stringify(sesionData));

        // Actualizar datos y estado del comité en la Base de Datos (PATCH /api/comites/:id)
        // NOTA: No enviamos 'nombre' en el autoguardado periódico para evitar sobreescritura accidental de nombres de comités
        try {
          await conferenceService.actualizarComite(comiteId, {
            tipo_sesion: currentTipo,
            topico_actual: currentAgenda?.topico || currentAgenda?.tema || undefined,
            datos_json: sesionData,
            backupOnly: true
          });
        } catch (errPatch) {
          if (conferenceService.usesLuaxSessions) throw errPatch;
          // Si el comité no existiera aún en BD, crearlo vía POST
          await conferenceService.crearOActualizarComite(confId, {
            id: comiteId,
            nombre: currentNombre || undefined,
            datos_json: sesionData
          });
        }

        console.log(`[openMUN] Sincronización periódica de comité ${comiteId} a BD completada.`);
      } catch (err) {
        console.warn('[openMUN] Error en sincronización periódica a BD:', err?.message || err);
      }
    };

    // Ejecutar cada 60 segundos (1 minuto)
    const interval = setInterval(sincronizarMesaBD, 60000);
    return () => clearInterval(interval);
  }, []);

  // APLICAR ESTADO REMOTO COMPLETO
  const aplicarEstadoExterno = useCallback((nuevoEstado) => {
    if (!nuevoEstado || typeof nuevoEstado !== 'object') return;

    if (nuevoEstado.tipoSesion && typeof nuevoEstado.tipoSesion === 'string') {
      setTipoSesionState(nuevoEstado.tipoSesion);
      stateRef.current.tipoSesion = nuevoEstado.tipoSesion;
      localStorage.setItem('openmun_tipo_sesion', nuevoEstado.tipoSesion);
    }
    if (Array.isArray(nuevoEstado.paises)) {
      setPaisesState(nuevoEstado.paises);
      stateRef.current.paises = nuevoEstado.paises;
    }
    if (Array.isArray(nuevoEstado.oradoresCola)) {
      setOradoresColaState(nuevoEstado.oradoresCola);
      stateRef.current.oradoresCola = nuevoEstado.oradoresCola;
    }
    if (Array.isArray(nuevoEstado.oradoresCaucus)) {
      setOradoresCaucusState(nuevoEstado.oradoresCaucus);
      stateRef.current.oradoresCaucus = nuevoEstado.oradoresCaucus;
    }
    if (Array.isArray(nuevoEstado.registroIntervenciones)) {
      setRegistroIntervencionesState(nuevoEstado.registroIntervenciones);
      stateRef.current.registroIntervenciones = nuevoEstado.registroIntervenciones;
    }
    if (Array.isArray(nuevoEstado.mociones)) {
      setMocionesState(nuevoEstado.mociones);
      stateRef.current.mociones = nuevoEstado.mociones;
    }
    if (Array.isArray(nuevoEstado.historicoMociones)) {
      setHistoricoMocionesState(nuevoEstado.historicoMociones);
      stateRef.current.historicoMociones = nuevoEstado.historicoMociones;
    }
    if (nuevoEstado.caucusActivo && typeof nuevoEstado.caucusActivo === 'object') {
      setCaucusActivoState(nuevoEstado.caucusActivo);
      stateRef.current.caucusActivo = nuevoEstado.caucusActivo;
    }
    if (nuevoEstado.votacionSesion && typeof nuevoEstado.votacionSesion === 'object') {
      setVotacionSesionState(nuevoEstado.votacionSesion);
      stateRef.current.votacionSesion = nuevoEstado.votacionSesion;
    }
    if (nuevoEstado.agendaSesion && typeof nuevoEstado.agendaSesion === 'object') {
      setAgendaSesionState(nuevoEstado.agendaSesion);
      stateRef.current.agendaSesion = nuevoEstado.agendaSesion;
    }
    if (typeof nuevoEstado.nombreComite === 'string' && nuevoEstado.nombreComite) {
      setNombreComiteState(nuevoEstado.nombreComite);
      stateRef.current.nombreComite = nuevoEstado.nombreComite;
    } else if (typeof nuevoEstado.comision === 'string' && nuevoEstado.comision) {
      setNombreComiteState(nuevoEstado.comision);
      stateRef.current.nombreComite = nuevoEstado.comision;
    }
    if (nuevoEstado.enmiendasSesion && typeof nuevoEstado.enmiendasSesion === 'object') {
      setEnmiendasSesionState(nuevoEstado.enmiendasSesion);
      stateRef.current.enmiendasSesion = nuevoEstado.enmiendasSesion;
    }
    if (nuevoEstado.relojGSLState && typeof nuevoEstado.relojGSLState === 'object') {
      setRelojGSLState(nuevoEstado.relojGSLState);
      stateRef.current.relojGSLState = nuevoEstado.relojGSLState;
    }
    if (nuevoEstado.relojDebateState && typeof nuevoEstado.relojDebateState === 'object') {
      setRelojDebateState(nuevoEstado.relojDebateState);
      stateRef.current.relojDebateState = nuevoEstado.relojDebateState;

      if (typeof window !== 'undefined') {
        const r = nuevoEstado.relojDebateState;
        const esCaucus = Boolean(nuevoEstado.caucusActivo?.activo);
        const modo = r.modo || (esCaucus ? 'CAUCUS' : 'GSL');
        const signalDetail = {
          signal: r.corriendo ? 'start' : 'stop',
          source: 'remote_sync',
          segundosRestantes: r.segundosRestantes,
          tiempoInicial: r.tiempoInicial,
          tiempoOradorSeg: r.tiempoOradorSeg,
          limiteOradorSeg: r.limiteOradorSeg,
          tiempoTotalSeg: r.tiempoTotalSeg,
          modo,
          timestamp: r.timestamp || Date.now()
        };
        window.dispatchEvent(new CustomEvent('openmun_timer_signal', { detail: signalDetail }));
        window.dispatchEvent(new CustomEvent('openmun_timer_sync', { detail: r }));
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // FUNCIONES DE MUTACIÓN DE ESTADO
  // ─────────────────────────────────────────────────────────────

  // Votación
  const registrarVotoPais = useCallback((countryIdentifier, voto, emitir = true) => {
    if (!countryIdentifier) return;
    setVotacionSesionState(prev => {
      const currentPaises = stateRef.current.paises || [];
      const paisObj = currentPaises.find(
        p => p.id === countryIdentifier ||
             p.nombre?.toLowerCase() === String(countryIdentifier).toLowerCase()
      );
      const targetId = paisObj ? paisObj.id : countryIdentifier;

      // Normalizar texto de voto a clave estándar ('favor' | 'contra' | 'abstencion' | 'pasar' | 'favor_derechos' | 'contra_derechos')
      let normalizedVoto = voto;
      if (voto !== null && voto !== undefined) {
        const s = String(voto).trim().toLowerCase();
        if (s === 'favor_derechos' || s === 'a favor con derechos' || s === 'a favor c/ der.' || s === 'favor con derechos' || s === 'in favor with rights') {
          normalizedVoto = 'favor_derechos';
        } else if (s === 'contra_derechos' || s === 'en contra con derechos' || s === 'en contra c/ der.' || s === 'contra con derechos' || s === 'against with rights') {
          normalizedVoto = 'contra_derechos';
        } else if (s === 'favor' || s === 'a favor' || s === 'in favor' || s === 'yes' || s === 'si' || s === 'sí') {
          normalizedVoto = 'favor';
        } else if (s === 'contra' || s === 'en contra' || s === 'against' || s === 'no') {
          normalizedVoto = 'contra';
        } else if (s === 'abstencion' || s === 'abstención' || s === 'abstain' || s === 'abstention') {
          normalizedVoto = 'abstencion';
        } else if (s === 'pasar' || s === 'pase' || s === 'pass') {
          normalizedVoto = 'pasar';
        }
      }

      if ((normalizedVoto === 'favor_derechos' || normalizedVoto === 'contra_derechos') && (!paisObj || paisObj.estatus === 'Ausente')) return prev;
      return registrarVotoConDerechos(prev, targetId, normalizedVoto);
    });

    if (emitir) {
      emitirAccion('registrarVotoPais', { countryIdentifier, voto });
    }
  }, [emitirAccion]);

  const configurarVotacion = useCallback((ajustes, emitir = true) => {
    setVotacionSesionState(prev => ({
      ...prev,
      ...ajustes,
      derechos: ajustes.tipoVotacion === 'procedural' || ajustes.votos ? {} : (ajustes.derechos ?? prev.derechos)
    }));
    if (emitir) {
      emitirAccion('configurarVotacion', { ajustes });
    }
  }, [emitirAccion]);

  const resetearVotacion = useCallback((emitir = true) => {
    setVotacionSesionState(prev => ({
      ...prev,
      votos: {},
      derechos: {}
    }));
    if (emitir) {
      emitirAccion('resetearVotacion', {});
    }
  }, [emitirAccion]);

  // Celebración al finalizar votación (mazo siempre + confeti si se aprueba)
  const [gavelRunId, setGavelRunId] = useState(0);
  const [confettiRunId, setConfettiRunId] = useState(0);

  const dispararCelebracionVoto = useCallback((esAprobada = false) => {
    setGavelRunId(Date.now());
    if (esAprobada) {
      setConfettiRunId(Date.now());
    } else {
      setConfettiRunId(0);
    }
  }, []);

  const estadoFinVotacion = useMemo(() => {
    const listaPaises = Array.isArray(paises) ? paises : [];
    const asistentes = listaPaises.filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
    const totalAsistentes = asistentes.length;
    const votosMap = votacionSesion?.votos || {};
    const tipoVotacion = votacionSesion?.tipoVotacion || 'procedural';
    const tipoMayoria = votacionSesion?.tipoMayoria || 'simple';
    const aplicarVeto = votacionSesion?.aplicarVeto ?? true;

    let aFavor = 0;
    let enContra = 0;
    let abstenciones = 0;
    let votosPendientes = 0;
    let vetoActivado = false;

    asistentes.forEach(p => {
      const v = votosMap[p.id];
      if (v === 'favor' || v === 'favor_derechos') {
        aFavor++;
      } else if (v === 'contra' || v === 'contra_derechos') {
        enContra++;
        if (tipoVotacion === 'substantive' && aplicarVeto && p.veto) {
          vetoActivado = true;
        }
      } else if (v === 'abstencion' && tipoVotacion !== 'procedural') {
        abstenciones++;
      } else {
        votosPendientes++;
      }
    });

    const finalizada = totalAsistentes > 0 && votosPendientes === 0;
    const votantesActivos = aFavor + enContra;

    let umbralRequerido = 0;
    if (tipoMayoria === 'simple') {
      umbralRequerido = votantesActivos > 0 ? Math.floor(votantesActivos / 2) + 1 : 1;
    } else if (tipoMayoria === '2/3') {
      umbralRequerido = votantesActivos > 0 ? Math.ceil((votantesActivos * 2) / 3) : 1;
    } else if (tipoMayoria === 'consensus') {
      umbralRequerido = totalAsistentes;
    }

    let estadoVotacion = 'EN CURSO';
    if (vetoActivado && tipoVotacion === 'substantive' && aplicarVeto) {
      estadoVotacion = 'RECHAZADA POR VETO';
    } else if (finalizada) {
      if (tipoMayoria === 'consensus') {
        estadoVotacion = enContra === 0 && aFavor > 0 ? 'APROBADA POR CONSENSO' : 'FALLIDA (DISSENSO)';
      } else if (votantesActivos === 0) {
        estadoVotacion = 'FALLIDA (SIN VOTOS)';
      } else if (aFavor >= umbralRequerido && aFavor > enContra) {
        estadoVotacion = 'APROBADA';
      } else {
        estadoVotacion = 'RECHAZADA';
      }
    }

    const aprobada = estadoVotacion.includes('APROBADA');
    return { finalizada, aprobada, estadoVotacion, aFavor, enContra, abstenciones };
  }, [paises, votacionSesion]);

  const prevVoteFinalizadaRef = useRef(estadoFinVotacion.finalizada);
  useEffect(() => {
    const wasFinalizada = prevVoteFinalizadaRef.current;
    prevVoteFinalizadaRef.current = estadoFinVotacion.finalizada;
    if (!wasFinalizada && estadoFinVotacion.finalizada) {
      dispararCelebracionVoto(estadoFinVotacion.aprobada);
    }
  }, [estadoFinVotacion.finalizada, estadoFinVotacion.aprobada, dispararCelebracionVoto]);

  // Países / Matriz
  const setPaises = useCallback((nuevosPaises, emitir = true) => {
    setPaisesState(nuevosPaises);
    if (emitir) {
      emitirAccion('setPaises', { paises: nuevosPaises });
    }
  }, [emitirAccion]);

  const cambiarEstatusPais = useCallback((id, nuevoEstatus, emitir = true) => {
    setPaisesState(prev => prev.map(p => p.id === id ? { ...p, estatus: nuevoEstatus } : p));
    if (emitir) {
      emitirAccion('cambiarEstatusPais', { id, nuevoEstatus });
    }
  }, [emitirAccion]);

  const actualizarPais = useCallback((id, nuevosCampos, emitir = true) => {
    setPaisesState(prev => prev.map(p => p.id === id ? { ...p, ...nuevosCampos } : p));
    if (emitir) {
      emitirAccion('actualizarPais', { id, nuevosCampos });
    }
  }, [emitirAccion]);

  const eliminarPais = useCallback((id, emitir = true) => {
    setPaisesState(prev => prev.filter(p => p.id !== id));
    if (emitir) {
      emitirAccion('eliminarPais', { id });
    }
  }, [emitirAccion]);

  const resetearAsistencia = useCallback((emitir = true) => {
    setPaisesState(prev => prev.map(p => ({ ...p, estatus: 'Ausente' })));
    if (emitir) {
      emitirAccion('resetearAsistencia', {});
    }
  }, [emitirAccion]);

  const toggleVetoPais = useCallback((id, emitir = true) => {
    setPaisesState(prev => prev.map(p => p.id === id ? { ...p, veto: !p.veto } : p));
    if (emitir) {
      emitirAccion('toggleVetoPais', { id });
    }
  }, [emitirAccion]);

  const ordenarPaisesAlfabetico = useCallback((emitir = true) => {
    setPaisesState(prev => [...prev].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })));
    if (emitir) {
      emitirAccion('ordenarPaisesAlfabetico', {});
    }
  }, [emitirAccion]);

  const reordenarPaises = useCallback((fromIndex, toIndex, emitir = true) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setPaisesState(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('reordenarPaises', { fromIndex, toIndex });
    }
  }, [emitirAccion]);

  // Oradores GSL
  const agregarOrador = useCallback((paisObj, emitir = true) => {
    const countryName = typeof paisObj === 'string' ? paisObj : paisObj?.nombre;
    if (!countryName) return;
    
    setOradoresColaState(prev => {
      if (prev.some(o => o.nombre.toLowerCase() === countryName.toLowerCase())) return prev;
      const currentPaises = stateRef.current.paises || [];
      const match = currentPaises.find(p => p.nombre?.toLowerCase() === countryName.toLowerCase());
      const explicitFlag = typeof paisObj === 'object' && paisObj?.bandera && paisObj.bandera !== '🇺🇳' ? paisObj.bandera : null;
      const banderaFinal = match?.bandera || explicitFlag || getFlagEmoji(null, countryName);

      return [...prev, { id: Date.now().toString(), nombre: countryName, bandera: banderaFinal }];
    });
    if (emitir) {
      emitirAccion('agregarOrador', { paisObj: typeof paisObj === 'object' ? paisObj : { nombre: countryName } });
    }
  }, [emitirAccion]);

  const removerOrador = useCallback((id, emitir = true) => {
    setOradoresColaState(prev => {
      const next = prev.filter(o => o.id !== id && o.nombre !== id);
      stateRef.current.oradoresCola = next;
      return next;
    });
    if (emitir) {
      emitirAccion('removerOrador', { id });
    }
  }, [emitirAccion]);

  const moverOrador = useCallback((index, direccion, emitir = true) => {
    const newIndex = index + direccion;
    setOradoresColaState(prev => {
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(index, 1);
      clone.splice(newIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('moverOrador', { index, direccion });
    }
  }, [emitirAccion]);

  const vaciarOradoresGSL = useCallback((emitir = true) => {
    setOradoresColaState([]);
    if (emitir) {
      emitirAccion('vaciarOradoresGSL', {});
    }
  }, [emitirAccion]);

  const ordenarOradoresGSLAlfabetico = useCallback((emitir = true) => {
    setOradoresColaState(prev => [...prev].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })));
    if (emitir) {
      emitirAccion('ordenarOradoresGSLAlfabetico', {});
    }
  }, [emitirAccion]);

  const reordenarOradoresGSL = useCallback((fromIndex, toIndex, emitir = true) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setOradoresColaState(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('reordenarOradoresGSL', { fromIndex, toIndex });
    }
  }, [emitirAccion]);

  // Registro de Intervención
  const registrarIntervencion = useCallback((oradorNombre, tiempoAsignado, tiempoHablado, overtime, emitir = true) => {
    const nuevaEntrada = {
      id: Date.now(),
      pais: oradorNombre || 'Delegado',
      tiempoAsignado,
      tiempoHablado,
      overtime,
      fecha: new Date().toISOString()
    };
    setRegistroIntervencionesState(prev => [nuevaEntrada, ...prev]);
    if (emitir) {
      emitirAccion('registrarIntervencion', { oradorNombre, tiempoAsignado, tiempoHablado, overtime });
    }
  }, [emitirAccion]);

  // Reloj y Yield
  const actualizarRelojGSL = useCallback((segundosRestantes, tiempoInicial, corriendo, emitir = false) => {
    stateRef.current.relojGSLState = { segundosRestantes, tiempoInicial, corriendo };
    if (emitir) {
      setRelojGSLState({ segundosRestantes, tiempoInicial, corriendo });
      emitirAccion('actualizarRelojGSL', { segundosRestantes, tiempoInicial, corriendo });
    }
  }, [emitirAccion]);

  const cederTiempo = useCallback((tipo, destinoPaisName = '', emitir = true) => {
    const cola = stateRef.current.oradoresCola || [];
    if (cola.length === 0) return;

    const oradorActual = cola[0];
    const { segundosRestantes, tiempoInicial } = stateRef.current.relojGSLState;

    if (tipo === 'mesa') {
      const tiempoHablado = Math.max(1, tiempoInicial - segundosRestantes);
      const overtime = segundosRestantes < 0 ? Math.abs(segundosRestantes) : 0;
      registrarIntervencion(oradorActual.nombre, tiempoInicial, tiempoHablado, overtime, false);

      setOradoresColaState(prev => prev.slice(1));
      setYieldEvento({ tipo: 'mesa', timestamp: Date.now() });
    } else if (tipo === 'preguntas') {
      setYieldEvento({ tipo: 'preguntas', timestamp: Date.now() });
    } else if (tipo === 'delegado' && destinoPaisName) {
      const tiempoHablado = Math.max(1, tiempoInicial - segundosRestantes);
      registrarIntervencion(oradorActual.nombre, tiempoInicial, tiempoHablado, 0, false);

      const allPaises = stateRef.current.paises || [];
      const paisObj = allPaises.find(p => p.nombre === destinoPaisName) || { nombre: destinoPaisName, bandera: '🇺🇳' };
      const nuevoOradorCedido = {
        id: Date.now().toString(),
        nombre: paisObj.nombre,
        bandera: paisObj.bandera || '🇺🇳'
      };

      setOradoresColaState(prev => [
        nuevoOradorCedido,
        ...prev.slice(1).filter(o => o.nombre !== paisObj.nombre)
      ]);

      setYieldEvento({
        tipo: 'delegado',
        destino: destinoPaisName,
        segundosRestantes,
        timestamp: Date.now()
      });
    }

    if (emitir) {
      emitirAccion('cederTiempo', { tipo, destinoPaisName });
    }
  }, [emitirAccion, registrarIntervencion]);

  // Oradores Caucus / Debate
  const agregarOradorCaucus = useCallback((paisObj, emitir = true) => {
    const countryName = typeof paisObj === 'string' ? paisObj : paisObj?.nombre;
    if (!countryName) return;

    setOradoresCaucusState(prev => {
      if (prev.some(o => o.nombre.toLowerCase() === countryName.toLowerCase())) return prev;

      const currentPaises = stateRef.current.paises || [];
      const match = currentPaises.find(p => p.nombre?.toLowerCase() === countryName.toLowerCase());
      const explicitFlag = typeof paisObj === 'object' && paisObj?.bandera && paisObj.bandera !== '🇺🇳' ? paisObj.bandera : null;
      const banderaFinal = match?.bandera || explicitFlag || getFlagEmoji(null, countryName);

      const nuevoOrador = {
        id: Date.now().toString(),
        nombre: countryName,
        bandera: banderaFinal,
        esProponenteUltimo: Boolean(paisObj?.esProponenteUltimo)
      };

      if (prev.length > 0 && prev[prev.length - 1].esProponenteUltimo) {
        const clone = [...prev];
        clone.splice(clone.length - 1, 0, nuevoOrador);
        return clone;
      }
      return [...prev, nuevoOrador];
    });

    if (emitir) {
      emitirAccion('agregarOradorCaucus', { paisObj: typeof paisObj === 'object' ? paisObj : { nombre: countryName } });
    }
  }, [emitirAccion]);

  const removerOradorCaucus = useCallback((id, emitir = true) => {
    setOradoresCaucusState(prev => prev.filter(o => o.id !== id && o.nombre !== id));
    if (emitir) {
      emitirAccion('removerOradorCaucus', { id });
    }
  }, [emitirAccion]);

  const avanzarOradorCaucus = useCallback((emitir = true) => {
    setOradoresCaucusState(prev => {
      const next = prev.slice(1);
      stateRef.current.oradoresCaucus = next;
      return next;
    });
    if (emitir) {
      emitirAccion('avanzarOradorCaucus', {});
    }
  }, [emitirAccion]);

  const vaciarOradoresDebate = useCallback((emitir = true) => {
    setOradoresCaucusState([]);
    if (emitir) {
      emitirAccion('vaciarOradoresDebate', {});
    }
  }, [emitirAccion]);

  const ordenarOradoresDebateAlfabetico = useCallback((emitir = true) => {
    setOradoresCaucusState(prev => [...prev].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })));
    if (emitir) {
      emitirAccion('ordenarOradoresDebateAlfabetico', {});
    }
  }, [emitirAccion]);

  const reordenarOradoresDebate = useCallback((fromIndex, toIndex, emitir = true) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setOradoresCaucusState(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('reordenarOradoresDebate', { fromIndex, toIndex });
    }
  }, [emitirAccion]);

  const moverOradorCaucus = useCallback((index, direccion, emitir = true) => {
    const newIndex = index + direccion;
    setOradoresCaucusState(prev => {
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(index, 1);
      clone.splice(newIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('moverOradorCaucus', { index, direccion });
    }
  }, [emitirAccion]);

  const setCaucusActivo = useCallback((nuevoCaucus, emitir = true) => {
    setCaucusActivoState(nuevoCaucus);
    if (emitir) {
      emitirAccion('setCaucusActivo', { caucus: nuevoCaucus });
    }
  }, [emitirAccion]);

  const controlarRelojDebate = useCallback((comando, payload = {}, emitir = true) => {
    setRelojDebateState(prev => {
      let next = { ...prev };
      const ahora = Date.now();
      const esCaucus = Boolean(stateRef.current.caucusActivo?.activo);
      if (!payload.modo) {
        next.modo = esCaucus ? 'CAUCUS' : 'GSL';
      } else {
        next.modo = payload.modo;
      }

      if (prev.corriendo && prev.timestamp) {
        const transcurrido = Math.floor((ahora - prev.timestamp) / 1000);
        next.segundosRestantes = (prev.segundosRestantes ?? 60) - transcurrido;
        if (next.tiempoOradorSeg !== undefined) {
          next.tiempoOradorSeg = (prev.tiempoOradorSeg ?? prev.limiteOradorSeg ?? 45) - transcurrido;
        }
        if (next.tiempoTotalSeg !== undefined) {
          next.tiempoTotalSeg = Math.max(0, (prev.tiempoTotalSeg ?? 600) - transcurrido);
        }
      }
      next.timestamp = ahora;

      if (payload.segundosRestantes !== undefined) {
        next.segundosRestantes = payload.segundosRestantes;
      }
      if (payload.tiempoInicial !== undefined) {
        next.tiempoInicial = payload.tiempoInicial;
      }
      if (payload.tiempoOradorSeg !== undefined) {
        next.tiempoOradorSeg = payload.tiempoOradorSeg;
      }
      if (payload.limiteOradorSeg !== undefined) {
        next.limiteOradorSeg = payload.limiteOradorSeg;
      }
      if (payload.tiempoTotalSeg !== undefined) {
        next.tiempoTotalSeg = payload.tiempoTotalSeg;
      }

      switch (comando) {
        case 'start':
          next.corriendo = true;
          iniciarActividadDebate();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_toggle_timer', { detail: { action: 'start' } }));
          }
          break;

        case 'stop':
        case 'pause':
          next.corriendo = false;
          registrarActividadDebate();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_toggle_timer', { detail: { action: 'pause' } }));
          }
          break;

        case 'toggle':
          next.corriendo = !prev.corriendo;
          if (next.corriendo) {
            iniciarActividadDebate();
          } else {
            registrarActividadDebate();
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_toggle_timer', { detail: { running: next.corriendo } }));
          }
          break;

        case 'reset':
          next.corriendo = false;
          next.segundosRestantes = payload.tiempoInicial || next.tiempoInicial || 60;
          if (next.limiteOradorSeg) {
            next.tiempoOradorSeg = next.limiteOradorSeg;
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_reset_timer'));
          }
          break;

        case 'adjust': {
          const delta = payload.delta || 0;
          next.segundosRestantes = (next.segundosRestantes || 0) + delta;
          if (next.tiempoOradorSeg !== undefined) {
            next.tiempoOradorSeg = (next.tiempoOradorSeg || 0) + delta;
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_adjust_time', { detail: { delta } }));
          }
          break;
        }

        case 'set_time':
        case 'set_preset': {
          const nuevosSegundos = payload.segundos ?? payload.tiempoInicial ?? 60;
          next.corriendo = false;
          next.tiempoInicial = nuevosSegundos;
          next.segundosRestantes = nuevosSegundos;
          if (payload.tiempoOradorSeg !== undefined) next.tiempoOradorSeg = payload.tiempoOradorSeg;
          if (payload.limiteOradorSeg !== undefined) next.limiteOradorSeg = payload.limiteOradorSeg;
          if (payload.tiempoTotalSeg !== undefined) next.tiempoTotalSeg = payload.tiempoTotalSeg;
          break;
        }

        case 'set_modo': {
          if (payload.modo === 'GSL' || payload.modo === 'CAUCUS') {
            next.modo = payload.modo;
          }
          break;
        }

        case 'next_speaker': {
          next.corriendo = false;
          if (next.modo === 'CAUCUS') {
            const oradorActual = stateRef.current.oradoresCaucus?.[0];
            const limite = next.limiteOradorSeg || stateRef.current.caucusActivo?.tiempoOrador || 45;
            const restante = next.tiempoOradorSeg !== undefined ? next.tiempoOradorSeg : limite;
            if (oradorActual && (oradorActual.nombre || typeof oradorActual === 'string')) {
              const nombre = oradorActual.nombre || oradorActual;
              const hablado = Math.max(1, limite - restante);
              const overtime = restante < 0 ? Math.abs(restante) : 0;
              registrarIntervencion(nombre, limite, hablado, overtime, false);
            }
            avanzarOradorCaucus(false);
            next.tiempoOradorSeg = limite;
          } else {
            const cola = stateRef.current.oradoresCola || [];
            if (cola.length > 0) {
              const oradorActual = cola[0];
              const tInit = next.tiempoInicial || 60;
              const hablado = next.segundosRestantes < 0 ? tInit + Math.abs(next.segundosRestantes) : Math.max(1, tInit - next.segundosRestantes);
              const overtime = next.segundosRestantes < 0 ? Math.abs(next.segundosRestantes) : 0;
              registrarIntervencion(oradorActual.nombre, tInit, hablado, overtime, false);
              removerOrador(oradorActual.id, false);
            }
            next.segundosRestantes = next.tiempoInicial || 60;
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_hotkey_next_speaker'));
          }
          break;
        }

        case 'sync':
          if (payload && typeof payload === 'object') {
            next = { ...next, ...payload, timestamp: ahora };
          }
          break;

        default:
          break;
      }

      stateRef.current.relojDebateState = next;
      stateRef.current.relojGSLState = {
        segundosRestantes: next.segundosRestantes,
        tiempoInicial: next.tiempoInicial,
        corriendo: next.corriendo
      };

      if (typeof window !== 'undefined') {
        const signalName = payload.signal || (comando === 'next_speaker' ? 'next_speaker' : (next.corriendo ? 'start' : 'stop'));
        const signalDetail = {
          signal: signalName,
          comando,
          source: payload.source,
          segundosRestantes: next.segundosRestantes,
          tiempoInicial: next.tiempoInicial,
          tiempoOradorSeg: next.tiempoOradorSeg,
          limiteOradorSeg: next.limiteOradorSeg,
          tiempoTotalSeg: next.tiempoTotalSeg,
          modo: next.modo,
          timestamp: ahora
        };

        try {
          localStorage.setItem('openmun_reloj_debate', JSON.stringify(next));
          localStorage.setItem('openmun_cronometros', JSON.stringify(next));
          localStorage.setItem('openmun_timer_signal', JSON.stringify(signalDetail));
        } catch { /* ignore */ }

        window.dispatchEvent(new CustomEvent('openmun_timer_signal', { detail: signalDetail }));
        window.dispatchEvent(new CustomEvent('openmun_timer_sync', { detail: next }));
      }

      return next;
    });

    if (emitir) {
      emitirAccion('controlarRelojDebate', { comando, payload });
    }
  }, [iniciarActividadDebate, registrarActividadDebate, emitirAccion, registrarIntervencion, removerOrador, avanzarOradorCaucus]);

  // Agenda & Comité
  const establecerAgenda = useCallback((temaActual, temasPropuestos = [], emitir = true) => {
    setAgendaSesionState(prev => ({
      ...prev,
      establecida: true,
      temaActual,
      temasPropuestos: temasPropuestos.length > 0 ? temasPropuestos : temaActual ? [
        { id: 't1', titulo: temaActual, estado: 'En Discusión' }
      ] : []
    }));
    if (emitir) {
      emitirAccion('establecerAgenda', { temaActual, temasPropuestos });
    }
  }, [emitirAccion]);

  const cambiarTemaActual = useCallback((nuevoTema, emitir = true) => {
    setAgendaSesionState(prev => ({
      ...prev,
      temaActual: nuevoTema,
      temasPropuestos: (prev.temasPropuestos || []).map(t =>
        t.titulo === nuevoTema ? { ...t, estado: 'En Discusión' } : { ...t, estado: 'Pendiente' }
      )
    }));
    if (emitir) {
      emitirAccion('cambiarTemaActual', { nuevoTema });
    }
  }, [emitirAccion]);

  const siguienteTemaAgenda = useMemo(() => {
    const temas = Array.isArray(agendaSesion?.temasPropuestos) ? agendaSesion.temasPropuestos : [];
    if (temas.length === 0) return null;
    const temaActualStr = agendaSesion?.temaActual || '';
    let activeIdx = temas.findIndex(item => item.titulo === temaActualStr);
    if (activeIdx === -1) {
      activeIdx = temas.findIndex(item => item.estado === 'En Discusión');
    }
    if (activeIdx === -1) {
      return temas.find(item => item.estado !== 'Concluido') || null;
    }
    for (let i = activeIdx + 1; i < temas.length; i++) {
      if (temas[i].estado !== 'Concluido') return temas[i];
    }
    for (let i = 0; i < activeIdx; i++) {
      if (temas[i].estado !== 'Concluido') return temas[i];
    }
    return null;
  }, [agendaSesion]);

  const irASiguienteTema = useCallback((emitir = true) => {
    const currentAgenda = stateRef.current.agendaSesion || { establecida: false, temaActual: '', temasPropuestos: [] };
    const temas = Array.isArray(currentAgenda.temasPropuestos) ? currentAgenda.temasPropuestos : [];
    const temaActualStr = currentAgenda.temaActual || '';

    let activeIdx = temas.findIndex(item => item.titulo === temaActualStr);
    if (activeIdx === -1) {
      activeIdx = temas.findIndex(item => item.estado === 'En Discusión');
    }

    let nextIdx = -1;
    if (activeIdx === -1) {
      nextIdx = temas.findIndex(item => item.estado !== 'Concluido');
    } else {
      for (let i = activeIdx + 1; i < temas.length; i++) {
        if (temas[i].estado !== 'Concluido') {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx === -1) {
        for (let i = 0; i < activeIdx; i++) {
          if (temas[i].estado !== 'Concluido') {
            nextIdx = i;
            break;
          }
        }
      }
    }

    const nextItem = nextIdx !== -1 ? temas[nextIdx] : null;
    const nuevoTemaActual = nextItem ? nextItem.titulo : '';
    const nuevosTemas = temas.map((item, idx) => {
      if (idx === activeIdx) {
        return { ...item, estado: 'Concluido' };
      }
      if (idx === nextIdx) {
        return { ...item, estado: 'En Discusión' };
      }
      return item;
    });

    setAgendaSesionState(prev => ({
      ...prev,
      establecida: prev.establecida || nuevosTemas.length > 0,
      temaActual: nuevoTemaActual,
      temasPropuestos: nuevosTemas
    }));

    setVotacionSesionState(prev => ({
      ...prev,
      votos: {},
      derechos: {}
    }));

    if (emitir) {
      emitirAccion('irASiguienteTema', {});
    }

    return {
      temaAnterior: activeIdx !== -1 ? temas[activeIdx]?.titulo : temaActualStr,
      siguienteTema: nextItem ? nextItem.titulo : '',
      concluida: !nextItem
    };
  }, [emitirAccion]);

  const setNombreComite = useCallback((nuevoNombre, emitir = true) => {
    setNombreComiteState(nuevoNombre);
    if (emitir) {
      emitirAccion('setNombreComite', { nombreComite: nuevoNombre });
    }
  }, [emitirAccion]);

  // Mociones
  const compararMocionesDisruptividad = useCallback((a, b) => {
    const getPrioridadTipo = (tipoStr = '') => {
      if (tipoStr.includes('Caucus No Moderado')) return 1;
      if (tipoStr.includes('Consulta General')) return 2;
      if (tipoStr.includes('Tour de Table')) return 3;
      if (tipoStr.includes('Caucus Moderado')) return 4;
      return 5;
    };

    const prioA = getPrioridadTipo(a.tipo);
    const prioB = getPrioridadTipo(b.tipo);

    if (prioA !== prioB) return prioA - prioB;

    const durA = a.tiempoTotal || 0;
    const durB = b.tiempoTotal || 0;
    if (durA !== durB) return durB - durA;

    const tA = Number(a.id) || 0;
    const tB = Number(b.id) || 0;
    return tA - tB;
  }, []);

  const ordenarMocionesDisruptividad = useCallback((emitir = true) => {
    setMocionesState(prev => [...prev].sort(compararMocionesDisruptividad));
    if (emitir) {
      emitirAccion('ordenarMocionesDisruptividad', {});
    }
  }, [compararMocionesDisruptividad, emitirAccion]);

  const reordenarMociones = useCallback((fromIndex, toIndex, emitir = true) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setMocionesState(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });
    if (emitir) {
      emitirAccion('reordenarMociones', { fromIndex, toIndex });
    }
  }, [emitirAccion]);

  const agregarMocion = useCallback((mocionData, emitir = true) => {
    const nueva = {
      id: Date.now().toString(),
      posicionProponente: mocionData.posicionProponente || 'Primero',
      varianteConsulta: mocionData.varianteConsulta || '',
      ...mocionData,
      estado: 'Pendiente',
      votosFavor: 0,
      votosContra: 0,
      fecha: mocionData.fecha || new Date().toISOString()
    };
    setMocionesState(prev => [...prev, nueva].sort(compararMocionesDisruptividad));
    setHistoricoMocionesState(prev => [nueva, ...prev]);
    if (emitir) {
      emitirAccion('agregarMocion', { mocionData });
    }
  }, [compararMocionesDisruptividad, emitirAccion]);

  const activarMocion = useCallback((mocion, emitir = true) => {
    const tipoMocion = mocion.tipo;
    const posProponente = mocion.posicionProponente || 'Primero';
    const allPaises = stateRef.current.paises || [];

    if (tipoMocion === 'Tour de Table') {
      const presentes = allPaises
        .filter(p => p.estatus !== 'Ausente')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        .map((p, idx) => ({ id: `tt-${idx}-${Date.now()}`, nombre: p.nombre, bandera: p.bandera }));

      setOradoresCaucusState(presentes);
    } else if (tipoMocion === 'Caucus Moderado') {
      const proponenteObj = allPaises.find(p => p.nombre === mocion.proponente);
      if (proponenteObj) {
        const itemProponente = {
          id: `cauc-prop-${Date.now()}`,
          nombre: proponenteObj.nombre,
          bandera: proponenteObj.bandera,
          esProponenteUltimo: posProponente === 'Ultimo'
        };
        setOradoresCaucusState([itemProponente]);
      } else {
        setOradoresCaucusState([]);
      }
    } else {
      setOradoresCaucusState([]);
    }

    setHistoricoMocionesState(prev => prev.map(m => (m.id === mocion.id || m.tema === mocion.tema) ? { ...m, estado: 'Aprobada' } : m));
    setMocionesState(prev => prev.filter(m => m.id !== mocion.id));

    const nuevoCaucus = {
      activo: true,
      proponente: mocion.proponente,
      posicionProponente: posProponente,
      tipo: tipoMocion,
      varianteConsulta: mocion.varianteConsulta || '',
      tema: mocion.tema,
      tiempoTotal: Number(mocion.tiempoTotal) || 0,
      tiempoOrador: Number(mocion.tiempoOrador) || 0,
      timestampActivacion: Date.now()
    };
    setCaucusActivoState(nuevoCaucus);
    stateRef.current.caucusActivo = nuevoCaucus;
    try {
      localStorage.setItem('openmun_caucus', JSON.stringify(nuevoCaucus));
    } catch { /* ignore */ }

    if (controlarRelojDebate) {
      const tOrador = Number(mocion.tiempoOrador) || 60;
      const tTotal = Number(mocion.tiempoTotal) || 600;
      controlarRelojDebate('sync', {
        source: 'main',
        modo: 'CAUCUS',
        limiteOradorSeg: tOrador,
        tiempoOradorSeg: tOrador,
        tiempoTotalSeg: tTotal,
        corriendo: false
      });
    }

    if (emitir) {
      emitirAccion('activarMocion', { mocion });
    }
  }, [emitirAccion, controlarRelojDebate]);

  const votarMocion = useCallback((id, nuevoEstado, emitir = true) => {
    if (nuevoEstado === 'Fallida') {
      setMocionesState(prev => prev.filter(m => m.id !== id));
      setHistoricoMocionesState(prev => prev.map(m => m.id === id ? { ...m, estado: 'Fallida' } : m));
    } else if (nuevoEstado === 'Aprobada') {
      const mocionTarget = (stateRef.current.mociones || []).find(m => m.id === id);
      setHistoricoMocionesState(prev => prev.map(m => m.id === id ? { ...m, estado: 'Aprobada' } : m));
      setMocionesState(prev => prev.filter(m => m.id !== id));
      if (mocionTarget) {
        activarMocion(mocionTarget, false);
      }
    }
    if (emitir) {
      emitirAccion('votarMocion', { id, nuevoEstado });
    }
  }, [activarMocion, emitirAccion]);

  const eliminarMocion = useCallback((id, emitir = true) => {
    setMocionesState(prev => prev.filter(m => m.id !== id));
    if (emitir) {
      emitirAccion('eliminarMocion', { id });
    }
  }, [emitirAccion]);

  // ─────────────────────────────────────────────────────────────
  // CONTROLADOR DE ENMIENDAS Y RESOLUCIÓN
  // ─────────────────────────────────────────────────────────────
  const setEnmiendasSesion = useCallback((nuevaData, emitir = true) => {
    setEnmiendasSesionState(nuevaData);
    if (emitir) {
      emitirAccion('setEnmiendasSesion', { enmiendasSesion: nuevaData });
    }
  }, [emitirAccion]);

  const guardarResolucionEnmiendas = useCallback(({ titulo, texto, articulos }, emitir = true) => {
    setEnmiendasSesionState(prev => {
      const finalTexto = texto !== undefined ? texto : prev.textoResolucion;
      let finalArticulos = articulos !== undefined ? articulos : prev.articulos;
      if ((!finalArticulos || finalArticulos.length === 0) && finalTexto) {
        finalArticulos = parsearResolucion(finalTexto);
      }
      return {
        ...prev,
        tituloProyecto: titulo !== undefined ? titulo : prev.tituloProyecto,
        textoResolucion: finalTexto,
        articulos: finalArticulos
      };
    });
    if (emitir) {
      emitirAccion('guardarResolucionEnmiendas', { titulo, texto, articulos });
    }
  }, [emitirAccion]);

  const agregarEnmiendaResolucion = useCallback((enmiendaData, emitir = true) => {
    const nueva = {
      id: enmiendaData.id || `enm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tipo: enmiendaData.tipo || 'modificacion', // 'adicion' | 'supresion' | 'modificacion'
      articuloId: enmiendaData.articuloId || null,
      articuloNumero: enmiendaData.articuloNumero || '',
      paisProponente: enmiendaData.paisProponente || '',
      textoOriginal: enmiendaData.textoOriginal || '',
      textoPropuesto: enmiendaData.textoPropuesto || '',
      justificacion: enmiendaData.justificacion || '',
      estado: 'pendiente', // 'pendiente' | 'aceptada' | 'rechazada'
      fecha: new Date().toISOString()
    };
    setEnmiendasSesionState(prev => ({
      ...prev,
      enmiendas: [nueva, ...(prev.enmiendas || [])]
    }));
    if (emitir) {
      emitirAccion('agregarEnmiendaResolucion', { enmiendaData: nueva });
    }
  }, [emitirAccion]);

  const resolverEnmiendaResolucion = useCallback((enmiendaId, nuevoEstado, emitir = true) => {
    setEnmiendasSesionState(prev => {
      const enmiendasActuales = prev.enmiendas || [];
      const target = enmiendasActuales.find(e => e.id === enmiendaId);
      if (!target) return prev;

      // Asegurar que existan artículos estructurados
      let nuevosArticulos = Array.isArray(prev.articulos) && prev.articulos.length > 0
        ? prev.articulos.map(a => ({ ...a }))
        : (prev.textoResolucion ? parsearResolucion(prev.textoResolucion) : []);

      let nuevoTextoResolucion = prev.textoResolucion || '';
      let targetActualizado = { ...target, estado: nuevoEstado };

      if (nuevoEstado === 'aceptada') {
        // Guardar respaldo previo en el registro de la enmienda para permitir reversión fiel
        targetActualizado.articulosPrevios = (prev.articulos && prev.articulos.length > 0)
          ? prev.articulos.map(a => ({ ...a }))
          : nuevosArticulos.map(a => ({ ...a }));
        targetActualizado.textoResolucionPrevio = prev.textoResolucion || '';

        nuevosArticulos = aplicarEnmiendaAArticulos(nuevosArticulos, target);
        nuevoTextoResolucion = reconstruirTextoResolucion(nuevosArticulos);
      } else if (target.estado === 'aceptada' && (nuevoEstado === 'pendiente' || nuevoEstado === 'rechazada')) {
        // Al deshacer o rechazar una enmienda previamente aceptada, restaurar el texto anterior
        if (target.articulosPrevios && target.articulosPrevios.length > 0) {
          nuevosArticulos = target.articulosPrevios.map(a => ({ ...a }));
          nuevoTextoResolucion = target.textoResolucionPrevio || reconstruirTextoResolucion(nuevosArticulos);
        }
      }

      const enmiendasActualizadas = enmiendasActuales.map(e =>
        e.id === enmiendaId ? targetActualizado : e
      );

      return {
        ...prev,
        articulos: nuevosArticulos,
        textoResolucion: nuevoTextoResolucion,
        enmiendas: enmiendasActualizadas
      };
    });

    if (emitir) {
      emitirAccion('resolverEnmiendaResolucion', { enmiendaId, nuevoEstado });
    }
  }, [emitirAccion]);

  const cambiarTipoSesion = useCallback((nuevoTipo, emitir = true) => {
    const cleanTipo = String(nuevoTipo || 'formal').toLowerCase();
    setTipoSesionState(cleanTipo);
    localStorage.setItem('openmun_tipo_sesion', cleanTipo);

    const isMesaActiva = localStorage.getItem('openmun_mesa_activa') === 'true';
    const activeComiteId = localStorage.getItem('openmun_current_comite_id');
    if (isMesaActiva && activeComiteId) {
      conferenceService.actualizarEstadoComite(activeComiteId, { tipo_sesion: cleanTipo }).catch(err => {
        console.warn('Error al sincronizar tipo_sesion con servidor:', err);
      });
    }

    if (emitir) {
      emitirAccion('cambiarTipoSesion', { tipo: cleanTipo });
    }
  }, [emitirAccion]);

  const eliminarEnmiendaResolucion = useCallback((enmiendaId, emitir = true) => {
    setEnmiendasSesionState(prev => ({
      ...prev,
      enmiendas: (prev.enmiendas || []).filter(e => e.id !== enmiendaId)
    }));
    if (emitir) {
      emitirAccion('eliminarEnmiendaResolucion', { enmiendaId });
    }
  }, [emitirAccion]);

  // ─────────────────────────────────────────────────────────────
  // DESPACHADOR CENTRAL DE ACCIONES RECIBIDAS (DESDE OTRO NODO / CANAL)
  // ─────────────────────────────────────────────────────────────
  const ejecutarAccion = useCallback((accion, payload) => {
    if (!accion) return;

    switch (accion) {
      case 'cambiarTipoSesion':
        if (payload?.tipo) cambiarTipoSesion(payload.tipo, false);
        break;
      case 'registrarVotoPais':
        registrarVotoPais(payload.countryIdentifier, payload.voto, false);
        break;
      case 'configurarVotacion':
        configurarVotacion(payload.ajustes, false);
        break;
      case 'resetearVotacion':
        resetearVotacion(false);
        break;
      case 'setPaises':
        setPaises(payload.paises, false);
        break;
      case 'cambiarEstatusPais':
        cambiarEstatusPais(payload.id, payload.nuevoEstatus, false);
        break;
      case 'actualizarPais':
        actualizarPais(payload.id, payload.nuevosCampos, false);
        break;
      case 'eliminarPais':
        eliminarPais(payload.id, false);
        break;
      case 'resetearAsistencia':
        resetearAsistencia(false);
        break;
      case 'toggleVetoPais':
        toggleVetoPais(payload.id, false);
        break;
      case 'ordenarPaisesAlfabetico':
        ordenarPaisesAlfabetico(false);
        break;
      case 'reordenarPaises':
        reordenarPaises(payload.fromIndex, payload.toIndex, false);
        break;
      case 'agregarOrador':
        agregarOrador(payload.paisObj, false);
        break;
      case 'removerOrador':
        removerOrador(payload.id, false);
        break;
      case 'moverOrador':
        moverOrador(payload.index, payload.direccion, false);
        break;
      case 'vaciarOradoresGSL':
        vaciarOradoresGSL(false);
        break;
      case 'ordenarOradoresGSLAlfabetico':
        ordenarOradoresGSLAlfabetico(false);
        break;
      case 'reordenarOradoresGSL':
        reordenarOradoresGSL(payload.fromIndex, payload.toIndex, false);
        break;
      case 'cederTiempo':
        cederTiempo(payload.tipo, payload.destinoPaisName, false);
        break;
      case 'agregarOradorCaucus':
        agregarOradorCaucus(payload.paisObj, false);
        break;
      case 'removerOradorCaucus':
        removerOradorCaucus(payload.id, false);
        break;
      case 'avanzarOradorCaucus':
        avanzarOradorCaucus(false);
        break;
      case 'vaciarOradoresDebate':
        vaciarOradoresDebate(false);
        break;
      case 'ordenarOradoresDebateAlfabetico':
        ordenarOradoresDebateAlfabetico(false);
        break;
      case 'reordenarOradoresDebate':
        reordenarOradoresDebate(payload.fromIndex, payload.toIndex, false);
        break;
      case 'moverOradorCaucus':
        moverOradorCaucus(payload.index, payload.direccion, false);
        break;
      case 'setCaucusActivo':
        setCaucusActivo(payload.caucus, false);
        break;
      case 'actualizarSesionesDebate':
        actualizarSesionesDebate(payload.sesiones, payload.ultimaActividad, false);
        break;
      case 'establecerAgenda':
        establecerAgenda(payload.temaActual, payload.temasPropuestos, false);
        break;
      case 'cambiarTemaActual':
        cambiarTemaActual(payload.nuevoTema, false);
        break;
      case 'irASiguienteTema':
        irASiguienteTema(false);
        break;
      case 'setNombreComite':
        setNombreComite(payload.nombreComite, false);
        break;
      case 'agregarMocion':
        agregarMocion(payload.mocionData, false);
        break;
      case 'activarMocion':
        activarMocion(payload.mocion, false);
        break;
      case 'votarMocion':
        votarMocion(payload.id, payload.nuevoEstado, false);
        break;
      case 'eliminarMocion':
        eliminarMocion(payload.id, false);
        break;
      case 'reordenarMociones':
        reordenarMociones(payload.fromIndex, payload.toIndex, false);
        break;
      case 'ordenarMocionesDisruptividad':
        ordenarMocionesDisruptividad(false);
        break;
      case 'registrarIntervencion':
        registrarIntervencion(payload.oradorNombre, payload.tiempoAsignado, payload.tiempoHablado, payload.overtime, false);
        break;
      case 'actualizarRelojGSL':
        actualizarRelojGSL(payload.segundosRestantes, payload.tiempoInicial, payload.corriendo, false);
        break;
      case 'controlarRelojDebate':
        controlarRelojDebate(payload.comando, payload.payload, false);
        break;
      case 'setEnmiendasSesion':
        setEnmiendasSesion(payload.enmiendasSesion, false);
        break;
      case 'guardarResolucionEnmiendas':
        guardarResolucionEnmiendas(payload, false);
        break;
      case 'agregarEnmiendaResolucion':
        agregarEnmiendaResolucion(payload.enmiendaData, false);
        break;
      case 'resolverEnmiendaResolucion':
        resolverEnmiendaResolucion(payload.enmiendaId, payload.nuevoEstado, false);
        break;
      case 'eliminarEnmiendaResolucion':
        eliminarEnmiendaResolucion(payload.enmiendaId, false);
        break;
      default:
        console.warn(`Acción desconocida en SessionContext: ${accion}`);
    }
  }, [
    registrarVotoPais, configurarVotacion, resetearVotacion, setPaises, cambiarEstatusPais, actualizarPais,
    eliminarPais, resetearAsistencia, toggleVetoPais, ordenarPaisesAlfabetico, reordenarPaises,
    agregarOrador, removerOrador, moverOrador, vaciarOradoresGSL, ordenarOradoresGSLAlfabetico,
    reordenarOradoresGSL, cederTiempo, agregarOradorCaucus, removerOradorCaucus, avanzarOradorCaucus,
    vaciarOradoresDebate, ordenarOradoresDebateAlfabetico, reordenarOradoresDebate, moverOradorCaucus,
    setCaucusActivo, establecerAgenda, actualizarSesionesDebate, cambiarTemaActual, irASiguienteTema, setNombreComite, agregarMocion, activarMocion,
    votarMocion, eliminarMocion, reordenarMociones, ordenarMocionesDisruptividad, registrarIntervencion,
    actualizarRelojGSL, setEnmiendasSesion, guardarResolucionEnmiendas, agregarEnmiendaResolucion,
    resolverEnmiendaResolucion, eliminarEnmiendaResolucion, controlarRelojDebate
  ]);

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DE BROADCASTCHANNEL Y LISTENERS MULTIVENTANA
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(SESSION_SYNC_CHANNEL_NAME);
        broadcastChannelRef.current = bc;

        bc.onmessage = (event) => {
          const data = event.data;
          if (!data || data.senderTab === tabInstanceId) return;

          if (data.type === 'SESSION_ACTION') {
            ejecutarAccion(data.accion, data.payload);
          } else if (data.type === 'SESSION_SYNC') {
            aplicarEstadoExterno(data.state);
          } else if (data.type === 'RELOJ_DEBATE_ACTION') {
            controlarRelojDebate(data.comando, data.payload, false);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel local no disponible:', err);
      }
    }

    // Escuchar eventos storage de otras pestañas
    const handleStorage = (e) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === 'openmun_paises') setPaisesState(JSON.parse(e.newValue));
        if (e.key === 'openmun_oradores') setOradoresColaState(JSON.parse(e.newValue));
        if (e.key === 'openmun_oradores_caucus') setOradoresCaucusState(JSON.parse(e.newValue));
        if (e.key === 'openmun_intervenciones') setRegistroIntervencionesState(JSON.parse(e.newValue));
        if (e.key === 'openmun_mociones') setMocionesState(JSON.parse(e.newValue));
        if (e.key === 'openmun_historico_mociones') setHistoricoMocionesState(JSON.parse(e.newValue));
        if (e.key === 'openmun_caucus') setCaucusActivoState(JSON.parse(e.newValue));
        if (e.key === 'openmun_votacion') setVotacionSesionState(JSON.parse(e.newValue));
        if (e.key === 'openmun_agenda') setAgendaSesionState(JSON.parse(e.newValue));
        if (e.key === 'openmun_comite') setNombreComiteState(e.newValue);
        if (e.key === 'openmun_reloj_debate') {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setRelojDebateState(parsed);
        }
        if (e.key === 'openmun_timer_signal') {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_timer_signal', { detail: parsed }));
          }
        }
      } catch (err) {
        console.error('Error rehidratando desde storage event:', err);
      }
    };

    // Escuchar eventos DOM de sincronización externa
    const handleExternalSync = (e) => {
      if (e.detail) {
        aplicarEstadoExterno(e.detail);
      }
    };

    const handleExternalAction = (e) => {
      if (e.detail?.action) {
        ejecutarAccion(e.detail.action, e.detail.payload);
      }
    };

    const handleSessionCleared = () => {
      setPaisesState(PAISES_INICIALES);
      setOradoresColaState([]);
      setOradoresCaucusState([]);
      setRegistroIntervencionesState([]);
      setMocionesState([]);
      setHistoricoMocionesState([]);
      setCaucusActivoState({
        activo: false,
        proponente: '',
        posicionProponente: 'Primero',
        tipo: 'Caucus Moderado',
        varianteConsulta: '',
        tema: '',
        tiempoTotal: 600,
        tiempoOrador: 45
      });
      setVotacionSesionState({
        asunto: i18n.t('ui.draftResolutionMotion'),
        tipoVotacion: 'procedural',
        tipoMayoria: 'simple',
        aplicarVeto: true,
        votos: {}
      });
      setAgendaSesionState({
        establecida: false,
        temaActual: '',
        temasPropuestos: []
      });
      setNombreComiteState('');
      setEnmiendasSesionState({
        tituloProyecto: i18n.t('ui.draftResolutionARes791'),
        textoResolucion: '',
        articulos: [],
        enmiendas: []
      });
      setTipoSesionState('formal');
      setRelojGSLState({ segundosRestantes: 60, tiempoInicial: 60, corriendo: false });
      setYieldEvento(null);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('openmun_session_sync_external', handleExternalSync);
    window.addEventListener('openmun_execute_action_external', handleExternalAction);
    window.addEventListener('openmun_session_cleared', handleSessionCleared);

    return () => {
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch (e) { }
        broadcastChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('openmun_session_sync_external', handleExternalSync);
      window.removeEventListener('openmun_execute_action_external', handleExternalAction);
      window.removeEventListener('openmun_session_cleared', handleSessionCleared);
    };
  }, [ejecutarAccion, aplicarEstadoExterno, tabInstanceId]);

  // 1. GENERAR SNAPSHOT sesion_activa.json OPTIMIZADO
  const generarSnapshotSesion = useCallback(() => {
    // Recuperar alertas y eventos de crisis
    let crisisEventosExport = [];
    let crisisRelojExport = null;
    try {
      const savedEventos = localStorage.getItem('openmun_crisis_eventos');
      if (savedEventos) crisisEventosExport = JSON.parse(savedEventos);
    } catch (e) {}
    try {
      const savedReloj = localStorage.getItem('openmun_crisis_reloj');
      if (savedReloj) crisisRelojExport = JSON.parse(savedReloj);
    } catch (e) {}

    // Recuperar mensajes y notas
    let notesExport = [];
    try {
      const savedNotes = localStorage.getItem('openmun_notes');
      if (savedNotes) notesExport = JSON.parse(savedNotes);
    } catch (e) {}

    // Recuperar configuración de UI
    let configExport = undefined;
    try {
      const savedConfig = localStorage.getItem('openmun_config');
      if (savedConfig) configExport = JSON.parse(savedConfig);
    } catch (e) {}

    // Recuperar ajustes de sala
    let roomSettingsExport = undefined;
    try {
      const savedRoomSettings = localStorage.getItem('openmun_room_settings');
      if (savedRoomSettings) roomSettingsExport = JSON.parse(savedRoomSettings);
    } catch (e) {}

    const resolucionData = {
      titulo: enmiendasSesion?.tituloProyecto || enmiendasSesion?.titulo || i18n.t('ui.draftResolutionARes791'),
      texto: enmiendasSesion?.textoResolucion || enmiendasSesion?.texto || '',
      articulos: Array.isArray(enmiendasSesion?.articulos) ? enmiendasSesion.articulos : [],
      enmiendas: Array.isArray(enmiendasSesion?.enmiendas) ? enmiendasSesion.enmiendas : []
    };

    return {
      version: '2.0',
      tipo: 'openmun_full_backup',
      fechaExportacion: new Date().toISOString(),
      comision: nombreComite || 'Asamblea General - openMUN',
      tipoSesion,
      paises,
      oradoresCola,
      oradoresCaucus,
      registroIntervenciones,
      mociones,
      historicoMociones,
      caucusActivo,
      votacionSesion,
      agendaSesion,
      proyectoResolucion: resolucionData,
      enmiendasSesion: resolucionData,
      eventosCrisis: crisisEventosExport,
      relojCrisis: crisisRelojExport,
      notes: notesExport,
      roomSettings: roomSettingsExport,
      config: configExport
    };
  }, [tipoSesion, paises, oradoresCola, oradoresCaucus, registroIntervenciones, mociones, historicoMociones, caucusActivo, votacionSesion, agendaSesion, nombreComite, enmiendasSesion]);

  // 2. EXPORTAR sesion_activa.json A ARCHIVO LOCAL
  const descargarSesionJSON = (customFileName) => {
    try {
      const sesionData = generarSnapshotSesion();
      const blob = new Blob([JSON.stringify(sesionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let finalName = customFileName && customFileName.trim().length > 0 ? customFileName.trim() : 'sesion_activa.json';
      if (!finalName.toLowerCase().endsWith('.json')) {
        finalName += '.json';
      }
      a.download = finalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar sesión completa:', err);
      alert(t('ui.couldNotExportTheSessionCheckYourBrowserPermissionsOr'));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS DE SUPABASE CLOUD (RESPALDOS DE CONFERENCIA)
  // ─────────────────────────────────────────────────────────────
  const conectarCloud = async (nombre, password, isRegister = false) => {
    try {
      setCloudSyncStatus('syncing');
      const account = isRegister
        ? await registrarConferencia(nombre, password)
        : await loginConferencia(nombre, password);
      setCloudAccount(account);
      setIsCloudLinked(true);
      setCloudSyncStatus('synced');
      setCloudLastSync(new Date());

      // Cargar comités de esta conferencia
      try {
        const list = await listarComites();
        setCloudComitesList(list || []);
      } catch {}

      return { success: true, account };
    } catch (err) {
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const desconectarCloud = async () => {
    await cerrarSesionConferencia();
    setCloudAccount(null);
    setIsCloudLinked(false);
    setCloudSyncStatus('idle');
    setCloudComitesList([]);
    setCloudActiveComiteName('');
    localStorage.removeItem('openmun_cloud_active_comite');
  };

  const listarComitesCloud = async () => {
    try {
      if (!isCloudLinked && !obtenerCuentaActiva()) return [];
      const list = await listarComites();
      setCloudComitesList(list || []);
      return list || [];
    } catch (err) {
      console.warn('Error al listar comités de Supabase:', err);
      return [];
    }
  };

  const guardarComiteCloud = async (customName) => {
    try {
      setCloudSyncStatus('syncing');
      const finalName = (customName || nombreComite || i18n.t('ui.mainCommittee')).trim();
      const snapshot = generarSnapshotSesion();
      const res = await guardarComite(finalName, snapshot);
      setCloudActiveComiteName(finalName);
      localStorage.setItem('openmun_cloud_active_comite', finalName);
      setCloudSyncStatus('synced');
      setCloudLastSync(new Date());

      // Actualizar lista
      await listarComitesCloud();
      return { success: true, name: finalName, res };
    } catch (err) {
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const cargarComiteCloud = async (comiteId, comiteName) => {
    try {
      setCloudSyncStatus('syncing');
      const data = await cargarComite(comiteId);
      if (!data) throw new Error(t('ui.noDataFoundForThisCommittee'));
      const ok = cargarSesionJSON(data);
      if (ok) {
        if (comiteName) {
          setCloudActiveComiteName(comiteName);
          localStorage.setItem('openmun_cloud_active_comite', comiteName);
        }
        setCloudSyncStatus('synced');
        setCloudLastSync(new Date());
        return true;
      } else {
        setCloudSyncStatus('error');
        throw new Error(t('ui.theCommitteeFileDoesNotContainAValidOpenmunSession'));
      }
    } catch (err) {
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const eliminarComiteCloud = async (comiteId) => {
    try {
      await eliminarComite(comiteId);
      await listarComitesCloud();
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Cargar comités guardados al montar si ya está autenticado
  useEffect(() => {
    if (isCloudLinked) {
      listarComitesCloud();
    }
  }, [isCloudLinked]);

  // AUTO-GUARDADO CONTINUO EN SUPABASE CLOUD (Debounce de 2.5s)
  useEffect(() => {
    if (!isCloudLinked || !obtenerCuentaActiva()) return;

    // Saltar el primer ciclo de renderizado para no disparar guardado antes de hidratar
    if (!isInitialCloudSyncRef.current) {
      isInitialCloudSyncRef.current = true;
      return;
    }

    const comiteNameTarget = (cloudActiveComiteName || nombreComite || i18n.t('ui.mainCommittee')).trim();
    if (!comiteNameTarget) return;

    setCloudSyncStatus('syncing');
    const debounceTimer = setTimeout(async () => {
      try {
        const snapshot = generarSnapshotSesion();
        await guardarComite(comiteNameTarget, snapshot);
        setCloudSyncStatus('synced');
        setCloudLastSync(new Date());

        // Actualizar la lista en segundo plano sin interrumpir
        listarComites().then(list => {
          if (list) setCloudComitesList(list);
        }).catch(() => {});
      } catch (err) {
        console.warn('[Supabase Cloud Auto-Save Warning]:', err);
        setCloudSyncStatus('error');
      }
    }, 2500);

    return () => clearTimeout(debounceTimer);
  }, [
    paises,
    oradoresCola,
    oradoresCaucus,
    registroIntervenciones,
    mociones,
    historicoMociones,
    caucusActivo,
    votacionSesion,
    agendaSesion,
    nombreComite,
    enmiendasSesion,
    isCloudLinked,
    cloudActiveComiteName,
    generarSnapshotSesion
  ]);

  // 2. CARGAR sesion_activa.json
  const cargarSesionJSON = (rawSesionData, onConfigLoaded) => {
    try {
      const validation = validateSessionJSON(rawSesionData);
      if (!validation.valid) {
        console.warn('Validación de sesión fallida:', validation.message);
        return false;
      }

      const sesionData = validation.data;

      if (sesionData.localStorageSnapshot && typeof sesionData.localStorageSnapshot === 'object') {
        Object.entries(sesionData.localStorageSnapshot).forEach(([key, val]) => {
          if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
            if (key.startsWith('openmun_') && !key.includes('__')) {
              if (val !== undefined && val !== null) {
                const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
                localStorage.setItem(key, stringVal);
              }
            }
          }
        });
      }

      const snapshot = sesionData.localStorageSnapshot || {};

      const paisesData = sesionData.paises || snapshot.openmun_paises;
      if (Array.isArray(paisesData)) {
        setPaisesState(paisesData);
        localStorage.setItem('openmun_paises', JSON.stringify(paisesData));
      }

      const oradoresColaData = sesionData.oradoresCola || sesionData.oradoresGSL || snapshot.openmun_oradores;
      if (Array.isArray(oradoresColaData)) {
        setOradoresColaState(oradoresColaData);
        localStorage.setItem('openmun_oradores', JSON.stringify(oradoresColaData));
      }

      const oradoresCaucusData = sesionData.oradoresCaucus || snapshot.openmun_oradores_caucus;
      if (Array.isArray(oradoresCaucusData)) {
        setOradoresCaucusState(oradoresCaucusData);
        localStorage.setItem('openmun_oradores_caucus', JSON.stringify(oradoresCaucusData));
      }

      const intervencionesData = sesionData.registroIntervenciones || sesionData.intervenciones || snapshot.openmun_intervenciones;
      if (Array.isArray(intervencionesData)) {
        setRegistroIntervencionesState(intervencionesData);
        localStorage.setItem('openmun_intervenciones', JSON.stringify(intervencionesData));
      }

      const mocionesData = sesionData.mociones || snapshot.openmun_mociones;
      if (Array.isArray(mocionesData)) {
        setMocionesState(mocionesData);
        localStorage.setItem('openmun_mociones', JSON.stringify(mocionesData));
      }

      const historicoMocionesData = sesionData.historicoMociones || snapshot.openmun_historico_mociones;
      if (Array.isArray(historicoMocionesData)) {
        setHistoricoMocionesState(historicoMocionesData);
        localStorage.setItem('openmun_historico_mociones', JSON.stringify(historicoMocionesData));
      }

      const caucusData = sesionData.caucusActivo || snapshot.openmun_caucus;
      if (caucusData && typeof caucusData === 'object') {
        setCaucusActivoState(caucusData);
        localStorage.setItem('openmun_caucus', JSON.stringify(caucusData));
      }

      const votacionData = sesionData.votacionSesion || snapshot.openmun_votacion;
      if (votacionData && typeof votacionData === 'object') {
        setVotacionSesionState(votacionData);
        localStorage.setItem('openmun_votacion', JSON.stringify(votacionData));
      }

      const agendaData = sesionData.agendaSesion || snapshot.openmun_agenda;
      if (agendaData && typeof agendaData === 'object') {
        setAgendaSesionState(agendaData);
        localStorage.setItem('openmun_agenda', JSON.stringify(agendaData));
      }

      const comiteData = sesionData.nombreComite || sesionData.comision || snapshot.openmun_comite;
      if (typeof comiteData === 'string' && comiteData) {
        setNombreComiteState(comiteData);
        localStorage.setItem('openmun_comite', comiteData);
      }

      // Proyecto de Resolución y Enmiendas
      const rawResData = sesionData.proyectoResolucion || sesionData.enmiendasSesion || sesionData.resolucion || snapshot.openmun_enmiendas;
      if (rawResData && typeof rawResData === 'object') {
        const normalizedResolucion = {
          tituloProyecto: rawResData.tituloProyecto || rawResData.titulo || i18n.t('ui.draftResolutionARes791'),
          textoResolucion: rawResData.textoResolucion || rawResData.texto || '',
          articulos: Array.isArray(rawResData.articulos) ? rawResData.articulos : [],
          enmiendas: Array.isArray(rawResData.enmiendas) ? rawResData.enmiendas : []
        };
        setEnmiendasSesionState(normalizedResolucion);
        localStorage.setItem('openmun_enmiendas', JSON.stringify(normalizedResolucion));
      }

      // Alertas y Eventos de Crisis
      const crisisData = sesionData.eventosCrisis || sesionData.alertasCrisis || sesionData.crisisEventos || sesionData.crisis || snapshot.openmun_crisis_eventos;
      if (Array.isArray(crisisData)) {
        localStorage.setItem('openmun_crisis_eventos', JSON.stringify(crisisData));
      }

      // Reloj de Simulación de Crisis
      const relojData = sesionData.relojCrisis || sesionData.relojSimulacion || sesionData.reloj || snapshot.openmun_crisis_reloj;
      if (relojData && typeof relojData === 'object') {
        localStorage.setItem('openmun_crisis_reloj', JSON.stringify(relojData));
      }

      // Mensajes y Notas (Chairs - Backroom - Delegados)
      const notesData = sesionData.notes || sesionData.openmun_notes || snapshot.openmun_notes;
      if (Array.isArray(notesData)) {
        localStorage.setItem('openmun_notes', JSON.stringify(notesData));
      }

      // Ajustes de Sala P2P / WebSocket
      const roomSettingsData = sesionData.roomSettings || sesionData.openmun_room_settings || snapshot.openmun_room_settings;
      if (roomSettingsData && typeof roomSettingsData === 'object') {
        localStorage.setItem('openmun_room_settings', JSON.stringify(roomSettingsData));
      }

      const configData = sesionData.config || sesionData.openmun_config || snapshot.openmun_config;
      if (configData) {
        try {
          const parsedConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;
          if (parsedConfig && typeof parsedConfig === 'object' && !Array.isArray(parsedConfig)) {
            localStorage.setItem('openmun_config', JSON.stringify(parsedConfig));
            if (typeof onConfigLoaded === 'function') {
              onConfigLoaded(parsedConfig);
            }
          }
        } catch (e) {
          console.warn('Configuración omitida por formato no válido:', e);
        }
      }

      Object.keys(sesionData).forEach(key => {
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          if (key.startsWith('openmun_') && !key.includes('__')) {
            const val = sesionData[key];
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
          }
        }
      });

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', { 
        detail: { eventos: crisisData, reloj: relojData } 
      }));
      window.dispatchEvent(new CustomEvent('openmun_session_imported', { detail: sesionData }));

      return true;
    } catch (err) {
      console.error('Error al cargar la sesión JSON:', err);
      return false;
    }
  };

  // VACIAR / BORRAR TODOS LOS DATOS LOCALES DE LA SESIÓN
  const borrarDatosLocales = useCallback(() => {
    setPaisesState(PAISES_INICIALES);
    setOradoresColaState([]);
    setOradoresCaucusState([]);
    setRegistroIntervencionesState([]);
    setMocionesState([]);
    setHistoricoMocionesState([]);
    setCaucusActivoState({
      activo: false,
      proponente: '',
      posicionProponente: 'Primero',
      tipo: 'Caucus Moderado',
      varianteConsulta: '',
      tema: '',
      tiempoTotal: 600,
      tiempoOrador: 45
    });
    setVotacionSesionState({
      asunto: i18n.t('ui.draftResolutionMotion'),
      tipoVotacion: 'procedural',
      tipoMayoria: 'simple',
      aplicarVeto: true,
      votos: {}
    });
    setAgendaSesionState({
      establecida: false,
      temaActual: '',
      temasPropuestos: []
    });
    setNombreComiteState('');
    setEnmiendasSesionState({
      tituloProyecto: i18n.t('ui.draftResolutionARes791'),
      textoResolucion: '',
      articulos: [],
      enmiendas: []
    });
    setTipoSesionState('formal');
    setRelojGSLState({ segundosRestantes: 60, tiempoInicial: 60, corriendo: false });
    setYieldEvento(null);

    // 1. Limpiar estado de Conferencia en Nube / Supabase
    try {
      cerrarSesionConferencia();
    } catch (e) {
      console.warn('Error cerrando sesión de conferencia en nube:', e);
    }
    setCloudAccount(null);
    setIsCloudLinked(false);
    setCloudSyncStatus('idle');
    setCloudComitesList([]);
    setCloudActiveComiteName('');

    // 2. Limpiar sesión activa y almacenamiento de conferencias
    try {
      conferenceService.limpiarSesionActiva();
    } catch (e) {
      console.warn('Error limpiando sesión activa de conferencia:', e);
    }

    // 3. Limpiar claves de almacenamiento registradas
    const keysToRemove = SESSION_STORAGE_KEYS;
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn('Error eliminando clave de localStorage:', k, e);
      }
    });

    // 4. Limpiar cualquier clave dinámica de conferencias, comités o tokens
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        Object.keys(localStorage).forEach(k => {
          if (
            k.startsWith('openmun_conf_') ||
            k.startsWith('openmun_comite_') ||
            k.startsWith('openmun_cloud_')
          ) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', { 
        detail: { eventos: [], reloj: { dia: 1, hora: 9, minutos: 0, activo: false } } 
      }));
      window.dispatchEvent(new CustomEvent('openmun_session_cleared'));
      window.dispatchEvent(new CustomEvent('openmun_conference_cleared'));
    }
    emitirAccion('RESET_SESSION', {});
  }, [emitirAccion]);

  const contextValue = useMemo(() => ({
    tipoSesion,
    cambiarTipoSesion,
    paises,
    setPaises,
    cambiarEstatusPais,
    actualizarPais,
    eliminarPais,
    resetearAsistencia,
    toggleVetoPais,
    ordenarPaisesAlfabetico,
    reordenarPaises,
    oradoresCola,
    agregarOrador,
    removerOrador,
    moverOrador,
    vaciarOradoresGSL,
    ordenarOradoresGSLAlfabetico,
    reordenarOradoresGSL,
    cederTiempo,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    avanzarOradorCaucus,
    vaciarOradoresDebate,
    ordenarOradoresDebateAlfabetico,
    reordenarOradoresDebate,
    moverOradorCaucus,
    registroIntervenciones,
    registrarIntervencion,
    iniciarActividadDebate,
    registrarActividadDebate,
    descargarSesionJSON,
    cargarSesionJSON,
    borrarDatosLocales,
    mociones,
    historicoMociones,
    agregarMocion,
    votarMocion,
    eliminarMocion,
    activarMocion,
    reordenarMociones,
    ordenarMocionesDisruptividad,
    caucusActivo,
    setCaucusActivo,
    relojGSLState,
    actualizarRelojGSL,
    relojDebateState,
    controlarRelojDebate,
    yieldEvento,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    estadoFinVotacion,
    dispararCelebracionVoto,
    enmiendasSesion,
    setEnmiendasSesion,
    guardarResolucionEnmiendas,
    agregarEnmiendaResolucion,
    resolverEnmiendaResolucion,
    eliminarEnmiendaResolucion,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual,
    siguienteTemaAgenda,
    irASiguienteTema,
    nombreComite,
    setNombreComite,
    establecerEstadoComiteCompleto,
    ejecutarAccion,
    aplicarEstadoExterno,
    generarSnapshotSesion,
    // Supabase Cloud
    cloudAccount,
    isCloudLinked,
    cloudSyncStatus,
    cloudComitesList,
    cloudLastSync,
    cloudActiveComiteName,
    conectarCloud,
    desconectarCloud,
    listarComitesCloud,
    guardarComiteCloud,
    cargarComiteCloud,
    eliminarComiteCloud
  }), [
    tipoSesion,
    cambiarTipoSesion,
    paises,
    setPaises,
    cambiarEstatusPais,
    actualizarPais,
    eliminarPais,
    resetearAsistencia,
    toggleVetoPais,
    ordenarPaisesAlfabetico,
    reordenarPaises,
    oradoresCola,
    agregarOrador,
    removerOrador,
    moverOrador,
    vaciarOradoresGSL,
    ordenarOradoresGSLAlfabetico,
    reordenarOradoresGSL,
    cederTiempo,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    avanzarOradorCaucus,
    vaciarOradoresDebate,
    ordenarOradoresDebateAlfabetico,
    reordenarOradoresDebate,
    moverOradorCaucus,
    registroIntervenciones,
    registrarIntervencion,
    iniciarActividadDebate,
    registrarActividadDebate,
    descargarSesionJSON,
    cargarSesionJSON,
    borrarDatosLocales,
    mociones,
    historicoMociones,
    agregarMocion,
    votarMocion,
    eliminarMocion,
    activarMocion,
    reordenarMociones,
    ordenarMocionesDisruptividad,
    caucusActivo,
    setCaucusActivo,
    relojGSLState,
    actualizarRelojGSL,
    relojDebateState,
    controlarRelojDebate,
    yieldEvento,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    estadoFinVotacion,
    dispararCelebracionVoto,
    enmiendasSesion,
    setEnmiendasSesion,
    guardarResolucionEnmiendas,
    agregarEnmiendaResolucion,
    resolverEnmiendaResolucion,
    eliminarEnmiendaResolucion,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual,
    siguienteTemaAgenda,
    irASiguienteTema,
    nombreComite,
    setNombreComite,
    establecerEstadoComiteCompleto,
    ejecutarAccion,
    aplicarEstadoExterno,
    generarSnapshotSesion,
    cloudAccount,
    isCloudLinked,
    cloudSyncStatus,
    cloudComitesList,
    cloudLastSync,
    cloudActiveComiteName,
    conectarCloud,
    desconectarCloud,
    listarComitesCloud,
    guardarComiteCloud,
    cargarComiteCloud,
    eliminarComiteCloud
  ]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
      {gavelRunId > 0 && (
        <GavelAnimation
          key={`gavel-${gavelRunId}`}
          onComplete={() => setGavelRunId(0)}
        />
      )}
      {confettiRunId > 0 && (
        <ConfettiAnimation
          key={`confetti-${confettiRunId}`}
          onComplete={() => setConfettiRunId(0)}
        />
      )}
      <NewDebateSessionModal
        isOpen={confirmarSesion}
        onDecision={nueva => confirmarSesionRef.current?.resolve(nueva)}
      />
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error(i18n.t('ui.usesessionMustBeUsedWithinASessionprovider'));
  }
  return context;
};
