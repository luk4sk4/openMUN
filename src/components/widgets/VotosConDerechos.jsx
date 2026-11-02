import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Pause, Play, RotateCcw, Scale, X } from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { playTimerAlarm } from '../../utils/audioAlerts';
import './VotosConDerechos.css';

const DURACIONES = [30, 45, 60, 90];

export function BotonesConDerechos({ tipoVotacion, onVote, voto, conDerechos }) {
  const { t } = useTranslation();
  if (tipoVotacion !== 'substantive') return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
      {['favor', 'contra'].map(sentido => (
        <button
          key={sentido}
          type="button"
          onClick={() => onVote(`${sentido}_derechos`)}
          aria-pressed={!!conDerechos && voto === sentido}
          title={t('voting.rightsExplanation')}
          className="voting-rights-button"
        >
          <Scale size={11} />
          <span>{t(sentido === 'favor' ? 'voting.inFavorWithRights' : 'voting.againstWithRights')}</span>
        </button>
      ))}
    </div>
  );
}

export function ListaDerechos({ paises, sesion, votacionTerminada }) {
  if (sesion?.tipoVotacion !== 'substantive') return null;

  const listaPaises = Array.isArray(paises) ? paises : [];
  const safeVotos = (sesion && sesion.votos && typeof sesion.votos === 'object') ? sesion.votos : {};
  const asistentes = listaPaises.filter(p => p && (p.estatus === 'Presente' || p.estatus === 'Presente y Votando'));
  const votosValidos = asistentes.filter(p => ['favor', 'contra', 'abstencion'].includes(safeVotos[p.id])).length;

  const estaTerminada = votacionTerminada !== undefined
    ? Boolean(votacionTerminada)
    : (asistentes.length > 0 && votosValidos >= asistentes.length);

  // La fundamentación de voto con derechos SOLO debe mostrarse una vez concluida la votación
  if (!estaTerminada) return null;

  const delegaciones = asistentes.filter(
    p => sesion?.derechos?.[p.id] && ['favor', 'contra'].includes(safeVotos[p.id])
  );

  if (!delegaciones.length) return null;

  return (
    <ListaDerechosContent
      paises={listaPaises}
      delegaciones={delegaciones}
      sesion={sesion}
    />
  );
}

function ListaDerechosContent({ delegaciones, sesion }) {
  const { t } = useTranslation();
  const safeVotos = (sesion && sesion.votos && typeof sesion.votos === 'object') ? sesion.votos : {};

  const [duracionTotal, setDuracionTotal] = useState(60);
  const [reloj, setReloj] = useState({ restante: 60, fin: null });
  const [ahora, setAhora] = useState(Date.now());
  const [turnoActivoId, setTurnoActivoId] = useState(null);
  const [turnosRealizados, setTurnosRealizados] = useState([]);
  const alarmaSonadaRef = useRef(false);

  // Mantener o seleccionar orador activo
  useEffect(() => {
    if (delegaciones.length > 0) {
      if (!turnoActivoId || !delegaciones.some(d => d.id === turnoActivoId)) {
        const proximo = delegaciones.find(d => !turnosRealizados.includes(d.id)) || delegaciones[0];
        setTurnoActivoId(proximo?.id || null);
      }
    } else {
      setTurnoActivoId(null);
    }
  }, [delegaciones, turnoActivoId, turnosRealizados]);

  // Cronómetro activo
  useEffect(() => {
    if (!reloj.fin) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setAhora(now);
      const rest = Math.max(0, Math.ceil((reloj.fin - now) / 1000));
      if (rest === 0 && !alarmaSonadaRef.current) {
        alarmaSonadaRef.current = true;
        try { playTimerAlarm(); } catch {}
      }
    }, 250);
    return () => clearInterval(interval);
  }, [reloj.fin]);

  const restante = reloj.fin ? Math.max(0, Math.ceil((reloj.fin - ahora) / 1000)) : (reloj.restante ?? duracionTotal);

  const alternarPlayPausa = () => {
    alarmaSonadaRef.current = false;
    if (reloj.fin) {
      setReloj({ restante, fin: null });
    } else {
      const tiempo = restante > 0 ? restante : duracionTotal;
      setReloj({ restante: tiempo, fin: Date.now() + tiempo * 1000 });
    }
  };

  const reiniciarTurno = () => {
    alarmaSonadaRef.current = false;
    setReloj({ restante: duracionTotal, fin: null });
  };

  const ajustarTiempo = (segundos) => {
    const nuevo = Math.max(0, restante + segundos);
    if (nuevo > 0) alarmaSonadaRef.current = false;
    setReloj({
      restante: nuevo,
      fin: reloj.fin ? Date.now() + nuevo * 1000 : null
    });
  };

  const cambiarDuracion = (seg) => {
    setDuracionTotal(seg);
    alarmaSonadaRef.current = false;
    setReloj({ restante: seg, fin: null });
  };

  const concederPalabra = (paisId) => {
    setTurnoActivoId(paisId);
    alarmaSonadaRef.current = false;
    setReloj({ restante: duracionTotal, fin: null });
  };

  const concluirIntervencion = () => {
    alarmaSonadaRef.current = false;
    const nuevosRealizados = turnoActivoId && !turnosRealizados.includes(turnoActivoId)
      ? [...turnosRealizados, turnoActivoId]
      : turnosRealizados;
    setTurnosRealizados(nuevosRealizados);

    const siguiente = delegaciones.find(d => !nuevosRealizados.includes(d.id));
    if (siguiente) {
      setTurnoActivoId(siguiente.id);
      setReloj({ restante: duracionTotal, fin: null });
    } else {
      setReloj({ restante: 0, fin: null });
    }
  };

  const reiniciarTodas = () => {
    setTurnosRealizados([]);
    alarmaSonadaRef.current = false;
    if (delegaciones.length > 0) {
      setTurnoActivoId(delegaciones[0].id);
      setReloj({ restante: duracionTotal, fin: null });
    }
  };

  const paisActivo = delegaciones.find(d => d.id === turnoActivoId) || null;
  const progresoPct = Math.max(0, Math.min(100, (restante / duracionTotal) * 100));
  const todosConcluidos = delegaciones.length > 0 && delegaciones.every(d => turnosRealizados.includes(d.id));

  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');
  const relojClase = restante <= 10 && restante > 0 ? 'warning' : (restante === 0 ? 'danger' : '');

  return (
    <section className="rights-panel" aria-label={t('voting.rightsOfExplanationTitle')}>
      {/* Encabezado del panel */}
      <div className="rights-header">
        <div className="rights-header-title">
          <Scale size={14} />
          <span>{t('voting.rightsOfExplanationTitle', 'Fundamentación de Voto con Derechos')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
            {t('voting.completedOfTotal', { done: turnosRealizados.length, total: delegaciones.length, defaultValue: `Concluidas: ${turnosRealizados.length} de ${delegaciones.length}` })}
          </span>
          <div className="rights-presets">
            {DURACIONES.map(seg => (
              <button
                key={seg}
                type="button"
                className={`rights-preset-chip ${duracionTotal === seg ? 'active' : ''}`}
                onClick={() => cambiarDuracion(seg)}
              >
                {seg}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero del Orador Activo con Mini Cronómetro (parecido a Set Agenda) */}
      {paisActivo && !todosConcluidos ? (
        <div className="rights-hero-card">
          <div className="rights-hero-top">
            <div className="rights-speaker-info">
              <CountryFlag bandera={paisActivo.bandera} nombre={paisActivo.nombre} size="md" />
              <div className="rights-speaker-text">
                <span className="rights-speaker-label">
                  {t('voting.speakingRights', 'Tiene la palabra (Fundamentación)')}
                </span>
                <span className="rights-speaker-name">{paisActivo.nombre}</span>
              </div>
            </div>

            <span className={`rights-side-badge ${safeVotos[paisActivo.id] === 'favor' ? 'favor' : 'contra'}`}>
              {safeVotos[paisActivo.id] === 'favor'
                ? `✓ ${t('voting.inFavorWithRights', 'A favor con derechos')}`
                : `✕ ${t('voting.againstWithRights', 'En contra con derechos')}`}
            </span>
          </div>

          <div className="rights-timer-section">
            <div className="rights-clock-wrapper">
              <div className={`rights-clock-display ${relojClase}`} role="timer" aria-live="polite">
                {mm}:{ss}
              </div>
              <div className="rights-progress-bar">
                <div
                  className={`rights-progress-fill ${relojClase}`}
                  style={{ width: `${progresoPct}%` }}
                />
              </div>
            </div>

            <div className="rights-controls">
              <button
                type="button"
                className="rights-btn-control"
                onClick={() => ajustarTiempo(-15)}
                disabled={restante <= 0}
                title="-15s"
              >
                -15s
              </button>
              <button
                type="button"
                className={`rights-btn-control ${reloj.fin ? '' : 'rights-btn-primary'}`}
                onClick={alternarPlayPausa}
                aria-label={reloj.fin ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Iniciar')}
              >
                {reloj.fin ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                <span>{reloj.fin ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Iniciar')}</span>
              </button>
              <button
                type="button"
                className="rights-btn-control"
                onClick={reiniciarTurno}
                title={t('agenda.resetTimer', 'Reiniciar')}
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                className="rights-btn-control"
                onClick={() => ajustarTiempo(15)}
                title="+15s"
              >
                +15s
              </button>
              <button
                type="button"
                className="rights-btn-control rights-btn-finish"
                onClick={concluirIntervencion}
              >
                <Check size={13} />
                <span>{t('voting.finishRightsTurn', 'Concluir intervención')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-color)', fontSize: '0.78rem', fontWeight: '700' }}>
            <CheckCircle2 size={16} />
            <span>{t('voting.allRightsCompleted', 'Todas las delegaciones con derechos han concluido su fundamentación.')}</span>
          </div>
          <button
            type="button"
            className="rights-btn-control"
            onClick={reiniciarTodas}
          >
            <RotateCcw size={12} />
            <span>{t('voting.restartRights', 'Reiniciar intervenciones')}</span>
          </button>
        </div>
      )}

      {/* Cola de Delegaciones con Derechos */}
      <div className="rights-queue-container">
        <span className="rights-queue-label">
          {t('voting.rightsDelegations', 'Delegaciones con derechos')}:
        </span>
        <div className="rights-queue-chips">
          {delegaciones.map(del => {
            const activo = del.id === turnoActivoId && !todosConcluidos;
            const concluido = turnosRealizados.includes(del.id);
            const sentido = safeVotos[del.id];

            return (
              <button
                key={del.id}
                type="button"
                className={`rights-chip ${activo ? 'active' : ''} ${concluido ? 'completed' : ''}`}
                onClick={() => concederPalabra(del.id)}
                title={`${del.nombre}: ${sentido === 'favor' ? t('voting.inFavorWithRights') : t('voting.againstWithRights')}`}
              >
                <CountryFlag bandera={del.bandera} nombre={del.nombre} size="xs" />
                <span>{del.nombre}</span>
                {concluido ? (
                  <Check size={11} style={{ color: 'var(--success-color)' }} />
                ) : (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: sentido === 'favor' ? 'var(--success-color)' : 'var(--danger-color)'
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ListaDerechos;
