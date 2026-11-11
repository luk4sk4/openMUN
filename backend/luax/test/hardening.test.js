const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPin, matchesPin, createSessions, createLoginLimiter } = require('../src/services/auth');
const { createDebateQueue } = require('../src/services/debateQueue');

test('successful participants sharing Wi-Fi do not exhaust failed login attempts', () => {
  let time = 0;
  const attempt = createLoginLimiter(() => time);
  for (let n = 0; n < 100; n++) attempt('school', 'committee')();
  for (let n = 0; n < 12; n++) attempt('school', 'committee');
  assert.throws(() => attempt('school', 'committee'), { status: 429 });
  time = 60001;
  assert.doesNotThrow(() => attempt('school', 'committee'));
});

test('PIN verifiers are salted and preserve leading zeroes', async () => {
  const pepper = 'test pepper';
  const pin = await hashPin('000123', pepper);
  assert.notEqual(pin, await hashPin('000123', pepper));
  assert.equal(await matchesPin('000123', pin, pepper), true);
  assert.equal(await matchesPin('123', pin, pepper), false);
  assert.equal(await matchesPin('000123', '000123', pepper), false);
});

test('sessions expire and ignore unissued bearer tokens', () => {
  let time = 0;
  const sessions = createSessions(() => time);
  const issued = sessions.issue({ role: 'delegate', conferenceId: 'c', committeeId: 'a', userId: 'france' });
  assert.equal(sessions.get(issued.token).role, 'delegate');
  assert.equal(sessions.get('invented'), undefined);
  time = issued.expiresAt;
  assert.equal(sessions.get(issued.token), undefined);
});

test('a snapshot arriving during a write is persisted after it and drained', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const writes = [];
  const queue = createDebateQueue(async (_committee, snapshot) => {
    writes.push(snapshot);
    if (snapshot === 2) await blocked;
    return snapshot;
  }, 60_000);
  const first = queue.enqueue('a', 1);
  const second = queue.enqueue('a', 2);
  const draining = queue.drain();
  await Promise.resolve();
  const third = queue.enqueue('a', 3);
  release();
  await draining;
  assert.deepEqual(await Promise.all([first, second, third]), [
    { superseded: true }, { persisted: 2 }, { persisted: 3 }
  ]);
  assert.deepEqual(writes, [2, 3]);
});
