import i18n from '../../languages/index.js';
import React, { useState, useMemo } from 'react';
import {
  Vote,
  Settings,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ListFilter,
  Check,
  X,
  Minus,

  Users,
  Award,
  FileCheck2,
  FileX2,
  Trophy,
  PartyPopper,
  Hand,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { BotonesConDerechos, ListaDerechos } from './VotosConDerechos';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';

const MiniVotacion = ({ hideHeader = false }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isLight } = useAccessibility();
  const {
    paises: rawPaises,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    enmiendasSesion,
    resolverEnmiendaResolucion,
    siguienteTemaAgenda,
    irASiguienteTema
  } = useSession();

  const paises = Array.isArray(rawPaises) ? rawPaises : [];

  const [modoVista, setModoVista] = useState('manos'); // 'manos' | 'rollcall' | 'lista'
  const [showSettings, setShowSettings] = useState(false);
  const [showExpandedModal, setShowExpandedModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Estados de Roll Call
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [rondaRollCall, setRondaRollCall] = useState(1); // 1 = Primera Ronda, 2 = Segunda Ronda (Pasados)
  const [paisesPasados, setPaisesPasados] = useState([]); // IDs de países que pasaron en Ronda 1

  // Configuración de la votación actual (null-safe)
  const {
    asunto: rawAsunto,
    tipoVotacion: rawTipoVotacion,
    tipoMayoria: rawTipoMayoria,
    aplicarVeto: rawAplicarVeto,
    votos: rawVotos
  } = votacionSesion || {};
  const asunto = typeof rawAsunto === 'string' && rawAsunto.trim() ? rawAsunto : i18n.t('ui.amendmentVote');
  const tipoVotacion = rawTipoVotacion || 'procedural';
  const tipoMayoria = rawTipoMayoria || 'simple';
  const aplicarVeto = rawAplicarVeto ?? true;
  const votos = (rawVotos && typeof rawVotos === 'object' && !Array.isArray(rawVotos)) ? rawVotos : {};

  // Formulario local de ajustes
  const [tempAsunto, setTempAsunto] = useState(asunto);
  const [tempTipoVotacion, setTempTipoVotacion] = useState(tipoVotacion);
  const [tempTipoMayoria, setTempTipoMayoria] = useState(tipoMayoria);
  const [tempAplicarVeto, setTempAplicarVeto] = useState(aplicarVeto);

  // Intentar extraer el país proponente del asunto (ej. "Enmienda de Adición - Artículo 2 (Francia)")
  const proponenteDetectado = useMemo(() => {
    const match = (asunto || '').match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const nombrePosible = match[1].trim();
      const paisObj = paises.find(p => p && p.nombre?.toLowerCase() === nombrePosible.toLowerCase());
      return { nombre: nombrePosible, paisObj };
    }
    return null;
  }, [asunto, paises]);

  // Delegaciones presentes (excluyendo ausentes)
  const paisesAsistentes = useMemo(() => {
    return paises.filter(p => p && (p.estatus === 'Presente' || p.estatus === 'Presente y Votando'));
  }, [paises]);

  const totalAsistentes = paisesAsistentes.length;

  // Lista de países para la ronda activa de Roll Call
  const listaRollCall = useMemo(() => {
    if (rondaRollCall === 1) {
      return [...paisesAsistentes].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
    } else {
      return paisesAsistentes
        .filter(p => paisesPasados.includes(p.id))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
    }
  }, [paisesAsistentes, rondaRollCall, paisesPasados]);

  // Asegurar que el índice esté dentro del rango
  const paisActual = listaRollCall[indiceRollCall] || listaRollCall[0] || null;

  // Conteo de Votos
  const { favor, contra, abstencion, vetoEjercido, paisesConVeto } = useMemo(() => {
    let f = 0, c = 0, a = 0;
    const vetoP = [];

    paisesAsistentes.forEach(p => {
      const v = votos[p.id];
      if (v === 'favor') f++;
      else if (v === 'contra') {
        c++;
        if (aplicarVeto && p.veto) vetoP.push(p);
      } else if (v === 'abstencion') {
        a++;
      }
    });

    return {
      favor: f,
      contra: c,
      abstencion: a,
      vetoEjercido: vetoP.length > 0,
      paisesConVeto: vetoP
    };
  }, [paisesAsistentes, votos, aplicarVeto]);

  const votosEmitidos = favor + contra + abstencion;
  const votosPendientes = Math.max(0, totalAsistentes - votosEmitidos);
  const votosValidos = favor + contra;

  // Cálculo de Requisitos MUN
  const reqSimple = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
  const reqDosTercios = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;

  let requeridos = 0;
  let superada = false;

  if (tipoMayoria === 'simple') {
    requeridos = tipoVotacion === 'substantive' && votosValidos > 0 ? Math.floor(votosValidos / 2) + 1 : reqSimple;
    superada = favor > contra && favor >= requeridos;
  } else if (tipoMayoria === '2/3') {
    requeridos = tipoVotacion === 'substantive' && votosValidos > 0 ? Math.ceil((votosValidos * 2) / 3) : reqDosTercios;
    superada = favor >= requeridos && favor > 0;
  } else if (tipoMayoria === 'consensus') {
    requeridos = totalAsistentes;
    superada = contra === 0 && favor > 0;
  }

  const estadoVotacion = vetoEjercido
    ? 'VETO EJERCIDO'
    : (votosEmitidos > 0 && superada)
      ? 'APROBADA'
      : (votosEmitidos > 0 && contra >= requeridos)
        ? 'RECHAZADA'
        : 'EN CURSO';

  const votacionTerminada = totalAsistentes > 0 && (votosPendientes === 0 || estadoVotacion === 'VETO EJERCIDO');

  // Enmienda asociada si existe en el controlador de enmiendas
  const enmiendaAsociada = useMemo(() => {
    const list = Array.isArray(enmiendasSesion?.enmiendas) ? enmiendasSesion.enmiendas : [];
    if (proponenteDetectado?.nombre) {
      return list.find(e => e && e.paisProponente?.toLowerCase() === proponenteDetectado.nombre.toLowerCase() && e.estado === 'pendiente') || null;
    }
    return list.find(e => e && e.estado === 'pendiente') || null;
  }, [enmiendasSesion, proponenteDetectado]);

  // Manejo de voto en Roll Call
  const handleVotarRollCall = (tipoVoto) => {
    if (!paisActual) return;

    if (tipoVoto === 'pasar') {
      if (!paisesPasados.includes(paisActual.id)) {
        setPaisesPasados(prev => [...prev, paisActual.id]);
      }
    } else {
      registrarVotoPais(paisActual.id, tipoVoto);
      if (paisesPasados.includes(paisActual.id)) {
        setPaisesPasados(prev => prev.filter(id => id !== paisActual.id));
      }
    }

    // Avanzar al siguiente país
    if (indiceRollCall < listaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else if (rondaRollCall === 1 && paisesPasados.length > (tipoVoto === 'pasar' ? 0 : 1)) {
      // Pasar a ronda 2 si hay países pasados
      setRondaRollCall(2);
      setIndiceRollCall(0);
    } else {
      // Si concluyó la lista, abrir modal de resultado
      setShowResultModal(true);
    }
  };

  const handleReset = () => {
    resetearVotacion();
    setIndiceRollCall(0);
    setRondaRollCall(1);
    setPaisesPasados([]);
    setShowResultModal(false);
  };

  const incrementarVoto = (tipo) => {
    const candidato = paisesAsistentes.find(p => votos[p.id] !== tipo);
    if (candidato) registrarVotoPais(candidato.id, tipo);
  };

  const decrementarVoto = (tipo) => {
    const candidato = [...paisesAsistentes].reverse().find(p => votos[p.id] === tipo);
    if (candidato) registrarVotoPais(candidato.id, null);
  };

  const votarTodos = (tipo) => {
    paisesAsistentes.forEach(p => registrarVotoPais(p.id, tipo));
  };

  const handleGuardarAjustes = (e) => {
    e.preventDefault();
    configurarVotacion({
      asunto: tempAsunto,
      tipoVotacion: tempTipoVotacion,
      tipoMayoria: tempTipoMayoria,
      aplicarVeto: tempAplicarVeto
    });
    setShowSettings(false);
  };

  const handleAplicarDecisionEnmienda = (decision) => {
    if (enmiendaAsociada && resolverEnmiendaResolucion) {
      resolverEnmiendaResolucion(enmiendaAsociada.id, decision);
    }
    setShowResultModal(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-bg)',
      color: 'var(--text-color)',
      borderRadius: hideHeader ? '0' : 'var(--border-radius, 6px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── HEADER MINI VOTACIÓN (Compacto) ── */}
      {!hideHeader && (
        <div style={{
          padding: '0.5rem 0.75rem',
          paddingRight: '60px', // Espacio para controles superiores
          borderBottom: '1px solid var(--subborder-color)',
          backgroundColor: 'var(--card-header-bg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexShrink: 0
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '650',
              color: 'var(--text-color)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {asunto || t('ui.rollCallVoting')}
            </div>

            <div style={{
              fontSize: '0.64rem',
              color: 'var(--muted-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              flexWrap: 'nowrap',
              overflow: 'hidden'
            }}>
              <span style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                padding: '0.08rem 0.35rem',
                borderRadius: 'var(--border-radius, 4px)',
                fontWeight: '600',
                fontSize: '0.62rem'
              }}>
                {tipoVotacion === 'substantive' ? t('voting.substantiveShort') : t('voting.proceduralShort')}
              </span>

              {proponenteDetectado && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  padding: '0.05rem 0.3rem',
                  borderRadius: '3px',
                  color: 'var(--text-color)',
                  fontWeight: '700',
                  fontSize: '0.6rem'
                }}>
                  <CountryFlag country={proponenteDetectado.paisObj} bandera={proponenteDetectado.paisObj?.bandera} nombre={proponenteDetectado.nombre} size="xs" />
                  <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proponenteDetectado.nombre}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BARRA DE HERRAMIENTAS Y VISTAS (Compacta) ── */}
      <div style={{
        padding: '0.3rem 0.6rem',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--panel-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.25rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            onClick={() => setModoVista('manos')}
            title={t('ui.showOfHandsVotingQuickCounters')}
            style={{
              background: modoVista === 'manos' ? 'var(--accent-color)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              border: `1px solid ${modoVista === 'manos' ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: modoVista === 'manos' ? '#1a1a1a' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.68rem',
              fontWeight: modoVista === 'manos' ? '800' : '600'
            }}
          >
            <Hand size={11} />
            <span>{t('ui.showOfHands')}</span>
          </button>

          <button
            onClick={() => setModoVista(m => m === 'rollcall' ? 'lista' : 'rollcall')}
            title={modoVista === 'rollcall' ? t('ui.viewListMode') : t('ui.viewRollCallMode')}
            style={{
              background: modoVista !== 'manos' ? 'var(--card-hover, rgba(255,255,255,0.1))' : 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              fontWeight: '600'
            }}
          >
            <ListFilter size={11} />
            <span>{modoVista === 'lista' ? t('ui.list') : 'Roll Call'}</span>
          </button>

          <button
            onClick={() => {
              setTempAsunto(asunto);
              setTempTipoVotacion(tipoVotacion);
              setTempTipoMayoria(tipoMayoria);
              setTempAplicarVeto(aplicarVeto);
              setShowSettings(true);
            }}
            title={t('ui.votingSettings')}
            style={{
              background: 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.68rem',
              fontWeight: '600'
            }}
          >
            <Settings size={11} />
            <span>{t('views.backroom.tabSettings')}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {votosEmitidos > 0 && (
            <button
              onClick={() => setShowResultModal(true)}
              title={t('ui.viewVerdictAndResultEnlarged')}
              style={{
                background: estadoVotacion === 'APROBADA'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : estadoVotacion === 'RECHAZADA'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(59, 130, 246, 0.2)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '4px',
                padding: '0.2rem 0.45rem',
                color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' ? '#ef4444' : '#3b82f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.68rem',
                fontWeight: '800'
              }}
            >
              <Award size={11} />
              <span>{t('ui.verdict')}</span>
            </button>
          )}

          <button
            onClick={() => setShowExpandedModal(true)}
            title={t('ui.expandFullVotingView')}
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.68rem',
              fontWeight: '700'
            }}
          >
            <Maximize2 size={11} />
            <span>{t('ui.expand')}</span>
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL (Ultra Compacto y estilizado) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {totalAsistentes === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            padding: '0.75rem',
            color: 'var(--muted-text)',
            gap: '0.3rem'
          }}>
            <Users size={22} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.74rem', fontWeight: '700' }}>{t('ui.noDelegationsInTheRoom')}</div>
            <div style={{ fontSize: '0.64rem', opacity: 0.8 }}>
              {t('ui.takeAttendanceInTheStartOrInfoTabToRegister')}
            </div>
          </div>
        ) : modoVista === 'manos' ? (
          /* ── MODO MANO ALZADA (Estilo Debate Agenda con Steppers) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, justifyContent: 'center' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: tipoVotacion === 'substantive' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: '0.4rem'
            }}>
              {/* Tarjeta A Favor */}
              <div style={{
                backgroundColor: 'var(--input-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.6rem 0.35rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--success-color)' }}>
                  {t('voting.inFavor')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    onClick={() => decrementarVoto('favor')}
                    disabled={favor <= 0}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      cursor: favor <= 0 ? 'not-allowed' : 'pointer',
                      opacity: favor <= 0 ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{
                    fontFamily: 'var(--font-family)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1.9rem',
                    fontWeight: '800',
                    color: 'var(--success-color)',
                    minWidth: '36px',
                    textAlign: 'center',
                    lineHeight: 1
                  }}>
                    {favor}
                  </span>
                  <button
                    onClick={() => incrementarVoto('favor')}
                    disabled={votosEmitidos >= totalAsistentes}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                      opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => votarTodos('favor')}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--muted-text)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.62rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('agenda.allVotesFavor')}
                </button>
              </div>

              {/* Tarjeta En Contra */}
              <div style={{
                backgroundColor: 'var(--input-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.6rem 0.35rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--danger-color)' }}>
                  {t('voting.against')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    onClick={() => decrementarVoto('contra')}
                    disabled={contra <= 0}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      cursor: contra <= 0 ? 'not-allowed' : 'pointer',
                      opacity: contra <= 0 ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{
                    fontFamily: 'var(--font-family)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1.9rem',
                    fontWeight: '800',
                    color: 'var(--danger-color)',
                    minWidth: '36px',
                    textAlign: 'center',
                    lineHeight: 1
                  }}>
                    {contra}
                  </span>
                  <button
                    onClick={() => incrementarVoto('contra')}
                    disabled={votosEmitidos >= totalAsistentes}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                      opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => votarTodos('contra')}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--muted-text)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.62rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('agenda.allVotesContra')}
                </button>
              </div>

              {/* Tarjeta Abstención (solo si sustantiva) */}
              {tipoVotacion === 'substantive' && (
                <div style={{
                  backgroundColor: 'var(--input-bg, rgba(255, 255, 255, 0.04))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--warning-color)' }}>
                    {t('voting.abstention')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      onClick={() => decrementarVoto('abstencion')}
                      disabled={abstencion <= 0}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        cursor: abstencion <= 0 ? 'not-allowed' : 'pointer',
                        opacity: abstencion <= 0 ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.9rem',
                      fontWeight: '800',
                      color: 'var(--warning-color)',
                      minWidth: '36px',
                      textAlign: 'center',
                      lineHeight: 1
                    }}>
                      {abstencion}
                    </span>
                    <button
                      onClick={() => incrementarVoto('abstencion')}
                      disabled={votosEmitidos >= totalAsistentes}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                        opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => votarTodos('abstencion')}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--muted-text)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {t('ui.allAbstain')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : modoVista === 'rollcall' ? (
          /* ── MODO ROLL CALL ULTRA COMPACTO ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.35rem' }}>
            {/* Navegación y Ronda */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
              padding: '0.2rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid var(--subborder-color)',
              fontSize: '0.68rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{
                  backgroundColor: rondaRollCall === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: rondaRollCall === 1 ? '#3b82f6' : '#eab308',
                  padding: '0.04rem 0.3rem',
                  borderRadius: '3px',
                  fontWeight: '800',
                  fontSize: '0.6rem'
                }}>
                  {rondaRollCall === 1 ? t('ui.round1') : t('ui.round2')}
                </span>
                <span style={{ color: 'var(--muted-text)', fontWeight: '700' }}>
                  {indiceRollCall + 1} / {listaRollCall.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                <button
                  onClick={() => setIndiceRollCall(prev => Math.max(0, prev - 1))}
                  disabled={indiceRollCall === 0}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    opacity: indiceRollCall === 0 ? 0.3 : 1,
                    cursor: indiceRollCall === 0 ? 'not-allowed' : 'pointer',
                    padding: '2px'
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setIndiceRollCall(prev => Math.min(listaRollCall.length - 1, prev + 1))}
                  disabled={indiceRollCall >= listaRollCall.length - 1}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    opacity: indiceRollCall >= listaRollCall.length - 1 ? 0.3 : 1,
                    cursor: indiceRollCall >= listaRollCall.length - 1 ? 'not-allowed' : 'pointer',
                    padding: '2px'
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Tarjeta de Delegación Activa Horizontal y Ultra Compacta */}
            {paisActual && (
              <div style={{
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '6px',
                padding: '0.45rem 0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag
                      country={paisActual}
                      bandera={paisActual.bandera}
                      nombre={paisActual.nombre}
                      size="sm"
                      style={{ borderRadius: '3px' }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {paisActual.nombre}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '1px' }}>
                        <span style={{
                          fontSize: '0.55rem',
                          fontWeight: '700',
                          padding: '0.02rem 0.25rem',
                          borderRadius: '2px',
                          backgroundColor: paisActual.estatus === 'Presente y Votando' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: paisActual.estatus === 'Presente y Votando' ? '#eab308' : '#22c55e'
                        }}>
                          {t(`sessionValues.${paisActual.estatus}`, paisActual.estatus)}
                        </span>
                        {paisActual.veto && (
                          <span style={{
                            fontSize: '0.55rem',
                            fontWeight: '800',
                            padding: '0.02rem 0.2rem',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444'
                          }}>
                            {t('voting.vetoP5')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voto Actual Emitido Badge */}
                  {votos[paisActual.id] ? (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      backgroundColor: votos[paisActual.id] === 'favor'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : votos[paisActual.id] === 'contra'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(234, 179, 8, 0.2)',
                      color: votos[paisActual.id] === 'favor' ? '#22c55e' : votos[paisActual.id] === 'contra' ? '#ef4444' : '#eab308'
                    }}>
                      {votos[paisActual.id].toUpperCase()}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {t('agenda.pending')}
                    </span>
                  )}
                </div>

                <BotonesConDerechos tipoVotacion={tipoVotacion} onVote={handleVotarRollCall} />
                {/* Fila de 4 Botones Rápidos (Favor, Contra, Abs, Pasar) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.25rem',
                  width: '100%',
                  marginTop: '0.15rem'
                }}>
                  <button
                    onClick={() => handleVotarRollCall('favor')}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'favor' ? '#16a34a' : 'rgba(34, 197, 94, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'favor' ? '#22c55e' : 'rgba(34, 197, 94, 0.35)'}`,
                      color: votos[paisActual.id] === 'favor' ? '#ffffff' : '#22c55e',
                      fontWeight: '800',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={12} /> {t('ui.for')}
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('contra')}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'contra' ? '#dc2626' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'contra' ? '#ef4444' : 'rgba(239, 68, 68, 0.35)'}`,
                      color: votos[paisActual.id] === 'contra' ? '#ffffff' : '#ef4444',
                      fontWeight: '800',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={12} /> {t('ui.against')}
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('abstencion')}
                    disabled={paisActual.estatus === 'Presente y Votando'}
                    title={paisActual.estatus === 'Presente y Votando' ? t('ui.cannotAbstainPresentAndVoting') : t('voting.abstention')}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'abstencion' ? '#ca8a04' : 'rgba(234, 179, 8, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'abstencion' ? '#eab308' : 'rgba(234, 179, 8, 0.35)'}`,
                      color: votos[paisActual.id] === 'abstencion' ? '#ffffff' : '#eab308',
                      fontWeight: '700',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: paisActual.estatus === 'Presente y Votando' ? 'not-allowed' : 'pointer',
                      opacity: paisActual.estatus === 'Presente y Votando' ? 0.35 : 1,
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem'
                    }}
                  >
                    <Minus size={12} /> {t('ui.abst')}
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('pasar')}
                    disabled={rondaRollCall === 2}
                    title={rondaRollCall === 2 ? t('ui.cannotPassInTheSecondRound') : t('ui.passToSecondRound')}
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#c084fc',
                      fontWeight: '700',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: rondaRollCall === 2 ? 'not-allowed' : 'pointer',
                      opacity: rondaRollCall === 2 ? 0.35 : 1,
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem'
                    }}
                  >
                    <RotateCcw size={11} /> {t('countries.pass')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── MODO LISTA COMPACTA CON BANDERAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {paisesAsistentes.map(p => {
              const votoActual = votos[p.id];
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.25rem 0.45rem',
                    backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
                    borderRadius: '4px',
                    border: `1px solid ${votoActual ? 'rgba(59, 130, 246, 0.4)' : 'var(--subborder-color)'}`,
                    gap: '0.3rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag country={p} bandera={p.bandera} nombre={p.nombre} size="xs" />
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre}
                    </span>
                    {p.veto && <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: '800' }}>[P5]</span>}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.12rem' }}>
                    <BotonesConDerechos tipoVotacion={tipoVotacion} onVote={v => registrarVotoPais(p.id, v)} voto={votoActual} conDerechos={votacionSesion?.derechos?.[p.id]} />
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'favor' ? null : 'favor')}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'favor' ? '#22c55e' : 'rgba(34, 197, 94, 0.15)',
                        color: votoActual === 'favor' ? '#fff' : '#22c55e',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      {t('ui.yes')}
                    </button>
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'contra' ? null : 'contra')}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'contra' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                        color: votoActual === 'contra' ? '#fff' : '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      {t('ui.no')}
                    </button>
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'abstencion' ? null : 'abstencion')}
                      disabled={p.estatus === 'Presente y Votando'}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'abstencion' ? '#eab308' : 'rgba(234, 179, 8, 0.15)',
                        color: votoActual === 'abstencion' ? '#fff' : '#eab308',
                        cursor: p.estatus === 'Presente y Votando' ? 'not-allowed' : 'pointer',
                        opacity: p.estatus === 'Presente y Votando' ? 0.3 : 1,
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      {t('ui.abst')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ListaDerechos paises={paises} sesion={votacionSesion} votacionTerminada={votacionTerminada} />

      {/* ── FOOTER RESULTADOS EN VIVO (Estilo Debate Agenda) ── */}
      <div style={{
        padding: '0.4rem 0.6rem',
        borderTop: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.3rem',
        flexShrink: 0
      }}>
        {/* Conteo y Estado con Tabular Nums */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.74rem',
          fontWeight: '750',
          fontFamily: 'var(--font-family)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          <span style={{ color: 'var(--success-color)' }}>{t('ui.f')} {favor}</span>
          <span style={{ color: 'var(--danger-color)' }}>{t('ui.ag')} {contra}</span>
          {tipoVotacion === 'substantive' && <span style={{ color: 'var(--warning-color)' }}>{t('ui.ab')} {abstencion}</span>}
          <span style={{ color: 'var(--accent-color)' }}>{t('ui.req')} {requeridos}</span>
        </div>

        {/* Estado / Dictamen Interactivo y Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {votacionTerminada && (
            <button
              type="button"
              onClick={() => {
                const res = irASiguienteTema();
                setIndiceRollCall(0);
                setRondaRollCall(1);
                setPaisesPasados([]);
                setShowResultModal(false);
                if (res?.siguienteTema) {
                  const msg = t('voting.nextTopicActivatedDesc', {
                    topic: res.siguienteTema,
                    defaultValue: `Tema activo: ${res.siguienteTema}`
                  });
                  addToast({
                    title: t('voting.nextTopicActivatedTitle', 'Siguiente punto de agenda'),
                    message: msg,
                    description: msg,
                    type: 'success'
                  });
                } else {
                  const msg = t('voting.allTopicsCompletedDesc', 'Se han concluido todos los puntos de agenda propuestos.');
                  addToast({
                    title: t('voting.agendaCompletedTitle', 'Agenda concluida'),
                    message: msg,
                    description: msg,
                    type: 'info'
                  });
                }
              }}
              title={siguienteTemaAgenda
                ? `${t('voting.goToNextTopicTitle', 'Avanzar automáticamente al siguiente punto de agenda')}: ${siguienteTemaAgenda.titulo}`
                : t('voting.goToNextTopicTitle', 'Avanzar automáticamente al siguiente punto de agenda')}
              style={{
                backgroundColor: 'var(--btn-bg)',
                border: '1px solid var(--btn-bg)',
                color: 'var(--btn-text)',
                padding: '0.18rem 0.5rem',
                borderRadius: 'var(--border-radius, 4px)',
                fontSize: '0.68rem',
                fontWeight: '750',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{t('voting.goToNextTopic', 'Ir a siguiente tema')}</span>
              <ArrowRight size={11} />
            </button>
          )}

          <div
            onClick={() => votosEmitidos > 0 && setShowResultModal(true)}
            style={{
              fontSize: '0.68rem',
              fontWeight: '800',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              backgroundColor: estadoVotacion === 'APROBADA'
                ? 'rgba(164, 212, 179, 0.2)'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? 'rgba(237, 170, 161, 0.2)'
                  : 'rgba(203, 181, 141, 0.2)',
              color: estadoVotacion === 'APROBADA'
                ? 'var(--success-color)'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? 'var(--danger-color)'
                  : 'var(--warning-color)',
              border: `1px solid ${estadoVotacion === 'APROBADA' ? 'var(--success-color)' : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO' ? 'var(--danger-color)' : 'var(--warning-color)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              cursor: votosEmitidos > 0 ? 'pointer' : 'default'
            }}
          >
            {estadoVotacion === 'APROBADA' && <CheckCircle2 size={11} />}
            {estadoVotacion === 'RECHAZADA' && <XCircle size={11} />}
            {estadoVotacion === 'VETO EJERCIDO' && <ShieldAlert size={11} />}
            <span>{estadoVotacion}</span>
          </div>

          <button
            onClick={handleReset}
            title={t('voting.resetVoting')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── MODAL DE RESULTADO FINAL EN GRANDE (WOW Effect) ── */}
      {showResultModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: `2px solid ${
              estadoVotacion === 'APROBADA'
                ? '#22c55e'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? '#ef4444'
                  : '#3b82f6'
            }`,
            borderRadius: '10px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '0.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            animation: 'scaleUp 0.2s ease'
          }}>
            {/* Gran Icono de Estado */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: estadoVotacion === 'APROBADA'
                ? 'rgba(34, 197, 94, 0.2)'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO' ? '#ef4444' : '#3b82f6'
            }}>
              {estadoVotacion === 'APROBADA' && <CheckCircle2 size={36} />}
              {estadoVotacion === 'RECHAZADA' && <XCircle size={36} />}
              {estadoVotacion === 'VETO EJERCIDO' && <ShieldAlert size={36} />}
              {estadoVotacion === 'EN CURSO' && <Vote size={32} />}
            </div>

            <div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '900',
                letterSpacing: '0.02em',
                color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO' ? '#ef4444' : '#3b82f6'
              }}>
                {estadoVotacion === 'APROBADA' ? t('ui.amendmentPassed') : estadoVotacion === 'RECHAZADA' ? t('ui.amendmentRejected') : estadoVotacion === 'VETO EJERCIDO' ? t('ui.vetoExercised') : t('ui.partialResult')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-color)', marginTop: '2px', fontWeight: '700' }}>
                {asunto}
              </div>
            </div>

            {/* Marcador de Votos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.4rem',
              width: '100%',
              backgroundColor: 'var(--card-header-bg)',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--subborder-color)'
            }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: '700' }}>{t('voting.inFavorUpper')}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#22c55e' }}>{favor}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: '700' }}>{t('voting.againstUpper')}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ef4444' }}>{contra}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#eab308', fontWeight: '700' }}>{t('voting.abstentionUpper')}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#eab308' }}>{abstencion}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
              {t('ui.requiredThreshold')} {requeridos} {t('ui.votes')}{tipoMayoria === 'simple' ? t('ui.simpleMajority') : tipoMayoria === '2/3' ? '2/3' : t('voting.consensusShort')})
            </div>

            {/* Acciones directas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', marginTop: '0.2rem' }}>
              {enmiendaAsociada && (
                <button
                  onClick={() => handleAplicarDecisionEnmienda(estadoVotacion === 'APROBADA' ? 'aceptada' : 'rechazada')}
                  style={{
                    backgroundColor: estadoVotacion === 'APROBADA' ? '#16a34a' : '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  {estadoVotacion === 'APROBADA' ? <FileCheck2 size={13} /> : <FileX2 size={13} />} {estadoVotacion === 'APROBADA' ? t('ui.applyAcceptanceToResolution') : t('ui.recordAsRejected')}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const res = irASiguienteTema();
                  setIndiceRollCall(0);
                  setRondaRollCall(1);
                  setPaisesPasados([]);
                  setShowResultModal(false);
                  if (res?.siguienteTema) {
                    const msg = t('voting.nextTopicActivatedDesc', {
                      topic: res.siguienteTema,
                      defaultValue: `Tema activo: ${res.siguienteTema}`
                    });
                    addToast({
                      title: t('voting.nextTopicActivatedTitle', 'Siguiente punto de agenda'),
                      message: msg,
                      description: msg,
                      type: 'success'
                    });
                  } else {
                    const msg = t('voting.allTopicsCompletedDesc', 'Se han concluido todos los puntos de agenda propuestos.');
                    addToast({
                      title: t('voting.agendaCompletedTitle', 'Agenda concluida'),
                      message: msg,
                      description: msg,
                      type: 'info'
                    });
                  }
                }}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  border: '1px solid var(--btn-bg)',
                  color: 'var(--btn-text)',
                  padding: '0.48rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  fontSize: '0.74rem',
                  fontWeight: '750',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{t('voting.goToNextTopic', 'Ir a siguiente tema')}</span>
                <ArrowRight size={13} />
              </button>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('ui.newVote')}
                </button>
                <button
                  onClick={() => setShowResultModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    color: 'var(--btn-text)',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('ui.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE AJUSTES ── */}
      {showSettings && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '8px',
            padding: '0.9rem',
            width: '100%',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            boxShadow: isLight ? '0 12px 30px rgba(0,0,0,0.15)' : '0 12px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>{t('ui.votingSettings2')}</div>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleGuardarAjustes} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  {t('ui.subjectMotionAmendment')}
                </label>
                <input
                  type="text"
                  value={tempAsunto}
                  onChange={e => setTempAsunto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                  placeholder={t('ui.eGAdditionAmendmentArt2')}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  {t('ui.natureOfVote')}
                </label>
                <select
                  value={tempTipoVotacion}
                  onChange={e => setTempTipoVotacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="procedural">{t('ui.proceduralNoAbstentions')}</option>
                  <option value="substantive">{t('ui.substantiveAbstentionsAllowed')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  {t('ui.majorityThreshold')}
                </label>
                <select
                  value={tempTipoMayoria}
                  onChange={e => setTempTipoMayoria(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="simple">{t('ui.simpleMajority501')}</option>
                  <option value="2/3">{t('ui.twoThirds23')}</option>
                  <option value="consensus">{t('voting.consensusShort')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                <input
                  type="checkbox"
                  id="chkMiniVeto"
                  checked={tempAplicarVeto}
                  onChange={e => setTempAplicarVeto(e.target.checked)}
                />
                <label htmlFor="chkMiniVeto" style={{ fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}>
                  {t('ui.enableVetoPowerP5')}
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('toast.cancelBtn')}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'var(--btn-text)',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('ui.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE VOTACIÓN EXPANDIDA PANORÁMICA ── */}
      {showExpandedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Header del Modal Expandido */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--subborder-color)',
              backgroundColor: 'var(--card-header-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Vote size={18} style={{ color: 'var(--muted-text)' }} />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '800' }}>{asunto}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                    {totalAsistentes} {t('ui.delegationsMajority')} {tipoMayoria} · {tipoVotacion === 'substantive' ? t('voting.substantiveShort') : t('voting.proceduralShort')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowExpandedModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '5px',
                  padding: '0.35rem 0.55rem',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
              >
                <Minimize2 size={14} /> {t('ui.closeView')}
              </button>
            </div>

            {/* Contenido del Modal Expandido */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Resumen de Resultados */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.6rem'
              }}>
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#22c55e' }}>{t('voting.inFavorUpper')}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#22c55e' }}>{favor}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ef4444' }}>{t('voting.againstUpper')}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ef4444' }}>{contra}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#eab308' }}>{t('ui.abstentions')}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#eab308' }}>{abstencion}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3b82f6' }}>{t('ui.required')}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#3b82f6' }}>{requeridos}</div>
                </div>
              </div>

              {/* Matriz Completa de Votos */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  {t('ui.voteBreakdownByDelegation')}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.4rem'
                }}>
                  {paisesAsistentes.map(p => {
                    const voto = votos[p.id];
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
                          borderRadius: '5px',
                          border: `1px solid ${
                            voto === 'favor'
                              ? 'rgba(34, 197, 94, 0.5)'
                              : voto === 'contra'
                                ? 'rgba(239, 68, 68, 0.5)'
                                : voto === 'abstencion'
                                  ? 'rgba(234, 179, 8, 0.5)'
                                  : 'var(--subborder-color)'
                          }`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CountryFlag country={p} bandera={p.bandera} nombre={p.nombre} size="xs" />
                          <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>{p.nombre}</span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          color: voto === 'favor' ? '#22c55e' : voto === 'contra' ? '#ef4444' : voto === 'abstencion' ? '#eab308' : 'var(--muted-text)'
                        }}>
                          {voto ? voto.toUpperCase() : t('voting.pendingUpper')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniVotacion;

