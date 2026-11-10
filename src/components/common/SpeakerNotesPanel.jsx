import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSpeakerNote } from '../../utils/speakerNotes';
import CountryFlag from './CountryFlag';
import './SpeakerNotesPanel.css';

export default function SpeakerNotesPanel({ orador, modalidad, tema, notes, sendNote }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(false);
  const anotaciones = notes.filter(note => note.type === 'speaker_annotation' && note.to === 'CHAIR');
  const avisos = notes.filter(note => note.type !== 'speaker_annotation' && note.text);

  const guardar = event => {
    event.preventDefault();
    const text = formatSpeakerNote(draft);
    if (!text) return;
    if (!sendNote('CHAIR', text, 'speaker_annotation')) {
      setError(true);
      return;
    }
    setDraft(null);
    setError(false);
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
          {t('speakerNotes.noteFor', 'Anotación para')}: <strong>{draft?.orador.nombre || orador?.nombre || '—'}</strong>
        </label>
        <textarea id="speaker-note" rows={2} maxLength={4000} disabled={!orador && !draft}
          value={draft?.texto || ''}
          onChange={event => {
            const texto = event.target.value;
            // Mantener la delegación del borrador aunque cambie el turno en directo.
            setDraft(texto ? { ...(draft || { orador: { ...orador }, modalidad, tema }), texto } : null);
            setError(false);
          }}
          placeholder={t('speakerNotes.placeholder', 'Escribe una observación sobre su intervención…')} />
        <div className="speaker-notes-actions">
          <button type="submit" disabled={!draft?.texto.trim()}>{t('speakerNotes.save', 'Registrar nota')}</button>
          <small className="speaker-notes-secondary">{t('speakerNotes.visibility', 'Se guarda en las notas de la mesa con fecha y delegación.')}</small>
        </div>
        {error && <div className="speaker-notes-error" role="alert">{t('speakerNotes.error', 'No se pudo enviar. El borrador se conserva; comprueba la conexión e inténtalo de nuevo.')}</div>}
      </form>
      <details>
        <summary>{t('speakerNotes.history', 'Anotaciones registradas')} ({anotaciones.length})</summary>
        <div className="speaker-notes-history">
          {anotaciones.map(note => (
            <article key={note.id}>
              <small className="speaker-notes-secondary">{new Date(note.timestamp).toLocaleString()} · {note.from}</small>
              <div className="speaker-notes-text">{note.text}</div>
            </article>
          ))}
        </div>
      </details>
      <details>
        <summary>{t('speakerNotes.committeeNotifications')} ({avisos.length})</summary>
        <div className="speaker-notes-history">
          {avisos.map(note => (
            <article key={note.id}>
              <small className="speaker-notes-secondary">{new Date(note.timestamp).toLocaleString()} · {note.from} → {note.to}</small>
              <div className="speaker-notes-text">{note.text}</div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
