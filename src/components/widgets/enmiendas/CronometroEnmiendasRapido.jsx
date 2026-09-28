import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import CountryFlag from '../../common/CountryFlag';
import { playTimerAlarm } from '../../../utils/audioAlerts';

/**
 * Mini-cronómetro embebido ultraligero y aislado.
 * Al estar aislado con su propio estado de tiempo, las actualizaciones de cada segundo
 * NO provocan el re-renderizado de toda la resolución ni de las listas de enmiendas.
 */
const CronometroEnmiendasRapido = memo(({
  paisesAsistentes = [],
  paises = [],
  onGuardarIntervencion,
  isLight = false
}) => {
  const [cronometroPais, setCronometroPais] = useState('');
  const [cronometroSegundos, setCronometroSegundos] = useState(60);
  const [cronometroInicial, setCronometroInicial] = useState(60);
  const [cronometroCorriendo, setCronometroCorriendo] = useState(false);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [intervencionGuardadaFeedback, setIntervencionGuardadaFeedback] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  // Inicializar orador por defecto
  useEffect(() => {
    if (paisesAsistentes.length > 0 && !cronometroPais) {
      setCronometroPais(paisesAsistentes[0].nombre);
    }
  }, [paisesAsistentes, cronometroPais]);

  // Intervalo del temporizador
  useEffect(() => {
    let interval = null;
    if (cronometroCorriendo) {
      interval = setInterval(() => {
        setCronometroSegundos(prev => {
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
  }, [cronometroCorriendo, sonidoHabilitado]);

  const handleGuardar = () => {
    if (!cronometroPais) return;
    const tiempoHablado = Math.max(1, cronometroInicial - Math.max(0, cronometroSegundos));
    const overtime = cronometroSegundos < 0 ? Math.abs(cronometroSegundos) : 0;

    if (onGuardarIntervencion) {
      onGuardarIntervencion(cronometroPais, cronometroInicial, tiempoHablado, overtime);
    }

    setCronometroCorriendo(false);
    setCronometroSegundos(cronometroInicial);
    setIntervencionGuardadaFeedback(true);
    setTimeout(() => setIntervencionGuardadaFeedback(false), 2500);
  };

  const handleAjustar = (delta) => {
    setCronometroSegundos(prev => Math.max(0, prev + delta));
  };

  const formatTiempo = (totalSeg) => {
    const isNeg = totalSeg < 0;
    const abs = Math.abs(totalSeg);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${isNeg ? '-' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const paisObj = useMemo(() => {
    return (paises || []).find(p => p.nombre?.toLowerCase() === cronometroPais?.toLowerCase()) || null;
  }, [paises, cronometroPais]);

  const colorReloj = cronometroSegundos < 0
    ? '#ef4444'
    : cronometroSegundos <= 10
      ? '#f87171'
      : cronometroSegundos <= 20
        ? '#eab308'
        : '#22c55e';

  const porcentaje = cronometroInicial > 0
    ? Math.max(0, Math.min(100, (Math.max(0, cronometroSegundos) / cronometroInicial) * 100))
    : 0;

  const optionBgColor = isLight ? '#ffffff' : '#1e293b';
  const optionTextColor = isLight ? '#0f172a' : '#f8fafc';

  if (colapsado) {
    return (
      <div style={{
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        padding: '0.25rem 0.65rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={12} color="#3b82f6" />
          <span style={{ fontWeight: '700' }}>Cronómetro de Debate</span>
          <span style={{
            fontFamily: 'monospace',
            fontWeight: '900',
            color: colorReloj,
            marginLeft: '0.3rem'
          }}>
            {formatTiempo(cronometroSegundos)}
          </span>
          {cronometroPais && (
            <span style={{ color: 'var(--muted-text)', fontSize: '0.68rem' }}>
              ({cronometroPais})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={() => setCronometroCorriendo(c => !c)}
            style={{
              background: cronometroCorriendo ? '#eab308' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              padding: '0.15rem 0.4rem',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: '700'
            }}
          >
            {cronometroCorriendo ? 'Pausar' : 'Reanudar'}
          </button>
          <button
            onClick={() => setColapsado(false)}
            title="Expandir controles completos del cronómetro"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--card-header-bg)',
      borderBottom: '1px solid var(--subborder-color)',
      padding: '0.4rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      flexShrink: 0
    }}>
      {/* Barra de progreso superior */}
      <div style={{
        width: '100%',
        height: '3px',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${porcentaje}%`,
          height: '100%',
          backgroundColor: colorReloj,
          transition: 'width 1s linear, background-color 0.3s ease'
        }} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.45rem'
      }}>
        {/* Selector de Orador con Bandera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '160px' }}>
          <CountryFlag country={paisObj} bandera={paisObj?.bandera} nombre={cronometroPais} size="xs" />
          {paisesAsistentes.length > 0 ? (
            <select
              value={cronometroPais}
              onChange={e => setCronometroPais(e.target.value)}
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--subborder-color)',
                color: 'var(--text-color)',
                borderRadius: '4px',
                padding: '0.2rem 0.4rem',
                fontSize: '0.72rem',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '150px'
              }}
            >
              {paisesAsistentes.map(p => (
                <option key={p.id} value={p.nombre} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                  {p.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={cronometroPais}
              onChange={e => setCronometroPais(e.target.value)}
              placeholder="Delegación que defiende"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--subborder-color)',
                color: 'var(--text-color)',
                borderRadius: '4px',
                padding: '0.2rem 0.4rem',
                fontSize: '0.72rem',
                width: '130px'
              }}
            />
          )}
        </div>

        {/* Display del Tiempo & Controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{
            fontSize: '1.15rem',
            fontWeight: '900',
            fontFamily: 'monospace',
            color: colorReloj,
            minWidth: '55px',
            textAlign: 'center',
            letterSpacing: '0.02em',
            textShadow: `0 0 12px ${colorReloj}33`
          }}>
            {formatTiempo(cronometroSegundos)}
          </div>

          <button
            onClick={() => setCronometroCorriendo(c => !c)}
            style={{
              backgroundColor: cronometroCorriendo ? '#eab308' : '#16a34a',
              border: 'none',
              color: '#ffffff',
              borderRadius: '4px',
              padding: '0.25rem 0.55rem',
              fontSize: '0.7rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            {cronometroCorriendo ? <Pause size={12} /> : <Play size={12} />}
            <span>{cronometroCorriendo ? 'Pausa' : 'Iniciar'}</span>
          </button>

          <button
            onClick={() => {
              setCronometroCorriendo(false);
              setCronometroSegundos(cronometroInicial);
            }}
            title="Reiniciar reloj"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--subborder-color)',
              color: 'var(--muted-text)',
              borderRadius: '4px',
              padding: '0.25rem 0.4rem',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={12} />
          </button>

          {/* Ajuste fino */}
          <button
            onClick={() => handleAjustar(-10)}
            title="Restar 10s"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--subborder-color)',
              color: 'var(--muted-text)',
              borderRadius: '3px',
              padding: '0.15rem 0.35rem',
              fontSize: '0.64rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            -10s
          </button>
          <button
            onClick={() => handleAjustar(10)}
            title="Sumar 10s"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--subborder-color)',
              color: 'var(--muted-text)',
              borderRadius: '3px',
              padding: '0.15rem 0.35rem',
              fontSize: '0.64rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            +10s
          </button>

          {/* Presets */}
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {[30, 45, 60, 90].map(s => (
              <button
                key={s}
                onClick={() => {
                  setCronometroInicial(s);
                  setCronometroSegundos(s);
                  setCronometroCorriendo(false);
                }}
                style={{
                  backgroundColor: cronometroInicial === s ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  border: `1px solid ${cronometroInicial === s ? '#3b82f6' : 'var(--subborder-color)'}`,
                  color: cronometroInicial === s ? '#60a5fa' : 'var(--muted-text)',
                  borderRadius: '3px',
                  padding: '0.15rem 0.35rem',
                  fontSize: '0.64rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {s}s
              </button>
            ))}
          </div>

          {/* Guardar en Histórico */}
          <button
            onClick={handleGuardar}
            title="Guardar intervención en el Histórico de Delegaciones"
            style={{
              backgroundColor: intervencionGuardadaFeedback ? '#16a34a' : 'var(--btn-bg)',
              border: 'none',
              color: 'var(--btn-text)',
              borderRadius: '4px',
              padding: '0.25rem 0.55rem',
              fontSize: '0.7rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Check size={12} />
            <span>{intervencionGuardadaFeedback ? '¡Guardado!' : 'Histórico'}</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => setSonidoHabilitado(s => !s)}
            title={sonidoHabilitado ? 'Silenciar avisos' : 'Activar sonido'}
            style={{
              background: 'transparent',
              border: 'none',
              color: sonidoHabilitado ? '#3b82f6' : 'var(--muted-text)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Colapsar */}
          <button
            onClick={() => setColapsado(true)}
            title="Minimizar barra de cronómetro"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronUp size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default CronometroEnmiendasRapido;
