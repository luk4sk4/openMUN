import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/services/luaxRealtime.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const send = vm.runInNewContext(source + '\nsendLuax', { setTimeout, clearTimeout });

test('offline snapshots survive until the next durable acknowledgement', async () => {
  const events = [];
  const service = { socket: { connected: false }, latestSessionState: { nombreComite: 'Offline edit' },
    luaxRevision: 3, emit: (...event) => events.push(event) };
  assert.equal(await send(service, { type: 'SYNC_STATE' }), false);
  assert.equal(service.luaxPendingState, service.latestSessionState);
  service.socket = { connected: true, timeout: () => ({ emitWithAck: async (_, body) => ({ ok: true, persisted: body.revision }) }) };
  service.luaxJoined = true;
  assert.equal(await send(service, { type: 'SYNC_STATE' }), true);
  assert.equal(service.luaxRevision, 4);
  assert.equal(service.luaxPendingState, null);
  assert.equal(events[0][0], 'state_persisted');
});

test('a failed write cannot discard a newer snapshot queued during the await', async () => {
  let rejectWrite;
  const service = { socket: { connected: true, timeout: () => ({ emitWithAck: () => new Promise((_, reject) => { rejectWrite = reject; }) }) },
    luaxJoined: true, luaxRevision: 1, latestSessionState: { revision: 'old' }, emit: () => {} };
  const saving = send(service, { type: 'SYNC_STATE' });
  service.latestSessionState = { revision: 'new' };
  await send(service, { type: 'SYNC_STATE' });
  rejectWrite(new Error('Disconnected'));
  assert.equal(await saving, false);
  assert.equal(service.luaxPendingState.revision, 'new');
  assert.equal(service.luaxSaving, false);
});
