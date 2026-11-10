import { useTranslation } from 'react-i18next';
import React from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import CountryFlag from './CountryFlag';

/**
 * Componente renderizado dentro del contenedor del Picture-in-Picture window vía Portal.
 * Cumple con el sistema de diseño OpenMUN: tokens CSS semánticos, superficies continuas,
 * bordes finos de 1px, border-radius coherente, cifras tabulares y adaptación a temas claro/oscuro.
 */
const FloatingPipTimer = ({
  targetContainer,
  oradorActual,
  tipoDebate = 'GSL',
  segundosRestantes,
  tiempoInicial: _tiempoInicial,
  corriendo,
  onToggleTimer,
  onSiguienteOrador,
  onResetTimer,
  onAdjustTime,
  onClosePip: _onClosePip
}) => {
  const { t } = useTranslation();
  if (!targetContainer) return null;

  const isNegative = segundosRestantes < 0;
  const absSeg = Math.abs(segundosRestantes);
  const mins = Math.floor(absSeg / 60);
  const secs = absSeg % 60;
  const formattedTime = `${isNegative ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Estados visuales del reloj alineados con AccessibilityContext e index.css
  const getTimerDisplay = () => {
    if (isNegative) {
      return {
        className: 'timer-negative',
        style: {
          backgroundColor: 'var(--timer-negative-bg, rgba(239, 68, 68, 0.15))',
          borderColor: 'var(--timer-negative-border, #ef4444)',
          color: 'var(--timer-negative-color, #ef4444)'
        }
      };
    }
    if (segundosRestantes <= 5) {
      return {
        className: corriendo ? 'timer-blink-red' : 'timer-warning-red',
        style: {
          backgroundColor: 'var(--timer-negative-bg, rgba(239, 68, 68, 0.15))',
          borderColor: 'var(--timer-negative-border, #ef4444)',
          color: 'var(--timer-negative-color, #ef4444)'
        }
      };
    }
    if (segundosRestantes <= 10) {
      return {
        className: 'timer-orange',
        style: {
          backgroundColor: 'var(--timer-orange-bg, rgba(249, 115, 22, 0.15))',
          borderColor: 'var(--timer-orange-border, #f97316)',
          color: 'var(--timer-orange-color, #f97316)'
        }
      };
    }
    return {
      className: '',
      style: {
        backgroundColor: 'var(--card-header-bg, rgba(0, 0, 0, 0.04))',
        borderColor: 'var(--border-color)',
        color: 'var(--text-color)'
      }
    };
  };

  const timerDisplay = getTimerDisplay();

  const isModeratedOrGsl = tipoDebate === 'GSL' ||
    (typeof tipoDebate === 'string' && tipoDebate.toLowerCase().includes('moderado'));

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        padding: '0.65rem 0.85rem',
        boxSizing: 'border-box',
        backgroundColor: 'var(--panel-color, #363636)',
        color: 'var(--text-color, #f7f2eb)',
        fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
        justifyContent: 'space-between',
        overflowY: 'auto',
        userSelect: 'none'
      }}
    >
      {/* Encabezado: Delegación / Orador y Tipo de Debate */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', minHeight: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
          {oradorActual?.bandera ? (
            <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="sm" />
          ) : (
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }} role="img" aria-label="un-flag">🇺🇳</span>
          )}
          <span
            style={{
              fontWeight: '700',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: oradorActual?.nombre ? 'var(--text-color)' : 'var(--muted-text)'
            }}
            title={oradorActual?.nombre || t('ui.currentDelegation', 'Sin orador')}
          >
            {oradorActual?.nombre || t('ui.currentDelegation', 'Sin orador')}
          </span>
        </div>

        {tipoDebate && (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: '750',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: 'var(--border-radius, 6px)',
              backgroundColor: isModeratedOrGsl ? 'var(--accent-soft)' : 'var(--card-header-bg)',
              color: isModeratedOrGsl ? 'var(--accent-color)' : 'var(--muted-text)',
              border: `1px solid ${isModeratedOrGsl ? 'var(--accent-color)' : 'var(--border-color)'}`,
              flexShrink: 0
            }}
          >
            {tipoDebate}
          </span>
        )}
      </div>

      {/* Reloj Central Plano con Cifras Tabulares */}
      <div
        className={timerDisplay.className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: 'var(--border-radius, 6px)',
          padding: '0.45rem 0.5rem',
          margin: '0.35rem 0',
          boxShadow: 'none',
          transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
          ...timerDisplay.style
        }}
      >
        <span
          style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            fontFamily: 'monospace, var(--font-family, sans-serif)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            lineHeight: 1,
            color: 'inherit'
          }}
        >
          {formattedTime}
        </span>
      </div>

      {/* Botonera de Control Semántica */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'center', alignItems: 'center' }}>
        {/* Iniciar / Pausar */}
        <button
          type="button"
          onClick={onToggleTimer}
          style={{
            flex: 1.3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            backgroundColor: corriendo ? 'var(--card-header-bg)' : 'var(--success-solid)',
            color: corriendo ? 'var(--text-color)' : 'var(--btn-text, #ffffff)',
            border: corriendo ? '1px solid var(--border-color)' : '1px solid var(--success-solid)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.45rem 0.65rem',
            fontSize: '0.82rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {corriendo ? (
            <>
              <Pause size={14} fill="currentColor" />
              <span>{t('ui.pause', 'Pausar')}</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>{t('timers.start', 'Iniciar')}</span>
            </>
          )}
        </button>

        {/* Siguiente Orador (Acción Principal de Debate en OpenMUN: Terracota --btn-bg) */}
        {onSiguienteOrador && (
          <button
            type="button"
            onClick={onSiguienteOrador}
            style={{
              flex: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text, #ffffff)',
              border: '1px solid var(--btn-bg)',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '0.45rem 0.65rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('palette.nextSpeaker', 'Siguiente Orador')}
          >
            <SkipForward size={14} />
            <span>{t('timers.nextLabel', 'Siguiente')}</span>
          </button>
        )}

        {/* Reiniciar */}
        <button
          type="button"
          onClick={onResetTimer}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            color: 'var(--text-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.45rem 0.65rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={t('ui.resetTime', 'Reiniciar tiempo')}
        >
          <RotateCcw size={14} />
        </button>
        {[-15, 15].map(delta => (
          <button
            key={delta}
            type="button"
            onClick={() => onAdjustTime(delta)}
            aria-label={t(delta < 0 ? 'agenda.adjustTimeLess' : 'agenda.adjustTimeMore')}
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.45rem 0.65rem',
              font: 'inherit',
              cursor: 'pointer'
            }}
          >
            {delta > 0 ? '+' : ''}{delta}s
          </button>
        ))}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, targetContainer);
};

export default FloatingPipTimer;
