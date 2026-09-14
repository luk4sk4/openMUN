import {
  Home,
  Settings,
  Mic,
  Timer,
  Vote,
  FileSignature,
  BarChart2,
  LayoutGrid
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
  LIBRE: { labelKey: 'tabs.custom', label: 'Libre', Icon: LayoutGrid },
};

export const DASHBOARD_TABS = ['HOME', 'COMIENZO', 'GSL', 'DEBATE', 'VOTING', 'ENMIENDAS', 'INFO', 'LIBRE'];

export const TAB_TITLES = {
  HOME: 'OpenMUN - Plataforma Libre de Gestión para Modelos de Naciones Unidas (MUN)',
  COMIENZO: 'OpenMUN - Configuración y Agenda de Comité',
  GSL: 'OpenMUN - Lista General de Oradores (GSL)',
  DEBATE: 'OpenMUN - Cronómetros y Moderación de Debate',
  VOTING: 'OpenMUN - Sistema de Votación Oficial y Mapa de Votos',
  ENMIENDAS: 'OpenMUN - Controlador de Enmiendas y Proyecto de Resolución',
  INFO: 'OpenMUN - Matriz de Quórum e Información de Delegaciones',
  LIBRE: 'OpenMUN - Panel de Widgets Personalizable',
};

/**
 * Actualiza el título del documento según la pestaña activa
 * @param {string} tab 
 */
export function updateDocumentTitleForTab(tab) {
  document.title = TAB_TITLES[tab] || TAB_TITLES.HOME;
}
