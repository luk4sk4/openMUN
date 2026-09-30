import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Mail,
  Zap,
  Coffee,
  HelpCircle,
  Flame,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Reply,
  Volume2,
  VolumeX,
  Users,
  Building2,
  Shield,
  Clock,
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { getFlagEmoji } from '../../utils/flags';
import { playChimeAlert } from '../../utils/audioAlerts';

/**
 * Metadata y configuración visual para cada categoría de nota
 */
export const NOTE_TYPES_CONFIG = {
  general: {
    id: 'general',
    label: 'General / Mensaje',
    shortLabel: 'General',
    icon: FileText,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
    badgeText: '📄 GENERAL'
  },
  paje: {
    id: 'paje',
    label: 'Mensaje de Paje / Entrega',
    shortLabel: 'Paje',
    icon: Mail,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.14)',
    border: 'rgba(56, 189, 248, 0.35)',
    badgeText: '✉️ PAJE'
  },
  urgente: {
    id: 'urgente',
    label: 'Urgente / Prioritario',
    shortLabel: 'Urgente',
    icon: Zap,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(239, 68, 68, 0.4)',
    badgeText: '🚨 URGENTE'
  },
  logistica: {
    id: 'logistica',
    label: 'Logística / Asistencia',
    shortLabel: 'Logística',
    icon: Coffee,
    color: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.14)',
    border: 'rgba(96, 165, 250, 0.35)',
    badgeText: '🛠️ LOGÍSTICA'
  },
  crisis: {
    id: 'crisis',
    label: 'Crisis / Confidencial',
    shortLabel: 'Crisis',
    icon: Flame,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.14)',
    border: 'rgba(249, 115, 22, 0.4)',
    badgeText: '🛡️ CRISIS'
  },
  pregunta: {
    id: 'pregunta',
    label: 'Duda de Procedimiento',
    shortLabel: 'Procedimiento',
    icon: HelpCircle,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.4)',
    badgeText: '❓ PROCEDIMIENTO'
  }
};

const MensajeriaComite = ({
  currentRole: propRole,
  clientCountry: propCountry,
  paises: propPaises,
  currentComiteId,
  currentComiteNombre,
  layout = 'auto', // 'auto' | 'split' | 'tabs' | 'compact'
  defaultType = null,
  defaultDestination = null,
  showHeader = true,
  maxHeight = 'auto',
  onNoteSent
}) => {
  const { t } = useTranslation();
  const p2p = useP2P();
  const session = useSession();

  // Rol efectivo y país
  const effectiveRole = propRole || p2p.role || 'chair';
  const effectiveCountry = propCountry || p2p.clientCountry || '';
  const settings = p2p.roomSettings || {};

  // Lista de países del comité
  const rawPaises = propPaises || session.paises || p2p.remoteSessionState?.paises || [];
  const listaPaises = useMemo(() => {
    return rawPaises.map(p => {
      if (typeof p === 'string') return { id: p, nombre: p, bandera: null };
      return {
        id: p.id || p.nombre,
        nombre: p.nombre || '',
        bandera: p.bandera || p.flag || null
      };
    }).filter(p => Boolean(p.nombre));
  }, [rawPaises]);

  // Lista de notas desde el contexto P2P
  const notes = p2p.notes || [];
  const sendNote = p2p.sendNote;
  const markNotesAsRead = p2p.markNotesAsRead;

  // Estados del Redactor
  const [destinatario, setDestinatario] = useState(() => {
    if (defaultDestination) return defaultDestination;
    if (effectiveRole === 'delegate') return 'CHAIR';
    if (effectiveRole === 'backroom') return 'TODOS';
    if (effectiveRole === 'staff') return 'CHAIR';
    return 'TODOS';
  });

  const [tipoNota, setTipoNota] = useState(() => {
    if (defaultType && NOTE_TYPES_CONFIG[defaultType]) return defaultType;
    if (effectiveRole === 'staff') return 'paje';
    if (effectiveRole === 'backroom') return 'crisis';
    return 'general';
  });

  const [textoNota, setTextoNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);

  // Estados del Buzón
  const [tabMovil, setTabMovil] = useState('BUZON'); // 'BUZON' | 'REDACTAR' para modo tabs
  const [filtroDireccion, setFiltroDireccion] = useState('TODAS'); // 'TODAS' | 'RECIBIDAS' | 'ENVIADAS'
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); // 'TODOS' | 'URGENTES' | 'PAJES' | 'CRISIS'
  const [busqueda, setBusqueda] = useState('');
  const [feedbackEnvio, setFeedbackEnvio] = useState(null);

  const textareaRef = useRef(null);
  const feedEndRef = useRef(null);

  // Marcar notas como leídas al enfocar o visualizar el buzón
  useEffect(() => {
    if (typeof markNotesAsRead === 'function') {
      markNotesAsRead();
    }
  }, [notes.length, markNotesAsRead]);

  // Filtrado de notas de acuerdo al rol del usuario
  const notasRol = useMemo(() => {
    return notes.filter(n => {
      if (!n || !n.text) return false;

      // Host Chair y Secretaría ven todas las notas del comité
      if (effectiveRole === 'chair' || effectiveRole === 'secretariat') {
        return true;
      }

      // Staff ve notas a STAFF, de staff, o dirigidas/enviadas por la Mesa (pajes), o de tipo paje/logística o dirigidas a TODOS
      if (effectiveRole === 'staff') {
        const dest = (n.to || '').toUpperCase().trim();
        return (
          dest === 'STAFF' ||
          dest === 'CHAIR' ||
          dest === 'MESA' ||
          dest === 'MESA DE PRESIDENCIA' ||
          dest === 'TODOS' ||
          dest === 'ALL' ||
          n.fromRole === 'staff' ||
          n.fromRole === 'chair' ||
          n.from === 'Staff' ||
          n.from === 'Mesa de Presidencia' ||
          n.type === 'logistica' ||
          n.type === 'paje'
        );
      }

      // Backroom ve notas de crisis, o dirigidas/enviadas por backroom
      if (effectiveRole === 'backroom') {
        return (
          n.to?.toUpperCase() === 'BACKROOM' ||
          n.fromRole === 'backroom' ||
          n.from?.toUpperCase() === 'BACKROOM' ||
          n.to?.toUpperCase() === 'TODOS' ||
          n.type === 'crisis' ||
          n.type === 'backroom'
        );
      }

      // Delegado: ve notas donde es emisor, destinatario directo, o emitidas a TODOS
      if (effectiveRole === 'delegate' && effectiveCountry) {
        const cleanUser = effectiveCountry.toLowerCase().trim();
        const cleanTo = (n.to || '').toLowerCase().trim();
        const cleanFrom = (n.from || '').toLowerCase().trim();

        return (
          cleanTo === cleanUser ||
          cleanFrom === cleanUser ||
          n.to?.toUpperCase() === 'TODOS' ||
          n.to?.toUpperCase() === 'ALL'
        );
      }

      return true;
    });
  }, [notes, effectiveRole, effectiveCountry]);

  // Filtrado adicional por dirección, categoría y texto de búsqueda
  const notasFiltradas = useMemo(() => {
    return notasRol.filter(nota => {
      // 1. Filtro Dirección
      const isOutgoing =
        nota.isOutgoing ||
        (effectiveCountry && nota.from?.toLowerCase().trim() === effectiveCountry.toLowerCase().trim()) ||
        (effectiveRole === 'staff' && nota.fromRole === 'staff') ||
        (effectiveRole === 'backroom' && nota.fromRole === 'backroom') ||
        ((effectiveRole === 'chair' || effectiveRole === 'secretariat') &&
          (nota.fromRole === effectiveRole || nota.from === 'Mesa de Presidencia' || nota.from === 'Secretaría'));

      if (filtroDireccion === 'RECIBIDAS' && isOutgoing) return false;
      if (filtroDireccion === 'ENVIADAS' && !isOutgoing) return false;

      // 2. Filtro Tipo
      if (filtroTipo === 'URGENTES' && nota.type !== 'urgente') return false;
      if (filtroTipo === 'PAJES' && nota.type !== 'paje') return false;
      if (filtroTipo === 'CRISIS' && nota.type !== 'crisis' && nota.type !== 'backroom') return false;

      // 3. Filtro Búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchText = (nota.text || '').toLowerCase().includes(q);
        const matchFrom = (nota.from || '').toLowerCase().includes(q);
        const matchTo = (nota.to || '').toLowerCase().includes(q);
        if (!matchText && !matchFrom && !matchTo) return false;
      }

      return true;
    });
  }, [notasRol, filtroDireccion, filtroTipo, busqueda, effectiveCountry, effectiveRole]);

  // Manejador de Envío
  const handleEnviarNota = (e) => {
    if (e) e.preventDefault();
    if (!textoNota.trim() || enviando) return;

    setEnviando(true);
    const ok = sendNote(destinatario, textoNota.trim(), tipoNota);

    if (ok) {
      if (sonidoHabilitado) {
        try { playChimeAlert(0.35); } catch {}
      }
      setTextoNota('');
      setFeedbackEnvio('Nota enviada con éxito');
      setTimeout(() => setFeedbackEnvio(null), 2500);

      if (typeof onNoteSent === 'function') {
        onNoteSent({ to: destinatario, text: textoNota.trim(), type: tipoNota });
      }

      // Si estamos en vista móvil tabs, pasar a buzón
      if (layout === 'tabs') {
        setTabMovil('BUZON');
      }
    }
    setEnviando(false);
  };

  // Atajo de teclado: Ctrl+Enter o Cmd+Enter para enviar
  const handleKeyDownTextarea = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleEnviarNota();
    }
  };

  // Acción rápida: Responder nota
  const handleResponder = (nota) => {
    const remitente = nota.from;
    if (!remitente) return;

    if (remitente === 'Mesa de Presidencia' || nota.fromRole === 'chair' || remitente === 'Secretaría' || nota.fromRole === 'secretariat') {
      setDestinatario('CHAIR');
    } else if (remitente === 'Staff' || nota.fromRole === 'staff') {
      setDestinatario('STAFF');
    } else if (remitente === 'Backroom' || nota.fromRole === 'backroom') {
      setDestinatario('BACKROOM');
    } else {
      setDestinatario(remitente);
    }

    if (nota.type === 'urgente') {
      setTipoNota('urgente');
    }

    if (layout === 'tabs') {
      setTabMovil('REDACTAR');
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  // Exportar notas a archivo .txt
  const handleExportarNotas = () => {
    if (notasRol.length === 0) return;
    const lines = notasRol.map(n => {
      const hora = new Date(n.timestamp || Date.now()).toLocaleTimeString();
      return `[${hora}] [${(n.type || 'GENERAL').toUpperCase()}] De: ${n.from} -> Para: ${n.to}\n${n.text}\n--------------------`;
    });
    const contenido = `REGISTRO DE NOTAS Y MENSAJERÍA - OPENMUN\nComité: ${currentComiteNombre || p2p.roomId || 'Sala'}\nTotal notas: ${notasRol.length}\nFecha: ${new Date().toLocaleString()}\n\n` + lines.join('\n\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas_comite_${p2p.roomId || 'sesion'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Comprobar permisos para delegados
  const canSendToChair = effectiveRole !== 'delegate' || settings.allowChairNotes !== false;
  const canSendToDelegates = effectiveRole !== 'delegate' || settings.allowDelegateNotes !== false;

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
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('messaging.committeeTitle', 'Mensajería de Sala & Notas Diplomáticas')}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '100px',
                  backgroundColor: 'rgba(34, 197, 94, 0.16)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.35)'
                }}>
                  {p2p.connectionStatus === 'host_active' ? 'Host P2P' : 'Enlace en Vivo'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                {effectiveCountry ? `Delegación activa: ${effectiveCountry}` : `Rol: ${effectiveRole.toUpperCase()}`} • {notasRol.length} notas en el buzón
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              onClick={() => setSonidoHabilitado(prev => !prev)}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '8px',
                color: sonidoHabilitado ? 'var(--text-color)' : 'var(--muted-text)',
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title={sonidoHabilitado ? 'Silenciar alertas' : 'Activar sonido de notas'}
            >
              {sonidoHabilitado ? <Volume2 size={14} color="#3b82f6" /> : <VolumeX size={14} />}
            </button>

            {notasRol.length > 0 && (
              <button
                onClick={handleExportarNotas}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '8px',
                  color: 'var(--text-color)',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title="Descargar registro de notas en .txt"
              >
                <Download size={14} /> Exportar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenido en modo Tabs (móvil) o modo Split (2 columnas) */}
      {layout === 'tabs' && (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setTabMovil('BUZON')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: tabMovil === 'BUZON' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
              color: tabMovil === 'BUZON' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <MessageSquare size={15} /> Buzón ({notasRol.length})
          </button>
          <button
            onClick={() => setTabMovil('REDACTAR')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: tabMovil === 'REDACTAR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
              color: tabMovil === 'REDACTAR' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> Redactar Nota
          </button>
        </div>
      )}

      {/* Grid principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: layout === 'tabs' ? '1fr' : 'minmax(320px, 390px) 1fr',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* ── COLUMNA 1: FORMULARIO REDACTOR ── */}
        {(layout !== 'tabs' || tabMovil === 'REDACTAR') && (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Send size={17} color="#3b82f6" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                  {t('messaging.composeTitle', 'Redactar Mensaje')}
                </h4>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                {textoNota.length}/400
              </span>
            </div>

            <form onSubmit={handleEnviarNota} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Selector de Destinatario */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('messaging.recipient', 'Destinatario')}
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
                    padding: '0.6rem 0.8rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {/* Grupo Roles & Equipos */}
                  <optgroup label="🏛️ Mesa & Equipos de Sala" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                    {canSendToChair && (
                      <option value="CHAIR">🏛️ Mesa de Presidencia (Chair)</option>
                    )}
                    <option value="STAFF">👥 Equipo de Staff / Pajes</option>
                    <option value="BACKROOM">🛡️ Backroom / Gabinete de Crisis</option>
                    {canSendToDelegates && effectiveRole !== 'delegate' && (
                      <option value="TODOS">📢 Toda la Sala (Todas las Delegaciones)</option>
                    )}
                  </optgroup>

                  {/* Grupo Delegaciones del Comité */}
                  {canSendToDelegates && listaPaises.length > 0 && (
                    <optgroup label="🌐 Delegaciones del Comité" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                      {listaPaises
                        .filter(p => !effectiveCountry || p.nombre.toLowerCase().trim() !== effectiveCountry.toLowerCase().trim())
                        .map(p => (
                          <option key={p.id} value={p.nombre}>
                            {getFlagEmoji(p.bandera, p.nombre)} {p.nombre}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Selector de Tipo de Nota */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('messaging.type', 'Tipo de Nota')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.4rem',
                  marginTop: '0.35rem'
                }}>
                  {Object.values(NOTE_TYPES_CONFIG).map(typeCfg => {
                    const isSelected = tipoNota === typeCfg.id;
                    const Icon = typeCfg.icon;
                    return (
                      <button
                        key={typeCfg.id}
                        type="button"
                        onClick={() => setTipoNota(typeCfg.id)}
                        style={{
                          backgroundColor: isSelected ? typeCfg.bg : 'var(--card-header-bg)',
                          border: `1.5px solid ${isSelected ? typeCfg.color : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
                          padding: '0.45rem 0.35rem',
                          color: isSelected ? typeCfg.color : 'var(--muted-text)',
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: '0.73rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={13} color={isSelected ? typeCfg.color : 'var(--muted-text)'} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {typeCfg.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área de Texto */}
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t('messaging.message', 'Mensaje')}
                </label>
                <textarea
                  ref={textareaRef}
                  rows={4}
                  maxLength={400}
                  placeholder={
                    destinatario === 'CHAIR'
                      ? 'Escribe tu nota diplomática o consulta para la Mesa...'
                      : destinatario === 'TODOS'
                      ? 'Escribe el comunicado para todas las delegaciones...'
                      : `Escribe el mensaje para ${destinatario}...`
                  }
                  value={textoNota}
                  onChange={e => setTextoNota(e.target.value)}
                  onKeyDown={handleKeyDownTextarea}
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
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Atajo: <strong>Ctrl + Enter</strong> para enviar</span>
                </div>
              </div>

              {/* Botón Enviar */}
              <button
                type="submit"
                disabled={!textoNota.trim() || enviando}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '0.75rem',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: textoNota.trim() && !enviando ? 'pointer' : 'not-allowed',
                  opacity: textoNota.trim() && !enviando ? 1 : 0.45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} /> {enviando ? 'Transmitiendo...' : t('messaging.sendBtn', 'Enviar Nota')}
              </button>

              {feedbackEnvio && (
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
                  <CheckCircle2 size={14} /> {feedbackEnvio}
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── COLUMNA 2: BUZÓN DE NOTAS (FEED) ── */}
        {(layout !== 'tabs' || tabMovil === 'BUZON') && (
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
            {/* Barra superior del buzón: Filtros y Búsqueda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                    {t('messaging.inboxTitle', 'Buzón de Notas')} ({notasFiltradas.length})
                  </h4>
                  {p2p.unreadNotesCount > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '100px'
                    }}>
                      +{p2p.unreadNotesCount} nuevas
                    </span>
                  )}
                </div>

                {/* Filtro de Dirección */}
                <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--card-header-bg)', padding: '2px', borderRadius: '7px' }}>
                  {['TODAS', 'RECIBIDAS', 'ENVIADAS'].map(dir => (
                    <button
                      key={dir}
                      onClick={() => setFiltroDireccion(dir)}
                      style={{
                        backgroundColor: filtroDireccion === dir ? 'var(--btn-bg)' : 'transparent',
                        color: filtroDireccion === dir ? 'var(--btn-text)' : 'var(--muted-text)',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0.28rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {dir === 'TODAS' ? 'Todas' : dir === 'RECIBIDAS' ? 'Recibidas' : 'Enviadas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros por Categoría y Buscador */}
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
                    placeholder="Filtrar por país o texto..."
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
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'URGENTES', label: '🚨 Urgentes' },
                    { id: 'PAJES', label: '✉️ Pajes' },
                    { id: 'CRISIS', label: '🛡️ Crisis' }
                  ].map(tFilter => (
                    <button
                      key={tFilter.id}
                      onClick={() => setFiltroTipo(tFilter.id)}
                      style={{
                        backgroundColor: filtroTipo === tFilter.id ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        color: filtroTipo === tFilter.id ? '#3b82f6' : 'var(--muted-text)',
                        border: `1px solid ${filtroTipo === tFilter.id ? 'rgba(59, 130, 246, 0.35)' : 'var(--subborder-color)'}`,
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

            {/* Listado de Mensajes */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              maxHeight: '480px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {notasFiltradas.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--card-header-bg)',
                  borderRadius: '12px',
                  border: '1px dashed var(--subborder-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Mail size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                    {busqueda ? 'No se encontraron notas con ese criterio' : 'Buzón de notas vacío'}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                    {busqueda
                      ? 'Prueba a cambiar el término de búsqueda o restablecer filtros.'
                      : 'Las notas enviadas y recibidas en tiempo real aparecerán aquí.'}
                  </div>
                </div>
              ) : (
                notasFiltradas.map(nota => {
                  const typeCfg = NOTE_TYPES_CONFIG[nota.type] || NOTE_TYPES_CONFIG.general;
                  const isOutgoing =
                    nota.isOutgoing ||
                    (effectiveCountry && nota.from?.toLowerCase().trim() === effectiveCountry.toLowerCase().trim()) ||
                    (effectiveRole === 'staff' && nota.fromRole === 'staff') ||
                    (effectiveRole === 'backroom' && nota.fromRole === 'backroom') ||
                    ((effectiveRole === 'chair' || effectiveRole === 'secretariat') &&
                      (nota.fromRole === effectiveRole || nota.from === 'Mesa de Presidencia' || nota.from === 'Secretaría'));

                  const fechaHora = new Date(nota.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={nota.id}
                      style={{
                        backgroundColor: isOutgoing ? 'rgba(59, 130, 246, 0.05)' : 'var(--card-header-bg)',
                        border: `1px solid ${isOutgoing ? 'rgba(59, 130, 246, 0.25)' : 'var(--subborder-color)'}`,
                        borderLeft: `4px solid ${typeCfg.color}`,
                        borderRadius: '11px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Cabecera de la nota */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {/* Badge de Dirección */}
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: isOutgoing ? 'rgba(16, 185, 129, 0.18)' : 'rgba(59, 130, 246, 0.18)',
                            color: isOutgoing ? '#10b981' : '#3b82f6',
                            border: `1px solid ${isOutgoing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                          }}>
                            {isOutgoing ? '➔ Enviada' : '⬅ Recibida'}
                          </span>

                          {/* Remitente y Destinatario */}
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)' }}>
                            {nota.from}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>➔</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#60a5fa' }}>
                            {nota.to === 'TODOS' ? '📢 Toda la Sala' : nota.to === 'CHAIR' ? '🏛️ Mesa' : nota.to}
                          </span>

                          {/* Badge de tipo de nota */}
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: typeCfg.bg,
                            color: typeCfg.color,
                            border: `1px solid ${typeCfg.border}`
                          }}>
                            {typeCfg.badgeText}
                          </span>
                        </div>

                        {/* Hora y Acción Responder */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> {fechaHora}
                          </span>

                          {!isOutgoing && (
                            <button
                              onClick={() => handleResponder(nota)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '5px',
                                color: '#60a5fa',
                                padding: '0.2rem 0.45rem',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title="Responder a este remitente"
                            >
                              <Reply size={11} /> Responder
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cuerpo de la nota */}
                      <div style={{
                        fontSize: '0.86rem',
                        color: 'var(--text-color)',
                        lineHeight: '1.45',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {nota.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={feedEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MensajeriaComite;
