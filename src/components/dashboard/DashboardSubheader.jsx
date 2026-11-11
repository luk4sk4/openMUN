import React from 'react';
import { useTranslation } from 'react-i18next';
import FullscreenButtonDropdown from '../common/FullscreenButtonDropdown';

const DashboardSubheader = ({
  nombreComite,
  agendaSesion,
  tipoSesion = 'formal',
  cambiarTipoSesion,
  roleBadge,
  roomId,
  activeTab,
  isMaximized = false,
  fullscreenMode = 'with_left',
  setFullscreenMode,
  toggleMaximize
}) => {
  const { t } = useTranslation();
  const committee = nombreComite || t('header.noCommittee', 'Sin comité');
  const agenda = agendaSesion?.temaActual || (typeof agendaSesion === 'string' ? agendaSesion : null) || t('header.noAgenda', 'Agenda no establecida');

  return (
    <div className="dashboard-committee-context">
      <span className="dashboard-committee-name" title={committee}><span>{committee}</span></span>
      {roleBadge && <span className="dashboard-role-badge"><span>{roleBadge}</span></span>}
      {roomId && (
        <span className="dashboard-room-badge" title={`${t('liveSession.roomCode', 'Sala')}: ${roomId}`}>
          <span className="dashboard-room-dot" />
          <span>{roomId}</span>
        </span>
      )}
      <span className="dashboard-agenda" title={agenda}><span>{agenda}</span></span>
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
      {toggleMaximize && (activeTab === 'GSL' || activeTab === 'DEBATE') && (
        <FullscreenButtonDropdown
          activeTab={activeTab}
          isMaximized={isMaximized}
          fullscreenMode={fullscreenMode}
          setFullscreenMode={setFullscreenMode}
          toggleMaximize={toggleMaximize}
          style={{ marginLeft: '8px' }}
        />
      )}
    </div>
  );
};

export default DashboardSubheader;
