import peerService, { canReceiveNote } from '../../services/peerService.js';
import i18n from '../../languages/index.js';
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
import './NoteModeration.css';

/**
 * Metadata y configuración visual para cada categoría de nota
 */
export const NOTE_TYPES_CONFIG = {
  general: {
    id: 'general',
    get label() { return i18n.t('ui.generalMessage'); },
    get shortLabel() { return i18n.t('ui.general'); },
    icon: FileText,
    color: 'var(--muted-text)',
    bg: 'var(--card-header-bg)',
    border: 'var(--subborder-color)',
    get badgeText() { return i18n.t('ui.general2'); }
  },
  paje: {
    id: 'paje',
    get label() { return i18n.t('ui.pageMessageDelivery'); },
    get shortLabel() { return i18n.t('ui.page'); },
    icon: Mail,
    color: 'var(--info-color)',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    get badgeText() { return i18n.t('ui.page2'); }
  },
  urgente: {
    id: 'urgente',
    get label() { return i18n.t('ui.urgentPriority'); },
    get shortLabel() { return i18n.t('ui.urgent4'); },
    icon: Zap,
    color: 'var(--danger-color)',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    get badgeText() { return i18n.t('ui.urgent5'); }
  },
  logistica: {
    id: 'logistica',
    get label() { return i18n.t('ui.logisticsAssistance'); },
    get shortLabel() { return i18n.t('ui.logistics3'); },
    icon: Coffee,
    color: 'var(--accent-color)',
    bg: 'var(--accent-soft)',
    border: 'var(--subborder-color)',
    get badgeText() { return i18n.t('ui.logistics4'); }
  },
  crisis: {
    id: 'crisis',
    get label() { return i18n.t('ui.crisisConfidential'); },
    get shortLabel() { return i18n.t('ui.crisis2'); },
    icon: Flame,
    color: 'var(--warning-color)',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    get badgeText() { return i18n.t('ui.crisis3'); }
  },
  pregunta: {
    id: 'pregunta',
    get label() { return i18n.t('ui.parliamentaryInquiry'); },
    get shortLabel() { return i18n.t('ui.procedure'); },
    icon: HelpCircle,
    color: 'var(--warning-color)',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.35)',
    get badgeText() { return i18n.t('ui.procedure2'); }
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
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const useMobileTabs = layout === 'tabs' || isMobileScreen;

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

  const notasRol = useMemo(
    () => notes.filter(note => canReceiveNote(note, effectiveRole, effectiveCountry, peerService.clientId)),
    [notes, effectiveRole, effectiveCountry]
  );

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
  const handleEnviarNota = async (e) => {
    if (e) e.preventDefault();
    if (!textoNota.trim() || enviando) return;

    setEnviando(true);
    const ok = await sendNote(destinatario, textoNota.trim(), tipoNota);

    if (ok) {
      if (sonidoHabilitado) {
        try { playChimeAlert(0.35); } catch {}
      }
      setTextoNota('');
      setFeedbackEnvio(effectiveRole === 'delegate' && settings.requireStaffNoteApproval ? t('ui.notePendingStaffApproval') : t('ui.noteSentSuccessfully'));
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
      return t('ui.fromTo', { v0: hora, v1: (n.type || 'GENERAL').toUpperCase(), v2: n.from, v3: n.to, v4: n.text });
    });
    const contenido = t('ui.openmunNotesAndMessagingLogCommitteeTotalNotesDate', { v0: currentComiteNombre || p2p.roomId || 'Sala', v1: notasRol.length, v2: new Date().toLocaleString() }) + lines.join('\n\n');
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
              borderRadius: 'var(--border-radius, 6px)',
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-color)'
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
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: 'var(--success-color)',
                  border: '1px solid rgba(34, 197, 94, 0.25)'
                }}>
                  {p2p.connectionStatus === 'host_active' ? 'Host P2P' : t('ui.liveLink')}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                {effectiveCountry ? t('ui.activeDelegation', { v0: effectiveCountry }) : t('ui.role2', { v0: effectiveRole.toUpperCase() })} • {notasRol.length} {t('ui.notesInInbox')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              onClick={() => setSonidoHabilitado(prev => !prev)}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: 'var(--border-radius, 6px)',
                color: sonidoHabilitado ? 'var(--text-color)' : 'var(--muted-text)',
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title={sonidoHabilitado ? t('ui.muteAlerts') : t('ui.enableNoteSounds')}
            >
              {sonidoHabilitado ? <Volume2 size={14} color="var(--accent-color)" /> : <VolumeX size={14} />}
            </button>

            {notasRol.length > 0 && (
              <button
                onClick={handleExportarNotas}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  color: 'var(--text-color)',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title={t('ui.downloadNoteLogAsTxt')}
              >
                <Download size={14} /> {t('ui.export')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenido en modo Tabs (móvil) o modo Split (2 columnas) */}
      {useMobileTabs && (
        <div role="tablist" style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            role="tab"
            aria-selected={tabMovil === 'BUZON'}
            onClick={() => setTabMovil('BUZON')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${tabMovil === 'BUZON' ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              backgroundColor: tabMovil === 'BUZON' ? 'var(--accent-soft)' : 'transparent',
              color: tabMovil === 'BUZON' ? 'var(--accent-color)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <MessageSquare size={15} /> {t('ui.inbox')}{notasRol.length})
          </button>
          <button
            role="tab"
            aria-selected={tabMovil === 'REDACTAR'}
            onClick={() => setTabMovil('REDACTAR')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--border-radius, 6px)',
              border: `1px solid ${tabMovil === 'REDACTAR' ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              backgroundColor: tabMovil === 'REDACTAR' ? 'var(--accent-soft)' : 'transparent',
              color: tabMovil === 'REDACTAR' ? 'var(--accent-color)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> {t('views.delegate.compose')}
          </button>
        </div>
      )}

      {/* Grid principal */}
      <div className="openmun-messaging-split" style={{
        display: 'grid',
        gridTemplateColumns: useMobileTabs ? '1fr' : 'minmax(320px, 390px) 1fr',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* ── COLUMNA 1: FORMULARIO REDACTOR ── */}
        {(!useMobileTabs || tabMovil === 'REDACTAR') && (
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Send size={17} color="var(--accent-color)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                  {t('messaging.composeTitle', 'Redactar Mensaje')}
                </h4>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
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
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.6rem 0.8rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {/* Grupo Roles & Equipos */}
                  <optgroup label={t('ui.chairRoomTeams')} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                    {canSendToChair && (
                      <option value="CHAIR">{t('ui.presidingBoardChair')}</option>
                    )}
                    <option value="STAFF">{t('ui.staffPagesTeam')}</option>
                    <option value="BACKROOM">{t('ui.backroomCrisisCabinet')}</option>
                    {canSendToDelegates && effectiveRole !== 'delegate' && (
                      <option value="TODOS">{t('ui.entireRoomAllDelegations')}</option>
                    )}
                  </optgroup>

                  {/* Grupo Delegaciones del Comité */}
                  {canSendToDelegates && listaPaises.length > 0 && (
                    <optgroup label={t('ui.committeeDelegations')} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
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
                        aria-pressed={isSelected}
                        onClick={() => setTipoNota(typeCfg.id)}
                        style={{
                          backgroundColor: isSelected ? typeCfg.bg : 'var(--card-header-bg)',
                          border: `1.5px solid ${isSelected ? typeCfg.color : 'var(--subborder-color)'}`,
                          borderRadius: 'var(--border-radius, 6px)',
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
                      ? t('ui.writeYourDiplomaticNoteOrQuestionToTheChair')
                      : destinatario === 'TODOS'
                      ? t('ui.writeTheAnnouncementForAllDelegations')
                      : t('ui.writeTheMessageFor', { v0: destinatario })
                  }
                  value={textoNota}
                  onChange={e => setTextoNota(e.target.value)}
                  onKeyDown={handleKeyDownTextarea}
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
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('ui.shortcut')} <strong>Ctrl + Enter</strong> {t('ui.toSend')}</span>
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
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.75rem',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: textoNota.trim() && !enviando ? 'pointer' : 'not-allowed',
                  opacity: textoNota.trim() && !enviando ? 1 : 0.45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} /> {enviando ? t('ui.broadcasting') : t('messaging.sendBtn', 'Enviar Nota')}
              </button>

              {feedbackEnvio && (
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
                  <CheckCircle2 size={14} /> {feedbackEnvio}
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── COLUMNA 2: BUZÓN DE NOTAS (FEED) ── */}
        {(!useMobileTabs || tabMovil === 'BUZON') && (
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
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
                      backgroundColor: 'var(--danger-color)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '100px'
                    }}>
                      +{p2p.unreadNotesCount} {t('ui.new')}
                    </span>
                  )}
                </div>

                {/* Filtro de Dirección */}
                <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--card-header-bg)', padding: '2px', borderRadius: 'var(--border-radius, 6px)' }}>
                  {['TODAS', 'RECIBIDAS', 'ENVIADAS'].map(dir => {
                    const isSelected = filtroDireccion === dir;
                    return (
                      <button
                        key={dir}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFiltroDireccion(dir)}
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
                        {dir === 'TODAS' ? t('avisos.filterAll') : dir === 'RECIBIDAS' ? t('ui.received2') : t('ui.sent2')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtros por Categoría y Buscador */}
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
                    placeholder={t('ui.filterByCountryOrText')}
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
                    { id: 'TODOS', label: t('sidebar.categories.all') },
                    { id: 'URGENTES', label: t('ui.urgent2') },
                    { id: 'PAJES', label: t('ui.pages') },
                    { id: 'CRISIS', label: t('ui.crisis') }
                  ].map(tFilter => {
                    const isSelected = filtroTipo === tFilter.id;
                    return (
                      <button
                        key={tFilter.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFiltroTipo(tFilter.id)}
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
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px dashed var(--subborder-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Mail size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                    {busqueda ? t('ui.noNotesMatchTheseCriteria') : t('ui.noteInboxEmpty')}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                    {busqueda
                      ? t('ui.tryChangingTheSearchTermOrResettingFilters')
                      : t('ui.notesSentAndReceivedInRealTimeWillAppearHere')}
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
                        backgroundColor: isOutgoing ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                        border: `1px solid ${isOutgoing ? 'var(--border-color)' : 'var(--subborder-color)'}`,
                        borderLeft: `3px solid ${typeCfg.color}`,
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {nota.status && (
                        <div role="status" style={{ fontSize: '0.75rem', color: nota.status === 'pending' ? 'var(--warning-color)' : nota.status === 'rejected' ? 'var(--danger-color)' : 'var(--success-color)' }}>
                          {nota.status === 'pending' ? t('ui.pendingStaffApproval') : nota.status === 'rejected' ? t('ui.rejectedByStaffNotDelivered') : nota.status === 'approved' ? t('ui.approvedByStaffAndDelivered') : t('ui.delivered')}
                        </div>
                      )}
                      {effectiveRole === 'staff' && nota.status === 'pending' && (
                        <div className="note-review-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <button type="button" onClick={() => p2p.reviewNote(nota.id, 'approved')} style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius, 6px)', padding: '8px 12px', cursor: 'pointer' }}>{t('ui.approveAndDeliver')}</button>
                          <button type="button" onClick={() => p2p.reviewNote(nota.id, 'rejected')} style={{ background: 'transparent', color: 'var(--danger-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius, 6px)', padding: '8px 12px', cursor: 'pointer' }}>{t('ui.reject')}</button>
                        </div>
                      )}
                      {/* Cabecera de la nota */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {/* Badge de Dirección */}
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: isOutgoing ? 'rgba(34, 197, 94, 0.12)' : 'var(--accent-soft)',
                            color: isOutgoing ? 'var(--success-color)' : 'var(--accent-color)',
                            border: `1px solid ${isOutgoing ? 'rgba(34, 197, 94, 0.25)' : 'var(--subborder-color)'}`
                          }}>
                            {isOutgoing ? t('ui.sent') : t('ui.received')}
                          </span>

                          {/* Remitente y Destinatario */}
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)' }}>
                            {nota.from}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>➔</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                            {nota.to === 'TODOS' ? t('ui.entireRoom') : nota.to === 'CHAIR' ? t('ui.chair') : nota.to}
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
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={11} /> {fechaHora}
                          </span>

                          {!isOutgoing && (
                            <button
                              onClick={() => handleResponder(nota)}
                              style={{
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--subborder-color)',
                                borderRadius: 'var(--border-radius, 6px)',
                                color: 'var(--accent-color)',
                                padding: '0.2rem 0.45rem',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('ui.replyToThisSender')}
                            >
                              <Reply size={11} /> {t('ui.reply')}
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
