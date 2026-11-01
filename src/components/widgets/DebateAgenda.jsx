import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import { normalizarDebateAgenda, resolverDebateAgenda } from '../../utils/agendaDebate';

const controlStyle = {
  background: 'var(--panel-color)', color: 'var(--text-color)',
  border: '1px solid var(--border-color)', borderRadius: '5px', padding: '0.35rem',
  fontSize: '0.75rem', minWidth: 0, maxWidth: '100%'
};
const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' };

export default function DebateAgenda() {
  const { t } = useTranslation();
  const { agendaSesion, establecerAgenda, paises } = useSession();
  const temas = agendaSesion.temasPropuestos || [];
  const debate = normalizarDebateAgenda(agendaSesion.debateAgenda, temas);
  const [propuestaId, setPropuestaId] = useState('');
  const [alternativaId, setAlternativaId] = useState('');
  const propuesta = temas.find(tema => tema.id === propuestaId) || temas[0];
  const alternativas = temas.filter(tema => tema.id !== propuesta?.id);
  const alternativa = alternativas.find(tema => tema.id === alternativaId) || alternativas[0];
  const guardar = nuevoDebate => establecerAgenda(agendaSesion.temaActual, temas, true, nuevoDebate);
  const resolver = aprobada => {
    const resultado = resolverDebateAgenda(temas, debate, aprobada);
    if (resultado) establecerAgenda(resultado.temaActual, resultado.temasPropuestos, true, resultado.debateAgenda);
  };

  if (temas.length < 2) return null;

  return (
    <section aria-label={t('agenda.orderDebate', 'Debate del orden de agenda')} style={{
      display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.6rem',
      border: '1px solid var(--border-color)', borderRadius: '6px', flexShrink: 0
    }}>
      <strong>{t('agenda.orderDebate', 'Debate del orden de agenda')}</strong>
      {!debate ? (
        <>
          <label style={rowStyle}>
            {t('agenda.discussFirst', 'Discutir primero')}
            <select style={{ ...controlStyle, flex: 1 }} value={propuesta.id} onChange={e => setPropuestaId(e.target.value)}>
              {temas.map(tema => <option key={tema.id} value={tema.id}>{tema.titulo}</option>)}
            </select>
          </label>
          <label style={rowStyle}>
            {t('agenda.ifRejected', 'Si no pasa, discutir')}
            <select style={{ ...controlStyle, flex: 1 }} value={alternativa.id} onChange={e => setAlternativaId(e.target.value)}>
              {alternativas.map(tema => <option key={tema.id} value={tema.id}>{tema.titulo}</option>)}
            </select>
          </label>
          <button type="button" style={controlStyle} onClick={() => guardar({
            propuestaId: propuesta.id, alternativaId: alternativa.id, fase: 'debate', aFavor: [], enContra: []
          })}>{t('agenda.startOrderDebate', 'Iniciar mini debate')}</button>
        </>
      ) : (
        <>
          <div>{t('agenda.discussFirst', 'Discutir primero')}: <strong>{temas.find(tema => tema.id === debate.propuestaId)?.titulo}</strong></div>
          <div>{t('agenda.ifRejected', 'Si no pasa, discutir')}: {temas.find(tema => tema.id === debate.alternativaId)?.titulo}</div>
          {debate.fase === 'debate' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['aFavor', 'enContra'].map(lado => {
                  const cola = debate[lado];
                  const disponibles = paises.filter(pais => !debate.aFavor.includes(pais.id) && !debate.enContra.includes(pais.id));
                  const etiqueta = lado === 'aFavor' ? t('agenda.speakersFor', 'Oradores a favor') : t('agenda.speakersAgainst', 'Oradores en contra');
                  return (
                    <div key={lado} style={{ flex: '1 1 140px', minWidth: 0 }}>
                      <strong>{etiqueta} ({cola.length})</strong>
                      <select aria-label={etiqueta} style={{ ...controlStyle, width: '100%', marginTop: '0.3rem' }} value="" onChange={e => {
                        if (disponibles.some(pais => pais.id === e.target.value)) guardar({ ...debate, [lado]: [...cola, e.target.value] });
                      }}>
                        <option value="">{t('agenda.addSpeaker', 'Añadir orador…')}</option>
                        {disponibles.map(pais => <option key={pais.id} value={pais.id}>{pais.nombre}</option>)}
                      </select>
                      <ol style={{ margin: '0.35rem 0', paddingLeft: '1.2rem' }}>
                        {cola.map((id, index) => (
                          <li key={id} style={{ marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: index === 0 ? 700 : 400 }}>{paises.find(pais => pais.id === id)?.nombre || id}</span>{' '}
                            <button type="button" style={controlStyle} aria-label={`${t('agenda.removeSpeaker', 'Retirar orador')}: ${paises.find(pais => pais.id === id)?.nombre || id}`} onClick={() => guardar({ ...debate, [lado]: cola.filter(paisId => paisId !== id) })}>×</button>
                          </li>
                        ))}
                      </ol>
                      <button type="button" style={controlStyle} disabled={cola.length === 0} onClick={() => guardar({ ...debate, [lado]: cola.slice(1) })}>
                        {t('agenda.finishSpeech', 'Finalizar intervención')}
                      </button>
                    </div>
                  );
                })}
              </div>
              {paises.length === 0 && <div>{t('agenda.addDelegationsFirst', 'Añade delegaciones al comité para inscribir oradores.')}</div>}
              <button type="button" style={controlStyle} onClick={() => guardar({ ...debate, fase: 'votacion' })}>
                {t('agenda.closeAndVote', 'Cerrar debate y pasar a votación')}
              </button>
            </>
          )}
          {debate.fase === 'votacion' && (
            <>
              <div>{t('agenda.recordDecision', 'Registra el resultado de la votación de la mesa:')}</div>
              <div style={rowStyle}>
                <button type="button" style={controlStyle} onClick={() => resolver(true)}>{t('agenda.motionPasses', 'Pasa la propuesta')}</button>
                <button type="button" style={controlStyle} onClick={() => resolver(false)}>{t('agenda.motionFails', 'No pasa: abrir el otro tema')}</button>
                <button type="button" style={controlStyle} onClick={() => guardar({ ...debate, fase: 'debate' })}>{t('agenda.resumeDebate', 'Volver al debate')}</button>
              </div>
            </>
          )}
          {['aprobada', 'rechazada'].includes(debate.fase) && (
            <div role="status">
              {debate.fase === 'aprobada' ? t('agenda.orderApproved', 'Propuesta aprobada.') : t('agenda.orderRejected', 'Propuesta rechazada.')}{' '}
              {t('agenda.discussion', 'En Discusión')}: <strong>{agendaSesion.temaActual}</strong>
            </div>
          )}
          <button type="button" style={controlStyle} onClick={() => guardar(null)}>
            {['aprobada', 'rechazada'].includes(debate.fase) ? t('agenda.newOrderDebate', 'Preparar otro debate') : t('agenda.cancelOrderDebate', 'Cancelar mini debate')}
          </button>
        </>
      )}
    </section>
  );
}
