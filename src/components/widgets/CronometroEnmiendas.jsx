import { useDebateRunning } from '../../hooks/useDebateRunning';
import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { playTimerAlarm } from '../../utils/audioAlerts';

const PRESETS = [30, 45, 60, 90, 120];

const CronometroEnmiendas = memo(({
  compact = false,
  paisesAsistentes: paisesAsistentesProp,
  paises: paisesProp,
  onGuardarIntervencion
}) => {
  const { t } = useTranslation();
  const session = useSession() || {};
  const paises = paisesProp || session.paises || [];
  const registrarIntervencion = onGuardarIntervencion || session.registrarIntervencion;

  const paisesAsistentes = useMemo(() => {
    if (Array.isArray(paisesAsistentesProp)) return paisesAsistentesProp;
    return (paises || []).filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises, paisesAsistentesProp]);

  const [tiempoInicial, setTiempoInicial] = useState(60);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [corriendo, setCorriendo] = useDebateRunning();
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

  const handleSeleccionarPreset = (segundos) => {
    setTiempoInicial(segundos);
    setSegundosRestantes(segundos);
    setCorriendo(false);
  };

  const handleAjustarTiempo = (delta) => {
    setSegundosRestantes(prev => Math.max(0, prev + delta));
  };

  const handleReset = () => {
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

  const paisObj = useMemo(() => {
    return (paises || []).find(p => p.nombre?.toLowerCase() === paisSeleccionado?.toLowerCase()) || null;
  }, [paises, paisSeleccionado]);

  const colorReloj = segundosRestantes <= 10
    ? 'var(--danger-color)'
    : segundosRestantes <= 20
      ? 'var(--warning-color)'
      : 'var(--text-color)';

  const colorBarra = segundosRestantes <= 10
    ? 'var(--danger-color)'
    : segundosRestantes <= 20
      ? 'var(--warning-color)'
      : 'var(--accent-color)';

  const porcentaje = tiempoInicial > 0
    ? Math.max(0, Math.min(100, (Math.max(0, segundosRestantes) / tiempoInicial) * 100))
    : 0;

  if (compact) {
    return (
      <div style={{
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        color: 'var(--text-color)',
        position: 'relative',
        flexShrink: 0
      }}>
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Selector de delegación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--input-bg)',
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid var(--border-color)',
            minWidth: '140px',
            maxWidth: '220px',
            flex: '1 1 140px'
          }}>
            <CountryFlag
              country={paisObj}
              bandera={paisObj?.bandera}
              nombre={paisSeleccionado}
              size="xs"
            />
            {paisesAsistentes.length > 0 ? (
              <select
                aria-label={t('timers.currentSpeaker')}
                value={paisSeleccionado}
                onChange={e => setPaisSeleccionado(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  fontSize: '0.78rem',
                  fontWeight: '650',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {paisesAsistentes.map(p => (
                  <option key={p.id} value={p.nombre} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                    {p.nombre} {p.estatus === 'Presente y Votando' ? t('ui.pV2') : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                aria-label={t('ui.countryName')}
                value={paisSeleccionado}
                onChange={e => setPaisSeleccionado(e.target.value)}
                placeholder={t('ui.countryName')}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
            )}
          </div>

          {/* Reloj tabular compacto */}
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              fontFamily: 'var(--font-family)',
              fontVariantNumeric: 'tabular-nums',
              color: colorReloj,
              minWidth: '52px',
              textAlign: 'center',
              lineHeight: 1
            }}
          >
            {formatTiempo(segundosRestantes)}
          </div>

          {/* Presets compactos */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {PRESETS.map(s => {
              const activo = tiempoInicial === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => handleSeleccionarPreset(s)}
                  style={{
                    backgroundColor: activo ? 'var(--accent-soft)' : 'transparent',
                    border: `1px solid ${activo ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    color: activo ? 'var(--accent-color)' : 'var(--muted-text)',
                    borderRadius: '5px',
                    padding: '4px 7px',
                    fontSize: '0.72rem',
                    fontWeight: activo ? '700' : '600',
                    cursor: 'pointer',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {s}s
                </button>
              );
            })}
          </div>

          {/* Acciones principales */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setCorriendo(c => !c)}
              style={{
                backgroundColor: corriendo ? 'var(--accent-soft)' : 'var(--btn-bg)',
                border: `1px solid ${corriendo ? 'var(--accent-color)' : 'var(--btn-bg)'}`,
                color: corriendo ? 'var(--accent-color)' : 'var(--btn-text)',
                borderRadius: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {corriendo ? <Pause size={13} /> : <Play size={13} />}
              <span>{corriendo ? t('agenda.pauseTimer') : t('timers.start')}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              title={t('ui.resetToInitialTime')}
              aria-label={t('ui.resetToInitialTime')}
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--muted-text)',
                borderRadius: '5px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={handleGuardarIntervencion}
              disabled={!paisSeleccionado}
              title={t('ui.concludeAndSaveToHistory')}
              aria-label={t('ui.concludeAndSaveToHistory')}
              style={{
                backgroundColor: intervencionGuardadaFeedback ? 'var(--success-soft)' : 'var(--input-bg)',
                border: `1px solid ${intervencionGuardadaFeedback ? 'var(--success-color)' : 'var(--border-color)'}`,
                color: intervencionGuardadaFeedback ? 'var(--success-color)' : 'var(--text-color)',
                borderRadius: '5px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '650',
                cursor: paisSeleccionado ? 'pointer' : 'default',
                 opacity: paisSeleccionado ? 1 : 0.45,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={13} />
              <span>{intervencionGuardadaFeedback ? t('ui.savedToHistory') : t('common.save', 'Guardar')}</span>
            </button>

            <button
              type="button"
              onClick={() => setSonidoHabilitado(s => !s)}
              title={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
              aria-label={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
              aria-pressed={sonidoHabilitado}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                color: sonidoHabilitado ? 'var(--muted-text)' : 'var(--danger-color)',
                borderRadius: '5px',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          </div>
        </div>

        {/* Barra de progreso discreta de 2px */}
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: 'var(--subborder-color)',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${porcentaje}%`,
            height: '100%',
            backgroundColor: colorBarra,
            transition: 'width 1s linear, background-color 0.2s ease'
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      borderRadius: 'var(--border-radius, 6px)',
      overflow: 'hidden',
      padding: '12px 16px',
      gap: '12px',
      boxSizing: 'border-box'
    }}>
      {/* Fila superior: Selector de Orador + Sonido */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--input-bg)',
          padding: '6px 10px',
          borderRadius: '5px',
          border: '1px solid var(--border-color)'
        }}>
          <CountryFlag
            country={paisObj}
            bandera={paisObj?.bandera}
            nombre={paisSeleccionado}
            size="xs"
          />
          {paisesAsistentes.length > 0 ? (
            <select
              aria-label={t('timers.currentSpeaker')}
              value={paisSeleccionado}
              onChange={e => setPaisSeleccionado(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                fontSize: '0.82rem',
                fontWeight: '650',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {paisesAsistentes.map(p => (
                <option key={p.id} value={p.nombre} style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                  {p.nombre} {p.estatus === 'Presente y Votando' ? t('ui.pV2') : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              aria-label={t('ui.countryName')}
              value={paisSeleccionado}
              onChange={e => setPaisSeleccionado(e.target.value)}
              placeholder={t('ui.countryName')}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setSonidoHabilitado(s => !s)}
          title={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
          aria-label={sonidoHabilitado ? t('ui.muteAlerts2') : t('ui.enableAlertSounds')}
          aria-pressed={sonidoHabilitado}
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '5px',
            color: sonidoHabilitado ? 'var(--text-color)' : 'var(--muted-text)',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {sonidoHabilitado ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      {/* Reloj + Barra de progreso */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 0'
      }}>
        <div style={{
          fontSize: '2.2rem',
          fontWeight: '700',
          fontFamily: 'var(--font-family)',
          fontVariantNumeric: 'tabular-nums',
          color: colorReloj,
          lineHeight: 1
        }}>
          {formatTiempo(segundosRestantes)}
        </div>

        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--subborder-color)',
          borderRadius: '999px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${porcentaje}%`,
            height: '100%',
            backgroundColor: colorBarra,
            transition: 'width 1s linear, background-color 0.2s ease'
          }} />
        </div>
      </div>

      {/* Presets */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        {PRESETS.map(s => {
          const activo = tiempoInicial === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={activo}
              onClick={() => handleSeleccionarPreset(s)}
              style={{
                backgroundColor: activo ? 'var(--accent-soft)' : 'var(--input-bg)',
                border: `1px solid ${activo ? 'var(--accent-color)' : 'var(--border-color)'}`,
                color: activo ? 'var(--accent-color)' : 'var(--text-color)',
                borderRadius: '5px',
                padding: '5px 10px',
                fontSize: '0.76rem',
                fontWeight: activo ? '700' : '600',
                cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {s}s
            </button>
          );
        })}
      </div>

      {/* Controles */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => handleAjustarTiempo(-10)}
          title={t('ui.subtract10Seconds')}
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            borderRadius: '5px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '650',
            cursor: 'pointer'
          }}
        >
          -10s
        </button>

        <button
          type="button"
          onClick={() => setCorriendo(c => !c)}
          style={{
            backgroundColor: corriendo ? 'var(--accent-soft)' : 'var(--btn-bg)',
            border: `1px solid ${corriendo ? 'var(--accent-color)' : 'var(--btn-bg)'}`,
            color: corriendo ? 'var(--accent-color)' : 'var(--btn-text)',
            borderRadius: '5px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {corriendo ? <Pause size={14} /> : <Play size={14} />}
          <span>{corriendo ? t('agenda.pauseTimer') : t('timers.start')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleAjustarTiempo(10)}
          title={t('ui.add10Seconds')}
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            borderRadius: '5px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '650',
            cursor: 'pointer'
          }}
        >
          +10s
        </button>

        <button
          type="button"
          onClick={handleReset}
          title={t('ui.resetToInitialTime')}
          aria-label={t('ui.resetToInitialTime')}
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--muted-text)',
            borderRadius: '5px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RotateCcw size={14} />
        </button>

        <button
          type="button"
          onClick={handleGuardarIntervencion}
          disabled={!paisSeleccionado}
          style={{
            backgroundColor: intervencionGuardadaFeedback ? 'var(--success-soft)' : 'var(--input-bg)',
            border: `1px solid ${intervencionGuardadaFeedback ? 'var(--success-color)' : 'var(--border-color)'}`,
            color: intervencionGuardadaFeedback ? 'var(--success-color)' : 'var(--text-color)',
            borderRadius: '5px',
            padding: '6px 12px',
            fontSize: '0.76rem',
            fontWeight: '650',
            cursor: paisSeleccionado ? 'pointer' : 'default',
            opacity: paisSeleccionado ? 1 : 0.45,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Check size={14} />
          <span>{intervencionGuardadaFeedback ? t('ui.savedToHistory') : t('ui.concludeAndSaveToHistory')}</span>
        </button>
      </div>
    </div>
  );
});

export default CronometroEnmiendas;
