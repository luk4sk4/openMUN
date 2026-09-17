import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Send, 
  Mic, 
  Clock, 
  MessageSquare, 
  FileText, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Sparkles,
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
  Sun,
  Moon,
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
  Trash2
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { getFlagEmoji } from '../../utils/flags';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import ConferenceBanner from '../common/ConferenceBanner';

// Parser inteligente de resolución para la vista de delegado
const parsearResolucionTexto = (textoCompleto = '') => {
  if (!textoCompleto.trim()) return [];

  const lineas = textoCompleto.split('\n');
  const articulos = [];
  let buffer = [];
  let numArticulo = 1;
  let enPreambulo = true;
  let textoPreambulo = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const matchArticulo = linea.match(/^(?:(?:\*\*|\*|#+)?\s*(?:Artículo|Art\.|Cláusula|Operative Clause)\s*(\d+)[\.:\*\s]*)(.*)/i) ||
                          linea.match(/^(\d+)[\.\)]\s+(.*)/);

    if (matchArticulo) {
      if (enPreambulo && textoPreambulo.length > 0) {
        articulos.push({
          id: 'preambulo',
          numero: 0,
          prefijo: 'Preámbulo / Antecedentes',
          texto: textoPreambulo.join('\n').trim(),
          esPreambulo: true
        });
        textoPreambulo = [];
        enPreambulo = false;
      } else if (buffer.length > 0) {
        articulos.push({
          id: `art_${numArticulo - 1}`,
          numero: numArticulo - 1,
          prefijo: `Artículo ${numArticulo - 1}.`,
          texto: buffer.join('\n').trim()
        });
        buffer = [];
      }

      const numParsed = parseInt(matchArticulo[1], 10) || numArticulo;
      numArticulo = numParsed + 1;
      const contenidoRestante = matchArticulo[2] || '';
      if (contenidoRestante.trim()) {
        buffer.push(contenidoRestante.trim());
      }
    } else if (enPreambulo) {
      if (linea.includes('CLÁUSULAS OPERATIVAS') || linea.includes('OPERATIVE CLAUSES')) {
        enPreambulo = false;
        if (textoPreambulo.length > 0) {
          articulos.push({
            id: 'preambulo',
            numero: 0,
            prefijo: 'Preámbulo / Antecedentes',
            texto: textoPreambulo.join('\n').trim(),
            esPreambulo: true
          });
          textoPreambulo = [];
        }
      } else {
        textoPreambulo.push(linea);
      }
    } else {
      buffer.push(linea);
    }
  }

  if (enPreambulo && textoPreambulo.length > 0) {
    articulos.push({
      id: 'preambulo',
      numero: 0,
      prefijo: 'Preámbulo / Antecedentes',
      texto: textoPreambulo.join('\n').trim(),
      esPreambulo: true
    });
  } else if (buffer.length > 0) {
    articulos.push({
      id: `art_${numArticulo - 1}`,
      numero: numArticulo - 1,
      prefijo: `Artículo ${numArticulo - 1}.`,
      texto: buffer.join('\n').trim()
    });
  }

  if (articulos.length === 0 && textoCompleto.trim().length > 0) {
    const parrafos = textoCompleto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return parrafos.map((p, idx) => ({
      id: `art_${idx + 1}`,
      numero: idx + 1,
      prefijo: `Artículo ${idx + 1}.`,
      texto: p.trim()
    }));
  }

  return articulos;
};

const DelegateView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
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
    announcements = []
  } = useP2P();

  // Estados para Selección de País / Delegación inicial
  const [busquedaPais, setBusquedaPais] = useState('');
  const [paisSeleccionadoTemp, setPaisSeleccionadoTemp] = useState('');
  const [paisPersonalizadoInput, setPaisPersonalizadoInput] = useState('');
  const [isSubmittingCountry, setIsSubmittingCountry] = useState(false);
  const [countrySelectError, setCountrySelectError] = useState(null);

  const [activeTab, setActiveTab] = useState('DEBATE'); // 'DEBATE' | 'NOTAS' | 'ENMIENDAS' | 'AVISOS'
  const [avisosExpanded, setAvisosExpanded] = useState(true);
  const [filtroCategoriaAviso, setFiltroCategoriaAviso] = useState('todos');
  const [destinatario, setDestinatario] = useState('CHAIR');
  const [textoNota, setTextoNota] = useState('');
  const [tipoNota, setTipoNota] = useState('general'); // 'general' | 'urgente' | 'pregunta'

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgente':
        return { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', label: 'URGENTE' };
      case 'logistica':
        return { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', label: 'LOGÍSTICA' };
      case 'receso':
        return { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', label: 'RECESO' };
      case 'documento':
        return { bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', label: 'DOCUMENTACIÓN' };
      case 'general':
      default:
        return { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'GENERAL' };
    }
  };

  // Estados para Mociones de Debate
  const [pedirMocionOpen, setPedirMocionOpen] = useState(false);
  const [tipoMocion, setTipoMocion] = useState('Caucus Moderado');
  const [posicionProponenteMocion, setPosicionProponenteMocion] = useState('Primero');
  const [temaMocion, setTemaMocion] = useState('');
  const [tiempoTotalMocion, setTiempoTotalMocion] = useState(600);
  const [tiempoOradorMocion, setTiempoOradorMocion] = useState(45);
  const [solicitudMocionHecha, setSolicitudMocionHecha] = useState(false);

  // Estados para Puntos Parlamentarios
  const [pedirPuntoOpen, setPedirPuntoOpen] = useState(false);
  const [tipoPunto, setTipoPunto] = useState('Punto de Privilegio Personal');
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
  const tituloResolucion = resolucionData.tituloProyecto || resolucionData.titulo || 'Proyecto de Resolución';
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
      setCountrySelectError('Por favor selecciona o introduce el nombre de tu país');
      return;
    }

    setIsSubmittingCountry(true);
    setCountrySelectError(null);
    try {
      const res = await selectCountry(finalName);
      if (!res.success) {
        setCountrySelectError(res.message || 'No se pudo seleccionar este país');
      }
    } catch (err) {
      setCountrySelectError(err.message || 'Error de conexión');
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

  const handleEnviarMocion = (e) => {
    e.preventDefault();
    if (!settings.allowMotions) return;

    let totalSeg = Number(tiempoTotalMocion);
    let oradorSeg = Number(tiempoOradorMocion);
    if (tipoMocion === 'Caucus No Moderado' || tipoMocion === 'Consulta General') {
      oradorSeg = 0;
    } else if (tipoMocion === 'Tour de Table') {
      totalSeg = 0;
    }

    requestSpeaking('MOTION', {
      country: clientCountry,
      tipo: tipoMocion,
      posicionProponente: posicionProponenteMocion,
      tema: temaMocion.trim() || tipoMocion,
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

  const handleEnviarNota = (e) => {
    e.preventDefault();
    if (!textoNota.trim()) return;

    sendNote(destinatario, textoNota.trim(), tipoNota);
    setTextoNota('');
    setSubTabNotas('BUZON');
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
    const artNum = artObj ? (artObj.prefijo || `Artículo ${artObj.numero}`) : 'Nuevo Artículo';

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

  // Si aún no ha seleccionado su país / delegación oficial de la sesión
  if (!clientCountry) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

        {/* Header Superior */}
        <header style={{
          padding: '0.85rem 1.5rem',
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--subborder-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <OpenMunLogo height={32} isLight={isLight} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  {state.comision || state.nombreComite || 'Sesión en Vivo'}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  Sala {roomId}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                Conectado como participante • Selección de Delegación Oficial
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setIsAccessModalOpen(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '8px',
                color: 'var(--text-color)',
                padding: '0.45rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={t('accessibility.title', "Accesibilidad y Tema")}
            >
              <Eye size={14} /> {t('accessibility.title', 'Accesibilidad')}
            </button>

            <button
              onClick={toggleThemeMode}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '8px',
                color: 'var(--text-color)',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={isLight ? t('header.darkMode', "Cambiar a Modo Oscuro") : t('header.lightMode', "Cambiar a Modo Claro")}
            >
              {isLight ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            <LanguageSelector showIcon={false} />

            <button
              onClick={() => {
                if (confirm('¿Deseas desconectarte de la sala?')) {
                  leaveRoom();
                  if (onExit) onExit();
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '8px',
                color: 'var(--muted-text)',
                padding: '0.45rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <LogOut size={14} /> {t('common.exit', 'Salir')}
            </button>
          </div>
        </header>

        {/* Banner de Avisos Oficiales */}
        <ConferenceBanner isLight={isLight} role="delegate" comiteId={roomId} />

        {/* Cuerpo Principal de Selección */}
        <main style={{
          padding: '2rem 1.25rem 3rem 1.25rem',
          maxWidth: '960px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          flex: 1
        }}>
          {/* Banner de Bienvenida y Comité */}
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <Globe size={14} /> Lista Oficial de la Sesión
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                {paisesFiltrados.length} delegaciones disponibles
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Selecciona tu Delegación
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted-text)', lineHeight: '1.5' }}>
              El Chair ha transmitido el listado oficial de países de esta sesión. Haz clic sobre tu delegación para identificarte en los debates, lista de oradores, votaciones telemáticas y mensajería oficial.
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
              padding: '3rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '1.25rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={32} />
              </div>
              <div style={{ maxWidth: '520px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                  Esperando lista de delegaciones de la sesión
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem', color: 'var(--muted-text)', lineHeight: '1.5' }}>
                  La Mesa Directiva (Chair) aún no ha cargado o transmitido el listado oficial de países de este comité. En cuanto la Presidencia configure la sesión, los países aparecerán aquí para su selección.
                </p>
              </div>
              <button
                onClick={requestFullSync}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                }}
              >
                <RefreshCw size={15} /> Comprobar / Actualizar Sesión
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Búsqueda */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Buscar tu país o delegación..."
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
              <div style={{
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
                      onClick={() => {
                        if (estaOcupado || isSubmittingCountry) return;
                        setPaisSeleccionadoTemp(p.nombre);
                        setPaisPersonalizadoInput('');
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
                        padding: '0.9rem 1rem',
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
                          Ocupado
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Opción de país personalizado */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ¿Tu delegación no aparece en la lista anterior?
                </div>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <input
                    type="text"
                    placeholder="Escribe el nombre de tu delegación (ej: Santa Sede, Observador ONU...)"
                    value={paisPersonalizadoInput}
                    onChange={e => {
                      setPaisPersonalizadoInput(e.target.value);
                      if (e.target.value) setPaisSeleccionadoTemp('');
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
            </>
          )}

          {/* Botón de Confirmación Flotante */}
          <div style={{
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
                Delegación seleccionada:
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: (paisSeleccionadoTemp || paisPersonalizadoInput) ? '#22c55e' : 'var(--muted-text)', marginTop: '2px' }}>
                {paisSeleccionadoTemp || paisPersonalizadoInput || 'Ningún país seleccionado'}
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
                  <RefreshCw size={16} className="animate-spin" /> Conectando...
                </>
              ) : (
                <>
                  <Check size={16} /> Entrar a la Sesión
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {/* ── Topbar del Delegado ── */}
      <header style={{
        padding: '0.75rem 1.25rem',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <OpenMunLogo height={30} isLight={isLight} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CountryFlag nombre={clientCountry} size="sm" />
              <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                {clientCountry || 'Delegación'}
              </span>
              <button
                onClick={() => {
                  if (confirm('¿Deseas cambiar tu delegación asignada?')) {
                    resetCountrySelection();
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '6px',
                  color: 'var(--muted-text)',
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Cambiar de país asignado"
              >
                <RefreshCw size={11} /> Cambiar
              </button>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                padding: '0.1rem 0.45rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                En Vivo ({roomId})
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
              {state.comision || 'Comité Conectado'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Botón Accesibilidad y Tema */}
          <button
            onClick={() => setIsAccessModalOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={t('accessibility.title', "Accesibilidad y Tema")}
          >
            <Eye size={13} /> {t('accessibility.title', 'Accesibilidad')}
          </button>

          {/* Botón Rápido Modo Claro / Oscuro */}
          <button
            onClick={toggleThemeMode}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={isLight ? t('header.darkMode', "Cambiar a Modo Oscuro") : t('header.lightMode', "Cambiar a Modo Claro")}
          >
            {isLight ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          <LanguageSelector showIcon={false} />

          {/* Botón Salir */}
          <button
            onClick={() => {
              if (confirm('¿Deseas desconectarte de la sala?')) {
                leaveRoom();
                if (onExit) onExit();
              }
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '6px',
              color: 'var(--muted-text)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <LogOut size={13} /> {t('common.exit', 'Salir')}
          </button>
        </div>
      </header>

      {/* Banner de Avisos Oficiales */}
      <ConferenceBanner isLight={isLight} role="delegate" comiteId={roomId} />

      {/* ── Subheader / Navegación Móvil ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--subnav-bg)',
        padding: '0.35rem 1rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('DEBATE')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'DEBATE' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'DEBATE' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Mic size={14} /> {t('views.delegate.debateTab', 'Sala de Debate')}
        </button>

        <button
          onClick={() => setActiveTab('NOTAS')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'NOTAS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'NOTAS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
        >
          <MessageSquare size={14} /> {t('views.delegate.notesTab', 'Notas')} ({misNotas.length})
        </button>

        <button
          onClick={() => setActiveTab('ENMIENDAS')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'ENMIENDAS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'ENMIENDAS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={14} /> Enmiendas
        </button>

        <button
          onClick={() => setActiveTab('AVISOS')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'AVISOS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'AVISOS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
        >
          <Megaphone size={14} /> {t('views.staff.announcementsTab', 'Avisos')} ({announcements.length})
        </button>
      </div>

      {/* ── Cuerpo Principal del Delegado ── */}
      <main style={{ padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {/* ── HOLDER PERMANENTE DE AVISOS IMPORTANTES (SECRETARÍA & STAFF) ── */}
        {announcements.length > 0 && activeTab !== 'AVISOS' && (
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
                  {announcements.length} {announcements.length === 1 ? 'aviso' : 'avisos'}
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
                {announcements.map((ann) => {
                  const badge = getPriorityBadge(ann.priority);
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
                            De: <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || 'Staff'}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                          {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
                    <Vote size={18} /> Votación Telemática en Vivo
                  </div>
                  {miVotoRegistrado && (
                    <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={13} /> Voto Emitido: {
                        miVotoRegistrado === 'favor' ? 'A Favor' :
                        miVotoRegistrado === 'contra' ? 'En Contra' :
                        miVotoRegistrado === 'abstencion' ? 'Abstención' :
                        miVotoRegistrado === 'pasar' ? 'Pase' : miVotoRegistrado
                      }
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>
                  {votacionSesion.asunto}
                </div>

                {votacionSesion?.tipoVotacion === 'procedural' && (
                  <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '600' }}>
                    ℹ️ Votación de procedimiento: No se permiten abstenciones.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
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
                    A Favor
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
                    En Contra
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
                    title={votacionSesion?.tipoVotacion === 'procedural' ? 'No se permiten abstenciones en mociones o cuestiones de procedimiento' : ''}
                  >
                    Abstención
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
                    Pase
                  </button>
                </div>
              </div>
            )}

            {/* 2. Panel de Acciones de Orador (GSL y Caucus) adaptativo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                    <Zap size={16} color="#3b82f6" /> Lista General (GSL)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '3px' }}>
                    {settings.speakerRequestMode === 'direct'
                      ? 'Modo Directo: Ingreso inmediato'
                      : (settings.speakerRequestMode === 'approval'
                          ? 'Requiere validación de la Mesa'
                          : 'Solicitudes cerradas por la Mesa')}
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
                    <CheckCircle size={14} /> ¡Ya estás en la lista GSL!
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
                      <><Lock size={14} /> Cerrado</>
                    ) : (
                      solicitudGSLHecha ? <><Check size={14} /> Solicitud Enviada</> : <><Mic size={14} /> Pedir Turno GSL</>
                    )}
                  </button>
                )}
              </div>

              {/* Botón / Estado Caucus Moderado */}
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
                    <Clock size={16} color="#a855f7" /> Caucus Moderado
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '3px' }}>
                    {settings.caucusRequestMode === 'direct'
                      ? 'Modo Directo: Ingreso inmediato'
                      : (settings.caucusRequestMode === 'approval'
                          ? 'Requiere validación de la Mesa'
                          : 'Solicitudes cerradas')}
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
                    <CheckCircle size={14} /> ¡En lista de Caucus!
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
                      <><Lock size={14} /> Cerrado</>
                    ) : (
                      solicitudCaucusHecha ? <><Check size={14} /> Solicitud Enviada</> : <><Mic size={14} /> Pedir Turno Caucus</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 3. Panel Separado: Mociones de Debate y Puntos Parlamentarios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                    <FileText size={16} /> Moción de Debate
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '4px', lineHeight: '1.4' }}>
                    {settings.allowMotions
                      ? 'Propón Caucus Moderado, No Moderado, Consulta o Tour de Table.'
                      : 'Mociones deshabilitadas por la Mesa.'}
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
                    gap: '0.35rem'
                  }}
                >
                  {settings.allowMotions ? <PenTool size={14} /> : <Lock size={14} />} Proponer Moción
                </button>
              </div>

              {/* Card B: Puntos Parlamentarios */}
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
                    <HelpCircle size={16} /> Punto Parlamentario
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '4px', lineHeight: '1.4' }}>
                    Privilegio personal, Orden, Duda de procedimiento o Información a la Mesa.
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
                  <Sparkles size={14} /> Levantar Punto
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: PAJES / NOTAS                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'NOTAS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Subtabs de Notas */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setSubTabNotas('BUZON')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabNotas === 'BUZON' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabNotas === 'BUZON' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Buzón de Mensajes ({misNotas.length})
              </button>

              <button
                onClick={() => setSubTabNotas('REDACTAR')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabNotas === 'REDACTAR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabNotas === 'REDACTAR' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                + Redactar Nota
              </button>
            </div>

            {subTabNotas === 'BUZON' ? (
              misNotas.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--panel-color)',
                  borderRadius: '12px',
                  border: '1px dashed var(--subborder-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Inbox size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Buzón Vacío</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                    No has recibido ni enviado notas todavía.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {misNotas.map(n => {
                    const isOutgoing = n.from?.toLowerCase() === clientCountry?.toLowerCase();
                    return (
                      <div
                        key={n.id}
                        style={{
                          backgroundColor: isOutgoing ? 'rgba(59, 130, 246, 0.08)' : 'var(--panel-color)',
                          border: `1px solid ${isOutgoing ? 'rgba(59, 130, 246, 0.25)' : 'var(--border-color)'}`,
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isOutgoing ? '#60a5fa' : '#22c55e' }}>
                            {isOutgoing ? `Para: ${n.to}` : `De: ${n.from}`}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                            {new Date(n.timestamp || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                          {n.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Formulario Redactar Nota */
              <form onSubmit={handleEnviarNota} style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Destinatario
                  </label>
                  <select
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      color: 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {settings.allowChairNotes !== false && (
                      <option value="CHAIR" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                        🏛️ Mesa Directiva (Chair)
                      </option>
                    )}
                    {settings.allowDelegateNotes !== false && (
                      <optgroup label="── Delegaciones ──" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)', fontWeight: 'bold' }}>
                        {paisesDisponibles.filter(p => p.nombre?.toLowerCase() !== clientCountry?.toLowerCase()).map(p => (
                          <option 
                            key={p.id || p.nombre} 
                            value={p.nombre}
                            style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}
                          >
                            {getFlagEmoji(p.bandera, p.nombre)} {p.nombre}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Tipo de Nota
                  </label>
                  <select
                    value={tipoNota}
                    onChange={e => setTipoNota(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.55rem',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="general">General / Mensaje</option>
                    <option value="urgente">Urgente</option>
                    <option value="pregunta">Pregunta de Procedimiento</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Mensaje
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Escribe el mensaje para el paje..."
                    value={textoNota}
                    onChange={e => setTextoNota(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      color: 'var(--text-color)',
                      fontSize: '0.85rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!textoNota.trim()}
                  style={{
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: textoNota.trim() ? 'pointer' : 'not-allowed',
                    opacity: textoNota.trim() ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Send size={15} /> Enviar Nota
                </button>
              </form>
            )}
          </div>
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
                    <span>{articulosDoc.length} cláusulas / artículos</span>
                    <span>•</span>
                    <span>{enmiendasGlobales.length} enmiendas en sesión</span>
                    <span>•</span>
                    <span style={{ color: '#22c55e', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                      Sincronizado en Vivo
                    </span>
                  </div>
                </div>

                {/* Acciones de Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleCopiarTexto(
                      rawTexto || articulosDoc.map(a => `${a.prefijo ? a.prefijo + ' ' : ''}${a.texto}`).join('\n\n'),
                      'Resolución Completa'
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
                    title="Copiar texto completo de la resolución"
                  >
                    <Copy size={13} />
                    <span>Copiar Texto</span>
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
                    title="Recargar el estado más reciente de la resolución y enmiendas desde la Mesa"
                  >
                    <RefreshCw size={13} />
                    <span>Sincronizar</span>
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
                  <span>Ver Documento</span>
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
                  <span>Por Cláusulas</span>
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
                  <span>Redactar Enmienda</span>
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
                  <span>Historial ({misEnmiendasEnviadas.length})</span>
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
                <CheckCheck size={16} /> ¡{copiadoFeedback} copiado al portapapeles!
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
                <CheckCircle2 size={16} /> ¡Propuesta de enmienda enviada a la Mesa Directiva para su revisión!
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
                    placeholder="Buscar palabras clave, artículos o términos en la resolución..."
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
                      Sin Documento de Resolución
                    </div>
                    <div style={{ fontSize: '0.8rem', maxWidth: '420px', lineHeight: 1.5 }}>
                      La Presidencia de la Mesa Directiva aún no ha transmitido el texto o borrador de resolución para este comité.
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
                        <RefreshCw size={13} /> Sincronizar
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
                        <Plus size={13} /> Proponer Cláusula Inicial
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
                        NACIONES UNIDAS • DOCUMENTO DE TRABAJO OFICIAL
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#60a5fa', lineHeight: 1.3 }}>
                        {tituloResolucion}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                        Comité: <strong style={{ color: 'var(--text-color)' }}>{state.comision || state.nombreComite || 'Asamblea General'}</strong>
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
                            Cláusulas Preambulatorias
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
                            <Edit3 size={11} /> Enmendar Preámbulo
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
                        <span>Cláusulas Operativas ({articulosFiltradosDoc.length})</span>
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
                          <Plus size={12} /> + Añadir Cláusula
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
                                  {art.prefijo || `Artículo ${art.numero}`}
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
                                    <CheckCircle2 size={10} /> Enmendado
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
                                    Enmienda en debate
                                  </span>
                                )}
                              </div>

                              {/* Barra de Acciones Directas de la Cláusula */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <button
                                  onClick={() => handleCopiarTexto(`${art.prefijo ? art.prefijo + ' ' : ''}${art.texto}`, art.prefijo || 'Cláusula')}
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
                                  title="Copiar texto de esta cláusula"
                                >
                                  <Copy size={11} /> Copiar
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
                                  title="Proponer modificación sobre esta cláusula"
                                >
                                  <Edit3 size={11} /> Enmendar
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
                                  title="Proponer supresión de esta cláusula"
                                >
                                  <FileMinus size={11} /> Suprimir
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
                    <span>Filtro de Cláusulas:</span>
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
                    <option value="todos">Todas las Cláusulas ({articulosOperativosDoc.length})</option>
                    <option value="modificadas">Solo Enmendadas</option>
                    <option value="con_enmiendas">Con Enmiendas en Sesión</option>
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
                    <Plus size={13} /> Proponer Nueva Cláusula
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
                            {art.prefijo || `Artículo ${art.numero}`}
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
                              Modificado
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
                            <Edit3 size={11} /> Modificar
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
                            <FileMinus size={11} /> Suprimir
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
                            Enmiendas registradas ({enmiendasArt.length})
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
                                  {e.tipo?.toUpperCase()} por {e.paisProponente}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.2)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                  color: e.estado === 'aceptada' ? '#22c55e' : e.estado === 'rechazada' ? '#ef4444' : '#eab308'
                                }}>
                                  {e.estado?.toUpperCase() || 'EN DEBATE'}
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
                      Redactar Propuesta de Enmienda
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
                    Proponente: {clientCountry || 'Delegación'}
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', lineHeight: 1.4 }}>
                  Formula tu propuesta de enmienda formal. Al enviarla, llegará de forma telemática e instantánea al panel de la Mesa Directiva para su evaluación parlamentaria.
                </div>

                {/* 1. Selector de Naturaleza de la Enmienda */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Tipo de Enmienda
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
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>➔ Modificación</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>Reemplazar texto</span>
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
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>+ Adición</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>Añadir nuevo texto</span>
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
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>- Supresión</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>Tachar / eliminar</span>
                    </button>
                  </div>
                </div>

                {/* 2. Selector de Artículo / Cláusula */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                      Cláusula a Enmendar
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
                        Restablecer texto original
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
                    <option value="">-- Añadir como Nueva Cláusula al Final / General --</option>
                    {articulosDoc.map(art => (
                      <option key={art.id} value={art.id}>
                        {art.prefijo || `Artículo ${art.numero}`} - {art.texto?.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Texto Original (para modificación o supresión) */}
                {(tipoEnmiendaDel === 'supresion' || tipoEnmiendaDel === 'modificacion') && (
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileMinus size={13} />
                      <span>{tipoEnmiendaDel === 'supresion' ? 'Texto a Suprimir' : 'Texto Original a Modificar'}</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Fragmento o texto original que se propone sustituir o eliminar..."
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
                      <span>Texto Propuesto / Nueva Redacción</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Escribe la redacción propuesta..."
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
                      <Sparkles size={12} color="#eab308" />
                      <span>Previsualización del Cambio en el Documento</span>
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
                          {textoOriginalDel || '(Texto a suprimir)'}
                        </div>
                      )}

                      {tipoEnmiendaDel === 'adicion' && (
                        <div style={{ color: '#22c55e', fontWeight: '700' }}>
                          + {textoPropuestoDel || '(Nueva cláusula propuesta)'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Motivación / Justificación */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Motivación Diplomática / Justificación (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Fomenta la transferencia tecnológica y salvaguardas multilaterales"
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
                  <Send size={15} /> Enviar Propuesta a la Mesa Directiva
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
                    <span>Tus Propuestas Enviadas ({misEnmiendasEnviadas.length})</span>
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
                        Limpiar historial propio
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
                      No has propuesto ninguna enmienda durante esta sesión todavía.
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
                              Enviada a la Mesa
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
                              title="Quitar de mi lista"
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
                            Motivo: {prop.justificacion}
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
                    Enmiendas Registradas en la Sesión ({enmiendasGlobales.length})
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
                      La Mesa Directiva no ha introducido enmiendas formales en debate todavía.
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
                            {e.tipo?.toUpperCase()} sobre {e.articuloNumero || `Artículo`}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: e.estado === 'aceptada' ? 'rgba(34, 197, 94, 0.2)' : e.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: e.estado === 'aceptada' ? '#22c55e' : e.estado === 'rechazada' ? '#ef4444' : '#eab308'
                          }}>
                            {e.estado?.toUpperCase() || 'EN DEBATE'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                          Proponente: <strong style={{ color: '#60a5fa' }}>{e.paisProponente || 'Delegación'}</strong>
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
            PESTAÑA DEDICADA: AVISOS IMPORTANTES (SECRETARÍA & STAFF)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'AVISOS' && (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Megaphone size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.announcements.holderTitle', 'Avisos Importantes de Secretaría & Staff')} ({announcements.length})
                </h3>
              </div>
            </div>

            {announcements.length === 0 ? (
              <div style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--muted-text)',
                border: '1px dashed var(--subborder-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Megaphone size={36} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                  {t('views.announcements.noActive', 'Sin avisos importantes pendientes')}
                </div>
                <div style={{ fontSize: '0.78rem' }}>
                  Cualquier comunicado oficial emitido por la Secretaría o el Staff aparecerá aquí en tiempo real.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {announcements.map(ann => {
                  const badge = getPriorityBadge(ann.priority);
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
                            De: <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || 'Staff'}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                          {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
            )}
          </div>
        )}
      </main>

      {/* ── Modal para Proponer Moción de Debate ── */}
      {pedirMocionOpen && (
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
          <div style={{
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '1.1rem', color: '#3b82f6' }}>
                <FileText size={18} /> Proponer Moción de Debate
              </div>
              <button
                onClick={() => setPedirMocionOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnviarMocion} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Tipo de Moción de Debate</label>
                <select
                  value={tipoMocion}
                  onChange={e => setTipoMocion(e.target.value)}
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
                  <option value="Caucus Moderado">Caucus Moderado</option>
                  <option value="Caucus No Moderado">Caucus No Moderado</option>
                  <option value="Consulta General">Consulta General</option>
                  <option value="Tour de Table">Tour de Table</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Tema de Debate</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cooperación internacional frente a la crisis..."
                  value={temaMocion}
                  onChange={e => setTemaMocion(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    color: 'var(--text-color)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Posición del Proponente en la Lista</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setPosicionProponenteMocion('Primero')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1px solid ${posicionProponenteMocion === 'Primero' ? '#3b82f6' : 'var(--subborder-color)'}`,
                      backgroundColor: posicionProponenteMocion === 'Primero' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: posicionProponenteMocion === 'Primero' ? '#3b82f6' : 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Hablar de Primero
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosicionProponenteMocion('Ultimo')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1px solid ${posicionProponenteMocion === 'Ultimo' ? '#3b82f6' : 'var(--subborder-color)'}`,
                      backgroundColor: posicionProponenteMocion === 'Ultimo' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: posicionProponenteMocion === 'Ultimo' ? '#3b82f6' : 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Hablar de Último
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Tiempo Total (segundos)</label>
                  <input
                    type="number"
                    disabled={tipoMocion === 'Tour de Table'}
                    value={tiempoTotalMocion}
                    onChange={e => setTiempoTotalMocion(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.55rem',
                      color: 'var(--text-color)',
                      opacity: tipoMocion === 'Tour de Table' ? 0.5 : 1
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Por Orador (segundos)</label>
                  <input
                    type="number"
                    disabled={tipoMocion === 'Caucus No Moderado' || tipoMocion === 'Consulta General'}
                    value={tiempoOradorMocion}
                    onChange={e => setTiempoOradorMocion(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.55rem',
                      color: 'var(--text-color)',
                      opacity: (tipoMocion === 'Caucus No Moderado' || tipoMocion === 'Consulta General') ? 0.5 : 1
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                Transmitir Moción a la Mesa
              </button>
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
          <div style={{
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
                <HelpCircle size={18} /> Levantar Punto Parlamentario
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
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Tipo de Punto</label>
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
                  <option value="Punto de Privilegio Personal">Punto de Privilegio Personal (Sonido, visibilidad, malestar)</option>
                  <option value="Punto de Orden">Punto de Orden (Violación de reglamento)</option>
                  <option value="Punto de Duda Parlamentaria">Punto de Duda Parlamentaria (Cuestión de procedimiento)</option>
                  <option value="Punto de Información a la Mesa">Punto de Información a la Mesa Directiva</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>Motivo / Explicación a la Mesa</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explica brevemente a la presidencia el motivo del punto..."
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
                Transmitir Punto a la Presidencia
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelegateView;
