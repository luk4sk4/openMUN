import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLuaxAccess } from '../src/services/luaxAccess.js';

test('LUAX keeps observer, organization and chair tokens separate and in scope', async () => {
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/acceso')) {
      const role = JSON.parse(options.body).role || 'chair';
      return Response.json({
        token: role + '-token', expiresAt: 100,
        conferenceId: 'alpha', committeeId: role === 'chair' ? 'alpha-one' : null, role
      });
    }
    return Response.json({ id: 'alpha' });
  };
  const client = createLuaxAccess('https://luax.test', fetch, () => 10);
  await client.accessConference('alpha', '0012');
  assert.equal(requests[0].options.headers.Authorization, undefined);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer observer-token');
  await client.verifyOrganization('alpha', '0034');
  await client.verifyChair('alpha-one', '0056');
  await client.getCommittee('alpha-one', 'alpha');
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer chair-token');
  await assert.rejects(client.getSummary('beta'), { status: 401 });
  client.lockOrganization('alpha');
  assert.equal(client.hasOrganization('alpha'), false);
  await client.getSummary('alpha');
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer observer-token');
  client.clear();
  await assert.rejects(client.getCommittee('alpha-one', 'alpha'), { status: 401 });
});

test('LUAX rejects unscoped responses and drops invalid or expired sessions', async () => {
  let now = 10;
  let conferenceId = 'beta';
  let deny = false;
  const fetch = async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (url.endsWith('/acceso')) {
      return Response.json({ token: 'org-token', expiresAt: 100, conferenceId, committeeId: null, role: 'org' });
    }
    return deny ? Response.json({ error: 'Sesión inválida' }, { status: 401 }) : Response.json({ id: 'alpha' });
  };
  const client = createLuaxAccess('https://luax.test', fetch, () => now);
  await assert.rejects(client.verifyOrganization('alpha', '0034'));
  conferenceId = 'alpha';
  await client.verifyOrganization('alpha', '0034');
  assert.equal(client.hasOrganization('alpha'), true);
  deny = true;
  await assert.rejects(client.getSummary('alpha'), { status: 401 });
  assert.equal(client.hasOrganization('alpha'), false);
  await client.verifyOrganization('alpha', '0034');
  now = 100;
  assert.equal(client.hasOrganization('alpha'), false);
});
