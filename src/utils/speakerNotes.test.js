import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentSpeaker,
  formatSpeakerNote,
  normalizeSpeakerScore,
  extractSpeakerNoteCountry,
  createSpeakerNote,
  normalizeSpeakerNote
} from './speakerNotes.js';

test('sigue el turno de GSL o caucus y respeta una cola vacía', () => {
  const gsl = [{ nombre: 'España' }];
  const caucus = [{ nombre: 'Francia' }];
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: false }).nombre, 'España');
  assert.equal(getCurrentSpeaker(gsl, caucus, { activo: true }).nombre, 'Francia');
  assert.equal(getCurrentSpeaker(gsl, [], { activo: true }), null);
  assert.equal(getCurrentSpeaker([], caucus, { activo: false }), null);
  assert.deepEqual(getCurrentSpeaker(['España'], [], {}), { nombre: 'España' });
});

test('la nota conserva su delegación original aunque avance la cola y admite nota numérica del 1 al 10', () => {
  const cola = [{ nombre: 'España' }, { nombre: 'Francia' }];
  const draft = { orador: { ...getCurrentSpeaker(cola, [], {}) }, modalidad: 'GSL', tema: 'Paz', texto: '  Buena propuesta\nCon ejemplos  ' };
  cola.shift();
  assert.equal(getCurrentSpeaker(cola, [], {}).nombre, 'Francia');
  assert.equal(formatSpeakerNote(draft), '[GSL · España] Paz\nBuena propuesta\nCon ejemplos');
  assert.equal(formatSpeakerNote({ ...draft, nota: 9 }), '[GSL · España · 9/10] Paz\nBuena propuesta\nCon ejemplos');
  assert.equal(formatSpeakerNote({ ...draft, texto: '  ', nota: 8 }), '[GSL · España · 8/10] Paz\n8/10');
  assert.equal(formatSpeakerNote({ ...draft, texto: '  ', nota: 11 }), null);
  assert.equal(formatSpeakerNote({ ...draft, texto: '  ' }), null);
  assert.equal(formatSpeakerNote({ ...draft, orador: null }), null);
  assert.equal(normalizeSpeakerScore(1), 1);
  assert.equal(normalizeSpeakerScore(10), 10);
  assert.equal(normalizeSpeakerScore(0), null);
  assert.equal(extractSpeakerNoteCountry('[GSL · Rusia] En Discusión\nTexto'), 'Rusia');
  assert.equal(extractSpeakerNoteCountry('[GSL · Rusia · 8/10] En Discusión\n8/10'), 'Rusia');
});

test('crea y normaliza notas de oradores independientes sin pasar por mensajería diplomática', () => {
  const structured = createSpeakerNote({
    orador: { nombre: 'Rusia', bandera: '🇷🇺' },
    modalidad: 'GSL',
    tema: 'En Discusión',
    nota: 3,
    texto: 'Argumento estructurado',
    timestamp: 1700000000000
  }, 'Secretaría');

  assert.equal(structured.pais, 'Rusia');
  assert.equal(structured.nota, 3);
  assert.equal(structured.modalidad, 'GSL');
  assert.equal(structured.tema, 'En Discusión');
  assert.equal(structured.texto, 'Argumento estructurado');
  assert.equal(structured.autor, 'Secretaría');

  const fromLegacy = normalizeSpeakerNote({
    id: 'legacy_1',
    type: 'speaker_annotation',
    from: 'Secretaría',
    to: 'CHAIR',
    text: '[GSL · Rusia · 3/10] En Discusión\nafdasgdghfjgkhlj',
    timestamp: 1700000000000
  });
  assert.equal(fromLegacy.pais, 'Rusia');
  assert.equal(fromLegacy.nota, 3);
  assert.equal(fromLegacy.tema, 'En Discusión');
  assert.equal(fromLegacy.texto, 'afdasgdghfjgkhlj');

  const fromDb = normalizeSpeakerNote({
    id: 42,
    pais: 'España',
    autor: 'Mesa',
    contenido: '[Caucus Moderado · España · 9/10] Financiación\n9/10',
    creado_en: '2026-11-10T18:00:00.000Z'
  });
  assert.equal(fromDb.pais, 'España');
  assert.equal(fromDb.nota, 9);
  assert.equal(fromDb.texto, '');
  assert.equal(fromDb.modalidad, 'Caucus Moderado');
});
