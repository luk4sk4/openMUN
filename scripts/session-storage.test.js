import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionStore, getSessionScope, setSessionScope } from '../src/utils/sessionStorage.js';

test('tabs retain separate roles and committees while preserving older rooms', () => {
  const makeStorage = () => {
    const values = Object.create(null);
    return Object.assign(values, {
      getItem: key => key in values ? values[key] : null,
      setItem: (key, value) => { values[key] = String(value); },
      removeItem: key => { delete values[key]; }
    });
  };
  const saved = { window: globalThis.window, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  globalThis.localStorage = makeStorage();
  globalThis.sessionStorage = makeStorage();
  globalThis.window = { location: { search: '', href: 'http://localhost/' }, history: { replaceState() {} }, dispatchEvent() {} };
  try {
    globalThis.localStorage.setItem('openmun_paises', '["legacy"]');
    assert.equal(sessionStore.getItem('openmun_paises'), '["legacy"]');
    setSessionScope('A', true);
    sessionStore.setItem('openmun_user_role', 'chair');
    sessionStore.setItem('openmun_paises', '["A"]');
    const tabA = globalThis.sessionStorage;
    globalThis.sessionStorage = makeStorage();
    setSessionScope('B');
    sessionStore.setItem('openmun_user_role', 'delegate');
    sessionStore.setItem('openmun_paises', '["B"]');
    assert.equal(sessionStore.eventKey('openmun:a:openmun_paises'), null);
    assert.equal(sessionStore.eventKey('openmun:b:openmun_paises'), 'openmun_paises');
    globalThis.sessionStorage = tabA;
    assert.equal(getSessionScope(), 'a');
    assert.equal(sessionStore.getItem('openmun_user_role'), 'chair');
    assert.equal(sessionStore.getItem('openmun_paises'), '["A"]');
    sessionStore.setItem('openmun_notes', '["chair-only"]');
    sessionStore.setItem('openmun_user_role', 'delegate');
    sessionStore.setItem('openmun_last_country', 'A');
    assert.equal(sessionStore.getItem('openmun_notes'), null);
    sessionStore.setItem('openmun_notes', '["delegate-only"]');
    sessionStore.setItem('openmun_user_role', 'chair');
    assert.equal(sessionStore.getItem('openmun_notes'), '["chair-only"]');
    assert.equal(sessionStore.eventKey('openmun:a:openmun_notes:delegate%3AA'), null);
    assert.ok(Object.keys(sessionStore).includes('openmun_notes'));
    // Re-selecting a room records it for the next tab or browser restart.
    setSessionScope('A');
    globalThis.sessionStorage = makeStorage();
    assert.equal(getSessionScope(), 'a');
    assert.equal(sessionStore.getItem('openmun_paises'), '["A"]');
    setSessionScope('local');
    sessionStore.removeItem('openmun_paises');
    assert.equal(sessionStore.getItem('openmun_paises'), null);
    assert.equal(globalThis.localStorage.getItem('openmun_paises'), '["legacy"]');
    const write = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    sessionStore.setItem('openmun_paises', '["in-memory recovery"]');
    assert.equal(sessionStore.getItem('openmun_paises'), '["in-memory recovery"]');
    globalThis.localStorage.setItem = write;
    sessionStore.setItem('openmun_paises', '["persisted again"]');
    assert.equal(sessionStore.getItem('openmun_paises'), '["persisted again"]');
  } finally { Object.assign(globalThis, saved); }
});
