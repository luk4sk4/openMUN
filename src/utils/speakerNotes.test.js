import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentSpeaker, formatSpeakerNote } from './speakerNotes.js';
import { createSessionSnapshot } from './sessionSnapshot.js';

test('sigue el turno de GSL o caucus y respeta una cola vacía', () => {
  const gsl = [{ nombre: 'España' }];
  const caucus = [{ nombre: 'Francia' }];
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: false }).nombre, 'España');
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: true }).nombre, 'Francia');
  assert.equal(getCurrentSpeaker(gsl, [], { activo: true }), null);
  assert.equal(getCurrentSpeaker([], caucus, { activo: false }), null);
  assert.deepEqual(getCurrentSpeaker(['España'], [], {}), { nombre: 'España' });
});

test('la nota conserva la delegación original y rechaza texto vacío o sin orador', () => {
  const draft = { orador: { nombre: 'España' }, modalidad: 'GSL', tema: 'Paz', texto: '  Buena propuesta\nCon ejemplos  ' };
  assert.equal(formatSpeakerNote(draft), '[GSL · España] Paz\nBuena propuesta\nCon ejemplos');
  assert.equal(formatSpeakerNote({ ...draft, texto: '  ' }), null);
  assert.equal(formatSpeakerNote({ ...draft, orador: null }), null);
});

test('el respaldo de sesión incluye las anotaciones con su fecha y delegación', () => {
  const notes = [{ id: 'nota-1', to: 'CHAIR', type: 'speaker_annotation', timestamp: 1793577600000, text: '[GSL · España]\nBuena propuesta' }];
  const storage = { getItem: key => key === 'openmun_notes' ? JSON.stringify(notes) : null };
  assert.deepEqual(createSessionSnapshot({}, storage).notes, notes);
});
