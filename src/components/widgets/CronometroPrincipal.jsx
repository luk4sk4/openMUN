import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Square, Download, Clock, CheckCircle2, ArrowRightLeft, Shield, HelpCircle, SkipForward, AlertTriangle, ChevronUp, ChevronDown, PictureInPicture2, Search, X, Users } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import FloatingPipTimer from '../common/FloatingPipTimer';
import { usePictureInPictureTimer } from '../../hooks/usePictureInPictureTimer';
import { useTranslation } from 'react-i18next';

const CronometroPrincipal = () => {
  const { t } = useTranslation();
  const { paises, oradoresCola, removerOrador, registrarIntervencion, descargarSesionJSON, actualizarRelojGSL, yieldEvento, cederTiempo } = useSession();

  const [tiempoInicial, setTiempoInicial] = useState(60);
  const [inputSegundos, setInputSegundos] = useState(60);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [corriendo, setCorriendo] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);
  const [modalYieldOpen, setModalYieldOpen] = useState(false);
  const [delegacionDropdownOpen, setDelegacionDropdownOpen] = useState(false);
  const [delegacionBusqueda, setDelegacionBusqueda] = useState('');

  // Hook de Picture-in-Picture interactivo
  const { isPipActive, isSupported: isPipSupported, pipContainer, togglePip, closePip } = usePictureInPictureTimer();

  const oradorActual = oradoresCola.length > 0 ? oradoresCola[0] : { nombre: 'Delegación en uso', bandera: '🇺🇳' };

  // Lista de delegaciones disponibles para ceder tiempo con filtrado por búsqueda
  const delegacionesCeder = useMemo(() => {
    const lista = (paises || []).filter(p => p.nombre !== oradorActual.nombre);
    if (!delegacionBusqueda.trim()) return lista;
    const q = delegacionBusqueda.toLowerCase().trim();
    return lista.filter(p => (p.nombre || '').toLowerCase().includes(q));
  }, [paises, oradorActual.nombre, delegacionBusqueda]);

  const timerRef = useRef(null);

  // Sincronizar estado del reloj con SessionContext (sin forzar re-renders masivos del árbol)
  useEffect(() => {
    actualizarRelojGSL(segundosRestantes, tiempoInicial, corriendo, false);
  }, [segundosRestantes, tiempoInicial, corriendo, actualizarRelojGSL]);

  // Reaccionar a eventos de Yield
  useEffect(() => {
    if (!yieldEvento) return;
    if (yieldEvento.tipo === 'mesa') {
      setCorriendo(false);
      setSegundosRestantes(tiempoInicial);
    } else if (yieldEvento.tipo === 'delegado') {
      if (typeof yieldEvento.segundosRestantes === 'number') {
        setSegundosRestantes(yieldEvento.segundosRestantes);
      }
      setCorriendo(true); // Comienza inmediatamente
    }
  }, [yieldEvento, tiempoInicial]);

  useEffect(() => {
    if (corriendo) {
      timerRef.current = setInterval(() => {
        setSegundosRestantes(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [corriendo]);

  const handleStartPause = () => setCorriendo(!corriendo);

  const handleReset = () => {
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
  };

  const handleAdd5Sec = () => {
    setSegundosRestantes(prev => prev + 5);
  };

  const handleSubtract5Sec = () => {
    setSegundosRestantes(prev => prev - 5);
  };

  const handleAdd15Sec = () => {
    setSegundosRestantes(prev => prev + 15);
  };

  const handleSubtract15Sec = () => {
    setSegundosRestantes(prev => prev - 15);
  };

  const handleCambiarPreset = (nuevosSegundos) => {
    setCorriendo(false);
    setTiempoInicial(nuevosSegundos);
    setSegundosRestantes(nuevosSegundos);
  };

  const handleSiguienteOrador = () => {
    setCorriendo(false);

    let tiempoHabladoExacto = 0;
    let overtime = 0;
    if (segundosRestantes < 0) {
      overtime = Math.abs(segundosRestantes);
      tiempoHabladoExacto = tiempoInicial + overtime;
    } else {
      tiempoHabladoExacto = tiempoInicial - segundosRestantes;
    }

    if (oradoresCola.length > 0) {
      registrarIntervencion(oradoresCola[0].nombre, tiempoInicial, tiempoHabladoExacto, overtime);
      removerOrador(oradoresCola[0].id);
    }

    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 2500);

    setSegundosRestantes(tiempoInicial);
  };

  const handleEjecutarYield = (tipo, destino = '') => {
    cederTiempo(tipo, destino);
    setModalYieldOpen(false);
  };

  // Escuchar eventos globales de atajos de teclado
  useEffect(() => {
    const handleToggle = () => setCorriendo(prev => !prev);
    const handleNext = () => handleSiguienteOrador();
    const handleResetEv = () => handleReset();
    const handleAdjust = (e) => {
      const delta = e.detail?.delta || 0;
      setSegundosRestantes(prev => prev + delta);
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
  }, [tiempoInicial, segundosRestantes, oradoresCola, removerOrador, registrarIntervencion]);

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
        backgroundColor: 'var(--timer-display-bg, var(--card-header-bg))',
        border: '2px solid var(--timer-display-border, var(--border-color))',
        color: 'var(--text-color)'
      }
    };
  };

  const displayState = getTimerStyle(segundosRestantes, corriendo);

  const progresoPorcentaje = tiempoInicial > 0
    ? Math.min(100, Math.max(0, ((tiempoInicial - segundosRestantes) / tiempoInicial) * 100))
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
    }}>
      {/* Header Orador con Máxima Visibilidad y Vista Previa del Siguiente Orador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="xl" />
          <div>
            <div style={{ fontSize: '0.68rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
              {t('timers.currentSpeaker', 'Orador Actual')}
            </div>
            <div style={{ fontWeight: '800', fontSize: '1.15rem', color: 'var(--text-color)', lineHeight: 1.2 }}>
              {oradorActual.nombre}
            </div>
            {oradoresCola.length > 1 && (
              <div style={{ fontSize: '0.72rem', opacity: 0.65, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{t('timers.nextLabel', 'Siguiente')}:</span>
                <CountryFlag bandera={oradoresCola[1].bandera} nombre={oradoresCola[1].nombre} size="xs" />
                <strong>{oradoresCola[1].nombre}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Presets, Tiempo Exacto & PiP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Botón Picture-in-Picture */}
          {isPipSupported && (
            <button
              type="button"
              onClick={togglePip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: `1px solid ${isPipActive ? '#3b82f6' : 'var(--border-color)'}`,
                backgroundColor: isPipActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: isPipActive ? '#60a5fa' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease'
              }}
              title={isPipActive ? 'Cerrar ventana Picture-in-Picture' : 'Abrir ventana flotante Picture-in-Picture (siempre visible sobre Word/PDF)'}
            >
              <PictureInPicture2 size={13} />
              <span>PiP</span>
            </button>
          )}

          {[45, 60, 90, 120].map(s => (
            <button
              key={s}
              onClick={() => {
                setInputSegundos(s);
                handleCambiarPreset(s);
              }}
              style={{
                padding: '0.2rem 0.45rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: tiempoInicial === s ? 'var(--btn-bg)' : 'transparent',
                color: tiempoInicial === s ? 'var(--btn-text)' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease'
              }}
            >
              {s}s
            </button>
          ))}

          {/* Selector de Tiempo Exacto con Flechas Estilizadas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'var(--card-header-bg)',
            padding: '0.15rem 0.35rem',
            borderRadius: '5px',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: '600' }}>{t('timers.exactLabel', 'Exacto')}:</span>
            <input
              type="number"
              min="1"
              max="3600"
              className="no-spin"
              value={inputSegundos}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 0);
                setInputSegundos(val);
                handleCambiarPreset(val);
              }}
              style={{
                width: '38px',
                padding: '0.1rem 0.15rem',
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                borderRadius: '3px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textAlign: 'center',
                outline: 'none'
              }}
              title="Ingresar cantidad exacta de segundos para el cronómetro"
            />
            {/* Flechas estilizadas para sumar/quitar tiempo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button
                type="button"
                onClick={() => {
                  const val = Math.min(3600, inputSegundos + 5);
                  setInputSegundos(val);
                  handleCambiarPreset(val);
                }}
                className="timer-arrow-btn"
                style={{
                  padding: 0,
                  width: '15px',
                  height: '10px',
                  borderRadius: '2px',
                  lineHeight: 1
                }}
                title="Aumentar 5 segundos"
              >
                <ChevronUp size={10} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(1, inputSegundos - 5);
                  setInputSegundos(val);
                  handleCambiarPreset(val);
                }}
                className="timer-arrow-btn"
                style={{
                  padding: 0,
                  width: '15px',
                  height: '10px',
                  borderRadius: '2px',
                  lineHeight: 1
                }}
                title="Quitar 5 segundos"
              >
                <ChevronDown size={10} />
              </button>
            </div>
            <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>s</span>
          </div>
        </div>
      </div>

      {/* Reloj Display con Alertas Visuales */}
      <div
        className={displayState.className}
        style={{
          margin: '0.6rem 0',
          padding: '1.2rem 1rem 1.4rem 1rem',
          borderRadius: '10px',
          textAlign: 'center',
          transition: displayState.className ? 'none' : 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: displayState.className ? undefined : 'var(--timer-display-shadow, 0 4px 20px rgba(0,0,0,0.15))',
          ...displayState.style
        }}
      >
        <div>
          <div style={{
            fontWeight: '900',
            fontSize: 'clamp(5.8rem, 11vw, 7.8rem)',
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            lineHeight: 0.95,
            marginTop: '6px',
            marginBottom: '6px',
            textShadow: 'var(--timer-digits-shadow, none)'
          }}>
            {formatTimeWithNegative(segundosRestantes)}
          </div>
          <div style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: '0.4rem', fontWeight: '700', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            {segundosRestantes < 0 ? (
              <>
                <AlertTriangle size={14} color="#ef4444" />
                <span>{t('timers.overtime', 'TIEMPO EXCEDIDO (OVERTIME)')}</span>
              </>
            ) : (
              `${t('timers.assignedTime', 'Tiempo Asignado')}: ${tiempoInicial}s`
            )}
          </div>
        </div>

        {/* Barra de progreso inferior */}
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
            width: `${progresoPorcentaje}%`,
            background: segundosRestantes <= 5
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : segundosRestantes <= 10
                ? 'linear-gradient(90deg, #f97316, #ea580c)'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
            boxShadow: segundosRestantes <= 10
              ? '0 0 12px rgba(239, 68, 68, 0.8)'
              : 'none',
            transition: 'width 0.4s linear, background 0.3s ease',
            borderRadius: '0 2px 2px 0'
          }} />
        </div>

        {mensajeGuardado && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: '#15803d',
            color: '#ffffff',
            fontSize: '0.72rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <CheckCircle2 size={12} /> {t('common.saved', 'Guardado')}
          </div>
        )}
      </div>

      {/* Botones de Control */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
        <button
          onClick={handleStartPause}
          style={{
            flex: '1 1 120px',
            padding: '0.6rem 0.8rem',
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
            fontSize: '0.85rem',
            transition: 'all 0.15s ease'
          }}
        >
          {corriendo ? <Pause size={16} /> : <Play size={16} />}
          {corriendo ? t('timers.pause', 'Pausar') : t('timers.start', 'Iniciar')}
        </button>

        <button
          onClick={handleReset}
          style={{
            flex: '0 1 45px',
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
            fontSize: '0.85rem'
          }}
          title="Reiniciar"
        >
          <RotateCcw size={15} />
        </button>

        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            onClick={handleSubtract5Sec}
            style={{
              padding: '0.6rem 0.45rem',
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title="Quitar 5 segundos al orador"
          >
            <ChevronDown size={13} />
            <span>-5s</span>
          </button>

          <button
            onClick={handleAdd5Sec}
            style={{
              padding: '0.6rem 0.45rem',
              backgroundColor: 'rgba(34,197,94,0.15)',
              border: '1px solid #22c55e',
              color: '#22c55e',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title="Sumar 5 segundos al orador"
          >
            <ChevronUp size={13} />
            <span>+5s</span>
          </button>

          <button
            onClick={handleAdd15Sec}
            style={{
              padding: '0.6rem 0.45rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title="Sumar 15 segundos al orador"
          >
            <ChevronUp size={13} />
            <span>+15s</span>
          </button>
        </div>

        <button
          onClick={() => setModalYieldOpen(true)}
          disabled={oradoresCola.length === 0}
          style={{
            flex: '1 1 110px',
            padding: '0.6rem 0.7rem',
            backgroundColor: oradoresCola.length > 0 ? '#2563eb' : 'var(--card-header-bg)',
            color: oradoresCola.length > 0 ? '#ffffff' : 'var(--muted-text)',
            fontWeight: '700',
            border: 'none',
            borderRadius: '6px',
            cursor: oradoresCola.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            opacity: oradoresCola.length > 0 ? 1 : 0.5
          }}
          title="Ceder el tiempo restante (Yield)"
        >
          <ArrowRightLeft size={15} /> {t('timers.yield', 'Ceder (Yield)')}
        </button>

        <button
          onClick={handleSiguienteOrador}
          style={{
            flex: '1 1 135px',
            padding: '0.6rem 0.8rem',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontWeight: '700',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem'
          }}
          title="Terminar intervención y pasar al siguiente orador"
        >
          <SkipForward size={16} /> {t('timers.nextSpeaker', 'Siguiente Orador')}
        </button>
      </div>

      {/* Menú/Modal de Yield dentro del Cronómetro */}
      {modalYieldOpen && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.8rem',
          boxSizing: 'border-box',
          borderRadius: 'var(--border-radius)'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1rem',
            width: '100%',
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            color: 'var(--text-color)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRightLeft size={18} color="#3b82f6" />
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700' }}>
                {t('timers.yield', 'Ceder el tiempo (Yield)')}
              </h4>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.35 }}>
              {t('timers.yieldDesc', 'El orador actual')} (<strong>{oradorActual.nombre}</strong>) {t('timers.yieldDescSuffix', 'cede su tiempo')} ({segundosRestantes}s) {t('timers.yieldDescTo', 'a')}:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <button
                onClick={() => handleEjecutarYield('mesa')}
                style={{
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontWeight: '600',
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left'
                }}
              >
                <Shield size={16} color="#eab308" /> {t('timers.yieldChair', 'A la Mesa (Chair)')}
              </button>

              <button
                onClick={() => handleEjecutarYield('preguntas')}
                style={{
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontWeight: '600',
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left'
                }}
              >
                <HelpCircle size={16} color="#3b82f6" /> {t('timers.yieldQuestions', 'A Preguntas del Pleno')}
              </button>

              <div style={{ borderTop: '1px solid var(--subborder-color)', paddingTop: '0.45rem' }}>
                <div style={{ fontSize: '0.73rem', opacity: 0.7, marginBottom: '0.35rem', fontWeight: '600' }}>
                  {t('timers.yieldDelegation', 'A otra Delegación:')}
                </div>

                {/* Botón trigger del selector de delegación */}
                <button
                  type="button"
                  onClick={() => setDelegacionDropdownOpen(prev => !prev)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', opacity: 0.85 }}>
                    <Users size={15} color="#3b82f6" />
                    <span>{t('timers.selectDelegation', 'Seleccionar delegación...')}</span>
                  </span>
                  {delegacionDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Menú desplegable flotante con CountryFlag y búsqueda */}
                {delegacionDropdownOpen && (
                  <div style={{
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '190px'
                  }}>
                    {/* Buscador Rápido de Delegación */}
                    <div style={{
                      padding: '0.35rem 0.5rem',
                      borderBottom: '1px solid var(--subborder-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)'
                    }}>
                      <Search size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
                      <input
                        type="text"
                        autoFocus
                        value={delegacionBusqueda}
                        onChange={e => setDelegacionBusqueda(e.target.value)}
                        placeholder="Buscar delegación..."
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-color)',
                          fontSize: '0.75rem'
                        }}
                      />
                      {delegacionBusqueda && (
                        <button
                          type="button"
                          onClick={() => setDelegacionBusqueda('')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Lista con Banderas Gráficas Reales */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.2rem' }}>
                      {delegacionesCeder.length === 0 ? (
                        <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.73rem', color: 'var(--muted-text)' }}>
                          No se encontraron delegaciones
                        </div>
                      ) : (
                        delegacionesCeder.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setDelegacionDropdownOpen(false);
                              setDelegacionBusqueda('');
                              handleEjecutarYield('delegado', p.nombre);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.4rem 0.55rem',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: 'transparent',
                              color: 'var(--text-color)',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--card-hover, rgba(255,255,255,0.06))'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <CountryFlag country={p} bandera={p.bandera} nombre={p.nombre} size="sm" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.nombre}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setModalYieldOpen(false);
                setDelegacionDropdownOpen(false);
                setDelegacionBusqueda('');
              }}
              style={{
                marginTop: '0.2rem',
                padding: '0.4rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '600'
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </button>
          </div>
        </div>
      )}

      {/* Renderizado en Portal del Picture-in-Picture */}
      <FloatingPipTimer
        targetContainer={pipContainer}
        oradorActual={oradorActual}
        tipoDebate="GSL"
        segundosRestantes={segundosRestantes}
        tiempoInicial={tiempoInicial}
        corriendo={corriendo}
        onToggleTimer={handleStartPause}
        onSiguienteOrador={handleSiguienteOrador}
        onResetTimer={handleReset}
        onClosePip={closePip}
      />
    </div>
  );
};

export default CronometroPrincipal;
