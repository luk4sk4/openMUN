import i18n from '../../languages/index.js';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe,
  Send,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  Users,
  Landmark,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  RefreshCw,
  Bell,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import conferenceService from '../../services/conferenceService';
import {
  obtenerOpcionesDestino,
  obtenerEtiquetaDestino,
  formatearMensajeAviso,
  correspondeAviso,
  obtenerAvisosIgnorados,
  ignorarAviso,
  restaurarAvisoIgnorado,
  puedeBorrarAviso
} from '../../utils/announcementHelpers';
import { playChimeAlert } from '../../utils/audioAlerts';

/**
 * Metadata visual para tipos de avisos de conferencia
 */
export const AVISO_TIPOS_CONFIG = {
  info: {
    id: 'info',
    get label() { return i18n.t('ui.generalInformation'); },
    get shortLabel() { return i18n.t('ui.info2'); },
    icon: Info,
    color: 'var(--accent-color)',
    border: 'var(--accent-color)',
    bg: 'var(--accent-soft)',
    get badgeText() { return i18n.t('ui.information2'); }
  },
  alerta: {
    id: 'alerta',
    get label() { return i18n.t('ui.alertAttention'); },
    get shortLabel() { return i18n.t('ui.alert'); },
    icon: AlertTriangle,
    color: 'var(--warning-color)',
    border: 'var(--warning-color)',
    bg: 'rgba(245, 158, 11, 0.12)',
    get badgeText() { return i18n.t('ui.alert2'); }
  },
  urgente: {
    id: 'urgente',
    get label() { return i18n.t('ui.urgentCritical'); },
    get shortLabel() { return i18n.t('ui.urgent4'); },
    icon: AlertCircle,
    color: 'var(--danger-color)',
    border: 'var(--danger-color)',
    bg: 'rgba(239, 68, 68, 0.12)',
    get badgeText() { return i18n.t('ui.urgent5'); }
  },
  logistica: {
    id: 'logistica',
    get label() { return i18n.t('ui.conferenceLogistics'); },
    get shortLabel() { return i18n.t('ui.logistics3'); },
    icon: Users,
    color: 'var(--info-color)',
    border: 'var(--info-color)',
    bg: 'rgba(56, 189, 248, 0.12)',
    get badgeText() { return i18n.t('ui.logistics4'); }
  }
};

const MensajeriaConferencia = ({
  currentRole: propRole = 'chair',
  conferenciaId: propConfId,
  currentComiteId: propComiteId,
  currentComiteNombre: propComiteNombre,
  comites: propComites = [],
  initialAvisos: propInitialAvisos = [],
  layout = 'auto', // 'auto' | 'split' | 'tabs'
  readOnly = false,
  showHeader = true,
  maxHeight = 'auto',
  onAvisoEmitido
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();

  // Conferencia ID activa
  const cleanConfId = useMemo(() => {
    if (propConfId) return String(propConfId).trim().toLowerCase();
    const active = conferenceService.obtenerSesionActiva();
    if (active?.id) return String(active.id).trim().toLowerCase();
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('openmun_current_conf_id');
      if (local) return String(local).trim().toLowerCase();
    }
    return null;
  }, [propConfId]);

  // Comité ID y Nombre actual
  const effectiveComiteId = useMemo(() => {
    if (propComiteId) return propComiteId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openmun_current_comite_id') || localStorage.getItem('openmun_last_room_id') || null;
    }
    return null;
  }, [propComiteId]);

  const effectiveComiteNombre = useMemo(() => {
    if (propComiteNombre) return propComiteNombre;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openmun_current_comite_nombre') || localStorage.getItem('openmun_p2p_room_name') || null;
    }
    return null;
  }, [propComiteNombre]);

  // Lista de comités de la conferencia
  const [listaComites, setListaComites] = useState(propComites || []);

  // Cargar lista de comités si no fue pasada por props
  useEffect(() => {
    if (propComites && propComites.length > 0) {
      setListaComites(propComites);
      return;
    }
    if (cleanConfId) {
      conferenceService.obtenerResumen(cleanConfId).then(res => {
        if (Array.isArray(res?.comites)) {
          setListaComites(res.comites);
        }
      }).catch(() => {});
    }
  }, [cleanConfId, propComites]);

  // Lista de avisos obtenidos: inicializada desde props o caché en memoria compartida
  const [avisos, setAvisos] = useState(() => {
    if (Array.isArray(propInitialAvisos) && propInitialAvisos.length > 0) {
      return propInitialAvisos;
    }
    if (conferenceService.obtenerAvisosEnMemoria) {
      return conferenceService.obtenerAvisosEnMemoria();
    }
    return [];
  });

  // Sincronizar si llegan avisos iniciales desde el padre
  useEffect(() => {
    if (Array.isArray(propInitialAvisos) && propInitialAvisos.length > 0) {
      setAvisos(prev => {
        const map = new Map();
        propInitialAvisos.forEach(a => { if (a?.id) map.set(String(a.id), a); });
        prev.forEach(a => { if (a?.id && !map.has(String(a.id))) map.set(String(a.id), a); });
        return Array.from(map.values());
      });
    }
  }, [propInitialAvisos]);

  const [cargando, setCargando] = useState(false);
  const [descartadosLocales, setDescartadosLocales] = useState(() => obtenerAvisosIgnorados());
  const [mostrarIgnorados, setMostrarIgnorados] = useState(false);

  // Estados del Redactor de Comunicados
  const [tabMovil, setTabMovil] = useState('TABLON'); // 'TABLON' | 'EMITIR'
  const [emisor, setEmisor] = useState('');
  const [destino, setDestino] = useState('GLOBAL');
  const [tipo, setTipo] = useState('info');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filtros del Tablón
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS'); // 'TODAS' | 'urgente' | 'alerta' | 'info' | 'logistica'
  const [filtroDestino, setFiltroDestino] = useState('TODOS'); // 'TODOS' | 'MI_SALA' | 'STAFF' | 'SECRETARIA'
  const [busqueda, setBusqueda] = useState('');

  // Emisor por defecto según rol
  const getEmisorDefecto = useCallback(() => {
    const nombreSala = effectiveComiteNombre || (listaComites.find(c => String(c.id).toLowerCase() === String(effectiveComiteId).toLowerCase())?.nombre) || effectiveComiteId;

    if (propRole === 'secretaria' || propRole === 'secretariat' || propRole === 'organizacion' || propRole === 'admin') {
      return 'Organización / Secretaría General';
    }
    if (propRole === 'staff_global') {
      return 'Staff General';
    }
    if (propRole === 'staff') {
      return nombreSala ? `Staff (${nombreSala})` : 'Staff de Sala';
    }
    if (propRole === 'chair' || propRole === 'mesa') {
      return nombreSala ? t('ui.chair3', { v0: nombreSala }) : 'Mesa Directiva';
    }
    return 'Delegación';
  }, [propRole, effectiveComiteNombre, effectiveComiteId, listaComites, t]);

  useEffect(() => {
    setEmisor(getEmisorDefecto());
  }, [getEmisorDefecto]);

  // Cargar avisos desde el servicio
  const fetchAvisos = useCallback(async (silencioso = false) => {
    const targetConfId = cleanConfId || conferenceService.obtenerSesionActiva()?.id;
    if (!targetConfId) {
      if (conferenceService.obtenerAvisosEnMemoria) {
        const enMem = conferenceService.obtenerAvisosEnMemoria();
        if (enMem.length > 0) setAvisos(enMem);
      }
      return;
    }
    if (!silencioso) setCargando(true);
    try {
      const res = await conferenceService.obtenerAvisos(
        targetConfId,
        effectiveComiteId,
        propRole,
        effectiveComiteNombre
      );
      const items = Array.isArray(res) ? res : (res && Array.isArray(res.avisos) ? res.avisos : []);
      if (items.length > 0) {
        setAvisos(items);
        conferenceService.guardarAvisosEnMemoria?.(items);
      }
    } catch (e) {
      console.warn('Error cargando avisos de conferencia:', e);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [cleanConfId, effectiveComiteId, propRole, effectiveComiteNombre]);

  // Polling e integración en tiempo real
  useEffect(() => {
    fetchAvisos();

    const interval = setInterval(() => {
      fetchAvisos(true);
    }, 12000);

    const handleNuevoAviso = (e) => {
      if (e.detail) {
        setAvisos(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
        conferenceService.guardarAvisosEnMemoria?.([e.detail]);
      }
    };

    const handleAvisoDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisos(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };

    const handleAvisoIgnorado = (e) => {
      if (e.detail?.id) {
        setDescartadosLocales(prev => [...new Set([...prev, String(e.detail.id)])]);
      }
    };

    const handleAvisoRestaurado = (e) => {
      if (e.detail?.id) {
        setDescartadosLocales(prev => prev.filter(id => String(id) !== String(e.detail.id)));
      }
    };

    window.addEventListener('openmun_nuevo_aviso', handleNuevoAviso);
    window.addEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
    window.addEventListener('openmun_aviso_ignorado', handleAvisoIgnorado);
    window.addEventListener('openmun_aviso_restaurado', handleAvisoRestaurado);

    return () => {
      clearInterval(interval);
      window.removeEventListener('openmun_nuevo_aviso', handleNuevoAviso);
      window.removeEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
      window.removeEventListener('openmun_aviso_ignorado', handleAvisoIgnorado);
      window.removeEventListener('openmun_aviso_restaurado', handleAvisoRestaurado);
    };
  }, [fetchAvisos]);

  // Opciones de destino agrupadas para el selector
  const opcionesDestino = useMemo(() => {
    return obtenerOpcionesDestino(listaComites, propRole, effectiveComiteId);
  }, [listaComites, propRole, effectiveComiteId]);

  // Filtrado de avisos
  const avisosFiltrados = useMemo(() => {
    return avisos.filter(av => {
      if (!av) return false;
      const estaIgnorado = descartadosLocales.map(String).includes(String(av.id));

      if (mostrarIgnorados) {
        if (!estaIgnorado) return false;
      } else {
        if (estaIgnorado) return false;
      }

      // 1. Rol checking: Si el usuario no es de la organización central, aplicar filtro de correspondencia de roles y salas
      if (!['secretaria', 'organizacion', 'admin'].includes(propRole)) {
        if (!correspondeAviso(av, {
          role: propRole,
          currentComiteId: effectiveComiteId,
          currentComiteNombre: effectiveComiteNombre,
          comites: listaComites
        })) {
          return false;
        }
      }

      // 2. Filtro Prioridad
      if (filtroPrioridad !== 'TODAS' && (av.tipo || 'info') !== filtroPrioridad) {
        return false;
      }

      // 3. Filtro Destino
      if (filtroDestino === 'MI_SALA' && effectiveComiteId) {
        const dest = String(av.comite_id || '').toUpperCase();
        const matchesLocal =
          dest === String(effectiveComiteId).toUpperCase() ||
          dest === `CHAIR_${String(effectiveComiteId).toUpperCase()}` ||
          dest === `STAFF_COMITE_${String(effectiveComiteId).toUpperCase()}`;
        if (!matchesLocal) return false;
      } else if (filtroDestino === 'SOLO_STAFF') {
        const dest = String(av.comite_id || '').toUpperCase();
        if (!dest.includes('STAFF')) return false;
      } else if (filtroDestino === 'SECRETARIA') {
        const dest = String(av.comite_id || '').toUpperCase();
        if (dest !== 'SECRETARIA' && dest !== 'ORGANIZACION') return false;
      }

      // 4. Filtro Búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchMsg = (av.mensaje || '').toLowerCase().includes(q);
        const matchEmisor = (av.emisor || '').toLowerCase().includes(q);
        if (!matchMsg && !matchEmisor) return false;
      }

      return true;
    });
  }, [avisos, descartadosLocales, mostrarIgnorados, filtroPrioridad, filtroDestino, busqueda, effectiveComiteId, propRole, effectiveComiteNombre, listaComites]);

  // Manejador de emisión de aviso
  const handleEmitirAviso = async (e) => {
    if (e) e.preventDefault();
    if (!mensaje.trim() || enviando || !cleanConfId) return;

    setEnviando(true);
    setFeedback(null);

    try {
      let targetComite = destino === 'GLOBAL' ? null : destino;

      const resAviso = await conferenceService.crearAviso(cleanConfId, {
        comite_id: targetComite,
        emisor: emisor.trim() || 'Organización',
        tipo,
        mensaje: mensaje.trim()
      });

      const nuevoAviso = resAviso?.aviso || resAviso;

      if (nuevoAviso) {
        try { playChimeAlert(0.4); } catch {}
        setMensaje('');
        setFeedback(t('ui.announcementSuccessfullyIssuedAndRecordedInTheConference'));
        setTimeout(() => setFeedback(null), 3000);

        // Actualizar lista local de inmediato
        setAvisos(prev => [nuevoAviso, ...prev.filter(a => a.id !== nuevoAviso.id)]);

        if (typeof onAvisoEmitido === 'function') {
          onAvisoEmitido(nuevoAviso);
        }

        if (layout === 'tabs') {
          setTabMovil('TABLON');
        }
      }
    } catch (err) {
      alert(t('ui.errorIssuingConferenceAnnouncement') + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Ignorar aviso (solo para la vista personal del usuario)
  const handleIgnorarAviso = (avisoId) => {
    ignorarAviso(avisoId);
    setDescartadosLocales(prev => [...new Set([...prev, String(avisoId)])]);
  };

  // Restaurar aviso ignorado para volver a verlo
  const handleRestaurarAviso = (avisoId) => {
    restaurarAvisoIgnorado(avisoId);
    setDescartadosLocales(prev => prev.filter(id => String(id) !== String(avisoId)));
  };

  // Borrar aviso para toda la conferencia (solo emisor o secretaría/admin)
  const handleBorrarAviso = async (avisoId) => {
    const confirmacion = await confirm({
      title: t('avisos.deleteNoticeTitle', 'Borrar aviso'),
      message: t('avisos.deleteNoticeConfirm', '¿Seguro que deseas borrar este aviso para toda la conferencia?'),
      confirmText: t('common.delete', 'Eliminar'),
      cancelText: t('common.cancel', 'Cancelar'),
      type: 'danger'
    });
    if (!confirmacion) return;

    try {
      await conferenceService.desactivarAviso(avisoId, cleanConfId);
      setAvisos(prev => prev.filter(a => String(a.id) !== String(avisoId)));
    } catch (err) {
      confirm.alert(t('common.error', 'Error al borrar aviso: ') + err.message);
    }
  };

  const puedeEmitir = !readOnly && ['chair', 'secretaria', 'secretariat', 'staff', 'staff_global', 'admin', 'organizacion'].includes(propRole);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      maxHeight: maxHeight,
      boxSizing: 'border-box'
    }}>
      {/* Cabecera opcional */}
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid var(--subborder-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--border-radius, 6px)',
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-color)'
            }}>
              <Globe size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('messaging.conferenceTitle', 'Avisos & Comunicados de Conferencia')}
                </h3>
                {cleanConfId && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '100px',
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)'
                  }}>
                    {cleanConfId.toUpperCase()}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                {t('ui.centralChannelForTheSecretariatOperationalAlertsAndCommunicationsBetween')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => fetchAvisos(false)}
              disabled={cargando}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: 'var(--border-radius, 6px)',
                color: 'var(--text-color)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title={t('ui.refreshConferenceAnnouncements')}
            >
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
              {t('avisos.refresh')}
            </button>
          </div>
        </div>
      )}

      {/* Tabs para móviles o vistas compactas */}
      {puedeEmitir && layout === 'tabs' && (
        <div role="tablist" style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            role="tab"
            aria-selected={tabMovil === 'TABLON'}
            onClick={() => setTabMovil('TABLON')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${tabMovil === 'TABLON' ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              backgroundColor: tabMovil === 'TABLON' ? 'var(--accent-soft)' : 'transparent',
              color: tabMovil === 'TABLON' ? 'var(--accent-color)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Bell size={15} /> {t('ui.noticeboard')}{avisosFiltrados.length})
          </button>
          <button
            role="tab"
            aria-selected={tabMovil === 'EMITIR'}
            onClick={() => setTabMovil('EMITIR')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${tabMovil === 'EMITIR' ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              backgroundColor: tabMovil === 'EMITIR' ? 'var(--accent-soft)' : 'transparent',
              color: tabMovil === 'EMITIR' ? 'var(--accent-color)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> {t('ui.issueAnnouncement')}
          </button>
        </div>
      )}

      {/* Grid Principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: !puedeEmitir || layout === 'tabs' ? '1fr' : 'minmax(320px, 400px) 1fr',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* ── COLUMNA 1: FORMULARIO EMISIÓN ── */}
        {puedeEmitir && (layout !== 'tabs' || tabMovil === 'EMITIR') && (
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={17} color="var(--accent-color)" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                {t('ui.issueOfficialAnnouncement')}
              </h4>
            </div>

            <form onSubmit={handleEmitirAviso} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Emisor */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('ui.senderSignatory')}
                </label>
                <input
                  type="text"
                  value={emisor}
                  onChange={e => setEmisor(e.target.value)}
                  placeholder={t('ui.eGOrganizersGeneralStaffCouncilChair')}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.55rem 0.75rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Destinatario */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('ui.mainRecipient')}
                </label>
                <select
                  value={destino}
                  onChange={e => setDestino(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.6rem 0.75rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <optgroup label={t('avisos.generalChannels')} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                    {opcionesDestino.opcionesGenerales.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </optgroup>

                  {opcionesDestino.opcionesLocales?.length > 0 && (
                    <optgroup label={t('ui.myRoomCommittee')} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                      {opcionesDestino.opcionesLocales.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </optgroup>
                  )}

                  {opcionesDestino.gruposSalas?.length > 0 && (
                    <optgroup label={t('ui.conferenceRooms')} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                      {opcionesDestino.gruposSalas.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Prioridad / Tipo */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('ui.priorityCategory')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.4rem',
                  marginTop: '0.35rem'
                }}>
                  {Object.values(AVISO_TIPOS_CONFIG).map(tCfg => {
                    const isSelected = tipo === tCfg.id;
                    const Icon = tCfg.icon;
                    return (
                      <button
                        key={tCfg.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setTipo(tCfg.id)}
                        style={{
                          backgroundColor: isSelected ? tCfg.bg : 'var(--card-header-bg)',
                          border: `1.5px solid ${isSelected ? tCfg.color : 'var(--subborder-color)'}`,
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.5rem 0.4rem',
                          color: isSelected ? tCfg.color : 'var(--muted-text)',
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={14} color={isSelected ? tCfg.color : 'var(--muted-text)'} />
                        <span>{tCfg.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('ui.announcementContent')}
                </label>
                <textarea
                  rows={4}
                  placeholder={t('ui.writeTheDirectiveLogisticalInstructionOrOfficialAnnouncement')}
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.65rem 0.8rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                    lineHeight: '1.4'
                  }}
                />
              </div>

              {/* Botón Emitir */}
              <button
                type="submit"
                disabled={!mensaje.trim() || enviando || !cleanConfId}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.75rem',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: mensaje.trim() && !enviando && cleanConfId ? 'pointer' : 'not-allowed',
                  opacity: mensaje.trim() && !enviando && cleanConfId ? 1 : 0.45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} /> {enviando ? t('ui.transmittingToConference') : t('ui.sendOfficialAnnouncement')}
              </button>

              {!cleanConfId && (
                <div style={{ fontSize: '0.72rem', color: 'var(--warning-color)', textAlign: 'center' }}>
                  {t('ui.noActiveConferenceLinkedStartOrJoinAConferenceTo')}
                </div>
              )}

              {feedback && (
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: 'var(--success-color)',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}>
                  <CheckCircle2 size={14} /> {feedback}
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── COLUMNA 2: TABLÓN DE AVISOS (FEED) ── */}
        {(layout !== 'tabs' || tabMovil === 'TABLON') && (
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {/* Cabecera y Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                    {t('ui.conferenceNoticeboard')}{avisosFiltrados.length})
                  </h4>
                </div>

                {/* Filtro por Destino Rápido */}
                <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--card-header-bg)', padding: '2px', borderRadius: 'var(--border-radius, 6px)' }}>
                  {[
                    { id: 'TODOS', label: t('sidebar.categories.all') },
                    { id: 'MI_SALA', label: t('ui.myRoom') },
                    { id: 'SOLO_STAFF', label: t('conferences.issuerStaff') }
                  ].map(f => {
                    const isSelected = filtroDestino === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFiltroDestino(f.id)}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                          color: isSelected ? 'var(--accent-color)' : 'var(--muted-text)',
                          border: `1px solid ${isSelected ? 'var(--accent-color)' : 'transparent'}`,
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.28rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro por Prioridad y Búsqueda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  flex: 1,
                  minWidth: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0 0.55rem'
                }}>
                  <Search size={13} color="var(--muted-text)" />
                  <input
                    type="text"
                    placeholder={t('ui.searchAnnouncements')}
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-color)',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'TODAS', label: t('avisos.filterAll') },
                    { id: 'urgente', label: t('ui.urgent2') },
                    { id: 'alerta', label: t('ui.alerts') },
                    { id: 'info', label: t('ui.info') },
                    { id: 'logistica', label: t('ui.logistics2') }
                  ].map(tFilter => {
                    const isSelected = filtroPrioridad === tFilter.id;
                    return (
                      <button
                        key={tFilter.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFiltroPrioridad(tFilter.id)}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                          color: isSelected ? 'var(--accent-color)' : 'var(--muted-text)',
                          border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.28rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tFilter.label}
                      </button>
                    );
                  })}

                  {descartadosLocales.length > 0 && (
                    <button
                      type="button"
                      aria-pressed={mostrarIgnorados}
                      onClick={() => setMostrarIgnorados(prev => !prev)}
                      style={{
                        backgroundColor: mostrarIgnorados ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                        color: mostrarIgnorados ? 'var(--danger-color)' : 'var(--muted-text)',
                        border: `1px solid ${mostrarIgnorados ? 'rgba(239, 68, 68, 0.3)' : 'var(--subborder-color)'}`,
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '0.28rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={mostrarIgnorados ? t('ui.backToActiveAnnouncements') : t('ui.viewIgnoredAnnouncements')}
                    >
                      <EyeOff size={11} />
                      {mostrarIgnorados ? t('ui.backToActive') : `Ignorados (${descartadosLocales.length})`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Avisos */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              maxHeight: '480px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {avisosFiltrados.length === 0 ? (
                <div style={{
                  padding: '3.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--card-header-bg)',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px dashed var(--subborder-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Globe size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                    {mostrarIgnorados
                      ? t('ui.youHaveNoIgnoredAnnouncements')
                      : (busqueda ? t('ui.noAnnouncementsMatchTheseCriteria') : t('ui.noActiveConferenceAnnouncements'))}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                    {mostrarIgnorados
                      ? t('ui.announcementsYouIgnoreWillAppearHereIfYouWantTo')
                      : (cleanConfId
                        ? t('ui.announcementsFromTheSecretariatOrGeneralStaffWillAppearHere')
                        : t('ui.connectToAnActiveConferenceToReceiveAnnouncementsFromThe'))}
                  </div>
                </div>
              ) : (
                avisosFiltrados.map(aviso => {
                  const tCfg = AVISO_TIPOS_CONFIG[aviso.tipo] || AVISO_TIPOS_CONFIG.info;
                  const targetInfo = obtenerEtiquetaDestino(aviso.comite_id, listaComites);
                  const IconDest = targetInfo.icon || Globe;
                  const esPropio = puedeBorrarAviso(aviso, propRole);

                  return (
                    <div
                      key={aviso.id}
                      style={{
                        backgroundColor: 'var(--card-header-bg)',
                        border: '1px solid var(--subborder-color)',
                        borderLeft: `3px solid ${tCfg.color}`,
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '0.9rem 1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Cabecera del aviso */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {/* Badge de Prioridad */}
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: tCfg.bg,
                            color: tCfg.color,
                            border: `1px solid ${tCfg.border}`
                          }}>
                            {tCfg.badgeText}
                          </span>

                          {/* Emisor */}
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)' }}>
                            {aviso.emisor || t('conferences.issuerOrg')}
                          </span>

                          {/* Destinatario */}
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: targetInfo.badgeBg,
                            color: targetInfo.badgeColor,
                            border: `1px solid ${targetInfo.badgeBorder}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <IconDest size={11} /> {targetInfo.label}
                          </span>
                        </div>

                        {/* Acciones: Fecha, Borrar (emisor) e Ignorar (todos) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                            {aviso.creado_en || ''}
                          </span>

                          {mostrarIgnorados ? (
                            <button
                              onClick={() => handleRestaurarAviso(aviso.id)}
                              style={{
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--subborder-color)',
                                color: 'var(--accent-color)',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--border-radius, 6px)',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('avisos.restoreNotice', 'Volver a mostrar en mi vista')}
                            >
                              <RotateCcw size={12} /> {t('avisos.restore', 'Restaurar')}
                            </button>
                          ) : (
                            <>
                              {/* Botón Eliminar: solo si lo envió el usuario actual o tiene rol secretaría/admin */}
                              {esPropio && (
                                <button
                                  onClick={() => handleBorrarAviso(aviso.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: 'var(--danger-color)',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: 'var(--border-radius, 6px)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={t('avisos.deleteNoticeTooltip', 'Eliminar aviso para toda la conferencia')}
                                >
                                  <Trash2 size={12} /> {t('avisos.deleteNotice', 'Eliminar')}
                                </button>
                              )}

                              {/* Botón Descartar: disponible para cualquier persona */}
                              <button
                                onClick={() => handleIgnorarAviso(aviso.id)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--subborder-color)',
                                  color: 'var(--muted-text)',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: 'var(--border-radius, 6px)',
                                  transition: 'all 0.15s ease'
                                }}
                                title={t('avisos.dismissTooltip', 'Descartar este aviso (ocultarlo de tu vista)')}
                              >
                                <EyeOff size={12} /> {t('avisos.dismiss', 'Descartar')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cuerpo del mensaje */}
                      <div style={{
                        fontSize: '0.87rem',
                        color: 'var(--text-color)',
                        lineHeight: '1.45',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {formatearMensajeAviso(aviso.mensaje, null, listaComites)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MensajeriaConferencia;
