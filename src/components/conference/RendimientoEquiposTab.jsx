import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Lock,
  Unlock,
  Shield,
  Key,
  Eye,
  EyeOff,
  Trophy,
  Clock,
  Mic,
  FileText,
  FileSignature,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  School,
  Award,
  Layers,
  Check,
  Flame,
  Globe,
  RefreshCw,
  GraduationCap,
  Building2,
  ExternalLink,
  LogOut,
  Filter,
  Copy,
  X,
  Trash2,
  CheckCheck
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { normalizarDatosComite } from '../../utils/sessionValidator';
import conferenceService from '../../services/conferenceService';

// Formatear segundos a texto legible
function formatTiempo(segundos = 0) {
  if (!segundos || segundos <= 0) return '0m 00s';
  const horas = Math.floor(segundos / 3600);
  const mins = Math.floor((segundos % 3600) / 60);
  const secs = Math.floor(segundos % 60);
  if (horas > 0) {
    return `${horas}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

// Helper para convertir datos a CSV descargable
function exportarCsvEquipos(equipos, confNombre, nombreEquipoPersonalizado = null) {
  const headers = [
    'Equipo / Institución',
    'Delegación',
    'Alumno / Delegado',
    'Comité',
    'Estatus Asistencia',
    'Tiempo Hablado (segundos)',
    'Tiempo Hablado (legible)',
    'Discursos / Intervenciones',
    'Mociones Propuestas',
    'Mociones Aprobadas',
    'Enmiendas Propuestas',
    'Enmiendas Aprobadas'
  ];

  const filas = [];
  equipos.forEach(eq => {
    if (!eq) return;
    eq.miembros.forEach(m => {
      filas.push([
        `"${eq.nombre.replace(/"/g, '""')}"`,
        `"${m.paisNombre.replace(/"/g, '""')}"`,
        `"${(m.delegado || '').replace(/"/g, '""')}"`,
        `"${m.comiteNombre.replace(/"/g, '""')}"`,
        `"${m.estatus}"`,
        m.segHablados,
        `"${formatTiempo(m.segHablados)}"`,
        m.intervencionesCount,
        m.mocPresentadas,
        m.mocAprobadas,
        m.enmPresentadas,
        m.enmAprobadas
      ].join(';'));
    });
  });

  const contenidoCsv = '\uFEFF' + [headers.join(';'), ...filas].join('\r\n');
  const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nombreSanitizado = (confNombre || 'conferencia').replace(/\s+/g, '_').toLowerCase();
  const fechaStr = new Date().toISOString().slice(0, 10);
  if (nombreEquipoPersonalizado) {
    const eqSanitizado = nombreEquipoPersonalizado.replace(/\s+/g, '_').toLowerCase();
    a.download = `rendimiento_equipo_${eqSanitizado}_${nombreSanitizado}_${fechaStr}.csv`;
  } else {
    a.download = `rendimiento_todos_equipos_${nombreSanitizado}_${fechaStr}.csv`;
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helpers para gestionar contraseñas personalizadas de equipos
function getTeamPinsStorage(confId) {
  if (!confId) return {};
  try {
    const raw = localStorage.getItem(`openmun_conf_faculty_team_pins_${confId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTeamPinsStorage(confId, pinsMap) {
  if (!confId) return;
  try {
    localStorage.setItem(`openmun_conf_faculty_team_pins_${confId}`, JSON.stringify(pinsMap));
  } catch (e) {
    console.warn('Error guardando contraseñas de equipos:', e);
  }
}

const RendimientoEquiposTab = ({
  conferencia,
  listaComites = [],
  isAdmin = false,
  isLight = false,
  onRefresh = null
}) => {
  const confId = conferencia?.id ? String(conferencia.id).toLowerCase().trim() : '';

  // ── 1. EXTRACCIÓN Y AGREGACIÓN DE DATOS DE RENDIMIENTO ──
  const datosEquipos = useMemo(() => {
    const mapaEquipos = new Map();

    listaComites.forEach(comite => {
      if (!comite) return;
      const cleanNom = comite.nombre || comite.id || 'Comité';

      // Cargar datos normalizados del comité
      let rawData = comite.datos_json || {};
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch { rawData = {}; }
      }
      if (!rawData.paises || !Array.isArray(rawData.paises) || rawData.paises.length === 0) {
        try {
          const local = localStorage.getItem(`openmun_comite_data_${comite.id}`);
          if (local) rawData = JSON.parse(local);
        } catch {}
      }

      const datosComite = normalizarDatosComite(rawData, cleanNom) || {};
      const paises = datosComite.paises || [];
      const intervenciones = datosComite.registroIntervenciones || [];
      const mociones = datosComite.historicoMociones?.length > 0 ? datosComite.historicoMociones : (datosComite.mociones || []);
      const enmiendas = datosComite.enmiendasSesion?.enmiendas || [];

      paises.forEach(p => {
        const pNombreNorm = (p.nombre || '').toLowerCase().trim();
        if (!pNombreNorm) return;

        // Estadísticas individuales en este comité
        const intervencionesPais = intervenciones.filter(i => {
          const n = (i.pais || i.orador || '').toLowerCase().trim();
          return n === pNombreNorm;
        });

        const segHablados = intervencionesPais.reduce((acc, curr) => {
          return acc + (curr.tiempoHabladoExacto || curr.tiempoHablado || 0);
        }, 0);

        const intervencionesCount = intervencionesPais.length;

        const mocPresentadas = mociones.filter(m => {
          return (m.proponente || '').toLowerCase().trim() === pNombreNorm;
        }).length;

        const mocAprobadas = mociones.filter(m => {
          const prop = (m.proponente || '').toLowerCase().trim();
          const st = (m.estado || '').toLowerCase().trim();
          return prop === pNombreNorm && (st === 'aprobada' || st === 'aprobado');
        }).length;

        const enmPresentadas = enmiendas.filter(e => {
          const prop = (e.paisProponente || e.proponente || '').toLowerCase().trim();
          return prop === pNombreNorm;
        }).length;

        const enmAprobadas = enmiendas.filter(e => {
          const prop = (e.paisProponente || e.proponente || '').toLowerCase().trim();
          const st = (e.estado || '').toLowerCase().trim();
          return prop === pNombreNorm && (st === 'aceptada' || st === 'aceptado' || st === 'aprobada' || st === 'aprobado');
        }).length;

        // Insignias individuales
        const insignias = [];
        if (segHablados >= 300) insignias.push('🗣️ Gran Oratoria');
        if (mocAprobadas >= 2) insignias.push('📜 Líder de Mociones');
        if (enmAprobadas >= 1) insignias.push('✍️ Redactor Clave');
        if (p.estatus === 'Presente y Votando') insignias.push('🗳️ Quórum Comprometido');

        const miembro = {
          paisId: p.id,
          paisNombre: p.nombre,
          delegado: p.delegado || '',
          bandera: p.bandera,
          veto: p.veto,
          estatus: p.estatus || 'Ausente',
          comiteId: comite.id,
          comiteNombre: cleanNom,
          segHablados,
          intervencionesCount,
          mocPresentadas,
          mocAprobadas,
          enmPresentadas,
          enmAprobadas,
          insignias
        };

        const equipoKey = (p.equipo && p.equipo.trim()) ? p.equipo.trim() : 'Sin Equipo Asignado';

        if (!mapaEquipos.has(equipoKey)) {
          mapaEquipos.set(equipoKey, {
            nombre: equipoKey,
            esSinEquipo: equipoKey === 'Sin Equipo Asignado',
            miembros: [],
            totalSegundos: 0,
            totalIntervenciones: 0,
            totalMociones: 0,
            totalMocionesAprobadas: 0,
            totalEnmiendas: 0,
            totalEnmiendasAprobadas: 0,
            comitesSet: new Set(),
            asistencia: { presente: 0, presenteVotando: 0, ausente: 0 }
          });
        }

        const eqData = mapaEquipos.get(equipoKey);
        eqData.miembros.push(miembro);
        eqData.totalSegundos += segHablados;
        eqData.totalIntervenciones += intervencionesCount;
        eqData.totalMociones += mocPresentadas;
        eqData.totalMocionesAprobadas += mocAprobadas;
        eqData.totalEnmiendas += enmPresentadas;
        eqData.totalEnmiendasAprobadas += enmAprobadas;
        eqData.comitesSet.add(cleanNom);

        if (p.estatus === 'Presente y Votando') eqData.asistencia.presenteVotando++;
        else if (p.estatus === 'Presente') eqData.asistencia.presente++;
        else eqData.asistencia.ausente++;
      });
    });

    return Array.from(mapaEquipos.values()).map(eq => ({
      ...eq,
      totalComites: eq.comitesSet.size,
      tasaMociones: eq.totalMociones > 0 ? Math.round((eq.totalMocionesAprobadas / eq.totalMociones) * 100) : 0,
      tasaAsistencia: eq.miembros.length > 0
        ? Math.round(((eq.asistencia.presente + eq.asistencia.presenteVotando) / eq.miembros.length) * 100)
        : 0
    }));
  }, [listaComites]);

  // Lista única de nombres de equipos ordenados
  const nombresEquipos = useMemo(() => {
    return datosEquipos.filter(e => !e.esSinEquipo).map(e => e.nombre).sort((a, b) => a.localeCompare(b, 'es'));
  }, [datosEquipos]);

  // ── 2. ESTADO DE AUTENTICACIÓN Y ROLES ──
  // Rol: 'ORGANIZACION' (ve todos los equipos) | 'FACULTY' (solo ve su equipo)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (isAdmin) return true;
    if (!confId) return false;
    try {
      const auth = localStorage.getItem(`openmun_conf_faculty_auth_${confId}`) ||
                   sessionStorage.getItem(`openmun_conf_faculty_auth_${confId}`);
      return Boolean(auth);
    } catch {
      return false;
    }
  });

  const [authRole, setAuthRole] = useState(() => {
    if (isAdmin) return 'ORGANIZACION';
    if (!confId) return null;
    try {
      const saved = localStorage.getItem(`openmun_conf_equipos_role_${confId}`) ||
                    sessionStorage.getItem(`openmun_conf_equipos_role_${confId}`);
      if (saved) return saved;
      const auth = localStorage.getItem(`openmun_conf_faculty_auth_${confId}`);
      return auth ? 'FACULTY' : null;
    } catch {
      return null;
    }
  });

  const [facultyTeam, setFacultyTeam] = useState(() => {
    if (!confId) return '';
    try {
      return localStorage.getItem(`openmun_conf_equipos_team_${confId}`) ||
             sessionStorage.getItem(`openmun_conf_equipos_team_${confId}`) || '';
    } catch {
      return '';
    }
  });

  // Vista activa: 'ORGANIZACION' (todos los equipos) | 'FACULTY' (solo su equipo)
  const [viewMode, setViewMode] = useState(() => {
    if (isAdmin) return 'ORGANIZACION';
    try {
      const savedRole = localStorage.getItem(`openmun_conf_equipos_role_${confId}`);
      return savedRole === 'ORGANIZACION' ? 'ORGANIZACION' : 'FACULTY';
    } catch {
      return 'ORGANIZACION';
    }
  });

  // Equipo previsualizado cuando la Organización desea ver la vista Faculty
  const [previewTeam, setPreviewTeam] = useState(() => nombresEquipos[0] || '');

  // Sincronizar equipo inicial para previsualización si cambia la lista
  useEffect(() => {
    if (!previewTeam && nombresEquipos.length > 0) {
      setPreviewTeam(nombresEquipos[0]);
    }
  }, [nombresEquipos, previewTeam]);

  // Sincronizar si entra como admin de la conferencia
  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticated(true);
      setAuthRole('ORGANIZACION');
      setViewMode(prev => prev || 'ORGANIZACION');
    }
  }, [isAdmin]);

  // ── ESTADOS DEL FORMULARIO DE ACCESO ──
  const [loginMode, setLoginMode] = useState('FACULTY'); // 'FACULTY' | 'ORGANIZACION'
  const [selectedTeamForLogin, setSelectedTeamForLogin] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inicializar equipo de login si hay alguno
  useEffect(() => {
    if (!selectedTeamForLogin && nombresEquipos.length > 0) {
      setSelectedTeamForLogin(nombresEquipos[0]);
    }
  }, [nombresEquipos, selectedTeamForLogin]);

  // ── ESTADOS DE FILTROS PARA VISTA ORGANIZACIÓN ──
  const [filtroEquipoOrg, setFiltroEquipoOrg] = useState('TODOS');
  const [busquedaOrg, setBusquedaOrg] = useState('');
  const [ordenOrg, setOrdenOrg] = useState('TIEMPO'); // 'TIEMPO' | 'MOCIONES' | 'ALFABETICO'
  const [equiposExpandidos, setEquiposExpandidos] = useState({});

  // ── ESTADOS DE FILTROS PARA VISTA FACULTY ──
  const [busquedaFaculty, setBusquedaFaculty] = useState('');
  const [filtroComiteFaculty, setFiltroComiteFaculty] = useState('TODOS');
  const [filtroAsistenciaFaculty, setFiltroAsistenciaFaculty] = useState('TODOS'); // 'TODOS' | 'PRESENTE' | 'AUSENTE'
  const [ordenFaculty, setOrdenFaculty] = useState('TIEMPO');

  // ── ESTADOS PARA GESTIÓN DE CONTRASEÑAS DE FACULTIES (VISTA ORGANIZACIÓN) ──
  const [modalClavesOpen, setModalClavesOpen] = useState(false);
  const [tabClavesModal, setTabClavesModal] = useState('GENERAL'); // 'GENERAL' | 'EQUIPOS'
  const [selectedTeamInModal, setSelectedTeamInModal] = useState('');
  const [generalPinInput, setGeneralPinInput] = useState(() => {
    if (!confId) return '';
    try {
      return localStorage.getItem(`openmun_conf_faculty_pin_${confId}`) || '';
    } catch {
      return '';
    }
  });
  const [showGeneralPin, setShowGeneralPin] = useState(false);
  const [teamPins, setTeamPins] = useState(() => getTeamPinsStorage(confId));
  const [teamPinInputs, setTeamPinInputs] = useState({});
  const [showTeamPins, setShowTeamPins] = useState({});
  const [busquedaEquipoModal, setBusquedaEquipoModal] = useState('');
  const [feedbackClavesModal, setFeedbackClavesModal] = useState(null);
  const [copiadoFeedback, setCopiadoFeedback] = useState(null);

  // Sincronizar pines cuando se abre el modal
  useEffect(() => {
    if (modalClavesOpen && confId) {
      const pinGen = localStorage.getItem(`openmun_conf_faculty_pin_${confId}`) || '';
      setGeneralPinInput(pinGen);
      const pins = getTeamPinsStorage(confId);
      setTeamPins(pins);
      setTeamPinInputs(pins);
      setFeedbackClavesModal(null);
    }
  }, [modalClavesOpen, confId]);

  // Si se selecciona un equipo específico para editar clave, cambiar al tab de equipos
  useEffect(() => {
    if (selectedTeamInModal) {
      setTabClavesModal('EQUIPOS');
      setBusquedaEquipoModal(selectedTeamInModal);
    }
  }, [selectedTeamInModal]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!modalClavesOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setModalClavesOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalClavesOpen]);

  // Guardar PIN General de Faculties
  const handleGuardarGeneralPin = () => {
    const nuevoPin = generalPinInput.trim();
    try {
      if (nuevoPin) {
        localStorage.setItem(`openmun_conf_faculty_pin_${confId}`, nuevoPin);
      } else {
        localStorage.removeItem(`openmun_conf_faculty_pin_${confId}`);
      }
      setFeedbackClavesModal({
        type: 'success',
        text: nuevoPin
          ? '¡Contraseña general para todos los Faculties guardada correctamente!'
          : 'Contraseña general eliminada. Los Faculties accederán con el PIN de Organización o sin clave.'
      });
      setTimeout(() => setFeedbackClavesModal(null), 4000);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openmun_faculty_pin_updated', { detail: { pin: nuevoPin } }));
      }
    } catch (e) {
      setFeedbackClavesModal({ type: 'error', text: 'Error al guardar la contraseña general.' });
    }
  };

  // Generar PIN aleatorio para el General
  const handleGenerarPinGeneral = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneralPinInput(randomPin);
    setShowGeneralPin(true);
  };

  // Guardar PIN específico para un equipo
  const handleGuardarPinEquipo = (teamNombre) => {
    const pinVal = (teamPinInputs[teamNombre] ?? teamPins[teamNombre] ?? '').trim();
    const nuevosPins = { ...teamPins };
    if (pinVal) {
      nuevosPins[teamNombre] = pinVal;
    } else {
      delete nuevosPins[teamNombre];
    }
    setTeamPins(nuevosPins);
    saveTeamPinsStorage(confId, nuevosPins);
    setFeedbackClavesModal({
      type: 'success',
      text: pinVal
        ? `¡Contraseña guardada exclusivamente para "${teamNombre}"!`
        : `Contraseña específica eliminada para "${teamNombre}". Ahora utilizará el PIN General.`
    });
    setTimeout(() => setFeedbackClavesModal(null), 4000);
  };

  // Generar PIN aleatorio para un equipo
  const handleGenerarPinEquipo = (teamNombre) => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setTeamPinInputs(prev => ({ ...prev, [teamNombre]: randomPin }));
    setShowTeamPins(prev => ({ ...prev, [teamNombre]: true }));
  };

  // Restablecer / eliminar PIN específico de equipo (vuelve a general)
  const handleRestablecerPinEquipo = (teamNombre) => {
    const nuevosPins = { ...teamPins };
    delete nuevosPins[teamNombre];
    setTeamPins(nuevosPins);
    saveTeamPinsStorage(confId, nuevosPins);
    setTeamPinInputs(prev => {
      const copy = { ...prev };
      delete copy[teamNombre];
      return copy;
    });
    setFeedbackClavesModal({
      type: 'info',
      text: `"${teamNombre}" ahora utiliza la contraseña general de Faculties.`
    });
    setTimeout(() => setFeedbackClavesModal(null), 4000);
  };

  // Copiar credenciales formateadas de acceso para compartir con el asesor/a
  const handleCopiarCredenciales = async (teamNombre) => {
    const pinEspecifico = teamPins[teamNombre]?.trim();
    const pinGeneral = generalPinInput.trim();
    const pinEfectivo = pinEspecifico || pinGeneral || '(Sin contraseña configurada)';
    const urlActual = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

    const mensaje = [
      `🏛️ OpenMUN — Credenciales de Acceso Faculty Advisor`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 Conferencia: ${conferencia?.nombre || 'OpenMUN'}`,
      `🏫 Equipo / Institución: ${teamNombre}`,
      `🔑 Contraseña de Acceso: ${pinEfectivo}`,
      pinEspecifico ? `ℹ️ Tipo: Contraseña exclusiva de tu colegio` : (pinGeneral ? `ℹ️ Tipo: Clave general de asesores` : `ℹ️ Acceso libre`),
      `🔗 Enlace: ${urlActual}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Instrucciones: En la pestaña "Rendimiento de Equipos", selecciona el modo "Faculty Advisor", elige "${teamNombre}" e introduce la contraseña.`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiadoFeedback(teamNombre);
      setTimeout(() => setCopiadoFeedback(null), 2500);
    } catch {
      // Fallback
    }
  };

  // Refresco manual de datos
  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.warn('Error al refrescar datos de comités:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Auto-refresco en segundo plano cada 20s cuando está autenticado
  useEffect(() => {
    if (!isAuthenticated || !onRefresh) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onRefresh();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, onRefresh]);

  // ── PROCESAMIENTO DE AUTENTICACIÓN ──
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const pin = passwordInput.trim();
    setAuthError(null);

    if (loginMode === 'FACULTY' && !selectedTeamForLogin) {
      setAuthError('Por favor selecciona tu colegio o equipo de la lista.');
      return;
    }

    setIsVerifying(true);

    try {
      if (loginMode === 'ORGANIZACION') {
        // ── LOGIN ORGANIZACIÓN (Todos los equipos) ──
        const adminPinGuardado = localStorage.getItem(`openmun_conf_admin_pin_${confId}`) || conferencia?.pin_admin || '';
        let esAdminValido = false;

        if (adminPinGuardado && adminPinGuardado.trim() === pin) {
          esAdminValido = true;
        } else if (pin) {
          try {
            await conferenceService.verificarAdmin(confId, pin);
            esAdminValido = true;
          } catch {}
        } else if (!adminPinGuardado) {
          esAdminValido = true;
        }

        if (esAdminValido) {
          setIsAuthenticated(true);
          setAuthRole('ORGANIZACION');
          setViewMode('ORGANIZACION');
          localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
          localStorage.setItem(`openmun_conf_equipos_role_${confId}`, 'ORGANIZACION');
          setPasswordInput('');
          return;
        }

        setAuthError('PIN de Organización incorrecto. Solo la secretaría general y administradores pueden acceder a esta vista.');
        return;
      }

      // ── LOGIN FACULTY ADVISOR (Solo su equipo) ──
      const facultyPin = localStorage.getItem(`openmun_conf_faculty_pin_${confId}`) || '';
      const storedTeamPins = getTeamPinsStorage(confId);
      const teamSpecificPin = selectedTeamForLogin ? (storedTeamPins[selectedTeamForLogin] || '').trim() : '';
      const adminPinGuardado = localStorage.getItem(`openmun_conf_admin_pin_${confId}`) || conferencia?.pin_admin || '';
      const accessPin = localStorage.getItem(`openmun_conf_pin_${confId}`) || conferencia?.pin_acceso || '';

      let esFacultyValido = false;

      // 1. PIN de profesores específico para este equipo
      if (teamSpecificPin && teamSpecificPin === pin) {
        esFacultyValido = true;
      }
      // 2. PIN de profesores general para toda la conferencia
      else if (facultyPin && facultyPin.trim() === pin) {
        esFacultyValido = true;
      }
      // 3. PIN de admin de organización también autoriza
      else if (adminPinGuardado && adminPinGuardado.trim() === pin) {
        esFacultyValido = true;
      }
      // 4. PIN de acceso general a la conferencia
      else if (accessPin && accessPin.trim() === pin) {
        esFacultyValido = true;
      }
      // 5. Verificación remota admin
      else if (pin) {
        try {
          await conferenceService.verificarAdmin(confId, pin);
          esFacultyValido = true;
        } catch {}
      }
      // 6. Sin contraseña configurada (ni específica para este equipo, ni general, ni admin)
      else if (!teamSpecificPin && !facultyPin && !adminPinGuardado && !accessPin) {
        esFacultyValido = true;
      }

      if (esFacultyValido) {
        setIsAuthenticated(true);
        setAuthRole('FACULTY');
        setFacultyTeam(selectedTeamForLogin);
        setViewMode('FACULTY');
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        localStorage.setItem(`openmun_conf_equipos_role_${confId}`, 'FACULTY');
        localStorage.setItem(`openmun_conf_equipos_team_${confId}`, selectedTeamForLogin);
        setPasswordInput('');
        return;
      }

      setAuthError('Contraseña incorrecta. Contacta a la organización del evento si necesitas el PIN de profesores.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCerrarSesion = () => {
    setIsAuthenticated(false);
    setAuthRole(null);
    setFacultyTeam('');
    setPasswordInput('');
    setAuthError(null);
    try {
      localStorage.removeItem(`openmun_conf_faculty_auth_${confId}`);
      sessionStorage.removeItem(`openmun_conf_faculty_auth_${confId}`);
      localStorage.removeItem(`openmun_conf_equipos_role_${confId}`);
      localStorage.removeItem(`openmun_conf_equipos_team_${confId}`);
    } catch {}
  };

  // ── DATOS FILTRADOS: VISTA ORGANIZACIÓN (TODOS LOS EQUIPOS) ──
  const equiposFiltradosOrg = useMemo(() => {
    let resultado = datosEquipos;

    if (filtroEquipoOrg !== 'TODOS') {
      resultado = resultado.filter(e => e.nombre === filtroEquipoOrg);
    }

    if (busquedaOrg.trim()) {
      const q = busquedaOrg.toLowerCase().trim();
      resultado = resultado.filter(e => {
        const matchNombre = e.nombre.toLowerCase().includes(q);
        const matchMiembros = e.miembros.some(m =>
          m.paisNombre.toLowerCase().includes(q) ||
          m.comiteNombre.toLowerCase().includes(q) ||
          (m.delegado && m.delegado.toLowerCase().includes(q))
        );
        return matchNombre || matchMiembros;
      });
    }

    return [...resultado].sort((a, b) => {
      if (a.esSinEquipo && !b.esSinEquipo) return 1;
      if (!a.esSinEquipo && b.esSinEquipo) return -1;
      if (ordenOrg === 'TIEMPO') return b.totalSegundos - a.totalSegundos;
      if (ordenOrg === 'MOCIONES') return b.totalMocionesAprobadas - a.totalMocionesAprobadas;
      if (ordenOrg === 'ALFABETICO') return a.nombre.localeCompare(b.nombre, 'es');
      return 0;
    });
  }, [datosEquipos, filtroEquipoOrg, busquedaOrg, ordenOrg]);

  // KPIs Globales de Toda la Conferencia (Organización)
  const kpisGlobales = useMemo(() => {
    const equiposReales = datosEquipos.filter(e => !e.esSinEquipo);
    const totalDelegaciones = datosEquipos.reduce((acc, e) => acc + e.miembros.length, 0);
    const totalSegundos = datosEquipos.reduce((acc, e) => acc + e.totalSegundos, 0);
    const totalMocionesAprobadas = datosEquipos.reduce((acc, e) => acc + e.totalMocionesAprobadas, 0);
    const totalMociones = datosEquipos.reduce((acc, e) => acc + e.totalMociones, 0);
    const equipoLider = [...equiposReales].sort((a, b) => b.totalSegundos - a.totalSegundos)[0] || null;

    return {
      totalEquipos: equiposReales.length,
      totalDelegaciones,
      totalSegundos,
      totalMocionesAprobadas,
      totalMociones,
      equipoLider
    };
  }, [datosEquipos]);

  // ── DATOS FILTRADOS: VISTA FACULTY ADVISOR (SOLO SU EQUIPO) ──
  const nombreEquipoActualFaculty = authRole === 'ORGANIZACION'
    ? (previewTeam || nombresEquipos[0] || '')
    : facultyTeam;

  const equipoActualFaculty = useMemo(() => {
    if (!nombreEquipoActualFaculty) return null;
    return datosEquipos.find(e => e.nombre.toLowerCase().trim() === nombreEquipoActualFaculty.toLowerCase().trim()) || null;
  }, [datosEquipos, nombreEquipoActualFaculty]);

  // Comités en los que participa este equipo
  const comitesEquipoFaculty = useMemo(() => {
    if (!equipoActualFaculty) return [];
    return Array.from(equipoActualFaculty.comitesSet || []).sort((a, b) => a.localeCompare(b, 'es'));
  }, [equipoActualFaculty]);

  // Miembros filtrados del equipo en Faculty View
  const miembrosFiltradosFaculty = useMemo(() => {
    if (!equipoActualFaculty) return [];
    let list = equipoActualFaculty.miembros || [];

    if (busquedaFaculty.trim()) {
      const q = busquedaFaculty.toLowerCase().trim();
      list = list.filter(m =>
        m.paisNombre.toLowerCase().includes(q) ||
        m.comiteNombre.toLowerCase().includes(q) ||
        (m.delegado && m.delegado.toLowerCase().includes(q))
      );
    }

    if (filtroComiteFaculty !== 'TODOS') {
      list = list.filter(m => m.comiteNombre === filtroComiteFaculty);
    }

    if (filtroAsistenciaFaculty !== 'TODOS') {
      if (filtroAsistenciaFaculty === 'PRESENTE') {
        list = list.filter(m => m.estatus === 'Presente' || m.estatus === 'Presente y Votando');
      } else if (filtroAsistenciaFaculty === 'AUSENTE') {
        list = list.filter(m => m.estatus === 'Ausente');
      }
    }

    return [...list].sort((a, b) => {
      if (ordenFaculty === 'TIEMPO') return b.segHablados - a.segHablados;
      if (ordenFaculty === 'MOCIONES') return b.mocAprobadas - a.mocAprobadas;
      if (ordenFaculty === 'ALFABETICO') return a.paisNombre.localeCompare(b.paisNombre, 'es');
      return 0;
    });
  }, [equipoActualFaculty, busquedaFaculty, filtroComiteFaculty, filtroAsistenciaFaculty, ordenFaculty]);

  const toggleExpandir = (nombreEq) => {
    setEquiposExpandidos(prev => ({
      ...prev,
      [nombreEq]: prev[nombreEq] === undefined ? false : !prev[nombreEq]
    }));
  };

  const expandirTodos = () => {
    const nuevo = {};
    datosEquipos.forEach(e => { nuevo[e.nombre] = true; });
    setEquiposExpandidos(nuevo);
  };

  const colapsarTodos = () => {
    const nuevo = {};
    datosEquipos.forEach(e => { nuevo[e.nombre] = false; });
    setEquiposExpandidos(nuevo);
  };

  // Colores y tokens según tema
  const bgCard = isLight ? '#ffffff' : 'var(--panel-color)';
  const borderCol = 'var(--border-color)';
  const textMuted = 'var(--muted-text)';
  const headerBg = isLight ? '#f1f5f9' : 'var(--card-header-bg)';

  // ─────────────────────────────────────────────────────────────
  // PANTALLA DE ACCESO / AUTENTICACIÓN (CUANDO NO ESTÁ AUTENTICADO)
  // ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{
        maxWidth: '520px',
        margin: '2.5rem auto',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '16px',
        padding: '2.2rem 1.8rem',
        boxShadow: isLight
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
          : '0 15px 35px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Cabecera del Modal */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '58px',
            height: '58px',
            borderRadius: '16px',
            backgroundColor: loginMode === 'FACULTY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            color: loginMode === 'FACULTY' ? '#10b981' : '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            transition: 'all 0.2s ease'
          }}>
            {loginMode === 'FACULTY' ? <GraduationCap size={32} /> : <Shield size={30} />}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: 'var(--text-color)' }}>
            Rendimiento de Equipos & Alumnos
          </h2>
          <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
            Acceso protegido según rol para supervisión académica de <strong>{conferencia?.nombre || 'la Conferencia'}</strong>.
          </p>
        </div>

        {/* Pestañas de Selección de Modo (Organización vs Faculty) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.4rem',
          backgroundColor: headerBg,
          padding: '0.35rem',
          borderRadius: '10px',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => { setLoginMode('FACULTY'); setAuthError(null); }}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: loginMode === 'FACULTY' ? (isLight ? '#ffffff' : '#27272a') : 'transparent',
              color: loginMode === 'FACULTY' ? '#10b981' : textMuted,
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: loginMode === 'FACULTY' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <GraduationCap size={16} /> Faculty Advisor
          </button>

          <button
            type="button"
            onClick={() => { setLoginMode('ORGANIZACION'); setAuthError(null); }}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: loginMode === 'ORGANIZACION' ? (isLight ? '#ffffff' : '#27272a') : 'transparent',
              color: loginMode === 'ORGANIZACION' ? '#6366f1' : textMuted,
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: loginMode === 'ORGANIZACION' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={16} /> Organización
          </button>
        </div>

        {authError && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: isLight ? '#b91c1c' : '#fca5a5',
            fontSize: '0.84rem',
            marginBottom: '1.25rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* Si está en modo Faculty Advisor: Selección de Equipo / Colegio */}
          {loginMode === 'FACULTY' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                Selecciona tu Colegio / Equipo
              </label>
              {nombresEquipos.length > 0 ? (
                <select
                  required
                  value={selectedTeamForLogin}
                  onChange={(e) => setSelectedTeamForLogin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: 'var(--text-color)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {nombresEquipos.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: isLight ? '#92400e' : '#fcd34d',
                  fontSize: '0.8rem',
                  lineHeight: '1.4'
                }}>
                  ⚠️ Aún no se han configurado equipos en los comités de la conferencia. La organización debe asignarlos a las delegaciones en la Matriz de Países.
                </div>
              )}
              <span style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.35rem', display: 'block' }}>
                Solo podrás visualizar el rendimiento y los alumnos de este equipo.
              </span>
            </div>
          ) : (
            <div style={{
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.8rem',
              color: 'var(--text-color)',
              lineHeight: '1.45'
            }}>
              🏛️ <strong>Vista Integral de Organización:</strong> Permite consultar el rendimiento consolidado de <strong>TODOS</strong> los equipos y colegios participantes con métricas comparativas.
            </div>
          )}

          {/* Campo de Contraseña */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
              {loginMode === 'FACULTY' ? 'Contraseña de Profesores / Faculty' : 'PIN de Organización / Secretaría'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={loginMode === 'FACULTY' ? 'Ingresa el PIN de profesores...' : 'Ingresa el PIN de admin...'}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.6rem 0.75rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isVerifying || (loginMode === 'FACULTY' && nombresEquipos.length === 0)}
            style={{
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: loginMode === 'FACULTY' ? '#10b981' : '#6366f1',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: '800',
              cursor: isVerifying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: loginMode === 'FACULTY'
                ? '0 4px 12px rgba(16, 185, 129, 0.25)'
                : '0 4px 12px rgba(99, 102, 241, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Key size={16} />
            {isVerifying ? 'Verificando...' : (
              loginMode === 'FACULTY'
                ? `Acceder a ${selectedTeamForLogin || 'mi Equipo'}`
                : 'Acceder a Todos los Equipos'
            )}
          </button>
        </form>

        <p style={{ fontSize: '0.74rem', color: textMuted, marginTop: '1.25rem', marginBottom: 0, textAlign: 'center' }}>
          🔒 El acceso está protegido para garantizar la confidencialidad y privacidad entre delegaciones.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODAL DE GESTIÓN DE CONTRASEÑAS FACULTY (GENERAL Y POR EQUIPO)
  // ─────────────────────────────────────────────────────────────
  const renderModalGestionClaves = () => {
    if (!modalClavesOpen) return null;

    const equiposFiltradosModal = nombresEquipos.filter(nombre => {
      if (!busquedaEquipoModal.trim()) return true;
      return nombre.toLowerCase().includes(busquedaEquipoModal.toLowerCase().trim());
    });

    const cantidadPersonalizadas = Object.keys(teamPins).length;

    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalClavesOpen(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        <div
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isLight
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }}
        >
          {/* Cabecera del Modal */}
          <div
            style={{
              padding: '1.2rem 1.4rem',
              backgroundColor: headerBg,
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: isLight ? '#b45309' : '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Key size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)' }}>
                  Contraseñas de Acceso Faculty Advisors
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: textMuted }}>
                  Control de credenciales para profesores y colegios en <strong>{conferencia?.nombre || 'la Conferencia'}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalClavesOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: textMuted,
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner de Feedback (si existe) */}
          {feedbackClavesModal && (
            <div
              style={{
                margin: '1rem 1.4rem 0 1.4rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor:
                  feedbackClavesModal.type === 'success'
                    ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)')
                    : feedbackClavesModal.type === 'error'
                      ? (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)')
                      : (isLight ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)'),
                color:
                  feedbackClavesModal.type === 'success'
                    ? '#16a34a'
                    : feedbackClavesModal.type === 'error'
                      ? '#dc2626'
                      : '#0284c7',
                border: `1px solid ${
                  feedbackClavesModal.type === 'success'
                    ? 'rgba(34, 197, 94, 0.3)'
                    : feedbackClavesModal.type === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(2, 132, 199, 0.3)'
                }`
              }}
            >
              {feedbackClavesModal.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackClavesModal.text}</span>
            </div>
          )}

          {/* Selector de Pestañas (General vs Por Equipo) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
              padding: '0.8rem 1.4rem 0.4rem 1.4rem'
            }}
          >
            <button
              type="button"
              onClick={() => { setTabClavesModal('GENERAL'); setSelectedTeamInModal(''); }}
              style={{
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${tabClavesModal === 'GENERAL' ? 'rgba(234, 179, 8, 0.4)' : borderCol}`,
                backgroundColor: tabClavesModal === 'GENERAL'
                  ? (isLight ? '#fefce8' : 'rgba(234, 179, 8, 0.12)')
                  : headerBg,
                color: tabClavesModal === 'GENERAL'
                  ? (isLight ? '#b45309' : '#fbbf24')
                  : textMuted,
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Key size={15} /> Contraseña General
              {generalPinInput.trim() && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontWeight: '800'
                  }}
                >
                  Activa
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabClavesModal('EQUIPOS')}
              style={{
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${tabClavesModal === 'EQUIPOS' ? 'rgba(99, 102, 241, 0.4)' : borderCol}`,
                backgroundColor: tabClavesModal === 'EQUIPOS'
                  ? (isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.12)')
                  : headerBg,
                color: tabClavesModal === 'EQUIPOS'
                  ? '#6366f1'
                  : textMuted,
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              <School size={15} /> Por Colegio / Equipo
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: cantidadPersonalizadas > 0 ? '#6366f1' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'),
                  color: cantidadPersonalizadas > 0 ? '#ffffff' : textMuted,
                  fontWeight: '800'
                }}
              >
                {cantidadPersonalizadas > 0 ? `${cantidadPersonalizadas} propias` : `${nombresEquipos.length} equipos`}
              </span>
            </button>
          </div>

          {/* Cuerpo del Modal con Scroll */}
          <div style={{ padding: '1rem 1.4rem 1.4rem 1.4rem', overflowY: 'auto', flex: 1 }}>
            
            {/* ── TAB 1: CONTRASEÑA GENERAL ── */}
            {tabClavesModal === 'GENERAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${borderCol}`,
                    fontSize: '0.82rem',
                    color: textMuted,
                    lineHeight: '1.45'
                  }}
                >
                  <p style={{ margin: '0 0 0.4rem 0', fontWeight: '700', color: 'var(--text-color)' }}>
                    🔑 ¿Cómo funciona la Contraseña General?
                  </p>
                  Esta contraseña es compartida por defecto entre todos los profesores y asesores del evento. Si un colegio no tiene configurada una clave específica individual, sus profesores podrán ingresar utilizando esta contraseña para ver exclusivamente los datos de su delegación.
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      marginBottom: '0.4rem',
                      color: 'var(--text-color)'
                    }}
                  >
                    Contraseña General de Faculties
                  </label>

                  <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showGeneralPin ? 'text' : 'password'}
                        value={generalPinInput}
                        onChange={(e) => setGeneralPinInput(e.target.value)}
                        placeholder="Ej. PROF2026 o PIN de 6 dígitos"
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.8rem 0.75rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: headerBg,
                          color: 'var(--text-color)',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          letterSpacing: showGeneralPin ? 'normal' : '0.15em',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeneralPin(!showGeneralPin)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: textMuted,
                          cursor: 'pointer',
                          display: 'flex',
                          padding: '4px'
                        }}
                        title={showGeneralPin ? 'Ocultar' : 'Mostrar'}
                      >
                        {showGeneralPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerarPinGeneral}
                      style={{
                        padding: '0.75rem 0.95rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Generar un PIN aleatorio de 6 dígitos"
                    >
                      <Sparkles size={14} color="#f59e0b" />
                      Generar PIN
                    </button>
                  </div>

                  <span style={{ fontSize: '0.74rem', color: textMuted, marginTop: '0.35rem', display: 'block' }}>
                    {generalPinInput.trim()
                      ? `Estado actual: Requiere introducir "${showGeneralPin ? generalPinInput.trim() : '••••••'}" para acceder como Faculty.`
                      : 'Sin contraseña configurada: Los asesores podrán ingresar con el PIN de Organización o libremente si no hay clave.'}
                  </span>
                </div>

                {/* Acciones para el PIN General */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleGuardarGeneralPin}
                    style={{
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <Check size={16} /> Guardar Contraseña General
                  </button>

                  {generalPinInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setGeneralPinInput('');
                        localStorage.removeItem(`openmun_conf_faculty_pin_${confId}`);
                        setFeedbackClavesModal({
                          type: 'info',
                          text: 'Contraseña general de Faculties eliminada.'
                        });
                        setTimeout(() => setFeedbackClavesModal(null), 3000);
                      }}
                      style={{
                        padding: '0.7rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                        color: isLight ? '#dc2626' : '#f87171',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Trash2 size={14} /> Eliminar Clave
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 2: CONTRASEÑAS ESPECÍFICAS POR EQUIPO ── */}
            {tabClavesModal === 'EQUIPOS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${borderCol}`,
                    fontSize: '0.82rem',
                    color: textMuted,
                    lineHeight: '1.45'
                  }}
                >
                  <p style={{ margin: '0 0 0.3rem 0', fontWeight: '700', color: 'var(--text-color)' }}>
                    🏫 Contraseñas exclusivas por Colegio
                  </p>
                  Asigna contraseñas únicas para cada colegio o delegación. Cada asesor/a podrá acceder exclusivamente con su clave dedicada (o con la general). Puedes copiar y enviarle sus credenciales listas para WhatsApp o correo.
                </div>

                {/* Buscador de Colegios */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: textMuted
                    }}
                  />
                  <input
                    type="text"
                    value={busquedaEquipoModal}
                    onChange={(e) => setBusquedaEquipoModal(e.target.value)}
                    placeholder="Buscar colegio o equipo..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.1rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: 'var(--text-color)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  {busquedaEquipoModal && (
                    <button
                      type="button"
                      onClick={() => setBusquedaEquipoModal('')}
                      style={{
                        position: 'absolute',
                        right: '9px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: textMuted,
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Lista de Equipos */}
                {equiposFiltradosModal.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: textMuted, fontSize: '0.85rem' }}>
                    No se encontraron colegios con el término "{busquedaEquipoModal}".
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {equiposFiltradosModal.map((nombreEq) => {
                      const tienePinPropio = Boolean(teamPins[nombreEq]);
                      const pinActual = teamPinInputs[nombreEq] ?? teamPins[nombreEq] ?? '';
                      const isShowing = Boolean(showTeamPins[nombreEq]);
                      const estaCopiado = copiadoFeedback === nombreEq;
                      const esSeleccionado = selectedTeamInModal === nombreEq;

                      return (
                        <div
                          key={nombreEq}
                          style={{
                            padding: '0.9rem 1rem',
                            borderRadius: '10px',
                            backgroundColor: esSeleccionado
                              ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)')
                              : (isLight ? '#ffffff' : 'rgba(255,255,255,0.03)'),
                            border: `1px solid ${
                              esSeleccionado
                                ? '#10b981'
                                : (tienePinPropio ? 'rgba(16, 185, 129, 0.35)' : borderCol)
                            }`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Encabezado del item */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <School size={16} color={tienePinPropio ? '#10b981' : '#6366f1'} />
                              <span style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-color)' }}>
                                {nombreEq}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {tienePinPropio ? (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)',
                                    color: '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Lock size={11} /> Clave propia configurada
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                                    color: textMuted
                                  }}
                                >
                                  Usa Clave General
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controles del PIN */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
                              <input
                                type={isShowing ? 'text' : 'password'}
                                value={pinActual}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTeamPinInputs(prev => ({ ...prev, [nombreEq]: val }));
                                }}
                                placeholder="Clave exclusiva para este equipo"
                                style={{
                                  width: '100%',
                                  padding: '0.55rem 2.4rem 0.55rem 0.75rem',
                                  fontSize: '0.84rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${borderCol}`,
                                  backgroundColor: headerBg,
                                  color: 'var(--text-color)',
                                  outline: 'none',
                                  fontWeight: '700'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTeamPins(prev => ({ ...prev, [nombreEq]: !prev[nombreEq] }));
                                }}
                                style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'transparent',
                                  border: 'none',
                                  color: textMuted,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  padding: '2px'
                                }}
                                title={isShowing ? 'Ocultar' : 'Mostrar'}
                              >
                                {isShowing ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleGenerarPinEquipo(nombreEq)}
                              style={{
                                padding: '0.55rem 0.7rem',
                                borderRadius: '6px',
                                border: `1px solid ${borderCol}`,
                                backgroundColor: headerBg,
                                color: textMuted,
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Generar PIN aleatorio"
                            >
                              <Sparkles size={13} color="#f59e0b" />
                              Generar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGuardarPinEquipo(nombreEq)}
                              style={{
                                padding: '0.55rem 0.85rem',
                                borderRadius: '6px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Guardar contraseña de este equipo"
                            >
                              <Check size={14} /> Guardar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopiarCredenciales(nombreEq)}
                              style={{
                                padding: '0.55rem 0.8rem',
                                borderRadius: '6px',
                                border: `1px solid ${estaCopiado ? '#10b981' : borderCol}`,
                                backgroundColor: estaCopiado
                                  ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)')
                                  : headerBg,
                                color: estaCopiado ? '#16a34a' : 'var(--text-color)',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              title="Copiar credenciales formateadas para enviar por correo o WhatsApp"
                            >
                              {estaCopiado ? <CheckCheck size={14} color="#16a34a" /> : <Copy size={14} />}
                              {estaCopiado ? '¡Copiado!' : 'Copiar Credenciales'}
                            </button>

                            {tienePinPropio && (
                              <button
                                type="button"
                                onClick={() => handleRestablecerPinEquipo(nombreEq)}
                                style={{
                                  padding: '0.55rem 0.65rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isLight ? '#dc2626' : '#f87171',
                                  fontSize: '0.76rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title="Eliminar clave específica y volver a usar la clave general"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pie del Modal */}
          <div
            style={{
              padding: '0.9rem 1.4rem',
              backgroundColor: headerBg,
              borderTop: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: textMuted }}>
              🔒 Los cambios se aplican de inmediato en los accesos de la conferencia.
            </span>
            <button
              type="button"
              onClick={() => setModalClavesOpen(false)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // DETERMINAR VISTA ACTIVA: ORGANIZACIÓN O FACULTY
  // ─────────────────────────────────────────────────────────────
  const esVistaOrganizacion = viewMode === 'ORGANIZACION';

  // ─────────────────────────────────────────────────────────────
  // VISTA 2: FACULTY ADVISOR (SOLO SU EQUIPO)
  // ─────────────────────────────────────────────────────────────
  if (!esVistaOrganizacion) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        
        {/* Banner de Previsualización para Organización */}
        {authRole === 'ORGANIZACION' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            fontSize: '0.84rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', fontWeight: '700' }}>
              <Shield size={16} />
              <span>Simulación de Organización: Previsualizando vista del Faculty de <strong>{nombreEquipoActualFaculty}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {nombresEquipos.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.76rem', color: textMuted }}>Cambiar equipo:</span>
                  <select
                    value={previewTeam}
                    onChange={(e) => setPreviewTeam(e.target.value)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: bgCard,
                      color: 'var(--text-color)',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {nombresEquipos.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botón para cambiar contraseña del equipo previsualizado */}
              <button
                onClick={() => {
                  setSelectedTeamInModal(nombreEquipoActualFaculty);
                  setTabClavesModal('EQUIPOS');
                  setModalClavesOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                  color: isLight ? '#b45309' : '#fbbf24',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
                title={`Gestionar o cambiar contraseña para ${nombreEquipoActualFaculty}`}
              >
                <Key size={13} /> Clave Faculty
              </button>

              <button
                onClick={() => setViewMode('ORGANIZACION')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Volver a Vista Organización (Todos los equipos)
              </button>
            </div>
          </div>
        )}

        {/* Cabecera Principal del Faculty Advisor */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem',
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '12px',
          boxShadow: isLight ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <div style={{
                padding: '0.4rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex'
              }}>
                <GraduationCap size={20} />
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
                color: '#10b981'
              }}>
                Panel Faculty Advisor
              </span>
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: '900', margin: '0 0 0.25rem 0', color: 'var(--text-color)' }}>
              {nombreEquipoActualFaculty || 'Mi Equipo'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
              Seguimiento académico exclusivo para la delegación y profesor/a de <strong>{nombreEquipoActualFaculty}</strong> en <strong>{conferencia?.nombre || 'la Conferencia'}</strong>.
            </p>
          </div>

          {/* Acciones de la Cabecera Faculty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {onRefresh && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: isRefreshing ? 'wait' : 'pointer'
                }}
                title="Actualizar datos de los comités en vivo"
              >
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            )}

            {equipoActualFaculty && (
              <button
                onClick={() => exportarCsvEquipos([equipoActualFaculty], conferencia?.nombre, nombreEquipoActualFaculty)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="Descargar informe exclusivo de mi equipo en CSV"
              >
                <Download size={15} /> Exportar CSV Equipo
              </button>
            )}

            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Imprimir informe del equipo o guardar PDF"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>

            {authRole === 'FACULTY' && (
              <button
                onClick={handleCerrarSesion}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                  color: isLight ? '#dc2626' : '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="Cerrar sesión de profesor o cambiar de equipo"
              >
                <LogOut size={14} /> Salir / Cambiar
              </button>
            )}
          </div>
        </div>

        {/* Notificación de Confidencialidad y Privacidad Exclusiva */}
        <div style={{
          padding: '0.85rem 1.1rem',
          borderRadius: '10px',
          backgroundColor: isLight ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.82rem',
          color: 'var(--text-color)'
        }}>
          <Lock size={16} color="#10b981" style={{ flexShrink: 0 }} />
          <span>
            <strong>Vista Privada de Equipo:</strong> Estás consultando exclusivamente el rendimiento de los alumnos de <strong>{nombreEquipoActualFaculty}</strong>. Los datos del resto de colegios permanecen confidenciales.
          </span>
        </div>

        {/* Si el equipo no tiene delegaciones aún */}
        {!equipoActualFaculty ? (
          <div style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '12px'
          }}>
            <School size={40} style={{ color: textMuted, margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: 'var(--text-color)' }}>
              No se encontraron delegaciones para "{nombreEquipoActualFaculty}"
            </h3>
            <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
              La mesa directiva o secretaría aún no ha asignado delegaciones a este equipo en la Matriz de Países de los comités.
            </p>
          </div>
        ) : (
          <>
            {/* ── BARRA DE KPIS EXCLUSIVOS DEL EQUIPO ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem'
            }}>
              {/* KPI 1: Alumnos y Delegaciones */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#10b981', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <span>Alumnos / Delegaciones</span>
                  <Users size={16} />
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: '900', color: 'var(--text-color)', marginTop: '0.2rem' }}>
                  {equipoActualFaculty.miembros.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                  en {equipoActualFaculty.totalComites} {equipoActualFaculty.totalComites === 1 ? 'comité activo' : 'comités activos'}
                </div>
              </div>

              {/* KPI 2: Tiempo de Oratoria Acumulado */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#3b82f6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <span>Tiempo de Debate</span>
                  <Clock size={16} />
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#3b82f6', marginTop: '0.2rem' }}>
                  {formatTiempo(equipoActualFaculty.totalSegundos)}
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                  {equipoActualFaculty.totalIntervenciones} discursos e intervenciones
                </div>
              </div>

              {/* KPI 3: Mociones del Equipo */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <span>Mociones Aprobadas</span>
                  <FileText size={16} />
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#8b5cf6', marginTop: '0.2rem' }}>
                  {equipoActualFaculty.totalMocionesAprobadas} <span style={{ fontSize: '0.88rem', fontWeight: '600', color: textMuted }}>/ {equipoActualFaculty.totalMociones}</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                  {equipoActualFaculty.tasaMociones}% tasa de éxito en el pleno
                </div>
              </div>

              {/* KPI 4: Enmiendas Redactadas */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ec4899', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <span>Enmiendas Aprobadas</span>
                  <FileSignature size={16} />
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#ec4899', marginTop: '0.2rem' }}>
                  {equipoActualFaculty.totalEnmiendasAprobadas} <span style={{ fontSize: '0.88rem', fontWeight: '600', color: textMuted }}>/ {equipoActualFaculty.totalEnmiendas}</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                  redactadas por tus alumnos
                </div>
              </div>

              {/* KPI 5: Asistencia y Compromiso */}
              <div style={{
                backgroundColor: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#06b6d4', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <span>Asistencia Global</span>
                  <CheckCircle size={16} />
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#06b6d4', marginTop: '0.2rem' }}>
                  {equipoActualFaculty.tasaAsistencia}%
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                  {equipoActualFaculty.asistencia.presenteVotando + equipoActualFaculty.asistencia.presente} presentes / {equipoActualFaculty.asistencia.ausente} ausentes
                </div>
              </div>
            </div>

            {/* ── CONTROLES Y FILTROS INTERNOS PARA EL EQUIPO ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 320px', flexWrap: 'wrap' }}>
                {/* Buscador de Alumnos en el Equipo */}
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
                  <input
                    type="text"
                    placeholder="Buscar alumno, país, comité..."
                    value={busquedaFaculty}
                    onChange={(e) => setBusquedaFaculty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem 0.45rem 1.85rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: 'var(--text-color)',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Filtro por Comité */}
                {comitesEquipoFaculty.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Comité:</span>
                    <select
                      value={filtroComiteFaculty}
                      onChange={(e) => setFiltroComiteFaculty(e.target.value)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: `1px solid ${borderCol}`,
                        backgroundColor: headerBg,
                        color: 'var(--text-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="TODOS">Todos ({comitesEquipoFaculty.length})</option>
                      {comitesEquipoFaculty.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro por Asistencia */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Asistencia:</span>
                  <select
                    value={filtroAsistenciaFaculty}
                    onChange={(e) => setFiltroAsistenciaFaculty(e.target.value)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: 'var(--text-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="TODOS">Todos los alumnos</option>
                    <option value="PRESENTE">Solo presentes</option>
                    <option value="AUSENTE">Solo ausentes</option>
                  </select>
                </div>
              </div>

              {/* Ordenación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Ordenar:</span>
                <select
                  value={ordenFaculty}
                  onChange={(e) => setOrdenFaculty(e.target.value)}
                  style={{
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: 'var(--text-color)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="TIEMPO">Tiempo Hablado</option>
                  <option value="MOCIONES">Mociones Aprobadas</option>
                  <option value="ALFABETICO">Alfabético</option>
                </select>
              </div>
            </div>

            {/* ── TABLA DETALLADA DE ALUMNOS DEL EQUIPO ── */}
            <div style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                backgroundColor: headerBg,
                borderBottom: `1px solid ${borderCol}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                    Alumnos y Delegaciones ({miembrosFiltradosFaculty.length})
                  </h3>
                </div>
                <span style={{ fontSize: '0.74rem', color: textMuted }}>
                  Actualizado en tiempo real según los registros de Mesa
                </span>
              </div>

              {miembrosFiltradosFaculty.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: textMuted, fontSize: '0.86rem' }}>
                  No se encontraron alumnos con los filtros seleccionados.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)',
                        borderBottom: `1px solid ${borderCol}`,
                        color: textMuted,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase'
                      }}>
                        <th style={{ padding: '0.7rem 0.95rem' }}>Delegación & Alumno</th>
                        <th style={{ padding: '0.7rem 0.95rem' }}>Comité</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>Asistencia</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>Tiempo Hablado</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>Discursos</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>Mociones</th>
                        <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>Enmiendas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miembrosFiltradosFaculty.map((m, idx) => (
                        <tr
                          key={`${m.comiteId}_${m.paisId}`}
                          style={{
                            borderBottom: idx < miembrosFiltradosFaculty.length - 1 ? `1px solid ${borderCol}` : 'none',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : (isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)')
                          }}
                        >
                          {/* Delegación & Alumno */}
                          <td style={{ padding: '0.7rem 0.95rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <CountryFlag bandera={m.bandera} nombre={m.paisNombre} size="sm" />
                              <div>
                                <div style={{ fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{m.paisNombre}</span>
                                  {m.veto && <span title="P5 / Veto" style={{ fontSize: '0.7rem' }}>👑</span>}
                                </div>
                                {m.delegado ? (
                                  <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: '700' }}>
                                    {m.delegado}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.72rem', color: textMuted, fontStyle: 'italic' }}>
                                    Sin nombre de delegado
                                  </div>
                                )}
                                {m.insignias.length > 0 && (
                                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                    {m.insignias.map(ins => (
                                      <span
                                        key={ins}
                                        style={{
                                          fontSize: '0.64rem',
                                          padding: '0.08rem 0.4rem',
                                          borderRadius: '4px',
                                          backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                                          color: textMuted,
                                          fontWeight: '700'
                                        }}
                                      >
                                        {ins}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Comité */}
                          <td style={{ padding: '0.7rem 0.95rem', color: 'var(--text-color)' }}>
                            <span style={{
                              fontSize: '0.76rem',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: isLight ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)',
                              color: isLight ? '#0369a1' : '#38bdf8',
                              fontWeight: '700'
                            }}>
                              {m.comiteNombre}
                            </span>
                          </td>

                          {/* Asistencia */}
                          <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              fontWeight: '700',
                              backgroundColor: m.estatus === 'Presente y Votando'
                                ? (isLight ? '#dbeafe' : 'rgba(59, 130, 246, 0.15)')
                                : (m.estatus === 'Presente'
                                  ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)')
                                  : (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)')),
                              color: m.estatus === 'Presente y Votando'
                                ? '#2563eb'
                                : (m.estatus === 'Presente' ? '#16a34a' : '#dc2626')
                            }}>
                              {m.estatus}
                            </span>
                          </td>

                          {/* Tiempo Hablado */}
                          <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: '800', color: m.segHablados > 0 ? '#3b82f6' : textMuted }}>
                            {formatTiempo(m.segHablados)}
                          </td>

                          {/* Discursos */}
                          <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: '800' }}>
                            {m.intervencionesCount}
                          </td>

                          {/* Mociones */}
                          <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                            <span style={{ fontWeight: '800', color: m.mocAprobadas > 0 ? '#10b981' : 'inherit' }}>
                              {m.mocAprobadas}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.mocPresentadas}</span>
                          </td>

                          {/* Enmiendas */}
                          <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                            <span style={{ fontWeight: '800', color: m.enmAprobadas > 0 ? '#8b5cf6' : 'inherit' }}>
                              {m.enmAprobadas}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.enmPresentadas}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        {renderModalGestionClaves()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VISTA 1: ORGANIZACIÓN (TODOS LOS EQUIPOS)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ── CABECERA Y ACCIONES ORGANIZACIÓN ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '12px',
        boxShadow: isLight ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div style={{
              padding: '0.4rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#6366f1',
              display: 'flex'
            }}>
              <Shield size={20} />
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              backgroundColor: isLight ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)',
              color: '#6366f1'
            }}>
              Vista Organización — Acceso Global
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: 'var(--text-color)' }}>
            Rendimiento de Equipos & Alumnos
          </h2>
          <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
            Supervisión académica global para Secretaría y Staff de <strong>{conferencia?.nombre || 'la Conferencia'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Botón para Simular / Conmutar a la Vista de Faculty */}
          {nombresEquipos.length > 0 && (
            <button
              onClick={() => {
                setPreviewTeam(nombresEquipos[0]);
                setViewMode('FACULTY');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                backgroundColor: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontSize: '0.82rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Previsualizar el panel tal como lo ve un profesor de colegio"
            >
              <GraduationCap size={15} /> Simular Vista Faculty
            </button>
          )}

          {/* Botón para Gestionar Contraseñas de Faculties */}
          <button
            onClick={() => {
              setSelectedTeamInModal('');
              setTabClavesModal('GENERAL');
              setModalClavesOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(234, 179, 8, 0.45)',
              backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.15)',
              color: isLight ? '#b45309' : '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
            title="Cambiar y gestionar contraseñas de acceso para Faculties y Colegios"
          >
            <Key size={15} /> Contraseñas Faculties
          </button>

          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: isRefreshing ? 'wait' : 'pointer'
              }}
              title="Actualizar datos en tiempo real de todos los comités"
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          )}

          <button
            onClick={() => exportarCsvEquipos(datosEquipos, conferencia?.nombre)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              backgroundColor: headerBg,
              color: 'var(--text-color)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Descargar datos de todos los equipos en CSV"
          >
            <Download size={15} /> Exportar CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              backgroundColor: headerBg,
              color: 'var(--text-color)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Imprimir o guardar como PDF"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>

          {!isAdmin && (
            <button
              onClick={handleCerrarSesion}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                color: isLight ? '#dc2626' : '#f87171',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Bloquear y salir del modo organización"
            >
              <Lock size={14} /> Bloquear
            </button>
          )}
        </div>
      </div>

      {/* ── BARRA DE KPIS GLOBALES DE LA CONFERENCIA ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem'
      }}>
        {/* KPI 1: Equipos Registrados */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#10b981', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Equipos / Colegios</span>
            <School size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text-color)', marginTop: '0.2rem' }}>
            {kpisGlobales.totalEquipos}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.totalDelegaciones} delegaciones registradas
          </div>
        </div>

        {/* KPI 2: Tiempo Hablado Total */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#3b82f6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Tiempo de Oratoria</span>
            <Clock size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#3b82f6', marginTop: '0.2rem' }}>
            {formatTiempo(kpisGlobales.totalSegundos)}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            En debates de comités
          </div>
        </div>

        {/* KPI 3: Mociones Aprobadas */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Mociones Aprobadas</span>
            <FileText size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#8b5cf6', marginTop: '0.2rem' }}>
            {kpisGlobales.totalMocionesAprobadas} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: textMuted }}>/ {kpisGlobales.totalMociones}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.totalMociones > 0 ? Math.round((kpisGlobales.totalMocionesAprobadas / kpisGlobales.totalMociones) * 100) : 0}% tasa de aprobación
          </div>
        </div>

        {/* KPI 4: Equipo Líder */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Mayor Oratoria</span>
            <Trophy size={16} />
          </div>
          <div style={{
            fontSize: '1.15rem',
            fontWeight: '900',
            color: 'var(--text-color)',
            marginTop: '0.3rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {kpisGlobales.equipoLider ? kpisGlobales.equipoLider.nombre : '—'}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.equipoLider ? `${formatTiempo(kpisGlobales.equipoLider.totalSegundos)} de debate` : 'Sin datos de actividad'}
          </div>
        </div>
      </div>

      {/* ── CONTROLES Y FILTROS ORGANIZACIÓN ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 320px', flexWrap: 'wrap' }}>
          {/* Selector de Equipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Equipo:</span>
            <select
              value={filtroEquipoOrg}
              onChange={(e) => setFiltroEquipoOrg(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
            >
              <option value="TODOS">Todos los Equipos ({datosEquipos.length})</option>
              {nombresEquipos.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
            <input
              type="text"
              placeholder="Buscar alumno, país, comité..."
              value={busquedaOrg}
              onChange={(e) => setBusquedaOrg(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem 0.45rem 1.85rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Orden */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Ordenar:</span>
            <select
              value={ordenOrg}
              onChange={(e) => setOrdenOrg(e.target.value)}
              style={{
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
            >
              <option value="TIEMPO">Tiempo Hablado</option>
              <option value="MOCIONES">Mociones Aprobadas</option>
              <option value="ALFABETICO">Alfabético</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button
              onClick={expandirTodos}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: textMuted,
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Expandir todos
            </button>
            <button
              onClick={colapsarTodos}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: textMuted,
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Colapsar todos
            </button>
          </div>
        </div>
      </div>

      {/* ── LISTADO DETALLADO DE TODOS LOS EQUIPOS (VISTA ORGANIZACIÓN) ── */}
      {equiposFiltradosOrg.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '12px'
        }}>
          <Users size={36} style={{ color: textMuted, margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.35rem 0', color: 'var(--text-color)' }}>
            No se encontraron equipos
          </h3>
          <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            {busquedaOrg || filtroEquipoOrg !== 'TODOS'
              ? 'Prueba a cambiar los filtros o el término de búsqueda.'
              : 'Aún no se han asignado equipos a las delegaciones en los comités. Las mesas directivas pueden asignarlos en la Matriz de Países.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {equiposFiltradosOrg.map((equipo, index) => {
            const isExpandido = equiposExpandidos[equipo.nombre] !== false; // Abierto por defecto
            const rank = index + 1;

            return (
              <div
                key={equipo.nombre}
                style={{
                  backgroundColor: bgCard,
                  border: `1px solid ${equipo.esSinEquipo ? 'rgba(239, 68, 68, 0.25)' : borderCol}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Cabecera del Equipo */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: equipo.esSinEquipo
                      ? (isLight ? '#fff1f2' : 'rgba(239, 68, 68, 0.08)')
                      : headerBg,
                    borderBottom: isExpandido ? `1px solid ${borderCol}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    userSelect: 'none'
                  }}
                >
                  <div
                    onClick={() => toggleExpandir(equipo.nombre)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 260px', cursor: 'pointer' }}
                  >
                    {!equipo.esSinEquipo && (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: rank === 1 ? '#eab308' : (rank === 2 ? '#94a3b8' : (rank === 3 ? '#d97706' : 'rgba(99, 102, 241, 0.15)')),
                        color: rank <= 3 ? '#ffffff' : '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: '900',
                        flexShrink: 0
                      }}>
                        {rank}
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          margin: 0,
                          color: equipo.esSinEquipo ? '#ef4444' : 'var(--text-color)'
                        }}>
                          {equipo.nombre}
                        </h3>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                          color: textMuted,
                          fontWeight: '700'
                        }}>
                          {equipo.miembros.length} {equipo.miembros.length === 1 ? 'delegación' : 'delegaciones'}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontWeight: '700'
                        }}>
                          {equipo.totalComites} {equipo.totalComites === 1 ? 'comité' : 'comités'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Métricas del Equipo y Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Tiempo Hablado
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#3b82f6' }}>
                        {formatTiempo(equipo.totalSegundos)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Mociones
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#10b981' }}>
                        {equipo.totalMocionesAprobadas} <span style={{ fontSize: '0.72rem', color: textMuted }}>/ {equipo.totalMociones}</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Discursos
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#8b5cf6' }}>
                        {equipo.totalIntervenciones}
                      </span>
                    </div>

                    {!equipo.esSinEquipo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeamInModal(equipo.nombre);
                            setTabClavesModal('EQUIPOS');
                            setModalClavesOpen(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                            color: isLight ? '#b45309' : '#fbbf24',
                            fontSize: '0.76rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                          title={`Gestionar o cambiar contraseña para ${equipo.nombre}`}
                        >
                          <Key size={13} />
                          {teamPins[equipo.nombre] ? 'Clave propia' : 'Clave'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTeam(equipo.nombre);
                            setViewMode('FACULTY');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            backgroundColor: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontSize: '0.76rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                          title="Ver como Faculty de este equipo"
                        >
                          <GraduationCap size={13} /> Ver como Faculty
                        </button>
                      </div>
                    )}

                    <div
                      onClick={() => toggleExpandir(equipo.nombre)}
                      style={{ color: textMuted, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' }}
                    >
                      {isExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Tabla de Miembros / Alumnos */}
                {isExpandido && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)',
                          borderBottom: `1px solid ${borderCol}`,
                          color: textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase'
                        }}>
                          <th style={{ padding: '0.6rem 0.85rem' }}>Delegación & Alumno</th>
                          <th style={{ padding: '0.6rem 0.85rem' }}>Comité</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Asistencia</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Tiempo Hablado</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Discursos</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Mociones</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Enmiendas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipo.miembros.map((m, idx) => (
                          <tr
                            key={`${m.comiteId}_${m.paisId}`}
                            style={{
                              borderBottom: idx < equipo.miembros.length - 1 ? `1px solid ${borderCol}` : 'none',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : (isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)')
                            }}
                          >
                            {/* Delegación & Alumno */}
                            <td style={{ padding: '0.6rem 0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CountryFlag bandera={m.bandera} nombre={m.paisNombre} size="sm" />
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span>{m.paisNombre}</span>
                                    {m.veto && <span title="P5 / Veto" style={{ fontSize: '0.7rem' }}>👑</span>}
                                  </div>
                                  {m.delegado && (
                                    <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                      {m.delegado}
                                    </div>
                                  )}
                                  {m.insignias.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                      {m.insignias.map(ins => (
                                        <span
                                          key={ins}
                                          style={{
                                            fontSize: '0.62rem',
                                            padding: '0.05rem 0.35rem',
                                            borderRadius: '4px',
                                            backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                                            color: textMuted,
                                            fontWeight: '600'
                                          }}
                                        >
                                          {ins}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Comité */}
                            <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-color)' }}>
                              <span style={{
                                fontSize: '0.76rem',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '6px',
                                backgroundColor: isLight ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)',
                                color: isLight ? '#0369a1' : '#38bdf8',
                                fontWeight: '700'
                              }}>
                                {m.comiteNombre}
                              </span>
                            </td>

                            {/* Asistencia */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontWeight: '700',
                                backgroundColor: m.estatus === 'Presente y Votando'
                                  ? (isLight ? '#dbeafe' : 'rgba(59, 130, 246, 0.15)')
                                  : (m.estatus === 'Presente'
                                    ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)')
                                    : (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)')),
                                color: m.estatus === 'Presente y Votando'
                                  ? '#2563eb'
                                  : (m.estatus === 'Presente' ? '#16a34a' : '#dc2626')
                              }}>
                                {m.estatus}
                              </span>
                            </td>

                            {/* Tiempo Hablado */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700', color: m.segHablados > 0 ? '#3b82f6' : textMuted }}>
                              {formatTiempo(m.segHablados)}
                            </td>

                            {/* Discursos */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700' }}>
                              {m.intervencionesCount}
                            </td>

                            {/* Mociones */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{ fontWeight: '700', color: m.mocAprobadas > 0 ? '#10b981' : 'inherit' }}>
                                {m.mocAprobadas}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.mocPresentadas}</span>
                            </td>

                            {/* Enmiendas */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{ fontWeight: '700', color: m.enmAprobadas > 0 ? '#8b5cf6' : 'inherit' }}>
                                {m.enmAprobadas}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.enmPresentadas}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {renderModalGestionClaves()}
    </div>
  );
};

export default RendimientoEquiposTab;
