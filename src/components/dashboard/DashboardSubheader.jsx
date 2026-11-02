import React from 'react';
import { Landmark, Scroll } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DashboardSubheader = ({ nombreComite, agendaSesion, tipoSesion = 'formal', cambiarTipoSesion }) => {
  const { t } = useTranslation();
  const committee = nombreComite || t('header.noCommittee', 'Sin comité');
  const agenda = agendaSesion?.temaActual || t('header.noAgenda', 'Agenda no establecida');

  return (
    <div className="dashboard-committee-context">
      <span className="dashboard-committee-name" title={committee}><Landmark size={13} /><span>{committee}</span></span>
      <span className="dashboard-agenda" title={agenda}><Scroll size={13} /><span>{agenda}</span></span>
      {cambiarTipoSesion && <div className="dashboard-session-states" role="group" aria-label={t('header.sessionState', 'Estado de sesión')}>
        {[
          ['formal', t('header.stateFormal', 'Formal')],
          ['informal', t('header.stateInformal', 'Informal')],
          ['receso', t('header.stateRecess', 'Receso')],
          ['votacion', t('header.stateVoting', 'Votando')]
        ].map(([state, label]) => <button
          key={state}
          type="button"
          className="dashboard-session-state"
          aria-pressed={(tipoSesion || 'formal') === state}
          onClick={() => cambiarTipoSesion(state)}
        >{label}</button>)}
      </div>}
    </div>
  );
};

export default DashboardSubheader;
