const { test } = require('node:test');
const assert = require('node:assert/strict');
const { noticeTarget, canReadNotice } = require('../src/routes/notices');

test('notice scope supports legacy role destinations without leaking across roles or conferences', () => {
  assert.deepEqual(noticeTarget('STAFF_COMITE_one'), { committee: 'one', role: 'staff', code: 'STAFF_COMITE_one' });
  assert.deepEqual(noticeTarget('SECRETARIA'), { committee: null, role: 'org', code: 'SECRETARIA' });
  assert.throws(() => noticeTarget('../other'));
  const notice = { conferencia_id: 'conf', comite_id: 'one', destino_rol: 'staff', emisor_rol: 'org', emisor_id: 'org' };
  assert.equal(canReadNotice({ conferenceId: 'conf', committeeId: 'one', role: 'staff' }, notice), true);
  assert.equal(canReadNotice({ conferenceId: 'conf', committeeId: 'one', role: 'delegate' }, notice), false);
  assert.equal(canReadNotice({ conferenceId: 'other', role: 'org' }, notice), false);
  assert.equal(canReadNotice({ conferenceId: 'conf', committeeId: 'two', role: 'staff' }, notice), false);
});
