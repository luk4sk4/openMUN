import configMaster from '../config/config_master.json' with { type: 'json' };

// Fixed views never read or write the user's modular layouts.
export const FIXED_LAYOUTS = {
  ...configMaster.layouts,
  COMIENZO: [
    { i: 'matriz_paises', col: 0, row: 0, colSpan: 7, rowSpan: 7 },
    { i: 'establecer_agenda', col: 7, row: 0, colSpan: 5, rowSpan: 7 }
  ],
  CRISIS: [
    { i: 'gestor_crisis', col: 0, row: 0, colSpan: 7, rowSpan: 7 },
    { i: 'tele_noticias', col: 7, row: 0, colSpan: 5, rowSpan: 3 },
    { i: 'pizarra_interactiva', col: 7, row: 3, colSpan: 5, rowSpan: 4 }
  ],
  ENMIENDAS: [
    { i: 'controlador_enmiendas', col: 0, row: 0, colSpan: 7, rowSpan: 7 },
    { i: 'panel_enmiendas_votacion', col: 7, row: 0, colSpan: 5, rowSpan: 7 }
  ]
};
