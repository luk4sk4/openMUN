import assert from 'node:assert/strict';
import { DEBATE_BREAK_MS, normalizarSesionesDebate, fechaRegistro, sesionDelRegistro, necesitaConfirmarSesion } from '../src/utils/debateSessions.js';
import { normalizarDatosComite } from '../src/utils/sessionValidator.js';
import { createSessionSnapshot } from '../src/utils/sessionSnapshot.js';

const primera = Date.parse('2026-11-02T09:00:00Z');
const segunda = Date.parse('2026-11-02T14:00:00Z');
const tercera = Date.parse('2026-11-03T09:00:00Z');
const sesiones = [primera, segunda, tercera];
assert.deepEqual(normalizarSesionesDebate([segunda, null, 'bad', primera, primera, -1, 1.5]), [primera, segunda]);
assert.deepEqual(normalizarSesionesDebate({}), []);
assert.equal(necesitaConfirmarSesion(primera, primera + DEBATE_BREAK_MS - 1), false);
assert.equal(necesitaConfirmarSesion(primera, primera + DEBATE_BREAK_MS), true);
assert.equal(necesitaConfirmarSesion(undefined, segunda), false);
assert.equal(necesitaConfirmarSesion(segunda, primera), false);

// Boundaries apply to speeches, motions and amendments, including old numeric IDs.
assert.equal(sesionDelRegistro({ fecha: new Date(primera - 1).toISOString() }, sesiones), 'SIN_SESION');
assert.equal(sesionDelRegistro({ fecha: new Date(primera).toISOString() }, sesiones), primera);
assert.equal(sesionDelRegistro({ id: String(segunda - 1) }, sesiones), primera);
assert.equal(sesionDelRegistro({ fecha: new Date(segunda).toISOString() }, sesiones), segunda);
assert.equal(sesionDelRegistro({ fecha: new Date(tercera).toISOString() }, sesiones), tercera);
assert.equal(sesionDelRegistro({ fecha: 'invalid', id: 'bad' }, sesiones), 'SIN_SESION');
assert.equal(sesionDelRegistro({ fecha: new Date(primera).toISOString() }, []), 'SIN_SESION');
assert.equal(fechaRegistro({ fecha: 'invalid', id: String(primera) }), primera);

const state = { agendaSesion: { sesionesDebate: sesiones, ultimaActividadDebate: tercera } };
const restored = normalizarDatosComite(JSON.parse(JSON.stringify(createSessionSnapshot(state, { getItem: () => null }))));
assert.deepEqual(restored.agendaSesion.sesionesDebate, sesiones);
assert.equal(restored.agendaSesion.ultimaActividadDebate, tercera);
assert.deepEqual(normalizarDatosComite({ agendaSesion: {} }).agendaSesion.sesionesDebate, []);
assert.equal(normalizarDatosComite({ agendaSesion: { ultimaActividadDebate: 'bad' } }).agendaSesion.ultimaActividadDebate, null);
console.log('Debate session checks passed');
