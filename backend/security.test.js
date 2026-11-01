const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { once } = require('node:events');
const { io: connect } = require('socket.io-client');
const { hashPin, verifyPin } = require('./security.js');

// Tests never open the user's database, SMTP account or Supabase project.
Object.assign(process.env, { DATABASE_PATH: ':memory:', PORT: '0', HOST: '127.0.0.1', SMTP_USER: '', SMTP_PASS: '', SUPABASE_KEEPALIVE_ENABLED: 'false' });
const { server, io, db, limpiarConferenciasInactivas } = require('./server.js');
const ready = server.listening ? Promise.resolve() : once(server, 'listening');
after(async () => { await new Promise(resolve => io.close(resolve)); db.close(); });
const admin = { 'X-OpenMUN-Admin-Pin': 'admin-test' };
db.prepare('INSERT INTO conferencias (id, nombre, pin_admin, pin_acceso) VALUES (?, ?, ?, ?)').run('demo', 'Demo', hashPin('admin-test'), hashPin('entry-test'));
db.prepare('INSERT INTO comites (id, conferencia_id, nombre, pin_mesa, datos_json) VALUES (?, ?, ?, ?, ?)').run('demo_a', 'demo', 'A', hashPin('chair-test'), JSON.stringify({ paises: [{ id: 'a', nombre: 'A', estatus: 'Presente' }, { id: 'b', nombre: 'B', estatus: 'Presente' }], notes: [{ id: 'private', from: 'A', to: 'B', text: 'private history' }] }));
async function request(path, method = 'GET', body, headers = {}) {
  await ready;
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), token: response.headers.get('X-OpenMUN-Session') };
}

test('PINs are salted hashes and REST access is checked on every resource', async () => {
  const hashed = hashPin('1234');
  assert.notEqual(hashed, '1234');
  assert.equal(verifyPin('1234', hashed), true);
  assert.equal(verifyPin('wrong', hashed), false);
  assert.equal((await request('/api/conferencias/demo/resumen')).status, 401);
  assert.equal((await request('/api/comites/demo_a', 'DELETE')).status, 401);
  const viewer = await request('/api/conferencias/demo/acceso', 'POST', { pin: 'entry-test' });
  assert.equal(viewer.status, 200);
  assert.equal(viewer.body.comites[0].pin_mesa, undefined);
  assert.equal(viewer.body.comites[0].datos_json.notes, undefined);
  assert.equal((await request('/api/comites/demo_a', 'PATCH', { datos_json: {} }, { Authorization: `Bearer ${viewer.token}` })).status, 403);
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'demo_a', nombre: 'A', datos_json: { paises: [{ id: 'a', nombre: 'A' }, { id: 'b', nombre: 'B' }], notes: [{ id: 'private', from: 'A', to: 'B', text: 'private history' }], pin_mesa: 'must-not-be-stored' } }, admin)).status, 200);
  assert.equal(verifyPin('chair-test', db.prepare('SELECT pin_mesa FROM comites WHERE id = ?').get('demo_a').pin_mesa), true);
  assert.equal(JSON.parse(db.prepare('SELECT datos_json FROM comites WHERE id = ?').get('demo_a').datos_json).pin_mesa, undefined);
  assert.equal((await request('/api/comites/demo_a', 'PATCH', { datos_json: { notes: 'broken' } }, admin)).status, 400);
  assert.equal((await request('/api/comites/demo_a/acceso', 'POST', { pin: 'wrong' })).status, 401);
  const chair = await request('/api/comites/demo_a/acceso', 'POST', { pin: 'chair-test' });
  assert.equal(chair.status, 200);
  assert.equal(chair.body.pin_mesa, undefined);
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'demo_new', nombre: 'New' }, { Authorization: `Bearer ${chair.token}` })).status, 403);
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'demo_new', nombre: 'New' }, admin)).status, 200);
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'demo_new', nombre: 'New', pin_mesa: 'new-pin' }, admin)).status, 200);
  assert.equal(verifyPin('new-pin', db.prepare('SELECT pin_mesa FROM comites WHERE id = ?').get('demo_new').pin_mesa), true);
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'demo_new', nombre: 'New', pin_mesa: null }, admin)).status, 200);
  assert.equal(db.prepare('SELECT pin_mesa FROM comites WHERE id = ?').get('demo_new').pin_mesa, null);
  assert.equal((await request('/api/comites/demo_new', 'DELETE', null, admin)).status, 200);
  db.prepare('INSERT INTO conferencias (id, nombre, pin_admin) VALUES (?, ?, ?)').run('other', 'Other', hashPin('other-admin'));
  db.prepare('INSERT INTO comites (id, conferencia_id, nombre) VALUES (?, ?, ?)').run('other_a', 'other', 'Foreign');
  assert.equal((await request('/api/conferencias/demo/comites', 'POST', { id: 'other_a', nombre: 'Hijack' }, admin)).status, 403);
  assert.equal((await request('/api/conferencias/demo/comites/other_a', 'DELETE', null, admin)).status, 404);
});

test('cleanup retains inactive conferences without a confirmed backup or after SMTP failure', async () => {
  const insert = db.prepare("INSERT INTO conferencias (id, nombre, pin_admin, email_admin, ultimo_cambio) VALUES (?, 'Old', 'pin', 'fixture@example.invalid', datetime('now', '-40 days'))");
  insert.run('old');
  await limpiarConferenciasInactivas();
  assert.ok(db.prepare('SELECT id FROM conferencias WHERE id = ?').get('old'));
  await limpiarConferenciasInactivas({ sendMail: async () => { throw new Error('simulated SMTP failure'); } });
  assert.ok(db.prepare('SELECT id FROM conferencias WHERE id = ?').get('old'));
  await limpiarConferenciasInactivas({ sendMail: async () => {
    db.prepare('UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = ?').run('old');
  } });
  assert.ok(db.prepare('SELECT id FROM conferencias WHERE id = ?').get('old'), 'a conference reactivated during backup is retained');
  insert.run('archived');
  await limpiarConferenciasInactivas({ sendMail: async () => {} });
  assert.equal(db.prepare('SELECT id FROM conferencias WHERE id = ?').get('archived'), undefined);
});

test('real client protocol enforces staff moderation, private delivery and reconnect history', { timeout: 15000 }, async () => {
  await ready;
  const { createStateDelta } = await import('../src/utils/deltaSync.js');
  const { compressData, decompressData } = await import('../src/utils/compression.js');
  const source = fs.readFileSync(require.resolve('../src/services/peerService.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export default.*;\r?$/gm, '').replace(/\bexport /g, '').replaceAll('import.meta', 'importMeta');
  const base = `http://127.0.0.1:${server.address().port}`;
  const services = [];
  function makeService() {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
    const context = { io: connect, compressData, decompressData, createStateDelta, playChimeAlert() {}, console, setTimeout, clearTimeout, crypto: globalThis.crypto, localStorage: storage, sessionStorage: storage, getSessionScope: () => 'demo_a', setSessionScope() {}, getAccessCredentials: () => ({ chairPin: 'chair-test' }), rememberAccessToken() {}, window: { dispatchEvent() {} }, navigator: { onLine: true }, CustomEvent: class {}, Event: class {}, importMeta: { env: { VITE_SOCKET_SERVER_URL: base } } };
    vm.createContext(context);
    vm.runInContext(source + '\nglobalThis.Service = NetworkService;', context);
    const service = new context.Service();
    services.push(service);
    return service;
  }
  const until = (service, predicate) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(new Error('Expected network event did not arrive')); }, 4000);
    const unsubscribe = service.subscribe((event, data) => { if (predicate(event, data)) { clearTimeout(timer); unsubscribe(); resolve(data); } });
  });
  let outsider;
  try {
    const host = makeService();
    await host.initHost('demo_a', { secretPassword: 'secret-test', backroomPassword: 'backroom-test', staffPassword: 'staff-test', roomSettings: { requireStaffNoteApproval: true, allowDelegateNotes: true, allowChairNotes: true } });
    assert.equal(host.latestNotes.some(n => n.id === 'private'), true, 'fresh hosts recover the full private snapshot');
    const staff = makeService(), a = makeService(), b = makeService();
    await staff.initClient({ roomId: 'demo_a', role: 'staff', password: 'staff-test' });
    await a.initClient({ roomId: 'demo_a', role: 'delegate', country: 'A' });
    const initial = await b.initClient({ roomId: 'demo_a', role: 'delegate', country: 'B' });
    assert.equal(initial.sessionState.notes, undefined);
    assert.equal(staff.latestNotes.some(n => n.id === 'private'), false);
    const receivedB = [];
    b.subscribe((event, data) => { if (event === 'message' && data.type === 'NOTE_RECEIVED') receivedB.push(data.payload); });
    let pending = until(staff, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'test-note' && data.payload.status === 'pending');
    a.sendNoteAsClient('B', 'Private message', 'general', 'test-note');
    await pending;
    assert.equal(receivedB.length, 0);
    const fakeReview = await new Promise(resolve => a.socket.emit('enviar-datos', { sala: 'demo_a', json: { type: 'REVIEW_NOTE', senderMeta: { role: 'staff' }, payload: { id: 'test-note', status: 'approved' } } }, resolve));
    assert.ok(fakeReview.error);
    const delivery = until(b, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'test-note' && data.payload.status === 'approved');
    staff.reviewNoteAsClient('test-note', 'approved');
    await delivery;
    assert.equal(receivedB.length, 1);
    pending = until(staff, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'rejected-note');
    a.sendNoteAsClient('B', 'Must not be delivered', 'general', 'rejected-note');
    await pending;
    const rejected = until(a, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'rejected-note' && data.payload.status === 'rejected');
    staff.reviewNoteAsClient('rejected-note', 'rejected');
    await rejected;
    assert.equal(receivedB.length, 1);
    pending = until(staff, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'local-staff-note');
    a.sendNoteAsClient('B', 'Reviewed from the local staff screen', 'general', 'local-staff-note');
    await pending;
    const localDelivery = until(b, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'local-staff-note' && data.payload.status === 'approved');
    host.handleIncomingMessage('local', { type: 'REVIEW_NOTE', senderMeta: { role: 'staff' }, payload: { id: 'local-staff-note', status: 'approved' } }, true);
    await localDelivery;
    assert.equal(receivedB.length, 2);
    const settingsChanged = until(b, (event, data) => event === 'message' && data.type === 'ROOM_SETTINGS_UPDATED');
    host.broadcastRoomSettings({ requireStaffNoteApproval: false });
    await settingsChanged;
    const directDelivery = until(b, (event, data) => event === 'message' && data.type === 'NOTE_RECEIVED' && data.payload.id === 'direct-note' && data.payload.status === 'delivered');
    a.sendNoteAsClient('B', 'Direct delivery when disabled', 'general', 'direct-note');
    await directDelivery;
    assert.equal(receivedB.length, 3);
    const otherAdmin = await request('/api/conferencias/other', 'PATCH', { pin_admin_actual: 'other-admin' });
    assert.equal(otherAdmin.status, 200);
    const crossedIdentity = await new Promise(resolve => a.socket.emit('unirse-conferencia', { confId: 'other', token: otherAdmin.token }, resolve));
    assert.ok(crossedIdentity.error, 'admin rights in another conference cannot promote an existing room connection');
    const forged = await new Promise(resolve => a.socket.emit('enviar-datos', { sala: 'demo_a', json: { type: 'SESSION_ACTION', senderMeta: { role: 'chair' }, payload: { action: 'vaciarOradoresGSL' } } }, resolve));
    assert.ok(forged.error);
    outsider = connect(base, { transports: ['websocket'] });
    await once(outsider, 'connect');
    const outside = await new Promise(resolve => outsider.emit('enviar-datos', { sala: 'demo_a', json: { type: 'SYNC_STATE', payload: {} } }, resolve));
    assert.ok(outside.error);
    // No credentials are broadcast to other room members during reconnect.
    b.socket.disconnect();
    const reconnected = until(b, event => event === 'connected');
    b.socket.connect();
    const restored = await reconnected;
    assert.equal(restored.notes.some(n => n.id === 'rejected-note'), false);
    assert.equal(restored.notes.some(n => n.id === 'test-note'), true);
    host.socket.disconnect();
    b.socket.disconnect();
    const afterHostReturns = until(b, event => event === 'connected');
    b.socket.connect();
    setTimeout(() => host.socket.connect(), 100);
    await afterHostReturns;
  } finally {
    outsider?.disconnect();
    for (const service of services) service.destroy();
  }
});
