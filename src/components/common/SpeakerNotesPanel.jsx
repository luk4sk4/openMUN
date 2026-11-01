import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { formatSpeakerNote } from '../../utils/speakerNotes';
import CountryFlag from './CountryFlag';

export default function SpeakerNotesPanel({ orador, modalidad, tema }) {
  const { t } = useTranslation();
  const { notes, sendNote } = useP2P();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(false);
  const anotaciones = notes.filter(note => note.type === 'speaker_annotation' && note.to === 'CHAIR');
  const fieldStyle = { background: 'var(--card-header-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' };

  const guardar = (event) => {
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
    <section aria-label={t('speakerNotes.title', 'Orador y notas de la mesa')} style={{ background: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
      <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {orador && <CountryFlag bandera={orador.bandera} nombre={orador.nombre} size="sm" />}
        <strong>{t('speakerNotes.current', 'En turno')}: {orador?.nombre || t('speakerNotes.empty', 'Sin orador')}</strong>
        <span style={{ color: 'var(--muted-text)' }}>{modalidad}</span>
      </div>
      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
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
          placeholder={t('speakerNotes.placeholder', 'Escribe una observación sobre su intervención…')}
          style={{ ...fieldStyle, resize: 'vertical', font: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={!draft?.texto.trim()} style={{ ...fieldStyle, background: 'var(--btn-bg)', color: 'var(--btn-text)', cursor: 'pointer' }}>
            {t('speakerNotes.save', 'Registrar nota')}
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{t('speakerNotes.visibility', 'Se guarda en las notas de la mesa con fecha y delegación.')}</span>
        </div>
        {error && <div role="alert">{t('speakerNotes.error', 'No se pudo enviar. El borrador se conserva; comprueba la conexión e inténtalo de nuevo.')}</div>}
      </form>
      <details style={{ marginTop: '0.75rem' }}>
        <summary style={{ cursor: 'pointer' }}>{t('speakerNotes.history', 'Anotaciones registradas')} ({anotaciones.length})</summary>
        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {anotaciones.map(note => (
            <article key={note.id} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
              <small style={{ color: 'var(--muted-text)' }}>{new Date(note.timestamp).toLocaleString()} · {note.from}</small>
              <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note.text}</div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
