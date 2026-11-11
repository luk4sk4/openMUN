import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  Hand,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CountryFlag from '../common/CountryFlag';
import { segundosRestantes, resultadoAgenda } from '../../utils/agendaDebate';
import './DebateAgendaModal.css';

const DURACIONES_PREESTABLECIDAS = [30, 45, 60, 90, 120];

export const DebateAgendaModal = ({
  isOpen,
  onClose,
  tema,
  comiteNombre = '',
  presentes = [],
  onActualizarDebate,
  onResolverDebate,
  onReiniciarDebate,
  onCancelarDebate,
  onIrASiguienteTema
}) => {
  const { t } = useTranslation();
  const [ahora, setAhora] = useState(Date.now());

  const debate = tema?.debate;
  const tieneRelojCorriendo = Boolean(debate?.reloj?.fin && debate.fase === 'debate');

  // Reloj en tiempo real
  useEffect(() => {
    if (!isOpen || !tieneRelojCorriendo) return;
    const interval = setInterval(() => setAhora(Date.now()), 150);
    return () => clearInterval(interval);
  }, [isOpen, tieneRelojCorriendo]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tema || !debate) return null;

  const restante = debate.reloj ? segundosRestantes(debate.reloj, ahora) : (debate.duracion || 60);
  const duracionTotal = debate.duracion || 60;
  const progresoPct = duracionTotal > 0 ? Math.min(100, Math.max(0, (restante / duracionTotal) * 100)) : 0;
  const turnoActivoObj = debate.turnos?.find(t => t.id === debate.turnoActivo);
  const turnosFavor = debate.turnos?.filter(t => t.postura === 'favor') || [];
  const turnosContra = debate.turnos?.filter(t => t.postura === 'contra') || [];
  const totalPresentes = debate.presentes || presentes.length;
  const mayoriaRequerida = Math.floor(totalPresentes / 2) + 1;
  const votosRegistrados = (debate.favor || 0) + (debate.contra || 0);
  const votacionLista = debate.fase === 'votacion' && resultadoAgenda(debate.favor, debate.contra, debate.presentes);

  // Manejadores
  const setDuracion = (seg) => {
    if (seg < 5 || seg > 3600 || debate.reloj?.fin || debate.turnoActivo) return;
    onActualizarDebate({ duracion: seg, reloj: { restante: seg, fin: null } });
  };

  const alternarPlayPausa = () => {
    setAhora(Date.now());
    if (debate.reloj?.fin) {
      onActualizarDebate({
        reloj: { restante, fin: null }
      });
    } else {
      onActualizarDebate({
        reloj: { restante, fin: Date.now() + restante * 1000 }
      });
    }
  };

  const reiniciarTurno = () => {
    onActualizarDebate({
      reloj: { restante: debate.duracion, fin: null }
    });
  };

  const ajustarTiempo = (delta) => {
    const nuevo = Math.max(0, Math.min(3600, restante + delta));
    setAhora(Date.now());
    onActualizarDebate({
      reloj: debate.reloj?.fin
        ? { restante: nuevo, fin: Date.now() + nuevo * 1000 }
        : { restante: nuevo, fin: null }
    });
  };

  const concederPalabra = (turno) => {
    setAhora(Date.now());
    onActualizarDebate({
      turnoActivo: turno.id,
      reloj: { restante: debate.duracion, fin: Date.now() + debate.duracion * 1000 },
      turnos: debate.turnos.map(t => (t.id === debate.turnoActivo ? { ...t, realizado: true } : t))
    });
  };

  const concluirIntervencion = () => {
    onActualizarDebate({
      turnoActivo: null,
      reloj: { restante: debate.duracion, fin: null },
      turnos: debate.turnos.map(t => (t.id === debate.turnoActivo ? { ...t, realizado: true } : t))
    });
  };

  const agregarOrador = (postura, paisId) => {
    const pais = presentes.find(p => String(p.id) === String(paisId));
    if (!pais) return;
    onActualizarDebate({
      turnos: [
        ...debate.turnos,
        {
          id: crypto.randomUUID(),
          paisId: pais.id,
          nombre: pais.nombre,
          bandera: pais.bandera,
          postura,
          realizado: false
        }
      ]
    });
  };

  const removerOrador = (turnoId) => {
    const esActivo = debate.turnoActivo === turnoId;
    onActualizarDebate({
      turnos: debate.turnos.filter(t => t.id !== turnoId),
      ...(esActivo ? { turnoActivo: null, reloj: { restante: debate.duracion, fin: null } } : {})
    });
  };

  const pasarAVotacion = () => {
    onActualizarDebate({
      fase: 'votacion',
      presentes: presentes.length,
      favor: 0,
      contra: 0,
      reloj: { restante: 0, fin: null },
      turnoActivo: null
    });
  };

  const volverADebate = () => {
    onActualizarDebate({
      fase: 'debate',
      favor: 0,
      contra: 0
    });
  };

  const aplicarVotos = (postura, valor) => {
    const n = Math.max(0, Math.min(debate.presentes, valor));
    onActualizarDebate({ [postura]: n });
  };

  return (
    <div className="debate-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="debate-modal-title">
      <div className="debate-modal-container" onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="debate-modal-header">
          <div className="debate-modal-header-info">
            <span className="debate-modal-tag">
              {comiteNombre || t('agenda.title', 'Comité y Agenda')} · {t('agenda.inDebate', 'En Debate')}
            </span>
            <h2 id="debate-modal-title" className="debate-modal-title" title={tema.titulo}>
              {tema.titulo}
            </h2>
          </div>
          <button
            type="button"
            className="debate-modal-close-btn"
            onClick={onClose}
            aria-label={t('common.close', 'Cerrar')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Guía de pasos clara para el usuario */}
        {debate.fase === 'debate' && (
          <div className="debate-guide-banner">
            <div className="debate-guide-step">
              <span className="debate-guide-number">1</span>
              <span>{t('agenda.guideStep1', 'Añade delegaciones A favor y En contra')}</span>
            </div>
            <ArrowRight size={13} style={{ opacity: 0.5 }} />
            <div className="debate-guide-step">
              <span className="debate-guide-number">2</span>
              <span>
                {t('agenda.guideStep2', 'Haz clic en "Dar la palabra" para iniciar el cronómetro')}
              </span>
            </div>
            <ArrowRight size={13} style={{ opacity: 0.5 }} />
            <div className="debate-guide-step">
              <span className="debate-guide-number">3</span>
              <span>{t('agenda.guideStep3', 'Concluye las intervenciones y pasa a votación')}</span>
            </div>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="debate-modal-body">
          {debate.fase === 'debate' && (
            <>
              {/* Hero: Orador Activo o Selector de Duración */}
              <div className={`debate-hero-card ${turnoActivoObj ? 'has-speaker' : ''}`}>
                {turnoActivoObj ? (
                  <>
                    <div className="debate-hero-top">
                      <div className="debate-hero-speaker-info">
                        <CountryFlag country={turnoActivoObj} size="lg" shape="rect" />
                        <div className="debate-speaker-details">
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-text)' }}>
                            {t('agenda.speaking', 'Tiene la palabra')}
                          </span>
                          <span className="debate-speaker-name">{turnoActivoObj.nombre}</span>
                        </div>
                      </div>
                      <span className={`debate-postura-pill ${turnoActivoObj.postura}`}>
                        {turnoActivoObj.postura === 'favor' ? t('agenda.favor', 'A favor') : t('agenda.contra', 'En contra')}
                      </span>
                    </div>

                    {/* Reloj y barra de progreso */}
                    <div className="debate-timer-center">
                      <div
                        className={`debate-clock-display ${restante <= 10 && restante > 0 ? 'warning' : ''} ${restante === 0 ? 'finished' : ''}`}
                        role="timer"
                        aria-live="polite"
                      >
                        {String(Math.floor(restante / 60)).padStart(2, '0')}:{String(restante % 60).padStart(2, '0')}
                      </div>
                      <div className="debate-progress-bar-bg">
                        <div
                          className={`debate-progress-bar-fill ${restante <= 10 && restante > 0 ? 'warning' : ''} ${restante === 0 ? 'finished' : ''}`}
                          style={{ width: `${progresoPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Controles del Cronómetro */}
                    <div className="debate-timer-controls">
                      <button
                        type="button"
                        className="debate-btn"
                        onClick={() => ajustarTiempo(-15)}
                        title={t('agenda.adjustTimeLess', '-15 segundos')}
                        disabled={restante <= 0}
                      >
                        -15s
                      </button>

                      <button
                        type="button"
                        className={`debate-btn ${debate.reloj?.fin ? '' : 'debate-btn-accent'}`}
                        onClick={alternarPlayPausa}
                        aria-label={debate.reloj?.fin ? t('agenda.pauseTimer') : t('agenda.startTimer')}
                      >
                        {debate.reloj?.fin ? <Pause size={16} /> : <Play size={16} />}
                        {debate.reloj?.fin ? t('agenda.pauseTimer', 'Pausar') : t('agenda.startTimer', 'Reanudar')}
                      </button>

                      <button
                        type="button"
                        className="debate-btn"
                        onClick={reiniciarTurno}
                        title={t('agenda.resetTimer')}
                        aria-label={t('agenda.resetTimer')}
                      >
                        <RotateCcw size={15} />
                      </button>

                      <button
                        type="button"
                        className="debate-btn"
                        onClick={() => ajustarTiempo(15)}
                        title={t('agenda.adjustTimeMore', '+15 segundos')}
                      >
                        +15s
                      </button>

                      <button
                        type="button"
                        className="debate-btn debate-btn-success"
                        onClick={concluirIntervencion}
                        style={{ marginLeft: '12px' }}
                      >
                        <Check size={16} />
                        {t('agenda.finishTurn', 'Concluir intervención')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="debate-empty-hero">
                    <div className="debate-duration-picker">
                      <span>{t('agenda.secondsPerTurn', 'Segundos por turno')}:</span>
                      <div className="debate-duration-presets">
                        {DURACIONES_PREESTABLECIDAS.map(seg => (
                          <button
                            key={seg}
                            type="button"
                            className={`debate-chip ${duracionTotal === seg ? 'active' : ''}`}
                            onClick={() => setDuracion(seg)}
                          >
                            {seg}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Aviso si no hay presentes */}
              {!presentes.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(237, 170, 161, 0.12)', border: '1px solid rgba(237, 170, 161, 0.3)', color: 'var(--danger-color)', fontSize: '0.82rem' }}>
                  <AlertTriangle size={18} />
                  <span>{t('agenda.attendanceRequired', 'Marca las delegaciones presentes en la matriz o lista de países para añadir oradores y votar.')}</span>
                </div>
              )}

              {/* Cuadrícula de 2 Columnas: A Favor vs En Contra */}
              <div className="debate-sides-grid">
                {/* Columna A Favor */}
                <div className="debate-side-column favor">
                  <div className="debate-side-header">
                    <span className="debate-side-title">
                      <span style={{ color: 'var(--success-color)' }}>●</span>
                      {t('agenda.favor', 'A favor')}
                    </span>
                    <span className="debate-side-badge">
                      {turnosFavor.filter(t => t.realizado).length} / {turnosFavor.length}
                    </span>
                  </div>

                  {/* Selector estilizado de país */}
                  <div className="debate-country-select-wrapper">
                    <select
                      className="debate-country-select"
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          agregarOrador('favor', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      disabled={!presentes.length}
                      aria-label={t('agenda.addSpeakerSide', { side: t('agenda.favor', 'A favor'), defaultValue: 'Añadir orador a favor' })}
                    >
                      <option value="">+ {t('agenda.addSpeaker', 'Añadir orador')}</option>
                      {presentes
                        .filter(p => !turnosFavor.some(t => t.paisId === p.id && !t.realizado))
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Lista de delegaciones añadidas */}
                  <div className="debate-speakers-list">
                    {!turnosFavor.length ? (
                      <p className="debate-empty-col-message">
                        {t('agenda.emptyFavor', 'Ninguna delegación añadida a favor')}
                      </p>
                    ) : (
                      turnosFavor.map(turno => {
                        const esActivo = debate.turnoActivo === turno.id;
                        return (
                          <div
                            key={turno.id}
                            className={`debate-speaker-row ${esActivo ? 'is-active' : ''} ${turno.realizado ? 'is-done' : ''}`}
                          >
                            <div className="debate-speaker-row-left">
                              <CountryFlag country={turno} size="sm" shape="rect" />
                              <span className="debate-speaker-row-name" title={turno.nombre}>
                                {turno.nombre}
                              </span>
                            </div>

                            <div className="debate-speaker-row-actions">
                              {turno.realizado ? (
                                <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={12} /> {t('agenda.turnCompleted', 'Intervino')}
                                </span>
                              ) : esActivo ? (
                                <span style={{ fontSize: '0.74rem', color: 'var(--accent-color)', fontWeight: '700' }}>
                                  {t('ui.speaking')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="debate-btn-floor"
                                  onClick={() => concederPalabra(turno)}
                                  title={t('ui.giveTheFloorAndStartTheTimer')}
                                >
                                  <Play size={11} /> {t('agenda.giveFloor', 'Dar la palabra')}
                                </button>
                              )}

                              <button
                                type="button"
                                className="debate-btn-icon-del"
                                onClick={() => removerOrador(turno.id)}
                                aria-label={t('agenda.removeSpeaker', { country: turno.nombre })}
                                title={t('agenda.removeSpeaker', { country: turno.nombre })}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Columna En Contra */}
                <div className="debate-side-column contra">
                  <div className="debate-side-header">
                    <span className="debate-side-title">
                      <span style={{ color: 'var(--danger-color)' }}>●</span>
                      {t('agenda.contra', 'En contra')}
                    </span>
                    <span className="debate-side-badge">
                      {turnosContra.filter(t => t.realizado).length} / {turnosContra.length}
                    </span>
                  </div>

                  {/* Selector estilizado de país */}
                  <div className="debate-country-select-wrapper">
                    <select
                      className="debate-country-select"
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          agregarOrador('contra', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      disabled={!presentes.length}
                      aria-label={t('agenda.addSpeakerSide', { side: t('agenda.contra', 'En contra'), defaultValue: 'Añadir orador en contra' })}
                    >
                      <option value="">+ {t('agenda.addSpeaker', 'Añadir orador')}</option>
                      {presentes
                        .filter(p => !turnosContra.some(t => t.paisId === p.id && !t.realizado))
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Lista de delegaciones añadidas */}
                  <div className="debate-speakers-list">
                    {!turnosContra.length ? (
                      <p className="debate-empty-col-message">
                        {t('agenda.emptyContra', 'Ninguna delegación añadida en contra')}
                      </p>
                    ) : (
                      turnosContra.map(turno => {
                        const esActivo = debate.turnoActivo === turno.id;
                        return (
                          <div
                            key={turno.id}
                            className={`debate-speaker-row ${esActivo ? 'is-active' : ''} ${turno.realizado ? 'is-done' : ''}`}
                          >
                            <div className="debate-speaker-row-left">
                              <CountryFlag country={turno} size="sm" shape="rect" />
                              <span className="debate-speaker-row-name" title={turno.nombre}>
                                {turno.nombre}
                              </span>
                            </div>

                            <div className="debate-speaker-row-actions">
                              {turno.realizado ? (
                                <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={12} /> {t('agenda.turnCompleted', 'Intervino')}
                                </span>
                              ) : esActivo ? (
                                <span style={{ fontSize: '0.74rem', color: 'var(--accent-color)', fontWeight: '700' }}>
                                  {t('ui.speaking')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="debate-btn-floor"
                                  onClick={() => concederPalabra(turno)}
                                  title={t('ui.giveTheFloorAndStartTheTimer')}
                                >
                                  <Play size={11} /> {t('agenda.giveFloor', 'Dar la palabra')}
                                </button>
                              )}

                              <button
                                type="button"
                                className="debate-btn-icon-del"
                                onClick={() => removerOrador(turno.id)}
                                aria-label={t('agenda.removeSpeaker', { country: turno.nombre })}
                                title={t('agenda.removeSpeaker', { country: turno.nombre })}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Fase Votación a Mano Alzada */}
          {debate.fase === 'votacion' && (
            <div className="debate-vote-container">
              <div className="debate-vote-info-banner">
                <Hand size={24} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-color)', marginBottom: '3px' }}>
                    {t('agenda.handVote', 'Votación a mano alzada')}
                  </strong>
                  <span>
                    {t('ui.aSimpleMajorityOfThosePresentIsRequiredToAdd')}{' '}
                    <strong>{mayoriaRequerida} {t('ui.votesInFavor')}</strong> {t('ui.of')} {totalPresentes} {t('ui.delegationsAbstentionsAreNotAllowedATieRejectsTheItem')}
                  </span>
                </div>
              </div>

              {/* Tarjetas interactivas de conteo */}
              <div className="debate-vote-cards-grid">
                {/* Votos A Favor */}
                <div className="debate-vote-card favor">
                  <span className="debate-vote-card-title">{t('agenda.favor', 'A favor')}</span>
                  <div className="debate-vote-stepper">
                    <button
                      type="button"
                      className="debate-stepper-btn"
                      disabled={debate.favor <= 0}
                      onClick={() => aplicarVotos('favor', debate.favor - 1)}
                      aria-label={t('ui.subtractAVoteInFavor')}
                    >
                      <Minus size={20} />
                    </button>
                    <span className="debate-vote-count-number" style={{ color: 'var(--success-color)' }}>
                      {debate.favor}
                    </span>
                    <button
                      type="button"
                      className="debate-stepper-btn"
                      disabled={debate.favor >= totalPresentes || votosRegistrados >= totalPresentes}
                      onClick={() => aplicarVotos('favor', debate.favor + 1)}
                      aria-label={t('ui.addAVoteInFavor')}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="debate-chip"
                    onClick={() => onActualizarDebate({ favor: totalPresentes, contra: 0 })}
                  >
                    {t('agenda.allVotesFavor', 'Todos a favor')}
                  </button>
                </div>

                {/* Votos En Contra */}
                <div className="debate-vote-card contra">
                  <span className="debate-vote-card-title">{t('agenda.contra', 'En contra')}</span>
                  <div className="debate-vote-stepper">
                    <button
                      type="button"
                      className="debate-stepper-btn"
                      disabled={debate.contra <= 0}
                      onClick={() => aplicarVotos('contra', debate.contra - 1)}
                      aria-label={t('ui.subtractAVoteAgainst')}
                    >
                      <Minus size={20} />
                    </button>
                    <span className="debate-vote-count-number" style={{ color: 'var(--danger-color)' }}>
                      {debate.contra}
                    </span>
                    <button
                      type="button"
                      className="debate-stepper-btn"
                      disabled={debate.contra >= totalPresentes || votosRegistrados >= totalPresentes}
                      onClick={() => aplicarVotos('contra', debate.contra + 1)}
                      aria-label={t('ui.addAVoteAgainst')}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="debate-chip"
                    onClick={() => onActualizarDebate({ favor: 0, contra: totalPresentes })}
                  >
                    {t('agenda.allVotesContra', 'Todos en contra')}
                  </button>
                </div>
              </div>

              {/* Resumen del Escrutinio */}
              <div className="debate-vote-tally-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <Users size={18} style={{ color: 'var(--muted-text)' }} />
                  <span>
                    {t('agenda.recordedHands', 'Manos registradas:')}{' '}
                    <strong>{votosRegistrados} / {totalPresentes}</strong>
                  </span>
                  {votosRegistrados < totalPresentes && (
                    <span style={{ color: 'var(--warning-color)', fontSize: '0.78rem' }}>
                      {t('agenda.missingHands', { count: totalPresentes - votosRegistrados, defaultValue: `(Faltan ${totalPresentes - votosRegistrados} manos)` })}
                    </span>
                  )}
                </div>

                <div>
                  {votosRegistrados === totalPresentes ? (
                    debate.favor >= mayoriaRequerida ? (
                      <span className="debate-status-pill approved">
                        <CheckCircle size={14} /> {t('agenda.projectionApproved', 'Proyección: APROBADO')}
                      </span>
                    ) : (
                      <span className="debate-status-pill rejected">
                        <X size={14} /> {t('agenda.projectionRejected', 'Proyección: RECHAZADO')}
                      </span>
                    )
                  ) : (
                    <span className="debate-status-pill pending">
                      {t('agenda.recordingVotes', 'Registrando votos...')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fase Resultado */}
          {debate.fase === 'resultado' && (
            <div className="debate-result-box">
              <div className={`debate-result-icon ${debate.resultado === 'aprobado' ? 'approved' : 'rejected'}`}>
                {debate.resultado === 'aprobado' ? <CheckCircle size={36} /> : <X size={36} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>
                {debate.resultado === 'aprobado'
                  ? t('agenda.topicApproved', '¡Punto de Agenda Aprobado!')
                  : t('agenda.topicRejected', 'Punto de Agenda Rechazado')}
              </h3>
              <p style={{ color: 'var(--muted-text)', margin: 0, maxWidth: '460px', lineHeight: 1.5 }}>
                {debate.resultado === 'aprobado'
                  ? t('agenda.topicApprovedDesc', {
                      favor: debate.favor,
                      contra: debate.contra,
                      defaultValue: `El tema se ha fijado en discusión activa con ${debate.favor} votos a favor frente a ${debate.contra} en contra.`
                    })
                  : t('agenda.topicRejectedDesc', {
                      favor: debate.favor,
                      contra: debate.contra,
                      presentes: debate.presentes,
                      defaultValue: `El tema no ha alcanzado la mayoría necesaria (${debate.favor} a favor, ${debate.contra} en contra de ${debate.presentes} presentes).`
                    })}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {typeof onIrASiguienteTema === 'function' && (
                  <button type="button" className="debate-btn debate-btn-primary" onClick={onIrASiguienteTema}>
                    <span>{t('voting.goToNextTopic', 'Ir a siguiente tema')}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className={typeof onIrASiguienteTema === 'function' ? 'debate-btn' : 'debate-btn debate-btn-primary'}
                  onClick={onClose}
                >
                  {t('common.done', 'Finalizar y volver a la agenda')}
                </button>
                <button type="button" className="debate-btn" onClick={onReiniciarDebate}>
                  <RotateCw size={14} /> {t('agenda.reopenDebate', 'Reabrir debate')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="debate-modal-footer">
          {debate.fase === 'debate' && (
            <>
              <button
                type="button"
                className="debate-btn"
                onClick={onCancelarDebate}
                title={t('agenda.cancelDebate', 'Cancelar debate')}
              >
                <RotateCcw size={14} />
                {t('agenda.cancelDebate', 'Cancelar debate')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className="debate-btn" onClick={onClose}>
                  {t('common.close', 'Cerrar')}
                </button>
                <button
                  type="button"
                  className="debate-btn debate-btn-primary"
                  onClick={pasarAVotacion}
                  disabled={!presentes.length}
                >
                  <Hand size={15} />
                  {t('agenda.openVote', 'Pasar a Votación a Mano Alzada')}
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}

          {debate.fase === 'votacion' && (
            <>
              <button type="button" className="debate-btn" onClick={volverADebate}>
                <ArrowLeft size={14} />
                {t('agenda.backToDebate', 'Volver al debate')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className="debate-btn" onClick={onClose}>
                  {t('common.close', 'Cerrar')}
                </button>
                <button
                  type="button"
                  className="debate-btn debate-btn-primary"
                  onClick={onResolverDebate}
                  disabled={!votacionLista}
                >
                  <Check size={16} />
                  {t('agenda.closeVote', 'Cerrar votación y aplicar resultado')}
                </button>
              </div>
            </>
          )}

          {debate.fase === 'resultado' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="debate-btn debate-btn-primary" onClick={onClose}>
                {t('common.close', 'Cerrar')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateAgendaModal;
