import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  SkipForward, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from './CountryFlag';
import { playTimerAlarm } from '../../utils/audioAlerts';
import './SecretariatDebateTimer.css';

export default function SecretariatDebateTimer({
  oradorActual,
  caucusActivo,
  oradoresGSL = [],
  oradoresCaucus = []
}) {
  const { t } = useTranslation();
  const { relojDebateState, controlarRelojDebate } = useSession();

  // Modo de debate: por defecto sigue si el caucus está activo o no, pero el usuario puede alternarlo
  const [modoManual, setModoManual] = useState(null);
  const esCaucusActivo = Boolean(caucusActivo?.activo);
  const modoDebate = modoManual || (esCaucusActivo ? 'CAUCUS' : 'GSL');

  // Seguir automáticamente el modo del debate cuando el caucus se activa o desactiva
  useEffect(() => {
    if (esCaucusActivo) {
      setModoManual('CAUCUS');
    } else if (modoManual === 'CAUCUS' && !esCaucusActivo) {
      setModoManual(null);
    }
  }, [esCaucusActivo]);

  // Estado local sincronizado con el cronómetro principal
  const initialReloj = relojDebateState || {};
  const [corriendo, setCorriendo] = useState(() => Boolean(initialReloj.corriendo));

  const [tiempoInicial, setTiempoInicial] = useState(() => {
    if (modoDebate === 'CAUCUS') {
      return initialReloj.limiteOradorSeg || caucusActivo?.tiempoOrador || 45;
    }
    return initialReloj.tiempoInicial || 60;
  });

  const [segundosRestantes, setSegundosRestantes] = useState(() => {
    const init = modoDebate === 'CAUCUS' 
      ? (initialReloj.limiteOradorSeg || caucusActivo?.tiempoOrador || 45) 
      : (initialReloj.tiempoInicial || 60);
    const base = modoDebate === 'CAUCUS' 
      ? (initialReloj.tiempoOradorSeg ?? init) 
      : (initialReloj.segundosRestantes ?? init);

    if (initialReloj.corriendo && initialReloj.timestamp) {
      const elapsed = Math.floor((Date.now() - initialReloj.timestamp) / 1000);
      return base - elapsed;
    }
    return base;
  });

  const [tiempoTotalRestante, setTiempoTotalRestante] = useState(() => {
    const totalInit = caucusActivo?.tiempoTotal || 600;
    const base = initialReloj.tiempoTotalSeg ?? totalInit;
    if (initialReloj.corriendo && initialReloj.timestamp) {
      const elapsed = Math.floor((Date.now() - initialReloj.timestamp) / 1000);
      return Math.max(0, base - elapsed);
    }
    return base;
  });

  // Reaccionar a cambios globales en relojDebateState o caucusActivo
  useEffect(() => {
    if (!relojDebateState) return;
    if (typeof relojDebateState.corriendo === 'boolean') {
      setCorriendo(relojDebateState.corriendo);
    }
    const currentModo = relojDebateState.modo || (esCaucusActivo ? 'CAUCUS' : 'GSL');
    if (currentModo === 'CAUCUS') {
      const init = relojDebateState.limiteOradorSeg || caucusActivo?.tiempoOrador || 45;
      setTiempoInicial(init);
      if (typeof relojDebateState.tiempoOradorSeg === 'number') {
        if (relojDebateState.corriendo && relojDebateState.timestamp) {
          const elapsed = Math.floor((Date.now() - relojDebateState.timestamp) / 1000);
          setSegundosRestantes(relojDebateState.tiempoOradorSeg - elapsed);
        } else {
          setSegundosRestantes(relojDebateState.tiempoOradorSeg);
        }
      }
      if (typeof relojDebateState.tiempoTotalSeg === 'number') {
        if (relojDebateState.corriendo && relojDebateState.timestamp) {
          const elapsed = Math.floor((Date.now() - relojDebateState.timestamp) / 1000);
          setTiempoTotalRestante(Math.max(0, relojDebateState.tiempoTotalSeg - elapsed));
        } else {
          setTiempoTotalRestante(relojDebateState.tiempoTotalSeg);
        }
      }
    } else {
      const init = relojDebateState.tiempoInicial || 60;
      setTiempoInicial(init);
      if (typeof relojDebateState.segundosRestantes === 'number') {
        if (relojDebateState.corriendo && relojDebateState.timestamp) {
          const elapsed = Math.floor((Date.now() - relojDebateState.timestamp) / 1000);
          setSegundosRestantes(relojDebateState.segundosRestantes - elapsed);
        } else {
          setSegundosRestantes(relojDebateState.segundosRestantes);
        }
      }
    }
  }, [relojDebateState, esCaucusActivo, caucusActivo?.tiempoOrador, caucusActivo?.tiempoTotal]);

  const tiempoTotalInit = caucusActivo?.tiempoTotal || 600;
  const alarmPlayedRef = useRef(false);

  // Conteo local por segundo cuando está corriendo
  useEffect(() => {
    if (!corriendo) return;
    const interval = setInterval(() => {
      setSegundosRestantes(prev => prev - 1);
      if (modoDebate === 'CAUCUS') {
        setTiempoTotalRestante(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [corriendo, modoDebate]);

  // Alerta acústica cuando el contador llega exactamente a 0
  useEffect(() => {
    if (corriendo && segundosRestantes === 0 && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true;
      try {
        playTimerAlarm(0.35);
      } catch { /* ignore */ }
    }
    if (!corriendo) {
      alarmPlayedRef.current = false;
    }
  }, [corriendo, segundosRestantes]);

  // Señal 1 (start) y Señal 2 (stop) bidireccionales con el cronómetro principal
  const handleToggleTimer = () => {
    const next = !corriendo;
    setCorriendo(next);
    if (controlarRelojDebate) {
      controlarRelojDebate(next ? 'start' : 'stop', {
        source: 'secretariat',
        segundosRestantes,
        tiempoInicial,
        tiempoOradorSeg: segundosRestantes,
        limiteOradorSeg: tiempoInicial,
        tiempoTotalSeg: tiempoTotalRestante,
        modo: modoDebate
      });
    }
  };

  const handleResetTimer = () => {
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
    if (controlarRelojDebate) {
      controlarRelojDebate('reset', {
        source: 'secretariat',
        tiempoInicial,
        segundosRestantes: tiempoInicial,
        limiteOradorSeg: tiempoInicial,
        tiempoOradorSeg: tiempoInicial,
        modo: modoDebate
      });
    }
  };

  const handleAdjustTime = (delta) => {
    setSegundosRestantes(prev => prev + delta);
    if (controlarRelojDebate) {
      controlarRelojDebate('adjust', { source: 'secretariat', delta, modo: modoDebate });
    }
  };

  const handleNextSpeaker = () => {
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
    if (controlarRelojDebate) {
      controlarRelojDebate('next_speaker', {
        source: 'secretariat',
        modo: modoDebate,
        tiempoInicial,
        segundosRestantes: tiempoInicial,
        limiteOradorSeg: tiempoInicial,
        tiempoOradorSeg: tiempoInicial
      });
    }
  };

  const handleSetPreset = (seg) => {
    setCorriendo(false);
    setTiempoInicial(seg);
    setSegundosRestantes(seg);
    if (controlarRelojDebate) {
      controlarRelojDebate('set_preset', {
        source: 'secretariat',
        segundos: seg,
        tiempoInicial: seg,
        limiteOradorSeg: seg,
        tiempoOradorSeg: seg,
        modo: modoDebate
      });
    }
  };

  // Receptor de señales sincronizadas desde el cronómetro principal
  useEffect(() => {
    const handleTimerSignal = (e) => {
      const detail = e.detail;
      if (!detail || detail.source === 'secretariat') return; // ignorar propia señal

      const targetModo = detail.modo || (esCaucusActivo ? 'CAUCUS' : 'GSL');
      if (detail.modo && (detail.modo === 'CAUCUS' || detail.modo === 'GSL')) {
        setModoManual(detail.modo);
      }

      const {
        signal,
        segundosRestantes: gslSeg,
        tiempoInicial: gslInit,
        tiempoOradorSeg: oradorSeg,
        limiteOradorSeg: limiteSeg,
        tiempoTotalSeg: totalSeg
      } = detail;

      const segToUse = targetModo === 'CAUCUS'
        ? (typeof oradorSeg === 'number' ? oradorSeg : (typeof limiteSeg === 'number' ? limiteSeg : null))
        : (typeof gslSeg === 'number' ? gslSeg : (typeof gslInit === 'number' ? gslInit : null));

      const initToUse = targetModo === 'CAUCUS'
        ? (typeof limiteSeg === 'number' ? limiteSeg : (typeof oradorSeg === 'number' ? oradorSeg : null))
        : (typeof gslInit === 'number' ? gslInit : null);

      if (typeof totalSeg === 'number') {
        setTiempoTotalRestante(totalSeg);
      }
      if (initToUse !== null) {
        setTiempoInicial(initToUse);
      }

      if (signal === 'start') {
        if (segToUse !== null) setSegundosRestantes(segToUse);
        setCorriendo(true);
      } else if (signal === 'stop' || signal === 'pause') {
        if (segToUse !== null) setSegundosRestantes(segToUse);
        setCorriendo(false);
      } else if (signal === 'reset') {
        setCorriendo(false);
        const resetSeg = initToUse !== null ? initToUse : tiempoInicial;
        setSegundosRestantes(resetSeg);
      } else if (signal === 'next_speaker') {
        setCorriendo(false);
        const nextSeg = initToUse !== null ? initToUse : (segToUse !== null ? segToUse : tiempoInicial);
        setSegundosRestantes(nextSeg);
      } else if (signal === 'adjust') {
        if (typeof detail.delta === 'number') {
          setSegundosRestantes(prev => prev + detail.delta);
        }
      }
    };

    window.addEventListener('openmun_timer_signal', handleTimerSignal);
    return () => window.removeEventListener('openmun_timer_signal', handleTimerSignal);
  }, [tiempoInicial, esCaucusActivo]);

  // Formato mm:ss con soporte de tiempo extra negativo
  const formatTime = (seg) => {
    const isNegative = seg < 0;
    const abs = Math.abs(seg);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  // Clases visuales del temporizador según el tiempo restante
  const getDigitsClass = (seg) => {
    if (seg < 0) return 'timer-negative';
    if (seg <= 5) return 'timer-danger';
    if (seg <= 10) return 'timer-warning';
    return '';
  };

  // Porcentaje de progreso de la barra
  const progresoPorcentaje = useMemo(() => {
    if (!tiempoInicial || tiempoInicial <= 0) return 0;
    const consumido = tiempoInicial - segundosRestantes;
    return Math.min(100, Math.max(0, (consumido / tiempoInicial) * 100));
  }, [segundosRestantes, tiempoInicial]);

  // Orador en turno para el modo actual
  const oradorEnTurno = useMemo(() => {
    if (modoDebate === 'CAUCUS') {
      const primer = oradoresCaucus?.[0];
      if (!primer) return null;
      return typeof primer === 'string' ? { nombre: primer } : primer;
    }
    const primer = oradoresGSL?.[0];
    if (!primer) return null;
    return typeof primer === 'string' ? { nombre: primer } : primer;
  }, [modoDebate, oradoresCaucus, oradoresGSL]);

  const presets = modoDebate === 'CAUCUS' ? [30, 45, 60, 90] : [30, 60, 90, 120];

  return (
    <section className="secretariat-debate-timer-bar" aria-label={t('timers.title', 'Cronómetro')}>
      {/* Zona Izquierda: Selector de modo + Orador en turno */}
      <div className="secretariat-timer-zone-left">
        <div className="secretariat-timer-mode-toggle" role="group" aria-label={t('ui.switchTimerMode', 'Cambiar modo de cronómetro')}>
          <button
            type="button"
            className={`secretariat-mode-toggle-btn ${modoDebate === 'GSL' ? 'active' : ''}`}
            onClick={() => {
              setModoManual('GSL');
              const init = (relojDebateState && relojDebateState.tiempoInicial) || 60;
              setTiempoInicial(init);
              setSegundosRestantes((relojDebateState && relojDebateState.segundosRestantes) ?? init);
            }}
            title={t('tabs.gsl', 'GSL')}
          >
            GSL
          </button>
          <button
            type="button"
            className={`secretariat-mode-toggle-btn ${modoDebate === 'CAUCUS' ? 'active' : ''}`}
            onClick={() => {
              setModoManual('CAUCUS');
              const init = (relojDebateState && relojDebateState.limiteOradorSeg) || caucusActivo?.tiempoOrador || 45;
              setTiempoInicial(init);
              setSegundosRestantes((relojDebateState && relojDebateState.tiempoOradorSeg) ?? init);
            }}
            title={t('ui.moderatedCaucus', 'Caucus')}
          >
            Caucus
          </button>
        </div>

        {oradorEnTurno ? (
          <div className="secretariat-timer-speaker" title={`${oradorEnTurno.nombre} (${t('ui.speaking2', 'EN TURNO')})`}>
            <CountryFlag bandera={oradorEnTurno.bandera} nombre={oradorEnTurno.nombre} size="sm" />
            <span className="secretariat-timer-speaker-name">{oradorEnTurno.nombre}</span>
            <span className="secretariat-timer-speaking-tag">
              {t('ui.speaking2', 'EN TURNO')}
            </span>
          </div>
        ) : (
          <span className="secretariat-timer-no-speaker">
            {t('speakerNotes.empty', 'Sin orador en turno')}
          </span>
        )}
      </div>

      {/* Zona Central: Dígitos del cronómetro + tiempo total de caucus si aplica */}
      <div className="secretariat-timer-zone-center">
        <div className={`secretariat-timer-digits ${getDigitsClass(segundosRestantes)}`} role="timer" aria-live="off">
          {formatTime(segundosRestantes)}
        </div>

        {segundosRestantes < 0 && (
          <span className="secretariat-timer-overtime-badge" title={t('ui.overtime', 'Tiempo extra')}>
            <AlertTriangle size={11} />
            <span>{t('ui.overtime', 'Extra')}</span>
          </span>
        )}

        {modoDebate === 'CAUCUS' && tiempoTotalRestante !== null && (
          <div className="secretariat-timer-caucus-total" title={t('motions.totalDuration', 'Duración total')}>
            <Clock size={11} />
            <span>{formatTime(tiempoTotalRestante)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ opacity: 0.75 }}>{formatTime(tiempoTotalInit)}</span>
          </div>
        )}
      </div>

      {/* Zona Derecha: Controles + Presets + Sync status */}
      <div className="secretariat-timer-zone-right">
        {/* Iniciar / Pausar */}
        <button
          type="button"
          className="secretariat-timer-btn secretariat-timer-btn-primary"
          onClick={handleToggleTimer}
          aria-label={corriendo ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Iniciar')}
          title={corriendo ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Iniciar')}
        >
          {corriendo ? <Pause size={13} /> : <Play size={13} />}
          <span>{corriendo ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Iniciar')}</span>
        </button>

        {/* Reiniciar */}
        <button
          type="button"
          className="secretariat-timer-btn secretariat-timer-btn-icon"
          onClick={handleResetTimer}
          title={t('palette.resetTimer', 'Reiniciar tiempo')}
          aria-label={t('palette.resetTimer', 'Reiniciar tiempo')}
        >
          <RotateCcw size={13} />
        </button>

        {/* Ajuste fino -15s y +15s */}
        <div className="secretariat-timer-adjust-group">
          <button
            type="button"
            className="secretariat-timer-btn secretariat-timer-btn-adjust"
            onClick={() => handleAdjustTime(-15)}
            title="-15s"
            aria-label={t('palette.sub15Sec', 'Restar 15 segundos')}
          >
            <Minus size={11} /> 15s
          </button>
          <button
            type="button"
            className="secretariat-timer-btn secretariat-timer-btn-adjust"
            onClick={() => handleAdjustTime(15)}
            title="+15s"
            aria-label={t('palette.add15Sec', 'Sumar 15 segundos')}
          >
            <Plus size={11} /> 15s
          </button>
        </div>

        {/* Siguiente orador */}
        <button
          type="button"
          className="secretariat-timer-btn secretariat-timer-btn-icon"
          onClick={handleNextSpeaker}
          title={t('ui.next', 'Siguiente orador')}
          aria-label={t('ui.next', 'Siguiente orador')}
        >
          <SkipForward size={13} />
        </button>

        {/* Presets rápidos */}
        <div className="secretariat-timer-presets" role="group" aria-label={t('ui.timerPresets', 'Presets de tiempo')}>
          {presets.map(seg => (
            <button
              key={seg}
              type="button"
              className={`secretariat-timer-preset-chip ${tiempoInicial === seg ? 'active' : ''}`}
              onClick={() => handleSetPreset(seg)}
              title={`${seg}s`}
            >
              {seg}s
            </button>
          ))}
        </div>

        {/* Indicador de sincronización en vivo */}
        <div className="secretariat-sync-pill" title={t('ui.syncedLive', 'Sincronizado en Vivo con la Mesa Directiva')}>
          <span className="secretariat-sync-dot" />
          <span className="secretariat-sync-text">{t('ui.syncedWithChair', 'Sincronizado')}</span>
        </div>
      </div>

      {/* Línea de progreso integrada en el borde inferior */}
      <div className="secretariat-timer-progress-track">
        <div 
          className={`secretariat-timer-progress-fill ${
            segundosRestantes <= 5 ? 'danger' : segundosRestantes <= 10 ? 'warning' : ''
          }`}
          style={{ width: `${progresoPorcentaje}%` }}
        />
      </div>
    </section>
  );
}
