import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  X,
  Send,
  AlertCircle,
  AlertTriangle,
  Info,
  Globe,
  Shield,
  Users,
  Landmark,
  Radio,
  CheckCircle2,
  Trash2,
  Filter,
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

const AvisosModal = ({
  isOpen,
  onClose,
  isLight,
  currentRole = 'chair',
  currentComiteId = null,
  currentComiteNombre = null,
  conferenciaId = null,
  comites = [],
  onAvisoCreado
}) => {
  const { t } = useTranslation();

  // Estados de navegación interna
  const [activeTab, setActiveTab] = useState('EMITIR'); // 'EMITIR' | 'BUZON' | 'TODOS'
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS'); // 'TODAS' | 'urgente' | 'alerta' | 'info'

  // Conferencia activa
  const [confActiva, setConfActiva] = useState(() => {
    if (conferenciaId) return { id: conferenciaId };
    return conferenceService.obtenerSesionActiva() || null;
  });

  // Lista de comités activa
  const [listaComites, setListaComites] = useState(comites || []);

  // Formulario de emisión
  const [emisor, setEmisor] = useState('');
  const [destino, setDestino] = useState('GLOBAL');
  const [tipo, setTipo] = useState('info');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Avisos de la conferencia
  const [avisos, setAvisos] = useState([]);
  const [cargandoAvisos, setCargandoAvisos] = useState(false);
  const [descartadosLocales, setDescartadosLocales] = useState(() => {
    try {
      const saved = sessionStorage.getItem('openmun_descartados_avisos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Determinar nombre por defecto del emisor según el rol
  const getEmisorDefecto = useCallback(() => {
    const nombreSala = currentComiteNombre || (listaComites.find(c => String(c.id).toLowerCase() === String(currentComiteId).toLowerCase())?.nombre) || currentComiteId;

    if (currentRole === 'secretaria' || currentRole === 'organizacion' || currentRole === 'admin') {
      return 'Organización / Secretaría';
    }
    if (currentRole === 'staff_global') {
      return 'Staff General';
    }
    if (currentRole === 'staff') {
      return nombreSala ? `Staff (${nombreSala})` : 'Staff de Sala';
    }
    if (currentRole === 'chair' || currentRole === 'mesa') {
      return nombreSala ? `Mesa de ${nombreSala}` : 'Mesa Directiva';
    }
    return 'Mesa Directiva';
  }, [currentRole, currentComiteNombre, currentComiteId, listaComites]);

  // Inicializar emisor y destino por defecto al abrir
  useEffect(() => {
    if (isOpen) {
      setEmisor(getEmisorDefecto());
      setFeedback(null);
      setMensaje('');
      setTitulo('');

      // Destino por defecto inteligente según rol
      if (currentRole === 'chair' || currentRole === 'mesa') {
        if (currentComiteId) {
          setDestino(`STAFF_COMITE_${currentComiteId}`);
        } else {
          setDestino('SECRETARIA');
        }
      } else if (currentRole === 'staff') {
        if (currentComiteId) {
          setDestino(`CHAIR_${currentComiteId}`);
        } else {
          setDestino('STAFF_ALL');
        }
      } else {
        setDestino('GLOBAL');
      }
    }
  }, [isOpen, currentRole, currentComiteId, getEmisorDefecto]);

  // Cargar comités si no vienen por props
  useEffect(() => {
    if (!isOpen) return;
    const sesion = conferenciaId ? { id: conferenciaId } : conferenceService.obtenerSesionActiva();
    if (sesion?.id) {
      setConfActiva(sesion);
      if (!comites || comites.length === 0) {
        conferenceService.obtenerResumen(sesion.id).then(res => {
          if (res?.comites && Array.isArray(res.comites)) {
            setListaComites(res.comites);
          }
        }).catch(() => {});
      } else {
        setListaComites(comites);
      }
    }
  }, [isOpen, conferenciaId, comites]);

  // Cargar avisos desde el servidor
  const fetchAvisos = useCallback(async () => {
    const targetConfId = confActiva?.id || conferenciaId;
    if (!targetConfId) return;

    setCargandoAvisos(true);
    try {
      const res = await conferenceService.obtenerAvisos(targetConfId, currentComiteId, currentRole);
      if (res && Array.isArray(res.avisos)) {
        setAvisos(res.avisos);
      }
    } catch (e) {
      console.debug('Error al obtener avisos:', e);
    } finally {
      setCargandoAvisos(false);
    }
  }, [confActiva?.id, conferenciaId, currentComiteId, currentRole]);

  useEffect(() => {
    if (isOpen) {
      fetchAvisos();
    }
  }, [isOpen, fetchAvisos]);

  // Escuchar avisos en tiempo real mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleNuevoAviso = (e) => {
      if (e.detail) {
        setAvisos(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
      }
    };

    const handleAvisoDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisos(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };

    window.addEventListener('openmun_nuevo_aviso', handleNuevoAviso);
    window.addEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);

    return () => {
      window.removeEventListener('openmun_nuevo_aviso', handleNuevoAviso);
      window.removeEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Generar opciones de destino
  const { opcionesGenerales, opcionesLocales, gruposMesas, gruposStaff, gruposSalas } = obtenerOpcionesDestino(
    listaComites,
    currentRole,
    currentComiteId
  );

  // Manejar envío de aviso
  const handleEnviarAviso = async (e) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    const targetConfId = confActiva?.id || conferenciaId;
    if (!targetConfId) {
      setFeedback({ type: 'error', text: 'No hay conferencia activa vinculada para enviar el aviso.' });
      return;
    }

    setEnviando(true);
    setFeedback(null);

    try {
      const textoFinal = titulo.trim()
        ? `${titulo.trim()}: ${mensaje.trim()}`
        : mensaje.trim();

      const res = await conferenceService.crearAviso(targetConfId, {
        comite_id: destino === 'GLOBAL' ? '' : destino,
        emisor: emisor.trim() || getEmisorDefecto(),
        tipo,
        mensaje: textoFinal
      });

      if (res) {
        setFeedback({ type: 'success', text: '¡Aviso emitido y transmitido con éxito!' });
        setMensaje('');
        setTitulo('');
        fetchAvisos();
        onAvisoCreado?.(res.aviso || res);

        // Cambiar automáticamente a la pestaña de buzón tras 1 segundo si fue exitoso
        setTimeout(() => {
          setActiveTab('BUZON');
          setFeedback(null);
        }, 1200);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Error al emitir aviso: ${err.message || 'Error de conexión'}` });
    } finally {
      setEnviando(false);
    }
  };

  // Descartar aviso localmente
  const handleDescartarLocal = (avisoId) => {
    const nuevos = [...descartadosLocales, avisoId];
    setDescartadosLocales(nuevos);
    try {
      sessionStorage.setItem('openmun_descartados_avisos', JSON.stringify(nuevos));
    } catch {}
  };

  // Retirar aviso de base de datos
  const handleRetirarAvisoBD = async (avisoId) => {
    if (!window.confirm('¿Seguro que deseas retirar este aviso de la conferencia? Desaparecerá para todos los usuarios.')) return;
    try {
      await conferenceService.desactivarAviso(avisoId, confActiva?.id);
      setAvisos(prev => prev.filter(a => a.id !== avisoId));
    } catch (err) {
      alert('Error al retirar aviso: ' + err.message);
    }
  };

  // Avisos correspondientes al rol y sala actual
  const avisosParaMi = avisos.filter(av => {
    if (descartadosLocales.includes(av.id)) return false;
    return correspondeAviso(av, { role: currentRole, currentComiteId });
  });

  // Avisos globales de toda la conferencia
  const avisosGlobales = avisos.filter(av => {
    if (descartadosLocales.includes(av.id)) return false;
    const cid = av.comite_id ? String(av.comite_id).trim().toUpperCase() : '';
    return !cid || cid === 'GLOBAL' || cid === 'ALL' || cid === 'TODOS';
  });

  const esAdmin = currentRole === 'secretaria' || currentRole === 'organizacion' || currentRole === 'admin';

  // Filtrado según pestaña y selector de prioridad
  const getAvisosMostrados = () => {
    let base = avisosParaMi;
    if (activeTab === 'TODOS' && esAdmin) {
      base = avisos;
    } else if (activeTab === 'GLOBALES') {
      base = avisosGlobales;
    } else {
      base = avisosParaMi;
    }

    if (filtroPrioridad !== 'TODAS') {
      base = base.filter(a => a.tipo === filtroPrioridad);
    }
    return base;
  };

  const avisosMostrados = getAvisosMostrados();

  // Estilos temáticos
  const overlayBg = 'rgba(0, 0, 0, 0.75)';
  const modalBg = isLight ? '#ffffff' : 'var(--panel-color, #131722)';
  const borderCol = isLight ? '#e2e8f0' : 'var(--border-color, #2d3748)';
  const subBorderCol = isLight ? '#cbd5e1' : 'var(--subborder-color, #374151)';
  const headerBg = isLight ? '#f8fafc' : 'var(--card-header-bg, #1a202c)';
  const textCol = isLight ? '#0f172a' : 'var(--text-color, #f8fafc)';
  const textMuted = isLight ? '#64748b' : 'var(--muted-text, #94a3b8)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: overlayBg,
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: modalBg,
          border: `1px solid ${borderCol}`,
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            backgroundColor: headerBg,
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Megaphone size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: '800', color: textCol }}>
                Centro de Avisos & Comunicados
              </h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: textMuted }}>
                Emisión y recepción bidireccional entre Mesas, Staff y Organización
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: textMuted,
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${subBorderCol}`,
            backgroundColor: headerBg,
            padding: '0.25rem 1rem 0 1rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveTab('EMITIR')}
              style={{
                padding: '0.65rem 1rem',
                border: 'none',
                borderBottom: activeTab === 'EMITIR' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'EMITIR' ? '#3b82f6' : textMuted,
                fontWeight: activeTab === 'EMITIR' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Send size={15} /> Emitir Aviso
            </button>

            <button
              onClick={() => setActiveTab('BUZON')}
              style={{
                padding: '0.65rem 1rem',
                border: 'none',
                borderBottom: activeTab === 'BUZON' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'BUZON' ? '#3b82f6' : textMuted,
                fontWeight: activeTab === 'BUZON' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Radio size={15} /> Recibidos para Mí
              {avisosParaMi.length > 0 && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: '800'
                }}>
                  {avisosParaMi.length}
                </span>
              )}
            </button>

            {esAdmin && (
              <button
                onClick={() => setActiveTab('TODOS')}
                style={{
                  padding: '0.65rem 1rem',
                  border: 'none',
                  borderBottom: activeTab === 'TODOS' ? '3px solid #3b82f6' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeTab === 'TODOS' ? '#3b82f6' : textMuted,
                  fontWeight: activeTab === 'TODOS' ? '800' : '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Globe size={15} /> Todos los Avisos ({avisos.length})
              </button>
            )}
          </div>

          {(activeTab === 'BUZON' || (activeTab === 'TODOS' && esAdmin)) && (
            <button
              onClick={fetchAvisos}
              disabled={cargandoAvisos}
              style={{
                background: 'transparent',
                border: `1px solid ${subBorderCol}`,
                color: textCol,
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.3rem'
              }}
            >
              <Radio size={12} className={cargandoAvisos ? 'animate-spin' : ''} /> {cargandoAvisos ? 'Cargando...' : 'Refrescar'}
            </button>
          )}
        </div>

        {/* Contenido del Modal */}
        <div style={{ padding: '1.4rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Feedback Message */}
          {feedback && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: feedback.type === 'success'
                ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)')
                : (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)'),
              color: feedback.type === 'success' ? '#16a34a' : '#ef4444',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* PESTAÑA 1: FORMULARIO DE EMISIÓN */}
          {activeTab === 'EMITIR' && (
            <form onSubmit={handleEnviarAviso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Emisor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                    Remitente / Emisor
                  </label>
                  <input
                    type="text"
                    value={emisor}
                    onChange={(e) => setEmisor(e.target.value)}
                    placeholder="Ej. Mesa de DISEC, Staff General, etc."
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: textCol,
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                {/* Destinatario */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                    Destinatario
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: textCol,
                      fontSize: '0.85rem'
                    }}
                  >
                    {/* Generales */}
                    <optgroup label="🌐 Canales Generales">
                      {opcionesGenerales.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </optgroup>

                    {/* Locales rápidos */}
                    {opcionesLocales.length > 0 && (
                      <optgroup label="📍 Mi Sala Actual">
                        {opcionesLocales.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </optgroup>
                    )}

                    {/* Mesas Directivas */}
                    {gruposMesas.length > 0 && (
                      <optgroup label="🏛️ Mesas Directivas (Chairs)">
                        {gruposMesas.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </optgroup>
                    )}

                    {/* Staff de Salas */}
                    {gruposStaff.length > 0 && (
                      <optgroup label="👥 Staff de Salas Específicas">
                        {gruposStaff.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </optgroup>
                    )}

                    {/* Salas Completas */}
                    {gruposSalas.length > 0 && (
                      <optgroup label="🌐 Comités Completos (Sala + Delegaciones)">
                        {gruposSalas.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Selector de Prioridad */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                  Nivel de Urgencia / Prioridad
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {[
                    { id: 'info', label: 'Informativo', desc: 'Avisos ordinarios', color: '#3b82f6', icon: Info },
                    { id: 'alerta', label: 'Alerta / Logística', desc: 'Peticiones y apoyo', color: '#f59e0b', icon: AlertTriangle },
                    { id: 'urgente', label: 'Urgente / Crisis', desc: 'Atención inmediata', color: '#ef4444', icon: AlertCircle }
                  ].map(p => {
                    const isSelected = tipo === p.id;
                    const IconComp = p.icon;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setTipo(p.id)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${p.color}` : `1px solid ${borderCol}`,
                          backgroundColor: isSelected ? (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)') : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComp size={16} color={p.color} style={{ flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: isSelected ? p.color : textCol }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: textMuted, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {p.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Título opcional */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                  Título del Aviso <span style={{ fontWeight: '400', opacity: 0.8 }}>(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Recordatorio de Horario, Solicitud de Paje, etc."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: textCol,
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Mensaje */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
                  Mensaje del Comunicado
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe el texto del aviso oficial..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: textCol,
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={enviando || !mensaje.trim()}
                style={{
                  padding: '0.8rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  cursor: enviando || !mensaje.trim() ? 'not-allowed' : 'pointer',
                  opacity: enviando || !mensaje.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={16} /> {enviando ? 'Transmitiendo aviso...' : 'Emitir Aviso Oficial'}
              </button>
            </form>
          )}

          {/* PESTAÑAS 2 Y 3: BUZÓN DE AVISOS Y HISTORIAL */}
          {(activeTab === 'BUZON' || activeTab === 'TODOS') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Filtro de prioridad */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: textMuted }}>
                  <Filter size={14} /> Filtrar prioridad:
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['TODAS', 'urgente', 'alerta', 'info'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFiltroPrioridad(p)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: filtroPrioridad === p ? '1px solid #3b82f6' : `1px solid ${borderCol}`,
                        backgroundColor: filtroPrioridad === p ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: filtroPrioridad === p ? '#3b82f6' : textMuted,
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {p === 'TODAS' ? 'Todas' : p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Avisos */}
              {avisosMostrados.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: textMuted,
                  border: `1px dashed ${subBorderCol}`,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <Megaphone size={36} style={{ opacity: 0.3 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: textCol }}>
                    {activeTab === 'BUZON'
                      ? 'No hay avisos pendientes dirigidos a tu sala o rol.'
                      : 'No hay avisos registrados en este momento.'}
                  </div>
                  <div style={{ fontSize: '0.76rem' }}>
                    Los comunicados emitidos aparecerán aquí automáticamente en tiempo real.
                  </div>
                </div>
              ) : (
                avisosMostrados.map(av => {
                  const metaDestino = obtenerEtiquetaDestino(av.comite_id, listaComites);
                  const isUrgente = av.tipo === 'urgente';
                  const isAlerta = av.tipo === 'alerta';
                  const IconPrioridad = isUrgente ? AlertCircle : (isAlerta ? AlertTriangle : Info);
                  const colorPrioridad = isUrgente ? '#ef4444' : (isAlerta ? '#f59e0b' : '#3b82f6');

                  return (
                    <div
                      key={`av_${av.id}`}
                      style={{
                        backgroundColor: headerBg,
                        border: `1px solid ${isUrgente ? 'rgba(239, 68, 68, 0.4)' : borderCol}`,
                        borderLeft: `4px solid ${colorPrioridad}`,
                        borderRadius: '12px',
                        padding: '1rem 1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        position: 'relative'
                      }}
                    >
                      {/* Cabecera del aviso */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            backgroundColor: metaDestino.badgeBg,
                            color: metaDestino.badgeColor,
                            border: `1px solid ${metaDestino.badgeBorder}`,
                            padding: '0.12rem 0.5rem',
                            borderRadius: '6px'
                          }}>
                            Para: {metaDestino.shortLabel}
                          </span>

                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            backgroundColor: isUrgente ? 'rgba(239, 68, 68, 0.2)' : (isAlerta ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                            color: colorPrioridad,
                            border: `1px solid ${colorPrioridad}44`,
                            padding: '0.12rem 0.5rem',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {av.emisor || 'Aviso Oficial'}
                          </span>

                          {av.creado_en && (
                            <span style={{ fontSize: '0.7rem', color: textMuted }}>
                              • {new Date(av.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleDescartarLocal(av.id)}
                            title="Ocultar de mi vista"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: textMuted,
                              cursor: 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              fontWeight: '600'
                            }}
                          >
                            <EyeOff size={14} /> Descartar
                          </button>

                          {(currentRole === 'secretaria' || currentRole === 'organizacion' || currentRole === 'admin' || currentRole === 'staff_global') && (
                            <button
                              onClick={() => handleRetirarAvisoBD(av.id)}
                              title="Retirar aviso para toda la conferencia"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                fontWeight: '700'
                              }}
                            >
                              <Trash2 size={14} /> Retirar BD
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Texto del aviso */}
                      <div style={{ fontSize: '0.88rem', color: textCol, lineHeight: '1.45', wordBreak: 'break-word' }}>
                        {formatearMensajeAviso(av.mensaje, null, listaComites)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvisosModal;
