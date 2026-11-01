import { useTranslation } from 'react-i18next';

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
          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: conDerechos && voto === sentido ? 'var(--btn-bg)' : 'var(--panel-color)', color: conDerechos && voto === sentido ? 'var(--btn-text)' : 'var(--text-color)', cursor: 'pointer', fontSize: '0.7rem' }}
        >
          {t(sentido === 'favor' ? 'voting.inFavorWithRights' : 'voting.againstWithRights')}
        </button>
      ))}
    </div>
  );
}

export function ListaDerechos({ paises, sesion }) {
  const { t } = useTranslation();
  if (sesion?.tipoVotacion !== 'substantive') return null;
  const delegaciones = paises.filter(p => p.estatus !== 'Ausente' && sesion.derechos?.[p.id] && ['favor', 'contra'].includes(sesion.votos?.[p.id]));
  if (!delegaciones.length) return null;
  return (
    <div style={{ padding: '0.4rem', fontSize: '0.75rem', overflowY: 'auto', maxHeight: '5rem', flexShrink: 0 }}>
      <strong>{t('voting.rightsRequested')}</strong>
      <div>{t('voting.rightsExplanation')}</div>
      {delegaciones.map(p => (
        <div key={p.id}>{p.nombre}: {t(sesion.votos[p.id] === 'favor' ? 'voting.inFavorWithRights' : 'voting.againstWithRights')}</div>
      ))}
    </div>
  );
}
