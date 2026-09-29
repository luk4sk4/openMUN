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
  EyeOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import conferenceService from '../../services/conferenceService';
import {
  obtenerOpcionesDestino,
  obtenerEtiquetaDestino,
  formatearMensajeAviso,
  correspondeAviso
} from '../../utils/announcementHelpers';
import { playChimeAlert } from '../../utils/audioAlerts';

/**
 * Metadata visual para tipos de avisos de conferencia
 */
export const AVISO_TIPOS_CONFIG = {
  info: {
    id: 'info',
    label: 'Informativo General',
    shortLabel: 'Info',
    icon: Info,
    color: '#3b82f6',
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.14)',
    badgeText: 'ℹ️ INFORMATIVO'
  },
  alerta: {
    id: 'alerta',
    label: 'Alerta / Atención',
    shortLabel: 'Alerta',
    icon: AlertTriangle,
    color: '#f59e0b',
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.14)',
    badgeText: '⚠️ ALERTA'
  },
  urgente: {
    id: 'urgente',
    label: 'Urgente / Crítico',
    shortLabel: 'Urgente',
    icon: AlertCircle,
    color: '#ef4444',
    border: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.14)',
    badgeText: '🚨 URGENTE'
  },
  logistica: {
    id: 'logistica',
    label: 'Logística de Conferencia',
    shortLabel: 'Logística',
    icon: Users,
    color: '#8b5cf6',
    border: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.14)',
    badgeText: '🛠️ LOGÍSTICA'
  }
};

const MensajeriaConferencia = ({
  currentRole: propRole = 'chair',
  conferenciaId: propConfId,
  currentComiteId: propComiteId,
  currentComiteNombre: propComiteNombre,
  comites: propComites = [],
  layout = 'auto', // 'auto' | 'split' | 'tabs'
  readOnly = false,
  showHeader = true,
  maxHeight = 'auto',
  onAvisoEmitido
}) => {
  const { t } = useTranslation();

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

  // Lista de avisos obtenidos
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [descartadosLocales, setDescartadosLocales] = useState(() => {
    try {
      const saved = sessionStorage.getItem('openmun_descartados_avisos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
      return nombreSala ? `Mesa Directiva (${nombreSala})` : 'Mesa Directiva';
    }
    return 'Delegación';
  }, [propRole, effectiveComiteNombre, effectiveComiteId, listaComites]);

  useEffect(() => {
    setEmisor(getEmisorDefecto());
  }, [getEmisorDefecto]);

  // Cargar avisos desde el servicio
  const fetchAvisos = useCallback(async (silencioso = false) => {
    if (!cleanConfId) return;
    if (!silencioso) setCargando(true);
    try {
      const res = await conferenceService.obtenerAvisos(
        cleanConfId,
        effectiveComiteId,
        propRole,
        effectiveComiteNombre
      );
      if (Array.isArray(res)) {
        setAvisos(res);
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
      }
    };

    const handleAvisoDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisos(prev => prev.filter(a => a.id !== e.detail.id));
      }
    };

    window.addEventListener('openmun_nuevo_aviso', handleNuevoAviso);
    window.addEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);

    return () => {
      clearInterval(interval);
      window.removeEventListener('openmun_nuevo_aviso', handleNuevoAviso);
      window.removeEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
    };
  }, [fetchAvisos]);

  // Guardar descartados locales en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('openmun_descartados_avisos', JSON.stringify(descartadosLocales));
    } catch {}
  }, [descartadosLocales]);

  // Opciones de destino agrupadas para el selector
  const opcionesDestino = useMemo(() => {
    return obtenerOpcionesDestino(listaComites, propRole, effectiveComiteId);
  }, [listaComites, propRole, effectiveComiteId]);

  // Filtrado de avisos
  const avisosFiltrados = useMemo(() => {
    return avisos.filter(av => {
      if (!av) return false;
      if (descartadosLocales.includes(av.id)) return false;

      // 1. Filtro Prioridad
      if (filtroPrioridad !== 'TODAS' && (av.tipo || 'info') !== filtroPrioridad) {
        return false;
      }

      // 2. Filtro Destino
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

      // 3. Filtro Búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchMsg = (av.mensaje || '').toLowerCase().includes(q);
        const matchEmisor = (av.emisor || '').toLowerCase().includes(q);
        if (!matchMsg && !matchEmisor) return false;
      }

      return true;
    });
  }, [avisos, descartadosLocales, filtroPrioridad, filtroDestino, busqueda, effectiveComiteId]);

  // Manejador de emisión de aviso
  const handleEmitirAviso = async (e) => {
    if (e) e.preventDefault();
    if (!mensaje.trim() || enviando || !cleanConfId) return;

    setEnviando(true);
    setFeedback(null);

    try {
      let targetComite = destino === 'GLOBAL' ? null : destino;

      const nuevoAviso = await conferenceService.crearAviso(cleanConfId, {
        comite_id: targetComite,
        emisor: emisor.trim() || 'Organización',
        tipo,
        mensaje: mensaje.trim()
      });

      if (nuevoAviso) {
        try { playChimeAlert(0.4); } catch {}
        setMensaje('');
        setFeedback('¡Aviso emitido y registrado en la conferencia con éxito!');
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
      alert('Error al emitir comunicado a la conferencia: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Desactivar / Descartar aviso
  const handleDesactivarAviso = async (avisoId) => {
    const isStaffOrAdmin = ['chair', 'secretaria', 'secretariat', 'staff', 'admin', 'organizacion'].includes(propRole);

    if (isStaffOrAdmin) {
      try {
        await conferenceService.desactivarAviso(avisoId, cleanConfId);
        setAvisos(prev => prev.filter(a => a.id !== avisoId));
      } catch (err) {
        console.warn('Error al desactivar en servidor, descartando localmente:', err);
        setDescartadosLocales(prev => [...prev, avisoId]);
      }
    } else {
      setDescartadosLocales(prev => [...prev, avisoId]);
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
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
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
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.35)'
                  }}>
                    {cleanConfId.toUpperCase()}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                Canal central de secretaría general, alertas operativas y difusión inter-comités
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
                borderRadius: '8px',
                color: 'var(--text-color)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Refrescar avisos de la conferencia"
            >
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
              Refrescar
            </button>
          </div>
        </div>
      )}

      {/* Tabs para móviles o vistas compactas */}
      {puedeEmitir && layout === 'tabs' && (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setTabMovil('TABLON')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: tabMovil === 'TABLON' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
              color: tabMovil === 'TABLON' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Bell size={15} /> Tablón ({avisosFiltrados.length})
          </button>
          <button
            onClick={() => setTabMovil('EMITIR')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: tabMovil === 'EMITIR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
              color: tabMovil === 'EMITIR' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> Emitir Comunicado
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
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={17} color="#3b82f6" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                Emitir Comunicado Oficial
              </h4>
            </div>

            <form onSubmit={handleEmitirAviso} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Emisor */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Emisor / Firmante
                </label>
                <input
                  type="text"
                  value={emisor}
                  onChange={e => setEmisor(e.target.value)}
                  placeholder="Ej: Organización, Staff General, Mesa de Consejo..."
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
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
                  Destinatario Central
                </label>
                <select
                  value={destino}
                  onChange={e => setDestino(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <optgroup label="🌐 Canales Generales" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                    {opcionesDestino.opcionesGenerales.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </optgroup>

                  {opcionesDestino.opcionesLocales?.length > 0 && (
                    <optgroup label="📍 Mi Sala / Comité" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                      {opcionesDestino.opcionesLocales.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </optgroup>
                  )}

                  {opcionesDestino.gruposSalas?.length > 0 && (
                    <optgroup label="🏛️ Salas de la Conferencia" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
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
                  Prioridad / Categoría
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
                        onClick={() => setTipo(tCfg.id)}
                        style={{
                          backgroundColor: isSelected ? tCfg.bg : 'var(--card-header-bg)',
                          border: `1.5px solid ${isSelected ? tCfg.color : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
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
                  Contenido del Comunicado
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe la directiva, instrucción logística o comunicado oficial..."
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
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
                  borderRadius: '9px',
                  padding: '0.75rem',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: mensaje.trim() && !enviando && cleanConfId ? 'pointer' : 'not-allowed',
                  opacity: mensaje.trim() && !enviando && cleanConfId ? 1 : 0.45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} /> {enviando ? 'Transmitiendo a Conferencia...' : 'Transmitir Aviso Oficial'}
              </button>

              {!cleanConfId && (
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', textAlign: 'center' }}>
                  ⚠️ No hay conferencia activa vinculada. Inicia o accede a una conferencia para emitir comunicados globales.
                </div>
              )}

              {feedback && (
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#10b981',
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
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Cabecera y Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                    Tablón de Avisos de la Conferencia ({avisosFiltrados.length})
                  </h4>
                </div>

                {/* Filtro por Destino Rápido */}
                <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--card-header-bg)', padding: '2px', borderRadius: '7px' }}>
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'MI_SALA', label: 'Mi Sala' },
                    { id: 'SOLO_STAFF', label: 'Staff' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFiltroDestino(f.id)}
                      style={{
                        backgroundColor: filtroDestino === f.id ? 'var(--btn-bg)' : 'transparent',
                        color: filtroDestino === f.id ? 'var(--btn-text)' : 'var(--muted-text)',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0.28rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Prioridad y Búsqueda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  flex: 1,
                  minWidth: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '7px',
                  padding: '0 0.55rem'
                }}>
                  <Search size={13} color="var(--muted-text)" />
                  <input
                    type="text"
                    placeholder="Buscar en comunicados..."
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
                    { id: 'TODAS', label: 'Todas' },
                    { id: 'urgente', label: '🚨 Urgentes' },
                    { id: 'alerta', label: '⚠️ Alertas' },
                    { id: 'info', label: 'ℹ️ Info' },
                    { id: 'logistica', label: '🛠️ Logística' }
                  ].map(tFilter => (
                    <button
                      key={tFilter.id}
                      onClick={() => setFiltroPrioridad(tFilter.id)}
                      style={{
                        backgroundColor: filtroPrioridad === tFilter.id ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        color: filtroPrioridad === tFilter.id ? '#3b82f6' : 'var(--muted-text)',
                        border: `1px solid ${filtroPrioridad === tFilter.id ? 'rgba(59, 130, 246, 0.35)' : 'var(--subborder-color)'}`,
                        borderRadius: '6px',
                        padding: '0.28rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tFilter.label}
                    </button>
                  ))}
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
                  borderRadius: '12px',
                  border: '1px dashed var(--subborder-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Globe size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                    {busqueda ? 'No se encontraron comunicados con ese criterio' : 'Sin avisos de conferencia activos'}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                    {cleanConfId
                      ? 'Los comunicados emitidos por la secretaría o el staff general aparecerán aquí en vivo.'
                      : 'Conéctate a una conferencia activa para recibir avisos de toda la organización.'}
                  </div>
                </div>
              ) : (
                avisosFiltrados.map(aviso => {
                  const tCfg = AVISO_TIPOS_CONFIG[aviso.tipo] || AVISO_TIPOS_CONFIG.info;
                  const targetInfo = obtenerEtiquetaDestino(aviso.comite_id, listaComites);
                  const IconDest = targetInfo.icon || Globe;

                  return (
                    <div
                      key={aviso.id}
                      style={{
                        backgroundColor: 'var(--card-header-bg)',
                        border: '1px solid var(--subborder-color)',
                        borderLeft: `4px solid ${tCfg.color}`,
                        borderRadius: '11px',
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
                            {aviso.emisor || 'Organización'}
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

                        {/* Fecha y Descartar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                            {aviso.creado_en || ''}
                          </span>
                          <button
                            onClick={() => handleDesactivarAviso(aviso.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              opacity: 0.8
                            }}
                            title="Descartar este aviso"
                          >
                            <Trash2 size={12} /> Descartar
                          </button>
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
