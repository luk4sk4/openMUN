const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Pool, databaseConfig } = require('../src/config/db');
const { migrate } = require('../src/db/migrate');
const { createServer } = require('../server');
const { io } = require('socket.io-client');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const path = require('node:path');

test('PostgreSQL rehearsal: migrate twice, CRUD, scoped roles, durable socket snapshot', {
  skip: process.env.RUN_POSTGRES_TESTS !== '1', timeout: 30000
}, async t => {
  assert.match(process.env.DB_NAME, /^openmun_test_/);
  const db = new Pool(databaseConfig());
  const sockets = [];
  let server;
  let appDb;
  t.after(async () => { sockets.forEach(socket => socket.disconnect()); if (server) await server.close(); await appDb?.end(); await db.end(); });
  await migrate(db);
  await migrate(db);
  await db.query('CREATE ROLE openmun_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE');
  await db.query(readFileSync(path.join(__dirname, '../src/db/app-grants.sql'), 'utf8'));
  appDb = new Pool({ ...databaseConfig(), options: '-c role=openmun_app' });
  await assert.rejects(appDb.query('CREATE TABLE forbidden(id int)'), { code: '42501' });
  server = createServer(appDb, { ...process.env, ALLOWED_ORIGINS: 'https://openmun.test' });
  const { port } = await server.start(0);
  const call = async (path, method = 'GET', body, token) => {
    const response = await fetch('http://127.0.0.1:' + port + '/api' + path, { method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: body && JSON.stringify(body) });
    const data = await response.json();
    assert.ok(response.ok, method + ' ' + path + ': ' + response.status + ' ' + JSON.stringify(data));
    return data;
  };
  const org = await call('/conferencias/registro', 'POST', { id: 'rehearsal', nombre: 'Rehearsal', pin_admin: 'org-rehearsal' });
  await call('/conferencias/rehearsal/comites', 'POST', { id: 'one', nombre: 'One', datos_json: {
    paises: [{ nombre: 'Spain', delegado: 'private person' }], notes: [{ text: 'private note' }]
  } }, org.token);
  const chair = await call('/conferencias/rehearsal/sesiones', 'POST', { role: 'chair', comiteId: 'one' }, org.token);
  await call('/comites/one/credenciales', 'PUT', { staff: 'staff-rehearsal', secretariat: 'secret-rehearsal', backroom: 'back-rehearsal' }, chair.token);
  const staff = await call('/comites/one/participantes', 'POST', { role: 'staff', password: 'staff-rehearsal' });
  const delegate = await call('/comites/one/participantes', 'POST', { role: 'delegate' });
  await call('/comites/one', 'PATCH', { datos_json: { nombreComite: 'Edited' } }, org.token);
  assert.equal((await call('/comites/one', 'GET', undefined, chair.token)).datos_json.nombreComite, 'Edited');
  assert.equal((await call('/comites/one', 'GET', undefined, chair.token)).datos_json.paises[0].delegado, 'private person');
  const view = await call('/comites/one', 'GET', undefined, delegate.token);
  assert.equal(view.datos_json.notes, undefined);
  assert.equal(view.datos_json.paises[0].delegado, undefined);
  const task = await call('/conferencias/rehearsal/checklist', 'POST', { titulo: 'Prepare' }, org.token);
  await call('/conferencias/rehearsal/checklist/' + task.id, 'PATCH', { completado: true }, org.token);
  const notice = await call('/conferencias/rehearsal/avisos', 'POST', { comite_id: 'STAFF_COMITE_one', mensaje: 'Prepare', tipo: 'info' }, org.token);
  assert.equal((await call('/conferencias/rehearsal/avisos', 'GET', undefined, delegate.token)).avisos.length, 0);
  assert.equal((await call('/conferencias/rehearsal/avisos', 'GET', undefined, staff.token)).avisos.length, 1);
  await call('/conferencias/rehearsal/avisos/' + notice.id + '/desactivar', 'PATCH', undefined, org.token);
  const socket = io('http://127.0.0.1:' + port, { auth: { token: chair.token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  await once(socket, 'connect');
  const joined = await socket.timeout(5000).emitWithAck('luax-join', { comiteId: 'one' });
  assert.equal(joined.ok, true);
  assert.equal(joined.sessionState.paises[0].delegado, 'private person');
  const conflict = await fetch('http://127.0.0.1:' + port + '/api/comites/one', { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + org.token },
    body: JSON.stringify({ datos_json: { nombreComite: 'conflict' } }) });
  assert.equal(conflict.status, 409);
  await call('/comites/one', 'PATCH', { backupOnly: true, datos_json: { registroIntervenciones: [] } }, chair.token);
  const revision = joined.revision + 1;
  const saved = await socket.timeout(10000).emitWithAck('luax-snapshot', { revision, state: { nombreComite: 'Persisted', paises: [{ nombre: 'Spain' }] } });
  assert.equal(saved.persisted, revision);
  const row = (await db.query('SELECT estado_debate,debate_revision FROM comites WHERE id=$1', ['one'])).rows[0];
  assert.equal(Number(row.debate_revision), revision);
  assert.equal(row.estado_debate.state.nombreComite, 'Persisted');
  async function join(identity) {
    const client = io('http://127.0.0.1:' + port, { auth: { token: identity.token }, transports: ['websocket'], reconnection: false });
    sockets.push(client);
    await once(client, 'connect');
    const result = await client.timeout(5000).emitWithAck('luax-join', { comiteId: 'one' });
    assert.equal(result.ok, true);
    assert.equal(result.sessionState.paises[0].delegado, undefined);
    return client;
  }
  const sender = await join(delegate);
  const moderator = await join(staff);
  const command = (client, type, payload) => client.timeout(5000).emitWithAck('luax-command', { type, payload });
  assert.equal((await command(sender, 'SELECT_COUNTRY', { country: 'Spain' })).ok, true);
  const pending = await command(sender, 'SEND_NOTE', { id: 'note-retry', to: 'CHAIR', text: 'Private rehearsal note' });
  assert.equal(pending.ok, true);
  assert.equal(pending.note.status, 'pending');
  assert.equal((await command(sender, 'SEND_NOTE', { id: 'note-retry', to: 'CHAIR', text: 'Retry' })).note.serverId, pending.note.serverId);
  assert.equal((await command(sender, 'REVIEW_NOTE', { mensajeId: pending.note.serverId, status: 'approved' })).ok, false);
  const delivered = once(socket, 'luax-message');
  assert.equal((await command(moderator, 'REVIEW_NOTE', { mensajeId: pending.note.serverId, status: 'approved' })).ok, true);
  assert.equal((await delivered)[0].payload.text, 'Private rehearsal note');
  assert.equal((await command(moderator, 'REVIEW_NOTE', { mensajeId: pending.note.serverId, status: 'rejected' })).ok, false);
  assert.equal((await command(socket, 'BROADCAST_ANNOUNCEMENT', { id: 'staff-only', target: 'STAFF', text: 'Staff rehearsal' })).ok, true);
  const staffHistory = await moderator.timeout(5000).emitWithAck('luax-join', { comiteId: 'one' });
  const delegateHistory = await sender.timeout(5000).emitWithAck('luax-join', { comiteId: 'one' });
  assert.equal(staffHistory.announcements.length, 1);
  assert.equal(delegateHistory.announcements.length, 0);
  assert.equal((await command(socket, 'SEND_NOTE', { id: 'speaker-score', to: 'CHAIR',
    text: '[Formal · Spain · 8/10]\nGood argument', type: 'speaker_annotation' })).ok, true);
  const historyPath = '/comites/one/historial-respaldo';
  const history = await call(historyPath, 'GET', undefined, org.token);
  assert.equal(history.mensajes.length, 3);
  assert.ok(history.mensajes.every(message => message.backup_id));
  assert.equal((await fetch('http://127.0.0.1:' + port + '/api' + historyPath, {
    headers: { Authorization: 'Bearer ' + delegate.token }
  })).status, 403);
  await call('/conferencias/rehearsal/comites', 'POST', { id: 'two', nombre: 'Two' }, org.token);
  const restorePath = '/comites/two/historial-respaldo';
  assert.equal((await call(restorePath, 'POST', history, org.token)).importados, 3);
  assert.equal((await call(restorePath, 'POST', history, org.token)).importados, 0);
  const restored = await call(restorePath, 'GET', undefined, org.token);
  const annotation = restored.mensajes.find(message => message.client_id === 'speaker-score');
  assert.equal(JSON.parse(annotation.contenido).text, '[Formal · Spain · 8/10]\nGood argument');
  assert.equal(JSON.parse(annotation.contenido).type, 'speaker_annotation');
  assert.equal(annotation.destino_rol, 'chair');
  console.log('PostgreSQL rehearsal verified');
});
