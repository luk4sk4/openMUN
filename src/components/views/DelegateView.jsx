import i18n from '../../languages/index.js';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Radio, 
  Send, 
  Mic, 
  Clock, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Hand,
  Inbox,
  PenTool,
  HelpCircle,
  Vote,
  Zap,
  CheckCircle2,
  Lock,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Globe,
  RefreshCw,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Bell,
  Copy,
  Download,
  BookOpen,
  Filter,
  Edit3,
  Plus,
  FilePlus,
  FileMinus,
  FileSignature,
  ArrowRight,
  CheckCheck,
  Trash2,
  Users,
  RotateCcw,
  Hourglass,
  BarChart2
} from 'lucide-react';
import { BotonesConDerechos } from '../widgets/VotosConDerechos';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { getFlagEmoji } from '../../utils/flags';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import ConsoleNavbar from '../dashboard/ConsoleNavbar';
import ConferenceBanner from '../common/ConferenceBanner';
import MensajeriaComite from '../messaging/MensajeriaComite';
import MensajeriaConferencia from '../messaging/MensajeriaConferencia';
import { ignorarAviso, obtenerAvisosIgnorados, puedeBorrarAviso } from '../../utils/announcementHelpers';

import { parsearResolucion } from '../../utils/resolutionUtils';

// Parser inteligente de resolución para la vista de delegado (utiliza el motor unificado de resolutionUtils)
const parsearResolucionTexto = parsearResolucion;


const DelegateView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const {
    clientCountry,
    roomId,
    connectionStatus,
    notes,
    sendNote,
    requestSpeaking,
    remoteSessionState,
    roomSettings,
    castVote,
    submitAmendment,
    leaveRoom,
    selectCountry,
    resetCountrySelection,
    connectedPeers,
    requestFullSync,
    announcements = [],
    deleteAnnouncement
  } = useP2P();

  // Estados para Selección de País / Delegación inicial
  const [busquedaPais, setBusquedaPais] = useState('');
  const [paisSeleccionadoTemp, setPaisSeleccionadoTemp] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openmun_last_country');
      if (saved && saved !== 'null' && saved !== 'undefined') return saved.trim();
    }
    return '';
  });
  const [paisPersonalizadoInput, setPaisPersonalizadoInput] = useState('');
  const [isSubmittingCountry, setIsSubmittingCountry] = useState(false);
  const [countrySelectError, setCountrySelectError] = useState(null);

  const [activeTab, setActiveTab] = useState('DEBATE'); // 'DEBATE' | 'NOTAS' | 'ENMIENDAS' | 'AVISOS'
  const [avisosExpanded, setAvisosExpanded] = useState(true);
  const [filtroCategoriaAviso, setFiltroCategoriaAviso] = useState('todos');
  const [destinatario, setDestinatario] = useState('CHAIR');
  const [textoNota, setTextoNota] = useState('');
  const [tipoNota, setTipoNota] = useState('general'); // 'general' | 'urgente' | 'pregunta'

  const [descartadosAnnouncements, setDescartadosAnnouncements] = useState(() => obtenerAvisosIgnorados());

  useEffect(() => {
    const handleIgnorado = (e) => {
      if (e.detail?.id) {
        setDescartadosAnnouncements(prev => [...new Set([...prev, String(e.detail.id)])]);
      }
    };
    const handleRestaurado = (e) => {
      if (e.detail?.id) {
        setDescartadosAnnouncements(prev => prev.filter(id => String(id) !== String(e.detail.id)));
      }
    };
    window.addEventListener('openmun_aviso_ignorado', handleIgnorado);
    window.addEventListener('openmun_aviso_restaurado', handleRestaurado);
    return () => {
      window.removeEventListener('openmun_aviso_ignorado', handleIgnorado);
      window.removeEventListener('openmun_aviso_restaurado', handleRestaurado);
    };
  }, []);

  const visibleAnnouncements = useMemo(() => {
    return (announcements || []).filter(ann => !descartadosAnnouncements.map(String).includes(String(ann.id)));
  }, [announcements, descartadosAnnouncements]);

  const handleIgnorarAnnouncement = (id) => {
    ignorarAviso(id);
    setDescartadosAnnouncements(prev => [...new Set([...prev, String(id)])]);
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgente':
        return { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', label: t('ui.urgent3') };
      case 'logistica':
        return { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', label: t('ui.logistics') };
      case 'receso':
        return { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', label: t('ui.recess') };
      case 'documento':
        return { bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', label: t('ui.documentation') };
      case 'general':
      default:
        return { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'GENERAL' };
    }
  };

  // Estados para Mociones de Debate (alineado con PizarraMociones)
  const [pedirMocionOpen, setPedirMocionOpen] = useState(false);
  const [tipoMocion, setTipoMocion] = useState('Caucus Moderado');
  const [varianteConsultaMocion, setVarianteConsultaMocion] = useState('Estándar');
  const [posicionProponenteMocion, setPosicionProponenteMocion] = useState('Primero');
  const [temaMocion, setTemaMocion] = useState('');
  const [tiempoTotalMinMocion, setTiempoTotalMinMocion] = useState(10);
  const [tiempoOradorSegMocion, setTiempoOradorSegMocion] = useState(45);
  const [solicitudMocionHecha, setSolicitudMocionHecha] = useState(false);

  // Estados para Puntos Parlamentarios & POI
  const [pedirPuntoOpen, setPedirPuntoOpen] = useState(false);
  const [tipoPunto, setTipoPunto] = useState('Punto de Información (POI)');
  const [motivoPunto, setMotivoPunto] = useState('');
  const [solicitudPuntoHecha, setSolicitudPuntoHecha] = useState(false);

  const [solicitudGSLHecha, setSolicitudGSLHecha] = useState(false);
  const [solicitudCaucusHecha, setSolicitudCaucusHecha] = useState(false);
  const [subTabNotas, setSubTabNotas] = useState('BUZON'); // 'BUZON' | 'REDACTAR'
  const [miVotoEmitido, setMiVotoEmitido] = useState(null);

  // Estados de Enmiendas de Delegados y Visor de Resolución
  const [subTabEnmiendas, setSubTabEnmiendas] = useState('DOCUMENTO'); // 'DOCUMENTO' | 'ARTICULOS' | 'PROPONER' | 'HISTORIAL'
  const [busquedaDocEnmiendas, setBusquedaDocEnmiendas] = useState('');
  const [filtroEstadoEnmiendas, setFiltroEstadoEnmiendas] = useState('todos'); // 'todos' | 'pendiente' | 'aceptada' | 'rechazada'
  const [copiadoFeedback, setCopiadoFeedback] = useState(null);
  const [articuloExpandidoMap, setArticuloExpandidoMap] = useState({});

  const [tipoEnmiendaDel, setTipoEnmiendaDel] = useState('modificacion');
  const [artIdDel, setArtIdDel] = useState('');
  const [textoOriginalDel, setTextoOriginalDel] = useState('');
  const [textoPropuestoDel, setTextoPropuestoDel] = useState('');
  const [justificacionDel, setJustificacionDel] = useState('');
  const [enmiendaEnviadaFeedback, setEnmiendaEnviadaFeedback] = useState(false);
  const [misEnmiendasEnviadas, setMisEnmiendasEnviadas] = useState([]);

  // Si cambia el roomId de la sesión, limpiar estados y selecciones locales del delegado
  useEffect(() => {
    setMiVotoEmitido(null);
    setSolicitudGSLHecha(false);
    setSolicitudCaucusHecha(false);
    setSolicitudMocionHecha(false);
    setSolicitudPuntoHecha(false);
    setMisEnmiendasEnviadas([]);
  }, [roomId]);

  // Estado sincronizado desde el Chair
  const state = remoteSessionState || {};
  const settings = roomSettings || {};
  const oradoresCola = state.oradoresCola || [];
  const oradoresCaucus = state.oradoresCaucus || [];
  const votacionSesion = state.votacionSesion || {};

  // Resolución y Cláusulas estructuradas
  const resolucionData = state.enmiendasSesion || {};
  const rawArticulos = resolucionData.articulos || [];
  const rawTexto = resolucionData.textoResolucion || resolucionData.texto || '';
  const tituloResolucion = resolucionData.tituloProyecto || resolucionData.titulo || i18n.t('ui.draftResolution');
  const enmiendasGlobales = resolucionData.enmiendas || [];

  const articulosDoc = useMemo(() => {
    if (Array.isArray(rawArticulos) && rawArticulos.length > 0) return rawArticulos;
    if (rawTexto && rawTexto.trim()) {
      return parsearResolucionTexto(rawTexto);
    }
    return [];
  }, [rawArticulos, rawTexto]);

  const preambuloDoc = useMemo(() => {
    return articulosDoc.find(a => a.esPreambulo);
  }, [articulosDoc]);

  const articulosOperativosDoc = useMemo(() => {
    return articulosDoc.filter(a => !a.esPreambulo);
  }, [articulosDoc]);

  const articulosFiltradosDoc = useMemo(() => {
    if (!busquedaDocEnmiendas.trim()) return articulosOperativosDoc;
    const query = busquedaDocEnmiendas.toLowerCase().trim();
    return articulosOperativosDoc.filter(a => 
      (a.prefijo && a.prefijo.toLowerCase().includes(query)) ||
      (a.texto && a.texto.toLowerCase().includes(query))
    );
  }, [articulosOperativosDoc, busquedaDocEnmiendas]);

  const estaEnGSL = oradoresCola.some(o => (typeof o === 'string' ? o : o.nombre)?.toLowerCase() === clientCountry?.toLowerCase());
  const estaEnCaucus = oradoresCaucus.some(o => (typeof o === 'string' ? o : o.nombre)?.toLowerCase() === clientCountry?.toLowerCase());
  const paisesDisponibles = state.paises || [];

  const miPaisObj = useMemo(() => {
    if (!clientCountry) return null;
    return (paisesDisponibles || []).find(p => (typeof p === 'string' ? p : p.nombre)?.toLowerCase() === clientCountry.toLowerCase());
  }, [paisesDisponibles, clientCountry]);

  // Voto registrado en la sesión
  const miVotoRegistrado = useMemo(() => {
    const targetKey = miPaisObj?.id || clientCountry;
    return votacionSesion?.votos?.[targetKey] || (clientCountry ? votacionSesion?.votos?.[clientCountry] : null) || miVotoEmitido || null;
  }, [votacionSesion, miPaisObj, clientCountry, miVotoEmitido]);

  // Países ocupados por otros peers conectados
  const paisesOcupadosSet = useMemo(() => {
    const set = new Set();
    (connectedPeers || []).forEach(peer => {
      if (peer.country && peer.role === 'delegate') {
        set.add(peer.country.toLowerCase().trim());
      }
    });
    return set;
  }, [connectedPeers]);

  // Lista normalizada de países QUE EXISTEN EN ESA SESIÓN (sin fallback ficticio)
  const listaPaisesNormalizada = useMemo(() => {
    if (!Array.isArray(paisesDisponibles) || paisesDisponibles.length === 0) {
      return [];
    }

    return paisesDisponibles.map((p, idx) => {
      if (typeof p === 'string') {
        return { id: `p-${idx}`, nombre: p, bandera: getFlagEmoji(null, p) };
      }
      return {
        id: p.id || `p-${idx}`,
        nombre: p.nombre || p.name || 'Delegación',
        bandera: p.bandera || getFlagEmoji(p.bandera, p.nombre)
      };
    });
  }, [paisesDisponibles]);

  const paisesFiltrados = useMemo(() => {
    if (!busquedaPais.trim()) return listaPaisesNormalizada;
    const query = busquedaPais.toLowerCase().trim();
    return listaPaisesNormalizada.filter(p => p.nombre.toLowerCase().includes(query));
  }, [listaPaisesNormalizada, busquedaPais]);

  const handleConfirmCountrySelection = async (countryName) => {
    const finalName = (countryName || paisPersonalizadoInput || paisSeleccionadoTemp || '').trim();
    if (!finalName) {
      setCountrySelectError(t('ui.pleaseSelectOrEnterYourCountrySName'));
      return;
    }

    setIsSubmittingCountry(true);
    setCountrySelectError(null);
    try {
      const res = await selectCountry(finalName);
      if (!res.success) {
        setCountrySelectError(res.message || t('ui.couldNotSelectThisCountry'));
      }
    } catch (err) {
      setCountrySelectError(err.message || t('ui.connectionError'));
    } finally {
      setIsSubmittingCountry(false);
    }
  };

  // Manejador de Solicitud de Turno GSL
  const handlePedirGSL = () => {
    if (settings.speakerRequestMode === 'disabled') return;
    requestSpeaking('GSL', { country: clientCountry });
    setSolicitudGSLHecha(true);
    setTimeout(() => setSolicitudGSLHecha(false), 4000);
  };

  // Manejador de Solicitud de Turno Caucus
  const handlePedirCaucus = () => {
    if (settings.caucusRequestMode === 'disabled') return;
    requestSpeaking('CAUCUS', { country: clientCountry });
    setSolicitudCaucusHecha(true);
    setTimeout(() => setSolicitudCaucusHecha(false), 4000);
  };

  const presetsTotalMinMocion = [5, 10, 12, 15, 20];
  const presetsOradorSegMocion = [30, 45, 60, 90, 120];

  const esModeradoMocion = tipoMocion === 'Caucus Moderado';
  const esConsultaMocion = tipoMocion === 'Consulta General';
  const esNoModeradoMocion = tipoMocion === 'Caucus No Moderado';
  const esTourMocion = tipoMocion === 'Tour de Table';

  const intervencionesEstimadasMocion = useMemo(() => {
    if (!esModeradoMocion || !tiempoOradorSegMocion || tiempoOradorSegMocion <= 0) return 0;
    return Math.floor((Number(tiempoTotalMinMocion) * 60) / Number(tiempoOradorSegMocion));
  }, [esModeradoMocion, tiempoTotalMinMocion, tiempoOradorSegMocion]);

  const tiposMocionConfig = [
    {
      id: 'Caucus Moderado',
      nombre: 'Caucus Moderado',
      subtitulo: t('ui.timedSpeakingTurns'),
      icon: Mic,
      color: '#3b82f6',
      activeBg: 'rgba(59, 130, 246, 0.15)',
      activeBorder: '#3b82f6',
      textColor: '#93c5fd'
    },
    {
      id: 'Caucus No Moderado',
      nombre: 'Caucus No Moderado',
      subtitulo: t('ui.freeNegotiationAndDrafting'),
      icon: Users,
      color: '#a855f7',
      activeBg: 'rgba(168, 85, 247, 0.15)',
      activeBorder: '#a855f7',
      textColor: '#d8b4fe'
    },
    {
      id: 'Consulta General',
      nombre: 'Consulta General',
      subtitulo: t('ui.openDialogueOrThemedPingPong'),
      icon: MessageSquare,
      color: '#10b981',
      activeBg: 'rgba(16, 185, 129, 0.15)',
      activeBorder: '#10b981',
      textColor: '#6ee7b7'
    },
    {
      id: 'Tour de Table',
      nombre: 'Tour de Table',
      subtitulo: t('ui.contributionsFromAllDelegations'),
      icon: RotateCcw,
      color: '#f59e0b',
      activeBg: 'rgba(245, 158, 11, 0.15)',
      activeBorder: '#f59e0b',
      textColor: '#fcd34d'
    }
  ];

  const handleEnviarMocion = (e) => {
    e.preventDefault();
    if (!settings.allowMotions) return;
    if (!clientCountry || !temaMocion.trim()) return;

    let totalSeg = Number(tiempoTotalMinMocion) * 60;
    let oradorSeg = Number(tiempoOradorSegMocion);
    if (tipoMocion === 'Caucus No Moderado' || tipoMocion === 'Consulta General') {
      oradorSeg = 0;
    } else if (tipoMocion === 'Tour de Table') {
      totalSeg = 0;
    }

    requestSpeaking('MOTION', {
      country: clientCountry,
      tipo: tipoMocion === 'Consulta General' ? `Consulta General (${varianteConsultaMocion})` : tipoMocion,
      varianteConsulta: tipoMocion === 'Consulta General' ? varianteConsultaMocion : '',
      posicionProponente: posicionProponenteMocion,
      tema: temaMocion.trim(),
      tiempoTotal: totalSeg,
      tiempoOrador: oradorSeg
    });
    setPedirMocionOpen(false);
    setTemaMocion('');
    setSolicitudMocionHecha(true);
    setTimeout(() => setSolicitudMocionHecha(false), 5000);
  };

  const handleEnviarPunto = (e) => {
    e.preventDefault();
    requestSpeaking('POINT', {
      country: clientCountry,
      tipo: tipoPunto,
      tema: motivoPunto.trim() || tipoPunto,
      urgente: true
    });
    setPedirPuntoOpen(false);
    setMotivoPunto('');
    setSolicitudPuntoHecha(true);
    setTimeout(() => setSolicitudPuntoHecha(false), 5000);
  };



  const handleEmitirVoto = (opcion) => {
    castVote(opcion);
    setMiVotoEmitido(opcion);
  };

  const handlePrepararEnmiendaDeArticulo = (art, tipo = 'modificacion') => {
    setTipoEnmiendaDel(tipo);
    if (art) {
      setArtIdDel(art.id);
      if (tipo === 'modificacion' || tipo === 'supresion') {
        setTextoOriginalDel(art.texto || '');
        setTextoPropuestoDel(tipo === 'modificacion' ? (art.texto || '') : '');
      } else {
        setTextoOriginalDel('');
        setTextoPropuestoDel('');
      }
    } else {
      setArtIdDel('');
      setTextoOriginalDel('');
      setTextoPropuestoDel('');
    }
    setSubTabEnmiendas('PROPONER');
  };

  const handleCopiarTexto = (texto, label = 'Texto') => {
    if (!texto) return;
    try {
      navigator.clipboard.writeText(texto);
      setCopiadoFeedback(label);
      setTimeout(() => setCopiadoFeedback(null), 2500);
    } catch (err) {
      console.warn('Error al copiar al portapapeles:', err);
    }
  };

  const handleEliminarPropuestaEnviada = (propId) => {
    setMisEnmiendasEnviadas(prev => prev.filter(p => p.id !== propId));
  };

  const handleEnviarEnmiendaDelegado = (e) => {
    e.preventDefault();
    if (!textoPropuestoDel.trim() && tipoEnmiendaDel !== 'supresion') return;

    const artObj = articulosDoc.find(a => a.id === artIdDel);
    const artNum = artObj ? (artObj.prefijo || t('ui.article3', { v0: artObj.numero })) : i18n.t('ui.newArticle2');

    const nuevaPropuesta = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tipo: tipoEnmiendaDel,
      articuloId: artIdDel || null,
      articuloNumero: artNum,
      paisProponente: clientCountry || 'Delegación',
      textoOriginal: textoOriginalDel.trim(),
      textoPropuesto: textoPropuestoDel.trim(),
      justificacion: justificacionDel.trim(),
      timestamp: Date.now()
    };

    if (submitAmendment) {
      submitAmendment(nuevaPropuesta);
    }

    setMisEnmiendasEnviadas(prev => [nuevaPropuesta, ...prev]);
    setEnmiendaEnviadaFeedback(true);
    setTextoPropuestoDel('');
    setTextoOriginalDel('');
    setJustificacionDel('');
    setTimeout(() => setEnmiendaEnviadaFeedback(false), 5000);
  };

  // Filtrar notas que pertenecen a este país
  const misNotas = notes.filter(n => 
    n.from?.toLowerCase() === clientCountry?.toLowerCase() ||
    n.to?.toLowerCase() === clientCountry?.toLowerCase() ||
    n.to?.toUpperCase() === 'TODOS'
  );

  const delegateTabs = [
    { id: 'DEBATE', label: t('views.delegate.debateTab', 'Debate en Vivo'), icon: Mic },
    { id: 'ENMIENDAS', label: t('views.delegate.amendments', 'Enmiendas'), icon: FileText },
    { id: 'NOTAS', label: t('views.delegate.notesTab', 'Mensajes'), icon: MessageSquare, badge: misNotas.length },
    { id: 'AVISOS', label: t('views.staff.announcementsTab', 'Avisos'), icon: Megaphone, badge: visibleAnnouncements.length }
  ];

  const delegateNavbar = (
    <ConsoleNavbar
      title={t('views.delegate.title', 'Panel de Delegación')}
      roleBadge={clientCountry ? <><CountryFlag nombre={clientCountry} size="sm" />{clientCountry}</> : t('views.join.selectCountry', 'Selección de Delegación')}
      nombreComite={state.comision || state.nombreComite}
      agendaSesion={state.agendaSesion}
      roomId={roomId}
      connectedPeersCount={connectedPeers.length}
      activeTab={clientCountry ? activeTab : undefined}
      setActiveTab={setActiveTab}
      tabs={clientCountry ? delegateTabs : []}
      isLight={isLight}
      toggleThemeMode={toggleThemeMode}
      setIsAccessOpen={setIsAccessModalOpen}
      sidebarActions={clientCountry && (
        <button type="button" onClick={async () => {
          const ok = await confirm({
            title: t('views.delegate.changeCountry', 'Cambiar delegación'),
            message: t('views.delegate.confirmChangeCountry', '¿Deseas cambiar tu delegación asignada?'),
            confirmText: t('common.confirm', 'Aceptar'),
            cancelText: t('common.cancel', 'Cancelar'),
            type: 'warning'
          });
          if (ok) resetCountrySelection();
        }} title={t('views.delegate.changeCountry', 'Cambiar delegación')}>
          <RefreshCw size={16} /><span>{t('views.delegate.changeCountry', 'Cambiar delegación')}</span>
        </button>
      )}
      onExit={() => { leaveRoom(); onExit?.(); }}
      exitConfirmMessage={t('views.delegate.confirmExit', '¿Deseas desconectarte de la sala?')}
    />
  );

  // Si aún no ha seleccionado su país / delegación oficial de la sesión
  if (!clientCountry) {
    return (
      <div className="dashboard-shell" style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

        {delegateNavbar}

        {/* Banner de Avisos Oficiales */}
        <ConferenceBanner isLight={isLight} role="delegate" comiteId={roomId} />

        {/* Cuerpo Principal de Selección */}
        <main className="openmun-main-content openmun-selection-main" style={{
          padding: '1.5rem 1.25rem 11rem 1.25rem',
          maxWidth: '1300px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          flex: 1,
          boxSizing: 'border-box'
        }}>
          {/* Banner de Bienvenida y Comité */}
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                borderRadius: '8px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                <Globe size={14} /> {t('ui.officialSessionList')}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                {paisesFiltrados.length} {t('ui.delegationsAvailable')}
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              {t('views.join.selectCountry')}
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted-text)', lineHeight: '1.5' }}>
              {t('ui.clickYourDelegationToIdentifyYourselfInDebatesTheSpeakers')}
            </p>
          </div>

          {/* Mensaje de Error */}
          {countrySelectError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#f87171',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{countrySelectError}</span>
            </div>
          )}

          {/* Si el Chair todavía no ha cargado los países de la sesión */}
          {listaPaisesNormalizada.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1.5px dashed var(--subborder-color)',
              borderRadius: '16px',
              padding: '2.25rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '1rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={28} />
              </div>
              <div style={{ maxWidth: '520px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                  {t('ui.waitingForTheOfficialDelegationList')}
                </h3>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.84rem', color: 'var(--muted-text)', lineHeight: '1.5' }}>
                  {t('ui.theChairHasNotLoadedTheCountriesYetOrThey')}
                </p>
              </div>
              <button
                onClick={requestFullSync}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                }}
              >
                <RefreshCw size={14} /> {t('ui.syncSession')}
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Búsqueda */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder={t('ui.searchForYourCountryOrDelegation')}
                  value={busquedaPais}
                  onChange={e => setBusquedaPais(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem 0.75rem 2.4rem',
                    color: 'var(--text-color)',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                {busquedaPais && (
                  <button
                    onClick={() => setBusquedaPais('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted-text)',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Grid de Países */}
              <div className="openmun-countries-selection-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem'
              }}>
                {paisesFiltrados.map((p) => {
                  const estaOcupado = paisesOcupadosSet.has(p.nombre.toLowerCase().trim());
                  const isSelected = paisSeleccionadoTemp === p.nombre;

                  return (
                    <div
                      key={p.id || p.nombre}
                      className="openmun-country-card"
                      onClick={() => {
                        if (estaOcupado || isSubmittingCountry) return;
                        if (isSelected) {
                          handleConfirmCountrySelection(p.nombre);
                        } else {
                          setPaisSeleccionadoTemp(p.nombre);
                          setPaisPersonalizadoInput('');
                        }
                      }}
                      onDoubleClick={() => {
                        if (estaOcupado || isSubmittingCountry) return;
                        handleConfirmCountrySelection(p.nombre);
                      }}
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(34, 197, 94, 0.12)'
                          : (estaOcupado ? 'rgba(255,255,255,0.015)' : 'var(--panel-color)'),
                        border: `1.5px solid ${
                          isSelected
                            ? '#22c55e'
                            : (estaOcupado ? 'var(--subborder-color)' : 'var(--border-color)')
                        }`,
                        borderRadius: '12px',
                        padding: '0.85rem 0.95rem',
                        cursor: estaOcupado ? 'not-allowed' : 'pointer',
                        opacity: estaOcupado ? 0.45 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 16px rgba(34, 197, 94, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <CountryFlag bandera={p.bandera} nombre={p.nombre} size="md" />
                        <span style={{
                          fontWeight: isSelected ? '800' : '700',
                          fontSize: '0.88rem',
                          color: isSelected ? '#22c55e' : 'var(--text-color)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {p.nombre}
                        </span>
                      </div>

                      {estaOcupado ? (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          color: '#ef4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          {t('ui.occupied')}
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Opción de país personalizado SIEMPRE DISPONIBLE */}
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {listaPaisesNormalizada.length === 0 ? t('ui.orEnterYourDelegationSNameDirectly') : t('ui.isYourDelegationMissingFromTheListAbove')}
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <input
                type="text"
                placeholder={t('ui.enterYourDelegationSNameEGSpainFranceHoly')}
                value={paisPersonalizadoInput}
                onChange={e => {
                  setPaisPersonalizadoInput(e.target.value);
                  if (e.target.value) setPaisSeleccionadoTemp('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (paisPersonalizadoInput.trim() || paisSeleccionadoTemp)) {
                    handleConfirmCountrySelection(paisPersonalizadoInput.trim() || paisSeleccionadoTemp);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '10px',
                  padding: '0.7rem 1rem',
                  color: 'var(--text-color)',
                  fontWeight: '600',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* Botón de Confirmación Flotante */}
          <div className="openmun-bottom-floating-bar" style={{
            position: 'sticky',
            bottom: '16px',
            backgroundColor: 'var(--panel-color)',
            border: '1.5px solid var(--subborder-color)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 15px 35px rgba(0,0,0,0.45)',
            zIndex: 90
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                {t('ui.selectedDelegation')}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: (paisSeleccionadoTemp || paisPersonalizadoInput) ? '#22c55e' : 'var(--muted-text)', marginTop: '2px' }}>
                {paisSeleccionadoTemp || paisPersonalizadoInput || t('ui.noCountrySelected')}
              </div>
            </div>

            <button
              disabled={(!paisSeleccionadoTemp && !paisPersonalizadoInput.trim()) || isSubmittingCountry}
              onClick={() => handleConfirmCountrySelection(paisSeleccionadoTemp || paisPersonalizadoInput)}
              style={{
                backgroundColor: (!paisSeleccionadoTemp && !paisPersonalizadoInput.trim()) ? 'rgba(255,255,255,0.05)' : 'var(--btn-bg)',
                color: (!paisSeleccionadoTemp && !paisPersonalizadoInput.trim()) ? 'var(--muted-text)' : 'var(--btn-text)',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: '800',
                fontSize: '0.9rem',
                cursor: (!paisSeleccionadoTemp && !paisPersonalizadoInput.trim()) || isSubmittingCountry ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: (!paisSeleccionadoTemp && !paisPersonalizadoInput.trim()) ? 'none' : '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isSubmittingCountry ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> {t('ui.connecting')}
                </>
              ) : (
                <>
                  <Check size={16} /> {t('ui.enterSession')}
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-shell" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {delegateNavbar}

      <ConferenceBanner isLight={isLight} role="delegate" comiteId={roomId} />

      {/* ── Cuerpo Principal del Delegado ── */}
      <main className="openmun-main-content" style={{ padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1300px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* ── HOLDER PERMANENTE DE AVISOS IMPORTANTES (SECRETARÍA & STAFF) ── */}
        {visibleAnnouncements.length > 0 && activeTab !== 'AVISOS' && (
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1.5px solid rgba(245, 158, 11, 0.45)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Cabecera del Holder */}
            <div
              onClick={() => setAvisosExpanded(!avisosExpanded)}
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Megaphone size={17} color="#f59e0b" />
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: 'var(--text-color)' }}>
                  {t('views.announcements.holderTitle', 'Avisos Importantes de Secretaría & Staff')}
                </span>
                <span style={{
                  backgroundColor: '#f59e0b',
                  color: '#000000',
                  fontSize: '0.68rem',
                  fontWeight: '900',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px'
                }}>
                  {visibleAnnouncements.length} {visibleAnnouncements.length === 1 ? t('ui.announcement') : t('ui.announcements')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted-text)', fontSize: '0.74rem', fontWeight: '700' }}>
                <span>{avisosExpanded ? t('views.announcements.hide', 'Minimizar') : t('views.announcements.expand', 'Ver Detalle')}</span>
                {avisosExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>

            {/* Contenido Desplegado */}
            {avisosExpanded && (
              <div style={{
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {visibleAnnouncements.map((ann) => {
                  const badge = getPriorityBadge(ann.priority);
                  const esPropio = puedeBorrarAviso(ann, 'delegate');
                  return (
                    <div
                      key={ann.id}
                      style={{
                        backgroundColor: 'var(--card-header-bg)',
                        border: `1px solid ${badge.border}`,
                        borderLeft: `4px solid ${badge.text}`,
                        borderRadius: '10px',
                        padding: '0.8rem 0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            letterSpacing: '0.03em'
                          }}>
                            {badge.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                            {t('ui.from')} <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || t('conferences.issuerStaff')}</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                            {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {esPropio && (
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t('avisos.deleteNoticeTitle', 'Borrar aviso'),
                                  message: t('avisos.deleteNoticeConfirm', '¿Seguro que deseas eliminar este aviso?'),
                                  confirmText: t('common.delete', 'Eliminar'),
                                  cancelText: t('common.cancel', 'Cancelar'),
                                  type: 'danger'
                                });
                                if (ok) {
                                  deleteAnnouncement?.(ann.id);
                                }
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('avisos.deleteNoticeTooltip', 'Eliminar aviso para toda la sala')}
                            >
                              <Trash2 size={12} /> {t('avisos.deleteNotice', 'Eliminar')}
                            </button>
                          )}

                          <button
                            onClick={() => handleIgnorarAnnouncement(ann.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--subborder-color)',
                              color: 'var(--muted-text)',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              transition: 'all 0.15s ease'
                            }}
                            title={t('avisos.dismissTooltip', 'Descartar este aviso (ocultarlo de tu vista)')}
                          >
                            <EyeOff size={12} /> {t('avisos.dismiss', 'Descartar')}
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-color)' }}>
                        {ann.title}
                      </div>

                      {ann.text && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                          {ann.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'DEBATE' && (
          <>
            {/* 1. Votación en Vivo si está activa y permitida */}
            {settings.allowLiveVoting && votacionSesion?.asunto && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.9rem', color: '#60a5fa' }}>
                    <Vote size={18} /> {t('liveSession.allowLiveVoting')}
                  </div>
                  {miVotoRegistrado && (
                    <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={13} /> {t('ui.voteCast')} {
                        miVotoRegistrado === 'favor_derechos' ? t('voting.inFavorWithRights') :
                        miVotoRegistrado === 'contra_derechos' ? t('voting.againstWithRights') :
                        miVotoRegistrado === 'favor' ? t('voting.inFavor') :
                        miVotoRegistrado === 'contra' ? t('voting.against') :
                        miVotoRegistrado === 'abstencion' ? t('voting.abstention') :
                        miVotoRegistrado === 'pasar' ? t('ui.pass') : miVotoRegistrado
                      }{votacionSesion.derechos?.[miPaisObj?.id || clientCountry] && ' · ' + t('voting.withRights')}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>
                  {votacionSesion.asunto}
                </div>

                {votacionSesion?.tipoVotacion === 'procedural' && (
                  <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '600' }}>
                    {t('ui.proceduralVoteAbstentionsAreNotAllowed')}
                  </div>
                )}

                <BotonesConDerechos tipoVotacion={votacionSesion.tipoVotacion} onVote={handleEmitirVoto} voto={miVotoRegistrado?.replace('_derechos', '')} conDerechos={votacionSesion.derechos?.[miPaisObj?.id || clientCountry] || miVotoRegistrado?.endsWith('_derechos')} />
                <div className="openmun-grid-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEmitirVoto('favor')}
                    style={{
                      backgroundColor: miVotoRegistrado === 'favor' ? '#22c55e' : 'rgba(34, 197, 94, 0.15)',
                      color: miVotoRegistrado === 'favor' ? '#ffffff' : '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.3rem',
                      fontWeight: '800',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t('voting.inFavor')}
                  </button>

                  <button
                    onClick={() => handleEmitirVoto('contra')}
                    style={{
                      backgroundColor: miVotoRegistrado === 'contra' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                      color: miVotoRegistrado === 'contra' ? '#ffffff' : '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.3rem',
                      fontWeight: '800',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t('voting.against')}
                  </button>

                  <button
                    disabled={votacionSesion?.tipoVotacion === 'procedural'}
                    onClick={() => handleEmitirVoto('abstencion')}
                    style={{
                      backgroundColor: votacionSesion?.tipoVotacion === 'procedural'
                        ? 'rgba(255,255,255,0.03)'
                        : (miVotoRegistrado === 'abstencion' ? '#eab308' : 'rgba(234, 179, 8, 0.15)'),
                      color: votacionSesion?.tipoVotacion === 'procedural'
                        ? 'var(--muted-text)'
                        : (miVotoRegistrado === 'abstencion' ? '#ffffff' : '#fde047'),
                      border: `1px solid ${votacionSesion?.tipoVotacion === 'procedural' ? 'var(--subborder-color)' : 'rgba(234, 179, 8, 0.4)'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.3rem',
                      fontWeight: '800',
                      fontSize: '0.78rem',
                      cursor: votacionSesion?.tipoVotacion === 'procedural' ? 'not-allowed' : 'pointer',
                      opacity: votacionSesion?.tipoVotacion === 'procedural' ? 0.4 : 1
                    }}
                    title={votacionSesion?.tipoVotacion === 'procedural' ? t('ui.abstentionsAreNotAllowedOnMotionsOrProceduralMatters') : ''}
                  >
                    {t('voting.abstention')}
                  </button>

                  <button
                    onClick={() => handleEmitirVoto('pasar')}
                    style={{
                      backgroundColor: miVotoRegistrado === 'pasar' ? '#6b7280' : 'rgba(107, 114, 128, 0.15)',
                      color: miVotoRegistrado === 'pasar' ? '#ffffff' : '#d1d5db',
                      border: '1px solid rgba(107, 114, 128, 0.4)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.3rem',
                      fontWeight: '800',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t('ui.pass')}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Panel de Acciones de Orador (GSL y Caucus) adaptativo */}
            <div className="openmun-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Botón / Estado GSL */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Zap size={16} color="#3b82f6" /> {t('ui.generalSpeakersListGsl')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '3px' }}>
                    {settings.speakerRequestMode === 'direct'
                      ? t('ui.directModeJoinImmediately')
                      : (settings.speakerRequestMode === 'approval'
                          ? t('ui.requiresChairApproval')
                          : t('ui.requestsClosedByTheChair'))}
                  </div>
                </div>

                {estaEnGSL ? (
                  <div style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}>
                    <CheckCircle size={14} /> {t('ui.youAreAlreadyOnTheGsl')}
                  </div>
                ) : (
                  <button
                    disabled={settings.speakerRequestMode === 'disabled' || solicitudGSLHecha}
                    onClick={handlePedirGSL}
                    style={{
                      backgroundColor: settings.speakerRequestMode === 'disabled'
                        ? 'rgba(255,255,255,0.05)'
                        : (solicitudGSLHecha ? '#22c55e' : 'var(--btn-bg)'),
                      color: settings.speakerRequestMode === 'disabled' ? 'var(--muted-text)' : 'var(--btn-text)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: settings.speakerRequestMode === 'disabled' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      boxShadow: settings.speakerRequestMode === 'disabled' ? 'none' : '0 4px 12px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {settings.speakerRequestMode === 'disabled' ? (
                      <><Lock size={14} /> {t('ui.closed')}</>
                    ) : (
                      solicitudGSLHecha ? <><Check size={14} /> {t('ui.requestSent')}</> : <><Mic size={14} /> {t('ui.requestGslSpeakingTurn')}</>
                    )}
                  </button>
                )}
              </div>

              {/* Botón / Estado Debate */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={16} color="#a855f7" /> {t('sidebar.widgets.pizarra_mociones.category')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '3px' }}>
                    {settings.caucusRequestMode === 'direct'
                      ? t('ui.directModeJoinImmediately')
                      : (settings.caucusRequestMode === 'approval'
                          ? t('ui.requiresChairApproval')
                          : t('ui.requestsClosed'))}
                  </div>
                </div>

                {estaEnCaucus ? (
                  <div style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}>
                    <CheckCircle size={14} /> {t('ui.onTheDebateList')}
                  </div>
                ) : (
                  <button
                    disabled={settings.caucusRequestMode === 'disabled' || solicitudCaucusHecha}
                    onClick={handlePedirCaucus}
                    style={{
                      backgroundColor: settings.caucusRequestMode === 'disabled'
                        ? 'rgba(255,255,255,0.05)'
                        : (solicitudCaucusHecha ? '#a855f7' : 'var(--btn-bg)'),
                      color: settings.caucusRequestMode === 'disabled' ? 'var(--muted-text)' : 'var(--btn-text)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: settings.caucusRequestMode === 'disabled' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      boxShadow: settings.caucusRequestMode === 'disabled' ? 'none' : '0 4px 12px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {settings.caucusRequestMode === 'disabled' ? (
                      <><Lock size={14} /> {t('ui.closed')}</>
                    ) : (
                      solicitudCaucusHecha ? <><Check size={14} /> {t('ui.requestSent')}</> : <><Mic size={14} /> {t('ui.requestDebateSpeakingTurn')}</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 3. Panel Separado: Mociones de Debate y Puntos Parlamentarios */}
            <div className="openmun-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Card A: Mociones de Debate */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6' }}>
                    <FileText size={16} /> {t('ui.debateMotion')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '4px', lineHeight: '1.4' }}>
                    {settings.allowMotions
                      ? t('ui.proposeADebateUnmoderatedCaucusConsultationOrRoundRobin')
                      : t('ui.motionsDisabledByTheChair')}
                  </div>
                </div>

                <button
                  disabled={!settings.allowMotions}
                  onClick={() => setPedirMocionOpen(true)}
                  style={{
                    backgroundColor: settings.allowMotions ? 'var(--card-header-bg)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--subborder-color)',
                    color: settings.allowMotions ? 'var(--text-color)' : 'var(--muted-text)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: settings.allowMotions ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {settings.allowMotions ? (
                    solicitudMocionHecha ? (
                      <><Check size={14} style={{ color: '#22c55e' }} /> {t('ui.motionSent')}</>
                    ) : (
                      <><Plus size={14} /> {t('views.delegate.raiseMotion')}</>
                    )
                  ) : (
                    <><Lock size={14} /> {t('ui.blocked')}</>
                  )}
                </button>
              </div>

              {/* Card B: Puntos Parlamentarios & POI */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#eab308' }}>
                    <HelpCircle size={16} /> {t('ui.pointsPoi')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '4px', lineHeight: '1.4' }}>
                    {t('ui.pointOfInformationPoiPersonalPrivilegeOrderOrParliamentaryInquiry')}
                  </div>
                </div>

                <button
                  onClick={() => setPedirPuntoOpen(true)}
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.12)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    color: '#eab308',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Hand size={14} /> {t('ui.raisePointPoi')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: PAJES / NOTAS                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: MENSAJERÍA & NOTAS AL COMITÉ                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'NOTAS' && (
          <MensajeriaComite
            currentRole="delegate"
            clientCountry={clientCountry}
            paises={paisesDisponibles}
            currentComiteId={roomId}
            currentComiteNombre={state.comision || state.nombreComite || 'Comité'}
            layout="split"
            showHeader={false}
          />
        )}

        {/* ── PESTAÑA DE ENMIENDAS Y RESOLUCIONES ── */}
        {activeTab === 'ENMIENDAS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Barra superior de contextualización y sincronización */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.85rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <FileSignature size={18} color="#3b82f6" />
                    <span>{tituloResolucion}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>{articulosDoc.length} {t('ui.clausesArticles')}</span>
                    <span>•</span>
                    <span>{enmiendasGlobales.length} {t('ui.amendmentsInSession')}</span>
                    <span>•</span>
                    <span style={{ color: '#22c55e', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                      {t('ui.syncedLive')}
                    </span>
                  </div>
                </div>

                {/* Acciones de Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleCopiarTexto(
                      rawTexto || articulosDoc.map(a => `${a.prefijo ? a.prefijo + ' ' : ''}${a.texto}`).join('\n\n'),
                      i18n.t('ui.fullResolution')
                    )}
                    disabled={articulosDoc.length === 0}
                    style={{
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--text-color)',
                      borderRadius: '7px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: articulosDoc.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: articulosDoc.length === 0 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                    title={t('ui.copyFullResolutionText')}
                  >
                    <Copy size={13} />
                    <span>{t('ui.copyText')}</span>
                  </button>

                  <button
                    onClick={requestFullSync}
                    style={{
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--text-color)',
                      borderRadius: '7px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                    title={t('ui.reloadTheLatestResolutionAndAmendmentStateFromTheChair')}
                  >
                    <RefreshCw size={13} />
                    <span>{t('conferences.sync')}</span>
                  </button>
                </div>
              </div>

              {/* Sub-navegación interna de Enmiendas */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                backgroundColor: 'var(--card-header-bg)',
                padding: '0.25rem',
                borderRadius: '8px',
                border: '1px solid var(--subborder-color)',
                overflowX: 'auto'
              }}>
                <button
                  type="button"
                  onClick={() => setSubTabEnmiendas('DOCUMENTO')}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: subTabEnmiendas === 'DOCUMENTO' ? 'var(--btn-bg)' : 'transparent',
                    color: subTabEnmiendas === 'DOCUMENTO' ? 'var(--btn-text)' : 'var(--muted-text)',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <BookOpen size={13} />
                  <span>{t('ui.viewDocument')}</span>
                  {articulosDoc.length > 0 && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '10px',
                      backgroundColor: subTabEnmiendas === 'DOCUMENTO' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                      fontWeight: '800'
                    }}>
                      {articulosDoc.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabEnmiendas('ARTICULOS')}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: subTabEnmiendas === 'ARTICULOS' ? 'var(--btn-bg)' : 'transparent',
                    color: subTabEnmiendas === 'ARTICULOS' ? 'var(--btn-text)' : 'var(--muted-text)',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={13} />
                  <span>{t('ui.byClause')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabEnmiendas('PROPONER')}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: subTabEnmiendas === 'PROPONER' ? 'var(--btn-bg)' : 'transparent',
                    color: subTabEnmiendas === 'PROPONER' ? 'var(--btn-text)' : 'var(--muted-text)',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Edit3 size={13} />
                  <span>{t('ui.draftAmendment')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabEnmiendas('HISTORIAL')}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: subTabEnmiendas === 'HISTORIAL' ? 'var(--btn-bg)' : 'transparent',
                    color: subTabEnmiendas === 'HISTORIAL' ? 'var(--btn-text)' : 'var(--muted-text)',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={13} />
                  <span>{t('ui.history')}{misEnmiendasEnviadas.length})</span>
                </button>
              </div>
            </div>

            {/* Notificaciones de Feedback (Copiado / Enmienda enviada) */}
            {copiadoFeedback && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                animation: 'scaleUp 0.2s ease'
              }}>
                <CheckCheck size={16} /> {t('ui.copiedItem', { item: copiadoFeedback })}
              </div>
            )}

            {enmiendaEnviadaFeedback && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#22c55e',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                animation: 'scaleUp 0.2s ease'
              }}>
                <CheckCircle2 size={16} /> {t('ui.amendmentProposalSentToTheChairForReview')}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-TAB 1: VISTA DOCUMENTO COMPLETO (LECTOR DE RESOLUCIÓN)      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {subTabEnmiendas === 'DOCUMENTO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Buscador dentro del documento */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    placeholder={t('ui.searchKeywordsArticlesOrTermsInTheResolution')}
                    value={busquedaDocEnmiendas}
                    onChange={e => setBusquedaDocEnmiendas(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                      fontWeight: '500'
                    }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                  {busquedaDocEnmiendas && (
                    <button
                      onClick={() => setBusquedaDocEnmiendas('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Hoja Formal de Resolución Diplomatica */}
                {articulosDoc.length === 0 ? (
                  <div style={{
                    padding: '3.5rem 1.5rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--panel-color)',
                    borderRadius: '12px',
                    border: '1px dashed var(--subborder-color)',
                    color: 'var(--muted-text)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <FileText size={36} style={{ opacity: 0.3 }} />
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-color)' }}>
                      {t('ui.noResolutionDocument')}
                    </div>
                    <div style={{ fontSize: '0.8rem', maxWidth: '420px', lineHeight: 1.5 }}>
                      {t('ui.theChairHasNotTransmittedTheResolutionTextOrDraft')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={requestFullSync}
                        style={{
                          backgroundColor: 'var(--btn-bg)',
                          color: 'var(--btn-text)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.45rem 0.9rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <RefreshCw size={13} /> {t('conferences.sync')}
                      </button>
                      <button
                        onClick={() => handlePrepararEnmiendaDeArticulo(null, 'adicion')}
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#22c55e',
                          borderRadius: '6px',
                          padding: '0.45rem 0.9rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Plus size={13} /> {t('ui.proposeInitialClause')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}>
                    {/* Membrete Oficial */}
                    <div style={{
                      borderBottom: '2px solid var(--subborder-color)',
                      paddingBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        color: 'var(--muted-text)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em'
                      }}>
                        {t('ui.unitedNationsOfficialWorkingPaper')}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#60a5fa', lineHeight: 1.3 }}>
                        {tituloResolucion}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                        {t('ui.committee')} <strong style={{ color: 'var(--text-color)' }}>{state.comision || state.nombreComite || t('agenda.templateGA')}</strong>
                      </div>
                    </div>

                    {/* Sección Preambular */}
                    {preambuloDoc && (
                      <div style={{
                        backgroundColor: 'rgba(168, 85, 247, 0.04)',
                        borderLeft: '3px solid #a855f7',
                        borderRadius: '0 8px 8px 0',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: '#a855f7',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {t('ui.preambulatoryClauses')}
                          </span>
                          <button
                            onClick={() => handlePrepararEnmiendaDeArticulo(preambuloDoc, 'modificacion')}
                            style={{
                              backgroundColor: 'rgba(168, 85, 247, 0.15)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              color: '#c084fc',
                              borderRadius: '5px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Edit3 size={11} /> {t('ui.amendPreamble')}
                          </button>
                        </div>
                        <div style={{
                          fontSize: '0.84rem',
                          lineHeight: 1.65,
                          fontStyle: 'italic',
                          color: 'var(--text-color)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {preambuloDoc.texto}
                        </div>
                      </div>
                    )}

                    {/* Sección Cláusulas Operativas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        color: '#3b82f6',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{t('ui.operativeClauses')}{articulosFiltradosDoc.length})</span>
                        <button
                          onClick={() => handlePrepararEnmiendaDeArticulo(null, 'adicion')}
                          style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.12)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            borderRadius: '5px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Plus size={12} /> {t('ui.addClause')}
                        </button>
                      </div>

                      {articulosFiltradosDoc.map(art => {
                        const enmiendasEsteArt = enmiendasGlobales.filter(e => e.articuloId === art.id);
                        const tieneEnmiendasAprobadas = enmiendasEsteArt.some(e => e.estado === 'aceptada' || e.estado === 'aprobada');
                        const tieneEnmiendasPendientes = enmiendasEsteArt.some(e => !e.estado || e.estado === 'pendiente');

                        return (
                          <div
                            key={art.id}
                            style={{
                              backgroundColor: 'var(--card-header-bg)',
                              border: `1px solid ${art.modificado || tieneEnmiendasAprobadas ? 'rgba(34, 197, 94, 0.4)' : 'var(--subborder-color)'}`,
                              borderRadius: '8px',
                              padding: '0.9rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              position: 'relative',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Cabecera de la Cláusula */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                  color: '#3b82f6',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px'
                                }}>
                                  {art.prefijo || t('ui.article3', { v0: art.numero })}
                                </span>

                                {(art.modificado || tieneEnmiendasAprobadas) && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <CheckCircle2 size={10} /> {t('ui.amended')}
                                  </span>
                                )}

                                {tieneEnmiendasPendientes && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                                    color: '#eab308',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px'
                                  }}>
                                    {t('ui.amendmentUnderDebate')}
                                  </span>
                                )}
                              </div>

                              {/* Barra de Acciones Directas de la Cláusula */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <button
                                  onClick={() => handleCopiarTexto(`${art.prefijo ? art.prefijo + ' ' : ''}${art.texto}`, art.prefijo || i18n.t('ui.clause'))}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid var(--subborder-color)',
                                    color: 'var(--muted-text)',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.68rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title={t('ui.copyThisClauseSText')}
                                >
                                  <Copy size={11} /> {t('ui.copy')}
                                </button>

                                <button
                                  onClick={() => handlePrepararEnmiendaDeArticulo(art, 'modificacion')}
                                  style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#60a5fa',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title={t('ui.proposeAModificationToThisClause')}
                                >
                                  <Edit3 size={11} /> {t('ui.amend')}
                                </button>

                                <button
                                  onClick={() => handlePrepararEnmiendaDeArticulo(art, 'supresion')}
                                  style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title={t('ui.proposeDeletingThisClause')}
                                >
                                  <FileMinus size={11} /> {t('ui.delete')}
                                </button>
                              </div>
                            </div>

                            {/* Contenido de la Cláusula */}
                            <div style={{
                              fontSize: '0.85rem',
                              lineHeight: 1.6,
                              color: 'var(--text-color)',
                              whiteSpace: 'pre-wrap',
                              userSelect: 'text'
                            }}>
                              {art.texto}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-TAB 2: VISTA POR CLÁUSULAS (DESGLOSE EN TARJETAS)           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {subTabEnmiendas === 'ARTICULOS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  backgroundColor: 'var(--card-header-bg)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--subborder-color)'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Filter size={13} color="var(--muted-text)" />
                    <span>{t('ui.clauseFilter')}</span>
                  </div>

                  <select
                    value={filtroEstadoEnmiendas}
                    onChange={e => setFiltroEstadoEnmiendas(e.target.value)}
                    style={{
                      backgroundColor: 'var(--panel-color)',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--text-color)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.74rem',
                      fontWeight: '600'
                    }}
                  >
                    <option value="todos">{t('ui.allClauses')}{articulosOperativosDoc.length})</option>
                    <option value="modificadas">{t('ui.amendedOnly')}</option>
                    <option value="con_enmiendas">{t('ui.withAmendmentsInSession')}</option>
                  </select>

                  <button
                    onClick={() => handlePrepararEnmiendaDeArticulo(null, 'adicion')}
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22c55e',
                      borderRadius: '6px',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Plus size={13} /> {t('ui.proposeNewClause')}
                  </button>
                </div>

                {articulosOperativosDoc.map(art => {
                  const enmiendasArt = enmiendasGlobales.filter(e => e.articuloId === art.id);
                  if (filtroEstadoEnmiendas === 'modificadas' && !art.modificado) return null;
                  if (filtroEstadoEnmiendas === 'con_enmiendas' && enmiendasArt.length === 0) return null;

                  return (
                    <div
                      key={art.id}
                      style={{
                        backgroundColor: 'var(--panel-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: '800',
                            color: '#60a5fa'
                          }}>
                            {art.prefijo || t('ui.article3', { v0: art.numero })}
                          </span>
                          {art.modificado && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              backgroundColor: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              {t('ui.modified2')}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            onClick={() => handlePrepararEnmiendaDeArticulo(art, 'modificacion')}
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              borderRadius: '5px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Edit3 size={11} /> {t('ui.modify')}
                          </button>
                          <button
                            onClick={() => handlePrepararEnmiendaDeArticulo(art, 'supresion')}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '5px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <FileMinus size={11} /> {t('ui.delete')}
                          </button>
                        </div>
                      </div>

                      <div style={{
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        backgroundColor: 'var(--card-header-bg)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--subborder-color)'
                      }}>
                        {art.texto}
                      </div>

                      {/* Enmiendas de la sesión asociadas a este artículo */}
                      {enmiendasArt.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                            {t('ui.registeredAmendments')}{enmiendasArt.length})
                          </div>
                          {enmiendasArt.map(e => (
                            <div
                              key={e.id}
                              style={{
                                backgroundColor: 'var(--card-header-bg)',
                                border: `1px solid ${e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.4)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.3)' : 'var(--subborder-color)'}`,
                                borderRadius: '6px',
                                padding: '0.5rem 0.65rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.2rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '800', color: '#60a5fa' }}>
                                  {e.tipo?.toUpperCase()} {t('ui.by')} {e.paisProponente}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.2)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                  color: e.estado === 'aceptada' ? '#22c55e' : e.estado === 'rechazada' ? '#ef4444' : '#eab308'
                                }}>
                                  {e.estado?.toUpperCase() || t('ui.inDebate')}
                                </span>
                              </div>
                              {e.textoPropuesto && (
                                <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>
                                  + {e.textoPropuesto}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-TAB 3: REDACTAR Y PROPONER ENMIENDA (COMPOSER CON DIFF)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {subTabEnmiendas === 'PROPONER' && (
              <form onSubmit={handleEnviarEnmiendaDelegado} style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Edit3 size={18} color="#3b82f6" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
                      {t('ui.draftAmendmentProposal')}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '5px'
                  }}>
                    {t('ui.proponent')} {clientCountry || t('history.delegation')}
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', lineHeight: 1.4 }}>
                  {t('ui.writeYourFormalAmendmentProposalItWillBeSentInstantly')}
                </div>

                {/* 1. Selector de Naturaleza de la Enmienda */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('ui.amendmentType')}
                  </label>
                  <div 
                    className="selector-tipo-enmienda-del"
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', 
                      gap: '0.45rem', 
                      marginTop: '0.35rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setTipoEnmiendaDel('modificacion')}
                      style={{
                        padding: '0.5rem 0.3rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${tipoEnmiendaDel === 'modificacion' ? '#3b82f6' : 'var(--subborder-color)'}`,
                        backgroundColor: tipoEnmiendaDel === 'modificacion' ? 'rgba(59, 130, 246, 0.2)' : 'var(--card-header-bg)',
                        color: tipoEnmiendaDel === 'modificacion' ? '#60a5fa' : 'var(--text-color)',
                        fontWeight: '800',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.modification')}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.replaceText')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoEnmiendaDel('adicion')}
                      style={{
                        padding: '0.5rem 0.3rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${tipoEnmiendaDel === 'adicion' ? '#22c55e' : 'var(--subborder-color)'}`,
                        backgroundColor: tipoEnmiendaDel === 'adicion' ? 'rgba(34, 197, 94, 0.2)' : 'var(--card-header-bg)',
                        color: tipoEnmiendaDel === 'adicion' ? '#22c55e' : 'var(--text-color)',
                        fontWeight: '800',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.addition')}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.addNewText')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoEnmiendaDel('supresion')}
                      style={{
                        padding: '0.5rem 0.3rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${tipoEnmiendaDel === 'supresion' ? '#ef4444' : 'var(--subborder-color)'}`,
                        backgroundColor: tipoEnmiendaDel === 'supresion' ? 'rgba(239, 68, 68, 0.2)' : 'var(--card-header-bg)',
                        color: tipoEnmiendaDel === 'supresion' ? '#ef4444' : 'var(--text-color)',
                        fontWeight: '800',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.deletion')}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{t('ui.strikeOutDelete')}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Selector de Artículo / Cláusula */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                      {t('ui.clauseToAmend')}
                    </label>
                    {artIdDel && (
                      <button
                        type="button"
                        onClick={() => {
                          const art = articulosDoc.find(a => a.id === artIdDel);
                          if (art) {
                            setTextoOriginalDel(art.texto);
                            if (tipoEnmiendaDel === 'modificacion') setTextoPropuestoDel(art.texto);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#60a5fa',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {t('ui.restoreOriginalText')}
                      </button>
                    )}
                  </div>

                  <select
                    value={artIdDel}
                    onChange={e => {
                      const newId = e.target.value;
                      setArtIdDel(newId);
                      const art = articulosDoc.find(a => a.id === newId);
                      if (art) {
                        setTextoOriginalDel(art.texto);
                        if (tipoEnmiendaDel === 'modificacion') {
                          setTextoPropuestoDel(art.texto);
                        }
                      } else {
                        setTextoOriginalDel('');
                        setTextoPropuestoDel('');
                      }
                    }}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                      fontWeight: '600'
                    }}
                  >
                    <option value="">{t('ui.addAsNewClauseAtTheEndGeneral')}</option>
                    {articulosDoc.map(art => (
                      <option key={art.id} value={art.id}>
                        {art.prefijo || t('ui.article3', { v0: art.numero })} - {art.texto?.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Texto Original (para modificación o supresión) */}
                {(tipoEnmiendaDel === 'supresion' || tipoEnmiendaDel === 'modificacion') && (
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileMinus size={13} />
                      <span>{tipoEnmiendaDel === 'supresion' ? t('ui.textToDelete') : t('ui.originalTextToModify')}</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder={t('ui.originalTextOrExcerptProposedForReplacementOrDeletion')}
                      value={textoOriginalDel}
                      onChange={e => setTextoOriginalDel(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: '0.35rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem',
                        lineHeight: 1.4
                      }}
                    />
                  </div>
                )}

                {/* 4. Texto Propuesto (para modificación o adición) */}
                {(tipoEnmiendaDel === 'adicion' || tipoEnmiendaDel === 'modificacion') && (
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#22c55e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FilePlus size={13} />
                      <span>{t('ui.proposedTextNewWording')}</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t('ui.writeTheProposedWording')}
                      required
                      value={textoPropuestoDel}
                      onChange={e => setTextoPropuestoDel(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: '0.35rem',
                        backgroundColor: 'rgba(34, 197, 94, 0.05)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        borderRadius: '8px',
                        padding: '0.65rem',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem',
                        lineHeight: 1.4
                      }}
                    />
                  </div>
                )}

                {/* 5. Previsualización Visual de Cambios (Diff Live Preview) */}
                {(textoOriginalDel.trim() || textoPropuestoDel.trim()) && (
                  <div style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      color: 'var(--muted-text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <Eye size={12} />
                      <span>{t('ui.previewDocumentChange')}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                      {tipoEnmiendaDel === 'modificacion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {textoOriginalDel && (
                            <div style={{ textDecoration: 'line-through', color: '#ef4444', opacity: 0.85 }}>
                              {textoOriginalDel}
                            </div>
                          )}
                          {textoPropuestoDel && (
                            <div style={{ color: '#22c55e', fontWeight: '700' }}>
                              {textoPropuestoDel}
                            </div>
                          )}
                        </div>
                      )}

                      {tipoEnmiendaDel === 'supresion' && (
                        <div style={{ textDecoration: 'line-through', color: '#ef4444' }}>
                          {textoOriginalDel || t('ui.textToDelete2')}
                        </div>
                      )}

                      {tipoEnmiendaDel === 'adicion' && (
                        <div style={{ color: '#22c55e', fontWeight: '700' }}>
                          + {textoPropuestoDel || t('ui.proposedNewClause')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Motivación / Justificación */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('ui.diplomaticMotivationJustificationOptional')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('ui.eGPromotesTechnologyTransferAndMultilateralSafeguards')}
                    value={justificacionDel}
                    onChange={e => setJustificacionDel(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!textoPropuestoDel.trim() && tipoEnmiendaDel !== 'supresion'}
                  style={{
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: (!textoPropuestoDel.trim() && tipoEnmiendaDel !== 'supresion') ? 'not-allowed' : 'pointer',
                    opacity: (!textoPropuestoDel.trim() && tipoEnmiendaDel !== 'supresion') ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    marginTop: '0.25rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <Send size={15} /> {t('ui.sendProposalToTheChair')}
                </button>
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-TAB 4: HISTORIAL DE PROPUESTAS Y ENMIENDAS DE LA SESIÓN     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {subTabEnmiendas === 'HISTORIAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Propuestas de este Delegado */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{t('ui.yourSubmittedProposals')}{misEnmiendasEnviadas.length})</span>
                    {misEnmiendasEnviadas.length > 0 && (
                      <button
                        onClick={() => setMisEnmiendasEnviadas([])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-text)',
                          fontSize: '0.68rem',
                          cursor: 'pointer'
                        }}
                      >
                        {t('ui.clearMyHistory')}
                      </button>
                    )}
                  </div>

                  {misEnmiendasEnviadas.length === 0 ? (
                    <div style={{
                      padding: '1.75rem 1rem',
                      textAlign: 'center',
                      backgroundColor: 'var(--panel-color)',
                      borderRadius: '8px',
                      border: '1px dashed var(--subborder-color)',
                      color: 'var(--muted-text)',
                      fontSize: '0.78rem'
                    }}>
                      {t('ui.youHaveNotProposedAnyAmendmentsDuringThisSessionYet')}
                    </div>
                  ) : (
                    misEnmiendasEnviadas.map(prop => (
                      <div
                        key={prop.id}
                        style={{
                          backgroundColor: 'var(--panel-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            color: prop.tipo === 'supresion' ? '#ef4444' : prop.tipo === 'adicion' ? '#22c55e' : '#60a5fa'
                          }}>
                            {prop.tipo?.toUpperCase()} · {prop.articuloNumero}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              backgroundColor: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              {t('ui.sentToTheChair')}
                            </span>
                            <button
                              onClick={() => handleEliminarPropuestaEnviada(prop.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted-text)',
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                              title={t('ui.removeFromMyList')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {prop.textoOriginal && (
                          <div style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: '#ef4444' }}>
                            {prop.textoOriginal}
                          </div>
                        )}

                        {prop.textoPropuesto && (
                          <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700' }}>
                            + {prop.textoPropuesto}
                          </div>
                        )}

                        {prop.justificacion && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                            {t('ui.reason')} {prop.justificacion}
                          </div>
                        )}

                        <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>
                          {new Date(prop.timestamp || Date.now()).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. Enmiendas Oficiales de la Sesión */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('ui.amendmentsRegisteredInTheSession')}{enmiendasGlobales.length})
                  </div>

                  {enmiendasGlobales.length === 0 ? (
                    <div style={{
                      padding: '1.75rem 1rem',
                      textAlign: 'center',
                      backgroundColor: 'var(--panel-color)',
                      borderRadius: '8px',
                      border: '1px dashed var(--subborder-color)',
                      color: 'var(--muted-text)',
                      fontSize: '0.78rem'
                    }}>
                      {t('ui.theChairHasNotIntroducedAnyFormalAmendmentsForDebate')}
                    </div>
                  ) : (
                    enmiendasGlobales.map(e => (
                      <div
                        key={e.id}
                        style={{
                          backgroundColor: 'var(--panel-color)',
                          border: `1px solid ${e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.4)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-color)' }}>
                            {e.tipo?.toUpperCase()} {t('ui.on')} {e.articuloNumero || t('ui.article4')}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.2)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: e.estado === 'aceptada' ? '#22c55e' : e.estado === 'rechazada' ? '#ef4444' : '#eab308'
                          }}>
                            {e.estado?.toUpperCase() || t('ui.inDebate')}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                          {t('ui.proponent')} <strong style={{ color: '#60a5fa' }}>{e.paisProponente || t('history.delegation')}</strong>
                        </div>

                        {e.textoOriginal && (
                          <div style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: '#ef4444' }}>
                            {e.textoOriginal}
                          </div>
                        )}

                        {e.textoPropuesto && (
                          <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700' }}>
                            + {e.textoPropuesto}
                          </div>
                        )}

                        {e.justificacion && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                            {e.justificacion}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA DEDICADA: AVISOS IMPORTANTES (SALA & CONFERENCIA)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'AVISOS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Si existen avisos de sala local P2P prioritarios emitidos por Chair/Staff, se muestran al frente */}
            {visibleAnnouncements.length > 0 && (
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Megaphone size={20} color="#f59e0b" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                    {t('views.announcements.holderTitle', 'Avisos Inmediatos de Sala')} ({visibleAnnouncements.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {visibleAnnouncements.map(ann => {
                    const badge = getPriorityBadge(ann.priority);
                    const esPropio = puedeBorrarAviso(ann, 'delegate');
                    return (
                      <div
                        key={ann.id}
                        style={{
                          backgroundColor: 'var(--card-header-bg)',
                          border: `1px solid ${badge.border}`,
                          borderLeft: `4px solid ${badge.text}`,
                          borderRadius: '12px',
                          padding: '1.1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: badge.bg,
                              color: badge.text,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              letterSpacing: '0.04em'
                            }}>
                              {badge.label}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                              {t('ui.from')} <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || t('conferences.issuerStaff')}</strong>
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                              {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {esPropio && (
                              <button
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: t('avisos.deleteNoticeTitle', 'Borrar aviso'),
                                    message: t('avisos.deleteNoticeConfirm', '¿Seguro que deseas eliminar este aviso?'),
                                    confirmText: t('common.delete', 'Eliminar'),
                                    cancelText: t('common.cancel', 'Cancelar'),
                                    type: 'danger'
                                  });
                                  if (ok) {
                                    deleteAnnouncement?.(ann.id);
                                  }
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#ef4444',
                                  fontSize: '0.72rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease'
                                }}
                                title={t('avisos.deleteNoticeTooltip', 'Eliminar aviso para toda la sala')}
                              >
                                <Trash2 size={12} /> {t('avisos.deleteNotice', 'Eliminar')}
                              </button>
                            )}

                            <button
                              onClick={() => handleIgnorarAnnouncement(ann.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--subborder-color)',
                                color: 'var(--muted-text)',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('avisos.dismissTooltip', 'Descartar este aviso (ocultarlo de tu vista)')}
                            >
                              <EyeOff size={12} /> {t('avisos.dismiss', 'Descartar')}
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-color)' }}>
                          {ann.title}
                        </div>

                        {ann.text && (
                          <div style={{ fontSize: '0.86rem', color: 'var(--muted-text)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                            {ann.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Canal Central de Avisos de la Conferencia */}
            <MensajeriaConferencia
              currentRole="delegate"
              currentComiteId={roomId}
              currentComiteNombre={state.comision || state.nombreComite || 'Comité'}
              readOnly={true}
              layout="split"
              showHeader={true}
            />
          </div>
        )}
      </main>

      {/* ── Modal para Proponer Moción de Debate (Estilo Pizarra de Mociones) ── */}
      {pedirMocionOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="openmun-modal-box" style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.05rem 1.15rem',
            width: '490px',
            maxWidth: '96vw',
            maxHeight: '92vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            boxSizing: 'border-box'
          }}>
            {/* Cabecera del Formulario */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Vote size={16} style={{ color: 'var(--accent-color)' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', letterSpacing: '-0.01em', color: 'var(--text-color)' }}>
                    {t('ui.proposeDebateMotion')}
                  </h4>
                  <span style={{ fontSize: '0.68rem', opacity: 0.6, fontWeight: '500' }}>
                    {t('ui.draftAndSendToTheChair')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPedirMocionOpen(false)}
                style={{
                  background: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: '5px',
                  padding: '0.25rem',
                  cursor: 'pointer',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.15s ease'
                }}
                title={t('ui.closeForm')}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleEnviarMocion} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* 1. Selector Visual de Modalidad de Debate (Grid 2x2) */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'block', marginBottom: '0.35rem' }}>
                  {t('motions.motionType', '1. Modalidad de Debate')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.45rem'
                }}>
                  {tiposMocionConfig.map(tItem => {
                    const IconComponent = tItem.icon;
                    const isSelected = tipoMocion === tItem.id;
                    return (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setTipoMocion(tItem.id);
                          if (tItem.id === 'Caucus Moderado') {
                            setTiempoTotalMinMocion(10);
                            setTiempoOradorSegMocion(60);
                          } else if (tItem.id === 'Caucus No Moderado') {
                            setTiempoTotalMinMocion(15);
                          } else if (tItem.id === 'Consulta General') {
                            setTiempoTotalMinMocion(10);
                            setVarianteConsultaMocion('Estándar');
                          } else if (tItem.id === 'Tour de Table') {
                            setTiempoOradorSegMocion(45);
                          }
                        }}
                        style={{
                          padding: '0.55rem 0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          backgroundColor: isSelected ? tItem.activeBg : 'var(--card-header-bg, rgba(255, 255, 255, 0.03))',
                          border: isSelected ? `1.5px solid ${tItem.activeBorder}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '8px',
                          color: isSelected ? tItem.textColor : 'var(--text-color)',
                          boxShadow: isSelected ? `0 0 12px ${tItem.color}30` : 'none',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? tItem.color : 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? '#ffffff' : 'var(--muted-text, #94a3b8)',
                          flexShrink: 0
                        }}>
                          <IconComponent size={14} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? tItem.textColor : 'var(--text-color)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {tItem.nombre}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: tItem.color, flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. País Proponente (Fijo a la propia Delegación) */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                  <span>{t('motions.proponent', '2. País Proponente *')}</span>
                </label>
                <div
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--card-header-bg, rgba(255, 255, 255, 0.04))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag bandera={miPaisObj?.bandera} nombre={clientCountry} size="sm" />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {clientCountry || t('ui.yourDelegation')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.67rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <UserCheck size={11} /> {t('ui.yourDelegation')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Tema / Propósito del Debate */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'block', marginBottom: '0.25rem' }}>
                  {t('motions.topic', '3. Tema / Propósito del Debate *')}
                </label>
                <input
                  type="text"
                  placeholder={t('motions.topicPlaceholder', 'Ej. Estrategias de cooperación económica...')}
                  value={temaMocion}
                  onChange={e => setTemaMocion(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.48rem 0.65rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Opciones Específicas: Turno del Proponente en Caucus Moderado */}
              {esModeradoMocion && (
                <div style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '7px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mic size={12} /> {t('motions.speakerTurn', 'Turno de la delegación')} ({clientCountry || t('ui.proponent3')}):
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setPosicionProponenteMocion('Primero')}
                      style={{
                        flex: 1,
                        padding: '0.38rem 0.5rem',
                        backgroundColor: posicionProponenteMocion === 'Primero' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                        color: posicionProponenteMocion === 'Primero' ? '#ffffff' : 'var(--text-color)',
                        border: posicionProponenteMocion === 'Primero' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Mic size={13} />
                      <span>{t('motions.speakFirst', 'Hablar Primero')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosicionProponenteMocion('Ultimo')}
                      style={{
                        flex: 1,
                        padding: '0.38rem 0.5rem',
                        backgroundColor: posicionProponenteMocion === 'Ultimo' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                        color: posicionProponenteMocion === 'Ultimo' ? '#ffffff' : 'var(--text-color)',
                        border: posicionProponenteMocion === 'Ultimo' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Hourglass size={13} />
                      <span>{t('motions.speakLast', 'Hablar Al Final')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Opciones Específicas: Modalidad de Consulta General */}
              {esConsultaMocion && (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '7px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MessageSquare size={12} /> {t('motions.consultationMode', 'Modalidad de Consulta:')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                    {[
                      { id: 'Estándar', label: t('accessibility.densityStandard') },
                      { id: 'Cadena / Ping-Pong', label: 'Ping-Pong' },
                      { id: 'Moderada por el Proponente', label: t('ui.countryMod') }
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVarianteConsultaMocion(v.id)}
                        style={{
                          padding: '0.35rem 0.4rem',
                          backgroundColor: varianteConsultaMocion === v.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                          color: varianteConsultaMocion === v.id ? '#000000' : 'var(--text-color)',
                          border: varianteConsultaMocion === v.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '5px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Configuración de Tiempos y Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: (!esTourMocion && esModeradoMocion) ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                {/* Tiempo Total (excepto Tour de Table) */}
                {!esTourMocion && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '7px',
                    padding: '0.5rem 0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} style={{ color: '#38bdf8' }} /> {t('motions.totalDuration', 'Total')}
                      </label>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace' }}>
                        {tiempoTotalMinMocion}m
                      </span>
                    </div>

                    {/* Controles de Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => setTiempoTotalMinMocion(prev => Math.max(1, Number(prev) - 1))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={tiempoTotalMinMocion}
                        onChange={e => setTiempoTotalMinMocion(Math.max(1, Number(e.target.value)))}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center',
                          padding: '0.25rem 0.2rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: 'var(--text-color)',
                          borderRadius: '5px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setTiempoTotalMinMocion(prev => Math.min(90, Number(prev) + 1))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Presets Rápidos */}
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between' }}>
                      {presetsTotalMinMocion.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTiempoTotalMinMocion(p)}
                          style={{
                            flex: 1,
                            padding: '0.15rem 0',
                            fontSize: '0.67rem',
                            borderRadius: '4px',
                            border: Number(tiempoTotalMinMocion) === p ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: Number(tiempoTotalMinMocion) === p ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            color: Number(tiempoTotalMinMocion) === p ? '#38bdf8' : 'inherit',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                        >
                          {p}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiempo por Orador (para Caucus Moderado o Tour de Table) */}
                {(esModeradoMocion || esTourMocion) && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '7px',
                    padding: '0.5rem 0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mic size={12} style={{ color: '#a855f7' }} /> {t('motions.speakerDuration', 'Orador')}
                      </label>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#c084fc', fontFamily: 'monospace' }}>
                        {tiempoOradorSegMocion}s
                      </span>
                    </div>

                    {/* Controles de Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => setTiempoOradorSegMocion(prev => Math.max(10, Number(prev) - 5))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="10"
                        max="300"
                        step="5"
                        value={tiempoOradorSegMocion}
                        onChange={e => setTiempoOradorSegMocion(Math.max(10, Number(e.target.value)))}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center',
                          padding: '0.25rem 0.2rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: 'var(--text-color)',
                          borderRadius: '5px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setTiempoOradorSegMocion(prev => Math.min(300, Number(prev) + 5))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Presets Rápidos */}
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between' }}>
                      {presetsOradorSegMocion.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTiempoOradorSegMocion(p)}
                          style={{
                            flex: 1,
                            padding: '0.15rem 0',
                            fontSize: '0.67rem',
                            borderRadius: '4px',
                            border: Number(tiempoOradorSegMocion) === p ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: Number(tiempoOradorSegMocion) === p ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            color: Number(tiempoOradorSegMocion) === p ? '#c084fc' : 'inherit',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                        >
                          {p}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Banner de cálculo inteligente para Caucus Moderado */}
              {esModeradoMocion && intervencionesEstimadasMocion > 0 && (
                <div style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed rgba(56, 189, 248, 0.3)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#bae6fd'
                }}>
                  <span><BarChart2 size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />{t('ui.estimatedCapacity')}</span>
                  <strong style={{ fontSize: '0.76rem', color: '#38bdf8' }}>
                    ~{intervencionesEstimadasMocion} {t('motions.estimatedInterventions', 'intervenciones')}
                  </strong>
                </div>
              )}

              {/* Botones de Envío / Cancelar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setPedirMocionOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-color)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>

                <button
                  type="submit"
                  disabled={!clientCountry || !temaMocion.trim()}
                  style={{
                    flex: 2,
                    padding: '0.5rem 0.85rem',
                    background: (!clientCountry || !temaMocion.trim())
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    letterSpacing: '0.02em',
                    cursor: (!clientCountry || !temaMocion.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (!clientCountry || !temaMocion.trim()) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: (!clientCountry || !temaMocion.trim()) ? 'none' : '0 3px 10px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={14} /> {t('ui.sendMotionToTheChair')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal para Levantar Punto Parlamentario ── */}
      {pedirPuntoOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="openmun-modal-box" style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.5rem',
            width: '460px',
            maxWidth: '95vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '1.1rem', color: '#eab308' }}>
                <HelpCircle size={18} /> {t('ui.raiseParliamentaryPointPoi')}
              </div>
              <button
                onClick={() => setPedirPuntoOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnviarPunto} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>{t('ui.pointOrPoiType')}</label>
                <select
                  value={tipoPunto}
                  onChange={e => setTipoPunto(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    color: 'var(--text-color)',
                    fontWeight: '700'
                  }}
                >
                  <option value="Punto de Información (POI)">{t('ui.pointOfInformationPoiQuestionToTheCurrentSpeaker')}</option>
                  <option value="Punto de Información a la Mesa">{t('ui.pointOfInformationToTheChair')}</option>
                  <option value="Punto de Privilegio Personal">{t('ui.pointOfPersonalPrivilegeSoundVisibilityDiscomfort')}</option>
                  <option value="Punto de Orden">{t('ui.pointOfOrderViolationOfTheRules')}</option>
                  <option value="Punto de Duda Parlamentaria">{t('ui.parliamentaryInquiryQuestionAboutProcedure')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>{t('ui.reasonQuestionExplanationToTheChair')}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('ui.explainYourQuestionPoiOrReasonForRaisingAPoint')}
                  value={motivoPunto}
                  onChange={e => setMotivoPunto(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    color: 'var(--text-color)',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#eab308',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)'
                }}
              >
                {t('ui.sendPointPoiToTheChair')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelegateView;
