import i18n from '../../languages/index.js';
import { useDebateRunning } from '../../hooks/useDebateRunning';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Clock, ChevronUp, ChevronDown, PictureInPicture2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import FloatingPipTimer from '../common/FloatingPipTimer';
import { usePictureInPictureTimer } from '../../hooks/usePictureInPictureTimer';
import { useTranslation } from 'react-i18next';

const CronometroDual = ({ modoInicial = null }) => {
  const { t } = useTranslation();
  const {
    caucusActivo,
    oradoresCaucus,
    avanzarOradorCaucus,
    registrarIntervencion
  } = useSession();

  const [modoSeleccionado, setModoSeleccionado] = useState(modoInicial);

  const tipoMocion = modoSeleccionado || caucusActivo?.tipo || (modoInicial || 'Caucus Moderado');
  const esTiempoSoloGeneral = tipoMocion === 'Caucus No Moderado' || tipoMocion.includes('Consulta General');

  const [tiempoTotalSeg, setTiempoTotalSeg] = useState(caucusActivo?.tiempoTotal || 600);
  const [tiempoTotalInicial, setTiempoTotalInicial] = useState(caucusActivo?.tiempoTotal || 600);
  const [tiempoOradorSeg, setTiempoOradorSeg] = useState(caucusActivo?.tiempoOrador || 45);
  const [limiteOradorSeg, setLimiteOradorSeg] = useState(caucusActivo?.tiempoOrador || 45);
  const [corriendo, setCorriendo] = useDebateRunning();
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  const timerRef = useRef(null);

  // Hook de Picture-in-Picture interactivo
  const { isPipActive, isSupported: isPipSupported, pipContainer, togglePip, closePip } = usePictureInPictureTimer();

  // Sincronizar al activar moción desde la Pizarra de Mociones
  useEffect(() => {
    if (caucusActivo?.activo) {
      setModoSeleccionado(caucusActivo.tipo);
      setTiempoTotalSeg(caucusActivo.tiempoTotal);
      setTiempoTotalInicial(caucusActivo.tiempoTotal);
      setTiempoOradorSeg(caucusActivo.tiempoOrador);
      setLimiteOradorSeg(caucusActivo.tiempoOrador);
      setCorriendo(false);
    }
  }, [caucusActivo]);

  // Conteo reactivo
  useEffect(() => {
    if (corriendo) {
      timerRef.current = setInterval(() => {
        if (tipoMocion !== 'Tour de Table') {
          setTiempoTotalSeg(prev => prev - 1);
        }
        if (!esTiempoSoloGeneral) {
          setTiempoOradorSeg(prev => prev - 1);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [corriendo, tipoMocion, esTiempoSoloGeneral]);

  const handleStartPause = () => setCorriendo(!corriendo);

  const handleSiguienteOrador = () => {
    setCorriendo(false);

    if (oradorActual && oradorActual.nombre && oradorActual.nombre !== 'Sin orador en cola') {
      const tiempoHabladoExacto = Math.max(1, limiteOradorSeg - tiempoOradorSeg);
      const overtime = tiempoOradorSeg < 0 ? Math.abs(tiempoOradorSeg) : 0;
      registrarIntervencion(oradorActual.nombre, limiteOradorSeg, tiempoHabladoExacto, overtime);
    }

    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 2200);

    setTiempoOradorSeg(limiteOradorSeg);
    avanzarOradorCaucus();
  };

  const handleReset = () => {
    setCorriendo(false);
    const initTotal = caucusActivo?.tiempoTotal || 600;
    setTiempoTotalSeg(initTotal);
    setTiempoTotalInicial(initTotal);
    setTiempoOradorSeg(limiteOradorSeg);
  };

  const handleModificarTiempoTotal = (seg) => {
    setTiempoTotalSeg(prev => Math.max(0, prev + seg));
    setTiempoTotalInicial(prev => Math.max(0, prev + seg));
  };

  const handleModificarTiempoOrador = (seg) => {
    setTiempoOradorSeg(prev => prev + seg);
  };

  // Escuchar eventos globales de atajos de teclado
  useEffect(() => {
    const handleToggle = () => setCorriendo(prev => !prev);
    const handleNext = () => handleSiguienteOrador();
    const handleResetEv = () => handleReset();
    const handleAdjust = (e) => {
      const delta = e.detail?.delta || 0;
      setTiempoOradorSeg(prev => prev + delta);
    };

    window.addEventListener('openmun_hotkey_toggle_timer', handleToggle);
    window.addEventListener('openmun_hotkey_next_speaker', handleNext);
    window.addEventListener('openmun_hotkey_reset_timer', handleResetEv);
    window.addEventListener('openmun_hotkey_adjust_time', handleAdjust);

    return () => {
      window.removeEventListener('openmun_hotkey_toggle_timer', handleToggle);
      window.removeEventListener('openmun_hotkey_next_speaker', handleNext);
      window.removeEventListener('openmun_hotkey_reset_timer', handleResetEv);
      window.removeEventListener('openmun_hotkey_adjust_time', handleAdjust);
    };
  }, [limiteOradorSeg, tiempoOradorSeg, oradoresCaucus, avanzarOradorCaucus, registrarIntervencion, caucusActivo]);

  const formatTimeWithNegative = (seg) => {
    const isNegative = seg < 0;
    const absSeg = Math.abs(seg);
    const mins = Math.floor(absSeg / 60);
    const secs = absSeg % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const getTimerStyle = (seg, isRunning = false) => {
    if (seg < 0) {
      return { className: 'timer-negative', style: {} };
    }
    if (seg <= 5 && seg >= 0) {
      return { className: isRunning ? 'timer-blink-red' : 'timer-warning-red', style: {} };
    }
    if (seg <= 10 && seg > 5) {
      return { className: 'timer-orange', style: {} };
    }
    return {
      className: '',
      style: {
        backgroundColor: 'var(--timer-display-bg, transparent)',
        border: '1px solid var(--timer-display-border, transparent)',
        color: 'var(--text-color)'
      }
    };
  };

  const oradorActual = oradoresCaucus.length > 0
    ? oradoresCaucus[0]
    : { nombre: i18n.t('ui.currentDelegation'), bandera: '🇺🇳' };

  const displayOradorState = getTimerStyle(tiempoOradorSeg, corriendo);
  const displayTotalState = getTimerStyle(tiempoTotalSeg, corriendo);

  const progresoTotalPorcentaje = tiempoTotalInicial > 0
    ? Math.min(100, Math.max(0, ((tiempoTotalInicial - tiempoTotalSeg) / tiempoTotalInicial) * 100))
    : 0;

  const progresoOradorPorcentaje = limiteOradorSeg > 0
    ? Math.min(100, Math.max(0, ((limiteOradorSeg - tiempoOradorSeg) / limiteOradorSeg) * 100))
    : 0;

  return (
    <div style={{
      position: 'relative',
      padding: '1.2rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.8rem'
    }}>
      {/* ── 1. Header Único y Despejado (Estilo GSL) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.65rem',
        gap: '0.75rem',
        flexShrink: 0
      }}>
        {/* Lado Izquierdo: Orador Actual & Siguiente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
          {!esTiempoSoloGeneral ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="xl" />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.68rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                    {t('timers.currentSpeaker', 'Orador Actual')}
                  </span>
                  {oradorActual.esProponenteUltimo && (
                    <span style={{
                      fontSize: '0.6rem',
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent-color)',
                      border: '1px solid var(--accent-color)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: '700'
                    }}>
                      {t('ui.proponent2')}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-color)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {oradorActual.nombre}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tipoMocion} • {caucusActivo?.tema || t('ui.noTopicAssigned')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={24} style={{ color: 'var(--accent-color)' }} />
              <div>
                <div style={{ fontSize: '0.68rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  {tipoMocion}
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--text-color)', lineHeight: 1.2 }}>
                  {caucusActivo?.tema || t('ui.noTopicAssigned')}
                </div>
              </div>
            </div>
          )}

          {/* Siguiente Orador en Cabecera (como en GSL) */}
          {!esTiempoSoloGeneral && oradoresCaucus.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)',
              flexShrink: 0
            }}>
              <CountryFlag bandera={oradoresCaucus[1].bandera} nombre={oradoresCaucus[1].nombre} size="md" />
              <div>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--muted-text)',
                  lineHeight: 1
                }}>
                  {t('timers.nextSpeaker', 'Siguiente')}
                </div>
                <div style={{
                  fontSize: '0.92rem',
                  fontWeight: '750',
                  color: 'var(--text-color)',
                  lineHeight: 1.2,
                  marginTop: '2px'
                }}>
                  {oradoresCaucus[1].nombre}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado Derecho: Chip de Tiempo Total (si aplica) & PiP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {tipoMocion === 'Caucus Moderado' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--subborder-color)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--border-radius, 6px)'
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--muted-text)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  lineHeight: 1
                }}>
                  {t('timers.totalCaucus', 'Total Caucus')}
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: '850',
                  fontSize: '1.45rem',
                  color: tiempoTotalSeg < 0 ? 'var(--danger-color)' : 'var(--text-color)',
                  lineHeight: 1.15,
                  marginTop: '2px'
                }}>
                  {formatTimeWithNegative(tiempoTotalSeg)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(-60)}
                  style={{
                    padding: '0.25rem 0.4rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--danger-color)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={t('ui.subtract1MinuteFromTotalCaucusTime')}
                >
                  <ChevronDown size={12} />
                  <span>-1m</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(60)}
                  style={{
                    padding: '0.25rem 0.4rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--success-color)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={t('ui.add1MinuteToTotalCaucusTime')}
                >
                  <ChevronUp size={12} />
                  <span>+1m</span>
                </button>
              </div>
            </div>
          )}

          {isPipSupported && (
            <button
              type="button"
              onClick={togglePip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.65rem',
                fontSize: '0.74rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: `1px solid ${isPipActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
                backgroundColor: isPipActive ? 'var(--accent-soft)' : 'transparent',
                color: isPipActive ? 'var(--accent-color)' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease'
              }}
              title={isPipActive ? t('ui.closePipWindow') : t('ui.openFloatingPipWindow')}
            >
              <PictureInPicture2 size={13} />
              <span>PiP</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Display Central del Reloj (Exacto a GSL: Masivo y Despejado) ── */}
      <div
        className={(esTiempoSoloGeneral ? displayTotalState : displayOradorState).className}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          margin: '0.4rem 0',
          padding: '1rem',
          borderRadius: '10px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--timer-display-bg, transparent)',
          border: '1px solid var(--timer-display-border, transparent)',
          boxShadow: (esTiempoSoloGeneral ? displayTotalState : displayOradorState).className ? undefined : 'var(--timer-display-shadow, none)',
          ...(esTiempoSoloGeneral ? displayTotalState : displayOradorState).style
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div style={{
            fontWeight: '900',
            fontSize: 'clamp(6.8rem, min(14.5vw, 24vh), 12rem)',
            fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            lineHeight: 0.95,
            marginTop: '2px',
            marginBottom: '4px',
            textShadow: 'var(--timer-digits-shadow, none)'
          }}>
            {formatTimeWithNegative(esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg)}
          </div>

          <div style={{
            fontSize: '0.9rem',
            opacity: 0.8,
            marginTop: '0.4rem',
            fontWeight: '700',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            {(esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg) < 0 ? (
              <>
                <AlertTriangle size={15} color="var(--danger-color)" />
                <span>{t('timers.overtime', 'TIEMPO EXCEDIDO (OVERTIME)')}</span>
              </>
            ) : esTiempoSoloGeneral ? (
              `${t('timers.totalCaucusTime', 'Tiempo Asignado')}: ${Math.floor(tiempoTotalInicial / 60)} min`
            ) : (
              `${t('timers.assignedTime', 'Tiempo Asignado')}: ${limiteOradorSeg}s`
            )}
          </div>
        </div>

        {/* Barra de progreso inferior (estilo GSL) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(128, 128, 128, 0.15)'
        }}>
          <div style={{
            height: '100%',
            width: `${esTiempoSoloGeneral ? progresoTotalPorcentaje : progresoOradorPorcentaje}%`,
            background: (esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg) <= 5
              ? 'linear-gradient(90deg, var(--danger-color), var(--danger-color))'
              : (esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg) <= 10
                ? 'linear-gradient(90deg, #f97316, #ea580c)'
                : 'linear-gradient(90deg, var(--accent-color), var(--accent-color))',
            boxShadow: (esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg) <= 10
              ? '0 0 12px var(--danger-soft)'
              : 'none',
            transition: 'width 0.4s linear, background 0.3s ease',
            borderRadius: '0 2px 2px 0'
          }} />
        </div>

        {/* Notificación flotante de Guardado (estilo GSL) */}
        {mensajeGuardado && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: 'var(--success-solid)',
            color: '#ffffff',
            fontSize: '0.72rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontWeight: '700'
          }}>
            <CheckCircle2 size={12} /> {t('common.saved', 'Guardado')}
          </div>
        )}
      </div>

      {/* ── 3. Botonera Inferior (Exacta a GSL: Iniciar Verde, Reiniciar, Steppers, Siguiente Orador) ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', flexShrink: 0 }}>
        {/* Iniciar / Pausar */}
        <button
          onClick={handleStartPause}
          style={{
            flex: '1 1 120px',
            padding: '0.6rem 0.8rem',
            backgroundColor: corriendo ? '#334155' : 'var(--success-solid)',
            color: 'var(--btn-text)',
            fontWeight: '700',
            border: 'none',
            borderRadius: 'var(--border-radius, 6px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            transition: 'all 0.15s ease'
          }}
        >
          {corriendo ? <Pause size={16} /> : <Play size={16} />}
          {corriendo ? t('timers.pause', 'Pausar') : t('timers.start', 'Iniciar')}
        </button>

        {/* Reiniciar */}
        <button
          onClick={handleReset}
          style={{
            flex: '0 1 45px',
            padding: '0.6rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            fontWeight: '600',
            borderRadius: 'var(--border-radius, 6px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem'
          }}
          title={t('common.reset', 'Reiniciar')}
        >
          <RotateCcw size={15} />
        </button>

        {/* Steppers de tiempo estilo GSL */}
        {!esTiempoSoloGeneral ? (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <button
              onClick={() => handleModificarTiempoOrador(-5)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--danger-soft)',
                border: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                fontWeight: '700',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.subtract5SecondsFromSpeakerTime')}
            >
              <ChevronDown size={13} />
              <span>-5s</span>
            </button>

            <button
              onClick={() => handleModificarTiempoOrador(5)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--success-soft)',
                border: '1px solid var(--success-color)',
                color: 'var(--success-color)',
                fontWeight: '700',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.add5SecondsToSpeakerTime')}
            >
              <ChevronUp size={13} />
              <span>+5s</span>
            </button>

            <button
              onClick={() => handleModificarTiempoOrador(15)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                fontWeight: '600',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.add15SecondsToSpeakerTime')}
            >
              <ChevronUp size={13} />
              <span>+15s</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <button
              onClick={() => handleModificarTiempoTotal(-60)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--danger-soft)',
                border: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                fontWeight: '700',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={t('ui.subtract1Minute')}
            >
              <ChevronDown size={13} />
              <span>-1m</span>
            </button>

            <button
              onClick={() => handleModificarTiempoTotal(60)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--success-soft)',
                border: '1px solid var(--success-color)',
                color: 'var(--success-color)',
                fontWeight: '700',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={t('ui.add1Minute')}
            >
              <ChevronUp size={13} />
              <span>+1m</span>
            </button>

            <button
              onClick={() => handleModificarTiempoTotal(300)}
              style={{
                padding: '0.6rem 0.45rem',
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                fontWeight: '600',
                borderRadius: 'var(--border-radius, 6px)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={t('ui.add5Minutes')}
            >
              <ChevronUp size={13} />
              <span>+5m</span>
            </button>
          </div>
        )}

        {/* Siguiente Orador (estilo GSL) */}
        {!esTiempoSoloGeneral && (
          <button
            onClick={handleSiguienteOrador}
            style={{
              flex: '1 1 135px',
              padding: '0.6rem 0.8rem',
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              fontWeight: '700',
              border: 'none',
              borderRadius: 'var(--border-radius, 6px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.endContributionAndAdvanceToTheNextSpeaker')}
          >
            <SkipForward size={16} /> {t('timers.nextSpeaker', 'Siguiente Orador')}
          </button>
        )}
      </div>

      {/* Renderizado en Portal del Picture-in-Picture */}
      <FloatingPipTimer
        targetContainer={pipContainer}
        oradorActual={oradorActual}
        tipoDebate={tipoMocion}
        segundosRestantes={esTiempoSoloGeneral ? tiempoTotalSeg : tiempoOradorSeg}
        tiempoInicial={esTiempoSoloGeneral ? tiempoTotalInicial : limiteOradorSeg}
        corriendo={corriendo}
        onToggleTimer={handleStartPause}
        onSiguienteOrador={handleSiguienteOrador}
        onResetTimer={handleReset}
        onClosePip={closePip}
      />
    </div>
  );
};

export default CronometroDual;
