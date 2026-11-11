import assert from 'node:assert/strict';
import { FIXED_LAYOUTS, FULLSCREEN_LAYOUTS } from './fixedLayouts.js';

// Verify FIXED_LAYOUTS has standard layouts
assert.ok(FIXED_LAYOUTS.GSL, 'GSL layout should exist in FIXED_LAYOUTS');
assert.ok(FIXED_LAYOUTS.DEBATE, 'DEBATE layout should exist in FIXED_LAYOUTS');
assert.ok(
  FIXED_LAYOUTS.GSL.some(w => w.i.includes('anadir_paises')),
  'Standard GSL layout should include anadir_paises_gsl'
);
assert.ok(
  FIXED_LAYOUTS.DEBATE.some(w => w.i.includes('anadir_paises')),
  'Standard DEBATE layout should include anadir_paises_debate'
);

// Verify FULLSCREEN_LAYOUTS for GSL - Three Options
assert.ok(FULLSCREEN_LAYOUTS.GSL, 'FULLSCREEN_LAYOUTS.GSL should exist');

// Option 1: WITH left part (lista_oradores + cronometro_principal)
const gslWithLeftIds = FULLSCREEN_LAYOUTS.GSL.with_left.map(w => w.i);
assert.deepEqual(
  gslWithLeftIds,
  ['lista_oradores', 'cronometro_principal'],
  'FULLSCREEN_LAYOUTS.GSL.with_left must include lista_oradores and cronometro_principal'
);
assert.ok(
  !gslWithLeftIds.some(id => id.includes('anadir_paises')),
  'FULLSCREEN_LAYOUTS.GSL.with_left must exclude anadir_paises'
);
const gslWithLeftCols = FULLSCREEN_LAYOUTS.GSL.with_left.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(gslWithLeftCols, 12, 'FULLSCREEN_LAYOUTS.GSL.with_left columns must sum to 12');

// Option 2: WITHOUT left part (cronometro_principal only)
const gslTimerOnlyIds = FULLSCREEN_LAYOUTS.GSL.timer_only.map(w => w.i);
assert.deepEqual(
  gslTimerOnlyIds,
  ['cronometro_principal'],
  'FULLSCREEN_LAYOUTS.GSL.timer_only must only include cronometro_principal'
);
const gslTimerOnlyCols = FULLSCREEN_LAYOUTS.GSL.timer_only.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(gslTimerOnlyCols, 12, 'FULLSCREEN_LAYOUTS.GSL.timer_only columns must sum to 12');

// Option 3: WITH country adder (all 3 panels)
const gslWithAdderIds = FULLSCREEN_LAYOUTS.GSL.with_adder.map(w => w.i);
assert.deepEqual(
  gslWithAdderIds,
  ['lista_oradores', 'cronometro_principal', 'anadir_paises_gsl'],
  'FULLSCREEN_LAYOUTS.GSL.with_adder must include all 3 panels'
);
const gslWithAdderCols = FULLSCREEN_LAYOUTS.GSL.with_adder.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(gslWithAdderCols, 12, 'FULLSCREEN_LAYOUTS.GSL.with_adder columns must sum to 12');

// Verify FULLSCREEN_LAYOUTS for DEBATE - Three Options
assert.ok(FULLSCREEN_LAYOUTS.DEBATE, 'FULLSCREEN_LAYOUTS.DEBATE should exist');

// Option 1: WITH left part (pizarra_mociones + cronometro_dual)
const debateWithLeftIds = FULLSCREEN_LAYOUTS.DEBATE.with_left.map(w => w.i);
assert.deepEqual(
  debateWithLeftIds,
  ['pizarra_mociones', 'cronometro_dual'],
  'FULLSCREEN_LAYOUTS.DEBATE.with_left must include pizarra_mociones and cronometro_dual'
);
assert.ok(
  !debateWithLeftIds.some(id => id.includes('anadir_paises')),
  'FULLSCREEN_LAYOUTS.DEBATE.with_left must exclude anadir_paises'
);
const debateWithLeftCols = FULLSCREEN_LAYOUTS.DEBATE.with_left.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(debateWithLeftCols, 12, 'FULLSCREEN_LAYOUTS.DEBATE.with_left columns must sum to 12');

// Option 2: WITHOUT left part (cronometro_dual only)
const debateTimerOnlyIds = FULLSCREEN_LAYOUTS.DEBATE.timer_only.map(w => w.i);
assert.deepEqual(
  debateTimerOnlyIds,
  ['cronometro_dual'],
  'FULLSCREEN_LAYOUTS.DEBATE.timer_only must only include cronometro_dual'
);
const debateTimerOnlyCols = FULLSCREEN_LAYOUTS.DEBATE.timer_only.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(debateTimerOnlyCols, 12, 'FULLSCREEN_LAYOUTS.DEBATE.timer_only columns must sum to 12');

// Option 3: WITH country adder (all 3 panels)
const debateWithAdderIds = FULLSCREEN_LAYOUTS.DEBATE.with_adder.map(w => w.i);
assert.deepEqual(
  debateWithAdderIds,
  ['pizarra_mociones', 'cronometro_dual', 'anadir_paises_debate'],
  'FULLSCREEN_LAYOUTS.DEBATE.with_adder must include all 3 panels'
);
const debateWithAdderCols = FULLSCREEN_LAYOUTS.DEBATE.with_adder.reduce((sum, w) => sum + w.colSpan, 0);
assert.equal(debateWithAdderCols, 12, 'FULLSCREEN_LAYOUTS.DEBATE.with_adder columns must sum to 12');

console.log('✔ fixedLayouts.test.js passed');
