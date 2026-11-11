import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';

const { createNoteRelay } = createRequire(import.meta.url)('../backend/noteRelay.cjs');
const source = readFileSync(new URL('../src/services/peerService.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/import\.meta/g, '({ env: {} })')
  .replace(/^export default .*;\r?$/gm, '')
  .replace(/^export /gm, '');

function loadService(compressData = async data => data, io, luaxUrl = '', committeeId = null) {
  const storage = new Map();
  if (committeeId) storage.set('openmun_current_comite_id', committeeId);
  const NetworkService = vm.runInNewContext(`${source}\nNetworkService`, {
    console, setTimeout, clearTimeout, compressData, io, LUAX_API_URL: luaxUrl,
    connectLuax: async service => service.roomId,
    localStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) || null }
  });
  return new NetworkService();
}

test('LUAX hosts the active committee instead of a stale generated room', async () => {
  const service = loadService(undefined, undefined, 'https://luax.test', 'active-committee');
  assert.equal(await service.initHost('MUN-OLD'), 'ACTIVE-COMMITTEE');
});

function setup() {
  const sockets = new Map();
  const io = { sockets: { sockets }, to: id => ({ emit: (_event, data) => sockets.get(id)?.inbox.push(data) }) };
  for (const id of ['host', 'sender', 'recipient', 'staff', 'backroom', 'other']) {
    const socket = { id, rooms: new Set([id, id === 'other' ? 'other-room' : 'room']), inbox: [] };
    socket.to = room => ({ emit: (_event, data) => {
      for (const peer of sockets.values()) if (peer.id !== id && peer.rooms.has(room)) peer.inbox.push(data);
    } });
    sockets.set(id, socket);
  }
  const relay = createNoteRelay(io);
  assert.equal(relay.registerHost(sockets.get('host'), 'room'), true);
  const host = loadService();
  host.isHost = true;
  host.role = 'chair';
  host.roomSettings.requireStaffNoteApproval = true;
  host.peerMetadata.set('sender', { role: 'delegate', country: 'Francia' });
  host.peerMetadata.set('recipient', { role: 'delegate', country: 'España' });
  host.peerMetadata.set('staff', { role: 'staff' });
  host.peerMetadata.set('backroom', { role: 'backroom' });
  host.emitSocketMessage = packet => relay.forward(sockets.get('host'), 'room', packet);
  const locals = [];
  host.broadcastLocal = packet => locals.push(packet);
  function send(id, type, payload, senderMeta) {
    const raw = { _c: true, data: gzipSync(JSON.stringify({ type, payload, senderSocketId: 'staff', senderMeta })).toString('base64') };
    assert.equal(relay.forward(sockets.get(id), 'room', raw), true);
    for (const packet of sockets.get('host').inbox.splice(0)) host.handleIncomingMessage(packet.senderSocketId, packet);
  }
  return { host, sockets, relay, send, locals };
}

test('Una nota pendiente solo llega a staff y al emisor; aprobar entrega una sola vez', () => {
  const { host, sockets, send } = setup();
  send('sender', 'SEND_NOTE', { id: 'one', to: 'España', text: 'Privada', status: 'approved', reviewedAt: 1 });
  assert.equal(host.latestNotes[0].status, 'pending');
  assert.equal(host.latestNotes[0].reviewedAt, undefined);
  assert.equal(sockets.get('sender').inbox[0].payload.status, 'pending');
  assert.equal(sockets.get('staff').inbox[0].payload.status, 'pending');
  assert.equal(sockets.get('recipient').inbox.length, 0);
  assert.equal(sockets.get('backroom').inbox.length, 0);
  assert.equal(host.getNotesForRole('delegate', 'España').length, 0);
  assert.equal(host.getNotesForRole('delegate', 'Francia').length, 1);
  // Ni el identificador de socket ni el rol declarados por el delegado autorizan una revisión.
  send('sender', 'REVIEW_NOTE', { id: 'one', status: 'approved' }, { role: 'staff' });
  assert.equal(host.latestNotes[0].status, 'pending');
  send('staff', 'REVIEW_NOTE', { id: 'one', status: 'approved' });
  assert.equal(sockets.get('recipient').inbox.length, 1);
  assert.equal(sockets.get('recipient').inbox[0].payload.status, 'approved');
  assert.equal(host.getNotesForRole('delegate', 'España').length, 1);
  assert.equal(host.getNotesForRole('staff').length, 1);
  send('staff', 'REVIEW_NOTE', { id: 'one', status: 'rejected' });
  send('sender', 'SEND_NOTE', { id: 'one', to: 'España', text: 'Duplicada' });
  assert.equal(sockets.get('recipient').inbox.length, 1);
  assert.equal(host.latestNotes.length, 1);
});

test('Rechazar conserva el estado para el emisor sin entregarlo, incluido el histórico', () => {
  const { host, sockets, send } = setup();
  send('sender', 'SEND_NOTE', { id: 'no', to: 'TODOS', text: 'No entregar' });
  send('staff', 'REVIEW_NOTE', { id: 'no', status: 'invalid' });
  assert.equal(host.latestNotes[0].status, 'pending');
  send('staff', 'REVIEW_NOTE', { id: 'no', status: 'rejected' });
  assert.equal(sockets.get('recipient').inbox.length, 0);
  assert.equal(sockets.get('sender').inbox.at(-1).payload.status, 'rejected');
  assert.equal(host.getNotesForRole('delegate', 'España').length, 0);
  assert.equal(host.getNotesForRole('backroom').length, 0);
  assert.equal(host.getNotesForRole('delegate', 'Francia')[0].status, 'rejected');
});

test('La opción cubre Mesa y Backroom, respeta permisos y permite revisión por staff local', () => {
  const { host, sockets, send } = setup();
  for (const to of ['CHAIR', 'BACKROOM', 'ALL']) {
    send('sender', 'SEND_NOTE', { id: to, to, text: 'Pendiente' });
    assert.equal(host.latestNotes[0].status, 'pending');
  }
  assert.equal(sockets.get('backroom').inbox.length, 0);
  host.roomSettings.requireStaffNoteApproval = false;
  assert.equal(host.getNotesForRole('backroom').length, 0);
  host.handleIncomingMessage('local', { type: 'REVIEW_NOTE', senderMeta: { role: 'staff' }, payload: { id: 'BACKROOM', status: 'approved' } }, true);
  assert.equal(sockets.get('backroom').inbox.length, 1);
  send('sender', 'SEND_NOTE', { id: 'direct', to: 'España', text: 'Directa' });
  assert.equal(sockets.get('recipient').inbox[0].payload.status, 'delivered');
  host.roomSettings.requireStaffNoteApproval = true;
  send('staff', 'SEND_NOTE', { id: 'staff-note', to: 'España', text: 'Staff' });
  assert.equal(sockets.get('recipient').inbox.at(-1).payload.status, 'delivered');
  host.roomSettings.allowChairNotes = false;
  host.roomSettings.allowDelegateNotes = false;
  send('sender', 'SEND_NOTE', { id: 'blocked', to: ' chair ', text: 'Bloqueada' });
  send('sender', 'SEND_NOTE', { id: 'blocked2', to: 'España', text: 'Bloqueada' });
  assert.equal(host.latestNotes.some(n => n.id.startsWith('blocked')), false);
});

test('El relay impide emisiones privadas falsas y filtraciones a otra sala', () => {
  const { relay, sockets } = setup();
  assert.equal(relay.registerHost(sockets.get('recipient'), 'room'), false);
  assert.equal(relay.forward(sockets.get('sender'), 'room', { type: 'NOTE_RECEIVED', targetSocketId: 'recipient', payload: {} }), false);
  assert.equal(relay.forward(sockets.get('host'), 'room', { type: 'NOTE_RECEIVED', payload: {} }), false);
  assert.equal(relay.forward(sockets.get('host'), 'room', { type: 'AUTH_RESULT', targetSocketId: 'other', payload: {} }), false);
  assert.equal(relay.forward(sockets.get('other'), 'room', { type: 'SEND_NOTE', payload: {} }), false);
  assert.equal(relay.forward(sockets.get('sender'), 'room', { _c: true, data: 'invalid' }), false);
  relay.release(sockets.get('host'));
  assert.equal(relay.registerHost(sockets.get('recipient'), 'room'), true);
});

test('El envío conserva el orden de pendiente y aprobado aunque la compresión tarde más', async () => {
  const service = loadService(async packet => {
    if (packet.payload.status === 'pending') await new Promise(resolve => setTimeout(resolve, 20));
    return packet;
  });
  const sent = [];
  service.socket = { connected: true, emit: (_event, data) => sent.push(data.json.payload.status) };
  service.roomId = 'room';
  await Promise.all([
    service.emitSocketMessage({ type: 'NOTE_RECEIVED', payload: { status: 'pending' } }),
    service.emitSocketMessage({ type: 'NOTE_RECEIVED', payload: { status: 'approved' } })
  ]);
  assert.deepEqual(sent, ['pending', 'approved']);
  const local = [];
  service.broadcastChannel = { postMessage: packet => local.push(packet.payload.status) };
  await Promise.all([
    service.broadcastLocal({ type: 'NOTE_RECEIVED', payload: { status: 'pending' } }),
    service.broadcastLocal({ type: 'NOTE_RECEIVED', payload: { status: 'approved' } })
  ]);
  assert.deepEqual(local, ['pending', 'approved']);
});

test('La Mesa espera confirmación del servidor y rechaza una sala ocupada', async () => {
  for (const ok of [true, false]) {
    let disconnected = false;
    let registration;
    const socket = {
      id: 'host',
      on(event, handler) { if (event === 'connect') queueMicrotask(handler); },
      emit(event, request, callback) {
        if (event === 'unirse-comite') {
          registration = request;
          callback({ ok, error: 'Sala ocupada' });
        }
      },
      removeAllListeners() {},
      disconnect() { disconnected = true; }
    };
    const service = loadService(undefined, () => socket);
    if (ok) assert.equal(await service.initHost('room'), 'ROOM');
    else {
      await assert.rejects(service.initHost('room'), /Sala ocupada/);
      assert.equal(disconnected, true);
    }
    assert.equal(registration.isHost, true);
    assert.equal(registration.sala, 'ROOM');
  }
});

test('El histórico autenticado se filtra y el estado general no contiene notas privadas', () => {
  const { host, sockets, send } = setup();
  send('sender', 'SEND_NOTE', { id: 'history', to: 'España', text: 'Pendiente' });
  host.latestSessionState = { notes: host.latestNotes, openmun_notes: JSON.stringify(host.latestNotes), snapshot: { openmun_notes: 'privada', notes: host.latestNotes, openmun_paises: '[]' } };
  send('recipient', 'AUTH', { role: 'delegate', country: 'España' });
  const auth = sockets.get('recipient').inbox.find(packet => packet.type === 'AUTH_RESULT');
  assert.equal(auth.payload.notes.length, 0);
  assert.equal(auth.payload.sessionState.notes, undefined);
  assert.equal(auth.payload.sessionState.openmun_notes, undefined);
  assert.equal(auth.payload.sessionState.snapshot.notes, undefined);
  assert.equal(auth.payload.sessionState.snapshot.openmun_notes, undefined);
  assert.equal(host.latestSessionState.notes.length, 1);
});
