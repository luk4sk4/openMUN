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
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Plus,
  Minus,
  Settings,
  Maximize2,
  FileCheck2,
  FileX2,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
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
    enmiendasSesion = [],
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
        ? '#f97316'
        : 'var(--text-color, #f7f2eb)';

  const porcentajeTiempo = tiempoInicial > 0
    ? Math.max(0, Math.min(100, (Math.max(0, segundosRestantes) / tiempoInicial) * 100))
    : 0;

  /* ─────────────────────────────────────────────────────────────
     ESTADOS Y LÓGICA DE VOTACIÓN DE ENMIENDA
  ───────────────────────────────────────────────────────────── */
  const {
    asunto = 'Votación de Enmienda',
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

  const paisRollCallActual = listaRollCall[indiceRollCall] || listaRollCall[0] || null;

  // Conteo de votos
  const { favor, contra, abstencion, vetoEjercido, paisesConVeto } = useMemo(() => {
    let f = 0, c = 0, a = 0;
    const vetoP = [];
    paisesAsistentes.forEach(p => {
      const v = votos[p.id];
      if (v === 'favor') f++;
      else if (v === 'contra') {
        c++;
        if (p.veto && aplicarVeto) vetoP.push(p);
      } else if (v === 'abstencion') a++;
    });
    return { favor: f, contra: c, abstencion: a, vetoEjercido: vetoP.length > 0, paisesConVeto: vetoP };
  }, [paisesAsistentes, votos, aplicarVeto]);

  const votosEmitidos = favor + contra + abstencion;
  const requeridos = useMemo(() => {
    if (tipoVotacion === 'procedural') {
      return Math.floor(totalAsistentes / 2) + 1;
    }
    const votosValidos = favor + contra;
    if (tipoMayoria === 'dos_tercios') return Math.ceil((votosValidos * 2) / 3);
    return Math.floor(votosValidos / 2) + 1;
  }, [tipoVotacion, tipoMayoria, totalAsistentes, favor, contra]);

  const estadoVotacion = useMemo(() => {
    if (vetoEjercido) return 'VETO EJERCIDO';
    if (votosEmitidos === 0) return 'EN CURSO';
    if (favor >= requeridos) return 'APROBADA';
    if (votosEmitidos === totalAsistentes) return 'RECHAZADA';
    return 'EN CURSO';
  }, [vetoEjercido, votosEmitidos, totalAsistentes, favor, requeridos]);

  // Enmienda asociada
  const enmiendaAsociada = useMemo(() => {
    return (enmiendasSesion || []).find(e =>
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
    }
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
      backgroundColor: 'var(--panel-bg, #363636)',
      color: 'var(--text-color, #f7f2eb)',
      borderRadius: 'var(--border-radius, 6px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── CABECERA PRINCIPAL UNIFICADA ── */}
      <div style={{
        padding: '0.5rem 0.8rem',
        borderBottom: '1px solid var(--subborder-color, #414141)',
        backgroundColor: 'var(--card-header-bg, #303030)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexShrink: 0
      }}>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{
            backgroundColor: 'var(--accent-soft, rgba(239, 163, 127, 0.12))',
            color: 'var(--accent-color, #efa37f)',
            padding: '4px',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Vote size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: '750',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {asunto || 'Debate y Votación de Enmienda'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.66rem', color: 'var(--muted-text)' }}>
              <span>{tipoVotacion === 'substantive' ? 'Sustantiva' : 'Procedimental'}</span>
              {proponenteDetectado && (
                <>
                  <span>·</span>
                  <CountryFlag country={proponenteDetectado.paisObj} size="xs" />
                  <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{proponenteDetectado.nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Vista: Unificada / Solo Cronómetro / Solo Votación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--input-bg, rgba(255,255,255,0.04))', padding: '2px', borderRadius: '5px', border: '1px solid var(--border-color, #4b4b4b)' }}>
          <button
            onClick={() => setVistaPanel('unificada')}
            title="Vista Completa (Cronómetro + Votación)"
            style={{
              padding: '3px 7px',
              fontSize: '0.68rem',
              fontWeight: vistaPanel === 'unificada' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'unificada' ? 'var(--accent-color)' : 'transparent',
              color: vistaPanel === 'unificada' ? '#1a1a1a' : 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            Completa
          </button>
          <button
            onClick={() => setVistaPanel('cronometro')}
            title="Solo Cronómetro de Orador"
            style={{
              padding: '3px 7px',
              fontSize: '0.68rem',
              fontWeight: vistaPanel === 'cronometro' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'cronometro' ? 'var(--accent-color)' : 'transparent',
              color: vistaPanel === 'cronometro' ? '#1a1a1a' : 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            Cronómetro
          </button>
          <button
            onClick={() => setVistaPanel('votacion')}
            title="Solo Votación"
            style={{
              padding: '3px 7px',
              fontSize: '0.68rem',
              fontWeight: vistaPanel === 'votacion' ? '750' : '600',
              borderRadius: '4px',
              border: 'none',
              background: vistaPanel === 'votacion' ? 'var(--accent-color)' : 'transparent',
              color: vistaPanel === 'votacion' ? '#1a1a1a' : 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            Votación
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL CON SCROLL ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.6rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        {/* ══════════════════════════════════════════════════════
            BLOQUE 1: CRONÓMETRO DE DEBATE / INTERVENCIÓN
        ══════════════════════════════════════════════════════ */}
        {(vistaPanel === 'unificada' || vistaPanel === 'cronometro') && (
          <div style={{
            backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-color, #4b4b4b)',
            borderRadius: '8px',
            padding: '0.65rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem'
          }}>
            {/* Fila Orador y Sonido */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                <CountryFlag country={paisOradorObj} size="xs" />
                {paisesAsistentes.length > 0 ? (
                  <select
                    value={paisSeleccionado}
                    onChange={e => setPaisSeleccionado(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-color)',
                      fontSize: '0.8rem',
                      fontWeight: '750',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: 0
                    }}
                  >
                    {paisesAsistentes.map(p => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre} {p.estatus === 'Presente y Votando' ? '(PyV)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)' }}>Sin delegaciones presentes</span>
                )}
              </div>

              <button
                onClick={() => setSonidoHabilitado(s => !s)}
                title={sonidoHabilitado ? 'Silenciar avisos' : 'Activar sonido'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: sonidoHabilitado ? 'var(--accent-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>

            {/* Display del Tiempo (Estilo Debate Agenda con Tabular Nums) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.1rem 0'
            }}>
              <div style={{
                fontSize: vistaPanel === 'cronometro' ? '3.4rem' : '2.6rem',
                fontWeight: '800',
                fontFamily: 'var(--font-family)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                color: colorReloj,
                lineHeight: 1,
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                transition: 'color 0.3s ease'
              }}>
                {formatTiempo(segundosRestantes)}
              </div>

              {/* Barra de Progreso */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                marginTop: '0.35rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${porcentajeTiempo}%`,
                  height: '100%',
                  backgroundColor: segundosRestantes <= 10 ? 'var(--danger-color, #edaaa1)' : segundosRestantes <= 20 ? '#f97316' : 'var(--accent-color, #efa37f)',
                  borderRadius: '999px',
                  transition: 'width 1s linear, background-color 0.3s ease'
                }} />
              </div>
            </div>

            {/* Presets Rápidos estilo Debate Agenda */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem', width: '100%' }}>
              {[30, 45, 60, 90, 120].map(s => (
                <button
                  key={s}
                  onClick={() => handleSeleccionarPreset(s)}
                  style={{
                    backgroundColor: tiempoInicial === s ? 'var(--accent-color)' : 'transparent',
                    border: `1px solid ${tiempoInicial === s ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    color: tiempoInicial === s ? '#1a1a1a' : 'var(--text-color)',
                    borderRadius: '5px',
                    padding: '0.25rem 0',
                    fontSize: '0.72rem',
                    fontWeight: tiempoInicial === s ? '800' : '600',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* Controles Principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '0.3rem', width: '100%' }}>
              <button
                onClick={() => handleAjustarTiempo(-10)}
                title="-10 segundos"
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: '5px',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                -10s
              </button>

              <button
                onClick={() => setCorriendo(c => !c)}
                style={{
                  backgroundColor: corriendo ? 'var(--accent-soft, rgba(239, 163, 127, 0.12))' : 'var(--btn-bg)',
                  border: corriendo ? '1px solid var(--accent-color)' : 'none',
                  color: corriendo ? 'var(--accent-color)' : '#ffffff',
                  borderRadius: '5px',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.12s ease'
                }}
              >
                {corriendo ? <Pause size={14} /> : <Play size={14} />}
                <span>{corriendo ? 'Pausar' : 'Iniciar'}</span>
              </button>

              <button
                onClick={() => handleAjustarTiempo(10)}
                title="+10 segundos"
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: '5px',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                +10s
              </button>

              <button
                onClick={handleResetTiempo}
                title="Reiniciar turno"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--muted-text)',
                  borderRadius: '5px',
                  padding: '0.3rem 0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Concluir turno */}
            <button
              onClick={handleGuardarIntervencion}
              style={{
                width: '100%',
                backgroundColor: intervencionGuardadaFeedback ? 'var(--success-solid, #386447)' : 'transparent',
                border: `1px solid ${intervencionGuardadaFeedback ? 'var(--success-color)' : 'var(--border-color)'}`,
                color: intervencionGuardadaFeedback ? '#ffffff' : 'var(--text-color)',
                borderRadius: '5px',
                padding: '0.32rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Check size={13} />
              <span>{intervencionGuardadaFeedback ? '¡Turno guardado!' : 'Concluir turno de orador'}</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BLOQUE 2: VOTACIÓN DE LA ENMIENDA
        ══════════════════════════════════════════════════════ */}
        {(vistaPanel === 'unificada' || vistaPanel === 'votacion') && (
          <div style={{
            backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-color, #4b4b4b)',
            borderRadius: '8px',
            padding: '0.65rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem'
          }}>
            {/* Selector de Modo de Votación: Mano Alzada / Roll Call / Lista */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setModoVotacion('manos')}
                  title="Votación por Mano Alzada (Contadores)"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: modoVotacion === 'manos' ? '750' : '600',
                    borderRadius: '4px',
                    border: `1px solid ${modoVotacion === 'manos' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    background: modoVotacion === 'manos' ? 'var(--accent-color)' : 'transparent',
                    color: modoVotacion === 'manos' ? '#1a1a1a' : 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Hand size={11} />
                  <span>Mano Alzada</span>
                </button>
                <button
                  onClick={() => setModoVotacion(m => m === 'rollcall' ? 'lista' : 'rollcall')}
                  title={modoVotacion === 'rollcall' ? 'Ver Lista' : 'Modo Roll Call'}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: modoVotacion !== 'manos' ? '750' : '600',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: modoVotacion !== 'manos' ? 'var(--card-hover, rgba(255,255,255,0.08))' : 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <ListFilter size={11} />
                  <span>{modoVotacion === 'lista' ? 'Lista' : 'Roll Call'}</span>
                </button>
              </div>

              {/* Botón Reiniciar votos */}
              <button
                onClick={handleResetVotacion}
                title="Reiniciar votos"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--muted-text)',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '0.66rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <RotateCcw size={10} />
                <span>Reiniciar</span>
              </button>
            </div>

            {/* Vista Modo Mano Alzada (Tarjetas con Steppers sin líneas superiores) */}
            {modoVotacion === 'manos' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: tipoVotacion === 'substantive' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: '0.45rem'
              }}>
                {/* Tarjeta A Favor */}
                <div style={{
                  backgroundColor: 'var(--panel-color, #363636)',
                  border: '1px solid var(--border-color, #4b4b4b)',
                  borderRadius: '6px',
                  padding: '0.55rem 0.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--success-color)' }}>
                    A Favor
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      onClick={() => decrementarVoto('favor')}
                      disabled={favor <= 0}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        cursor: favor <= 0 ? 'not-allowed' : 'pointer',
                        opacity: favor <= 0 ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.9rem',
                      fontWeight: '800',
                      color: 'var(--success-color)',
                      minWidth: '34px',
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
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                        opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={13} />
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
                    Todos
                  </button>
                </div>

                {/* Tarjeta En Contra */}
                <div style={{
                  backgroundColor: 'var(--panel-color, #363636)',
                  border: '1px solid var(--border-color, #4b4b4b)',
                  borderRadius: '6px',
                  padding: '0.55rem 0.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--danger-color)' }}>
                    En Contra
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      onClick={() => decrementarVoto('contra')}
                      disabled={contra <= 0}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        cursor: contra <= 0 ? 'not-allowed' : 'pointer',
                        opacity: contra <= 0 ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.9rem',
                      fontWeight: '800',
                      color: 'var(--danger-color)',
                      minWidth: '34px',
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
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                        opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={13} />
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
                    Todos
                  </button>
                </div>

                {/* Tarjeta Abstención (si sustantiva) */}
                {tipoVotacion === 'substantive' && (
                  <div style={{
                    backgroundColor: 'var(--panel-color, #363636)',
                    border: '1px solid var(--border-color, #4b4b4b)',
                    borderRadius: '6px',
                    padding: '0.55rem 0.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--warning-color)' }}>
                      Abstención
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        onClick={() => decrementarVoto('abstencion')}
                        disabled={abstencion <= 0}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--input-bg, rgba(255,255,255,0.05))',
                          color: 'var(--text-color)',
                          cursor: abstencion <= 0 ? 'not-allowed' : 'pointer',
                          opacity: abstencion <= 0 ? 0.35 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{
                        fontFamily: 'var(--font-family)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.9rem',
                        fontWeight: '800',
                        color: 'var(--warning-color)',
                        minWidth: '34px',
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
                          borderRadius: '5px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--input-bg, rgba(255,255,255,0.05))',
                          color: 'var(--text-color)',
                          cursor: votosEmitidos >= totalAsistentes ? 'not-allowed' : 'pointer',
                          opacity: votosEmitidos >= totalAsistentes ? 0.35 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Plus size={13} />
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
                      Todos
                    </button>
                  </div>
                )}
              </div>
            ) : modoVotacion === 'rollcall' ? (
              /* Modo Roll Call */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {paisRollCallActual ? (
                  <div style={{
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.7rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CountryFlag country={paisRollCallActual} size="sm" />
                        <span style={{ fontSize: '0.82rem', fontWeight: '750' }}>{paisRollCallActual.nombre}</span>
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--muted-text)' }}>
                        Ronda {rondaRollCall} · {indiceRollCall + 1}/{listaRollCall.length}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
                      <button
                        onClick={() => handleVotarRollCall('favor')}
                        style={{
                          backgroundColor: votos[paisRollCallActual.id] === 'favor' ? 'var(--success-solid, #386447)' : 'rgba(164, 212, 179, 0.15)',
                          color: votos[paisRollCallActual.id] === 'favor' ? '#ffffff' : 'var(--success-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.2rem',
                          fontSize: '0.72rem',
                          fontWeight: '750',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Favor
                      </button>
                      <button
                        onClick={() => handleVotarRollCall('contra')}
                        style={{
                          backgroundColor: votos[paisRollCallActual.id] === 'contra' ? 'var(--danger-solid, #974b43)' : 'rgba(237, 170, 161, 0.15)',
                          color: votos[paisRollCallActual.id] === 'contra' ? '#ffffff' : 'var(--danger-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.2rem',
                          fontSize: '0.72rem',
                          fontWeight: '750',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Contra
                      </button>
                      <button
                        onClick={() => handleVotarRollCall('abstencion')}
                        disabled={paisRollCallActual.estatus === 'Presente y Votando'}
                        style={{
                          backgroundColor: votos[paisRollCallActual.id] === 'abstencion' ? 'var(--warning-solid, #80673b)' : 'rgba(203, 181, 141, 0.15)',
                          color: votos[paisRollCallActual.id] === 'abstencion' ? '#ffffff' : 'var(--warning-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.2rem',
                          fontSize: '0.72rem',
                          fontWeight: '750',
                          cursor: 'pointer',
                          opacity: paisRollCallActual.estatus === 'Presente y Votando' ? 0.35 : 1
                        }}
                      >
                        — Abs
                      </button>
                      <button
                        onClick={() => handleVotarRollCall('pasar')}
                        disabled={rondaRollCall === 2}
                        style={{
                          backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.2rem',
                          fontSize: '0.72rem',
                          fontWeight: '650',
                          cursor: 'pointer'
                        }}
                      >
                        ↺ Pasar
                      </button>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', textAlign: 'center' }}>Votación nominal completada</span>
                )}
              </div>
            ) : (
              /* Modo Lista */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '180px', overflowY: 'auto' }}>
                {paisesAsistentes.map(p => {
                  const v = votos[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 8px',
                        backgroundColor: 'var(--panel-color)',
                        borderRadius: '4px',
                        border: '1px solid var(--subborder-color)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                        <CountryFlag country={p} size="xs" />
                        <span style={{ fontWeight: '650', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => registrarVotoPais(p.id, v === 'favor' ? null : 'favor')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            border: 'none',
                            backgroundColor: v === 'favor' ? 'var(--success-color)' : 'rgba(255,255,255,0.06)',
                            color: v === 'favor' ? '#1a1a1a' : 'var(--text-color)',
                            fontWeight: '700',
                            fontSize: '0.62rem',
                            cursor: 'pointer'
                          }}
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => registrarVotoPais(p.id, v === 'contra' ? null : 'contra')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            border: 'none',
                            backgroundColor: v === 'contra' ? 'var(--danger-color)' : 'rgba(255,255,255,0.06)',
                            color: v === 'contra' ? '#ffffff' : 'var(--text-color)',
                            fontWeight: '700',
                            fontSize: '0.62rem',
                            cursor: 'pointer'
                          }}
                        >
                          No
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
                paddingTop: '0.4rem',
                borderTop: '1px solid var(--subborder-color)',
                gap: '0.4rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                  Aplicar a resolución:
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleAplicarDecisionEnmienda('aceptada')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: '750',
                      borderRadius: '4px',
                      border: '1px solid var(--success-color)',
                      background: 'rgba(164, 212, 179, 0.15)',
                      color: 'var(--success-color)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Check size={11} /> Aceptar
                  </button>
                  <button
                    onClick={() => handleAplicarDecisionEnmienda('rechazada')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: '750',
                      borderRadius: '4px',
                      border: '1px solid var(--danger-color)',
                      background: 'rgba(237, 170, 161, 0.15)',
                      color: 'var(--danger-color)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <XCircle size={11} /> Rechazar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PIE DEL PANEL UNIFICADO (Resultados en Vivo) ── */}
      <div style={{
        padding: '0.45rem 0.75rem',
        borderTop: '1px solid var(--subborder-color, #414141)',
        backgroundColor: 'var(--card-header-bg, #303030)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem',
        flexShrink: 0
      }}>
        {/* Conteo con Tabular Nums */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.74rem',
          fontWeight: '750',
          fontFamily: 'var(--font-family)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          <span style={{ color: 'var(--success-color)' }}>F: {favor}</span>
          <span style={{ color: 'var(--danger-color)' }}>C: {contra}</span>
          {tipoVotacion === 'substantive' && <span style={{ color: 'var(--warning-color)' }}>A: {abstencion}</span>}
          <span style={{ color: 'var(--accent-color)' }}>Req: {requeridos}</span>
        </div>

        {/* Status Pill */}
        <div style={{
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
          gap: '0.2rem'
        }}>
          {estadoVotacion === 'APROBADA' && <CheckCircle2 size={11} />}
          {estadoVotacion === 'RECHAZADA' && <XCircle size={11} />}
          {estadoVotacion === 'VETO EJERCIDO' && <ShieldAlert size={11} />}
          <span>{estadoVotacion}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(PanelEnmiendasVotacion);
