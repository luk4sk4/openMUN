import i18n from '../../languages/index.js';
import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  VolumeX,
  Vote,
  Hand,
  ListFilter,
  XCircle,
  Plus,
  Minus,
  Settings,
  Maximize2,
  FileCheck2,
  FileX2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Crown,
  CheckCircle2
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { BotonesConDerechos, ListaDerechos } from './VotosConDerechos';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { playTimerAlarm } from '../../utils/audioAlerts';

/**
 * Panel Unificado de Enmiendas:
 * Combina el cronómetro de orador para debate de enmiendas y la votación (mano alzada / roll call)
 * en un único componente cohesivo, profesional y accesible.
 */
const PanelEnmiendasVotacion = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const {
    paises = [],
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    enmiendasSesion = {},
    resolverEnmiendaResolucion,
    registrarIntervencion
  } = useSession();

  // Vista activa del panel: 'unificada' | 'cronometro' | 'votacion'
  const [vistaPanel, setVistaPanel] = useState('unificada');
  const [modoVotacion, setModoVotacion] = useState('manos'); // 'manos' | 'rollcall' | 'lista'
  const [showSettings, setShowSettings] = useState(false);

  // Delegaciones presentes
  const paisesAsistentes = useMemo(() => {
    return (paises || []).filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises]);

  const totalAsistentes = paisesAsistentes.length;

  /* ─────────────────────────────────────────────────────────────
     ESTADOS Y LÓGICA DEL CRONÓMETRO DE ENMIENDA
  ───────────────────────────────────────────────────────────── */
  const [tiempoInicial, setTiempoInicial] = useState(60);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [corriendo, setCorriendo] = useState(false);
  const [paisSeleccionado, setPaisSeleccionado] = useState('');
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [intervencionGuardadaFeedback, setIntervencionGuardadaFeedback] = useState(false);

  useEffect(() => {
    if (paisesAsistentes.length > 0 && !paisSeleccionado) {
      setPaisSeleccionado(paisesAsistentes[0].nombre);
    }
  }, [paisesAsistentes, paisSeleccionado]);

  useEffect(() => {
    let interval = null;
    if (corriendo) {
      interval = setInterval(() => {
        setSegundosRestantes(prev => {
          if (prev === 1 && sonidoHabilitado) {
            playTimerAlarm(0.3);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [corriendo, sonidoHabilitado]);

  const handleSeleccionarPreset = (s) => {
    setTiempoInicial(s);
    setSegundosRestantes(s);
    setCorriendo(false);
  };

  const handleAjustarTiempo = (delta) => {
    setSegundosRestantes(prev => Math.max(0, prev + delta));
  };

  const handleResetTiempo = () => {
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
  };

  const handleGuardarIntervencion = () => {
    if (!paisSeleccionado) return;
    const tiempoHablado = Math.max(1, tiempoInicial - Math.max(0, segundosRestantes));
    const overtime = segundosRestantes < 0 ? Math.abs(segundosRestantes) : 0;
    if (registrarIntervencion) {
      registrarIntervencion(paisSeleccionado, tiempoInicial, tiempoHablado, overtime);
    }
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
    setIntervencionGuardadaFeedback(true);
    setTimeout(() => setIntervencionGuardadaFeedback(false), 2000);
  };

  const formatTiempo = (totalSeg) => {
    const isNeg = totalSeg < 0;
    const abs = Math.abs(totalSeg);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${isNeg ? '-' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const paisOradorObj = useMemo(() => {
    return (paises || []).find(p => p.nombre?.toLowerCase() === paisSeleccionado?.toLowerCase()) || null;
  }, [paises, paisSeleccionado]);

  const colorReloj = segundosRestantes < 0
    ? 'var(--danger-color, #edaaa1)'
    : segundosRestantes <= 10
      ? 'var(--danger-color, #edaaa1)'
      : segundosRestantes <= 20
        ? 'var(--timer-orange-color, #ea580c)'
        : 'var(--text-color, #f7f2eb)';

  const porcentajeTiempo = tiempoInicial > 0
    ? Math.max(0, Math.min(100, (Math.max(0, segundosRestantes) / tiempoInicial) * 100))
    : 0;

  /* ─────────────────────────────────────────────────────────────
     ESTADOS Y LÓGICA DE VOTACIÓN DE ENMIENDA
  ───────────────────────────────────────────────────────────── */
  const {
    asunto = i18n.t('ui.amendmentVote'),
    tipoVotacion = 'procedural',
    tipoMayoria = 'simple',
    aplicarVeto = true,
    votos = {}
  } = votacionSesion || {};

  const [tempAsunto, setTempAsunto] = useState(asunto);
  const [tempTipoVotacion, setTempTipoVotacion] = useState(tipoVotacion);
  const [tempTipoMayoria, setTempTipoMayoria] = useState(tipoMayoria);
  const [tempAplicarVeto, setTempAplicarVeto] = useState(aplicarVeto);

  // Estados Roll Call
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [rondaRollCall, setRondaRollCall] = useState(1);
  const [paisesPasados, setPaisesPasados] = useState([]);

  const listaRollCall = useMemo(() => {
    if (rondaRollCall === 1) {
      return [...paisesAsistentes].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
    }
    return paisesAsistentes
      .filter(p => paisesPasados.includes(p.id))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
  }, [paisesAsistentes, rondaRollCall, paisesPasados]);

  const paisRollCallActual = (indiceRollCall >= 0 && indiceRollCall < listaRollCall.length)
    ? listaRollCall[indiceRollCall]
    : null;

  // Conteo de votos
  const { favor, contra, abstencion } = useMemo(() => {
    let f = 0, c = 0, a = 0;
    paisesAsistentes.forEach(p => {
      const v = votos[p.id];
      if (v === 'favor') f++;
      else if (v === 'contra') c++;
      else if (v === 'abstencion') a++;
    });
    return { favor: f, contra: c, abstencion: a };
  }, [paisesAsistentes, votos]);

  const votosEmitidos = favor + contra + abstencion;
  // Enmienda asociada
  const enmiendaAsociada = useMemo(() => {
    const list = Array.isArray(enmiendasSesion)
      ? enmiendasSesion
      : (enmiendasSesion?.enmiendas || []);
    return list.find(e =>
      asunto.toLowerCase().includes(e.articuloNumero?.toLowerCase() || '---') ||
      asunto.toLowerCase().includes(e.paisProponente?.toLowerCase() || '---')
    ) || null;
  }, [asunto, enmiendasSesion]);

  const proponenteDetectado = useMemo(() => {
    const match = asunto.match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const nom = match[1].trim();
      const p = (paises || []).find(item => item.nombre?.toLowerCase() === nom.toLowerCase());
      return { nombre: nom, paisObj: p };
    }
    return null;
  }, [asunto, paises]);

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

  const handleVotarRollCall = (opcion) => {
    if (!paisRollCallActual) return;
    if (opcion === 'pasar') {
      if (rondaRollCall === 1 && !paisesPasados.includes(paisRollCallActual.id)) {
        setPaisesPasados(prev => [...prev, paisRollCallActual.id]);
      }
    } else {
      registrarVotoPais(paisRollCallActual.id, opcion);
    }

    if (indiceRollCall < listaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else if (rondaRollCall === 1 && paisesPasados.length > 0) {
      setRondaRollCall(2);
      setIndiceRollCall(0);
    } else {
      setIndiceRollCall(listaRollCall.length);
    }
  };

  const handleAnteriorRollCall = () => {
    setIndiceRollCall(prev => Math.max(0, prev - 1));
  };

  const handleSiguienteRollCall = () => {
    setIndiceRollCall(prev => Math.min(listaRollCall.length, prev + 1));
  };

  const handleResetVotacion = () => {
    resetearVotacion();
    setIndiceRollCall(0);
    setRondaRollCall(1);
    setPaisesPasados([]);
  };

  const handleAplicarDecisionEnmienda = (decision) => {
    if (enmiendaAsociada && resolverEnmiendaResolucion) {
      resolverEnmiendaResolucion(enmiendaAsociada.id, decision);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-color, #363636)',
      color: 'var(--text-color, #f7f2eb)',
      borderRadius: 'var(--border-radius, 6px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── CABECERA PRINCIPAL UNIFICADA ── */}
      <div style={{
        padding: '0.65rem 0.95rem',
        borderBottom: '1px solid var(--subborder-color, #414141)',
        backgroundColor: 'var(--card-header-bg, #303030)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.6rem',
        flexShrink: 0
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: '800',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {asunto || t('ui.amendmentDebateAndVoting')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
            <span>{tipoVotacion === 'substantive' ? t('voting.substantiveShort') : t('voting.proceduralShort')}</span>
            {proponenteDetectado && (
              <>
                <span>·</span>
                <CountryFlag country={proponenteDetectado.paisObj} size="xs" />
                <span style={{ fontWeight: '650', color: 'var(--text-color)' }}>{proponenteDetectado.nombre}</span>
              </>
            )}
          </div>
        </div>

        {/* Selector de Vista: Unificada / Solo Cronómetro / Solo Votación */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          backgroundColor: 'var(--input-bg, rgba(255,255,255,0.04))',
          padding: '3px',
          borderRadius: 'var(--border-radius, 6px)',
          border: '1px solid var(--border-color, #4b4b4b)'
        }}>
          <button
            type="button"
            onClick={() => setVistaPanel('unificada')}
            title={t('ui.fullViewTimerVoting')}
            aria-pressed={vistaPanel === 'unificada'}
            style={{
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: vistaPanel === 'unificada' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'unificada' ? 'var(--btn-bg)' : 'transparent',
              color: vistaPanel === 'unificada' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.12s ease'
            }}
          >
            {t('ui.full')}
          </button>
          <button
            type="button"
            onClick={() => setVistaPanel('cronometro')}
            title={t('ui.speakerTimerOnly')}
            aria-pressed={vistaPanel === 'cronometro'}
            style={{
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: vistaPanel === 'cronometro' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'cronometro' ? 'var(--btn-bg)' : 'transparent',
              color: vistaPanel === 'cronometro' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.12s ease'
            }}
          >
            {t('timers.title')}
          </button>
          <button
            type="button"
            onClick={() => setVistaPanel('votacion')}
            title={t('ui.votingOnly')}
            aria-pressed={vistaPanel === 'votacion'}
            style={{
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: vistaPanel === 'votacion' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'votacion' ? 'var(--btn-bg)' : 'transparent',
              color: vistaPanel === 'votacion' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.12s ease'
            }}
          >
            {t('tabs.voting')}
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL CON SCROLL (Aprovechamiento Vertical) ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem'
      }}>
        {/* ══════════════════════════════════════════════════════
            BLOQUE 1: CRONÓMETRO DE DEBATE / INTERVENCIÓN
        ══════════════════════════════════════════════════════ */}
        {(vistaPanel === 'unificada' || vistaPanel === 'cronometro') && (
          <div style={{
            backgroundColor: 'var(--panel-color, #363636)',
            border: '1px solid var(--border-color, #4b4b4b)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Fila Orador y Sonido */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color, #4b4b4b)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                <CountryFlag country={paisOradorObj} size="sm" />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '750', textTransform: 'uppercase', color: 'var(--muted-text)', letterSpacing: '0.04em' }}>
                    {t('ui.currentSpeaker')}
                  </span>
                  {paisesAsistentes.length > 0 ? (
                    <select
                      value={paisSeleccionado}
                      onChange={e => setPaisSeleccionado(e.target.value)}
                      aria-label={t('ui.selectSpeakerCountry')}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        fontSize: '0.92rem',
                        fontWeight: '800',
                        outline: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        margin: 0,
                        width: '100%'
                      }}
                    >
                      {paisesAsistentes.map(p => (
                        <option key={p.id} value={p.nombre} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                          {p.nombre} {p.estatus === 'Presente y Votando' ? t('ui.pV2') : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {t('ui.noDelegationsPresent')}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSonidoHabilitado(s => !s)}
                title={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
                aria-label={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
                style={{
                  background: sonidoHabilitado ? 'var(--accent-soft, rgba(239, 163, 127, 0.12))' : 'transparent',
                  border: `1px solid ${sonidoHabilitado ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  color: sonidoHabilitado ? 'var(--accent-color)' : 'var(--muted-text)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {sonidoHabilitado ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>

            {/* Display del Tiempo (Limpio, Nítido, Sin Sombras Difusas en Modo Claro) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.35rem 0 0.5rem 0'
            }}>
              <div style={{
                fontSize: vistaPanel === 'cronometro' ? '4.4rem' : '3.4rem',
                fontWeight: '800',
                fontFamily: 'var(--font-family)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                color: colorReloj,
                lineHeight: 1,
                textShadow: 'var(--timer-digits-shadow, none)',
                transition: 'color 0.2s ease'
              }}>
                {formatTiempo(segundosRestantes)}
              </div>

              {/* Barra de Progreso */}
              <div style={{
                width: '100%',
                maxWidth: '440px',
                height: '7px',
                backgroundColor: 'var(--border-color, #4b4b4b)',
                borderRadius: '999px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${porcentajeTiempo}%`,
                  height: '100%',
                  backgroundColor: segundosRestantes <= 10
                    ? 'var(--danger-color, #edaaa1)'
                    : segundosRestantes <= 20
                      ? 'var(--timer-orange-color, #f97316)'
                      : 'var(--accent-color, #efa37f)',
                  borderRadius: '999px',
                  transition: 'width 1s linear, background-color 0.3s ease'
                }} />
              </div>
            </div>

            {/* Presets Rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem', width: '100%' }}>
              {[30, 45, 60, 90, 120].map(s => {
                const isActivo = tiempoInicial === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSeleccionarPreset(s)}
                    aria-pressed={isActivo}
                    style={{
                      backgroundColor: isActivo ? 'var(--btn-bg)' : 'var(--input-bg, rgba(255,255,255,0.04))',
                      border: `1px solid ${isActivo ? 'var(--btn-bg)' : 'var(--border-color)'}`,
                      color: isActivo ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      minHeight: '35px',
                      fontSize: '0.82rem',
                      fontWeight: isActivo ? '800' : '650',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {s}s
                  </button>
                );
              })}
            </div>

            {/* Controles Principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '0.4rem', width: '100%' }}>
              <button
                type="button"
                onClick={() => handleAjustarTiempo(-10)}
                title={t('ui.10Seconds')}
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0 0.85rem',
                  minHeight: '38px',
                  fontSize: '0.82rem',
                  fontWeight: '750',
                  cursor: 'pointer'
                }}
              >
                -10s
              </button>

              <button
                type="button"
                onClick={() => setCorriendo(c => !c)}
                style={{
                  backgroundColor: corriendo ? 'var(--warning-solid, #7a591e)' : 'var(--btn-bg)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0 1rem',
                  minHeight: '38px',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.12s ease'
                }}
              >
                {corriendo ? <Pause size={16} /> : <Play size={16} />}
                <span>{corriendo ? t('agenda.pauseTimer') : t('timers.start')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAjustarTiempo(10)}
                title={t('ui.10Seconds2')}
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0 0.85rem',
                  minHeight: '38px',
                  fontSize: '0.82rem',
                  fontWeight: '750',
                  cursor: 'pointer'
                }}
              >
                +10s
              </button>

              <button
                type="button"
                onClick={handleResetTiempo}
                title={t('ui.resetTurn')}
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0',
                  minHeight: '38px',
                  width: '38px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Concluir turno */}
            <button
              type="button"
              onClick={handleGuardarIntervencion}
              style={{
                width: '100%',
                backgroundColor: intervencionGuardadaFeedback ? 'var(--success-solid, #34724b)' : 'var(--input-bg, rgba(255,255,255,0.03))',
                border: `1px solid ${intervencionGuardadaFeedback ? 'var(--success-solid)' : 'var(--border-color)'}`,
                color: intervencionGuardadaFeedback ? '#ffffff' : 'var(--text-color)',
                borderRadius: 'var(--border-radius, 6px)',
                minHeight: '35px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '750',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Check size={14} />
              <span>{intervencionGuardadaFeedback ? t('ui.turnSaved') : t('ui.concludeSpeakerSTurn')}</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BLOQUE 2: VOTACIÓN DE LA ENMIENDA (Alta Visibilidad)
        ══════════════════════════════════════════════════════ */}
        {(vistaPanel === 'unificada' || vistaPanel === 'votacion') && (
          <div style={{
            backgroundColor: 'var(--panel-color, #363636)',
            border: '1px solid var(--border-color, #4b4b4b)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {/* Selector de Modo de Votación: Mano Alzada / Roll Call / Lista */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'var(--card-header-bg, #303030)',
                padding: '3px',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid var(--border-color, #4b4b4b)'
              }}>
                <button
                  type="button"
                  onClick={() => setModoVotacion('manos')}
                  title={t('ui.showOfHandsVotingCounters')}
                  aria-pressed={modoVotacion === 'manos'}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: modoVotacion === 'manos' ? '750' : '600',
                    borderRadius: '4px',
                    border: 'none',
                    background: modoVotacion === 'manos' ? 'var(--btn-bg)' : 'transparent',
                    color: modoVotacion === 'manos' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <Hand size={13} />
                  <span>{t('ui.showOfHands')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoVotacion('rollcall')}
                  title={t('ui.rollCallModeNominalVoting')}
                  aria-pressed={modoVotacion === 'rollcall'}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: modoVotacion === 'rollcall' ? '750' : '600',
                    borderRadius: '4px',
                    border: 'none',
                    background: modoVotacion === 'rollcall' ? 'var(--btn-bg)' : 'transparent',
                    color: modoVotacion === 'rollcall' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <ListFilter size={13} />
                  <span>Roll Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoVotacion('lista')}
                  title={t('ui.viewFullCountryList')}
                  aria-pressed={modoVotacion === 'lista'}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: modoVotacion === 'lista' ? '750' : '600',
                    borderRadius: '4px',
                    border: 'none',
                    background: modoVotacion === 'lista' ? 'var(--btn-bg)' : 'transparent',
                    color: modoVotacion === 'lista' ? 'var(--btn-text, #ffffff)' : 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <Layers size={13} />
                  <span>{t('ui.list')}</span>
                </button>
              </div>

              {/* Botón Reiniciar votos */}
              <button
                type="button"
                onClick={handleResetVotacion}
                title={t('voting.resetVotingTitle')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--muted-text)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.12s ease'
                }}
              >
                <RotateCcw size={12} />
                <span>{t('ui.reset')}</span>
              </button>
            </div>

            {/* Vista Modo Mano Alzada (Contadores Claros con Steppers) */}
            {modoVotacion === 'manos' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: tipoVotacion === 'substantive' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: '0.6rem'
              }}>
                {/* Tarjeta A Favor */}
                <div style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color, #4b4b4b)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.75rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.45rem',
                  textAlign: 'center'
                }}>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--success-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
                    {t('voting.inFavor')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => decrementarVoto('favor')}
                      disabled={favor <= 0}
                      title={t('ui.subtractAVoteInFavor2')}
                      style={{
                        width: '36px',
                        height: '36px',
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
                      <Minus size={15} />
                    </button>
                    <span style={{
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '2.4rem',
                      fontWeight: '800',
                      color: 'var(--success-color)',
                      minWidth: '42px',
                      textAlign: 'center',
                      lineHeight: 1
                    }}>
                      {favor}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementarVoto('favor')}
                      disabled={votosEmitidos >= totalAsistentes}
                      title={t('ui.addAVoteInFavor2')}
                      style={{
                        width: '36px',
                        height: '36px',
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
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => votarTodos('favor')}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      borderRadius: '4px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {t('sidebar.categories.all')}
                  </button>
                </div>

                {/* Tarjeta En Contra */}
                <div style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color, #4b4b4b)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.75rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.45rem',
                  textAlign: 'center'
                }}>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--danger-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger-color)' }} />
                    {t('voting.against')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => decrementarVoto('contra')}
                      disabled={contra <= 0}
                      title={t('ui.subtractAVoteAgainst2')}
                      style={{
                        width: '36px',
                        height: '36px',
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
                      <Minus size={15} />
                    </button>
                    <span style={{
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '2.4rem',
                      fontWeight: '800',
                      color: 'var(--danger-color)',
                      minWidth: '42px',
                      textAlign: 'center',
                      lineHeight: 1
                    }}>
                      {contra}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementarVoto('contra')}
                      disabled={votosEmitidos >= totalAsistentes}
                      title={t('ui.addAVoteAgainst2')}
                      style={{
                        width: '36px',
                        height: '36px',
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
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => votarTodos('contra')}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--panel-color)',
                      color: 'var(--text-color)',
                      borderRadius: '4px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {t('sidebar.categories.all')}
                  </button>
                </div>

                {/* Tarjeta Abstención (si sustantiva) */}
                {tipoVotacion === 'substantive' && (
                  <div style={{
                    backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color, #4b4b4b)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.75rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.45rem',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--warning-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--warning-color)' }} />
                      {t('voting.abstention')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => decrementarVoto('abstencion')}
                        disabled={abstencion <= 0}
                        title={t('ui.subtractAnAbstention')}
                        style={{
                          width: '36px',
                          height: '36px',
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
                        <Minus size={15} />
                      </button>
                      <span style={{
                        fontFamily: 'var(--font-family)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '2.4rem',
                        fontWeight: '800',
                        color: 'var(--warning-color)',
                        minWidth: '42px',
                        textAlign: 'center',
                        lineHeight: 1
                      }}>
                        {abstencion}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementarVoto('abstencion')}
                        disabled={votosEmitidos >= totalAsistentes}
                        title={t('ui.addAnAbstention')}
                        style={{
                          width: '36px',
                          height: '36px',
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
                        <Plus size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => votarTodos('abstencion')}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: 'var(--panel-color)',
                        color: 'var(--text-color)',
                        borderRadius: '4px',
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {t('sidebar.categories.all')}
                    </button>
                  </div>
                )}
              </div>
            ) : modoVotacion === 'rollcall' ? (
              /* Modo Roll Call (OpenMUN Design System: Delegación Destacada y Botones Sólidos) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* Banner de Ronda y Progreso */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.35rem',
                  borderBottom: '1px solid var(--subborder-color)'
                }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    color: rondaRollCall === 2 ? 'var(--timer-orange-color, #ea580c)' : 'var(--accent-color)'
                  }}>
                    {rondaRollCall === 1 ? t('ui.firstRoundRollCallVoting') : t('ui.secondRoundDelegationsThatPassed')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '650' }}>
                    {paisRollCallActual ? t('ui.turnOf', { v0: indiceRollCall + 1, v1: listaRollCall.length }) : t('ui.roundCompleted')}
                  </span>
                </div>

                {paisRollCallActual ? (
                  <div style={{
                    backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.9rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    {/* Cabecera de la delegación en turno */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <CountryFlag country={paisRollCallActual} size="md" />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: '750',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: paisRollCallActual.estatus === 'Presente y Votando' ? 'var(--info-soft, rgba(51,95,133,0.12))' : 'var(--card-hover)',
                              color: paisRollCallActual.estatus === 'Presente y Votando' ? 'var(--info-color)' : 'var(--muted-text)'
                            }}>
                              {t(`sessionValues.${paisRollCallActual.estatus}`, paisRollCallActual.estatus)}
                            </span>
                            {paisRollCallActual.veto && aplicarVeto && (
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: '800',
                                color: 'var(--timer-orange-color, #ea580c)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Crown size={13} /> Veto (P5)
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            color: 'var(--text-color)',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {paisRollCallActual.nombre}
                          </div>
                        </div>
                      </div>

                      {/* Controles de navegación manual entre delegaciones */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={handleAnteriorRollCall}
                          disabled={indiceRollCall === 0}
                          title={t('ui.previousDelegation')}
                          aria-label={t('ui.previousDelegation')}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--panel-color)',
                            color: 'var(--text-color)',
                            cursor: indiceRollCall === 0 ? 'not-allowed' : 'pointer',
                            opacity: indiceRollCall === 0 ? 0.35 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={handleSiguienteRollCall}
                          disabled={indiceRollCall >= listaRollCall.length - 1}
                          title={t('ui.nextDelegation')}
                          aria-label={t('ui.nextDelegation')}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--panel-color)',
                            color: 'var(--text-color)',
                            cursor: indiceRollCall >= listaRollCall.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: indiceRollCall >= listaRollCall.length - 1 ? 0.35 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Voto actual registrado si ya votó */}
                    {votos[paisRollCallActual.id] && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.74rem',
                        fontWeight: '750',
                        color: 'var(--accent-color)',
                        backgroundColor: 'var(--accent-soft, rgba(239, 163, 127, 0.08))',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        alignSelf: 'flex-start'
                      }}>
                        <span>{t('ui.voteRecorded')}</span>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {votos[paisRollCallActual.id] === 'favor'
                            ? t('voting.inFavor')
                            : votos[paisRollCallActual.id] === 'contra'
                              ? t('voting.against')
                              : t('voting.abstention')}
                        </strong>
                      </div>
                    )}

                    {/* Botones de Voto con Derechos (en Votaciones Sustantivas) */}
                    <BotonesConDerechos
                      tipoVotacion={tipoVotacion}
                      onVote={handleVotarRollCall}
                      voto={votos[paisRollCallActual.id]}
                      conDerechos={votacionSesion?.derechos?.[paisRollCallActual.id]}
                    />

                    {/* Botones de Voto de Alta Visibilidad */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: tipoVotacion === 'substantive' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                      gap: '0.45rem',
                      width: '100%'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleVotarRollCall('favor')}
                        style={{
                          backgroundColor: 'var(--success-solid, #34724b)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.55rem 0.5rem',
                          minHeight: '44px',
                          fontSize: '0.86rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          boxShadow: votos[paisRollCallActual.id] === 'favor' ? '0 0 0 2px var(--text-color)' : 'none',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <Check size={16} />
                        <span>{t('voting.inFavor')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVotarRollCall('contra')}
                        style={{
                          backgroundColor: 'var(--danger-solid, #a95449)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.55rem 0.5rem',
                          minHeight: '44px',
                          fontSize: '0.86rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          boxShadow: votos[paisRollCallActual.id] === 'contra' ? '0 0 0 2px var(--text-color)' : 'none',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <XCircle size={16} />
                        <span>{t('voting.against')}</span>
                      </button>

                      {tipoVotacion === 'substantive' && (
                        <button
                          type="button"
                          onClick={() => handleVotarRollCall('abstencion')}
                          disabled={paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2}
                          title={
                            rondaRollCall === 2
                              ? t('ui.abstentionIsNotAllowedInTheSecondRound2')
                              : (paisRollCallActual.estatus === 'Presente y Votando' ? t('ui.delegationsMarkedPresentAndVotingCannotAbstain2') : t('voting.abstention'))
                          }
                          style={{
                            backgroundColor: (paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'var(--input-bg)' : 'var(--warning-solid, #7a591e)',
                            color: (paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'var(--muted-text)' : '#ffffff',
                            border: (paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '1px solid var(--border-color)' : 'none',
                            borderRadius: 'var(--border-radius, 6px)',
                            padding: '0.55rem 0.5rem',
                            minHeight: '44px',
                            fontSize: '0.86rem',
                            fontWeight: '800',
                            cursor: (paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                            opacity: (paisRollCallActual.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 0.45 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            boxShadow: votos[paisRollCallActual.id] === 'abstencion' ? '0 0 0 2px var(--text-color)' : 'none',
                            transition: 'all 0.12s ease'
                          }}
                        >
                          <Minus size={16} />
                          <span>{t('voting.abstention')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleVotarRollCall('pasar')}
                        disabled={rondaRollCall === 2}
                        title={rondaRollCall === 2 ? t('ui.aVoteMustBeCastInTheSecondRound') : t('ui.passToVoteAtTheEnd')}
                        style={{
                          backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.55rem 0.5rem',
                          minHeight: '44px',
                          fontSize: '0.86rem',
                          fontWeight: '750',
                          cursor: rondaRollCall === 2 ? 'not-allowed' : 'pointer',
                          opacity: rondaRollCall === 2 ? 0.4 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>{t('countries.pass')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <CheckCircle2 size={32} color="var(--success-color)" />
                    <span style={{ fontWeight: '800', fontSize: '0.98rem' }}>{t('ui.rollCallVotingCompleted')}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)', maxWidth: '300px' }}>
                      {t('ui.votesFromTheDelegationsPresentHaveBeenRecorded')}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setIndiceRollCall(0)}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: '5px',
                          fontSize: '0.76rem',
                          fontWeight: '750',
                          cursor: 'pointer'
                        }}
                      >
                        {t('ui.reviewDelegations')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoVotacion('manos')}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: 'var(--btn-bg)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '5px',
                          fontSize: '0.76rem',
                          fontWeight: '750',
                          cursor: 'pointer'
                        }}
                      >
                        {t('ui.viewShowOfHands')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Modo Lista Completa */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {paisesAsistentes.map(p => {
                  const v = votos[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 10px',
                        backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                        borderRadius: '5px',
                        border: '1px solid var(--subborder-color)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <CountryFlag country={p} size="xs" />
                        <span style={{ fontWeight: '750', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '4px' }}>
                        <BotonesConDerechos tipoVotacion={tipoVotacion} onVote={voto => registrarVotoPais(p.id, voto)} voto={v} conDerechos={votacionSesion?.derechos?.[p.id]} />
                        <button
                          type="button"
                          onClick={() => registrarVotoPais(p.id, v === 'favor' ? null : 'favor')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: v === 'favor' ? 'var(--success-solid, #34724b)' : 'var(--panel-color)',
                            color: v === 'favor' ? '#ffffff' : 'var(--text-color)',
                            fontWeight: '750',
                            fontSize: '0.68rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t('ui.yes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => registrarVotoPais(p.id, v === 'contra' ? null : 'contra')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: v === 'contra' ? 'var(--danger-solid, #a95449)' : 'var(--panel-color)',
                            color: v === 'contra' ? '#ffffff' : 'var(--text-color)',
                            fontWeight: '750',
                            fontSize: '0.68rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t('ui.no')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Acciones de resolución si hay enmienda vinculada */}
            {enmiendaAsociada && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--subborder-color)',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                  {t('ui.applyVerdictToAmendment')}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleAplicarDecisionEnmienda('aceptada')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: '750',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'var(--success-solid, #34724b)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={13} /> {t('ui.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAplicarDecisionEnmienda('rechazada')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: '750',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'var(--danger-solid, #a95449)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <XCircle size={13} /> {t('ui.reject')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PIE DEL PANEL UNIFICADO (Resultados en Vivo) ── */}
      <ListaDerechos
        paises={paises}
        sesion={votacionSesion}
        votacionTerminada={totalAsistentes > 0 && votosEmitidos >= totalAsistentes}
      />
    </div>
  );
};

export default memo(PanelEnmiendasVotacion);
