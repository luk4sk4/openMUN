import i18n from '../languages/index.js';
import {
  Home,
  Settings,
  Mic,
  Timer,
  Vote,
  FileSignature,
  BarChart2,
  LayoutGrid,
  Siren
} from 'lucide-react';

// Configuración de pestañas con iconos SVG y claves de traducción i18n
export const TAB_CONFIG = {
  HOME: { labelKey: 'tabs.home', label: 'Inicio', Icon: Home },
  COMIENZO: { labelKey: 'tabs.setup', label: 'Comienzo', Icon: Settings },
  GSL: { labelKey: 'tabs.gsl', label: 'GSL', Icon: Mic },
  DEBATE: { labelKey: 'tabs.debate', label: 'Debate', Icon: Timer },
  VOTING: { labelKey: 'tabs.voting', label: 'Votación', Icon: Vote },
  ENMIENDAS: { labelKey: 'tabs.amendments', label: 'Enmiendas', Icon: FileSignature },
  INFO: { labelKey: 'tabs.info', label: 'Info', Icon: BarChart2 },
  CRISIS: { labelKey: 'tabs.crisis', label: 'Crisis', Icon: Siren },
  LIBRE: { labelKey: 'tabs.custom', label: 'Libre', Icon: LayoutGrid },
};

export const DASHBOARD_TABS = ['COMIENZO', 'GSL', 'DEBATE', 'VOTING', 'ENMIENDAS', 'INFO', 'LIBRE'];

export const TAB_TITLES = {
  get HOME() { return i18n.t('ui.openmunFreeManagementPlatformForModelUnitedNationsMun'); },
  get COMIENZO() { return i18n.t('ui.openmunCommitteeSettingsAndAgenda'); },
  get GSL() { return i18n.t('ui.openmunGeneralSpeakersListGsl'); },
  get DEBATE() { return i18n.t('ui.openmunTimersAndDebateModeration'); },
  get VOTING() { return i18n.t('ui.openmunOfficialVotingSystemAndVotingMap'); },
  get ENMIENDAS() { return i18n.t('ui.openmunAmendmentsAndDraftResolution'); },
  get INFO() { return i18n.t('ui.openmunQuorumMatrixAndDelegationInformation'); },
  get CRISIS() { return i18n.t('ui.openmunCrisisCenter'); },
  get LIBRE() { return i18n.t('ui.openmunCustomizableWidgetPanel'); },
};

/**
 * Actualiza el título del documento según la pestaña activa
 * @param {string} tab 
 */
export function updateDocumentTitleForTab(tab) {
  document.title = TAB_TITLES[tab] || TAB_TITLES.HOME;
}

export const getDashboardTabs = (isModular) => DASHBOARD_TABS.map(tab => tab === 'LIBRE' && !isModular ? 'CRISIS' : tab);
