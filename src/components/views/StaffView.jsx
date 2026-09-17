import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  AlertCircle, 
  MessageSquare, 
  LogOut, 
  Radio, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sliders, 
  Key, 
  Volume2, 
  Download, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Bell, 
  CheckSquare, 
  Square, 
  Coffee, 
  Printer, 
  BatteryCharging, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  Info,
  AlertTriangle,
  Plus,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import CountryFlag from '../common/CountryFlag';
import { playEmergencyPulse, playChimeAlert } from '../../utils/audioAlerts';
import conferenceService from '../../services/conferenceService';
import ConferenceBanner from '../common/ConferenceBanner';
import useTopBarOverflow from '../../hooks/useTopBarOverflow';
import {
  formatearMensajeAviso,
  correspondeAviso,
  obtenerOpcionesDestino,
  obtenerEtiquetaDestino
} from '../../utils/announcementHelpers';

const StaffView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Hook para detectar overflow en la cabecera de Staff y compactar logo si es necesario
  const { containerRef: headerRef, isLogoCompact, isExtraCompact } = useTopBarOverflow();

  const { tipoSesion, cambiarTipoSesion } = useSession();

  const {
    roomId,
    notes,
    sendNote,
    remoteSessionState,
    leaveRoom,
    announcements,
    broadcastAnnouncement,
    deleteAnnouncement,
    connectedPeers
  } = useP2P();

  const [activeTab, setActiveTab] = useState('AVISOS_COMITE'); // 'AVISOS_COMITE' | 'MENSAJERIA_COMITE' | 'COMUNICACION_CONF' | 'MONITOR_SALA'

  // Formulario de emisión de avisos de comité (WebSockets)
  const [tituloAviso, setTituloAviso] = useState('');
  const [textoAviso, setTextoAviso] = useState('');
  const [prioridadAviso, setPrioridadAviso] = useState('general'); // 'general' | 'urgente' | 'logistica' | 'receso' | 'documento'
  const [destinoAviso, setDestinoAviso] = useState('ALL');

  // Formulario de comunicación con conferencia (Base de Datos)
  const [tituloAvisoConf, setTituloAvisoConf] = useState('');
  const [textoAvisoConf, setTextoAvisoConf] = useState('');
  const [prioridadAvisoConf, setPrioridadAvisoConf] = useState('info');
  const [destinoAvisoConf, setDestinoAvisoConf] = useState('STAFF_ALL'); // 'STAFF_ALL' | 'SECRETARIA' | 'GLOBAL'
  const [enviandoConf, setEnviandoConf] = useState(false);

  // Formulario de mensajería (notas de sala)
  const [destinatarioNota, setDestinatarioNota] = useState('CHAIR');
  const [textoNota, setTextoNota] = useState('');
  const [tipoNota, setTipoNota] = useState('paje'); // 'paje' | 'logistica' | 'urgente' | 'general'
  const [filtroNotas, setFiltroNotas] = useState('TODAS'); // 'TODAS' | 'RECIBIDAS' | 'ENVIADAS'
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Checklist de operaciones de sala (inicia vacío por defecto)
  const [nuevaTareaChecklist, setNuevaTareaChecklist] = useState('');
  const [checklist, setChecklist] = useState(() => {
    try {
      const key = roomId ? `openmun_staff_checklist_${roomId}` : 'openmun_staff_checklist';
      const saved = localStorage.getItem(key) || localStorage.getItem('openmun_staff_checklist');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Si contiene exactamente los 6 ítems que venían antes por defecto, limpiamos para iniciar vacío
      if (Array.isArray(parsed) && parsed.length === 6 && parsed[0]?.text === 'Verificar carteles de delegaciones en sus sitios' && parsed[5]?.text === 'Revisar suministro de agua para la Mesa y delegados') {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const key = roomId ? `openmun_staff_checklist_${roomId}` : 'openmun_staff_checklist';
      localStorage.setItem(key, JSON.stringify(checklist));
      localStorage.setItem('openmun_staff_checklist', JSON.stringify(checklist));
    } catch (e) { }
  }, [checklist, roomId]);

  // Avisos de Conferencia (Base de Datos)
  const [avisosDB, setAvisosDB] = useState([]);
  const [comitesConf, setComitesConf] = useState([]);
  const confActiva = conferenceService.obtenerSesionActiva();
  const [comiteAsignado, setComiteAsignado] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null) || roomId || 'TODOS');
  const currentComiteId = comiteAsignado === 'TODOS' ? null : comiteAsignado;
  const avisosDBFiltrados = avisosDB.filter(av => correspondeAviso(av, { role: 'staff', currentComiteId }));

  // Cargar comités de la conferencia para selector completo de destinos
  useEffect(() => {
    if (confActiva?.id) {
      conferenceService.obtenerResumen(confActiva.id).then(res => {
        if (res?.comites && Array.isArray(res.comites)) {
          setComitesConf(res.comites);
        }
      }).catch(() => {});
    }
  }, [confActiva?.id]);

  useEffect(() => {
    if (!confActiva?.id) return;
    const fetchAvisos = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const res = await conferenceService.obtenerAvisos(confActiva.id, currentComiteId, 'staff');
        if (res && Array.isArray(res.avisos)) {
          setAvisosDB(res.avisos);
        }
      } catch (e) {}
    };
    fetchAvisos();
    const interval = setInterval(fetchAvisos, 20000);
    const handleVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAvisos();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVis);
    }

    const handleNuevo = (e) => {
      if (e.detail) {
        setAvisosDB(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
      }
    };
    const handleDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisosDB(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };
    window.addEventListener('openmun_nuevo_aviso', handleNuevo);
    window.addEventListener('openmun_aviso_desactivado', handleDesactivado);

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVis);
      }
      window.removeEventListener('openmun_nuevo_aviso', handleNuevo);
      window.removeEventListener('openmun_aviso_desactivado', handleDesactivado);
    };
  }, [confActiva?.id]);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const state = remoteSessionState || {};
  const comisionNombre = state.comision || state.nombreComite || 'Comité MUN';
  const oradorActual = state.oradorActual || null;
  const listaOradores = state.oradoresCola || [];
  const oradoresCaucus = state.oradoresCaucus || [];
  const paises = state.paises || [];

  // Filtrar notas relevantes para el staff
  const notasStaff = notes.filter(n => 
    n.to === 'STAFF' || 
    n.fromRole === 'staff' ||
    n.from === 'Staff' ||
    n.to === 'TODOS' ||
    n.type === 'logistica' ||
    n.type === 'paje'
  );

  const notasFiltradas = notasStaff.filter(n => {
    if (filtroNotas === 'RECIBIDAS') return !n.isOutgoing && n.fromRole !== 'staff';
    if (filtroNotas === 'ENVIADAS') return n.isOutgoing || n.fromRole === 'staff';
    return true;
  });

  const handleCambiarEstado = (nuevoTipo) => {
    cambiarTipoSesion(nuevoTipo);
    if (confActiva?.id && roomId) {
      conferenceService.actualizarEstadoComite(confActiva.id, roomId, { tipo_sesion: nuevoTipo });
    }
    showToast(`Estado del comité cambiado a ${nuevoTipo.toUpperCase()}`);
  };

  const handleEmitirAviso = (e) => {
    e.preventDefault();
    if (!tituloAviso.trim() && !textoAviso.trim()) return;

    broadcastAnnouncement({
      title: tituloAviso.trim() || 'Aviso Oficial de Staff',
      text: textoAviso.trim(),
      priority: prioridadAviso,
      target: destinoAviso,
      senderRole: 'staff',
      senderName: `Staff (${comisionNombre})`
    });

    setTituloAviso('');
    setTextoAviso('');
    showToast('Aviso emitido en tiempo real a las delegaciones del comité');
  };

  const handleEnviarAvisoConferencia = async (e) => {
    e.preventDefault();
    if (!textoAvisoConf.trim()) return;
    if (!confActiva?.id) {
      showToast('No hay conferencia activa vinculada');
      return;
    }
    setEnviandoConf(true);
    try {
      const mensajeCompleto = tituloAvisoConf.trim()
        ? `${tituloAvisoConf.trim()}: ${textoAvisoConf.trim()}`
        : textoAvisoConf.trim();

      await conferenceService.crearAviso(confActiva.id, {
        comite_id: destinoAvisoConf === 'GLOBAL' ? '' : destinoAvisoConf,
        emisor: `Staff (${comisionNombre})`,
        tipo: prioridadAvisoConf === 'urgente' ? 'urgente' : 'alerta',
        mensaje: mensajeCompleto
      });

      const res = await conferenceService.obtenerAvisos(confActiva.id);
      if (res?.avisos) setAvisosDB(res.avisos);

      setTituloAvisoConf('');
      setTextoAvisoConf('');
      showToast('Mensaje transmitido a la Base de Datos de la conferencia');
    } catch (err) {
      showToast('Error al enviar comunicado a la conferencia');
    } finally {
      setEnviandoConf(false);
    }
  };

  const handleEnviarNota = (e) => {
    e.preventDefault();
    if (!textoNota.trim()) return;

    sendNote(destinatarioNota, textoNota.trim(), tipoNota);
    setTextoNota('');
    showToast(`Nota enviada a ${destinatarioNota}`);
  };

  const handleAddCheckItem = (e) => {
    if (e) e.preventDefault();
    if (!nuevaTareaChecklist.trim()) return;
    const newItem = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      text: nuevaTareaChecklist.trim(),
      done: false
    };
    setChecklist(prev => [...prev, newItem]);
    setNuevaTareaChecklist('');
  };

  const toggleCheckItem = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleDeleteCheckItem = (id, e) => {
    if (e) e.stopPropagation();
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCompletedChecklist = () => {
    setChecklist(prev => prev.filter(item => !item.done));
  };

  const handleClearAllChecklist = () => {
    setChecklist([]);
  };

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

      {/* ── Cabecera de Staff ── */}
      <header
        ref={headerRef}
        style={{
          padding: isExtraCompact ? '0.5rem 1rem' : '0.85rem 1.5rem',
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--subborder-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          maxWidth: '100vw',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isLogoCompact ? '0.5rem' : '0.9rem', minWidth: 0, flexShrink: 1 }}>
          <OpenMunLogo height={32} isLight={isLight} showText={!isLogoCompact} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: '800', fontSize: isExtraCompact ? '0.9rem' : '1.05rem', letterSpacing: '-0.01em', color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('views.staff.title', 'Consola de Staff y Logística')}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Sala: {roomId}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {comisionNombre} · {t('views.staff.subtitle', 'Gestión de sala, avisos oficiales, pajes y asistencia operativa')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Selector de Estado de Sesión en Vivo para Staff */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px'
          }}>
            {[
              { id: 'formal', label: 'Formal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.18)' },
              { id: 'informal', label: 'Informal', color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)' },
              { id: 'receso', label: 'Receso', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)' },
              { id: 'votacion', label: 'Votando', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)' }
            ].map(s => {
              const isActivo = (tipoSesion || state.tipoSesion || 'formal') === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleCambiarEstado(s.id)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: isActivo ? `1px solid ${s.color}` : '1px solid transparent',
                    backgroundColor: isActivo ? (isLight ? '#ffffff' : s.bg) : 'transparent',
                    color: isActivo ? s.color : 'var(--muted-text)',
                    fontWeight: isActivo ? '800' : '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: isActivo ? `0 0 8px ${s.color}33` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Cambiar estado del comité a ${s.label}`}
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: s.color,
                    boxShadow: isActivo ? `0 0 6px ${s.color}` : 'none'
                  }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsAccessModalOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
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
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isLight ? t('header.darkMode', "Modo Oscuro") : t('header.lightMode', "Modo Claro")}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <LanguageSelector showIcon={false} />

          <button
            onClick={() => {
              if (onExit) onExit();
              else leaveRoom();
            }}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <LogOut size={14} /> {t('views.delegate.exitRoom', 'Salir')}
          </button>
        </div>
      </header>

      {/* Banner de Avisos Oficiales de la Conferencia y Sala */}
      <ConferenceBanner isLight={isLight} role="staff" comiteId={currentComiteId} />

      {/* ── Barra de Pestañas de Navegación (4 Secciones) ── */}
      <nav style={{
        display: 'flex',
        gap: '0.4rem',
        padding: '0.65rem 1.5rem',
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'AVISOS_COMITE', icon: Megaphone, label: 'Avisos Comité', badge: announcements.length },
          { id: 'MENSAJERIA_COMITE', icon: MessageSquare, label: 'Mensajería Comité', badge: notasStaff.length },
          { id: 'COMUNICACION_CONF', icon: Globe, label: 'Comunicación Conferencia', badge: avisosDBFiltrados.length },
          { id: 'MONITOR_SALA', icon: Radio, label: 'Monitor Sala' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--btn-bg)' : 'transparent',
                color: isActive ? 'var(--btn-text)' : 'var(--muted-text)',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--subborder-color)',
                  color: isActive ? '#ffffff' : 'var(--text-color)',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Toast de Feedback ── */}
      {feedbackToast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '24px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '0.65rem 1.15rem',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Check size={16} /> {feedbackToast}
        </div>
      )}

      {/* ── Contenido Principal según Pestaña ── */}
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1300px', width: '100%', margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 1: AVISOS COMITÉ (EMISIÓN & GESTIÓN WEBSOCKETS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'AVISOS_COMITE' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem' }}>
            {/* Formulario de Emisión de Aviso Local a la Sala */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Megaphone size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.staff.emitAnnouncement', 'Emitir Aviso a Delegaciones')}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                Los avisos emitidos aparecerán de inmediato en el titular y holder prioritario de todas las delegaciones conectadas a la sala.
              </p>

              <form onSubmit={handleEmitirAviso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementTitle', 'Título del Aviso')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Receso de 15 minutos / Entrega de Enmiendas"
                    value={tituloAviso}
                    onChange={e => setTituloAviso(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.88rem',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementPriority', 'Categoría / Prioridad')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', marginTop: '0.35rem' }}>
                    {[
                      { id: 'general', label: t('views.staff.priorityGeneral', 'General'), color: '#fbbf24' },
                      { id: 'urgente', label: t('views.staff.priorityUrgent', 'Urgente / Importante'), color: '#ef4444' },
                      { id: 'logistica', label: t('views.staff.priorityLogistics', 'Logística de Sala'), color: '#60a5fa' },
                      { id: 'receso', label: t('views.staff.priorityRecess', 'Receso / Coffee Break'), color: '#34d399' },
                      { id: 'documento', label: t('views.staff.priorityDoc', 'Entrega Documentos'), color: '#c084fc' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPrioridadAviso(cat.id)}
                        style={{
                          backgroundColor: prioridadAviso === cat.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-header-bg)',
                          border: `1.5px solid ${prioridadAviso === cat.id ? '#10b981' : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
                          padding: '0.5rem 0.4rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          color: prioridadAviso === cat.id ? 'var(--text-color)' : 'var(--muted-text)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementMsg', 'Mensaje o Instrucción')}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detalles sobre el aviso, hora límite, ubicación o instrucción de sala..."
                    value={textoAviso}
                    onChange={e => setTextoAviso(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.84rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!tituloAviso.trim() && !textoAviso.trim()}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: (tituloAviso.trim() || textoAviso.trim()) ? 'pointer' : 'not-allowed',
                    opacity: (tituloAviso.trim() || textoAviso.trim()) ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} /> {t('views.staff.sendAnnouncementBtn', 'Emitir Aviso Oficial')}
                </button>
              </form>
            </div>

            {/* Listado de Avisos Activos en Sala (WebSockets) */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Bell size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  Avisos Activos en Sala ({announcements.length})
                </h3>
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
                    {t('views.staff.noAnnouncements', 'No hay avisos emitidos en este momento.')}
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    Usa el formulario lateral para emitir un aviso en tiempo real a las delegaciones del comité.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {announcements.map((ann) => {
                    const badge = getPriorityBadge(ann.priority);
                    return (
                      <div
                        key={`ws_${ann.id}`}
                        style={{
                          backgroundColor: 'var(--card-header-bg)',
                          border: `1px solid ${badge.border}`,
                          borderLeft: `4px solid ${badge.text}`,
                          borderRadius: '12px',
                          padding: '1.1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: 'rgba(16, 185, 129, 0.18)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              ⚡ Sala Local
                            </span>
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
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                              • {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--muted-text)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem'
                            }}
                            title={t('views.staff.deleteAnnouncement', 'Retirar Aviso')}
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </button>
                        </div>

                        <div style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-color)' }}>
                          {ann.title}
                        </div>

                        {ann.text && (
                          <div style={{ fontSize: '0.84rem', color: 'var(--muted-text)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                            {formatearMensajeAviso(ann.text)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 2: MENSAJERÍA COMITÉ (NOTAS & PAJES)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MENSAJERIA_COMITE' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem' }}>
            {/* Formulario Redactar Nota de Staff */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <MessageSquare size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.staff.notesTitle', 'Mensajería de Staff & Pajes')}
                </h3>
              </div>

              <form onSubmit={handleEnviarNota} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.sendTo', 'Destinatario')}
                  </label>
                  <select
                    value={destinatarioNota}
                    onChange={e => setDestinatarioNota(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}
                  >
                    <optgroup label="Mesa & Equipos de Sala">
                      <option value="CHAIR">🏛️ Mesa de Presidencia (Chair)</option>
                      <option value="SECRETARIA">📑 Secretaría / Proyector</option>
                      <option value="BACKROOM">🛡️ Backroom / Gabinete de Crisis</option>
                      <option value="TODOS">📢 Todas las Delegaciones</option>
                    </optgroup>
                    {paises.length > 0 && (
                      <optgroup label="Delegaciones del Comité">
                        {paises.map(p => {
                          const nombre = typeof p === 'string' ? p : p.nombre;
                          return (
                            <option key={nombre} value={nombre}>
                              🌐 {nombre}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.noteType', 'Tipo de Nota')}
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
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="paje">✉️ Mensaje de Paje / Entrega</option>
                    <option value="logistica">🛠️ Logística / Asistencia</option>
                    <option value="urgente">🚨 Mensaje Urgente</option>
                    <option value="general">📄 General / Procedimental</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.noteText', 'Texto del Mensaje')}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Escribe la instrucción o nota para la delegación o la Mesa..."
                    value={textoNota}
                    onChange={e => setTextoNota(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
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
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: textoNota.trim() ? 'pointer' : 'not-allowed',
                    opacity: textoNota.trim() ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} /> {t('views.staff.sendNoteBtn', 'Enviar Nota')}
                </button>
              </form>
            </div>

            {/* Buzón de Notas */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <MessageSquare size={20} color="#3b82f6" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                    {t('views.staff.inbox', 'Buzón de Notas')} ({notasStaff.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['TODAS', 'RECIBIDAS', 'ENVIADAS'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFiltroNotas(f)}
                      style={{
                        backgroundColor: filtroNotas === f ? 'var(--btn-bg)' : 'transparent',
                        color: filtroNotas === f ? 'var(--btn-text)' : 'var(--muted-text)',
                        border: '1px solid var(--subborder-color)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {notasFiltradas.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--muted-text)',
                  border: '1px dashed var(--subborder-color)',
                  borderRadius: '12px'
                }}>
                  {t('views.staff.noNotes', 'No hay notas registradas.')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {notasFiltradas.map(nota => {
                    const isOutgoing = nota.isOutgoing || nota.fromRole === 'staff';
                    return (
                      <div
                        key={nota.id}
                        style={{
                          backgroundColor: 'var(--card-header-bg)',
                          border: '1px solid var(--subborder-color)',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              backgroundColor: 'rgba(59, 130, 246, 0.18)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px'
                            }}>
                              ⚡ Sala Local
                            </span>
                            <span style={{ fontWeight: '800', color: isOutgoing ? '#10b981' : '#3b82f6' }}>
                              {isOutgoing ? `Para: ${nota.to}` : `De: ${nota.from}`}
                            </span>
                          </div>
                          <span style={{ color: 'var(--muted-text)', fontSize: '0.7rem' }}>
                            {new Date(nota.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-color)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                          {formatearMensajeAviso(nota.text)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 3: COMUNICACIÓN CONFERENCIA (BASE DE DATOS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'COMUNICACION_CONF' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem' }}>
            {/* Formulario para emitir comunicado a la Base de Datos */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Globe size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  Transmitir a la Conferencia (Base de Datos)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                Envía solicitudes, peticiones de material o alertas a la Secretaría General o a todo el equipo de Staff de la conferencia.
              </p>

              <form onSubmit={handleEnviarAvisoConferencia} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Destinatario Central
                  </label>
                  <select
                    value={destinoAvisoConf}
                    onChange={e => setDestinoAvisoConf(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}
                  >
                    <optgroup label="🌐 Canales Generales">
                      <option value="STAFF_ALL">👥 Todo el Staff de la Conferencia</option>
                      <option value="SECRETARIA">🛡️ Organización / Secretaría General</option>
                      <option value="GLOBAL">📢 Toda la Conferencia (Global)</option>
                      <option value="CHAIRS_ALL">🏛️ Todas las Mesas Directivas</option>
                    </optgroup>

                    {currentComiteId && (
                      <optgroup label="📍 Mi Sala Actual">
                        <option value={`CHAIR_${currentComiteId}`}>🏛️ Mesa Directiva de mi Sala</option>
                        <option value={currentComiteId}>🌐 Toda mi Sala (Mesa + Delegados)</option>
                      </optgroup>
                    )}

                    {comitesConf.filter(c => String(c.id).toLowerCase() !== String(currentComiteId || '').toLowerCase()).length > 0 && (
                      <>
                        <optgroup label="🏛️ Mesas de Otros Comités">
                          {comitesConf
                            .filter(c => String(c.id).toLowerCase() !== String(currentComiteId || '').toLowerCase())
                            .map(c => (
                              <option key={`c_chair_${c.id}`} value={`CHAIR_${c.id}`}>🏛️ Mesa de {c.nombre || c.id}</option>
                            ))}
                        </optgroup>

                        <optgroup label="👥 Staff de Otras Salas">
                          {comitesConf
                            .filter(c => String(c.id).toLowerCase() !== String(currentComiteId || '').toLowerCase())
                            .map(c => (
                              <option key={`c_staff_${c.id}`} value={`STAFF_COMITE_${c.id}`}>👥 Staff de {c.nombre || c.id}</option>
                            ))}
                        </optgroup>

                        <optgroup label="🌐 Otros Comités Completos">
                          {comitesConf
                            .filter(c => String(c.id).toLowerCase() !== String(currentComiteId || '').toLowerCase())
                            .map(c => (
                              <option key={`c_all_${c.id}`} value={c.id}>🌐 Sala de {c.nombre || c.id}</option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Prioridad
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginTop: '0.35rem' }}>
                    {[
                      { id: 'info', label: 'Informativo', color: '#3b82f6' },
                      { id: 'alerta', label: 'Alerta', color: '#f59e0b' },
                      { id: 'urgente', label: 'Urgente', color: '#ef4444' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPrioridadAvisoConf(cat.id)}
                        style={{
                          backgroundColor: prioridadAvisoConf === cat.id ? `${cat.color}22` : 'var(--card-header-bg)',
                          border: `1.5px solid ${prioridadAvisoConf === cat.id ? cat.color : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
                          padding: '0.5rem 0.4rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          color: prioridadAvisoConf === cat.id ? cat.color : 'var(--muted-text)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Asunto / Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Faltan hojas de votación / Delegación indispuesta"
                    value={tituloAvisoConf}
                    onChange={e => setTituloAvisoConf(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.88rem',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    Mensaje o Requerimiento
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Escribe el mensaje que se registrará en la base de datos de la conferencia..."
                    value={textoAvisoConf}
                    onChange={e => setTextoAvisoConf(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.84rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!textoAvisoConf.trim() || enviandoConf}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: (textoAvisoConf.trim() && !enviandoConf) ? 'pointer' : 'not-allowed',
                    opacity: (textoAvisoConf.trim() && !enviandoConf) ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} /> {enviandoConf ? 'Transmitiendo...' : 'Enviar a la Conferencia'}
                </button>
              </form>
            </div>

            {/* Buzón de Comunicados de Conferencia (Base de Datos) */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Globe size={20} color="#3b82f6" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                    Comunicados de Conferencia ({avisosDBFiltrados.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {comitesConf.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--muted-text)' }}>Sala:</span>
                      <select
                        value={comiteAsignado}
                        onChange={(e) => {
                          const val = e.target.value;
                          setComiteAsignado(val);
                          if (val !== 'TODOS') {
                            localStorage.setItem('openmun_current_comite_id', val);
                          }
                        }}
                        style={{
                          padding: '0.3rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid var(--subborder-color)',
                          backgroundColor: 'var(--card-header-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        <option value="TODOS">🌐 Todo el Staff (Todas las salas)</option>
                        {comitesConf.map(c => (
                          <option key={`sel_staff_com_${c.id}`} value={c.id}>👥 {c.nombre || c.id}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (confActiva?.id) {
                        const res = await conferenceService.obtenerAvisos(confActiva.id, currentComiteId, 'staff');
                        if (res?.avisos) setAvisosDB(res.avisos);
                        showToast('Buzón de conferencia actualizado');
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--subborder-color)',
                      backgroundColor: 'var(--card-header-bg)',
                      color: 'var(--text-color)',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Radio size={12} /> Refrescar
                  </button>
                </div>
              </div>

              {avisosDBFiltrados.length === 0 ? (
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
                  <Globe size={36} style={{ opacity: 0.3 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    No hay comunicados registrados en la base de datos central.
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    Los avisos y solicitudes emitidos por la Organización o por el equipo de staff aparecerán aquí.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {avisosDBFiltrados.map((av) => (
                    <div
                      key={`db_${av.id}`}
                      style={{
                        backgroundColor: 'var(--card-header-bg)',
                        border: `1px solid ${av.tipo === 'urgente' ? 'rgba(239, 68, 68, 0.4)' : 'var(--subborder-color)'}`,
                        borderLeft: `4px solid ${av.tipo === 'urgente' ? '#ef4444' : av.tipo === 'alerta' ? '#f59e0b' : '#3b82f6'}`,
                        borderRadius: '12px',
                        padding: '1.1rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            backgroundColor: 'rgba(59, 130, 246, 0.18)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            padding: '0.12rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              Conferencia
                            </span>
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
                          <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                            Destino: <strong style={{ color: 'var(--text-color)' }}>
                              {obtenerEtiquetaDestino(av.comite_id, comitesConf).label}
                            </strong>
                          </span>
                          {av.creado_en && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                              • {new Date(av.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            conferenceService.desactivarAviso(av.id, confActiva?.id);
                            setAvisosDB(prev => prev.filter(a => a.id !== av.id));
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: '700'
                          }}
                          title="Descartar de base de datos"
                        >
                          Descartar
                        </button>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: 'var(--text-color)', lineHeight: '1.4' }}>
                        {formatearMensajeAviso(av.mensaje, null, comitesConf)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 4: MONITOR DE SALA & LOGÍSTICA
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MONITOR_SALA' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem' }}>
            {/* Monitor de Estado en Vivo */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Radio size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.staff.monitorTitle', 'Monitor de Sala & Estado')}
                </h3>
              </div>

              {/* Orador Actual */}
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.currentSpeaker', 'Orador Actual')}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '2px' }}>
                    {oradorActual ? (typeof oradorActual === 'string' ? oradorActual : oradorActual.nombre) : 'Sin orador en tribuna'}
                  </div>
                </div>
              </div>

              {/* Contadores de Cola */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.gslQueue', 'Cola GSL')}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#3b82f6', marginTop: '4px' }}>
                    {listaOradores.length}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.caucusQueue', 'Cola Caucus')}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f59e0b', marginTop: '4px' }}>
                    {oradoresCaucus.length}
                  </div>
                </div>
              </div>

              {/* Conexiones en Sala */}
              <div style={{
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                  {t('views.staff.connectedDelegations', 'Delegaciones en Sala')}:
                </span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px'
                }}>
                  {connectedPeers.length} dispositivos
                </span>
              </div>
            </div>

            {/* Checklist Operativo de Staff */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                  <CheckSquare size={20} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                    {t('views.staff.checklistTitle', 'Checklist Operativo de Staff')}
                  </h3>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    backgroundColor: 'rgba(234, 179, 8, 0.18)',
                    color: '#eab308',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '6px',
                    letterSpacing: '0.04em'
                  }}>
                    🚧 WORK IN PROGRESS
                  </span>
                </div>
                {checklist.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      color: checklist.every(i => i.done) ? '#10b981' : 'var(--muted-text)',
                      backgroundColor: checklist.every(i => i.done) ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px'
                    }}>
                      {checklist.filter(i => i.done).length}/{checklist.length}
                    </span>
                    {checklist.some(i => i.done) && (
                      <button
                        type="button"
                        onClick={handleClearCompletedChecklist}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-text)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '0.2rem 0.4rem'
                        }}
                      >
                        {t('views.staff.clearCompleted', 'Limpiar completadas')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearAllChecklist}
                      title={t('views.staff.clearAll', 'Borrar todo')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.4rem'
                      }}
                    >
                      <Trash2 size={13} />
                      {t('views.staff.clearAll', 'Borrar todo')}
                    </button>
                  </div>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                {t('views.staff.checklistDesc', 'Marca las tareas operativas a medida que se cumplan durante la sesión del comité.')}
              </p>

              {/* Formulario para añadir nueva tarea */}
              <form onSubmit={handleAddCheckItem} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={nuevaTareaChecklist}
                  onChange={e => setNuevaTareaChecklist(e.target.value)}
                  placeholder={t('views.staff.newChecklistPlaceholder', 'Escribe una nueva tarea operativa...')}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}
                />
                <button
                  type="submit"
                  disabled={!nuevaTareaChecklist.trim()}
                  style={{
                    backgroundColor: nuevaTareaChecklist.trim() ? '#10b981' : 'var(--card-header-bg)',
                    color: nuevaTareaChecklist.trim() ? '#ffffff' : 'var(--muted-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: nuevaTareaChecklist.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={16} />
                  {t('views.staff.addChecklistBtn', 'Añadir')}
                </button>
              </form>

              {/* Lista de tareas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {checklist.length === 0 ? (
                  <div style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px dashed var(--subborder-color)',
                    borderRadius: '10px',
                    color: 'var(--muted-text)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckSquare size={24} style={{ opacity: 0.4 }} />
                    <span>{t('views.staff.emptyChecklist', 'No hay tareas en el checklist. Añade tareas operativas según las necesidades de tu comité.')}</span>
                  </div>
                ) : (
                  checklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleCheckItem(item.id)}
                      style={{
                        backgroundColor: item.done ? 'rgba(16, 185, 129, 0.08)' : 'var(--card-header-bg)',
                        border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.3)' : 'var(--subborder-color)'}`,
                        borderRadius: '10px',
                        padding: '0.75rem 0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                        {item.done ? (
                          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={18} color="var(--muted-text)" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: item.done ? '600' : '700',
                          color: item.done ? 'var(--muted-text)' : 'var(--text-color)',
                          textDecoration: item.done ? 'line-through' : 'none',
                          wordBreak: 'break-word'
                        }}>
                          {item.text}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCheckItem(item.id, e)}
                        title="Eliminar tarea"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-text)',
                          cursor: 'pointer',
                          padding: '0.3rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.7,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.opacity = '0.7'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffView;
