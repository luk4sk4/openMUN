import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import {
  Building2,
  Users,
  Shield,
  Radio,
  ArrowLeft,
  Search,
  Plus,
  Play,
  Eye,
  Megaphone,
  Download,
  Upload,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Settings,
  Globe,
  FileSpreadsheet,
  Check,
  X,
  UserCheck,
  Send,
  EyeOff,
  CheckSquare,
  Square,
  ClipboardList,
  Database,
  Mail,
  Key,
  Unlock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';
import conferenceService from '../../services/conferenceService';
import ConferenceBanner from '../common/ConferenceBanner';
import { useP2P } from '../../context/P2PContext';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import {
  formatearMensajeAviso,
  correspondeAviso,
  obtenerEtiquetaDestino,
  obtenerOpcionesDestino
} from '../../utils/announcementHelpers';
import { normalizarDatosComite } from '../../utils/sessionValidator';
import EstablecerAgenda from '../widgets/EstablecerAgenda';
import ImportarPaises from '../widgets/ImportarPaises';
import MatrizPaises from '../widgets/MatrizPaises';

const ConferenceView = ({ initialConfId = '', initialMode = 'explore', onExit, isLight: propIsLight }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;

  const { setViewMode } = useP2P();
  const {
    setNombreComite,
    aplicarEstadoExterno,
    establecerEstadoComiteCompleto,
    cambiarTipoSesion,
    paises,
    agendaSesion,
    nombreComite,
    oradoresCola,
    oradoresCaucus,
    registroIntervenciones,
    mociones,
    historicoMociones,
    caucusActivo,
    votacionSesion,
    enmiendasSesion,
    tipoSesion
  } = useSession();

  // Estados de la conferencia
  const [confIdInput, setConfIdInput] = useState(initialConfId);
  const [pinAccesoInput, setPinAccesoInput] = useState(() => {
    if (initialConfId) {
      try {
        return localStorage.getItem(`openmun_conf_pin_${initialConfId.toLowerCase().trim()}`) || '';
      } catch (e) { return ''; }
    }
    return '';
  });
  const [conferencia, setConferencia] = useState(null);
  const [comites, setComites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filtroComite, setFiltroComite] = useState('');

  // Pestaña Principal Superior: 'VER_COMITES' | 'STAFF' | 'SECRETARIA'
  const [activeMainTab, setActiveMainTab] = useState(() => {
    if (initialMode === 'admin') return 'SECRETARIA';
    if (initialMode === 'staff') return 'STAFF';
    return 'VER_COMITES';
  });

  // Estados de Admin / Secretaría (Auto-recuperado de localStorage si ya fue ingresado)
  const [adminPinInput, setAdminPinInput] = useState(() => {
    if (initialConfId) {
      try {
        return localStorage.getItem(`openmun_conf_admin_pin_${initialConfId.toLowerCase().trim()}`) || '';
      } catch (e) { return ''; }
    }
    return '';
  });
  const [mostrarAdminPin, setMostrarAdminPin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (initialConfId) {
      try {
        const saved = localStorage.getItem(`openmun_conf_admin_pin_${initialConfId.toLowerCase().trim()}`);
        return Boolean(saved);
      } catch (e) { return false; }
    }
    return false;
  });
  const [resumenData, setResumenData] = useState([]);

  // Estados de Configuración General de Conferencia (PATCH /api/conferencias/:id)
  const confSettingsInicializadoRef = useRef(false);
  const [confNombreInput, setConfNombreInput] = useState('');
  const [confEmailAdminInput, setConfEmailAdminInput] = useState('');
  const [cambiarPinAcceso, setCambiarPinAcceso] = useState(false);
  const [confPinAccesoInput, setConfPinAccesoInput] = useState('');
  const [mostrarConfPinAcceso, setMostrarConfPinAcceso] = useState(false);
  const [confNuevoPinAdmin, setConfNuevoPinAdmin] = useState('');
  const [mostrarConfNuevoPin, setMostrarConfNuevoPin] = useState(false);
  const [confPinAdminActual, setConfPinAdminActual] = useState('');
  const [mostrarConfPinActual, setMostrarConfPinActual] = useState(false);
  const [guardandoConfSettings, setGuardandoConfSettings] = useState(false);
  const [confSettingsFeedback, setConfSettingsFeedback] = useState(null);

  const [importandoJSON, setImportandoJSON] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef(null);
  const singleComiteFileInputRef = useRef(null);

  // Sincronizar inputs cuando se carga la conferencia por primera vez o se actualiza
  useEffect(() => {
    if (conferencia) {
      if (conferencia.nombre && !confNombreInput) setConfNombreInput(conferencia.nombre);
      if (conferencia.email_admin !== undefined && conferencia.email_admin !== null) {
        setConfEmailAdminInput(conferencia.email_admin || '');
      }
      setCambiarPinAcceso(Boolean(conferencia.requierePin));
      confSettingsInicializadoRef.current = true;
    }
  }, [conferencia]);

  // Estados para nuevo comité desde Secretaría
  const [nuevoNombreComite, setNuevoNombreComite] = useState('');
  const [nuevoPinMesa, setNuevoPinMesa] = useState('');
  const [creandoComite, setCreandoComite] = useState(false);

  // Estados para nuevo aviso desde Secretaría (Base de Datos)
  const [avisoDestino, setAvisoDestino] = useState(''); // '' = Global
  const [avisoEmisor, setAvisoEmisor] = useState('organizacion');
  const [avisoTipo, setAvisoTipo] = useState('info');
  const [avisoMensaje, setAvisoMensaje] = useState('');
  const [avisosActivos, setAvisosActivos] = useState([]);
  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [avisoFeedback, setAvisoFeedback] = useState(null);

  // Estados para Panel Staff (Base de Datos y Checklist)
  const [staffDestino, setStaffDestino] = useState('SECRETARIA'); // 'SECRETARIA' | 'GLOBAL' | 'STAFF_ALL' | comiteId
  const [staffPrioridad, setStaffPrioridad] = useState('info');
  const [staffMensaje, setStaffMensaje] = useState('');
  const [enviandoMensajeStaff, setEnviandoMensajeStaff] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState(null);
  const [nuevaTareaStaff, setNuevaTareaStaff] = useState('');
  const [nuevaTareaAsignado, setNuevaTareaAsignado] = useState('');
  const [nuevaTareaComiteId, setNuevaTareaComiteId] = useState('GLOBAL');
  const [filtroComiteChecklist, setFiltroComiteChecklist] = useState('TODOS');
  const [checklistStaff, setChecklistStaff] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_staff_panel_checklist');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!conferencia?.id) return;
    try {
      const saved = localStorage.getItem(`openmun_staff_panel_checklist_${conferencia.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklistStaff(parsed);
        }
      }
    } catch (e) { }
  }, [conferencia?.id]);

  useEffect(() => {
    try {
      if (conferencia?.id) {
        localStorage.setItem(`openmun_staff_panel_checklist_${conferencia.id}`, JSON.stringify(checklistStaff));
      }
      localStorage.setItem('openmun_staff_panel_checklist', JSON.stringify(checklistStaff));
    } catch (e) { }
  }, [checklistStaff, conferencia?.id]);

  // Modal para PIN de mesa directiva
  const [comiteSeleccionado, setComiteSeleccionado] = useState(null);
  const [pinMesaInput, setPinMesaInput] = useState('');
  const [pinMesaError, setPinMesaError] = useState(null);

  // Modal de Configuración Integral de Comité desde Secretaría (Agenda, Importar, Matriz, Ajustes)
  const [comiteEnEdicion, setComiteEnEdicion] = useState(null);
  const [secretariaWidgetTab, setSecretariaWidgetTab] = useState('AGENDA'); // 'AGENDA' | 'IMPORTAR' | 'MATRIZ' | 'AJUSTES'
  const [comiteEditorPinMesa, setComiteEditorPinMesa] = useState('');
  const [mostrarComiteEditorPinMesa, setMostrarComiteEditorPinMesa] = useState(false);
  const [comiteEditorTipoSesion, setComiteEditorTipoSesion] = useState('formal');
  const [guardandoComite, setGuardandoComite] = useState(false);
  const [guardadoFeedback, setGuardadoFeedback] = useState(null);

  // Cargar conferencia inicial (con auto-recuperación de PINs)
  const cargarConferencia = useCallback(async (id, pin = '') => {
    if (!id || !id.trim()) return;
    const cleanId = id.trim().toLowerCase();
    const effectivePin = pin || localStorage.getItem(`openmun_conf_pin_${cleanId}`) || '';
    setLoading(true);
    setErrorMsg(null);
    try {
      const active = conferenceService.obtenerSesionActiva();
      const res = await conferenceService.accederConferencia(cleanId, effectivePin);
      if (res && res.id) {
        if (effectivePin) {
          try {
            localStorage.setItem(`openmun_conf_pin_${cleanId}`, effectivePin);
          } catch (e) {}
        }
        const emailAdmin = res.email_admin || res.email || (active?.id === res.id ? active?.email_admin : null) || null;
        setConferencia({
          id: res.id,
          nombre: res.nombre,
          requierePin: res.requierePin,
          email_admin: emailAdmin
        });
        if (emailAdmin) {
          setConfEmailAdminInput(emailAdmin);
        }
        let initialComites = Array.isArray(res.comites) ? res.comites : [];
        try {
          const localConfComites = localStorage.getItem(`openmun_conf_comites_${res.id}`);
          if (localConfComites) {
            const parsedLocal = JSON.parse(localConfComites);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              if (initialComites.length > 0) {
                const serverIds = new Set(initialComites.map(c => c.id));
                const map = new Map(initialComites.map(c => [c.id, c]));
                parsedLocal.forEach(lc => {
                  if (lc && lc.id && serverIds.has(lc.id)) {
                    map.set(lc.id, { ...lc, ...(map.get(lc.id) || {}) });
                  }
                });
                initialComites = Array.from(map.values());
              } else {
                initialComites = parsedLocal;
              }
            }
          }
          localStorage.setItem(`openmun_conf_comites_${res.id}`, JSON.stringify(initialComites));
        } catch (e) { }

        setComites(initialComites);

        // Auto-autenticar sesión de Secretaría si ya existe el PIN guardado
        const savedAdminPin = localStorage.getItem(`openmun_conf_admin_pin_${res.id}`) ||
          (active?.id === res.id ? active?.pin_admin : '') || '';

        if (savedAdminPin) {
          setAdminPinInput(savedAdminPin);
          setConfPinAdminActual(savedAdminPin);
          setIsAdminAuthenticated(true);
        } else {
          setIsAdminAuthenticated(false);
          setAdminPinInput('');
        }

        conferenceService.guardarSesionActiva({
          id: res.id,
          nombre: res.nombre,
          email_admin: emailAdmin,
          ...(savedAdminPin ? { pin_admin: savedAdminPin } : {}),
          ...(effectivePin ? { pin_acceso: effectivePin } : {})
        });
      }
    } catch (err) {
      if (err.status === 401) {
        setErrorMsg('Esta conferencia requiere un PIN de acceso o el PIN introducido es incorrecto.');
      } else {
        setErrorMsg(err.message || 'No se pudo encontrar la conferencia.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Al estar en la vista de conferencia o secretaría, asegurar que no haya mesa activa interfiriendo en segundo plano
    localStorage.removeItem('openmun_mesa_activa');
    localStorage.removeItem('openmun_current_comite_id');
  }, []);

  useEffect(() => {
    if (initialConfId) {
      cargarConferencia(initialConfId);
    } else {
      const active = conferenceService.obtenerSesionActiva();
      if (active?.id) {
        setConfIdInput(active.id);
        const savedPin = localStorage.getItem(`openmun_conf_pin_${active.id.toLowerCase()}`) || active.pin_acceso || '';
        if (savedPin) setPinAccesoInput(savedPin);
        cargarConferencia(active.id, savedPin);
      }
    }
  }, [initialConfId, cargarConferencia]);

  // Auto-autenticar Secretaría al cambiar de pestaña si ya hay un PIN registrado
  useEffect(() => {
    if (activeMainTab === 'SECRETARIA' && conferencia?.id && !isAdminAuthenticated) {
      const savedAdminPin = localStorage.getItem(`openmun_conf_admin_pin_${conferencia.id.toLowerCase()}`) ||
        (conferenceService.obtenerSesionActiva()?.id === conferencia.id.toLowerCase() ? conferenceService.obtenerSesionActiva()?.pin_admin : '');
      if (savedAdminPin) {
        setAdminPinInput(savedAdminPin);
        setConfPinAdminActual(savedAdminPin);
        setIsAdminAuthenticated(true);
      }
    }
  }, [activeMainTab, conferencia?.id, isAdminAuthenticated]);

  // Polling optimizado de Resumen y Avisos desde Base de Datos (en paralelo, con deduplicación y detección de pestaña activa)
  const isFetchingRef = useRef(false);
  const fetchResumen = useCallback(async () => {
    if (!conferencia?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [resResult, avisosResult, checklistResult] = await Promise.allSettled([
        conferenceService.obtenerResumen(conferencia.id),
        conferenceService.obtenerAvisos(conferencia.id),
        conferenceService.obtenerChecklist(conferencia.id)
      ]);

      if (resResult.status === 'fulfilled' && resResult.value) {
        const res = resResult.value;
        if (Array.isArray(res.comites)) {
          setResumenData(res.comites);

          setComites(prevComites => {
            const map = new Map();
            try {
              const localSaved = localStorage.getItem(`openmun_conf_comites_${conferencia.id}`);
              if (localSaved) {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed)) {
                  parsed.forEach(lc => {
                    if (lc && lc.id) map.set(lc.id, lc);
                  });
                }
              }
            } catch (e) { }

            res.comites.forEach(rc => {
              if (rc && rc.id) {
                const prev = map.get(rc.id) || {};
                map.set(rc.id, {
                  ...prev,
                  ...rc,
                  id: rc.id,
                  nombre: rc.nombre || prev.nombre || rc.id,
                  pin_mesa: rc.pin_mesa !== undefined ? rc.pin_mesa : prev.pin_mesa,
                  requierePinMesa: rc.requierePinMesa !== undefined ? rc.requierePinMesa : (rc.pin_mesa ? true : prev.requierePinMesa),
                  datos_json: rc.datos_json || prev.datos_json || {}
                });
              }
            });
            const serverIds = new Set(res.comites.map(c => c.id));
            const list = Array.from(map.values()).filter(c => serverIds.has(c.id));
            try {
              localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(list));
            } catch (e) { }
            return list;
          });
        }
        if (res.email_admin !== undefined && res.email_admin !== null) {
          setConferencia(prev => prev ? { ...prev, email_admin: res.email_admin } : prev);
          setConfEmailAdminInput(prev => prev || res.email_admin || '');
        }
      }

      if (avisosResult.status === 'fulfilled' && avisosResult.value && Array.isArray(avisosResult.value.avisos)) {
        setAvisosActivos(avisosResult.value.avisos);
      }

      if (checklistResult.status === 'fulfilled' && checklistResult.value && Array.isArray(checklistResult.value.checklist)) {
        setChecklistStaff(checklistResult.value.checklist);
      }
    } catch (err) {
      console.warn('Error al actualizar datos de conferencia:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [conferencia?.id]);

  const fetchAvisos = fetchResumen;

  useEffect(() => {
    if (!conferencia?.id) return;

    // Fetch inicial
    fetchResumen();

    // Solo consultar activamente cuando la ventana / pestaña esté visible
    let interval = null;
    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchResumen();
          }
        }, 20000);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchResumen();
      }
    };

    const handleNuevoAviso = (e) => {
      if (e.detail) {
        setAvisosActivos(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
      }
    };

    const handleAvisoDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisosActivos(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('openmun_nuevo_aviso', handleNuevoAviso);
      window.addEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
    }
    startPolling();

    return () => {
      if (interval) clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('openmun_nuevo_aviso', handleNuevoAviso);
        window.removeEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
      }
    };
  }, [conferencia?.id, fetchResumen]);

  // Handlers para Checklist de Staff (Indexada)
  const handleCrearTareaChecklist = async (e) => {
    if (e) e.preventDefault();
    if (!nuevaTareaStaff.trim()) return;
    const titulo = nuevaTareaStaff.trim();
    const asignado_a = nuevaTareaAsignado.trim() || null;
    const comite_id = nuevaTareaComiteId && nuevaTareaComiteId !== 'GLOBAL' ? nuevaTareaComiteId : null;

    const tempId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempItem = {
      id: tempId,
      conferencia_id: conferencia?.id,
      comite_id,
      titulo,
      completado: 0,
      asignado_a,
      creado_en: new Date().toISOString()
    };

    setChecklistStaff(prev => [tempItem, ...(prev || [])]);
    setNuevaTareaStaff('');

    if (conferencia?.id) {
      try {
        const res = await conferenceService.crearTareaChecklist(conferencia.id, {
          comite_id,
          titulo,
          asignado_a
        });
        if (res?.id) {
          setChecklistStaff(prev => (prev || []).map(item => item.id === tempId ? { ...item, id: res.id } : item));
        }
      } catch (err) {
        console.warn('Error al guardar tarea de checklist en servidor:', err);
      }
    }
  };

  const handleToggleTareaChecklist = async (task) => {
    const nuevoCompletado = !Boolean(task.completado || task.done);
    setChecklistStaff(prev =>
      (prev || []).map(i => i.id === task.id ? { ...i, completado: nuevoCompletado ? 1 : 0, done: nuevoCompletado } : i)
    );

    try {
      await conferenceService.toggleTareaChecklist(task.id, nuevoCompletado);
    } catch (err) {
      console.warn('Error al alternar tarea en servidor:', err);
    }
  };

  const handleEliminarTareaChecklist = async (tareaId) => {
    setChecklistStaff(prev => (prev || []).filter(i => i.id !== tareaId));

    try {
      await conferenceService.eliminarTareaChecklist(tareaId);
    } catch (err) {
      console.warn('Error al eliminar tarea de checklist en servidor:', err);
    }
  };

  const handleEliminarTareasCompletadas = async () => {
    const comiteFiltro = filtroComiteChecklist !== 'TODOS' ? filtroComiteChecklist : null;
    const msg = comiteFiltro === 'GLOBAL'
      ? '¿Deseas eliminar definitivamente todas las tareas completadas Globales (Sede)?'
      : comiteFiltro
      ? '¿Deseas eliminar definitivamente todas las tareas completadas de este comité?'
      : '¿Deseas eliminar definitivamente todas las tareas completadas de la conferencia?';
    if (!window.confirm(msg)) return;

    setChecklistStaff(prev => (prev || []).filter(i => {
      const isDone = Boolean(i.completado || i.done);
      if (!isDone) return true;
      if (comiteFiltro === 'GLOBAL') return Boolean(i.comite_id && i.comite_id !== 'GLOBAL');
      if (comiteFiltro) return i.comite_id !== comiteFiltro;
      return false;
    }));

    if (conferencia?.id) {
      try {
        await conferenceService.eliminarTareasCompletadas(conferencia.id, comiteFiltro);
      } catch (err) {
        console.warn('Error al purgar tareas completadas en servidor:', err);
      }
    }
  };

  const checklistFiltrada = useMemo(() => {
    let items = (checklistStaff || []).map(task => ({
      ...task,
      titulo: task.titulo || task.text || '',
      completado: Boolean(task.completado !== undefined ? task.completado : task.done)
    }));

    if (filtroComiteChecklist === 'GLOBAL') {
      items = items.filter(task => !task.comite_id || task.comite_id === 'GLOBAL');
    } else if (filtroComiteChecklist && filtroComiteChecklist !== 'TODOS') {
      items = items.filter(task => task.comite_id === filtroComiteChecklist);
    }

    // Ordenar: completado ASC, creado_en DESC
    return items.sort((a, b) => {
      if (a.completado !== b.completado) {
        return a.completado ? 1 : -1;
      }
      const timeA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
      const timeB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
      return timeB - timeA;
    });
  }, [checklistStaff, filtroComiteChecklist]);

  // Exportar Archivo JSON Completo con las 4 tablas de la base de datos
  const handleExportarConferenciaJSON = () => {
    if (!conferencia?.id) return;
    try {
      const confData = {
        id: conferencia.id,
        nombre: conferencia.nombre,
        requierePin: Boolean(conferencia.requierePin),
        email_admin: conferencia.email_admin || null
      };

      const comitesData = (comites || []).map(c => {
        let comiteState = c.datos_json;
        if (!comiteState || Object.keys(comiteState).length === 0) {
          try {
            const local = localStorage.getItem(`openmun_comite_data_${c.id}`);
            if (local) comiteState = JSON.parse(local);
          } catch (e) { }
        }
        return {
          id: c.id,
          nombre: c.nombre,
          pin_mesa: c.pin_mesa || null,
          tipo_sesion: c.tipo_sesion || 'formal',
          topico_actual: c.topico_actual || '',
          datos_json: comiteState || {}
        };
      });

      const avisosData = avisosActivos || [];
      const checklistData = checklistStaff || [];

      const fullBackup = {
        version: '2.0',
        tipo: 'openmun_conferencia_completa',
        generado_en: new Date().toISOString(),
        tablas: {
          conferencias: confData,
          comites: comitesData,
          avisos: avisosData,
          checklist: checklistData
        }
      };

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `openmun_${conferencia.id}_completo_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar JSON completo de la conferencia: ' + err.message);
    }
  };

  // Escuchar petición global de exportación para la conferencia (ej. desde el toast de desconexión)
  useEffect(() => {
    const handleExportRequest = () => {
      handleExportarConferenciaJSON();
    };
    window.addEventListener('openmun_export_conference_request', handleExportRequest);
    return () => {
      window.removeEventListener('openmun_export_conference_request', handleExportRequest);
    };
  });

  // Procesar archivo JSON de conferencia o comité individual (vía selector de archivo o Drag & Drop)
  const procesarArchivoConferenciaJSON = async (file, forceSingleComiteMode = false) => {
    if (!file) return;
    if (file.name && !file.name.toLowerCase().endsWith('.json') && file.type && !file.type.includes('json')) {
      setConfSettingsFeedback({
        type: 'error',
        text: 'Por favor, selecciona o arrastra un archivo en formato .JSON válido.'
      });
      return;
    }

    setImportandoJSON(true);
    setConfSettingsFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result;
        if (!raw) throw new Error('El archivo está vacío.');
        const parsed = JSON.parse(raw);

        // Identificar si es un backup de un solo comité / sesión activa (tipo 'openmun_full_backup' o contiene paises/agendaSesion/datos_json)
        const isSingleComiteSession = forceSingleComiteMode || (!parsed.tablas && !parsed.conferencias && !parsed.conferencia && (
          parsed.tipo === 'openmun_full_backup' ||
          Boolean(parsed.paises && Array.isArray(parsed.paises)) ||
          Boolean(parsed.agendaSesion) ||
          Boolean(parsed.oradoresCola) ||
          Boolean(parsed.comision && !parsed.comites) ||
          Boolean(parsed.nombreComite && !parsed.comites) ||
          Boolean(parsed.datos_json && !parsed.comites)
        ));

        if (isSingleComiteSession) {
          // ── MODO IMPORTAR UN COMITÉ INDIVIDUAL (DESDE sesion_activa.json O CONTROL DE COMITÉ) ──
          const cleanNom = (parsed.comision || parsed.nombreComite || parsed.nombre || parsed.datos_json?.comision || parsed.datos_json?.nombreComite || file.name?.replace(/\.json$/i, '').replace(/^sesion_/i, '').replace(/_/g, ' ') || 'Comité Importado').trim();
          const customId = parsed.id ? String(parsed.id).toLowerCase().trim() : `${conferencia.id.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

          const comiteState = normalizarDatosComite(parsed, cleanNom);
          if (!comiteState) throw new Error('No se pudieron extraer datos válidos del comité.');

          let idFinal = customId;
          try {
            const res = await conferenceService.crearOActualizarComite(conferencia.id, {
              id: customId,
              nombre: cleanNom,
              pin_mesa: parsed.pin_mesa || comiteState.pin_mesa || null,
              datos_json: comiteState
            });
            if (res?.comiteId) idFinal = res.comiteId;
          } catch (e) {
            console.warn('Sincronización en servidor omitida o fallida:', e);
          }

          try {
            localStorage.setItem(`openmun_comite_data_${idFinal}`, JSON.stringify(comiteState));
            if (parsed.id && parsed.id !== idFinal) {
              localStorage.setItem(`openmun_comite_data_${parsed.id}`, JSON.stringify(comiteState));
            }
          } catch (e) { }

          const nuevoComiteObj = {
            id: idFinal,
            nombre: cleanNom,
            pin_mesa: parsed.pin_mesa || comiteState.pin_mesa || null,
            requierePinMesa: Boolean(parsed.pin_mesa || comiteState.pin_mesa),
            datos_json: comiteState,
            tipo_sesion: comiteState.tipoSesion || 'formal',
            topico_actual: comiteState.agendaSesion?.temaActual || ''
          };

          setComites(prev => {
            const map = new Map((prev || []).map(item => [item.id, item]));
            map.set(idFinal, nuevoComiteObj);
            const list = Array.from(map.values());
            try {
              localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(list));
            } catch (e) { }
            return list;
          });

          setResumenData(prev => {
            const map = new Map((prev || []).map(item => [item.id, item]));
            map.set(idFinal, nuevoComiteObj);
            return Array.from(map.values());
          });

          conferenceService.invalidarCache?.(conferencia.id);
          fetchResumen();

          setConfSettingsFeedback({
            type: 'success',
            text: `¡Comité "${cleanNom}" añadido con éxito! (${comiteState.paises.length} delegaciones, agenda y módulos cargados)`
          });
          return;
        }

        // ── MODO IMPORTAR CONFERENCIA COMPLETA (3 TABLAS BD) ──
        const tablas = parsed.tablas || parsed;
        const confData = tablas.conferencias || tablas.conferencia || parsed.conferencia || (parsed.id && parsed.nombre ? parsed : null);

        let rawComites = tablas.comites || parsed.comites || tablas.comite || parsed.comite;
        if (!rawComites && Array.isArray(parsed)) {
          rawComites = parsed;
        } else if (rawComites && typeof rawComites === 'object' && !Array.isArray(rawComites)) {
          rawComites = Object.values(rawComites);
        }

        const avisosData = tablas.avisos || parsed.avisos;

        if (!confData && !rawComites && !avisosData) {
          throw new Error('El archivo no contiene un formato de conferencia o comité válido de OpenMUN.');
        }

        // 1. Restaurar Comités (Se importan únicamente los comités en la conferencia actual, preservando los datos de la conferencia actual)
        let countComites = 0;
        const comitesRestaurados = [];
        if (Array.isArray(rawComites)) {
          for (const c of rawComites) {
            const nombreComite = (c.nombre || c.comision || c.nombreComite || c.name || '').trim();
            if (!nombreComite && !c.id) continue;

            const cleanNom = nombreComite || c.id;
            const comiteId = c.id ? String(c.id).toLowerCase().trim() : `${conferencia.id.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

            const datosComite = normalizarDatosComite(c.datos_json || c.datos || c.state || c, cleanNom) || {
              comision: cleanNom,
              nombreComite: cleanNom,
              paises: [],
              agendaSesion: {},
              tipoSesion: c.tipo_sesion || c.tipoSesion || 'formal'
            };

            let idFinal = comiteId;
            try {
              const resComite = await conferenceService.crearOActualizarComite(conferencia.id, {
                id: comiteId,
                nombre: cleanNom,
                pin_mesa: c.pin_mesa || datosComite.pin_mesa || null,
                datos_json: datosComite
              });
              if (resComite?.comiteId) idFinal = resComite.comiteId;
            } catch (errC) {
              console.warn('Error al guardar comité en backend:', cleanNom, errC);
            }

            try {
              localStorage.setItem(`openmun_comite_data_${idFinal}`, JSON.stringify(datosComite));
              if (c.id && c.id !== idFinal) {
                localStorage.setItem(`openmun_comite_data_${c.id}`, JSON.stringify(datosComite));
              }
            } catch (e) { }

            comitesRestaurados.push({
              id: idFinal,
              nombre: cleanNom,
              pin_mesa: c.pin_mesa || datosComite.pin_mesa || null,
              requierePinMesa: Boolean(c.pin_mesa || datosComite.pin_mesa),
              tipo_sesion: c.tipo_sesion || c.tipoSesion || datosComite?.tipoSesion || 'formal',
              topico_actual: c.topico_actual || datosComite?.agendaSesion?.temaActual || '',
              datos_json: datosComite
            });
            countComites++;
          }
        }

        // 3. Restaurar Avisos
        let countAvisos = 0;
        if (Array.isArray(avisosData)) {
          for (const av of avisosData) {
            if (!av.mensaje) continue;
            try {
              await conferenceService.crearAviso(conferencia.id, {
                comite_id: av.comite_id || null,
                emisor: av.emisor || 'organizacion',
                tipo: av.tipo || 'info',
                mensaje: av.mensaje
              });
              countAvisos++;
            } catch (errAv) {
              console.warn('Error al restaurar aviso:', errAv);
            }
          }
        }

        // 4. Restaurar Checklist
        const checklistData = tablas.checklist || parsed.checklist;
        let countChecklist = 0;
        if (Array.isArray(checklistData)) {
          for (const item of checklistData) {
            const titulo = item.titulo || item.text;
            if (!titulo) continue;
            try {
              await conferenceService.crearTareaChecklist(conferencia.id, {
                comite_id: item.comite_id || null,
                titulo: titulo,
                asignado_a: item.asignado_a || null
              });
              countChecklist++;
            } catch (errChk) {
              console.warn('Error al restaurar tarea de checklist:', errChk);
            }
          }
        }

        // 5. Actualizar Estado de Comités en React inmediatamente y persistir
        if (comitesRestaurados.length > 0) {
          setComites(prev => {
            const map = new Map((prev || []).map(item => [item.id, item]));
            comitesRestaurados.forEach(nc => map.set(nc.id, { ...(map.get(nc.id) || {}), ...nc }));
            const list = Array.from(map.values());
            try {
              localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(list));
            } catch (e) { }
            return list;
          });
          setResumenData(prev => {
            const map = new Map((prev || []).map(item => [item.id, item]));
            comitesRestaurados.forEach(nc => map.set(nc.id, { ...(map.get(nc.id) || {}), ...nc }));
            return Array.from(map.values());
          });
        }

        // Invalidar caché y forzar refresco
        conferenceService.invalidarCache?.(conferencia.id);
        await fetchResumen();

        setConfSettingsFeedback({
          type: 'success',
          text: `¡Importación completada! Se restauraron ${countComites} comités, ${countAvisos} avisos y ${countChecklist} tareas de checklist en la base de datos.`
        });
      } catch (err) {
        setConfSettingsFeedback({
          type: 'error',
          text: 'Error al procesar el archivo JSON: ' + err.message
        });
      } finally {
        setImportandoJSON(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (singleComiteFileInputRef.current) singleComiteFileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setConfSettingsFeedback({
        type: 'error',
        text: 'Error al leer el archivo desde el dispositivo.'
      });
      setImportandoJSON(false);
    };

    reader.readAsText(file);
  };

  // Importar Archivo JSON vía selector de archivo
  const handleImportarConferenciaJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await procesarArchivoConferenciaJSON(file);
  };

  // Manejadores de Drag & Drop para importar JSON arrastrando a la conferencia
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Si estamos editando un comité o hay modal activo, NO interferir con el drag de widgets
    if (comiteEnEdicion || comiteSeleccionado) return;

    const hasFiles = Array.from(e.dataTransfer?.types || []).some(t => t === 'Files');
    if (!hasFiles) return;

    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (comiteEnEdicion || comiteSeleccionado) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
      return;
    }
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    if (comiteEnEdicion || comiteSeleccionado) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      await procesarArchivoConferenciaJSON(file);
    }
  };

  // Helper para resolver el nombre legible del destinatario del aviso
  const getNombreDestino = (comiteId) => {
    return obtenerEtiquetaDestino(comiteId, listaComitesConsolidada || comites || []).label;
  };

  // Manejar Login Admin de Organización
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (!adminPinInput.trim() || !conferencia?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await conferenceService.verificarAdmin(conferencia.id, adminPinInput.trim());
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem(`openmun_conf_admin_pin_${conferencia.id.toLowerCase()}`, adminPinInput.trim());
      } catch (err) {}
      fetchResumen();
    } catch (err) {
      setErrorMsg(err.message || 'PIN de Organización incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  // Guardar / Actualizar Configuración Integral de la Conferencia en Base de Datos (PATCH /api/conferencias/:id)
  const handleGuardarConfiguracionConferencia = async (e) => {
    e.preventDefault();
    if (!conferencia?.id) return;

    const pinActual = confPinAdminActual.trim() || adminPinInput.trim();
    if (!pinActual) {
      setConfSettingsFeedback({
        type: 'error',
        text: 'Debes introducir el PIN de Secretaría actual para autorizar los cambios.'
      });
      return;
    }

    setGuardandoConfSettings(true);
    setConfSettingsFeedback(null);

    try {
      const payload = {
        pin_admin_actual: pinActual
      };

      if (confNombreInput.trim() && confNombreInput.trim() !== conferencia.nombre) {
        payload.nombre = confNombreInput.trim();
      }

      const emailVal = confEmailAdminInput.trim();
      if (emailVal !== (conferencia.email_admin || '')) {
        payload.email_admin = emailVal || null;
      }

      if (cambiarPinAcceso) {
        if (confPinAccesoInput.trim()) {
          payload.pin_acceso = confPinAccesoInput.trim();
        }
      } else if (conferencia.requierePin) {
        payload.pin_acceso = null;
      }

      if (confNuevoPinAdmin.trim()) {
        payload.nuevo_pin_admin = confNuevoPinAdmin.trim();
      }

      const res = await conferenceService.actualizarConferencia(conferencia.id, payload);

      const nuevoNombre = payload.nombre || conferencia.nombre;
      const nuevoEmail = payload.email_admin !== undefined ? payload.email_admin : conferencia.email_admin;
      const nuevoRequierePin = payload.pin_acceso !== undefined ? Boolean(payload.pin_acceso) : conferencia.requierePin;

      setConferencia(prev => prev ? {
        ...prev,
        nombre: nuevoNombre,
        email_admin: nuevoEmail,
        requierePin: nuevoRequierePin
      } : prev);

      if (payload.nuevo_pin_admin) {
        setAdminPinInput(payload.nuevo_pin_admin);
        setConfPinAdminActual(payload.nuevo_pin_admin);
        setConfNuevoPinAdmin('');
      }

      setConfSettingsFeedback({
        type: 'success',
        text: res?.mensaje || '¡Conferencia actualizada correctamente en la base de datos!'
      });

      setTimeout(() => setConfSettingsFeedback(null), 5000);
      fetchResumen();
    } catch (err) {
      let mensajeError = err.message || 'Error al actualizar la conferencia.';
      if (err.status === 400) {
        mensajeError = 'Falta el PIN de Secretaría actual para autorizar la operación (Error 400).';
      } else if (err.status === 401) {
        mensajeError = 'El PIN de Secretaría actual no coincide con el registrado (Error 401).';
      } else if (err.status === 404) {
        mensajeError = 'Conferencia no encontrada en el servidor (Error 404).';
      }
      setConfSettingsFeedback({
        type: 'error',
        text: mensajeError
      });
    } finally {
      setGuardandoConfSettings(false);
    }
  };

  // Crear nuevo comité desde Secretaría (con estado independiente y aislado)
  const handleCrearComite = async (e) => {
    e.preventDefault();
    if (!nuevoNombreComite.trim() || !conferencia?.id) return;
    setCreandoComite(true);
    try {
      const cleanNom = nuevoNombreComite.trim();
      const customId = `${conferencia.id.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

      const initialComiteState = {
        comision: cleanNom,
        nombreComite: cleanNom,
        paises: [],
        agendaSesion: {},
        oradoresCola: [],
        oradoresCaucus: [],
        mociones: [],
        tipoSesion: 'formal'
      };

      // Guardar localmente indexado por ID
      try {
        localStorage.setItem(`openmun_comite_data_${customId}`, JSON.stringify(initialComiteState));
      } catch (e) { }

      // Guardar en la Base de Datos
      const res = await conferenceService.crearOActualizarComite(conferencia.id, {
        id: customId,
        nombre: cleanNom,
        pin_mesa: nuevoPinMesa.trim() || null,
        datos_json: initialComiteState
      });

      const nuevoComiteObj = {
        id: res?.comiteId || customId,
        nombre: cleanNom,
        pin_mesa: nuevoPinMesa.trim() || null,
        requierePinMesa: Boolean(nuevoPinMesa.trim()),
        datos_json: initialComiteState,
        tipo_sesion: 'formal'
      };

      setComites(prev => {
        const updated = [...prev, nuevoComiteObj];
        try {
          localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
      setNuevoNombreComite('');
      setNuevoPinMesa('');
      fetchResumen();
    } catch (err) {
      alert('Error al crear comité: ' + err.message);
    } finally {
      setCreandoComite(false);
    }
  };

  // Emitir aviso desde Secretaría por Base de Datos
  const handleEmitirAviso = async (e) => {
    e.preventDefault();
    if (!avisoMensaje.trim() || !conferencia?.id) return;
    setEnviandoAviso(true);
    setAvisoFeedback(null);
    try {
      let targetComite = null;
      if (avisoDestino === 'STAFF' || avisoDestino === 'STAFF_ALL') {
        targetComite = 'STAFF_ALL';
      } else if (avisoDestino === 'CHAIRS_ALL') {
        targetComite = 'CHAIRS_ALL';
      } else if (avisoDestino && avisoDestino !== '' && avisoDestino !== 'GLOBAL') {
        targetComite = avisoDestino;
      }

      const emisorFinal = avisoEmisor === 'organizacion' ? 'Organización / Secretaría' :
        avisoEmisor === 'staff' ? 'Staff General' :
        avisoEmisor === 'mesa' ? 'Mesa Directiva' :
        avisoEmisor || 'Secretaría General';

      const res = await conferenceService.crearAviso(conferencia.id, {
        comite_id: targetComite,
        emisor: emisorFinal,
        tipo: avisoTipo,
        mensaje: avisoMensaje.trim()
      });
      if (res) {
        setAvisoMensaje('');
        setAvisoFeedback('¡Aviso guardado en base de datos y emitido con éxito!');
        fetchResumen();
        setTimeout(() => setAvisoFeedback(null), 3000);
      }
    } catch (err) {
      alert('Error al emitir aviso: ' + err.message);
    } finally {
      setEnviandoAviso(false);
    }
  };

  // Emitir mensaje / aviso desde Staff por Base de Datos
  const handleEnviarMensajeStaff = async (e) => {
    e.preventDefault();
    if (!staffMensaje.trim() || !conferencia?.id) return;
    setEnviandoMensajeStaff(true);
    setStaffFeedback(null);
    try {
      let targetComite = null;

      if (staffDestino === 'SECRETARIA' || staffDestino === 'ORGANIZACION') {
        targetComite = 'SECRETARIA';
      } else if (staffDestino === 'STAFF_ALL') {
        targetComite = 'STAFF_ALL';
      } else if (staffDestino === 'CHAIRS_ALL') {
        targetComite = 'CHAIRS_ALL';
      } else if (staffDestino === 'GLOBAL' || !staffDestino) {
        targetComite = null;
      } else {
        targetComite = staffDestino; // e.g. 'STAFF_COMITE_<id>', 'CHAIR_<id>', '<id>'
      }

      const res = await conferenceService.crearAviso(conferencia.id, {
        comite_id: targetComite,
        emisor: 'Staff General',
        tipo: staffPrioridad,
        mensaje: staffMensaje.trim()
      });

      if (res) {
        setStaffMensaje('');
        setStaffFeedback('¡Mensaje enviado a la base de datos central exitosamente!');
        fetchResumen();
        setTimeout(() => setStaffFeedback(null), 3000);
      }
    } catch (err) {
      alert('Error al enviar mensaje: ' + err.message);
    } finally {
      setEnviandoMensajeStaff(false);
    }
  };

  // Desactivar aviso en Base de Datos
  const handleDesactivarAviso = async (avisoId) => {
    try {
      await conferenceService.desactivarAviso(avisoId);
      setAvisosActivos(prev => prev.filter(a => a.id !== avisoId));
    } catch (err) {
      alert('Error al desactivar aviso: ' + err.message);
    }
  };

  // Eliminar comité
  const handleEliminarComite = async (comiteId) => {
    if (!comiteId) return;
    if (!window.confirm('¿Seguro que deseas eliminar este comité de la conferencia? Esta acción no se puede deshacer.')) return;
    try {
      await conferenceService.eliminarComite(comiteId, conferencia?.id);
      
      // Limpiar datos locales específicos del comité
      try {
        localStorage.removeItem(`openmun_comite_data_${comiteId}`);
      } catch (e) {}

      // Actualizar localStorage de comités de la conferencia
      if (conferencia?.id) {
        try {
          const localSaved = localStorage.getItem(`openmun_conf_comites_${conferencia.id}`);
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              const filtrados = parsed.filter(c => c.id !== comiteId);
              localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(filtrados));
            }
          }
        } catch (e) {}
      }

      setComites(prev => prev.filter(c => c.id !== comiteId));
      setResumenData(prev => prev.filter(c => c.id !== comiteId));

      if (comiteEnEdicion?.id === comiteId) {
        setComiteEnEdicion(null);
      }

      conferenceService.invalidarCache?.(conferencia?.id);
      await fetchResumen();
    } catch (err) {
      alert('Error al eliminar comité: ' + err.message);
    }
  };

  // Sincronizar nombre de comité en edición si cambia desde el widget EstablecerAgenda
  useEffect(() => {
    if (comiteEnEdicion && nombreComite && nombreComite.trim() && nombreComite.trim() !== comiteEnEdicion.nombre) {
      setComiteEnEdicion(prev => prev ? { ...prev, nombre: nombreComite.trim() } : null);
    }
  }, [nombreComite, comiteEnEdicion]);

  // Abrir editor integral de Secretaría para un comité (aislado e independiente)
  const handleAbrirEditorComite = async (comite) => {
    // Asegurar que ninguna mesa activa sincronice datos en segundo plano mientras estamos en Secretaría
    localStorage.removeItem('openmun_mesa_activa');

    setComiteEnEdicion(comite);
    setSecretariaWidgetTab('AGENDA');
    setGuardadoFeedback(null);
    setComiteEditorPinMesa(comite.pin_mesa || '');
    setComiteEditorTipoSesion(comite.tipo_sesion || 'formal');

    // Cargar datos aislados estrictos de este comité
    let datos = comite.datos_json;
    if (typeof datos === 'string') {
      try { datos = JSON.parse(datos); } catch (e) { datos = null; }
    }
    
    // Si no tiene datos completos o están vacíos, pedir directamente al servidor remoto
    if (!datos || Object.keys(datos).length === 0 || (!datos.paises && !datos.agendaSesion)) {
      try {
        const remoto = await conferenceService.obtenerComite(comite.id);
        if (remoto?.datos_json) {
          let parsedRemoto = remoto.datos_json;
          if (typeof parsedRemoto === 'string') {
            try { parsedRemoto = JSON.parse(parsedRemoto); } catch (e) {}
          }
          if (parsedRemoto && Object.keys(parsedRemoto).length > 0) {
            datos = parsedRemoto;
          }
        }
      } catch (e) {
        console.warn('Error al obtener comité remoto para edición:', e);
      }
    }

    if (!datos || Object.keys(datos).length === 0) {
      try {
        const localSaved = localStorage.getItem(`openmun_comite_data_${comite.id}`);
        if (localSaved) datos = JSON.parse(localSaved);
      } catch (e) { }
    }

    establecerEstadoComiteCompleto(datos || {
      comision: comite.nombre,
      nombreComite: comite.nombre,
      paises: [],
      agendaSesion: {},
      oradoresCola: [],
      mociones: [],
      tipoSesion: comite.tipo_sesion || 'formal'
    }, comite.nombre);
  };

  // Guardar cambios del comité en Base de Datos
  const handleGuardarCambiosComite = async () => {
    if (!comiteEnEdicion || !conferencia?.id) return;
    setGuardandoComite(true);
    setGuardadoFeedback(null);
    try {
      const nombreActualizado = (nombreComite || comiteEnEdicion.nombre || '').trim();
      const pinMesaActualizado = comiteEditorPinMesa.trim() || null;
      const tipoSesionActualizado = comiteEditorTipoSesion || tipoSesion || 'formal';

      let prevDatos = comiteEnEdicion.datos_json;
      if (typeof prevDatos === 'string') {
        try { prevDatos = JSON.parse(prevDatos); } catch { prevDatos = {}; }
      }
      if (!prevDatos || typeof prevDatos !== 'object') prevDatos = {};

      const estadoActual = {
        ...prevDatos,
        comision: nombreActualizado,
        nombreComite: nombreActualizado,
        paises: Array.isArray(paises) ? paises : (prevDatos.paises || []),
        agendaSesion: agendaSesion || prevDatos.agendaSesion || {},
        oradoresCola: Array.isArray(oradoresCola) ? oradoresCola : (prevDatos.oradoresCola || []),
        oradoresCaucus: Array.isArray(oradoresCaucus) ? oradoresCaucus : (prevDatos.oradoresCaucus || []),
        registroIntervenciones: Array.isArray(registroIntervenciones) && registroIntervenciones.length > 0 ? registroIntervenciones : (prevDatos.registroIntervenciones || []),
        mociones: Array.isArray(mociones) ? mociones : (prevDatos.mociones || []),
        historicoMociones: Array.isArray(historicoMociones) && historicoMociones.length > 0 ? historicoMociones : (prevDatos.historicoMociones || []),
        caucusActivo: caucusActivo !== undefined && caucusActivo !== null ? caucusActivo : (prevDatos.caucusActivo || null),
        votacionSesion: votacionSesion !== undefined && votacionSesion !== null ? votacionSesion : (prevDatos.votacionSesion || null),
        enmiendasSesion: enmiendasSesion !== undefined && enmiendasSesion !== null ? enmiendasSesion : (prevDatos.enmiendasSesion || null),
        proyectoResolucion: enmiendasSesion !== undefined && enmiendasSesion !== null ? enmiendasSesion : (prevDatos.proyectoResolucion || null),
        eventosCrisis: prevDatos.eventosCrisis || [],
        relojCrisis: prevDatos.relojCrisis || null,
        notes: prevDatos.notes || [],
        roomSettings: prevDatos.roomSettings || null,
        config: prevDatos.config || null,
        tipoSesion: tipoSesionActualizado,
        pin_mesa: pinMesaActualizado
      };

      // Guardar también localmente para este comité
      try {
        localStorage.setItem(`openmun_comite_data_${comiteEnEdicion.id}`, JSON.stringify(estadoActual));
        if (pinMesaActualizado) {
          localStorage.setItem(`openmun_comite_pin_${comiteEnEdicion.id}`, pinMesaActualizado);
        } else {
          localStorage.removeItem(`openmun_comite_pin_${comiteEnEdicion.id}`);
        }
      } catch (e) { }

      await conferenceService.crearOActualizarComite(conferencia.id, {
        id: comiteEnEdicion.id,
        nombre: nombreActualizado,
        pin_mesa: pinMesaActualizado,
        datos_json: estadoActual
      });

      // Actualizar en el estado local de comites y persistir
      setComites(prev => {
        const updated = prev.map(c => c.id === comiteEnEdicion.id ? {
          ...c,
          nombre: nombreActualizado,
          pin_mesa: pinMesaActualizado,
          requierePinMesa: Boolean(pinMesaActualizado),
          tipo_sesion: tipoSesionActualizado,
          datos_json: estadoActual
        } : c);
        try {
          localStorage.setItem(`openmun_conf_comites_${conferencia.id}`, JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });

      setResumenData(prev => prev.map(r => r.id === comiteEnEdicion.id ? {
        ...r,
        nombre: nombreActualizado,
        pin_mesa: pinMesaActualizado,
        requierePinMesa: Boolean(pinMesaActualizado),
        tipo_sesion: tipoSesionActualizado,
        datos_json: estadoActual
      } : r));

      setComiteEnEdicion(prev => prev ? {
        ...prev,
        nombre: nombreActualizado,
        pin_mesa: pinMesaActualizado,
        requierePinMesa: Boolean(pinMesaActualizado),
        tipo_sesion: tipoSesionActualizado,
        datos_json: estadoActual
      } : null);

      conferenceService.invalidarCache?.(conferencia.id);

      setGuardadoFeedback('¡Datos del comité guardados exitosamente en el servidor central!');
      setTimeout(() => setGuardadoFeedback(null), 3000);
      fetchResumen();
    } catch (err) {
      alert('Error al guardar datos del comité: ' + err.message);
    } finally {
      setGuardandoComite(false);
    }
  };

  // Cerrar modal de comité guardando también los cambios / archivo
  const handleCerrarEditorComite = async () => {
    if (comiteEnEdicion && conferencia?.id) {
      try {
        await handleGuardarCambiosComite();
      } catch (err) {
        console.warn('Error al autoguardar al cerrar editor:', err);
      }
    }
    setComiteEnEdicion(null);
  };

  // Entrar a Comité como Mesa Directiva (Chair) - Carga JSON aislado y entra
  const handleEntrarComoMesa = async (comite) => {
    if (comite.requierePinMesa) {
      const savedPin = localStorage.getItem(`openmun_comite_pin_${comite.id}`);
      if (savedPin && (!comite.pin_mesa || savedPin === comite.pin_mesa)) {
        await ejecutarEntradaMesa(comite, savedPin);
        return;
      }
      setComiteSeleccionado(comite);
      setPinMesaInput(savedPin || '');
      setPinMesaError(null);
      return;
    }
    await ejecutarEntradaMesa(comite);
  };

  const ejecutarEntradaMesa = async (comite, pin = '') => {
    setLoading(true);
    try {
      if (comite.requierePinMesa) {
        if (!pin || !pin.trim()) {
          throw new Error('Debes introducir el PIN de la mesa directiva para acceder a este comité.');
        }
        await conferenceService.verificarPinMesa(comite.id, pin, comite.pin_mesa);
        try {
          localStorage.setItem(`openmun_comite_pin_${comite.id}`, pin.trim());
        } catch (e) {}
      }

      localStorage.setItem('openmun_current_comite_id', comite.id);
      localStorage.setItem('openmun_current_conf_id', conferencia.id);
      localStorage.setItem('openmun_mesa_activa', 'true');
      localStorage.setItem('openmun_user_role', 'chair');

      // Cargar JSON aislado del comité
      let datosComite = comite.datos_json;
      if (typeof datosComite === 'string') {
        try {
          datosComite = JSON.parse(datosComite);
        } catch (e) {
          datosComite = null;
        }
      }
      if (!datosComite || Object.keys(datosComite).length === 0 || (!datosComite.paises && !datosComite.agendaSesion)) {
        try {
          const remoto = await conferenceService.obtenerComite(comite.id);
          if (remoto?.datos_json) {
            let parsedRemoto = remoto.datos_json;
            if (typeof parsedRemoto === 'string') {
              try { parsedRemoto = JSON.parse(parsedRemoto); } catch (e) {}
            }
            if (parsedRemoto && Object.keys(parsedRemoto).length > 0) {
              datosComite = parsedRemoto;
            }
          }
        } catch (e) { }
      }
      if (!datosComite || Object.keys(datosComite).length === 0) {
        try {
          const localSaved = localStorage.getItem(`openmun_comite_data_${comite.id}`);
          if (localSaved) datosComite = JSON.parse(localSaved);
        } catch (e) { }
      }

      establecerEstadoComiteCompleto(datosComite || {
        comision: comite.nombre,
        nombreComite: comite.nombre,
        paises: [],
        agendaSesion: {},
        tipoSesion: comite.tipo_sesion || 'formal'
      }, comite.nombre);

      if (comite.tipo_sesion) {
        cambiarTipoSesion(comite.tipo_sesion, false);
      }

      // Indicar que la navegación debe ir a COMIENZO con toast de confirmación
      localStorage.setItem('openmun_pending_nav_tab', 'COMIENZO');
      localStorage.setItem('openmun_pending_toast', JSON.stringify({
        type: 'success',
        title: '¡Sesión cargada correctamente!',
        message: `Has ingresado a la Mesa de Presidencia de "${comite.nombre}".`,
        duration: 4000
      }));

      // Entrar al Dashboard de moderación directamente
      if (typeof onExit === 'function') {
        onExit();
      } else {
        setViewMode('chair');
      }
    } catch (err) {
      setPinMesaError(err.message || 'PIN de Mesa Directiva incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  // Entrar directamente como Staff a un comité específico
  const handleEntrarComoStaff = (comite) => {
    localStorage.setItem('openmun_current_comite_id', comite.id);
    localStorage.setItem('openmun_current_conf_id', conferencia.id);
    localStorage.setItem('openmun_user_role', 'staff');
    localStorage.setItem('openmun_last_room_id', comite.id);
    setViewMode('staff');
  };

  // Helper con colores vivos y destacados para todos los estados
  const getStatusBadge = (tipo) => {
    switch (tipo) {
      case 'informal':
        return {
          label: 'Sesión Informal',
          color: '#eab308',
          bg: 'rgba(234, 179, 8, 0.18)',
          border: 'rgba(234, 179, 8, 0.45)',
          solidBg: '#eab308',
          solidText: '#000000'
        };
      case 'receso':
        return {
          label: 'En Receso',
          color: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.18)',
          border: 'rgba(168, 85, 247, 0.45)',
          solidBg: '#a855f7',
          solidText: '#ffffff'
        };
      case 'votacion':
        return {
          label: 'En Votación',
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.18)',
          border: 'rgba(59, 130, 246, 0.45)',
          solidBg: '#3b82f6',
          solidText: '#ffffff'
        };
      case 'formal':
      default:
        return {
          label: 'Sesión Formal',
          color: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.18)',
          border: 'rgba(34, 197, 94, 0.45)',
          solidBg: '#22c55e',
          solidText: '#ffffff'
        };
    }
  };

  // Combinar y consolidar todos los comités (desde comites locales, resumenData de BD y almacenamiento persistente)
  const listaComitesConsolidada = useMemo(() => {
    const comitesMap = new Map();

    try {
      if (conferencia?.id) {
        const localSaved = localStorage.getItem(`openmun_conf_comites_${conferencia.id}`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) {
            parsed.forEach(lc => {
              if (lc && (lc.id || lc.nombre)) {
                const idKey = String(lc.id || lc.nombre).toLowerCase().trim();
                comitesMap.set(idKey, { ...lc, id: lc.id || idKey });
              }
            });
          }
        }
      }
    } catch (e) { }

    (comites || []).forEach(c => {
      if (c && (c.id || c.nombre)) {
        const idKey = String(c.id || c.nombre).toLowerCase().trim();
        comitesMap.set(idKey, { ...(comitesMap.get(idKey) || {}), ...c, id: c.id || idKey });
      }
    });

    (resumenData || []).forEach(r => {
      if (r && (r.id || r.nombre)) {
        const idKey = String(r.id || r.nombre).toLowerCase().trim();
        const existing = comitesMap.get(idKey) || {};
        comitesMap.set(idKey, {
          ...existing,
          ...r,
          id: r.id || existing.id || idKey,
          // Preservar existing.nombre si ya tiene nombre modificado localmente
          nombre: existing.nombre || r.nombre || idKey,
          pin_mesa: r.pin_mesa !== undefined ? r.pin_mesa : existing.pin_mesa,
          requierePinMesa: r.requierePinMesa !== undefined ? r.requierePinMesa : (r.pin_mesa ? true : existing.requierePinMesa),
          tipo_sesion: r.tipo_sesion || existing.tipo_sesion || 'formal',
          topico_actual: r.topico_actual || existing.topico_actual || '',
          actualizado_en: r.actualizado_en || existing.actualizado_en || '',
          datos_json: r.datos_json || existing.datos_json || {}
        });
      }
    });
    return Array.from(comitesMap.values());
  }, [comites, resumenData, conferencia?.id]);

  const comitesFiltrados = listaComitesConsolidada.filter(c =>
    c.nombre?.toLowerCase().includes(filtroComite.toLowerCase()) ||
    c.id?.toLowerCase().includes(filtroComite.toLowerCase())
  );

  // Tokens de estilo
  const bgMain = isLight ? '#f8fafc' : 'var(--bg-color)';
  const bgCard = isLight ? '#ffffff' : 'var(--panel-color)';
  const borderCol = 'var(--border-color)';
  const textMuted = 'var(--muted-text)';
  const headerBg = isLight ? '#f1f5f9' : 'var(--card-header-bg)';

  // ─────────────────────────────────────────────────────────────
  // VISTA 1: BUSCADOR SI NO HAY CONFERENCIA CARGADA
  // ─────────────────────────────────────────────────────────────
  if (!conferencia) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        backgroundColor: bgMain,
        color: 'var(--text-color)'
      }}>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              position: 'absolute',
              top: '24px',
              left: '24px',
              background: 'transparent',
              border: `1px solid ${borderCol}`,
              borderRadius: '10px',
              color: textMuted,
              padding: '0.55rem 0.95rem',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <ArrowLeft size={16} /> {t('common.back', 'Volver')}
          </button>
        )}

        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <OpenMunLogo height={60} isLight={isLight} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>
            {t('conferences.joinTitle', 'Unirse a una Conferencia')}
          </h2>
          <p style={{ fontSize: '0.88rem', color: textMuted, margin: '0 0 1.5rem 0' }}>
            {t('conferences.joinSubtitle', 'Introduce el código o ID de la conferencia.')}
          </p>

          {errorMsg && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: isLight ? '#b91c1c' : '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              fontWeight: '600'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); cargarConferencia(confIdInput, pinAccesoInput); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                {t('conferences.confId', 'Código / ID de la Conferencia')}
              </label>
              <input
                type="text"
                required
                value={confIdInput}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                  setConfIdInput(val);
                  try {
                    const savedPin = localStorage.getItem(`openmun_conf_pin_${val}`);
                    if (savedPin) setPinAccesoInput(savedPin);
                  } catch (err) {}
                }}
                placeholder="ej. hmun2026"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                {t('conferences.accessPin', 'PIN de Acceso (si aplica)')}
              </label>
              <input
                type="password"
                value={pinAccesoInput}
                onChange={(e) => setPinAccesoInput(e.target.value)}
                placeholder="Opcional"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                padding: '0.85rem',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '800',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Building2 size={18} />}
              {loading ? 'Accediendo...' : t('conferences.enterConf', 'Entrar a la Conferencia')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VISTA PRINCIPAL CON 3 PESTAÑAS
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bgMain,
        color: 'var(--text-color)',
        position: 'relative'
      }}
    >
      {/* Overlay Drag & Drop cuando se arrastra un archivo JSON sobre la conferencia */}
      {isDraggingFile && !comiteEnEdicion && !comiteSeleccionado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: isLight ? 'rgba(241, 245, 249, 0.88)' : 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '2rem'
        }}>
          <div style={{
            border: '3px dashed #8b5cf6',
            borderRadius: '24px',
            padding: '3.5rem 2.5rem',
            backgroundColor: isLight ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            maxWidth: '560px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(139, 92, 246, 0.25)',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)'
            }}>
              <Upload size={40} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
              Suelta tu archivo JSON aquí
            </h2>
            <p style={{ fontSize: '0.95rem', color: textMuted, margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
              Se importarán automáticamente los comités, avisos y configuración de la conferencia <strong>{conferencia?.nombre || ''}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Barra Superior Central */}
      <header style={{
        padding: '0.85rem 1.5rem',
        backgroundColor: bgCard,
        borderBottom: `1px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              if (onExit) onExit();
              else setViewMode('chair');
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${borderCol}`,
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: 'var(--text-color)',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Volver al Dashboard"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                {conferencia.nombre}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: textMuted, flexWrap: 'wrap' }}>
                <span>ID: <code>{conferencia.id}</code></span>
                <span>•</span>
                <span>{listaComitesConsolidada.length} Comités</span>
                {conferencia.email_admin && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#8b5cf6', fontWeight: '600' }}>
                      <Mail size={12} /> {conferencia.email_admin}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SELECTOR DE 3 PESTAÑAS */}
        <div style={{
          display: 'flex',
          backgroundColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '3px',
          gap: '3px'
        }}>
          <button
            onClick={() => setActiveMainTab('VER_COMITES')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeMainTab === 'VER_COMITES' ? (isLight ? '#ffffff' : '#27272a') : 'transparent',
              color: activeMainTab === 'VER_COMITES' ? '#3b82f6' : 'var(--muted-text)',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'VER_COMITES' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={16} /> Ver Comités (Mesas)
          </button>

          <button
            onClick={() => setActiveMainTab('STAFF')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeMainTab === 'STAFF' ? (isLight ? '#ffffff' : '#27272a') : 'transparent',
              color: activeMainTab === 'STAFF' ? '#f59e0b' : 'var(--muted-text)',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'STAFF' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} /> Panel Staff
          </button>

          <button
            onClick={() => setActiveMainTab('SECRETARIA')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeMainTab === 'SECRETARIA' ? (isLight ? '#ffffff' : '#27272a') : 'transparent',
              color: activeMainTab === 'SECRETARIA' ? '#8b5cf6' : 'var(--muted-text)',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeMainTab === 'SECRETARIA' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={16} /> Panel Organización
          </button>
        </div>

        <button
          onClick={() => {
            conferenceService.limpiarSesionActiva();
            setConferencia(null);
          }}
          style={{
            background: 'transparent',
            border: `1px solid ${borderCol}`,
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            color: textMuted,
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Cambiar Conferencia
        </button>
      </header>

      {/* Banner de Avisos Oficiales de la Conferencia y Salas */}
      <ConferenceBanner
        isLight={isLight}
        role={activeMainTab === 'STAFF' ? 'staff_global' : (isAdminAuthenticated ? 'secretaria' : 'general')}
      />

      {/* CUERPO SEGÚN PESTAÑA */}
      <main style={{ padding: '1.5rem', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto' }}>

        {/* ════════════════════════════════════════════════════════════════════════
            PESTAÑA 1: VER COMITÉS (MESAS DIRECTIVAS)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === 'VER_COMITES' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>
                  Comités de la Conferencia
                </h2>
                <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
                  Selecciona tu comité para unirte como Mesa Directiva a moderar (carga el JSON y configuración).
                </p>
              </div>

              {/* Buscador de comités */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
                <input
                  type="text"
                  value={filtroComite}
                  onChange={(e) => setFiltroComite(e.target.value)}
                  placeholder="Buscar comité..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: bgCard,
                    color: 'var(--text-color)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {comitesFiltrados.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: bgCard,
                borderRadius: '16px',
                border: `1px solid ${borderCol}`
              }}>
                <Layers size={40} style={{ color: textMuted, marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.4rem 0' }}>No se encontraron comités</h3>
                <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
                  La secretaría puede añadir nuevos comités desde la pestaña "Panel Secretaría".
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}>
                {comitesFiltrados.map((comite) => {
                  const badge = getStatusBadge(comite.tipo_sesion);
                  return (
                    <div
                      key={comite.id}
                      style={{
                        backgroundColor: bgCard,
                        border: `1.5px solid ${badge.border || borderCol}`,
                        borderRadius: '14px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          {/* Badge de Estado con colores vibrantes */}
                          <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: badge.color,
                              boxShadow: `0 0 6px ${badge.color}`
                            }} />
                            {badge.label}
                          </span>

                          {comite.requierePinMesa && (
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                              color: textMuted,
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <Lock size={12} /> PIN Mesa
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: 'var(--text-color)' }}>
                          {comite.nombre}
                        </h3>

                        {comite.topico_actual && (
                          <p style={{ fontSize: '0.82rem', color: textMuted, margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                            <strong>Tópico Actual:</strong> {comite.topico_actual}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleEntrarComoMesa(comite)}
                          style={{
                            flex: 1,
                            padding: '0.7rem',
                            borderRadius: '8px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                          }}
                        >
                          <Play size={16} /> Entrar como Mesa
                        </button>
                        <button
                          onClick={() => handleEntrarComoStaff(comite)}
                          title="Entrar a la consola de Staff de este comité"
                          style={{
                            padding: '0.7rem 0.95rem',
                            borderRadius: '8px',
                            backgroundColor: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1.5px solid rgba(16, 185, 129, 0.35)',
                            fontWeight: '800',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Users size={15} /> Staff
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            PESTAÑA 2: PANEL STAFF (OPERACIONES, COMUNICACIÓN Y CHECKLIST VÍA BASE DE DATOS)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === 'STAFF' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {/* Header explicativo */}
            <div style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                  <Users size={22} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                    Panel Staff & Logística
                  </h2>
                </div>
                <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0 }}>
                  Envía solicitudes y avisos directos a Secretaría o Mesas, gestiona el checklist operativo y supervisa el estado de salas y comunicados.
                </p>
              </div>
            </div>

            {/* Grid 2 Columnas: Formulario de Mensajería + Checklist Operativo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>

              {/* Bloque 1: Mensajería */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <Send size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>
                    Enviar Mensaje / Solicitud a Secretaría o Mesas
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                  Envía una solicitud o reporte para proyectarlo en el centro de avisos y paneles de la conferencia.
                </p>

                {staffFeedback && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
                    color: isLight ? '#15803d' : '#4ade80',
                    fontSize: '0.82rem',
                    fontWeight: '700'
                  }}>
                    {staffFeedback}
                  </div>
                )}

                <form onSubmit={handleEnviarMensajeStaff} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                      Destinatario
                    </label>
                    <select
                      value={staffDestino}
                      onChange={(e) => setStaffDestino(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <optgroup label="🌐 Canales Generales">
                        <option value="SECRETARIA">🛡️ Organización / Secretaría General</option>
                        <option value="STAFF_ALL">👥 Todo el Staff de la Conferencia</option>
                        <option value="GLOBAL">📢 Toda la Conferencia (Global)</option>
                        <option value="CHAIRS_ALL">🏛️ Todas las Mesas Directivas</option>
                      </optgroup>
                      <optgroup label="🏛️ Mesas Directivas (Chairs)">
                        {listaComitesConsolidada.map(c => (
                          <option key={`CHAIR_${c.id}`} value={`CHAIR_${c.id}`}>🏛️ Mesa de {c.nombre || c.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="👥 Staff de Sala Asignado">
                        {listaComitesConsolidada.map(c => (
                          <option key={`STAFF_${c.id}`} value={`STAFF_COMITE_${c.id}`}>👥 Staff de {c.nombre || c.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌐 Sala Completa (Mesa + Delegados)">
                        {listaComitesConsolidada.map(c => (
                          <option key={`ALL_${c.id}`} value={c.id}>🌐 Sala de {c.nombre || c.id}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                      Prioridad / Tipo
                    </label>
                    <select
                      value={staffPrioridad}
                      onChange={(e) => setStaffPrioridad(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="info">ℹ️ Información / Petición Estándar</option>
                      <option value="alerta">⚠️ Alerta / Logística de Sala</option>
                      <option value="urgente">🚨 Urgente / Incidencia Crítica</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                      Mensaje / Requerimiento
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={staffMensaje}
                      onChange={(e) => setStaffMensaje(e.target.value)}
                      placeholder="Ej: Faltan botellas de agua en CS / Impresiones de resolución listas..."
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.85rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviandoMensajeStaff}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <Send size={16} /> {enviandoMensajeStaff ? 'Enviando...' : 'Enviar Mensaje'}
                  </button>
                </form>
              </div>

              {/* Bloque 2: Checklist Operativo de Staff (Indexada) */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <ClipboardList size={18} color="#3b82f6" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>
                        Checklist Operativo de Staff
                      </h3>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: '800',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '6px',
                        letterSpacing: '0.03em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Database size={11} /> BASE DE DATOS
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: textMuted, fontWeight: '600' }}>
                      {checklistFiltrada.filter(i => i.completado).length} de {checklistFiltrada.length} listas
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: textMuted, margin: '0 0 0.85rem 0' }}>
                    Tareas operativas indexadas por conferencia y comité, asignables y sincronizadas en tiempo real.
                  </p>

                  {/* Filtro por Comité */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: textMuted, whiteSpace: 'nowrap' }}>
                      Filtrar por:
                    </span>
                    <select
                      value={filtroComiteChecklist}
                      onChange={(e) => setFiltroComiteChecklist(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}
                    >
                      <option value="TODOS">🌐 Todas las tareas (Global + Todos los comités)</option>
                      <option value="GLOBAL">🌐 Solo tareas Globales (Sede)</option>
                      <optgroup label="Por Comité">
                        {listaComitesConsolidada.map(c => (
                          <option key={`FILTRO_${c.id}`} value={c.id}>🏛️ {c.nombre}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Formulario Añadir Tarea */}
                  <form
                    onSubmit={handleCrearTareaChecklist}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      backgroundColor: headerBg,
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: `1px solid ${borderCol}`
                    }}
                  >
                    <input
                      type="text"
                      required
                      value={nuevaTareaStaff}
                      onChange={(e) => setNuevaTareaStaff(e.target.value)}
                      placeholder="Nueva tarea operativa (ej: Llevar copias al CS)..."
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: bgCard,
                        color: 'var(--text-color)',
                        fontSize: '0.82rem'
                      }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={nuevaTareaAsignado}
                        onChange={(e) => setNuevaTareaAsignado(e.target.value)}
                        placeholder="Asignar a... (ej: Logística)"
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgCard,
                          color: 'var(--text-color)',
                          fontSize: '0.78rem'
                        }}
                      />

                      <select
                        value={nuevaTareaComiteId}
                        onChange={(e) => setNuevaTareaComiteId(e.target.value)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgCard,
                          color: 'var(--text-color)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <option value="GLOBAL">🌐 Global (Sede)</option>
                        {listaComitesConsolidada.map(c => (
                          <option key={`ADD_${c.id}`} value={c.id}>🏛️ {c.nombre}</option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={!nuevaTareaStaff.trim()}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: nuevaTareaStaff.trim() ? '#3b82f6' : 'var(--card-header-bg)',
                          color: nuevaTareaStaff.trim() ? '#ffffff' : textMuted,
                          border: 'none',
                          fontWeight: '700',
                          fontSize: '0.78rem',
                          cursor: nuevaTareaStaff.trim() ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Plus size={14} /> Añadir
                      </button>
                    </div>
                  </form>

                  {/* Lista de Tareas Indexadas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {checklistFiltrada.length === 0 ? (
                      <div style={{
                        padding: '1.5rem 1rem',
                        textAlign: 'center',
                        color: textMuted,
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        border: `1px dashed ${borderCol}`
                      }}>
                        No hay tareas en el checklist para este filtro. ¡Crea una para comenzar!
                      </div>
                    ) : (
                      checklistFiltrada.map((task) => {
                        const comiteObj = task.comite_id ? (listaComitesConsolidada || []).find(c => c.id === task.comite_id) : null;
                        const nombreComite = comiteObj?.nombre || task.comite_id;

                        return (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTareaChecklist(task)}
                            style={{
                              padding: '0.6rem 0.8rem',
                              borderRadius: '8px',
                              backgroundColor: task.completado ? 'rgba(34, 197, 94, 0.05)' : headerBg,
                              border: `1px solid ${task.completado ? 'rgba(34, 197, 94, 0.35)' : borderCol}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.6rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                              {task.completado ? (
                                <CheckSquare size={17} color="#22c55e" style={{ flexShrink: 0 }} />
                              ) : (
                                <Square size={17} color="var(--muted-text)" style={{ flexShrink: 0 }} />
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
                                <span style={{
                                  fontSize: '0.84rem',
                                  color: task.completado ? 'var(--muted-text)' : 'var(--text-color)',
                                  textDecoration: task.completado ? 'line-through' : 'none',
                                  wordBreak: 'break-word',
                                  fontWeight: task.completado ? 'normal' : '600'
                                }}>
                                  {task.titulo}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {task.comite_id ? (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                      color: '#3b82f6',
                                      padding: '0.08rem 0.35rem',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      🏛️ {nombreComite}
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: 'rgba(107, 114, 128, 0.12)',
                                      color: textMuted,
                                      padding: '0.08rem 0.35rem',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      🌐 Global
                                    </span>
                                  )}
                                  {task.asignado_a && (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                      color: '#f59e0b',
                                      padding: '0.08rem 0.35rem',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      👤 {task.asignado_a}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarTareaChecklist(task.id);
                              }}
                              title="Eliminar tarea"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                opacity: 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Acciones del pie: Borrado masivo de completadas */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: `1px solid ${borderCol}`, flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.74rem', color: textMuted }}>
                    {checklistFiltrada.filter(i => !i.completado).length} pendientes
                  </span>

                  {checklistFiltrada.some(i => i.completado) && (
                    <button
                      type="button"
                      onClick={handleEliminarTareasCompletadas}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}
                    >
                      <Trash2 size={13} /> Limpiar completadas ({checklistFiltrada.filter(i => i.completado).length})
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Bloque 3: Buzón de Avisos y Comunicados Recibidos para Staff */}
            <div style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Megaphone size={18} color="#f59e0b" /> Buzón de Avisos y Comunicados Recibidos ({avisosActivos.filter(a => correspondeAviso(a, { role: 'staff', currentComiteId: (filtroComiteChecklist === 'TODOS' || filtroComiteChecklist === 'GLOBAL') ? null : filtroComiteChecklist })).length})
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: textMuted, margin: 0 }}>
                    Visualiza los avisos oficiales dirigidos al personal de Staff {filtroComiteChecklist !== 'TODOS' && filtroComiteChecklist !== 'GLOBAL' ? `de la sala seleccionada (${filtroComiteChecklist})` : 'de toda la conferencia'}.
                  </p>
                </div>

                <button
                  onClick={fetchAvisos}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${borderCol}`,
                    color: 'var(--text-color)',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={13} /> Actualizar Avisos
                </button>
              </div>

              {(() => {
                const comiteFiltradoAviso = (filtroComiteChecklist === 'TODOS' || filtroComiteChecklist === 'GLOBAL') ? null : filtroComiteChecklist;
                const avisosParaStaff = avisosActivos.filter(a => correspondeAviso(a, { role: 'staff', currentComiteId: comiteFiltradoAviso }));

                if (avisosParaStaff.length === 0) {
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      backgroundColor: headerBg,
                      borderRadius: '12px',
                      border: `1px dashed ${borderCol}`,
                      color: textMuted
                    }}>
                      <Megaphone size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>No hay avisos ni comunicados para Staff</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                        Los avisos oficiales dirigidos al staff o globales aparecerán aquí.
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {avisosParaStaff.map((av) => (
                    <div
                      key={av.id}
                      style={{
                        backgroundColor: headerBg,
                        border: `1px solid ${borderCol}`,
                        borderLeft: `4px solid ${av.tipo === 'urgente' ? '#ef4444' : av.tipo === 'alerta' ? '#f59e0b' : '#3b82f6'}`,
                        borderRadius: '10px',
                        padding: '0.9rem 1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            backgroundColor: av.tipo === 'urgente' ? '#ef4444' : (av.tipo === 'alerta' ? '#f59e0b' : '#3b82f6'),
                            color: '#ffffff',
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {av.emisor}
                          </span>

                          <span style={{ fontSize: '0.78rem', color: textMuted, fontWeight: '600' }}>
                            Destino: <strong style={{ color: 'var(--text-color)' }}>
                              {getNombreDestino(av.comite_id)}
                            </strong>
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.72rem', color: textMuted }}>
                            {av.creado_en || ''}
                          </span>
                          <button
                            onClick={() => handleDesactivarAviso(av.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Descartar
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: 'var(--text-color)', lineHeight: '1.4' }}>
                        {formatearMensajeAviso(av.mensaje)}
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()}
            </div>

            {/* Bloque 3: Estado de Comités en Tiempo Real (Base de Datos) */}
            <div style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} color="#3b82f6" /> Estado de Salas y Comités (Base de Datos Central)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: textMuted, margin: 0 }}>
                    Monitoreo en vivo de los estados de debate y temas activos en toda la conferencia.
                  </p>
                </div>

                <button
                  onClick={fetchResumen}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${borderCol}`,
                    color: 'var(--text-color)',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={13} /> Refrescar Estados
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {listaComitesConsolidada.map((comite) => {
                  const badge = getStatusBadge(comite.tipo_sesion);
                  return (
                    <div
                      key={comite.id}
                      style={{
                        backgroundColor: headerBg,
                        border: `1px solid ${badge.border || borderCol}`,
                        borderRadius: '12px',
                        padding: '1rem 1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--text-color)' }}>
                            {comite.nombre}
                          </strong>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: '0.72rem',
                            fontWeight: '800'
                          }}>
                            {badge.label}
                          </span>
                        </div>

                        {comite.topico_actual && (
                          <p style={{ fontSize: '0.8rem', color: textMuted, margin: '0 0 0.35rem 0', lineHeight: '1.3' }}>
                            <strong>Tópico:</strong> {comite.topico_actual}
                          </p>
                        )}
                      </div>

                      {comite.actualizado_en && (
                        <span style={{ fontSize: '0.72rem', color: textMuted, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} /> Actividad: {comite.actualizado_en}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            PESTAÑA 3: PANEL SECRETARÍA (LOGÍSTICA, GESTIÓN DE COMITÉS, WIDGETS Y AVISOS)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === 'SECRETARIA' && (
          <div>
            {!isAdminAuthenticated ? (
              <div style={{
                maxWidth: '420px',
                margin: '3rem auto',
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <Shield size={28} />
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
                  Acceso a Organización
                </h2>
                <p style={{ fontSize: '0.85rem', color: textMuted, margin: '0 0 1.25rem 0' }}>
                  Introduce el PIN de Organización configurado al crear la conferencia.
                </p>

                {errorMsg && (
                  <div style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                    color: isLight ? '#b91c1c' : '#fca5a5',
                    fontSize: '0.82rem',
                    marginBottom: '1rem',
                    fontWeight: '600'
                  }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ position: 'relative', textAlign: 'left' }}>
                    <input
                      type={mostrarAdminPin ? 'text' : 'password'}
                      required
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="PIN de Organización"
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarAdminPin(!mostrarAdminPin)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: textMuted,
                        cursor: 'pointer'
                      }}
                    >
                      {mostrarAdminPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <Shield size={16} /> Entrar a Organización
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* BARRA SUPERIOR DE RESPALDOS JSON (EXPORTAR / IMPORTAR 3 TABLAS DE BD) */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : 'var(--card-header-bg)',
                    border: `1.5px dashed ${isDraggingFile ? '#8b5cf6' : borderCol}`,
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: isDraggingFile ? '0 0 20px rgba(139, 92, 246, 0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.25)',
                      color: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Database size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                        Copia de Seguridad de la Conferencia (3 Tablas Base de Datos)
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: textMuted, margin: 0 }}>
                        Exporta o importa (arrastrando o seleccionando) el archivo JSON con Conferencias, Comités y Avisos.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleExportarConferenciaJSON}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 1.15rem',
                        borderRadius: '10px',
                        backgroundColor: isLight ? '#10b981' : '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <Download size={16} /> Exportar Archivo JSON (3 Tablas)
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json,application/json"
                      style={{ display: 'none' }}
                      onChange={handleImportarConferenciaJSON}
                    />

                    <button
                      type="button"
                      disabled={importandoJSON}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 1.15rem',
                        borderRadius: '10px',
                        backgroundColor: isLight ? '#ffffff' : bgCard,
                        border: `1px solid ${borderCol}`,
                        color: 'var(--text-color)',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        cursor: importandoJSON ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        opacity: importandoJSON ? 0.6 : 1
                      }}
                    >
                      <Upload size={16} color="#8b5cf6" />
                      {importandoJSON ? 'Importando JSON...' : 'Importar Archivo JSON'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Deseas bloquear el panel de organización? Se solicitará el PIN en el próximo acceso.')) {
                          setIsAdminAuthenticated(false);
                          setAdminPinInput('');
                          setConfPinAdminActual('');
                          if (conferencia?.id) {
                            try {
                              localStorage.removeItem(`openmun_conf_admin_pin_${conferencia.id.toLowerCase()}`);
                            } catch (e) {}
                          }
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.65rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#ef4444',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Bloquear acceso al panel de organización y requerir PIN de nuevo"
                    >
                      <Lock size={15} /> Bloquear
                    </button>
                  </div>
                </div>

                {/* 1. SECCIÓN: CONFIGURACIÓN INTEGRAL DE CONFERENCIA Y SECRETARÍA (PATCH /api/conferencias/:id) */}
                <div style={{
                  backgroundColor: bgCard,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={20} color="#8b5cf6" /> Configuración General de la Conferencia (Base de Datos)
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
                        Gestiona los datos centrales, correo de contacto, PIN de delegados y credenciales de Secretaría.
                      </p>
                    </div>

                    {/* Badges de estado actual */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {conferencia.email_admin ? (
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.2)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#8b5cf6',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <Mail size={14} /> Correo: <strong>{conferencia.email_admin}</strong>
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: isLight ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#f59e0b',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <AlertTriangle size={14} /> Sin correo registrado
                        </span>
                      )}

                      {conferencia.requierePin ? (
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#3b82f6',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <Lock size={14} /> Delegados con PIN
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: isLight ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          color: isLight ? '#15803d' : '#4ade80',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <Globe size={14} /> Acceso Público
                        </span>
                      )}
                    </div>
                  </div>

                  {confSettingsFeedback && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: confSettingsFeedback.type === 'success'
                        ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)')
                        : (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)'),
                      border: `1px solid ${confSettingsFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      color: confSettingsFeedback.type === 'success' ? (isLight ? '#15803d' : '#4ade80') : (isLight ? '#b91c1c' : '#fca5a5'),
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {confSettingsFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {confSettingsFeedback.text}
                    </div>
                  )}

                  <form onSubmit={handleGuardarConfiguracionConferencia} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.25rem'
                    }}>
                      {/* 1. Nombre de la Conferencia */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                          Nombre de la Conferencia
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={confNombreInput}
                            onChange={(e) => setConfNombreInput(e.target.value)}
                            placeholder="ej. Harvard National MUN 2026"
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                              borderRadius: '8px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: headerBg,
                              color: 'var(--text-color)',
                              fontSize: '0.9rem'
                            }}
                          />
                          <Building2
                            size={16}
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: textMuted
                            }}
                          />
                        </div>
                      </div>

                      {/* 2. Correo de Secretaría */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                          Correo Electrónico de Secretaría (Admin)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="email"
                            value={confEmailAdminInput}
                            onChange={(e) => setConfEmailAdminInput(e.target.value)}
                            placeholder="ej. secretaria.general@hmun.org"
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                              borderRadius: '8px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: headerBg,
                              color: 'var(--text-color)',
                              fontSize: '0.9rem'
                            }}
                          />
                          <Mail
                            size={16}
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: textMuted
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.74rem', color: textMuted, marginTop: '0.25rem', display: 'block' }}>
                          {conferencia.email_admin
                            ? `Correo actual en BD: ${conferencia.email_admin}`
                            : 'Introduce un correo para registrarlo en la base de datos.'}
                        </span>
                      </div>

                      {/* 3. PIN de Acceso General / Delegados */}
                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        backgroundColor: headerBg,
                        border: `1px solid ${borderCol}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                          <input
                            type="checkbox"
                            checked={cambiarPinAcceso}
                            onChange={(e) => setCambiarPinAcceso(e.target.checked)}
                          />
                          Proteger acceso a delegados con PIN
                        </label>

                        {cambiarPinAcceso && (
                          <div style={{ position: 'relative' }}>
                            <input
                              type={mostrarConfPinAcceso ? 'text' : 'password'}
                              value={confPinAccesoInput}
                              onChange={(e) => setConfPinAccesoInput(e.target.value)}
                              placeholder="Nuevo PIN de acceso para delegados"
                              style={{
                                width: '100%',
                                padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                                borderRadius: '6px',
                                border: `1px solid ${borderCol}`,
                                backgroundColor: bgCard,
                                color: 'var(--text-color)',
                                fontSize: '0.85rem'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setMostrarConfPinAcceso(!mostrarConfPinAcceso)}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: textMuted,
                                cursor: 'pointer'
                              }}
                            >
                              {mostrarConfPinAcceso ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 4. Cambiar Contraseña / PIN de Secretaría (Admin) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                          Cambiar PIN / Contraseña de Secretaría
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={mostrarConfNuevoPin ? 'text' : 'password'}
                            value={confNuevoPinAdmin}
                            onChange={(e) => setConfNuevoPinAdmin(e.target.value)}
                            placeholder="Dejar vacío para no cambiar"
                            style={{
                              width: '100%',
                              padding: '0.65rem 2.5rem 0.65rem 2.4rem',
                              borderRadius: '8px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: headerBg,
                              color: 'var(--text-color)',
                              fontSize: '0.9rem'
                            }}
                          />
                          <Key
                            size={16}
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: textMuted
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarConfNuevoPin(!mostrarConfNuevoPin)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: textMuted,
                              cursor: 'pointer'
                            }}
                          >
                            {mostrarConfNuevoPin ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: textMuted, marginTop: '0.25rem', display: 'block' }}>
                          Solo introduce un valor si deseas asignar una nueva clave de acceso de secretaría.
                        </span>
                      </div>
                    </div>

                    {/* Bloque de Autorización con PIN Actual y Botón Guardar */}
                    <div style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '0.35rem', color: '#8b5cf6' }}>
                          PIN de Secretaría Actual (Autorización Obligatoria) *
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={mostrarConfPinActual ? 'text' : 'password'}
                            required
                            value={confPinAdminActual}
                            onChange={(e) => setConfPinAdminActual(e.target.value)}
                            placeholder="PIN de Secretaría Actual"
                            style={{
                              width: '100%',
                              padding: '0.6rem 2.5rem 0.6rem 2.2rem',
                              borderRadius: '8px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: bgCard,
                              color: 'var(--text-color)',
                              fontSize: '0.9rem'
                            }}
                          />
                          <Shield
                            size={15}
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#8b5cf6'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarConfPinActual(!mostrarConfPinActual)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: textMuted,
                              cursor: 'pointer'
                            }}
                          >
                            {mostrarConfPinActual ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={guardandoConfSettings}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '10px',
                          backgroundColor: '#8b5cf6',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          cursor: guardandoConfSettings ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
                          opacity: guardandoConfSettings ? 0.7 : 1,
                          alignSelf: 'flex-end'
                        }}
                      >
                        <Check size={18} />
                        {guardandoConfSettings ? 'Guardando en BD...' : 'Guardar Configuración en BD'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. SECCIÓN: GESTIÓN Y CONFIGURACIÓN DE COMITÉS (AGENDA, PAÍSES, MATRIZ) */}
                <div style={{
                  backgroundColor: bgCard,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={20} color="#8b5cf6" /> Gestión de Comités & Configuración de Widgets
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
                        Añade o elimina comités y configura para cada uno su Matriz de Países, Importador y Agenda.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportarConferenciaJSON}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.95rem',
                        borderRadius: '8px',
                        backgroundColor: isLight ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: isLight ? '#15803d' : '#4ade80',
                        fontSize: '0.82rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={14} /> Exportar JSON Completo
                    </button>
                  </div>

                  {/* Formulario Añadir Comité / Importar Comité Individual */}
                  <input
                    type="file"
                    ref={singleComiteFileInputRef}
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) procesarArchivoConferenciaJSON(f, true);
                    }}
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer?.files;
                      if (files && files.length > 0) {
                        procesarArchivoConferenciaJSON(files[0], true);
                      }
                    }}
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1.1rem',
                      backgroundColor: headerBg,
                      borderRadius: '14px',
                      border: `1.5px dashed ${borderCol}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
                        ➕ Añadir nuevo comité manual o importar desde archivo .JSON:
                      </span>
                      <span style={{ fontSize: '0.74rem', color: textMuted }}>
                        (Puedes importar el <code>sesion_activa.json</code> exportado desde un comité)
                      </span>
                    </div>

                    <form onSubmit={handleCrearComite} style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        required
                        value={nuevoNombreComite}
                        onChange={(e) => setNuevoNombreComite(e.target.value)}
                        placeholder="Nombre del nuevo comité (ej. ACNUR)"
                        style={{
                          flex: 2,
                          minWidth: '200px',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgCard,
                          color: 'var(--text-color)',
                          fontSize: '0.88rem'
                        }}
                      />
                      <input
                        type="text"
                        value={nuevoPinMesa}
                        onChange={(e) => setNuevoPinMesa(e.target.value)}
                        placeholder="PIN Mesa Directiva (opcional)"
                        style={{
                          flex: 1,
                          minWidth: '160px',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgCard,
                          color: 'var(--text-color)',
                          fontSize: '0.88rem'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={creandoComite}
                        style={{
                          padding: '0.65rem 1.15rem',
                          borderRadius: '8px',
                          backgroundColor: '#8b5cf6',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 6px rgba(139, 92, 246, 0.25)'
                        }}
                      >
                        <Plus size={16} /> {creandoComite ? 'Creando...' : 'Crear Comité'}
                      </button>

                      <button
                        type="button"
                        disabled={importandoJSON}
                        onClick={() => singleComiteFileInputRef.current?.click()}
                        style={{
                          padding: '0.65rem 1.15rem',
                          borderRadius: '8px',
                          backgroundColor: isLight ? '#ffffff' : bgCard,
                          border: '1.5px dashed #8b5cf6',
                          color: '#8b5cf6',
                          fontWeight: '800',
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: '0 2px 6px rgba(139, 92, 246, 0.12)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Importar un comité individual desde un archivo .JSON (sesion_activa.json o backup de comité)"
                      >
                        <Upload size={16} /> Importar Comité (.JSON)
                      </button>
                    </form>
                  </div>

                  {/* Lista de comités con botón para configurar widgets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {listaComitesConsolidada.map((comite) => {
                      const badge = getStatusBadge(comite.tipo_sesion);
                      return (
                        <div
                          key={comite.id}
                          style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            border: `1px solid ${borderCol}`,
                            backgroundColor: headerBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '1rem', color: 'var(--text-color)' }}>{comite.nombre}</strong>
                              <span style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.color,
                                fontSize: '0.7rem',
                                fontWeight: '800'
                              }}>
                                {badge.label}
                              </span>
                              <code style={{ fontSize: '0.75rem', color: textMuted }}>ID: {comite.id}</code>
                            </div>
                            {comite.topico_actual && (
                              <span style={{ fontSize: '0.8rem', color: textMuted }}>
                                Tema: {comite.topico_actual}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <button
                              onClick={() => handleAbrirEditorComite(comite)}
                              style={{
                                padding: '0.5rem 0.95rem',
                                borderRadius: '8px',
                                backgroundColor: '#8b5cf6',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.82rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: '0 2px 6px rgba(139, 92, 246, 0.25)'
                              }}
                            >
                              <Settings size={14} /> Gestionar Comité (Agenda, Países, Matriz)
                            </button>

                            <button
                              onClick={() => handleEliminarComite(comite.id)}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Eliminar comité"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SECCIÓN: CENTRO DE EMISIÓN DE AVISOS (BASE DE DATOS) */}
                <div style={{
                  backgroundColor: bgCard,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Megaphone size={20} color="#3b82f6" /> Centro de Avisos & Comunicados Oficiales
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
                      Emite notificaciones a toda la conferencia, al staff o a salas específicas persistidas en base de datos.
                    </p>
                  </div>

                  {avisoFeedback && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: isLight ? '#15803d' : '#4ade80',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginBottom: '1rem'
                    }}>
                      {avisoFeedback}
                    </div>
                  )}

                  <form onSubmit={handleEmitirAviso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.25rem' }}>Destinatario</label>
                        <select
                          value={avisoDestino}
                          onChange={(e) => setAvisoDestino(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            borderRadius: '8px',
                            border: `1px solid ${borderCol}`,
                            backgroundColor: headerBg,
                            color: 'var(--text-color)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <optgroup label="🌐 Canales Generales">
                            <option value="">📢 Toda la Conferencia (Global)</option>
                            <option value="STAFF_ALL">👥 Todo el Staff de la Conferencia</option>
                            <option value="CHAIRS_ALL">🏛️ Todas las Mesas Directivas</option>
                          </optgroup>
                          <optgroup label="🏛️ Mesas Directivas de Comités">
                            {listaComitesConsolidada.map(c => (
                              <option key={`SEC_CHAIR_${c.id}`} value={`CHAIR_${c.id}`}>🏛️ Mesa de {c.nombre || c.id}</option>
                            ))}
                          </optgroup>
                          <optgroup label="👥 Staff de Salas Asignado">
                            {listaComitesConsolidada.map(c => (
                              <option key={`SEC_STAFF_${c.id}`} value={`STAFF_COMITE_${c.id}`}>👥 Staff de {c.nombre || c.id}</option>
                            ))}
                          </optgroup>
                          <optgroup label="🌐 Sala Completa (Mesa + Delegados)">
                            {listaComitesConsolidada.map(c => (
                              <option key={`SEC_ALL_${c.id}`} value={c.id}>🌐 Sala de {c.nombre || c.id}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.25rem' }}>Emisor</label>
                        <select
                          value={avisoEmisor}
                          onChange={(e) => setAvisoEmisor(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            borderRadius: '8px',
                            border: `1px solid ${borderCol}`,
                            backgroundColor: headerBg,
                            color: 'var(--text-color)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="organizacion">Secretaría / Organización</option>
                          <option value="staff">Staff de Sala</option>
                          <option value="logistica">Logística</option>
                          <option value="mesa">Mesa Directiva</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.25rem' }}>Prioridad</label>
                        <select
                          value={avisoTipo}
                          onChange={(e) => setAvisoTipo(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            borderRadius: '8px',
                            border: `1px solid ${borderCol}`,
                            backgroundColor: headerBg,
                            color: 'var(--text-color)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="info">ℹ️ Información</option>
                          <option value="urgente">🚨 Urgente</option>
                          <option value="alerta">⚠️ Alerta / Logística</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.25rem' }}>Mensaje del Comunicado</label>
                      <textarea
                        required
                        rows={2}
                        value={avisoMensaje}
                        onChange={(e) => setAvisoMensaje(e.target.value)}
                        placeholder="Escribe el aviso que se mostrará en los proyectores y pantallas..."
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: headerBg,
                          color: 'var(--text-color)',
                          fontSize: '0.88rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={enviandoAviso}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: '800',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Send size={15} /> {enviandoAviso ? 'Emitiendo...' : 'Emitir Comunicado'}
                    </button>
                  </form>

                  {/* Avisos Activos */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.65rem' }}>
                      Avisos Activos en el Sistema ({avisosActivos.length})
                    </h4>

                    {avisosActivos.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: textMuted, margin: 0 }}>No hay avisos activos en este momento.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {avisosActivos.map((av) => (
                          <div
                            key={av.id}
                            style={{
                              padding: '0.85rem 1.1rem',
                              borderRadius: '10px',
                              backgroundColor: headerBg,
                              border: `1px solid ${borderCol}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  backgroundColor: av.tipo === 'urgente' ? '#ef4444' : (av.tipo === 'alerta' ? '#f59e0b' : '#3b82f6'),
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: '800',
                                  textTransform: 'uppercase'
                                }}>
                                  {av.emisor}
                                </span>
                                <span style={{ fontSize: '0.76rem', color: textMuted, fontWeight: '600' }}>
                                  Destino: <strong style={{ color: 'var(--text-color)' }}>{getNombreDestino(av.comite_id)}</strong>
                                </span>
                                {av.creado_en && (
                                  <span style={{ fontSize: '0.7rem', color: textMuted }}>
                                    • {av.creado_en}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleDesactivarAviso(av.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  padding: '0.2rem 0.4rem'
                                }}
                              >
                                Descartar
                              </button>
                            </div>

                            <div style={{ fontSize: '0.86rem', color: 'var(--text-color)', lineHeight: '1.4' }}>
                              {formatearMensajeAviso(av.mensaje)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL DE CONFIGURACIÓN INTEGRAL DE COMITÉ (REWORK: ESPACIOSO, MULTI-WIDGET & AJUSTES)
      ════════════════════════════════════════════════════════════════════════ */}
      {comiteEnEdicion && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
              setSecretariaWidgetTab('IMPORTAR');
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '20px',
            width: '96vw',
            maxWidth: '1440px',
            height: '94vh',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden'
          }}>
            {/* Header Modal Editor de Alta Productividad */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: `1px solid ${borderCol}`,
              backgroundColor: headerBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Layers size={24} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={nombreComite || comiteEnEdicion.nombre || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNombreComite(val);
                        setComiteEnEdicion(prev => prev ? { ...prev, nombre: val } : null);
                      }}
                      placeholder="Nombre del comité..."
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '10px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: bgCard,
                        color: 'var(--text-color)',
                        fontSize: '1.15rem',
                        fontWeight: '800',
                        minWidth: '260px',
                        maxWidth: '450px'
                      }}
                    />
                    <code style={{
                      fontSize: '0.74rem',
                      color: textMuted,
                      backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}>
                      ID: {comiteEnEdicion.id}
                    </code>

                    {/* Badges de Estado en Vivo */}
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <Users size={12} /> {paises.length} Delegaciones
                    </span>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <Globe size={12} /> {(agendaSesion?.temas || []).length} Temas
                    </span>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: comiteEditorPinMesa ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: comiteEditorPinMesa ? '#f59e0b' : textMuted,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      {comiteEditorPinMesa ? <Lock size={12} /> : <Unlock size={12} />}
                      {comiteEditorPinMesa ? 'PIN Mesa Activado' : 'Sin PIN de Mesa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción del editor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => ejecutarEntradaMesa(comiteEnEdicion, comiteEditorPinMesa)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}
                  title="Abrir vista de presidencia/moderación directamente para este comité"
                >
                  <Play size={15} /> Entrar como Mesa
                </button>

                <button
                  type="button"
                  onClick={() => handleEliminarComite(comiteEnEdicion.id)}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '10px',
                    backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Eliminar este comité de la conferencia"
                >
                  <Trash2 size={15} /> Eliminar
                </button>

                <button
                  type="button"
                  onClick={handleGuardarCambiosComite}
                  disabled={guardandoComite}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '10px',
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 3px 10px rgba(34, 197, 94, 0.35)'
                  }}
                >
                  <Check size={16} /> {guardandoComite ? 'Guardando en Servidor...' : 'Guardar Cambios'}
                </button>

                <button
                  type="button"
                  onClick={handleCerrarEditorComite}
                  style={{
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Guardar y cerrar ventana"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {guardadoFeedback && (
              <div style={{
                padding: '0.75rem 1.75rem',
                backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
                color: isLight ? '#15803d' : '#4ade80',
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} /> {guardadoFeedback}
              </div>
            )}

            {/* Pestañas de Widgets: Agenda, Importar, Matriz y Ajustes con Badges */}
            <div style={{
              display: 'flex',
              padding: '0.75rem 1.75rem',
              backgroundColor: bgCard,
              borderBottom: `1px solid ${borderCol}`,
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setSecretariaWidgetTab('AGENDA')}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: secretariaWidgetTab === 'AGENDA' ? (isLight ? '#ede9fe' : 'rgba(139, 92, 246, 0.25)') : 'transparent',
                  color: secretariaWidgetTab === 'AGENDA' ? '#8b5cf6' : textMuted,
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Globe size={16} /> Comité & Agenda
              </button>

              <button
                onClick={() => setSecretariaWidgetTab('IMPORTAR')}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: secretariaWidgetTab === 'IMPORTAR' ? (isLight ? '#ede9fe' : 'rgba(139, 92, 246, 0.25)') : 'transparent',
                  color: secretariaWidgetTab === 'IMPORTAR' ? '#8b5cf6' : textMuted,
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileSpreadsheet size={16} /> Importar Países & Delegaciones
                <span style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '12px',
                  backgroundColor: secretariaWidgetTab === 'IMPORTAR' ? '#8b5cf6' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'),
                  color: secretariaWidgetTab === 'IMPORTAR' ? '#ffffff' : textMuted,
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>
                  {paises.length}
                </span>
              </button>

              <button
                onClick={() => setSecretariaWidgetTab('MATRIZ')}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: secretariaWidgetTab === 'MATRIZ' ? (isLight ? '#ede9fe' : 'rgba(139, 92, 246, 0.25)') : 'transparent',
                  color: secretariaWidgetTab === 'MATRIZ' ? '#8b5cf6' : textMuted,
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserCheck size={16} /> Matriz de Países & Asistencia
                <span style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '12px',
                  backgroundColor: secretariaWidgetTab === 'MATRIZ' ? '#8b5cf6' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'),
                  color: secretariaWidgetTab === 'MATRIZ' ? '#ffffff' : textMuted,
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>
                  {paises.length}
                </span>
              </button>

              <button
                onClick={() => setSecretariaWidgetTab('AJUSTES')}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: secretariaWidgetTab === 'AJUSTES' ? (isLight ? '#ede9fe' : 'rgba(139, 92, 246, 0.25)') : 'transparent',
                  color: secretariaWidgetTab === 'AJUSTES' ? '#8b5cf6' : textMuted,
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sliders size={16} /> PIN & Ajustes de Mesa
              </button>
            </div>

            {/* Contenedor Ampliado del Widget Activo */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.75rem',
              backgroundColor: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.2)'
            }}>
              <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem', fontSize: '1rem', fontWeight: '700' }}>Cargando módulo de configuración...</div>}>
                {secretariaWidgetTab === 'AGENDA' && <EstablecerAgenda />}
                {secretariaWidgetTab === 'IMPORTAR' && <ImportarPaises />}
                {secretariaWidgetTab === 'MATRIZ' && <MatrizPaises />}
                {secretariaWidgetTab === 'AJUSTES' && (
                  <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Tarjeta: PIN de Mesa Directiva */}
                    <div style={{
                      backgroundColor: bgCard,
                      border: `1px solid ${borderCol}`,
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <Lock size={20} color="#f59e0b" />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>
                          PIN de Acceso a Mesa Directiva (Presidencia)
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: textMuted, margin: '0 0 1.25rem 0' }}>
                        Protege el rol de presidencia/moderador de este comité con un PIN de acceso opcional. Los delegados no podrán moderar sin esta clave.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ position: 'relative', maxWidth: '420px' }}>
                          <input
                            type={mostrarComiteEditorPinMesa ? 'text' : 'password'}
                            value={comiteEditorPinMesa}
                            onChange={(e) => setComiteEditorPinMesa(e.target.value)}
                            placeholder="Dejar vacío para acceso libre sin PIN"
                            style={{
                              width: '100%',
                              padding: '0.75rem 2.5rem 0.75rem 2.4rem',
                              borderRadius: '10px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: headerBg,
                              color: 'var(--text-color)',
                              fontSize: '0.95rem'
                            }}
                          />
                          <Key
                            size={16}
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: textMuted
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarComiteEditorPinMesa(!mostrarComiteEditorPinMesa)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: textMuted,
                              cursor: 'pointer'
                            }}
                          >
                            {mostrarComiteEditorPinMesa ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        {comiteEditorPinMesa ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} /> PIN configurado para este comité
                            </span>
                            <button
                              type="button"
                              onClick={() => setComiteEditorPinMesa('')}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              (Quitar PIN)
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: textMuted }}>
                            Sin PIN: Cualquier usuario con acceso a la conferencia podrá entrar como Mesa a este comité.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta: Modo de Sesión Inicial */}
                    <div style={{
                      backgroundColor: bgCard,
                      border: `1px solid ${borderCol}`,
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <Sliders size={20} color="#8b5cf6" />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>
                          Tipo de Sesión por Defecto
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: textMuted, margin: '0 0 1.25rem 0' }}>
                        Selecciona el modo de debate en el que iniciará o se encuentra este comité.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                        {[
                          { id: 'formal', label: 'Formal', desc: 'Lista de oradores estándar', color: '#22c55e' },
                          { id: 'informal', label: 'Informal / Caucus', desc: 'Debate moderado / no moderado', color: '#eab308' },
                          { id: 'receso', label: 'En Receso', desc: 'Pausa o receso de debate', color: '#a855f7' },
                          { id: 'votacion', label: 'En Votación', desc: 'Votación de anteproyectos', color: '#3b82f6' }
                        ].map((modo) => (
                          <button
                            key={modo.id}
                            type="button"
                            onClick={() => setComiteEditorTipoSesion(modo.id)}
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              border: `2px solid ${comiteEditorTipoSesion === modo.id ? modo.color : borderCol}`,
                              backgroundColor: comiteEditorTipoSesion === modo.id ? (isLight ? `${modo.color}15` : `${modo.color}25`) : headerBg,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.3rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ fontSize: '0.92rem', fontWeight: '800', color: comiteEditorTipoSesion === modo.id ? modo.color : 'var(--text-color)' }}>
                              {modo.label}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: textMuted }}>
                              {modo.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botón de guardado inferior */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleGuardarCambiosComite}
                        disabled={guardandoComite}
                        style={{
                          padding: '0.85rem 1.75rem',
                          borderRadius: '12px',
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                        }}
                      >
                        <Check size={18} /> {guardandoComite ? 'Guardando...' : 'Guardar Ajustes del Comité'}
                      </button>
                    </div>

                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN de Mesa Directiva al entrar */}
      {comiteSeleccionado && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Lock size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.35rem 0' }}>
              PIN de Mesa Directiva
            </h3>
            <p style={{ fontSize: '0.85rem', color: textMuted, margin: '0 0 1.25rem 0' }}>
              Introduce el PIN para moderar {comiteSeleccionado.nombre}
            </p>

            {pinMesaError && (
              <div style={{
                padding: '0.55rem',
                borderRadius: '6px',
                backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                color: isLight ? '#b91c1c' : '#fca5a5',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600'
              }}>
                {pinMesaError}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              ejecutarEntradaMesa(comiteSeleccionado, pinMesaInput);
            }}>
              <input
                type="password"
                required
                autoFocus
                value={pinMesaInput}
                onChange={(e) => setPinMesaInput(e.target.value)}
                placeholder="PIN de la Mesa"
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.9rem',
                  marginBottom: '1rem'
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setComiteSeleccionado(null)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderCol}`,
                    color: 'var(--text-color)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConferenceView;
