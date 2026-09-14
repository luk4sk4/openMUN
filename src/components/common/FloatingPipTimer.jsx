import React from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, SkipForward, RotateCcw, Volume2, Mic } from 'lucide-react';
import CountryFlag from './CountryFlag';

/**
 * Componente renderizado dentro del contenedor del Picture-in-Picture window vía Portal.
 */
const FloatingPipTimer = ({
  targetContainer,
  oradorActual,
  tipoDebate = 'GSL',
  segundosRestantes,
  tiempoInicial,
  corriendo,
  onToggleTimer,
  onSiguienteOrador,
  onResetTimer,
  onClosePip
}) => {
  if (!targetContainer) return null;

  const isNegative = segundosRestantes < 0;
  const absSeg = Math.abs(segundosRestantes);
  const mins = Math.floor(absSeg / 60);
  const secs = absSeg % 60;
  const formattedTime = `${isNegative ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isWarning = segundosRestantes > 0 && segundosRestantes <= 10;

  let timerColor = '#f1f5f9';
  let timerBg = '#0c0e14';
  let timerBorder = '#2b3042';

  if (isNegative) {
    timerColor = '#ef4444';
    timerBg = '#3f0c0c';
    timerBorder = '#ef4444';
  } else if (isWarning) {
    timerColor = '#f97316';
    timerBg = '#431407';
    timerBorder = '#f97316';
  }

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        padding: '0.65rem 0.85rem',
        boxSizing: 'border-box',
        backgroundColor: '#161922',
        color: '#f1f5f9',
        fontFamily: 'Inter, system-ui, sans-serif',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}
    >
      {/* Encabezado: Tipo de Debate y Orador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          {oradorActual?.bandera ? (
            <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="sm" />
          ) : (
            <span style={{ fontSize: '1.2rem' }}>🇺🇳</span>
          )}
          <span
            style={{
              fontWeight: '800',
              fontSize: '0.92rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#ffffff'
            }}
          >
            {oradorActual?.nombre || 'Delegación en turno'}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: '4px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            flexShrink: 0
          }}
        >
          {tipoDebate}
        </span>
      </div>

      {/* Reloj Central Gigante */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: timerBg,
          border: `2px solid ${timerBorder}`,
          borderRadius: '8px',
          padding: '0.4rem 0.5rem',
          margin: '0.35rem 0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease'
        }}
      >
        <span
          style={{
            fontSize: '2.4rem',
            fontWeight: '900',
            fontFamily: 'monospace, system-ui',
            letterSpacing: '0.04em',
            color: timerColor,
            lineHeight: 1
          }}
        >
          {formattedTime}
        </span>
      </div>

      {/* Botones de Control en Vivo */}
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
        <button
          onClick={onToggleTimer}
          style={{
            flex: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            backgroundColor: corriendo ? '#ea580c' : '#22c55e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.45rem 0.6rem',
            fontSize: '0.82rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
        >
          {corriendo ? <Pause size={14} fill="#ffffff" /> : <Play size={14} fill="#ffffff" />}
          <span>{corriendo ? 'Pausa' : 'Iniciar'}</span>
        </button>

        <button
          onClick={onSiguienteOrador}
          style={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.45rem 0.6rem',
            fontSize: '0.82rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
          title="Siguiente Orador"
        >
          <SkipForward size={14} />
          <span>Siguiente</span>
        </button>

        <button
          onClick={onResetTimer}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#94a3b8',
            border: '1px solid #2b3042',
            borderRadius: '6px',
            padding: '0.45rem 0.6rem',
            cursor: 'pointer'
          }}
          title="Reiniciar tiempo"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, targetContainer);
};

export default FloatingPipTimer;
