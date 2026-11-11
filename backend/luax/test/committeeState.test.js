const { test } = require('node:test');
const assert = require('node:assert/strict');
const { privateState, publicState, chairState } = require('../src/services/committeeState');

test('state preserves chair history while public projection excludes credentials and personal notes', () => {
  const source = { nombreComite: 'Test', pin_mesa: '1234', notes: [{ text: 'private' }],
    config: { staffPassword: 'secret', density: 2 }, registroIntervenciones: [{ nota: 'private' }],
    paises: [{ nombre: 'Spain', delegado: 'private name', email: 'private', estatus: 'presente' }],
    agendaSesion: { topico: 'Climate', notes: ['private'] } };
  assert.deepEqual(publicState(source), { nombreComite: 'Test', paises: [{ nombre: 'Spain', estatus: 'presente' }], agendaSesion: { topico: 'Climate' } });
  const privateCopy = privateState(source);
  assert.equal(privateCopy.notes[0].text, 'private');
  assert.deepEqual(privateCopy.config, { density: 2 });
  assert.equal(privateCopy.pin_mesa, undefined);
  assert.equal(source.pin_mesa, '1234');
  assert.throws(() => privateState([]));
  assert.throws(() => privateState({ text: '\0' }));
});

test('chair restoration keeps private delegation fields without resurrecting deleted countries', () => {
  const restored = chairState({ paises: [
    { id: 'es', nombre: 'Spain', delegado: 'Private', estatus: 'ausente' },
    { id: 'fr', nombre: 'France', delegado: 'Deleted' }
  ], notes: ['private'] }, { paises: [{ id: 'es', nombre: 'España', estatus: 'presente' }] });
  assert.deepEqual(restored.paises, [{ id: 'es', nombre: 'España', delegado: 'Private', estatus: 'presente' }]);
  assert.deepEqual(restored.notes, ['private']);
  assert.equal(publicState(restored).paises[0].delegado, undefined);
});
