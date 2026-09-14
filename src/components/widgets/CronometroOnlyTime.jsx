import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Clock, ShieldAlert, Edit, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTranslation } from 'react-i18next';

const CronometroOnlyTime = () => {
  const { t } = useTranslation();
  const { caucusActivo } = useSession();

  const [tiempoTotalSeg, setTiempoTotalSeg] = useState(caucusActivo?.tiempoTotal || 600); // 10 min
  const [tiempoTotalInicial, setTiempoTotalInicial] = useState(caucusActivo?.tiempoTotal || 600);
  const [corriendo, setCorriendo] = useState(false);
  const [editando, setEditando] = useState(false);

  const [inputMin, setInputMin] = useState(10);
  const [inputSeg, setInputSeg] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    if (caucusActivo?.tiempoTotal) {
      setTiempoTotalSeg(caucusActivo.tiempoTotal);
      setTiempoTotalInicial(caucusActivo.tiempoTotal);
      setCorriendo(true);
    }
  }, [caucusActivo]);

  useEffect(() => {
    if (corriendo) {
      timerRef.current = setInterval(() => {
        setTiempoTotalSeg(prev => {
          if (prev <= 1) {
            setCorriendo(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [corriendo]);

  // Sincronizar inputs cuando cambia el tiempo y no se está editando
  useEffect(() => {
    if (!editando) {
      setInputMin(Math.floor(tiempoTotalSeg / 60));
      setInputSeg(tiempoTotalSeg % 60);
    }
  }, [tiempoTotalSeg, editando]);

  const handleStartPause = () => {
    if (editando) handleSaveTime();
    setCorriendo(!corriendo);
  };

  const handleReset = () => {
    setCorriendo(false);
    setEditando(false);
    const init = caucusActivo?.tiempoTotal || 600;
    setTiempoTotalSeg(init);
    setTiempoTotalInicial(init);
  };

  const handleAddMinutes = (mins) => {
    const extra = mins * 60;
    setTiempoTotalSeg(prev => prev + extra);
    setTiempoTotalInicial(prev => prev + extra);
  };

  const handleSaveTime = () => {
    const totalSegundos = (inputMin * 60) + inputSeg;
    setTiempoTotalSeg(totalSegundos);
    setTiempoTotalInicial(totalSegundos);
    setEditando(false);
  };

  const formatTime = (seg) => {
    const mins = Math.floor(seg / 60);
    const secs = seg % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStyle = (seg, isRunning = false) => {
    if (seg < 0 || seg === 0) {
      return { className: 'timer-negative', style: {} };
    }
    if (seg <= 5 && seg > 0) {
      return { className: isRunning ? 'timer-blink-red' : 'timer-warning-red', style: {} };
    }
    if (seg <= 10 && seg > 5) {
      return { className: 'timer-orange', style: {} };
    }
    return {
      className: '',
      style: {
        backgroundColor: 'var(--timer-display-bg, var(--card-header-bg))',
        border: '2px solid var(--timer-display-border, var(--border-color))',
        color: 'var(--text-color)'
      }
    };
  };

  const displayState = getTimerStyle(tiempoTotalSeg, corriendo);

  const progresoPorcentaje = tiempoTotalInicial > 0
    ? Math.min(100, Math.max(0, ((tiempoTotalInicial - tiempoTotalSeg) / tiempoTotalInicial) * 100))
    : 0;

  const arrowButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: '4px',
    transition: 'background-color 0.2s, color 0.2s',
  };

  return (
    <div style={{
      padding: '1.2rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
    }}>
      {/* Estilo para ocultar controles nativos de number input */}
      <style>{`
        .no-spin::-webkit-outer-spin-button,
        .no-spin::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spin {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Reloj Display Gigante */}
      <div
        className={displayState.className}
        style={{
          position: 'relative',
          margin: '0.8rem 0',
          padding: '1.4rem 1rem 1.6rem 1rem',
          borderRadius: '12px',
          textAlign: 'center',
          overflow: 'hidden',
          transition: displayState.className ? 'none' : 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '150px',
          boxShadow: displayState.className ? undefined : 'var(--timer-display-shadow, 0 6px 25px rgba(0,0,0,0.15))',
          ...displayState.style
        }}
      >
        {editando ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem'
            }}>
              {/* Contenedor Minutos */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setInputMin(m => m + 1)}
                  style={arrowButtonStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronUp size={24} />
                </button>
                <input
                  type="number"
                  min="0"
                  max="999"
                  className="no-spin"
                  value={inputMin}
                  onChange={e => setInputMin(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: '85px',
                    fontSize: '3rem',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    backgroundColor: 'var(--panel-color)',
                    color: 'var(--btn-bg, #3b82f6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.1rem',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setInputMin(m => Math.max(0, m - 1))}
                  style={arrowButtonStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronDown size={24} />
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '0.1rem', fontWeight: '600', letterSpacing: '0.05em' }}>{t('timers.minutes', 'MINUTOS')}</span>
              </div>

              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--muted-text)', alignSelf: 'center', marginTop: '-15px' }}>:</span>

              {/* Contenedor Segundos */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setInputSeg(s => (s + 1) % 60)}
                  style={arrowButtonStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronUp size={24} />
                </button>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="no-spin"
                  value={inputSeg}
                  onChange={e => setInputSeg(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  style={{
                    width: '85px',
                    fontSize: '3rem',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    backgroundColor: 'var(--panel-color)',
                    color: 'var(--btn-bg, #3b82f6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.1rem',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setInputSeg(s => Math.max(0, s - 1))}
                  style={arrowButtonStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronDown size={24} />
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '0.1rem', fontWeight: '600', letterSpacing: '0.05em' }}>{t('timers.seconds', 'SEGUNDOS')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.4rem' }}>
              <button
                onClick={handleSaveTime}
                style={{
                  padding: '0.4rem 1rem',
                  backgroundColor: '#22c55e',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.85rem'
                }}
              >
                <Check size={16} /> {t('common.save', 'Aceptar')}
              </button>
              <button
                onClick={() => setEditando(false)}
                style={{
                  padding: '0.4rem 1rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.85rem'
                }}
              >
                <X size={16} /> {t('common.cancel', 'Cancelar')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              fontWeight: '900',
              fontSize: 'clamp(5.8rem, 11vw, 7.8rem)',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              lineHeight: 0.95,
              marginTop: '4px',
              marginBottom: '4px',
              textShadow: 'var(--timer-digits-shadow, none)'
            }}>
              {formatTime(tiempoTotalSeg)}
            </div>

            {/* Botón flotante para editar el tiempo mucho más visible */}
            {!corriendo && (
              <button
                onClick={() => setEditando(true)}
                title="Ajustar tiempo"
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'var(--primary-color, #3b82f6)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Edit size={12} />
                <span>{t('common.edit', 'Ajustar')}</span>
              </button>
            )}
          </>
        )}

        {/* Barra de progreso inferior */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            height: '100%',
            width: `${progresoPorcentaje}%`,
            background: tiempoTotalSeg <= 30
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : tiempoTotalSeg <= 60
                ? 'linear-gradient(90deg, #f97316, #ea580c)'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
            boxShadow: tiempoTotalSeg <= 60
              ? '0 0 12px rgba(239, 68, 68, 0.8)'
              : 'none',
            transition: 'width 0.4s linear, background 0.3s ease',
            borderRadius: '0 2px 2px 0'
          }} />
        </div>
      </div>

      {/* Botones de Control */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          onClick={handleStartPause}
          style={{
            flex: 2,
            padding: '0.6rem 1rem',
            backgroundColor: corriendo ? '#334155' : '#22c55e',
            color: corriendo ? '#ffffff' : '#000000',
            fontWeight: '700',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
            transition: 'all 0.15s ease'
          }}
        >
          {corriendo ? <Pause size={17} /> : <Play size={17} />}
          {corriendo ? t('timers.pause', 'Pausar Conteo') : t('timers.start', 'Iniciar Conteo')}
        </button>

        <button
          onClick={handleReset}
          style={{
            flex: 1,
            padding: '0.6rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            fontSize: '0.85rem'
          }}
        >
          <RotateCcw size={15} /> {t('common.reset', 'Reiniciar')}
        </button>

        <button
          onClick={() => handleAddMinutes(1)}
          style={{
            flex: 1,
            padding: '0.6rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          +1 min
        </button>

        <button
          onClick={() => handleAddMinutes(5)}
          style={{
            flex: 1,
            padding: '0.6rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          +5 min
        </button>
      </div>
    </div>
  );
};

export default CronometroOnlyTime;
