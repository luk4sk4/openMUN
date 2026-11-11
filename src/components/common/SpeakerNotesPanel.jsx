import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSpeakerNote, normalizeSpeakerScore, extractSpeakerNoteCountry } from '../../utils/speakerNotes';
import CountryFlag from './CountryFlag';
import './SpeakerNotesPanel.css';

const SCORE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SpeakerNotesPanel({ orador, modalidad, tema, notes, sendNote, paises = [] }) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [paisFiltro, setPaisFiltro] = useState('');
  const anotaciones = notes.filter(note => note.type === 'speaker_annotation' && note.to === 'CHAIR');
  const avisos = notes.filter(note => note.type !== 'speaker_annotation' && note.text);
  const notaSeleccionada = normalizeSpeakerScore(draft?.nota);
  const puedeEditar = Boolean(orador || draft);
  const puedeGuardar = Boolean(draft?.texto?.trim()) || notaSeleccionada !== null;

  const conteoPorPais = useMemo(() => {
    const mapa = new Map();
    anotaciones.forEach(note => {
      const pais = extractSpeakerNoteCountry(note.text);
      if (pais) {
        mapa.set(pais, (mapa.get(pais) || 0) + 1);
      }
    });
    return mapa;
  }, [anotaciones]);

  const opcionesPaises = useMemo(() => {
    const nombres = new Set(conteoPorPais.keys());
    paises.forEach(p => {
      const nombre = typeof p === 'string' ? p : p?.nombre;
      if (nombre) nombres.add(nombre);
    });
    return Array.from(nombres).sort((a, b) => a.localeCompare(b, i18n.resolvedLanguage));
  }, [conteoPorPais, paises, i18n.resolvedLanguage]);

  const anotacionesFiltradas = useMemo(() => {
    if (!paisFiltro) return anotaciones;
    return anotaciones.filter(note => extractSpeakerNoteCountry(note.text) === paisFiltro);
  }, [anotaciones, paisFiltro]);

  const actualizarBorrador = cambios => {
    const base = draft || (orador ? { orador: { ...orador }, modalidad, tema, texto: '', nota: null } : null);
    if (!base) return;
    const siguiente = { ...base, ...cambios };
    const tieneContenido = Boolean(siguiente.texto) || normalizeSpeakerScore(siguiente.nota) !== null;
    setDraft(tieneContenido ? siguiente : null);
    setFeedback(null);
  };

  const guardar = async event => {
    event.preventDefault();
    const text = formatSpeakerNote(draft);
    if (!text) return;
    if (!await sendNote('CHAIR', text, 'speaker_annotation')) {
      setFeedback('error');
      return;
    }
    setDraft(null);
    setFeedback('sent');
  };

  return (
    <section className="speaker-notes" aria-label={t('speakerNotes.title', 'Orador y notas de la mesa')}>
      <div className="speaker-notes-current" aria-live="polite">
        {orador && <CountryFlag bandera={orador.bandera} nombre={orador.nombre} size="sm" />}
        <strong>{t('speakerNotes.current', 'En turno')}: {orador?.nombre || t('speakerNotes.empty', 'Sin orador')}</strong>
        <span className="speaker-notes-secondary">{modalidad}</span>
      </div>
      <form onSubmit={guardar}>
        <label htmlFor="speaker-note">
          {t('speakerNotes.noteFor', 'Anotación para')}: <strong>{draft?.orador.nombre || orador?.nombre || t('speakerNotes.empty', 'Sin orador')}</strong>
        </label>
        <div className="speaker-notes-score" role="group" aria-label={t('speakerNotes.numericScore', 'Nota numérica (1–10)')}>
          <div className="speaker-notes-score-header">
            <span>{t('speakerNotes.numericScore', 'Nota numérica (1–10)')}</span>
            {notaSeleccionada !== null && (
              <strong className="speaker-notes-score-value">{notaSeleccionada}/10</strong>
            )}
          </div>
          <div className="speaker-notes-score-options">
            {SCORE_VALUES.map(valor => (
              <button
                key={valor}
                type="button"
                className="speaker-notes-score-btn"
                disabled={!puedeEditar}
                aria-pressed={notaSeleccionada === valor}
                onClick={() => actualizarBorrador({ nota: notaSeleccionada === valor ? null : valor })}
              >
                {valor}
              </button>
            ))}
          </div>
        </div>
        <textarea id="speaker-note" rows={2} maxLength={4000} disabled={!puedeEditar}
          aria-describedby="speaker-note-help"
          value={draft?.texto || ''}
          onChange={event => {
            const texto = event.target.value;
            // Mantener la delegación del borrador aunque cambie el turno en directo.
            actualizarBorrador({ texto });
          }}
          placeholder={t('speakerNotes.placeholder', 'Escribe una observación sobre su intervención…')} />
        <div className="speaker-notes-actions">
          <button type="submit" disabled={!puedeGuardar}>{t('speakerNotes.save')}</button>
          <small role="status">{feedback === 'sent' && t('speakerNotes.sent')}</small>
        </div>
        <small id="speaker-note-help" className="speaker-notes-secondary">{t(puedeEditar ? 'speakerNotes.visibility' : 'speakerNotes.waiting')}</small>
        {feedback === 'error' && <div className="speaker-notes-error" role="alert">{t('speakerNotes.error')}</div>}
      </form>
      <section className="speaker-notes-section" aria-labelledby="speaker-notes-history-title">
        <div className="speaker-notes-history-header">
          <h2 id="speaker-notes-history-title">
            {t('speakerNotes.history')}{' '}
            <span className="speaker-notes-secondary">
              ({paisFiltro ? `${anotacionesFiltradas.length}/${anotaciones.length}` : anotaciones.length})
            </span>
          </h2>
          {opcionesPaises.length > 0 && (
            <label className="speaker-notes-filter">
              <span className="speaker-notes-secondary">{t('speakerNotes.filterByCountry', 'Filtrar por país')}</span>
              <select
                value={paisFiltro}
                onChange={event => setPaisFiltro(event.target.value)}
                aria-label={t('speakerNotes.filterByCountry', 'Filtrar por país')}
              >
                <option value="">{t('speakerNotes.allCountries', 'Todos los países')}</option>
                {opcionesPaises.map(pais => {
                  const total = conteoPorPais.get(pais) || 0;
                  return (
                    <option key={pais} value={pais}>
                      {total > 0 ? `${pais} (${total})` : pais}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
        </div>
        <div className="speaker-notes-history">
          {anotacionesFiltradas.length === 0 && (
            <p className="speaker-notes-secondary">
              {paisFiltro
                ? t('speakerNotes.noNotesForCountry', 'No hay notas registradas para este país.')
                : t('speakerNotes.noNotes')}
            </p>
          )}
          {anotacionesFiltradas.map(note => {
            const contextEnd = note.text?.startsWith('[') ? note.text.indexOf('\n') : -1;
            return (
              <article key={note.id}>
                {contextEnd > 0 && <strong>{note.text.slice(0, contextEnd)}</strong>}
                <small className="speaker-notes-secondary">{new Date(note.timestamp).toLocaleString(i18n.resolvedLanguage)} · {note.from}</small>
                <div className="speaker-notes-text">{note.text?.slice(contextEnd + 1)}</div>
              </article>
            );
          })}
        </div>
      </section>
      <details className="speaker-notes-section">
        <summary>{t('speakerNotes.committeeNotifications')} <span className="speaker-notes-secondary">({avisos.length})</span></summary>
        <div className="speaker-notes-history">
          {avisos.length === 0 && <p className="speaker-notes-secondary">{t('speakerNotes.noNotifications')}</p>}
          {avisos.map(note => (
            <article key={note.id}>
              <small className="speaker-notes-secondary">{new Date(note.timestamp).toLocaleString(i18n.resolvedLanguage)} · {note.from} → {note.to}</small>
              <div className="speaker-notes-text">{note.text}</div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
