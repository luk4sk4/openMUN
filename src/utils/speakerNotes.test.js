import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentSpeaker, formatSpeakerNote } from './speakerNotes.js';

test('sigue el turno de GSL o caucus y respeta una cola vacía', () => {
  const gsl = [{ nombre: 'España' }];
  const caucus = [{ nombre: 'Francia' }];
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: false }).nombre, 'España');
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: true }).nombre, 'Francia');
  assert.equal(getCurrentSpeaker(gsl, [], { activo: true }), null);
  assert.equal(getCurrentSpeaker([], caucus, { activo: false }), null);
  assert.deepEqual(getCurrentSpeaker(['España'], [], {}), { nombre: 'España' });
});

test('la nota conserva su delegación original aunque avance la cola', () => {
  const cola = [{ nombre: 'España' }, { nombre: 'Francia' }];
  const draft = { orador: { ...getCurrentSpeaker(cola, [], {}) }, modalidad: 'GSL', tema: 'Paz', texto: '  Buena propuesta\nCon ejemplos  ' };
  cola.shift();
  assert.equal(getCurrentSpeaker(cola, [], {}).nombre, 'Francia');
  assert.equal(formatSpeakerNote(draft), '[GSL · España] Paz\nBuena propuesta\nCon ejemplos');
  assert.equal(formatSpeakerNote({ ...draft, texto: '  ' }), null);
  assert.equal(formatSpeakerNote({ ...draft, orador: null }), null);
});
