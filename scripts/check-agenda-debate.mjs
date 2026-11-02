import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { resultadoAgenda, resolverDebateAgenda, segundosRestantes } from '../src/utils/agendaDebate.js';

assert.equal(resultadoAgenda(3, 2, 5), 'aprobado');
assert.equal(resultadoAgenda(2, 3, 5), 'rechazado');
assert.equal(resultadoAgenda(2, 2, 4), 'rechazado');
for (const counts of [[0, 0, 0], [2, 1, 5], [4, 2, 5], [-1, 6, 5], [2.5, 2.5, 5]]) {
  assert.equal(resultadoAgenda(...counts), null);
}
assert.equal(segundosRestantes({ restante: 60, fin: 5000 }, 2501), 3);
assert.equal(segundosRestantes({ restante: 60, fin: 5000 }, 6000), 0);
assert.equal(segundosRestantes({ restante: 17, fin: null }, 6000), 17);
const agenda = { temaActual: 'Tema A', temasPropuestos: [
  { id: 'a', titulo: 'Tema A', estado: 'En Discusión' },
  { id: 'b', titulo: 'Tema B', estado: 'Pendiente', debate: { fase: 'votacion', favor: 3, contra: 2, presentes: 5 } },
  { id: 'c', titulo: 'Tema C', estado: 'Concluido' }
] };
const approved = resolverDebateAgenda(agenda, 'b');
assert.equal(approved.temaActual, 'Tema B');
assert.equal(approved.temasPropuestos[0].estado, 'Pendiente');
assert.equal(approved.temasPropuestos[1].debate.resultado, 'aprobado');
assert.equal(approved.temasPropuestos[2].estado, 'Concluido');
assert.equal(agenda.temaActual, 'Tema A', 'Must not mutate the saved agenda');
const rejectedInput = structuredClone(agenda);
Object.assign(rejectedInput.temasPropuestos[1].debate, { favor: 2, contra: 3 });
const rejected = resolverDebateAgenda(rejectedInput, 'b');
assert.equal(rejected.temaActual, 'Tema A');
assert.equal(rejected.temasPropuestos[1].estado, 'Pendiente');
rejectedInput.temaActual = 'Tema B';
assert.equal(resolverDebateAgenda(rejectedInput, 'b').temaActual, '');
rejectedInput.temasPropuestos[1].debate.contra = 0;
assert.equal(resolverDebateAgenda(rejectedInput, 'b'), rejectedInput);
assert.equal(resolverDebateAgenda(approved, 'b'), approved, 'Closed votes cannot be applied again');

const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom',
  plugins: [{ name: 'agenda-session-fixture', enforce: 'pre', transform(_code, id) {
    if (id.replaceAll('\\', '/').endsWith('/src/context/SessionContext.jsx')) return `
      let state;
      export const setTestSession = value => { state = value; };
      export const useSession = () => state;
    `;
  } }]
});
try {
  await server.ssrLoadModule('/src/languages/index.js');
  const { setTestSession } = await server.ssrLoadModule('/src/context/SessionContext.jsx');
  const { default: Widget } = await server.ssrLoadModule('/src/components/widgets/EstablecerAgenda.jsx');
  const state = { nombreComite: 'Consejo <Especial>', agendaSesion: agenda, paises: [
    { id: 'es', nombre: 'España', estatus: 'Presente' },
    { id: 'fr', nombre: 'Francia', estatus: 'Ausente' }
  ] };
  const render = () => { setTestSession(state); return renderToStaticMarkup(React.createElement(Widget)); };
  const voteMarkup = render();
  assert.ok(voteMarkup.includes('Nombre del comité'));
  assert.ok(voteMarkup.includes('Puntos de agenda'));
  assert.ok(voteMarkup.includes('Consejo &lt;Especial&gt;'));
  assert.ok(voteMarkup.includes('Votación a mano alzada'));
  state.agendaSesion = { temaActual: '', temasPropuestos: [{ id: 'a', titulo: 'Paz', estado: 'Pendiente', debate: {
    fase: 'debate', duracion: 60, reloj: { restante: 60, fin: null }, turnoActivo: null, turnos: []
  } }] };
  const debateMarkup = render();
  assert.ok(debateMarkup.includes('01:00'));
  assert.ok(debateMarkup.includes('España'));
  assert.ok(!debateMarkup.includes('Francia'), 'Absent countries cannot join the speaking list');
  assert.ok(debateMarkup.includes('A favor'));
  assert.ok(debateMarkup.includes('En contra'));
  state.paises = [];
  assert.ok(render().includes('Marca las delegaciones presentes'));
  state.agendaSesion = { temasPropuestos: [] };
  assert.ok(render().includes('Sin puntos de agenda asignados'));
  console.log('Agenda debate: majority, ties, invalid counts, topic transitions, timer and rendered states OK');
} finally {
  await server.close();
}
