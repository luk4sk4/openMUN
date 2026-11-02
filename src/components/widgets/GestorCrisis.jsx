import i18n from '../../languages/index.js';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  Radio,
  Megaphone,
  Flame,
  ShieldAlert,
  Clock,
  Play,
  Pause,
  FastForward,
  Plus,
  Trash2,
  Pin,
  CheckCircle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Filter,
  Globe,
  Users,

  Download,
  Upload,
  Send,
  Eye,
  Check,
  RotateCcw,
  Zap,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  Camera,
  UploadCloud,
  Link as LinkIcon,
  Sliders,
  Calendar,
  Edit3,
  ArrowLeft
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from 'react-i18next';
import CountryFlag from '../common/CountryFlag';
import EmptyState from '../common/EmptyState';
import { playBreakingNewsAlert, playEmergencyPulse } from '../../utils/audioAlerts';

// Fotos y Fondos Predefinidos de Crisis
const FOTOS_PRESET = [
  { get label() { return i18n.t('ui.militarySatellite'); }, url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80' },
  { get label() { return i18n.t('ui.navalArmoredDeployment'); }, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80' },
  { get label() { return i18n.t('ui.cyberattackRadar'); }, url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80' },
  { get label() { return i18n.t('ui.situationRoomUn'); }, url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80' },
  { get label() { return i18n.t('ui.stockMarketFinancialCrisis'); }, url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80' }
];

// Categorías de Crisis con paletas de color y estilo
const CATEGORIAS_CRISIS = {
  CRITICA: {
    get nombre() { return i18n.t('ui.breakingNewsCritical'); },
    get badge() { return i18n.t('ui.breakingNews2'); },
    color: 'var(--danger-color)',
    bg: 'var(--danger-soft)',
    border: 'var(--danger-color)',
    icon: Flame
  },
  MILITAR: {
    get nombre() { return i18n.t('ui.militaryAlertConflict'); },
    get badge() { return i18n.t('ui.militaryAlert2'); },
    color: 'var(--warning-color)',
    bg: 'var(--warning-soft)',
    border: 'var(--warning-color)',
    icon: ShieldAlert
  },
  DIPLOMATICA: {
    get nombre() { return i18n.t('ui.diplomaticAnnouncement2'); },
    get badge() { return i18n.t('ui.announcement3'); },
    color: 'var(--info-color)',
    bg: 'var(--info-soft)',
    border: 'var(--info-color)',
    icon: Megaphone
  },
  ECONOMICA: {
    get nombre() { return i18n.t('ui.financialCrisisSanctions'); },
    get badge() { return i18n.t('ui.economicImpact'); },
    color: 'var(--accent-color)',
    bg: 'var(--accent-soft)',
    border: 'var(--accent-color)',
    icon: TrendingUp
  },
  CIBERNETICA: {
    get nombre() { return i18n.t('ui.cybersecurityIntelligence'); },
    get badge() { return i18n.t('ui.cybersecurity'); },
    color: 'var(--success-color)',
    bg: 'var(--success-soft)',
    border: 'var(--success-color)',
    icon: Zap
  }
};

// Plantillas rápidas de sucesos de crisis
const PLANTILLAS_CRISIS = [
  {
    get titulo() { return i18n.t('ui.unauthorizedAirspaceIncursion'); },
    categoria: 'MILITAR',
    get fuente() { return i18n.t('ui.aerospaceDefenseCommand'); },
    get descripcion() { return i18n.t('ui.reconnaissanceAircraftHaveBeenDetectedOverDisputedTerritoryAnUrgent'); },
    imagen: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    get titulo() { return i18n.t('ui.massiveLeakOfDiplomaticCables'); },
    categoria: 'CIBERNETICA',
    get fuente() { return i18n.t('ui.wikileaksIntelligenceConsortium'); },
    get descripcion() { return i18n.t('ui.classifiedDocumentsOnSecretArmsNegotiationsAndBilateralTreatiesHave'); },
    imagen: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    get titulo() { return i18n.t('ui.immediateBreakdownOfBilateralRelations'); },
    categoria: 'DIPLOMATICA',
    get fuente() { return i18n.t('ui.stateForeignMinistry'); },
    get descripcion() { return i18n.t('ui.ambassadorsHaveBeenRecalledForConsultationsAndDiplomaticMissionsOrdered'); },
    imagen: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    get titulo() { return i18n.t('ui.immediateFreezeOfSovereignAssets'); },
    categoria: 'ECONOMICA',
    get fuente() { return i18n.t('ui.internationalCentralBank'); },
    get descripcion() { return i18n.t('ui.aTotalFreezeOnAccountsAndForeignCurrencyReservesHas'); },
    imagen: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  }
];

const GestorCrisis = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const { addToast } = useToast();
  const { paises } = useSession();
  const fileInputRef = useRef(null);
  const jsonFileInputRef = useRef(null);

  // Identificador único de instancia para evitar bucles de eventos sobre la misma ventana
  const instanceId = useRef('gc_' + Math.random().toString(36).substring(2, 9)).current;

  // Estados persistentes de Crisis
  const [eventosCrisis, setEventosCrisis] = useState(() => {
    const saved = localStorage.getItem('openmun_crisis_eventos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            ...item,
            id: item.id || `ev_${idx}_${Date.now()}`
          }));
        }
      } catch (e) { }
    }
    return [
    ];
  });

  // Reloj de Simulación
  const [relojSimulacion, setRelojSimulacion] = useState(() => {
    const saved = localStorage.getItem('openmun_crisis_reloj');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      activo: false,
      dia: 1,
      horas: 8,
      minutos: 30,
      velocidad: 1 // 1x, 2x, 5x, 60x (1 seg = 1 min)
    };
  });

  const eventosRef = useRef(eventosCrisis);
  eventosRef.current = eventosCrisis;
  const relojRef = useRef(relojSimulacion);
  relojRef.current = relojSimulacion;

  // Controles de Vista y Modales
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [modoTransmisionCompleta, setModoTransmisionCompleta] = useState(false);
  const [modalNuevoEvento, setModalNuevoEvento] = useState(false);
  const [modalPlantillas, setModalPlantillas] = useState(false);
  const [modalAjusteReloj, setModalAjusteReloj] = useState(false);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Formulario de Ajuste Exacto del Reloj
  const [formRelojDia, setFormRelojDia] = useState(1);
  const [formRelojHoras, setFormRelojHoras] = useState(8);
  const [formRelojMinutos, setFormRelojMinutos] = useState(30);
  const [formRelojVelocidad, setFormRelojVelocidad] = useState(1);
  const [formRelojActivo, setFormRelojActivo] = useState(false);

  // Formulario de Nuevo Evento
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState('CRITICA');
  const [formFuente, setFormFuente] = useState(i18n.t('ui.crisisBoardSituationRoom'));
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formImagen, setFormImagen] = useState('');
  const [formPaises, setFormPaises] = useState([]);
  const [formEmitirAlerta, setFormEmitirAlerta] = useState(true);

  // Abrir modal con valores actuales
  const abrirModalAjusteReloj = () => {
    setFormRelojDia(relojSimulacion.dia || 1);
    setFormRelojHoras(relojSimulacion.horas || 8);
    setFormRelojMinutos(relojSimulacion.minutos || 0);
    setFormRelojVelocidad(relojSimulacion.velocidad || 1);
    setFormRelojActivo(!!relojSimulacion.activo);
    setModalAjusteReloj(true);
  };

  // Guardar ajuste exacto del reloj
  const handleGuardarAjusteReloj = (e) => {
    if (e) e.preventDefault();
    const diaNum = Math.max(1, parseInt(formRelojDia) || 1);
    const horasNum = Math.min(23, Math.max(0, parseInt(formRelojHoras) || 0));
    const minutosNum = Math.min(59, Math.max(0, parseInt(formRelojMinutos) || 0));
    const velNum = Math.max(1, parseInt(formRelojVelocidad) || 1);

    const nuevoReloj = {
      dia: diaNum,
      horas: horasNum,
      minutos: minutosNum,
      velocidad: velNum,
      activo: formRelojActivo
    };

    setRelojSimulacion(nuevoReloj);
    setModalAjusteReloj(false);
    showToast(t('ui.clockSetDayHrs', { v0: diaNum, v1: String(horasNum).padStart(2, '0'), v2: String(minutosNum).padStart(2, '0') }));
  };

  // Saltos rápidos en el formulario de ajuste
  const aplicarSaltoEnFormulario = (minutosDelta) => {
    let total = Number(formRelojHoras) * 60 + Number(formRelojMinutos) + minutosDelta;
    let dia = Number(formRelojDia);
    while (total < 0) {
      if (dia > 1) {
        dia -= 1;
        total += 24 * 60;
      } else {
        total = 0;
        break;
      }
    }
    while (total >= 24 * 60) {
      dia += 1;
      total -= 24 * 60;
    }
    setFormRelojDia(dia);
    setFormRelojHoras(Math.floor(total / 60));
    setFormRelojMinutos(total % 60);
  };

  const sincronizarConHoraReal = () => {
    const ahora = new Date();
    setFormRelojHoras(ahora.getHours());
    setFormRelojMinutos(ahora.getMinutes());
    showToast(t('ui.syncedWithYourDeviceSTime'));
  };

  // Escuchar actualizaciones externas de forma segura evitando bucles
  useEffect(() => {
    const handleExternalCrisisUpdate = (e) => {
      if (e?.detail?.sourceId === instanceId) {
        return;
      }

      try {
        const saved = localStorage.getItem('openmun_crisis_eventos');
        if (saved) {
          const currentSerialized = JSON.stringify(eventosRef.current);
          if (saved !== currentSerialized) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setEventosCrisis(parsed);
            }
          }
        }
        const savedReloj = localStorage.getItem('openmun_crisis_reloj');
        if (savedReloj) {
          const currentRelojSerialized = JSON.stringify(relojRef.current);
          if (savedReloj !== currentRelojSerialized) {
            const parsedReloj = JSON.parse(savedReloj);
            if (parsedReloj && typeof parsedReloj === 'object') {
              setRelojSimulacion(parsedReloj);
            }
          }
        }
      } catch (err) {
        console.debug('Error sincronizando eventos de crisis externamente:', err);
      }
    };

    window.addEventListener('openmun_crisis_update', handleExternalCrisisUpdate);
    window.addEventListener('openmun_session_imported', handleExternalCrisisUpdate);
    window.addEventListener('storage', handleExternalCrisisUpdate);

    return () => {
      window.removeEventListener('openmun_crisis_update', handleExternalCrisisUpdate);
      window.removeEventListener('openmun_session_imported', handleExternalCrisisUpdate);
      window.removeEventListener('storage', handleExternalCrisisUpdate);
    };
  }, []);

  // Guardar en localStorage y sincronizar en vivo
  const isFirstRenderEventos = useRef(true);
  useEffect(() => {
    const serialized = JSON.stringify(eventosCrisis);
    if (isFirstRenderEventos.current) {
      isFirstRenderEventos.current = false;
      if (!localStorage.getItem('openmun_crisis_eventos')) {
        localStorage.setItem('openmun_crisis_eventos', serialized);
      }
      return;
    }
    localStorage.setItem('openmun_crisis_eventos', serialized);
    window.dispatchEvent(new CustomEvent('openmun_crisis_update', {
      detail: { sourceId: instanceId, tipo: 'eventos', eventos: eventosCrisis }
    }));
  }, [eventosCrisis]);

  const isFirstRenderReloj = useRef(true);
  useEffect(() => {
    const serialized = JSON.stringify(relojSimulacion);
    if (isFirstRenderReloj.current) {
      isFirstRenderReloj.current = false;
      if (!localStorage.getItem('openmun_crisis_reloj')) {
        localStorage.setItem('openmun_crisis_reloj', serialized);
      }
      return;
    }
    localStorage.setItem('openmun_crisis_reloj', serialized);
    window.dispatchEvent(new CustomEvent('openmun_crisis_update', {
      detail: { sourceId: instanceId, tipo: 'reloj', reloj: relojSimulacion }
    }));
  }, [relojSimulacion]);

  // Exportar Alertas de Crisis como archivo JSON descargable
  const handleExportarCrisisJSON = () => {
    try {
      let savedNotes = [];
      try {
        const rawNotes = localStorage.getItem('openmun_notes');
        if (rawNotes) savedNotes = JSON.parse(rawNotes);
      } catch (e) {}

      const dataToExport = {
        tipo: 'openmun_crisis_export',
        version: '2.0',
        fechaExportacion: new Date().toISOString(),
        relojCrisis: relojSimulacion,
        alertasCrisis: eventosCrisis,
        notes: savedNotes
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alertas_crisis_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('ui.crisisAlertsAndMessagesExportedAsJson'));
    } catch (err) {
      showToast(t('ui.errorExportingAlerts') + err.message, 'error');
    }
  };

  // Importar Alertas de Crisis desde un archivo JSON
  const handleImportarCrisisJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        let importedEventos = null;
        let importedReloj = null;
        let importedNotes = null;

        if (Array.isArray(parsed)) {
          importedEventos = parsed;
        } else if (parsed && typeof parsed === 'object') {
          importedEventos = parsed.alertasCrisis || parsed.eventosCrisis || parsed.crisisEventos || parsed.eventos || parsed.crisis || (parsed.localStorageSnapshot && parsed.localStorageSnapshot.openmun_crisis_eventos);
          importedReloj = parsed.relojCrisis || parsed.relojSimulacion || parsed.reloj || (parsed.localStorageSnapshot && parsed.localStorageSnapshot.openmun_crisis_reloj);
          importedNotes = parsed.notes || parsed.openmun_notes || (parsed.localStorageSnapshot && parsed.localStorageSnapshot.openmun_notes);
        }

        if (Array.isArray(importedEventos) && importedEventos.length > 0) {
          // Asegurar que cada evento tenga los campos necesarios (las imágenes son opcionales)
          const sanitizedEventos = importedEventos.map((ev, idx) => ({
            id: ev.id || `ev_imp_${Date.now()}_${idx}`,
            titulo: ev.titulo || ev.title || 'Alerta de Crisis',
            categoria: ev.categoria || ev.category || 'CRITICA',
            fuente: ev.fuente || ev.source || i18n.t('ui.crisisBoard'),
            descripcion: ev.descripcion || ev.description || '',
            imagen: ev.imagen || ev.image || null,
            horaSimulada: ev.horaSimulada || ev.simulatedTime || i18n.t('ui.day10830Hrs'),
            horaReal: ev.horaReal || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            paisesInvolucrados: Array.isArray(ev.paisesInvolucrados) ? ev.paisesInvolucrados : [],
            estado: ev.estado || 'Activo',
            fijadoComoBanner: ev.fijadoComoBanner !== undefined ? ev.fijadoComoBanner : (idx === 0)
          }));

          setEventosCrisis(sanitizedEventos);
          if (importedReloj && typeof importedReloj === 'object') {
            setRelojSimulacion(importedReloj);
          }
          if (Array.isArray(importedNotes) && importedNotes.length > 0) {
            localStorage.setItem('openmun_notes', JSON.stringify(importedNotes));
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('openmun_session_imported', { detail: { notes: importedNotes } }));
          }
          showToast(t('ui.crisisAlertsImported', { v0: sanitizedEventos.length }));
        } else {
          showToast(t('ui.noCrisisAlertsFoundInTheJsonFile'), 'error');
        }
      } catch (err) {
        showToast(t('ui.errorParsingJsonFile') + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Manejador del reloj de simulación
  useEffect(() => {
    let timer = null;
    if (relojSimulacion.activo) {
      const intervalMs = Math.max(100, Math.floor(1000 / relojSimulacion.velocidad));
      timer = setInterval(() => {
        setRelojSimulacion(prev => {
          let nuevosMin = prev.minutos + 1;
          let nuevasHoras = prev.horas;
          let nuevoDia = prev.dia;

          if (nuevosMin >= 60) {
            nuevosMin = 0;
            nuevasHoras += 1;
          }
          if (nuevasHoras >= 24) {
            nuevasHoras = 0;
            nuevoDia += 1;
          }

          return {
            ...prev,
            minutos: nuevosMin,
            horas: nuevasHoras,
            dia: nuevoDia
          };
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [relojSimulacion.activo, relojSimulacion.velocidad]);

  const showToast = (msg, type = 'info') => {
    addToast({ title: t('crisis.title'), message: msg, type: type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info') });
  };

  // Formato legible del reloj de simulación
  const formatoHoraSimulada = t('ui.dayHrs', { v0: relojSimulacion.dia, v1: String(relojSimulacion.horas).padStart(2, '0'), v2: String(relojSimulacion.minutos).padStart(2, '0') });

  // Evento activo fijado como "Última Hora"
  const eventoBannerActivo = useMemo(() => {
    const fijado = eventosCrisis.find(e => e.fijadoComoBanner);
    return fijado || eventosCrisis[0] || null;
  }, [eventosCrisis]);

  // Lista filtrada
  const eventosFiltrados = useMemo(() => {
    if (filtroCategoria === 'TODOS') return eventosCrisis;
    return eventosCrisis.filter(e => e.categoria === filtroCategoria);
  }, [eventosCrisis, filtroCategoria]);

  // Alternar fijación de banner
  const handleFijarBanner = (id) => {
    setEventosCrisis(prev => prev.map(e => ({
      ...e,
      fijadoComoBanner: e.id === id
    })));
    const target = eventosCrisis.find(e => e.id === id);
    if (sonidoHabilitado && target) {
      playBreakingNewsAlert(0.4);
    }
    showToast(t('ui.breakingNewsAlertUpdated'));
  };

  // Alternar estado Resuelto/Activo
  const handleToggleEstado = (id) => {
    setEventosCrisis(prev => prev.map(e => {
      if (e.id === id) {
        const nuevoEstado = e.estado === 'Resuelto' ? 'Activo' : 'Resuelto';
        return { ...e, estado: nuevoEstado };
      }
      return e;
    }));
  };

  // Eliminar evento
  const handleEliminarEvento = (id) => {
    setEventosCrisis(prev => {
      const filtered = prev.filter(e => e.id !== id);
      if (filtered.length > 0 && !filtered.some(e => e.fijadoComoBanner)) {
        filtered[0] = { ...filtered[0], fijadoComoBanner: true };
      }
      return filtered;
    });
    showToast(t('ui.eventRemovedFromFeed'));
  };

  // Ajustes directos de tiempo de simulación
  const avanzarTiempoSimulado = (minutos) => {
    setRelojSimulacion(prev => {
      let totalMin = prev.horas * 60 + prev.minutos + minutos;
      let nuevoDia = prev.dia;
      while (totalMin >= 24 * 60) {
        totalMin -= 24 * 60;
        nuevoDia += 1;
      }
      return {
        ...prev,
        dia: nuevoDia,
        horas: Math.floor(totalMin / 60),
        minutos: totalMin % 60
      };
    });
    showToast(t('ui.simulatedTimeAdvancedMin', { v0: minutos }));
  };

  // Manejador de carga de imagen local desde PC
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('ui.imageExceeds5mb'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImagen(event.target.result);
      showToast(t('ui.imageLoadedForBroadcast'));
    };
    reader.readAsDataURL(file);
  };

  // Crear nuevo evento
  const handleGuardarNuevoEvento = (e) => {
    if (e) e.preventDefault();
    if (!formTitulo.trim()) return;

    const nuevoEvento = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      fuente: formFuente.trim() || i18n.t('ui.crisisBoard'),
      descripcion: formDescripcion.trim(),
      imagen: formImagen || null,
      horaSimulada: formatoHoraSimulada,
      horaReal: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paisesInvolucrados: formPaises,
      estado: 'Activo',
      fijadoComoBanner: true // El nuevo evento se fija como banner
    };

    setEventosCrisis(prev => [
      nuevoEvento,
      ...prev.map(item => ({ ...item, fijadoComoBanner: false }))
    ]);

    if (formEmitirAlerta && sonidoHabilitado) {
      if (formCategoria === 'MILITAR' || formCategoria === 'CRITICA') {
        playBreakingNewsAlert(0.5);
      } else {
        playBreakingNewsAlert(0.4);
      }
    }

    // Resetear formulario
    setFormTitulo('');
    setFormDescripcion('');
    setFormImagen('');
    setFormPaises([]);
    setModalNuevoEvento(false);
    showToast(t('ui.crisisAlertIssuedAndPinnedLive'));
  };

  // Cargar plantilla predefinida
  const handleCargarPlantilla = (tpl) => {
    setFormTitulo(tpl.titulo);
    setFormCategoria(tpl.categoria);
    setFormFuente(tpl.fuente);
    setFormDescripcion(tpl.descripcion);
    setFormImagen(tpl.imagen || '');
    setModalPlantillas(false);
    setModalNuevoEvento(true);
  };

  const catMeta = eventoBannerActivo ? (CATEGORIAS_CRISIS[eventoBannerActivo.categoria] || CATEGORIAS_CRISIS.CRITICA) : CATEGORIAS_CRISIS.CRITICA;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {modalNuevoEvento ? (
        /* ─── VISTA: EMITIR ALERTA DE CRISIS (PANTALLA COMPLETA DEL WIDGET) ─── */
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--panel-color)',
          color: 'var(--text-color)',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Cabecera de la Vista de Emisión */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--card-header-bg)',
            borderBottom: '1px solid var(--border-color)',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalNuevoEvento(false)}
                title={t('common.cancel', 'Volver')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowLeft size={15} />
              </button>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: '650',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-color)'
                }}>
                  <Megaphone size={16} style={{ color: 'var(--btn-bg)' }} />
                  <span>{t('crisis.emitAlert', 'Emitir Alerta de Crisis / Última Hora')}</span>
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setModalPlantillas(true)}
                title={t('ui.quickCrisisTemplates')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <FileText size={12} color="var(--muted-text)" />
                <span>{t('crisis.templates', 'Plantillas')}</span>
              </button>
              <button
                type="button"
                onClick={() => setModalNuevoEvento(false)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--muted-text)',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={handleGuardarNuevoEvento}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid transparent',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  fontSize: '0.78rem',
                  fontWeight: '650',
                  cursor: 'pointer'
                }}
              >
                <Send size={13} />
                <span>{t('crisis.publishImmediateAlert', 'Publicar Alerta Inmediata')}</span>
              </button>
            </div>
          </div>

          {/* Formulario Espacioso Ocupando Todo el Widget */}
          <form
            onSubmit={handleGuardarNuevoEvento}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box'
            }}
          >
            {/* Grid 2 Columnas Responsivo */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '16px',
              alignItems: 'start'
            }}>
              {/* Columna Izquierda: Información Principal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Titular */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: '750',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--muted-text)',
                    marginBottom: '5px'
                  }}>
                    {t('crisis.headlineLabel', 'TITULAR DE LA NOTICIA / SUCESO *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('ui.eGAirStrikeOnTheEasternBorder')}
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '9px 12px',
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Categoría y Fuente */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: '750',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--muted-text)',
                      marginBottom: '5px'
                    }}>
                      {t('crisis.categoryLabel', 'CATEGORÍA / SEVERIDAD')}
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="CRITICA">{t('crisis.critical', '🔴 Última Hora (Crítico)')}</option>
                      <option value="MILITAR">{t('crisis.military', '⚔️ Alerta Militar / Ataque')}</option>
                      <option value="DIPLOMATICA">{t('crisis.diplomatic', '🌐 Comunicado Diplomático')}</option>
                      <option value="ECONOMICA">{t('crisis.economic', '💵 Colapso Financiero')}</option>
                      <option value="CIBERNETICA">{t('crisis.cybernetic', '⚡ Ciberataque / Inteligencia')}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: '750',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--muted-text)',
                      marginBottom: '5px'
                    }}>
                      {t('crisis.sourceLabel', 'FUENTE INFORMATIVA')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('ui.eGReutersIntelligence')}
                      value={formFuente}
                      onChange={(e) => setFormFuente(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Descripción Detallada */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: '750',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--muted-text)',
                    marginBottom: '5px'
                  }}>
                    {t('crisis.descriptionLabel', 'DESCRIPCIÓN DEL ACONTECIMIENTO / DIRECTIVAS DE MESA')}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={t('ui.detailsAboutTheEventConsequencesAndCommitteeRequirements')}
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      lineHeight: '1.45',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '85px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Delegaciones Involucradas */}
                {paises.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <label style={{
                        fontSize: '0.72rem',
                        fontWeight: '750',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--muted-text)'
                      }}>
                        {t('crisis.involvedCountries', 'DELEGACIONES INVOLUCRADAS')}
                        {formPaises.length > 0 && (
                          <span style={{ color: 'var(--accent-color)', marginLeft: '6px' }}>
                            ({formPaises.length} seleccionadas)
                          </span>
                        )}
                      </label>
                      {formPaises.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormPaises([])}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted-text)',
                            fontSize: '0.68rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t('common.clear', 'Limpiar selección')}
                        </button>
                      )}
                    </div>
                    <div style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '5px',
                      padding: '8px',
                      backgroundColor: 'var(--card-header-bg)',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {paises.map(p => {
                        const sel = formPaises.includes(p.nombre);
                        return (
                          <button
                            key={p.id || p.nombre}
                            type="button"
                            onClick={() => {
                              setFormPaises(prev => sel ? prev.filter(x => x !== p.nombre) : [...prev, p.nombre]);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--border-radius, 6px)',
                              border: `1px solid ${sel ? 'var(--accent-color)' : 'var(--border-color)'}`,
                              backgroundColor: sel ? 'var(--accent-soft)' : 'var(--input-bg)',
                              color: sel ? 'var(--accent-color)' : 'var(--text-color)',
                              fontSize: '0.72rem',
                              fontWeight: sel ? '700' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <CountryFlag bandera={p.bandera} nombre={p.nombre} size="xs" />
                            <span>{p.nombre}</span>
                            {sel && <span style={{ fontSize: '0.65rem' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Retransmisión Visual y Opciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Imagen para Retransmisión de TV */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <label style={{
                      fontSize: '0.72rem',
                      fontWeight: '750',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--muted-text)'
                    }}>
                      {t('crisis.imageLabel', 'IMAGEN PARA LA RETRANSMISIÓN DE TV (OPCIONAL)')}
                    </label>
                    {formImagen && (
                      <button
                        type="button"
                        onClick={() => setFormImagen('')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {t('crisis.removeImage', 'Quitar imagen')}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '6px 10px',
                        color: 'var(--text-color)',
                        fontSize: '0.74rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <UploadCloud size={13} />
                      <span>{t('crisis.uploadFile', 'Subir Imagen')}</span>
                    </button>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <LinkIcon size={12} color="var(--muted-text)" style={{ position: 'absolute', left: '8px' }} />
                      <input
                        type="text"
                        placeholder={t('ui.orPasteAnImageUrl')}
                        value={formImagen.startsWith('data:') ? 'Imagen local cargada (' + Math.round(formImagen.length / 1024) + ' KB)' : formImagen}
                        onChange={(e) => {
                          if (!formImagen.startsWith('data:')) setFormImagen(e.target.value);
                          else setFormImagen('');
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '6px 8px 6px 26px',
                          fontSize: '0.76rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Preajustes de Fotos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--muted-text)' }}>{t('crisis.quickPhotos', 'Preajustes:')}</span>
                    {FOTOS_PRESET.map(fp => (
                      <button
                        key={fp.label}
                        type="button"
                        onClick={() => setFormImagen(fp.url)}
                        style={{
                          background: formImagen === fp.url ? 'var(--accent-soft)' : 'var(--input-bg)',
                          border: `1px solid ${formImagen === fp.url ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '2px 6px',
                          fontSize: '0.66rem',
                          color: formImagen === fp.url ? 'var(--accent-color)' : 'var(--muted-text)',
                          cursor: 'pointer'
                        }}
                      >
                        {fp.label}
                      </button>
                    ))}
                  </div>

                  {/* Vista previa 16:9 de la imagen */}
                  <div style={{
                    marginTop: '8px',
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    maxHeight: '140px',
                    borderRadius: 'var(--border-radius, 6px)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-header-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {formImagen ? (
                      <>
                        <img
                          src={formImagen}
                          alt={t('ui.broadcastPreview')}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(4px)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.62rem',
                          color: '#ffffff',
                          fontWeight: '750',
                          letterSpacing: '0.04em'
                        }}>
                          {t('ui.tvBroadcastPreview', 'VISTA PREVIA RETRANSMISIÓN TV')}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--muted-text)' }}>
                        <ImageIcon size={22} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '0.72rem' }}>{t('crisis.noImageSelected', 'Sin imagen adjunta (se usará el canal estándar)')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notificación y Sonido de Alarma */}
                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--card-header-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="chk-sound"
                      checked={formEmitirAlerta}
                      onChange={(e) => setFormEmitirAlerta(e.target.checked)}
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: '650', color: 'var(--text-color)' }}>
                        {t('crisis.playSoundOnPublish', 'Sonar alerta auditiva de transmisión de emergencia')}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                        {t('crisis.playSoundDesc', 'Emite un tono urgente en la sala y proyecta el pulso de crisis en directo.')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer de Acciones del Formulario */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '10px',
              borderTop: '1px solid var(--subborder-color)',
              marginTop: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setModalNuevoEvento(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                style={{
                  padding: '7px 18px',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid transparent',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  fontSize: '0.78rem',
                  fontWeight: '650',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={13} />
                <span>{t('crisis.publishImmediate', 'Publicar Alerta Inmediata')}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
        {/* ─── CABECERA DEL WIDGET (OPENMUN DESIGN SYSTEM) ─────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px 8px 14px',
        backgroundColor: 'transparent',
        borderBottom: '1px solid var(--subborder-color)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Título de Widget + Reloj Ficticio de Crisis */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: '650',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-color)'
          }}>
            <Megaphone size={16} style={{ color: 'var(--btn-bg)' }} />
            <span>{t('crisis.crisisRoom', 'Gabinete de Crisis')}</span>
          </h3>

          {/* Reloj Ficticio Pill */}
          <button
            onClick={abrirModalAjusteReloj}
            title={t('ui.clickToOpenTheExactCrisisClockAdjustmentPanel')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '3px 8px',
              color: 'var(--text-color)',
              fontSize: '0.74rem',
              fontWeight: '650',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={12} style={{ color: 'var(--accent-color)' }} />
            <span>{formatoHoraSimulada}</span>
            {relojSimulacion.velocidad > 1 && (
              <span style={{
                fontSize: '0.62rem',
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-color)',
                padding: '1px 4px',
                borderRadius: '3px',
                color: 'var(--accent-color)',
                fontWeight: '700'
              }}>
                {relojSimulacion.velocidad}x
              </span>
            )}
          </button>
        </div>

        {/* Acciones Principales y de Utilidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Acción Principal Dominante */}
          <button
            onClick={() => setModalNuevoEvento(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid transparent',
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              fontSize: '0.76rem',
              fontWeight: '650',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease'
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>{t('crisis.emitAlertBtn', 'Emitir Alerta')}</span>
          </button>

          {/* Sonido */}
          <button
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            title={sonidoHabilitado ? t('ui.audioAlarmEnabled') : t('ui.alarmMuted')}
            aria-pressed={sonidoHabilitado}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${sonidoHabilitado ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: sonidoHabilitado ? 'var(--accent-soft)' : 'var(--input-bg)',
              color: sonidoHabilitado ? 'var(--accent-color)' : 'var(--muted-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Modo Transmisión TV / Proyección */}
          <button
            onClick={() => setModoTransmisionCompleta(!modoTransmisionCompleta)}
            title={modoTransmisionCompleta ? t('ui.listMode') : t('ui.tvBroadcastProjectorMode')}
            aria-pressed={modoTransmisionCompleta}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${modoTransmisionCompleta ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: modoTransmisionCompleta ? 'var(--accent-soft)' : 'var(--input-bg)',
              color: modoTransmisionCompleta ? 'var(--accent-color)' : 'var(--muted-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {modoTransmisionCompleta ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ─── BARRA SECUNDARIA: CONTROLES DE SIMULACIÓN Y FILTROS ───────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px 8px 14px',
        borderBottom: '1px solid var(--subborder-color)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Controles de avance de reloj */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Play/Pause */}
          <button
            onClick={() => setRelojSimulacion(prev => ({ ...prev, activo: !prev.activo }))}
            title={relojSimulacion.activo ? t('ui.pauseSimulationClock') : t('ui.startSimulationClock')}
            aria-pressed={relojSimulacion.activo}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${relojSimulacion.activo ? 'var(--success-color)' : 'var(--border-color)'}`,
              backgroundColor: relojSimulacion.activo ? 'var(--success-soft)' : 'var(--input-bg)',
              color: relojSimulacion.activo ? 'var(--success-color)' : 'var(--muted-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {relojSimulacion.activo ? <Pause size={11} /> : <Play size={11} />}
          </button>

          {/* Salto +15 min y +1h */}
          <button
            onClick={() => avanzarTiempoSimulado(15)}
            title={t('ui.advance15SimulatedMinutes')}
            style={{
              padding: '3px 7px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            +15m
          </button>
          <button
            onClick={() => avanzarTiempoSimulado(60)}
            title={t('ui.advance1SimulatedHour')}
            style={{
              padding: '3px 7px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            +1h
          </button>

          <button
            onClick={abrirModalAjusteReloj}
            title={t('ui.setTheExactDayHourMinutesAndClockSpeed')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 7px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--muted-text)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={11} />
            <span>{t('common.edit', 'Ajustar')}</span>
          </button>
        </div>

        {/* Filtro, Plantillas, Import/Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={11} color="var(--muted-text)" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={{
                padding: '3px 7px',
                fontSize: '0.74rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
            >
              <option value="TODOS">{t('common.all', 'Todos')} ({eventosCrisis.length})</option>
              <option value="CRITICA">🔴 {t('crisis.criticalShort', 'Crítico')}</option>
              <option value="MILITAR">⚔️ {t('crisis.militaryShort', 'Militar')}</option>
              <option value="DIPLOMATICA">🌐 {t('crisis.diplomaticShort', 'Diplomático')}</option>
              <option value="ECONOMICA">💵 {t('crisis.economicShort', 'Económico')}</option>
              <option value="CIBERNETICA">⚡ {t('crisis.cyberneticShort', 'Ciberseguridad')}</option>
            </select>
          </div>

          <button
            onClick={() => setModalPlantillas(true)}
            title={t('ui.quickCrisisTemplates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 7px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FileText size={11} color="var(--muted-text)" />
            <span>{t('crisis.templates', 'Plantillas')}</span>
          </button>

          <button
            onClick={handleExportarCrisisJSON}
            title={t('ui.exportAllCrisisAlertsToAJsonFile')}
            style={{
              padding: '3px 6px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            <Download size={12} />
          </button>
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            title={t('ui.importCrisisAlertsFromAJsonFile')}
            style={{
              padding: '3px 6px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            <Upload size={12} />
          </button>
        </div>
      </div>

      {/* ─── BANNER TELEVISIVO ESTILO NOTICIERO (BREAKING NEWS TICKER) ──── */}
      {eventoBannerActivo && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderLeft: `4px solid ${catMeta.color}`,
          borderRadius: 'var(--border-radius, 6px)',
          margin: '10px 14px 4px 14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ticker Bar Superior */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: catMeta.color,
            color: '#ffffff',
            padding: '4px 10px',
            gap: '8px',
            fontSize: '0.72rem',
            fontWeight: '800',
            letterSpacing: '0.5px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              <Radio size={12} style={{ animation: 'pulse 1.5s infinite' }} />
              <span>{catMeta.badge}</span>
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.9, whiteSpace: 'nowrap' }}>
              {t('ui.source')} {eventoBannerActivo.fuente} · {eventoBannerActivo.horaSimulada}
            </div>
          </div>

          {/* Titular y Contenido Central */}
          <div style={{
            padding: modoTransmisionCompleta ? '18px 16px' : '10px 12px',
            background: 'linear-gradient(180deg, #11141c 0%, #0b0d13 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{
              fontSize: modoTransmisionCompleta ? '1.35rem' : '1.05rem',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: '1.25',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {eventoBannerActivo.titulo}
            </div>

            <div style={{
              fontSize: modoTransmisionCompleta ? '0.95rem' : '0.8rem',
              color: '#cbd5e1',
              lineHeight: '1.4'
            }}>
              {eventoBannerActivo.descripcion}
            </div>

            {/* Países Afectados / Banderas */}
            {eventoBannerActivo.paisesInvolucrados && eventoBannerActivo.paisesInvolucrados.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                  {t('crisis.involvedDelegationsUpper', 'DELEGACIONES IMPLICADAS')}:
                </span>
                {eventoBannerActivo.paisesInvolucrados.map(nombrePais => {
                  const pObj = paises.find(p => p.nombre === nombrePais) || { nombre: nombrePais, bandera: '🌐' };
                  return (
                    <div
                      key={nombrePais}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#f1f5f9'
                      }}
                    >
                      <CountryFlag bandera={pObj.bandera} nombre={pObj.nombre} size="xs" />
                      <span>{pObj.nombre}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VISTA FEED / TIMELINE DE CRISIS (CUANDO NO ESTÁ EN BROADCAST PURO) ─ */}
      {!modoTransmisionCompleta && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Lista de Sucesos en el Feed */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {eventosFiltrados.length === 0 ? (
              <EmptyState
                icon={Radio}
                title={filtroCategoria === 'TODOS'
                  ? t('crisis.noEventsTitle', 'Sin sucesos de crisis')
                  : t('crisis.noEventsFilteredTitle', 'Sin sucesos en esta categoría')}
                description={filtroCategoria === 'TODOS'
                  ? t('crisis.noEventsDesc', 'No hay alertas activas en el gabinete. Emite una alerta o carga una plantilla predefinida.')
                  : t('crisis.noEventsFilteredDesc', 'No se encontraron acontecimientos para el filtro seleccionado.')}
                actionLabel={t('crisis.emitAlertBtn', 'Emitir Alerta')}
                onAction={() => setModalNuevoEvento(true)}
                secondaryActionLabel={filtroCategoria === 'TODOS'
                  ? t('crisis.templates', 'Plantillas')
                  : t('common.showAll', 'Ver todos')}
                onSecondaryAction={filtroCategoria === 'TODOS'
                  ? () => setModalPlantillas(true)
                  : () => setFiltroCategoria('TODOS')}
              />
            ) : (
              eventosFiltrados.map(ev => {
                const meta = CATEGORIAS_CRISIS[ev.categoria] || CATEGORIAS_CRISIS.CRITICA;
                const IconComponent = meta.icon || Flame;
                const esBanner = ev.fijadoComoBanner;

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: esBanner ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                      border: `1px solid ${esBanner ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '10px 12px',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: meta.bg,
                          color: meta.color,
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          border: `1px solid ${meta.border}`
                        }}>
                          <IconComponent size={10} />
                          {meta.badge}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                          {ev.horaSimulada}
                        </span>
                        {ev.estado === 'Resuelto' && (
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: 'var(--success-soft)',
                            color: 'var(--success-color)',
                            border: '1px solid var(--success-color)',
                            fontSize: '0.62rem',
                            fontWeight: '700'
                          }}>
                            ✓ {t('crisis.resolved', 'Resuelto')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Fijar Banner */}
                        <button
                          onClick={() => handleFijarBanner(ev.id)}
                          title={esBanner ? t('ui.alertPinnedOnScreen') : t('ui.projectAsBreakingNews')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${esBanner ? 'transparent' : 'var(--border-color)'}`,
                            backgroundColor: esBanner ? 'var(--btn-bg)' : 'transparent',
                            color: esBanner ? 'var(--btn-text)' : 'var(--muted-text)',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Pin size={10} />
                          {esBanner ? t('crisis.onScreen', 'En Pantalla') : t('crisis.project', 'Proyectar')}
                        </button>

                        {/* Toggle Resuelto */}
                        <button
                          onClick={() => handleToggleEstado(ev.id)}
                          title={t('ui.toggleResolutionStatus')}
                          style={{
                            padding: '3px 5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: ev.estado === 'Resuelto' ? 'var(--success-color)' : 'var(--muted-text)',
                            backgroundColor: ev.estado === 'Resuelto' ? 'var(--success-soft)' : 'transparent',
                            borderColor: ev.estado === 'Resuelto' ? 'var(--success-color)' : 'var(--border-color)',
                            fontSize: '0.65rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={11} />
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => handleEliminarEvento(ev.id)}
                          title={t('ui.deleteEvent')}
                          style={{
                            padding: '3px 5px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--danger-color)',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: '650', color: 'var(--text-color)' }}>
                      {ev.titulo}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.35' }}>
                      {ev.descripcion}
                    </div>

                    {/* Países Involucrados */}
                    {ev.paisesInvolucrados && ev.paisesInvolucrados.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {ev.paisesInvolucrados.map(nP => {
                          const pObj = paises.find(p => p.nombre === nP) || { nombre: nP, bandera: '🌐' };
                          return (
                            <div
                              key={nP}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: 'var(--subnav-bg)',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.65rem',
                                color: 'var(--text-color)'
                              }}
                            >
                              <CountryFlag bandera={pObj.bandera} nombre={pObj.nombre} size="xs" />
                              <span>{pObj.nombre}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

        </>
      )}

      {/* ─── MODAL: PLANTILLAS RÁPIDAS DE CRISIS ─────────────────────────── */}
      {modalPlantillas && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'var(--panel-color)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '85%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--card-header-bg)',
              borderBottom: '1px solid var(--border-color)',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} />
                <span>{t('crisis.quickTemplates', 'Plantillas Rápidas de Crisis')}</span>
              </div>
              <button
                onClick={() => setModalPlantillas(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {PLANTILLAS_CRISIS.map((tpl, i) => {
                const meta = CATEGORIAS_CRISIS[tpl.categoria] || CATEGORIAS_CRISIS.CRITICA;
                return (
                  <div
                    key={i}
                    onClick={() => handleCargarPlantilla(tpl)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        fontSize: '0.65rem',
                        fontWeight: '800'
                      }}>
                        {meta.badge}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                        {t('crisis.useTemplate', 'Usar Plantilla →')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-color)' }}>
                      {tpl.titulo}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                      {tpl.descripcion}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: AJUSTE EXACTO DEL RELOJ DE CRISIS ────────────────────── */}
      {modalAjusteReloj && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--panel-color)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90%'
          }}>
            {/* Cabecera del Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--card-header-bg)',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-color)' }}>
                    {t('crisis.adjustClock', 'Ajuste Exacto del Reloj de Crisis')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                    {t('crisis.adjustClockDesc', 'Configura el día, la hora, los minutos y la velocidad de simulación')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalAjusteReloj(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <form onSubmit={handleGuardarAjusteReloj} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Display Digital de Hora Simulada */}
              <div style={{
                backgroundColor: 'var(--timer-display-bg)',
                border: '1px solid var(--timer-display-border)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {t('crisis.resultClock', 'HORA SIMULADA RESULTANTE')}
                </div>
                <div style={{
                  fontSize: '1.6rem',
                  fontWeight: '900',
                  color: 'var(--text-color)',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {t('timers.day', 'Día')} {formRelojDia} · {String(formRelojHoras).padStart(2, '0')}:{String(formRelojMinutos).padStart(2, '0')} hrs
                </div>
              </div>

              {/* Controles de Día, Horas y Minutos Exactos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {/* Día */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                    {t('crisis.dayOfCrisis', 'DÍA DE CRISIS')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormRelojDia(prev => Math.max(1, Number(prev) - 1))}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formRelojDia}
                      onChange={(e) => setFormRelojDia(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        flex: 1,
                        width: '100%',
                        textAlign: 'center',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        padding: '4px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormRelojDia(prev => Number(prev) + 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Horas (00 - 23) */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                    {t('crisis.hour', 'HORA (0-23)')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormRelojHoras(prev => (Number(prev) - 1 + 24) % 24)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={formRelojHoras}
                      onChange={(e) => setFormRelojHoras(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{
                        flex: 1,
                        width: '100%',
                        textAlign: 'center',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        padding: '4px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormRelojHoras(prev => (Number(prev) + 1) % 24)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Minutos (00 - 59) */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                    {t('crisis.minutes', 'MINUTOS (0-59)')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormRelojMinutos(prev => (Number(prev) - 1 + 60) % 60)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={formRelojMinutos}
                      onChange={(e) => setFormRelojMinutos(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{
                        flex: 1,
                        width: '100%',
                        textAlign: 'center',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        padding: '4px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormRelojMinutos(prev => (Number(prev) + 1) % 60)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Saltos Rápidos de Tiempo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '6px' }}>
                  {t('crisis.quickJumps', 'SALTOS RÁPIDOS DE TIEMPO SIMULADO')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    { label: '-1h', delta: -60 },
                    { label: '-15m', delta: -15 },
                    { label: '-5m', delta: -5 },
                    { label: '+5m', delta: 5 },
                    { label: '+15m', delta: 15 },
                    { label: '+30m', delta: 30 },
                    { label: '+1h', delta: 60 },
                    { label: '+6h', delta: 360 },
                    { label: t('ui.24hNextDay'), delta: 1440 }
                  ].map(s => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => aplicarSaltoEnFormulario(s.delta)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-header-bg)',
                        color: 'var(--text-color)',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={sincronizarConHoraReal}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🕒 {t('crisis.realTimePC', 'Hora Real de PC')}
                  </button>
                </div>
              </div>

              {/* Velocidad de Simulación */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '6px' }}>
                  {t('crisis.simulationSpeed', 'VELOCIDAD DE AVANCE AUTOMÁTICO')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    { val: 1, label: '1x (1s = 1s)' },
                    { val: 2, label: '2x' },
                    { val: 5, label: '5x' },
                    { val: 10, label: '10x' },
                    { val: 30, label: '30x' },
                    { val: 60, label: '60x (1s = 1min)' },
                    { val: 300, label: '300x (1s = 5min)' }
                  ].map(v => {
                    const sel = Number(formRelojVelocidad) === v.val;
                    return (
                      <button
                        key={v.val}
                        type="button"
                        onClick={() => setFormRelojVelocidad(v.val)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '5px',
                          border: `1px solid ${sel ? '#ef4444' : 'var(--border-color)'}`,
                          backgroundColor: sel ? 'rgba(239, 68, 68, 0.2)' : 'var(--card-header-bg)',
                          color: sel ? '#ffffff' : 'var(--muted-text)',
                          fontSize: '0.72rem',
                          fontWeight: sel ? '700' : '500',
                          cursor: 'pointer'
                        }}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets Rápidos de Simulación */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '6px' }}>
                  {t('crisis.schedulePresets', 'ESCENARIOS Y PRESETS RÁPIDOS DE HORARIO')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {[
                    { label: t('ui.day10830Opening'), dia: 1, h: 8, m: 30 },
                    { label: t('ui.day11300Recess'), dia: 1, h: 13, m: 0 },
                    { label: t('ui.day11800Closing'), dia: 1, h: 18, m: 0 },
                    { label: t('ui.day12345LateNight'), dia: 1, h: 23, m: 45 },
                    { label: t('ui.day20900Resuming'), dia: 2, h: 9, m: 0 },
                    { label: t('ui.day21630FinalVote'), dia: 2, h: 16, m: 30 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setFormRelojDia(p.dia);
                        setFormRelojHoras(p.h);
                        setFormRelojMinutos(p.m);
                      }}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-header-bg)',
                        color: 'var(--text-color)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado del Cronómetro (Activo / Pausado) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--card-header-bg)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                <input
                  type="checkbox"
                  id="chk-reloj-activo"
                  checked={formRelojActivo}
                  onChange={(e) => setFormRelojActivo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="chk-reloj-activo" style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-color)', cursor: 'pointer' }}>
                  {t('crisis.keepClockRunning', 'Dejar el reloj en marcha automáticamente tras aplicar cambios')}
                </label>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setModalAjusteReloj(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--muted-text)',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    fontSize: '0.8rem',
                    fontWeight: '650',
                    cursor: 'pointer',
                    boxShadow: 'none'
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                  {t('crisis.saveExactTime', 'Guardar y Fijar Hora Exacta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestorCrisis;
