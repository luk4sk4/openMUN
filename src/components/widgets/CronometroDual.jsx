import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Clock, Trash2, ArrowUpDown, GripVertical, Mic, ChevronUp, ChevronDown, Plus, Minus, PictureInPicture2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import FloatingPipTimer from '../common/FloatingPipTimer';
import { usePictureInPictureTimer } from '../../hooks/usePictureInPictureTimer';
import { useTranslation } from 'react-i18next';

const CronometroDual = ({ modoInicial = null }) => {
  const { t } = useTranslation();
  const {
    paises,
    caucusActivo,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    avanzarOradorCaucus,
    vaciarOradoresDebate,
    ordenarOradoresDebateAlfabetico,
    reordenarOradoresDebate,
    registrarIntervencion
  } = useSession();

  const [modoSeleccionado, setModoSeleccionado] = useState(modoInicial);

  const tipoMocion = modoSeleccionado || caucusActivo?.tipo || (modoInicial || 'Caucus Moderado');
  const esTiempoSoloGeneral = tipoMocion === 'Caucus No Moderado' || tipoMocion.includes('Consulta General');

  const [tiempoTotalSeg, setTiempoTotalSeg] = useState(caucusActivo?.tiempoTotal || 600);
  const [tiempoTotalInicial, setTiempoTotalInicial] = useState(caucusActivo?.tiempoTotal || 600);
  const [tiempoOradorSeg, setTiempoOradorSeg] = useState(caucusActivo?.tiempoOrador || 45);
  const [limiteOradorSeg, setLimiteOradorSeg] = useState(caucusActivo?.tiempoOrador || 45);
  const [corriendo, setCorriendo] = useState(false);

  const [busquedaPais, setBusquedaPais] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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

  // Conteo reactivo e ininterrumpido
  useEffect(() => {
    if (corriendo) {
      timerRef.current = setInterval(() => {
        // Conteo del Tiempo Total Caucus
        if (tipoMocion !== 'Tour de Table') {
          setTiempoTotalSeg(prev => prev - 1);
        }

        // Conteo del Tiempo Orador
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
    
    // Registrar el tiempo hablado en el histórico
    if (oradorActual && oradorActual.nombre && oradorActual.nombre !== 'Sin orador en cola') {
      const tiempoHabladoExacto = Math.max(1, limiteOradorSeg - tiempoOradorSeg);
      const overtime = tiempoOradorSeg < 0 ? Math.abs(tiempoOradorSeg) : 0;
      registrarIntervencion(oradorActual.nombre, limiteOradorSeg, tiempoHabladoExacto, overtime);
    }

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

  const handleAumentarSegundos = (seg) => {
    handleModificarTiempoTotal(seg);
  };

  const handleAumentar5MinCaucus = () => {
    handleModificarTiempoTotal(300);
  };

  const handleAumentar5SegOrador = () => {
    handleModificarTiempoOrador(5);
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

  // Formato con soporte de números negativos (-00:01, -00:02...)
  const formatTimeWithNegative = (seg) => {
    const isNegative = seg < 0;
    const absSeg = Math.abs(seg);
    const mins = Math.floor(absSeg / 60);
    const secs = absSeg % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  // Clase dinámica para alertas visuales (naranja a 10s, parpadeo rojo a 5s, negativo en < 0)
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

  const oradorActual = oradoresCaucus.length > 0
    ? oradoresCaucus[0]
    : { nombre: 'Sin orador en cola', bandera: '🇺🇳' };

  const paisesDisponiblesCaucus = paises.filter(p =>
    p.nombre.toLowerCase().includes(busquedaPais.toLowerCase()) &&
    !oradoresCaucus.some(o => o.nombre === p.nombre)
  );

  const handleAñadirOradorCaucus = (p) => {
    agregarOradorCaucus(p);
    setBusquedaPais('');
  };

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
      padding: '1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.6rem'
    }}>
      {/* Header Tipo de Moción & Selector Dinámico de Modo */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Clock size={16} style={{ opacity: 0.7 }} />
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                Moción: <span style={{ color: 'var(--text-color)', opacity: 0.9 }}>{tipoMocion}</span>
              </div>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-color)' }}>
                {caucusActivo?.tema || 'Sin Tema Asignado'}
              </div>
            </div>
          </div>

          {/* Selector de Modo Manual */}
          <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: 'var(--card-header-bg)', padding: '2px', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setModoSeleccionado('Caucus Moderado')}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: '700',
                backgroundColor: tipoMocion === 'Caucus Moderado' ? 'var(--btn-bg)' : 'transparent',
                color: tipoMocion === 'Caucus Moderado' ? 'var(--btn-text)' : 'var(--muted-text)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t('motions.modCaucus', 'Moderado')}
            </button>
            <button
              onClick={() => setModoSeleccionado('Caucus No Moderado')}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: '700',
                backgroundColor: tipoMocion === 'Caucus No Moderado' ? 'var(--btn-bg)' : 'transparent',
                color: tipoMocion === 'Caucus No Moderado' ? 'var(--btn-text)' : 'var(--muted-text)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t('motions.unmodCaucus', 'No Moderado')}
            </button>
            <button
              onClick={() => setModoSeleccionado('Tour de Table')}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: '700',
                backgroundColor: tipoMocion === 'Tour de Table' ? 'var(--btn-bg)' : 'transparent',
                color: tipoMocion === 'Tour de Table' ? 'var(--btn-text)' : 'var(--muted-text)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t('motions.roundRobin', 'Tour de Table')}
            </button>
          </div>

          {/* Botón Picture-in-Picture */}
          {isPipSupported && (
            <button
              type="button"
              onClick={togglePip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
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
        </div>
      </div>

      {/* VISTA 1: CAUCUS NO MODERADO O CONSULTA GENERAL */}
      {esTiempoSoloGeneral && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
          <div
            className={displayTotalState.className}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '1.5rem 1.5rem 1.8rem 1.5rem',
              borderRadius: '8px',
              textAlign: 'center',
              transition: displayTotalState.className ? 'none' : 'all 0.3s ease',
              boxShadow: displayTotalState.className ? undefined : 'var(--timer-display-shadow, 0 4px 20px rgba(0,0,0,0.15))',
              ...displayTotalState.style
            }}
          >
            <div style={{ fontSize: '0.85rem', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
              {tipoMocion.includes('Consulta General') ? 'Tiempo Total de Consulta General' : 'Tiempo Total del Caucus No Moderado'}
            </div>
            <div style={{
              fontWeight: '900',
              fontSize: 'clamp(5.8rem, 11vw, 7.8rem)',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              lineHeight: 0.95,
              marginTop: '8px',
              marginBottom: '8px',
              textShadow: 'var(--timer-digits-shadow, none)'
            }}>
              {formatTimeWithNegative(tiempoTotalSeg)}
            </div>

            {/* Barra de progreso inferior con degradado y glow suave */}
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
                width: `${progresoTotalPorcentaje}%`,
                background: tiempoTotalSeg <= 30
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : tiempoTotalSeg <= 60
                    ? 'linear-gradient(90deg, #f97316, #ea580c)'
                    : 'linear-gradient(90deg, #3b82f6, #6366f1, #ec4899)',
                boxShadow: tiempoTotalSeg <= 60
                  ? '0 0 12px rgba(239, 68, 68, 0.8)'
                  : '0 0 10px rgba(99, 102, 241, 0.6)',
                transition: 'width 0.4s linear, background 0.3s ease',
                borderRadius: '0 2px 2px 0'
              }} />
            </div>
          </div>

          {/* BOTONES DE CONTROL Y TIEMPO RÁPIDO */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleStartPause}
              style={{
                flex: '2 1 120px',
                padding: '0.6rem',
                backgroundColor: corriendo ? '#334155' : '#22c55e',
                color: corriendo ? '#ffffff' : '#000000',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem',
                transition: 'all 0.15s ease'
              }}
            >
              {corriendo ? <Pause size={15} /> : <Play size={15} />}
              {corriendo ? t('timers.pause', 'Pausar') : t('timers.start', 'Play (Iniciar)')}
            </button>

            <button
              onClick={handleReset}
              style={{
                flex: '1 1 80px',
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
                gap: '0.25rem',
                fontSize: '0.85rem'
              }}
              title="Reiniciar"
            >
              <RotateCcw size={15} /> {t('common.reset', 'Reiniciar')}
            </button>

            {/* Flechas estilizadas para sumar/quitar tiempo total del Caucus */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleModificarTiempoTotal(-300)}
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
                title="Quitar 5 minutos"
              >
                <ChevronDown size={13} />
                <span>-5m</span>
              </button>

              <button
                type="button"
                onClick={() => handleModificarTiempoTotal(-60)}
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
                title="Quitar 1 minuto"
              >
                <ChevronDown size={13} />
                <span>-1m</span>
              </button>

              <button
                type="button"
                onClick={() => handleModificarTiempoTotal(60)}
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
                title="Sumar 1 minuto"
              >
                <ChevronUp size={13} />
                <span>+1m</span>
              </button>

              <button
                type="button"
                onClick={() => handleModificarTiempoTotal(300)}
                style={{
                  padding: '0.6rem 0.45rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontWeight: '700',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.15s ease'
                }}
                title="Sumar 5 minutos"
              >
                <ChevronUp size={13} />
                <span>+5m</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: TOUR DE TABLE */}
      {tipoMocion === 'Tour de Table' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Display Grande Orador */}
          <div
            className={displayOradorState.className}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '0.8rem 0.8rem 1.1rem 0.8rem',
              borderRadius: '8px',
              textAlign: 'center',
              transition: displayOradorState.className ? 'none' : 'all 0.3s ease',
              boxShadow: displayOradorState.className ? undefined : 'var(--timer-display-shadow, 0 4px 20px rgba(0,0,0,0.15))',
              ...displayOradorState.style
            }}
          >
            <div style={{ fontSize: '1.35rem', marginBottom: '0.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="lg" />
              <span>{oradorActual.nombre}</span>
            </div>
            <div style={{
              fontWeight: '900',
              fontSize: 'clamp(4.8rem, 8.5vw, 6.2rem)',
              fontFamily: 'monospace',
              lineHeight: 0.95,
              marginTop: '6px',
              marginBottom: '6px',
              letterSpacing: '0.04em',
              textShadow: 'var(--timer-digits-shadow, none)'
            }}>
              {formatTimeWithNegative(tiempoOradorSeg)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Asignado ({limiteOradorSeg}s)</span>
              
              {/* Flechas estilizadas para sumar/quitar tiempo al orador en Tour de Table */}
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleModificarTiempoOrador(-5)}
                  style={{
                    padding: '0.15rem 0.4rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Quitar 5 segundos al orador"
                >
                  <ChevronDown size={11} />
                  <span>-5s</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModificarTiempoOrador(5)}
                  style={{
                    padding: '0.15rem 0.4rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sumar 5 segundos al orador"
                >
                  <ChevronUp size={11} />
                  <span>+5s</span>
                </button>
              </div>
            </div>

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
                width: `${progresoOradorPorcentaje}%`,
                background: tiempoOradorSeg <= 5
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : tiempoOradorSeg <= 10
                    ? 'linear-gradient(90deg, #f97316, #ea580c)'
                    : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                transition: 'width 0.4s linear, background 0.3s ease',
                borderRadius: '0 2px 2px 0'
              }} />
            </div>
          </div>

          {/* BOTONES DE CONTROL */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={handleStartPause}
              style={{
                flex: 2,
                padding: '0.55rem',
                backgroundColor: corriendo ? '#334155' : '#22c55e',
                color: corriendo ? '#ffffff' : '#000000',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              {corriendo ? <Pause size={15} /> : <Play size={15} />}
              {corriendo ? 'Pausar' : 'Iniciar'}
            </button>

            <button
              onClick={handleSiguienteOrador}
              style={{
                flex: 2,
                padding: '0.55rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              <SkipForward size={15} /> {t('timers.nextSpeaker', 'Sig. Orador')}
            </button>

            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '0.55rem',
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
          </div>

          {/* LISTA DE SIGUIENTES ORADORES (TOUR DE TABLE) */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem', backgroundColor: 'var(--card-header-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.75, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tour de Table ({oradoresCaucus.length}):
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={ordenarOradoresDebateAlfabetico}
                  disabled={oradoresCaucus.length <= 1}
                  title="Ordenar Tour de Table alfabéticamente (A-Z)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-color)',
                    cursor: oradoresCaucus.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: oradoresCaucus.length <= 1 ? 0.4 : 1
                  }}
                >
                  <ArrowUpDown size={11} />
                  <span>A-Z</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (oradoresCaucus.length > 0) {
                      vaciarOradoresDebate();
                    }
                  }}
                  disabled={oradoresCaucus.length === 0}
                  title="Eliminar todos los oradores de Tour de Table"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    cursor: oradoresCaucus.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: oradoresCaucus.length === 0 ? 0.4 : 1
                  }}
                >
                  <Trash2 size={11} />
                  <span>{t('common.clearAll', 'Eliminar todos')}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {oradoresCaucus.map((o, idx) => {
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;

                return (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndexStr = e.dataTransfer.getData('text/plain');
                      const fromIndex = parseInt(fromIndexStr, 10);
                      if (!isNaN(fromIndex) && fromIndex !== idx) {
                        reordenarOradoresDebate(fromIndex, idx);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.92rem',
                      backgroundColor: isDragging
                        ? 'rgba(245, 158, 11, 0.15)'
                        : (idx === 0 ? 'rgba(34,197,94,0.12)' : (idx === 1 ? 'rgba(59,130,246,0.08)' : 'var(--panel-color)')),
                      border: isDragOver
                        ? '2px dashed #f59e0b'
                        : `1px solid ${isDragging ? '#f59e0b' : (idx === 0 ? '#166534' : (idx === 1 ? 'rgba(59,130,246,0.3)' : 'var(--subborder-color)'))}`,
                      borderRadius: '5px',
                      opacity: isDragging ? 0.5 : 1,
                      cursor: 'grab',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <GripVertical size={13} style={{ color: '#71717a', cursor: 'grab', flexShrink: 0 }} title="Arrastrar para reordenar" />
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: idx === 0 ? '#4ade80' : (idx === 1 ? '#60a5fa' : 'var(--muted-text)'), width: '22px' }}>
                        #{idx + 1}
                      </span>
                      <CountryFlag bandera={o.bandera} nombre={o.nombre} size="md" />
                      <span style={{ fontWeight: idx === 0 ? '800' : '600', color: 'var(--text-color)', fontSize: '0.92rem' }}>
                        {o.nombre}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {idx === 0 && (
                        <span style={{ backgroundColor: '#15803d', color: '#ffffff', fontWeight: '800', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                          HABLANDO
                        </span>
                      )}
                      {idx === 1 && (
                        <span style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: '700', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                          SIGUIENTE
                        </span>
                      )}
                      <button
                        onClick={() => removerOradorCaucus(o.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          opacity: 0.7,
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '3px'
                        }}
                        title="Quitar de Tour de Table"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: CAUCUS MODERADO */}
      {tipoMocion === 'Caucus Moderado' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Reloj Superior (Total Caucus) */}
          <div style={{
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '7px',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.4rem'
          }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.75, fontWeight: '700', letterSpacing: '0.02em' }}>{t('timers.totalCaucusTime', 'Tiempo Total Caucus:')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '1.65rem', letterSpacing: '0.04em', color: tiempoTotalSeg < 0 ? '#ef4444' : 'var(--text-color)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {formatTimeWithNegative(tiempoTotalSeg)}
              </span>
              
              {/* Flechas estilizadas para sumar/quitar tiempo al total del Caucus */}
              <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(-300)}
                  style={{
                    padding: '0.2rem 0.4rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Quitar 5 minutos al caucus"
                >
                  <ChevronDown size={11} />
                  <span>-5m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(-60)}
                  style={{
                    padding: '0.2rem 0.4rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Quitar 1 minuto al caucus"
                >
                  <ChevronDown size={11} />
                  <span>-1m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(60)}
                  style={{
                    padding: '0.2rem 0.4rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sumar 1 minuto al caucus"
                >
                  <ChevronUp size={11} />
                  <span>+1m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModificarTiempoTotal(300)}
                  style={{
                    padding: '0.2rem 0.45rem',
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '800',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sumar 5 minutos al caucus"
                >
                  <ChevronUp size={11} />
                  <span>+5m</span>
                </button>
              </div>
            </div>
          </div>

          {/* Display Principal Orador con Máxima Prominencia y Visibilidad para Proyección */}
          <div
            className={displayOradorState.className}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '0.75rem 0.8rem 1rem 0.8rem',
              borderRadius: '10px',
              textAlign: 'center',
              transition: displayOradorState.className ? 'none' : 'all 0.3s ease',
              boxShadow: displayOradorState.className ? undefined : 'var(--timer-display-shadow, 0 4px 20px rgba(0,0,0,0.15))',
              ...displayOradorState.style
            }}
          >
            <div style={{ fontSize: '1.35rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
              <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre} size="lg" />
              <span>{oradorActual.nombre}</span>
              {oradorActual.esProponenteUltimo && (
                <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255,255,255,0.12)', color: 'var(--text-color)', padding: '0.12rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                  PROPONENTE
                </span>
              )}
            </div>
            <div style={{
              fontWeight: '900',
              fontSize: 'clamp(4.8rem, 8.5vw, 6.2rem)',
              fontFamily: 'monospace',
              lineHeight: 0.95,
              marginTop: '6px',
              marginBottom: '6px',
              letterSpacing: '0.04em',
              textShadow: 'var(--timer-digits-shadow, none)'
            }}>
              {formatTimeWithNegative(tiempoOradorSeg)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', alignItems: 'center', marginTop: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.75, fontWeight: '600' }}>Límite ({limiteOradorSeg}s)</span>
              
              {/* Flechas estilizadas para sumar/quitar tiempo al orador */}
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleModificarTiempoOrador(-5)}
                  style={{
                    padding: '0.15rem 0.45rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Quitar 5 segundos al orador"
                >
                  <ChevronDown size={12} />
                  <span>-5s</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModificarTiempoOrador(5)}
                  style={{
                    padding: '0.15rem 0.45rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.18)',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sumar 5 segundos al orador"
                >
                  <ChevronUp size={12} />
                  <span>+5s</span>
                </button>
              </div>
            </div>

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
                width: `${progresoOradorPorcentaje}%`,
                background: tiempoOradorSeg <= 5
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : tiempoOradorSeg <= 10
                    ? 'linear-gradient(90deg, #f97316, #ea580c)'
                    : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                transition: 'width 0.4s linear, background 0.3s ease',
                borderRadius: '0 2px 2px 0'
              }} />
            </div>
          </div>

          {/* BOTONES DE CONTROL */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={handleStartPause}
              style={{
                flex: 2,
                padding: '0.55rem',
                backgroundColor: corriendo ? '#334155' : '#22c55e',
                color: corriendo ? '#ffffff' : '#000000',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              {corriendo ? <Pause size={15} /> : <Play size={15} />}
              {corriendo ? t('timers.pause', 'Pausar') : t('timers.start', 'Iniciar')}
            </button>

            <button
              onClick={handleSiguienteOrador}
              style={{
                flex: 2,
                padding: '0.55rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              <SkipForward size={15} /> {t('timers.nextSpeaker', 'Sig. Orador')}
            </button>

            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '0.55rem',
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
          </div>

          {/* LISTA DE SIGUIENTES ORADORES DEL CAUCUS */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem', backgroundColor: 'var(--card-header-bg)', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mic size={13} /> {t('timers.debateSpeakers', 'Oradores Debate')} ({oradoresCaucus.length})
              </span>
              
              {/* Botones de orden alfabético y eliminar todos de debate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={ordenarOradoresDebateAlfabetico}
                  disabled={oradoresCaucus.length <= 1}
                  title="Ordenar debate alfabéticamente (A-Z)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-color)',
                    cursor: oradoresCaucus.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: oradoresCaucus.length <= 1 ? 0.4 : 1
                  }}
                >
                  <ArrowUpDown size={11} />
                  <span>A-Z</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (oradoresCaucus.length > 0) {
                      vaciarOradoresDebate();
                    }
                  }}
                  disabled={oradoresCaucus.length === 0}
                  title="Eliminar todos los oradores de Debate"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    cursor: oradoresCaucus.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: oradoresCaucus.length === 0 ? 0.4 : 1
                  }}
                >
                  <Trash2 size={11} />
                  <span>{t('common.clearAll', 'Eliminar todos')}</span>
                </button>
              </div>
            </div>

            {/* Mini Buscador */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={t('timers.addDelegatePlaceholder', 'Añadir delegado al caucus...')}
                value={busquedaPais}
                onChange={e => setBusquedaPais(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: '5px',
                  boxSizing: 'border-box'
                }}
              />
              {busquedaPais.trim().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  zIndex: 20,
                  borderRadius: '5px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}>
                  {paisesDisponiblesCaucus.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAñadirOradorCaucus(p)}
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid var(--subborder-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                      <span style={{ fontWeight: '600' }}>{p.nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Render de la Cola del Caucus */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '2px' }}>
              {oradoresCaucus.length === 0 ? (
                <div style={{ fontSize: '0.78rem', opacity: 0.4, textAlign: 'center', margin: 'auto' }}>
                  {t('timers.noSpeakersInQueue', 'Sin oradores en la cola del caucus.')}
                </div>
              ) : (
                oradoresCaucus.map((o, idx) => {
                  const isDragging = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx;

                  return (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedIndex(idx);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== idx) {
                          setDragOverIndex(idx);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverIndex === idx) {
                          setDragOverIndex(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndexStr = e.dataTransfer.getData('text/plain');
                        const fromIndex = parseInt(fromIndexStr, 10);
                        if (!isNaN(fromIndex) && fromIndex !== idx) {
                          reordenarOradoresDebate(fromIndex, idx);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.45rem 0.65rem',
                        backgroundColor: isDragging 
                          ? 'rgba(249, 115, 22, 0.15)' 
                          : (idx === 0 ? 'rgba(34,197,94,0.12)' : (idx === 1 ? 'rgba(59,130,246,0.08)' : 'var(--panel-color)')),
                        border: isDragOver
                          ? '2px dashed #f97316'
                          : `1px solid ${isDragging ? '#f97316' : (idx === 0 ? '#166534' : (idx === 1 ? 'rgba(59,130,246,0.3)' : 'var(--subborder-color)'))}`,
                        borderRadius: '5px',
                        opacity: isDragging ? 0.5 : 1,
                        cursor: 'grab',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <GripVertical size={13} style={{ color: '#71717a', cursor: 'grab', flexShrink: 0 }} title="Arrastrar para reordenar" />
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: idx === 0 ? '#4ade80' : (idx === 1 ? '#60a5fa' : 'var(--muted-text)'), width: '22px' }}>
                          #{idx + 1}
                        </span>
                        <CountryFlag bandera={o.bandera} nombre={o.nombre} size="md" />
                        <span style={{ fontWeight: idx === 0 ? '800' : '600', fontSize: '0.92rem', color: 'var(--text-color)' }}>
                          {o.nombre}
                        </span>
                        {o.esProponenteUltimo && (
                          <span style={{ fontSize: '0.62rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px', opacity: 0.7 }}>
                            (Último)
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {idx === 0 && (
                          <span style={{ backgroundColor: '#15803d', color: '#ffffff', fontWeight: '800', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '4px' }}>
                            HABLANDO
                          </span>
                        )}
                        {idx === 1 && (
                          <span style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: '700', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '4px' }}>
                            SIGUIENTE
                          </span>
                        )}

                        <button
                          onClick={() => removerOradorCaucus(o.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            opacity: 0.7,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '3px'
                          }}
                          title="Quitar de la lista"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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
