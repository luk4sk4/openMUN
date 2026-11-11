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

// Fullscreen presentation layouts (three modes: with_left, timer_only, and with_adder)
export const FULLSCREEN_LAYOUTS = {
  GSL: {
    with_left: [
      { i: 'lista_oradores', col: 0, row: 0, colSpan: 4, rowSpan: 6 },
      { i: 'cronometro_principal', col: 4, row: 0, colSpan: 8, rowSpan: 6 }
    ],
    timer_only: [
      { i: 'cronometro_principal', col: 0, row: 0, colSpan: 12, rowSpan: 6 }
    ],
    with_adder: [
      { i: 'lista_oradores', col: 0, row: 0, colSpan: 3, rowSpan: 6 },
      { i: 'cronometro_principal', col: 3, row: 0, colSpan: 6, rowSpan: 6 },
      { i: 'anadir_paises_gsl', col: 9, row: 0, colSpan: 3, rowSpan: 6 }
    ],
    all: [
      { i: 'lista_oradores', col: 0, row: 0, colSpan: 3, rowSpan: 6 },
      { i: 'cronometro_principal', col: 3, row: 0, colSpan: 6, rowSpan: 6 },
      { i: 'anadir_paises_gsl', col: 9, row: 0, colSpan: 3, rowSpan: 6 }
    ]
  },
  DEBATE: {
    with_left: [
      { i: 'pizarra_mociones', col: 0, row: 0, colSpan: 5, rowSpan: 6 },
      { i: 'cronometro_dual', col: 5, row: 0, colSpan: 7, rowSpan: 6 }
    ],
    timer_only: [
      { i: 'cronometro_dual', col: 0, row: 0, colSpan: 12, rowSpan: 6 }
    ],
    with_adder: [
      { i: 'pizarra_mociones', col: 0, row: 0, colSpan: 4, rowSpan: 6 },
      { i: 'cronometro_dual', col: 4, row: 0, colSpan: 5, rowSpan: 6 },
      { i: 'anadir_paises_debate', col: 9, row: 0, colSpan: 3, rowSpan: 6 }
    ],
    all: [
      { i: 'pizarra_mociones', col: 0, row: 0, colSpan: 4, rowSpan: 6 },
      { i: 'cronometro_dual', col: 4, row: 0, colSpan: 5, rowSpan: 6 },
      { i: 'anadir_paises_debate', col: 9, row: 0, colSpan: 3, rowSpan: 6 }
    ]
  }
};


