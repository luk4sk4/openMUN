const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRelay } = require('../src/sockets/relay');

function fixture(query) {
  const identities = new Map();
  const packets = [];
  const sockets = new Map();
  const io = { sockets: { sockets }, to: target => ({ emit: (event, payload) => packets.push({ target, event, payload }) }) };
  const sessions = { get: token => identities.get(token), revoke: predicate => {
    for (const [key, value] of identities) if (predicate(value)) identities.delete(key);
  } };
  const saved = [];
  const db = { query: query || (async sql => sql.includes('estado_debate,debate_revision FROM comites')
    ? { rows: [{ debate_revision: '1', estado_debate: { version: 2, state: { paises: [{ nombre: 'España' }, { nombre: 'Francia' }] } } }] }
    : { rows: [] }) };
  const relay = createRelay(io, db, sessions, { enqueue: async (cid, snapshot) => { saved.push({ cid, snapshot }); return { persisted: snapshot.revision }; } });
  function connect(role, userId = role) {
    const handlers = new Map();
    const actor = { role, userId, conferenceId: 'conf', committeeId: 'one' };
    identities.set(userId, actor);
    const socket = { id: userId, connected: true, handshake: { auth: { token: userId } },
      join: async () => {}, on: (event, handler) => handlers.set(event, handler),
      emit: (event, payload) => packets.push({ target: userId, event, payload }),
      disconnect() { this.connected = false; handlers.get('disconnect')?.(); } };
    sockets.set(userId, socket);
    relay(socket, (event, handler) => handlers.set(event, handler));
    return { socket, send: (event, body) => handlers.get(event)(body, actor) };
  }
  return { connect, saved, packets };
}

test('relay enforces one chair, scoped country claims, and stamps delegate identity', async () => {
  const { connect, saved, packets } = fixture();
  const chair = connect('chair');
  await chair.send('luax-join', { comiteId: 'one' });
  const second = connect('chair', 'second');
  await assert.rejects(second.send('luax-join', { comiteId: 'one' }), { status: 409 });
  const delegate = connect('delegate');
  await assert.rejects(delegate.send('luax-join', { comiteId: 'other' }), { status: 403 });
  await delegate.send('luax-join', { comiteId: 'one' });
  await assert.rejects(delegate.send('luax-command', { type: 'CAST_VOTE', payload: { country: 'España', vote: 'favor' } }), { status: 403 });
  await delegate.send('luax-command', { type: 'SELECT_COUNTRY', payload: { country: 'España' } });
  await delegate.send('luax-command', { type: 'CAST_VOTE', payload: { country: 'Francia', vote: 'favor' }, senderMeta: { role: 'chair' } });
  const command = packets.find(packet => packet.event === 'luax-command');
  assert.equal(command.target, 'chair');
  assert.equal(command.payload.payload.country, 'España');
  assert.equal(command.payload.senderMeta.role, 'delegate');
  for (const vote of ['pasar', 'favor_derechos', 'contra_derechos']) {
    await delegate.send('luax-command', { type: 'CAST_VOTE', payload: { vote } });
  }
  await assert.rejects(delegate.send('luax-command', { type: 'CAST_VOTE', payload: { vote: 'invalid' } }), { status: 400 });
  await assert.rejects(delegate.send('luax-command', { type: 'SESSION_ACTION', payload: { action: 'setPaises' } }), { status: 403 });
  await assert.rejects(delegate.send('luax-snapshot', { revision: 2, state: {} }), { status: 403 });
  await chair.send('luax-snapshot', { revision: 2, state: { nombreComite: 'Test', notes: ['private'], pin_mesa: '1234' } });
  assert.deepEqual(saved[0].snapshot.snapshot, { version: 2, state: { nombreComite: 'Test' } });
  chair.socket.disconnect();
  await second.send('luax-join', { comiteId: 'one' });
});

test('disconnect during database lookup cannot reserve the writer', async () => {
  let complete;
  const { connect } = fixture(() => new Promise(resolve => { complete = resolve; }));
  const chair = connect('chair');
  const joining = chair.send('luax-join', { comiteId: 'one' });
  chair.socket.disconnect();
  complete({ rows: [{ debate_revision: '0', estado_debate: {} }] });
  await assert.rejects(joining, { status: 401 });
});
