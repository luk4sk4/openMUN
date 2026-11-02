import assert from 'node:assert/strict';
import { registrarVotoConDerechos } from './votingRights.js';

const original = { tipoVotacion: 'substantive', votos: { b: 'abstencion' } };
const favor = registrarVotoConDerechos(original, 'a', 'favor_derechos');
assert.deepEqual(favor.votos, { a: 'favor', b: 'abstencion' });
assert.deepEqual(favor.derechos, { a: true });
assert.deepEqual(original.votos, { b: 'abstencion' });
const contra = registrarVotoConDerechos(favor, 'a', 'contra_derechos');
assert.equal(contra.votos.a, 'contra');
assert.equal(contra.derechos.a, true);
for (const voto of ['favor', 'contra', 'abstencion', 'pasar', null]) {
  const changed = registrarVotoConDerechos(contra, 'a', voto);
  assert.equal(changed.derechos.a, undefined);
  assert.equal(changed.votos.a, voto ?? undefined);
  assert.equal(changed.votos.b, 'abstencion');
}
const procedural = { tipoVotacion: 'procedural', votos: {} };
assert.equal(registrarVotoConDerechos(procedural, 'a', 'favor_derechos'), procedural);
assert.equal(registrarVotoConDerechos(procedural, 'a', 'contra_derechos'), procedural);
