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
  Sparkles,
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
  Edit3
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from 'react-i18next';
import CountryFlag from '../common/CountryFlag';
import { playBreakingNewsAlert, playEmergencyPulse } from '../../utils/audioAlerts';

// Fotos y Fondos Predefinidos de Crisis
const FOTOS_PRESET = [
  { label: '🛰️ Satélite Militar', url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80' },
  { label: '⚔️ Despliegue Naval/Blindado', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80' },
  { label: '💻 Ciberataque / Radar', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80' },
  { label: '🏛️ Sala de Situación / ONU', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80' },
  { label: '💵 Bolsa / Crisis Financiera', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80' }
];

// Categorías de Crisis con paletas de color y estilo
const CATEGORIAS_CRISIS = {
  CRITICA: {
    nombre: 'Última Hora / Crítico',
    badge: '🔴 ÚLTIMA HORA',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: Flame
  },
  MILITAR: {
    nombre: 'Alerta Militar / Conflicto',
    badge: '⚔️ ALERTA MILITAR',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    icon: ShieldAlert
  },
  DIPLOMATICA: {
    nombre: 'Comunicado Diplomático',
    badge: '🌐 COMUNICADO',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    icon: Megaphone
  },
  ECONOMICA: {
    nombre: 'Crisis Financiera / Sanciones',
    badge: '💵 IMPACTO ECONÓMICO',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    icon: TrendingUp
  },
  CIBERNETICA: {
    nombre: 'Ciberseguridad / Inteligencia',
    badge: '⚡ FILTRACIÓN / CIBER',
    color: '#10b981',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    icon: Zap
  }
};

// Plantillas rápidas de sucesos de crisis
const PLANTILLAS_CRISIS = [
  {
    titulo: 'Incursión No Autorizada en Espacio Aéreo',
    categoria: 'MILITAR',
    fuente: 'Comando de Defensa Aeroespacial',
    descripcion: 'Aeronaves de reconocimiento han sido detectadas sobrevolando territorio en disputa. Se requiere pronunciamiento urgente de las delegaciones involucradas.',
    imagen: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    titulo: 'Filtración Masiva de Cables Diplomáticos',
    categoria: 'CIBERNETICA',
    fuente: 'WikiLeaks / Consorcio de Inteligencia',
    descripcion: 'Se han hecho públicos documentos clasificados sobre negociaciones secretas de armamento y tratados bilaterales.',
    imagen: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    titulo: 'Ruptura Inmediata de Relaciones Bilaterales',
    categoria: 'DIPLOMATICA',
    fuente: 'Cancillería de Estado',
    descripcion: 'Embajadores han sido llamados a consultas y se ha ordenado el cierre de sedes diplomáticas de manera indefinida.',
    imagen: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  },
  {
    titulo: 'Congelación Inmediata de Activos Soberanos',
    categoria: 'ECONOMICA',
    fuente: 'Banco Central Internacional',
    descripcion: 'Se ha decretado el embargo total de cuentas y reservas de divisas extranjeras. Se exige respuesta diplomática inmediata antes del cierre bursátil.',
    imagen: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    estado: 'Activo'
  }
];

const GestorCrisis = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
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
  const [formFuente, setFormFuente] = useState('Mesa de Crisis / Sala de Situación');
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
    showToast(`Reloj ajustado: Día ${diaNum} · ${String(horasNum).padStart(2, '0')}:${String(minutosNum).padStart(2, '0')} hrs`);
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
    showToast('Sincronizado con la hora de tu dispositivo');
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
      showToast('Alertas y mensajes de crisis exportados en JSON');
    } catch (err) {
      showToast('Error al exportar alertas: ' + err.message, 'error');
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
            fuente: ev.fuente || ev.source || 'Mesa de Crisis',
            descripcion: ev.descripcion || ev.description || '',
            imagen: ev.imagen || ev.image || null,
            horaSimulada: ev.horaSimulada || ev.simulatedTime || 'Día 1 - 08:30 hrs',
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
          showToast(`¡${sanitizedEventos.length} alertas de crisis importadas!`);
        } else {
          showToast('No se encontraron alertas de crisis en el archivo JSON', 'error');
        }
      } catch (err) {
        showToast('Error al parsear archivo JSON: ' + err.message, 'error');
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

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Formato legible del reloj de simulación
  const formatoHoraSimulada = `Día ${relojSimulacion.dia} · ${String(relojSimulacion.horas).padStart(2, '0')}:${String(relojSimulacion.minutos).padStart(2, '0')} hrs`;

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
    showToast('Alerta de Última Hora actualizada');
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
    showToast('Evento eliminado del feed');
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
    showToast(`Tiempo simulado avanzado +${minutos} min`);
  };

  // Manejador de carga de imagen local desde PC
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen excede los 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImagen(event.target.result);
      showToast('Imagen cargada para la transmisión');
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
      fuente: formFuente.trim() || 'Mesa de Crisis',
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
    showToast('🚨 Alerta de crisis emitida y fijada en directo');
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
      {/* ─── BARRA SUPERIOR: RELOJ DE SIMULACIÓN Y ACCIONES ─────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--border-color)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Reloj Ficticio de Crisis */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            onClick={abrirModalAjusteReloj}
            title="Clic para abrir el panel de ajuste exacto del reloj de crisis"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '6px',
              padding: '3px 8px',
              color: '#f87171',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.22)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)'}
          >
            <Clock size={13} />
            <span>{formatoHoraSimulada}</span>
            {relojSimulacion.velocidad > 1 && (
              <span style={{
                fontSize: '0.62rem',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                padding: '1px 4px',
                borderRadius: '3px',
                color: '#fca5a5'
              }}>
                {relojSimulacion.velocidad}x
              </span>
            )}
          </div>

          {/* Botón Ajustar Exactamente */}
          <button
            onClick={abrirModalAjusteReloj}
            title="Ajustar exactamente día, hora, minutos y velocidad del reloj"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 7px',
              borderRadius: '5px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--subnav-bg)',
              color: 'var(--text-color)',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Sliders size={11} color="#f87171" />
            <span>{t('common.edit', 'Ajustar')}</span>
          </button>

          {/* Play/Pause del reloj */}
          <button
            onClick={() => setRelojSimulacion(prev => ({ ...prev, activo: !prev.activo }))}
            title={relojSimulacion.activo ? "Pausar Reloj de Simulación" : "Iniciar Reloj de Simulación"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '5px',
              border: '1px solid var(--border-color)',
              backgroundColor: relojSimulacion.activo ? 'rgba(16, 185, 129, 0.2)' : 'var(--subnav-bg)',
              color: relojSimulacion.activo ? '#34d399' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {relojSimulacion.activo ? <Pause size={11} /> : <Play size={11} />}
          </button>

          {/* Salto +15 min */}
          <button
            onClick={() => avanzarTiempoSimulado(15)}
            title="Avanzar 15 minutos simulados"
            style={{
              padding: '2px 5px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--muted-text)',
              fontSize: '0.68rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            +15m
          </button>
          <button
            onClick={() => avanzarTiempoSimulado(60)}
            title="Avanzar 1 hora simulada"
            style={{
              padding: '2px 5px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--muted-text)',
              fontSize: '0.68rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            +1h
          </button>
        </div>

        {/* Acciones Rápidas (Nuevo Evento, Plantillas, Exportar, Importar, Sonido, Broadcast) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Exportar JSON */}
          <button
            onClick={handleExportarCrisisJSON}
            title="Exportar todas las alertas de crisis a un archivo JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 7px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--subnav-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={12} color="#60a5fa" />
            {t('common.export', 'Exportar')}
          </button>

          {/* Importar JSON */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            title="Importar alertas de crisis desde un archivo JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 7px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--subnav-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Upload size={12} color="#10b981" />
            {t('common.import', 'Importar')}
          </button>
          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportarCrisisJSON}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => setModalPlantillas(true)}
            title="Plantillas rápidas de crisis"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 7px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--subnav-bg)',
              color: 'var(--text-color)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={12} color="#eab308" />
            {t('crisis.templates', 'Plantillas')}
          </button>

          <button
            onClick={() => setModalNuevoEvento(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)'
            }}
          >
            <Plus size={12} strokeWidth={3} />
            {t('crisis.emitAlertBtn', 'Emitir Alerta')}
          </button>

          {/* Sonido */}
          <button
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            title={sonidoHabilitado ? "Alarma de Audio Activada" : "Alarma Silenciada"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: sonidoHabilitado ? '#ef4444' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Modo Transmisión TV / Proyección */}
          <button
            onClick={() => setModoTransmisionCompleta(!modoTransmisionCompleta)}
            title={modoTransmisionCompleta ? "Modo Lista" : "Modo Transmisión TV / Proyector"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              border: `1px solid ${modoTransmisionCompleta ? '#3b82f6' : 'var(--border-color)'}`,
              backgroundColor: modoTransmisionCompleta ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: modoTransmisionCompleta ? '#60a5fa' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {modoTransmisionCompleta ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div style={{
          position: 'absolute',
          top: '46px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 50,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <CheckCircle size={12} />
          {feedbackToast}
        </div>
      )}

      {/* ─── BANNER TELEVISIVO ESTILO NOTICIERO (BREAKING NEWS TICKER) ──── */}
      {eventoBannerActivo && (
        <div style={{
          backgroundColor: '#000000',
          borderBottom: `2px solid ${catMeta.color}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
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
              FUENTE: {eventoBannerActivo.fuente} · {eventoBannerActivo.horaSimulada}
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
          {/* Barra de Filtros */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            backgroundColor: 'var(--subnav-bg)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.72rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={11} color="var(--muted-text)" />
              <span style={{ fontWeight: '600', color: 'var(--muted-text)' }}>{t('common.filter', 'Filtrar')}:</span>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  outline: 'none'
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

            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
              {eventosFiltrados.length} {t('crisis.eventsRegistered', 'acontecimientos registrados')}
            </div>
          </div>

          {/* Lista de Sucesos en el Feed */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {eventosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted-text)', fontSize: '0.8rem' }}>
                {t('crisis.noEventsCategory', 'No hay sucesos de crisis en esta categoría.')}
              </div>
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
                      backgroundColor: esBanner ? 'rgba(239, 68, 68, 0.08)' : 'var(--card-header-bg)',
                      border: `1px solid ${esBanner ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
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
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                          {ev.horaSimulada}
                        </span>
                        {ev.estado === 'Resuelto' && (
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
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
                          title={esBanner ? "Alerta fijada en pantalla" : "Proyectar como Última Hora"}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${esBanner ? '#ef4444' : 'var(--border-color)'}`,
                            backgroundColor: esBanner ? '#ef4444' : 'transparent',
                            color: esBanner ? '#ffffff' : 'var(--muted-text)',
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
                          title="Alternar estado de resolución"
                          style={{
                            padding: '3px 5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: ev.estado === 'Resuelto' ? '#34d399' : 'var(--muted-text)',
                            fontSize: '0.65rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={11} />
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => handleEliminarEvento(ev.id)}
                          title="Eliminar suceso"
                          style={{
                            padding: '3px 5px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>
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

      {/* ─── MODAL: EMITIR NUEVA ALERTA DE CRISIS ────────────────────────── */}
      {modalNuevoEvento && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--panel-color)',
            borderRadius: '10px',
            border: '1px solid #ef4444',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Megaphone size={16} />
                <span>{t('crisis.emitAlert', 'Emitir Alerta de Crisis / Última Hora')}</span>
              </div>
              <button
                onClick={() => setModalNuevoEvento(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoEvento} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Titular */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.headlineLabel', 'TITULAR DE LA NOTICIA / SUCESO *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bombardeo aéreo en la frontera este"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Categoría y Fuente */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                    {t('crisis.categoryLabel', 'CATEGORÍA / SEVERIDAD')}
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '7px 8px',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  >
                    <option value="CRITICA">{t('crisis.critical', '🔴 Última Hora (Crítico)')}</option>
                    <option value="MILITAR">{t('crisis.military', '⚔️ Alerta Militar / Ataque')}</option>
                    <option value="DIPLOMATICA">{t('crisis.diplomatic', '🌐 Comunicado Diplomático')}</option>
                    <option value="ECONOMICA">{t('crisis.economic', '💵 Colapso Financiero')}</option>
                    <option value="CIBERNETICA">{t('crisis.cybernetic', '⚡ Ciberataque / Inteligencia')}</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                    {t('crisis.sourceLabel', 'FUENTE INFORMATIVA')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Reuters / Inteligencia"
                    value={formFuente}
                    onChange={(e) => setFormFuente(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '7px 8px',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Descripción detallada */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.descriptionLabel', 'DESCRIPCIÓN DEL ACONTECIMIENTO / DIRECTIVAS DE MESA')}
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre lo ocurrido, consecuencias y requerimientos para el comité..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Imagen / Transmisión Visual de la TV */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                    {t('crisis.imageLabel', 'IMAGEN PARA LA RETRANSMISIÓN DE TV (OPCIONAL)')}
                  </label>
                  {formImagen && (
                    <button
                      type="button"
                      onClick={() => setFormImagen('')}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {t('crisis.removeImage', 'Quitar imagen')}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {/* Botón Subir Archivo */}
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
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#60a5fa',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <UploadCloud size={14} /> {t('crisis.uploadFile', 'Subir Imagen')}
                  </button>

                  {/* Input de URL */}
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <LinkIcon size={12} color="var(--muted-text)" style={{ position: 'absolute', left: '8px' }} />
                    <input
                      type="text"
                      placeholder="o pegar URL de imagen..."
                      value={formImagen.startsWith('data:') ? 'Imagen local cargada (' + Math.round(formImagen.length / 1024) + ' KB)' : formImagen}
                      onChange={(e) => {
                        if (!formImagen.startsWith('data:')) setFormImagen(e.target.value);
                        else setFormImagen('');
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--card-header-bg)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 8px 6px 26px',
                        fontSize: '0.76rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Chips de Fotos Rápidas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{t('crisis.quickPhotos', 'Plantillas:')}</span>
                  {FOTOS_PRESET.map(fp => (
                    <button
                      key={fp.label}
                      type="button"
                      onClick={() => setFormImagen(fp.url)}
                      style={{
                        background: formImagen === fp.url ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-header-bg)',
                        border: `1px solid ${formImagen === fp.url ? '#3b82f6' : 'var(--border-color)'}`,
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '0.65rem',
                        color: formImagen === fp.url ? '#ffffff' : 'var(--muted-text)',
                        cursor: 'pointer'
                      }}
                    >
                      {fp.label}
                    </button>
                  ))}
                </div>

                {/* Vista previa de la imagen */}
                {formImagen && (
                  <div style={{
                    marginTop: '6px',
                    position: 'relative',
                    width: '100%',
                    height: '60px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#000'
                  }}>
                    <img
                      src={formImagen}
                      alt="Vista previa emisión"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '6px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '0.62rem',
                      color: '#ffffff',
                      fontWeight: '800',
                      letterSpacing: '0.5px'
                    }}>
                      📡 VISTA PREVIA RETRANSMISIÓN TV
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Países Implicados */}
              {paises.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                    {t('crisis.involvedCountries', 'DELEGACIONES INVOLUCRADAS')}
                  </label>
                  <div style={{
                    maxHeight: '50px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    padding: '6px',
                    backgroundColor: 'var(--card-header-bg)',
                    borderRadius: '6px',
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
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${sel ? '#ef4444' : 'var(--border-color)'}`,
                            backgroundColor: sel ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            color: sel ? '#ffffff' : 'var(--muted-text)',
                            fontSize: '0.68rem',
                            fontWeight: sel ? '700' : '500',
                            cursor: 'pointer'
                          }}
                        >
                          <CountryFlag bandera={p.bandera} nombre={p.nombre} size="xs" />
                          <span>{p.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Checkbox Sonido de Alarma */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  id="chk-sound"
                  checked={formEmitirAlerta}
                  onChange={(e) => setFormEmitirAlerta(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="chk-sound" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color)', cursor: 'pointer' }}>
                  {t('crisis.playSoundOnPublish', 'Sonar alerta auditiva de transmisión de emergencia')}
                </label>
              </div>

              {/* Botón de Envío */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevoEvento(false)}
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
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <Send size={14} />
                  <span>{t('crisis.publishImmediate', 'Publicar Alerta Inmediata')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PLANTILLAS RÁPIDAS DE CRISIS ─────────────────────────── */}
      {modalPlantillas && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
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
                <Sparkles size={15} color="#eab308" />
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
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
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
                      <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: '600' }}>
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
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
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
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: isLight ? '0 12px 40px rgba(0,0,0,0.2)' : '0 12px 40px rgba(0,0,0,0.6)',
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
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={16} color="#ef4444" />
                </div>
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
                backgroundColor: isLight ? '#fef2f2' : '#0a0d14',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                boxShadow: isLight ? 'none' : 'inset 0 0 15px rgba(239, 68, 68, 0.08)'
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#dc2626', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {t('crisis.resultClock', 'HORA SIMULADA RESULTANTE')}
                </div>
                <div style={{
                  fontSize: '1.6rem',
                  fontWeight: '900',
                  color: isLight ? '#dc2626' : '#ffffff',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  textShadow: isLight ? 'none' : '0 0 10px rgba(239, 68, 68, 0.5)'
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
                    { label: '+24h (Día Sig.)', delta: 1440 }
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
                    { label: '🌅 Día 1 - 08:30 (Apertura)', dia: 1, h: 8, m: 30 },
                    { label: '🥪 Día 1 - 13:00 (Receso)', dia: 1, h: 13, m: 0 },
                    { label: '🌆 Día 1 - 18:00 (Cierre)', dia: 1, h: 18, m: 0 },
                    { label: '🚨 Día 1 - 23:45 (Madrugada)', dia: 1, h: 23, m: 45 },
                    { label: '☀️ Día 2 - 09:00 (Reanudación)', dia: 2, h: 9, m: 0 },
                    { label: '🏁 Día 2 - 16:30 (Votación Final)', dia: 2, h: 16, m: 30 }
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
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
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
