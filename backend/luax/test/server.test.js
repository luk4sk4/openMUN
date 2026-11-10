const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io } = require('socket.io-client');
const { createServer } = require('../server');
const { hashPin } = require('../src/services/auth');

const env = {
  ALLOWED_ORIGINS: 'https://openmun.test',
  BOOTSTRAP_TOKEN: 'a-test-only-bootstrap-token-with-enough-entropy',
  PIN_PEPPER: 'a-test-only-pepper-with-enough-entropy'
};

test('startup rejects an outdated database and a non-loopback host', async () => {
  const db = { query: async () => ({ rows: [{ version: 1 }] }) };
  assert.throws(() => createServer(db, { ...env, HOST: '0.0.0.0' }), /127.0.0.1/);
  await assert.rejects(createServer(db, env).start(0), /schema version/);
});

test('HTTP and socket actions enforce the issued scope, and moderation uses the stored message', { timeout: 10_000 }, async t => {
  const hash = await hashPin('000123', env.PIN_PEPPER);
  const committee = { id: 'one', conferencia_id: 'conf', nombre: 'One', pin_mesa: hash };
  const received = [];
  const checklist = new Map();
  let stored;
  let schemaVersion = 3;
  const db = {
    async query(sql, params) {
      const q = sql.trim();
      if (q.includes('MAX(version)')) return { rows: [{ version: schemaVersion }] };
      if (q.includes('SELECT pin_admin')) return { rows: [{ pin_admin: hash, pin_acceso: null }] };
      if (q.startsWith('SELECT conferencia_id, pin_mesa')) return { rows: [committee] };
      if (q.startsWith('SELECT id,nombre,pin_acceso')) return { rows: [{ id: 'conf', nombre: 'Test', requierePin: false }] };
      if (q.includes('AS "requierePinMesa"')) return { rows: [{ id: 'one', requierePinMesa: true }] };
      if (q.startsWith('SELECT id, conferencia_id')) return { rows: [{ ...committee, id: params[0] }] };
      if (q.startsWith('SELECT 1 FROM comites')) return { rowCount: 1 };
      if (q.startsWith('SELECT estado_debate')) return { rows: [{ debate_revision: '0' }] };
      if (q.startsWith('INSERT INTO checklist_staff')) {
        assert.equal(params[0], 'conf');
        const [conferencia_id, comite_id, titulo, asignado_a] = params;
        if (comite_id === 'foreign') return { rows: [] };
        checklist.set('1', { id: '1', conferencia_id, comite_id, titulo, asignado_a, completado: false });
        return { rows: [{ id: '1' }] };
      }
      if (q.startsWith('SELECT id,conferencia_id,comite_id,titulo')) {
        assert.equal(params[0], 'conf');
        return { rows: [...checklist.values()] };
      }
      if (q.startsWith('UPDATE checklist_staff')) {
        assert.match(q, /conferencia_id\s*=\s*\$1/);
        const task = checklist.get(params[1]);
        if (task) task.completado = params[2];
        return { rowCount: task ? 1 : 0 };
      }
      if (q.startsWith('WITH deleted AS')) {
        assert.match(q, /conferencia_id\s*=\s*\$1/);
        const task = checklist.get('1');
        const removed = task?.completado && params[1] === 'GLOBAL' && task.comite_id === null;
        if (removed) checklist.delete('1');
        return { rows: [{ eliminados: removed ? 1 : 0 }] };
      }
      if (q.startsWith('INSERT INTO mensajes')) {
        assert.deepEqual(params.slice(0, 4), ['one', 'conf', 'delegate', 'france']);
        stored = { id: '1', emisor_rol: params[2], emisor_id: params[3], destino_tipo: params[4],
          destino_rol: params[5], destino_id: params[6], contenido: params[7], estado: params[8] };
        return { rows: [{ ...stored }] };
      }
      if (q.startsWith('UPDATE mensajes')) {
        assert.deepEqual(params.slice(0, 3), ['1', 'one', 'conf']);
        assert.match(q, /estado='pending_approval'/);
        if (stored.estado !== 'pending_approval') return { rows: [] };
        stored.estado = params[3];
        return { rows: [{ ...stored }] };
      }
      throw new Error('Unexpected SQL ' + q);
    }
  };
  const server = createServer(db, env);
  const { port } = await server.start(0);
  const url = 'http://127.0.0.1:' + port;
  const sockets = [];
  t.after(async () => {
    for (const socket of sockets) socket.disconnect();
    await server.close();
  });
  const { createLuaxAccess } = await import('../../../src/services/luaxAccess.js');
  const frontend = createLuaxAccess(url);
  assert.deepEqual(await frontend.accessConference('conf'), {
    id: 'conf', nombre: 'Test', requierePin: false, comites: [{ id: 'one', requierePinMesa: true }]
  });
  await assert.rejects(frontend.getCommittee('one', 'conf'), { status: 401 });
  await assert.rejects(frontend.enterChairWithoutPin('conf', 'one'), { status: 401 });
  await frontend.verifyOrganization('conf', '000123');
  assert.deepEqual(await frontend.createChecklistTask('conf', { titulo: 'Preparar la sala' }), { ok: true, id: '1' });
  assert.equal((await frontend.getChecklist('conf')).checklist.length, 1);
  await assert.rejects(frontend.createChecklistTask('conf', { titulo: 'Otra sala', comite_id: 'foreign' }), { status: 404 });
  await frontend.setChecklistTaskDone('conf', '1', true);
  assert.equal((await frontend.getChecklist('conf')).checklist[0].completado, true);
  assert.deepEqual(await frontend.removeCompletedChecklistTasks('conf', 'GLOBAL'), { ok: true, eliminados: 1 });
  assert.deepEqual(await frontend.getChecklist('conf'), { checklist: [] });
  await frontend.enterChairWithoutPin('conf', 'one');
  assert.equal(frontend.hasChair('one'), true);
  await frontend.verifyChair('one', '000123');
  assert.equal((await frontend.getCommittee('one', 'conf')).requierePinMesa, true);
  frontend.clear();
  await assert.rejects(frontend.getCommittee('one', 'conf'), { status: 401 });
  async function request(path, { body, token, origin } = {}) {
    const res = await fetch(url + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(origin ? { origin } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json() };
  }
  const connect = (token, origin) => {
    const socket = io(url, {
      auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false,
      extraHeaders: origin ? { Origin: origin } : undefined
    });
    sockets.push(socket);
    return socket;
  };
  const emit = (socket, name, data) => socket.timeout(3000).emitWithAck(name, data);

  assert.equal((await request('/readyz')).status, 200);
  schemaVersion = 1;
  assert.equal((await request('/readyz')).status, 503);
  schemaVersion = 3;
  assert.equal((await request('/readyz', { origin: 'https://bad.test' })).status, 403);
  assert.equal((await request('/api/comites/one')).status, 401);
  const deniedSocket = connect('bad-token');
  await once(deniedSocket, 'connect_error');
  const login = await request('/api/conferencias/conf/acceso', { body: { role: 'org', pin: '000123' } });
  assert.equal(login.status, 200);
  const org = login.data.token;
  const blockedOrigin = connect(org, 'https://bad.test');
  await once(blockedOrigin, 'connect_error');

  async function member(role, userId, comiteId = 'one') {
    const response = await request('/api/conferencias/conf/sesiones', { token: org, body: { role, userId, comiteId } });
    assert.equal(response.status, 200);
    return response.data.token;
  }
  const delegate = await member('delegate', 'france');
  const recipient = await member('delegate', 'spain');
  const otherCommittee = await member('delegate', 'spain', 'two');
  const staff = await member('staff', 'moderator');

  const view = await request('/api/comites/one', { token: delegate });
  assert.equal(view.data.requierePinMesa, true);
  assert.equal(Object.hasOwn(view.data, 'pin_mesa'), false);
  assert.equal((await request('/api/comites/two', { token: delegate })).status, 403);
  assert.equal((await request('/api/notas/one', { token: delegate })).status, 403);
  assert.equal((await request('/api/conferencias/conf/checklist', { token: delegate })).status, 403);
  assert.equal((await request('/api/conferencias/other/checklist', { token: org })).status, 403);

  const sender = connect(delegate);
  const receiver = connect(recipient);
  const unrelated = connect(otherCommittee);
  const moderator = connect(staff);
  await Promise.all([sender, receiver, unrelated, moderator].map(socket => once(socket, 'connect')));
  const join = (socket, comiteId) => emit(socket, 'unirse-comite', { comiteId, role: 'staff', userId: 'spain' });
  assert.equal((await join(sender, 'two')).ok, false);
  for (const socket of [sender, receiver, moderator]) assert.equal((await join(socket, 'one')).ok, true);
  assert.equal((await join(unrelated, 'two')).ok, true);
  unrelated.on('nuevo-mensaje-privado', message => received.push(message));
  const pending = once(moderator, 'mensaje-para-moderar');
  const sent = await emit(sender, 'enviar-mensaje', {
    comiteId: 'one', origin: { role: 'staff' }, requiereModeracion: false, content: 'real',
    target: { type: 'direct', role: 'delegate', id: 'spain' }
  });
  assert.equal(sent.status, 'pending_approval');
  assert.equal((await pending)[0].emisor_rol, 'delegate');
  const decision = { comiteId: 'one', mensajeId: sent.id, accion: 'aprobar', mensaje: { contenido: 'forged' } };
  assert.equal((await emit(sender, 'resolver-moderacion', decision)).ok, false);
  const delivery = once(receiver, 'nuevo-mensaje-privado');
  const outcomes = await Promise.all([
    emit(moderator, 'resolver-moderacion', decision),
    emit(moderator, 'resolver-moderacion', decision)
  ]);
  assert.equal(outcomes.filter(result => result.ok).length, 1);
  assert.equal((await delivery)[0].contenido, 'real');
  assert.deepEqual(received, []);
});
