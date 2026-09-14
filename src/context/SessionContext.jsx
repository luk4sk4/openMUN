import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { googleDriveService } from '../services/googleDriveService';
import { conferenceService } from '../services/conferenceService';
import { validateSessionJSON, normalizarDatosComite } from '../utils/sessionValidator';
import { getFlagEmoji } from '../utils/flags';
import { parsearResolucion, reconstruirTextoResolucion, aplicarEnmiendaAArticulos } from '../utils/resolutionUtils';

const SessionContext = createContext();

const PAISES_INICIALES = [];
const SESSION_SYNC_CHANNEL_NAME = 'openmun_session_sync';

export const SessionProvider = ({ children }) => {
  const tabInstanceId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).current;
  const broadcastChannelRef = useRef(null);

  const [tipoSesion, setTipoSesionState] = useState(() => {
    return localStorage.getItem('openmun_tipo_sesion') || 'formal';
  });

  const [paises, setPaisesState] = useState(() => {
    const saved = localStorage.getItem('openmun_paises');
    return saved ? JSON.parse(saved) : PAISES_INICIALES;
  });

  const [oradoresCola, setOradoresColaState] = useState(() => {
    const saved = localStorage.getItem('openmun_oradores');
    return saved ? JSON.parse(saved) : [];
  });

  const [oradoresCaucus, setOradoresCaucusState] = useState(() => {
    const saved = localStorage.getItem('openmun_oradores_caucus');
    return saved ? JSON.parse(saved) : [];
  });

  const [registroIntervenciones, setRegistroIntervencionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_intervenciones');
    return saved ? JSON.parse(saved) : [];
  });

  const [mociones, setMocionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_mociones');
    return saved ? JSON.parse(saved) : [];
  });

  const [historicoMociones, setHistoricoMocionesState] = useState(() => {
    const saved = localStorage.getItem('openmun_historico_mociones');
    return saved ? JSON.parse(saved) : [];
  });

  const [caucusActivo, setCaucusActivoState] = useState(() => {
    const saved = localStorage.getItem('openmun_caucus');
    return saved ? JSON.parse(saved) : {
      activo: false,
      proponente: '',
      posicionProponente: 'Primero',
      tipo: 'Caucus Moderado',
      varianteConsulta: '',
      tema: '',
      tiempoTotal: 600,
      tiempoOrador: 45
    };
  });

  const [votacionSesion, setVotacionSesionState] = useState(() => {
    const saved = localStorage.getItem('openmun_votacion');
    return saved ? JSON.parse(saved) : {
      asunto: 'Proyecto de Resolución / Moción',
      tipoVotacion: 'procedural',
      tipoMayoria: 'simple',
      aplicarVeto: true,
      votos: {}
    };
  });

  const [agendaSesion, setAgendaSesionState] = useState(() => {
    const saved = localStorage.getItem('openmun_agenda');
    return saved ? JSON.parse(saved) : {
      establecida: false,
      temaActual: '',
      temasPropuestos: []
    };
  });

  const [nombreComite, setNombreComiteState] = useState(() => {
    return localStorage.getItem('openmun_comite') || '';
  });

  const [enmiendasSesion, setEnmiendasSesionState] = useState(() => {
    const saved = localStorage.getItem('openmun_enmiendas');
    return saved ? JSON.parse(saved) : {
      tituloProyecto: 'Proyecto de Resolución A/RES/79/1',
      textoResolucion: '',
      articulos: [],
      enmiendas: []
    };
  });

  const [relojGSLState, setRelojGSLState] = useState({ segundosRestantes: 60, tiempoInicial: 60, corriendo: false });
  const [yieldEvento, setYieldEvento] = useState(null);

  // Estados de Google Drive
  const [driveFileId, setDriveFileId] = useState(() => localStorage.getItem('openmun_drive_file_id') || null);
  const [driveFileName, setDriveFileName] = useState(() => localStorage.getItem('openmun_drive_file_name') || 'openmun_sesion_activa.json');
  const [isDriveLinked, setIsDriveLinked] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'synced' | 'syncing' | 'error'
  const [driveUser, setDriveUser] = useState(null);
  const [driveLastSync, setDriveLastSync] = useState(null);
  const [driveFilesList, setDriveFilesList] = useState([]);
  const isInitialSyncRef = useRef(false);

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
    relojGSLState
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
      relojGSLState
    };
  }, [tipoSesion, paises, oradoresCola, oradoresCaucus, registroIntervenciones, mociones, historicoMociones, caucusActivo, votacionSesion, agendaSesion, nombreComite, enmiendasSesion, relojGSLState]);

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
        titulo: enmiendasSesion?.tituloProyecto || 'Proyecto de Resolución A/RES/79/1',
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
      asunto: 'Proyecto de Resolución / Moción',
      tipoVotacion: 'procedural',
      tipoMayoria: 'simple',
      aplicarVeto: true,
      votos: {}
    });
    setEnmiendasSesionState(nuevasEnmiendas);

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
            datos_json: sesionData
          });
        } catch (errPatch) {
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
      localStorage.setItem('openmun_tipo_sesion', nuevoEstado.tipoSesion);
    }
    if (Array.isArray(nuevoEstado.paises)) {
      setPaisesState(nuevoEstado.paises);
    }
    if (Array.isArray(nuevoEstado.oradoresCola)) {
      setOradoresColaState(nuevoEstado.oradoresCola);
    }
    if (Array.isArray(nuevoEstado.oradoresCaucus)) {
      setOradoresCaucusState(nuevoEstado.oradoresCaucus);
    }
    if (Array.isArray(nuevoEstado.registroIntervenciones)) {
      setRegistroIntervencionesState(nuevoEstado.registroIntervenciones);
    }
    if (Array.isArray(nuevoEstado.mociones)) {
      setMocionesState(nuevoEstado.mociones);
    }
    if (Array.isArray(nuevoEstado.historicoMociones)) {
      setHistoricoMocionesState(nuevoEstado.historicoMociones);
    }
    if (nuevoEstado.caucusActivo && typeof nuevoEstado.caucusActivo === 'object') {
      setCaucusActivoState(nuevoEstado.caucusActivo);
    }
    if (nuevoEstado.votacionSesion && typeof nuevoEstado.votacionSesion === 'object') {
      setVotacionSesionState(nuevoEstado.votacionSesion);
    }
    if (nuevoEstado.agendaSesion && typeof nuevoEstado.agendaSesion === 'object') {
      setAgendaSesionState(nuevoEstado.agendaSesion);
    }
    if (typeof nuevoEstado.nombreComite === 'string' && nuevoEstado.nombreComite) {
      setNombreComiteState(nuevoEstado.nombreComite);
    } else if (typeof nuevoEstado.comision === 'string' && nuevoEstado.comision) {
      setNombreComiteState(nuevoEstado.comision);
    }
    if (nuevoEstado.enmiendasSesion && typeof nuevoEstado.enmiendasSesion === 'object') {
      setEnmiendasSesionState(nuevoEstado.enmiendasSesion);
    }
    if (nuevoEstado.relojGSLState && typeof nuevoEstado.relojGSLState === 'object') {
      setRelojGSLState(nuevoEstado.relojGSLState);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // FUNCIONES DE MUTACIÓN DE ESTADO
  // ─────────────────────────────────────────────────────────────

  // Votación
  const registrarVotoPais = useCallback((countryIdentifier, voto, emitir = true) => {
    setVotacionSesionState(prev => {
      const currentPaises = stateRef.current.paises || [];
      const paisObj = currentPaises.find(
        p => p.id === countryIdentifier ||
             p.nombre?.toLowerCase() === String(countryIdentifier).toLowerCase()
      );
      const targetId = paisObj ? paisObj.id : countryIdentifier;

      // Normalizar texto de voto a clave estándar ('favor' | 'contra' | 'abstencion' | 'pasar')
      let normalizedVoto = voto;
      if (voto !== null && voto !== undefined) {
        const s = String(voto).trim().toLowerCase();
        if (s === 'favor' || s === 'a favor' || s === 'in favor' || s === 'yes' || s === 'si' || s === 'sí') {
          normalizedVoto = 'favor';
        } else if (s === 'contra' || s === 'en contra' || s === 'against' || s === 'no') {
          normalizedVoto = 'contra';
        } else if (s === 'abstencion' || s === 'abstención' || s === 'abstain' || s === 'abstention') {
          normalizedVoto = 'abstencion';
        } else if (s === 'pasar' || s === 'pase' || s === 'pass') {
          normalizedVoto = 'pasar';
        }
      }

      const copyVotos = { ...prev.votos };
      if (normalizedVoto === null || normalizedVoto === undefined) {
        delete copyVotos[targetId];
      } else {
        copyVotos[targetId] = normalizedVoto;
      }
      return { ...prev, votos: copyVotos };
    });

    if (emitir) {
      emitirAccion('registrarVotoPais', { countryIdentifier, voto });
    }
  }, [emitirAccion]);

  const configurarVotacion = useCallback((ajustes, emitir = true) => {
    setVotacionSesionState(prev => ({
      ...prev,
      ...ajustes
    }));
    if (emitir) {
      emitirAccion('configurarVotacion', { ajustes });
    }
  }, [emitirAccion]);

  const resetearVotacion = useCallback((emitir = true) => {
    setVotacionSesionState(prev => ({
      ...prev,
      votos: {}
    }));
    if (emitir) {
      emitirAccion('resetearVotacion', {});
    }
  }, [emitirAccion]);

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
    setOradoresColaState(prev => prev.filter(o => o.id !== id && o.nombre !== id));
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
    setOradoresCaucusState(prev => prev.slice(1));
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

  // Agenda & Comité
  const establecerAgenda = useCallback((temaActual, temasPropuestos = [], emitir = true) => {
    setAgendaSesionState({
      establecida: true,
      temaActual,
      temasPropuestos: temasPropuestos.length > 0 ? temasPropuestos : [
        { id: 't1', titulo: temaActual, estado: 'En Discusión' }
      ]
    });
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

    setCaucusActivoState({
      activo: true,
      proponente: mocion.proponente,
      posicionProponente: posProponente,
      tipo: tipoMocion,
      varianteConsulta: mocion.varianteConsulta || '',
      tema: mocion.tema,
      tiempoTotal: Number(mocion.tiempoTotal) || 0,
      tiempoOrador: Number(mocion.tiempoOrador) || 0,
      timestampActivacion: Date.now()
    });

    if (emitir) {
      emitirAccion('activarMocion', { mocion });
    }
  }, [emitirAccion]);

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
      case 'establecerAgenda':
        establecerAgenda(payload.temaActual, payload.temasPropuestos, false);
        break;
      case 'cambiarTemaActual':
        cambiarTemaActual(payload.nuevoTema, false);
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
    setCaucusActivo, establecerAgenda, cambiarTemaActual, setNombreComite, agregarMocion, activarMocion,
    votarMocion, eliminarMocion, reordenarMociones, ordenarMocionesDisruptividad, registrarIntervencion,
    actualizarRelojGSL, setEnmiendasSesion, guardarResolucionEnmiendas, agregarEnmiendaResolucion,
    resolverEnmiendaResolucion, eliminarEnmiendaResolucion
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

    window.addEventListener('storage', handleStorage);
    window.addEventListener('openmun_session_sync_external', handleExternalSync);
    window.addEventListener('openmun_execute_action_external', handleExternalAction);

    return () => {
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch (e) { }
        broadcastChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('openmun_session_sync_external', handleExternalSync);
      window.removeEventListener('openmun_execute_action_external', handleExternalAction);
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
      titulo: enmiendasSesion?.tituloProyecto || enmiendasSesion?.titulo || 'Proyecto de Resolución A/RES/79/1',
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
      alert('Error al exportar sesión: ' + err.message);
    }
  };

  // Listar todos los archivos en la carpeta openMUN de Drive
  const listarSesionesDrive = async () => {
    try {
      if (!googleDriveService.isAuthenticated()) return [];
      const archivos = await googleDriveService.listarArchivosSesion();
      setDriveFilesList(archivos);
      return archivos;
    } catch (err) {
      console.warn('Error al listar archivos de Drive:', err);
      return [];
    }
  };

  // 3. CONECTAR Y VINCULAR CON GOOGLE DRIVE
  const conectarGoogleDrive = async () => {
    try {
      setDriveSyncStatus('connecting');
      const authResult = await googleDriveService.conectar();
      if (authResult.user) {
        setDriveUser(authResult.user);
      }

      // Obtener lista de archivos en la carpeta openMUN
      const archivos = await googleDriveService.listarArchivosSesion();
      setDriveFilesList(archivos);

      const hayDatosLocales = paises.length > 0 || oradoresCola.length > 0 || (nombreComite && nombreComite.trim().length > 0);

      // Si ya hay un archivo id guardado y existe en Drive
      let targetFile = driveFileId ? archivos.find(f => f.id === driveFileId) : null;
      if (!targetFile && archivos.length > 0) {
        targetFile = archivos[0];
      }

      if (targetFile) {
        setDriveFileId(targetFile.id);
        setDriveFileName(targetFile.name);
        localStorage.setItem('openmun_drive_file_id', targetFile.id);
        localStorage.setItem('openmun_drive_file_name', targetFile.name);

        if (!hayDatosLocales) {
          // Si no hay datos locales, cargar directamente la sesión desde Drive
          const sesionRemota = await googleDriveService.descargarSesion(targetFile.id);
          cargarSesionJSON(sesionRemota);
        } else {
          // Si ya hay datos locales, sincronizar actualizando el archivo en Drive
          const snapshotActual = generarSnapshotSesion();
          await googleDriveService.actualizarArchivoSesion(targetFile.id, snapshotActual);
        }
      } else {
        // No existe ningún archivo en la carpeta openMUN -> crear nuevo archivo
        const nombreArchivo = nombreComite && nombreComite.trim().length > 0
          ? `openmun_${nombreComite.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
          : 'openmun_sesion_activa.json';
        const snapshotActual = generarSnapshotSesion();
        const nuevoArchivo = await googleDriveService.crearArchivoSesion(snapshotActual, nombreArchivo);
        setDriveFileId(nuevoArchivo.id);
        setDriveFileName(nuevoArchivo.name);
        localStorage.setItem('openmun_drive_file_id', nuevoArchivo.id);
        localStorage.setItem('openmun_drive_file_name', nuevoArchivo.name);
        const actualizados = await googleDriveService.listarArchivosSesion();
        setDriveFilesList(actualizados);
      }

      setIsDriveLinked(true);
      setDriveSyncStatus('synced');
      setDriveLastSync(new Date());
      isInitialSyncRef.current = true;
      return true;
    } catch (err) {
      console.error('Error al conectar Google Drive:', err);
      setDriveSyncStatus('error');
      alert('Error al conectar con Google Drive: ' + (err.message || err));
      return false;
    }
  };

  // Cargar una sesión específica desde Drive por su File ID
  const cargarSesionDesdeDrive = async (fileId, fileName) => {
    try {
      setDriveSyncStatus('syncing');
      const sesionRemota = await googleDriveService.descargarSesion(fileId);
      const ok = cargarSesionJSON(sesionRemota);
      if (ok) {
        setDriveFileId(fileId);
        if (fileName) setDriveFileName(fileName);
        localStorage.setItem('openmun_drive_file_id', fileId);
        if (fileName) localStorage.setItem('openmun_drive_file_name', fileName);
        setIsDriveLinked(true);
        setDriveSyncStatus('synced');
        setDriveLastSync(new Date());
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error al cargar sesión desde Drive:', err);
      setDriveSyncStatus('error');
      alert('Error al cargar archivo desde Drive: ' + err.message);
      return false;
    }
  };

  // Guardar la sesión actual como un nuevo archivo en Drive
  const guardarNuevaSesionEnDrive = async (nombreArchivo) => {
    try {
      setDriveSyncStatus('syncing');
      const snapshotActual = generarSnapshotSesion();
      const nuevo = await googleDriveService.crearArchivoSesion(snapshotActual, nombreArchivo);
      setDriveFileId(nuevo.id);
      setDriveFileName(nuevo.name);
      localStorage.setItem('openmun_drive_file_id', nuevo.id);
      localStorage.setItem('openmun_drive_file_name', nuevo.name);
      
      const archivos = await googleDriveService.listarArchivosSesion();
      setDriveFilesList(archivos);

      setIsDriveLinked(true);
      setDriveSyncStatus('synced');
      setDriveLastSync(new Date());
      return nuevo;
    } catch (err) {
      console.error('Error al crear nueva sesión en Drive:', err);
      setDriveSyncStatus('error');
      alert('Error al crear archivo en Drive: ' + err.message);
      return null;
    }
  };

  // Vincular la sincronización activa a un archivo existente de Drive
  const vincularArchivoDrive = async (fileId, fileName) => {
    try {
      setDriveFileId(fileId);
      setDriveFileName(fileName);
      localStorage.setItem('openmun_drive_file_id', fileId);
      localStorage.setItem('openmun_drive_file_name', fileName);
      setDriveSyncStatus('syncing');

      const snapshotActual = generarSnapshotSesion();
      await googleDriveService.actualizarArchivoSesion(fileId, snapshotActual);

      setIsDriveLinked(true);
      setDriveSyncStatus('synced');
      setDriveLastSync(new Date());
      return true;
    } catch (err) {
      console.error('Error al vincular archivo en Drive:', err);
      setDriveSyncStatus('error');
      return false;
    }
  };

  // Eliminar un archivo de Drive
  const eliminarSesionDrive = async (fileId) => {
    try {
      await googleDriveService.eliminarArchivo(fileId);
      if (driveFileId === fileId) {
        setDriveFileId(null);
        setDriveFileName('');
        localStorage.removeItem('openmun_drive_file_id');
        localStorage.removeItem('openmun_drive_file_name');
        setIsDriveLinked(false);
        setDriveSyncStatus('disconnected');
      }
      const archivos = await googleDriveService.listarArchivosSesion();
      setDriveFilesList(archivos);
      return true;
    } catch (err) {
      console.error('Error al eliminar archivo en Drive:', err);
      alert('Error al eliminar archivo de Drive: ' + err.message);
      return false;
    }
  };

  // 4. DESCONECTAR GOOGLE DRIVE
  const desconectarGoogleDrive = () => {
    googleDriveService.desconectar();
    setIsDriveLinked(false);
    setDriveSyncStatus('disconnected');
    setDriveUser(null);
    setDriveFilesList([]);
  };

  // 5. SINCRONIZACIÓN MANUAL CON DRIVE
  const sincronizarDriveManual = async () => {
    if (!isDriveLinked || !driveFileId) {
      return await conectarGoogleDrive();
    }
    try {
      setDriveSyncStatus('syncing');
      const snapshot = generarSnapshotSesion();
      await googleDriveService.actualizarArchivoSesion(driveFileId, snapshot);
      setDriveSyncStatus('synced');
      setDriveLastSync(new Date());
      return true;
    } catch (err) {
      console.error('Error en sincronización manual con Drive:', err);
      setDriveSyncStatus('error');
      return false;
    }
  };

  // 6. AUTO-GUARDADO CONTINUO EN GOOGLE DRIVE (Debounce de 2.5s)
  useEffect(() => {
    if (!isDriveLinked || !driveFileId || !googleDriveService.isAuthenticated()) return;

    if (!isInitialSyncRef.current) {
      isInitialSyncRef.current = true;
      return;
    }

    setDriveSyncStatus('syncing');
    const debounceTimer = setTimeout(async () => {
      try {
        const snapshot = generarSnapshotSesion();
        await googleDriveService.actualizarArchivoSesion(driveFileId, snapshot);
        setDriveSyncStatus('synced');
        setDriveLastSync(new Date());
      } catch (err) {
        console.warn('Error al auto-guardar en Google Drive:', err);
        setDriveSyncStatus('error');
      }
    }, 2500);

    return () => clearTimeout(debounceTimer);
  }, [paises, oradoresCola, oradoresCaucus, registroIntervenciones, mociones, historicoMociones, caucusActivo, votacionSesion, agendaSesion, nombreComite, enmiendasSesion, isDriveLinked, driveFileId, generarSnapshotSesion]);

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
          if (val !== undefined && val !== null) {
            const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
            localStorage.setItem(key, stringVal);
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
          tituloProyecto: rawResData.tituloProyecto || rawResData.titulo || 'Proyecto de Resolución A/RES/79/1',
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
        if (key.startsWith('openmun_')) {
          const val = sesionData[key];
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
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
      asunto: 'Proyecto de Resolución / Moción',
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
      tituloProyecto: 'Proyecto de Resolución A/RES/79/1',
      textoResolucion: '',
      articulos: [],
      enmiendas: []
    });
    setTipoSesionState('formal');
    setRelojGSLState({ segundosRestantes: 60, tiempoInicial: 60, corriendo: false });
    setYieldEvento(null);

    const keysToRemove = [
      'openmun_tipo_sesion',
      'openmun_paises',
      'openmun_oradores',
      'openmun_oradores_caucus',
      'openmun_intervenciones',
      'openmun_mociones',
      'openmun_historico_mociones',
      'openmun_caucus',
      'openmun_votacion',
      'openmun_agenda',
      'openmun_comite',
      'openmun_enmiendas',
      'sesion_activa.json',
      'openmun_crisis_eventos',
      'openmun_crisis_reloj',
      'openmun_cronometros',
      'openmun_oradores_historial',
      'openmun_cronometro_enmiendas',
      'openmun_mesa_activa',
      'openmun_current_comite_id',
      'openmun_current_conf_id'
    ];
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn('Error eliminando clave de localStorage:', k, e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', { 
        detail: { eventos: [], reloj: { dia: 1, hora: 9, minutos: 0, activo: false } } 
      }));
      window.dispatchEvent(new CustomEvent('openmun_session_cleared'));
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
    yieldEvento,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    enmiendasSesion,
    setEnmiendasSesion,
    guardarResolucionEnmiendas,
    agregarEnmiendaResolucion,
    resolverEnmiendaResolucion,
    eliminarEnmiendaResolucion,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual,
    nombreComite,
    setNombreComite,
    establecerEstadoComiteCompleto,
    ejecutarAccion,
    aplicarEstadoExterno,
    generarSnapshotSesion,
    isDriveLinked,
    driveSyncStatus,
    driveUser,
    driveLastSync,
    driveFileName,
    driveFilesList,
    conectarGoogleDrive,
    desconectarGoogleDrive,
    sincronizarDriveManual,
    listarSesionesDrive,
    cargarSesionDesdeDrive,
    guardarNuevaSesionEnDrive,
    vincularArchivoDrive,
    eliminarSesionDrive
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
    yieldEvento,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    enmiendasSesion,
    setEnmiendasSesion,
    guardarResolucionEnmiendas,
    agregarEnmiendaResolucion,
    resolverEnmiendaResolucion,
    eliminarEnmiendaResolucion,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual,
    nombreComite,
    setNombreComite,
    establecerEstadoComiteCompleto,
    ejecutarAccion,
    aplicarEstadoExterno,
    generarSnapshotSesion,
    isDriveLinked,
    driveSyncStatus,
    driveUser,
    driveLastSync,
    driveFileName,
    driveFilesList,
    conectarGoogleDrive,
    desconectarGoogleDrive,
    sincronizarDriveManual,
    listarSesionesDrive,
    cargarSesionDesdeDrive,
    guardarNuevaSesionEnDrive,
    vincularArchivoDrive,
    eliminarSesionDrive
  ]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe ser usado dentro de un SessionProvider');
  }
  return context;
};
