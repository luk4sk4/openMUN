import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Volume2,
  VolumeX,
  Users,
  Mic,
  Award,
  History
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { playTimerAlarm } from '../../utils/audioAlerts';

const CronometroEnmiendas = () => {
  const { t } = useTranslation();
  const {
    paises = [],
    registrarIntervencion,
    registroIntervenciones = []
  } = useSession();

  // Países asistentes en sala
  const paisesAsistentes = useMemo(() => {
    return (paises || []).filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises]);

  // Estados del temporizador
  const [tiempoInicial, setTiempoInicial] = useState(60); // en segundos
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [corriendo, setCorriendo] = useState(false);
  const [paisSeleccionado, setPaisSeleccionado] = useState('');
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [intervencionGuardadaFeedback, setIntervencionGuardadaFeedback] = useState(false);

  // Inicializar país por defecto
  useEffect(() => {
    if (paisesAsistentes.length > 0 && !paisSeleccionado) {
      setPaisSeleccionado(paisesAsistentes[0].nombre);
    }
  }, [paisesAsistentes, paisSeleccionado]);

  // Efecto del reloj
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

  // Manejar cambio de preset de tiempo
  const handleSeleccionarPreset = (segundos) => {
    setTiempoInicial(segundos);
    setSegundosRestantes(segundos);
    setCorriendo(false);
  };

  // Ajuste fino de tiempo (+10s / -10s)
  const handleAjustarTiempo = (delta) => {
    setSegundosRestantes(prev => Math.max(0, prev + delta));
  };

  // Reiniciar reloj
  const handleReset = () => {
    setCorriendo(false);
    setSegundosRestantes(tiempoInicial);
  };

  // Guardar y sincronizar con el Histórico de Delegaciones
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
    setTimeout(() => setIntervencionGuardadaFeedback(false), 2500);
  };

  // Formato MM:SS
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

  // Color de reloj dinámico
  const colorReloj = segundosRestantes < 0
    ? '#ef4444'
    : segundosRestantes <= 10
      ? '#f87171'
      : segundosRestantes <= 20
        ? '#eab308'
        : '#22c55e';

  // Porcentaje de progreso
  const porcentaje = tiempoInicial > 0
    ? Math.max(0, Math.min(100, (Math.max(0, segundosRestantes) / tiempoInicial) * 100))
    : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-bg)',
      color: 'var(--text-color)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── HEADER ULTRA COMPACTO ── */}
      <div style={{
        padding: '0.45rem 0.7rem',
        paddingRight: '60px',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <div style={{
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            padding: '0.25rem',
            borderRadius: '4px',
            color: '#eab308',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={14} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Cronómetro de Enmiendas
          </span>
        </div>

        <button
          onClick={() => setSonidoHabilitado(s => !s)}
          title={sonidoHabilitado ? 'Silenciar avisos' : 'Activar sonido de aviso'}
          style={{
            background: 'transparent',
            border: 'none',
            color: sonidoHabilitado ? '#3b82f6' : 'var(--muted-text)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
      </div>

      {/* ── CUERPO PRINCIPAL ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.55rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.45rem'
      }}>
        {/* Selector de Orador con Bandera */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
          padding: '0.35rem 0.5rem',
          borderRadius: '6px',
          border: '1px solid var(--subborder-color)'
        }}>
          <CountryFlag
            country={paisObj}
            bandera={paisObj?.bandera}
            nombre={paisSeleccionado}
            size="xs"
          />
          {paisesAsistentes.length > 0 ? (
            <select
              value={paisSeleccionado}
              onChange={e => setPaisSeleccionado(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                fontSize: '0.76rem',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {paisesAsistentes.map(p => (
                <option key={p.id} value={p.nombre} style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-color)' }}>
                  {p.nombre} {p.estatus === 'Presente y Votando' ? '(PyV)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={paisSeleccionado}
              onChange={e => setPaisSeleccionado(e.target.value)}
              placeholder="Nombre del país"
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                fontSize: '0.76rem',
                outline: 'none'
              }}
            />
          )}
        </div>

        {/* Display del Tiempo (Grande y Dinámico) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0.2rem 0'
        }}>
          <div style={{
            fontSize: '2.4rem',
            fontWeight: '900',
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            color: colorReloj,
            lineHeight: 1,
            textShadow: `0 0 20px ${colorReloj}33`,
            transition: 'color 0.3s ease'
          }}>
            {formatTiempo(segundosRestantes)}
          </div>

          {/* Barra de Progreso */}
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '2px',
            marginTop: '0.35rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${porcentaje}%`,
              height: '100%',
              backgroundColor: colorReloj,
              transition: 'width 1s linear, background-color 0.3s ease'
            }} />
          </div>
        </div>

        {/* Presets Rápidos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.25rem',
          width: '100%'
        }}>
          {[30, 45, 60, 90, 120].map(s => (
            <button
              key={s}
              onClick={() => handleSeleccionarPreset(s)}
              style={{
                backgroundColor: tiempoInicial === s ? 'rgba(59, 130, 246, 0.2)' : 'var(--card-hover, rgba(255,255,255,0.03))',
                border: `1px solid ${tiempoInicial === s ? '#3b82f6' : 'var(--subborder-color)'}`,
                color: tiempoInicial === s ? '#60a5fa' : 'var(--muted-text)',
                borderRadius: '4px',
                padding: '0.25rem 0',
                fontSize: '0.66rem',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {s}s
            </button>
          ))}
        </div>

        {/* Controles Principales (Iniciar / Pausar / Reset / +-10s) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: '0.3rem',
          width: '100%'
        }}>
          <button
            onClick={() => handleAjustarTiempo(-10)}
            title="Restar 10 segundos"
            style={{
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              color: 'var(--text-color)',
              borderRadius: '5px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.68rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            -10s
          </button>

          <button
            onClick={() => setCorriendo(c => !c)}
            style={{
              backgroundColor: corriendo ? '#ca8a04' : '#16a34a',
              border: 'none',
              color: '#ffffff',
              borderRadius: '5px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.78rem',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            {corriendo ? <Pause size={14} /> : <Play size={14} />}
            <span>{corriendo ? 'Pausar' : 'Iniciar'}</span>
          </button>

          <button
            onClick={() => handleAjustarTiempo(10)}
            title="Sumar 10 segundos"
            style={{
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              color: 'var(--text-color)',
              borderRadius: '5px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.68rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            +10s
          </button>

          <button
            onClick={handleReset}
            title="Reiniciar a tiempo inicial"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--subborder-color)',
              color: 'var(--muted-text)',
              borderRadius: '5px',
              padding: '0.35rem 0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Botón Sincronizar / Guardar en Histórico */}
        <button
          onClick={handleGuardarIntervencion}
          style={{
            width: '100%',
            backgroundColor: intervencionGuardadaFeedback ? '#16a34a' : 'var(--btn-bg)',
            border: 'none',
            color: 'var(--btn-text)',
            borderRadius: '5px',
            padding: '0.4rem 0.6rem',
            fontSize: '0.74rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Check size={13} />
          <span>{intervencionGuardadaFeedback ? '¡Guardado en Histórico!' : 'Concluir y Guardar en Histórico'}</span>
        </button>
      </div>
    </div>
  );
};

export default CronometroEnmiendas;
