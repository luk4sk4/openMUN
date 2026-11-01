import assert from 'node:assert/strict';
import { normalizarDebateAgenda, resolverDebateAgenda } from '../src/utils/agendaDebate.js';
import { normalizarDatosComite } from '../src/utils/sessionValidator.js';

const temas = [
  { id: 'a', titulo: 'Tema A', estado: 'En Discusión' },
  { id: 'b', titulo: 'Tema B', estado: 'Pendiente' },
  { id: 'c', titulo: 'Tema C', estado: 'Concluido' }
];
const debate = { propuestaId: 'b', alternativaId: 'a', fase: 'votacion', aFavor: ['p1'], enContra: ['p2'] };
const original = structuredClone(temas);
for (const aprobada of [true, false]) {
  const resultado = resolverDebateAgenda(temas, debate, aprobada);
  assert.equal(resultado.temaActual, aprobada ? 'Tema B' : 'Tema A');
  assert.equal(resultado.temasPropuestos[0].titulo, resultado.temaActual);
  assert.equal(resultado.temasPropuestos.filter(t => t.estado === 'En Discusión').length, 1);
  assert.equal(resultado.temasPropuestos.find(t => t.id === 'c').estado, 'Concluido');
  assert.equal(resultado.debateAgenda.fase, aprobada ? 'aprobada' : 'rechazada');
}
assert.deepEqual(temas, original);
assert.equal(resolverDebateAgenda(temas, { ...debate, fase: 'debate' }, true), null);
assert.equal(normalizarDebateAgenda({ ...debate, propuestaId: 'missing' }, temas), null);
assert.equal(normalizarDebateAgenda({ ...debate, alternativaId: 'b' }, temas), null);
assert.equal(normalizarDebateAgenda({ ...debate, fase: 'invalid' }, temas), null);
assert.deepEqual(normalizarDebateAgenda({ ...debate, aFavor: ['p1', 'p1', 4], enContra: ['p1', 'p2'] }, temas), debate);
assert.equal(normalizarDebateAgenda(null, temas), null);
const recuperada = normalizarDatosComite(JSON.parse(JSON.stringify({ agendaSesion: { temasPropuestos: temas, debateAgenda: debate } })));
assert.deepEqual(recuperada.agendaSesion.debateAgenda, debate);
assert.equal(normalizarDatosComite({ agendaSesion: { temasPropuestos: temas } }).agendaSesion.debateAgenda, null);
console.log('Agenda debate checks passed');
