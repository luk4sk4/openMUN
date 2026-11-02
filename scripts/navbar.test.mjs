import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const previousStorage = globalThis.localStorage;
try {
  globalThis.localStorage = { getItem: () => null };
  const { default: ConsoleNavbar } = await server.ssrLoadModule('/src/components/dashboard/ConsoleNavbar.jsx');
  const { AccessibilityProvider } = await server.ssrLoadModule('/src/context/AccessibilityContext.jsx');
  const render = (props) => renderToStaticMarkup(
    React.createElement(AccessibilityProvider, null, React.createElement(ConsoleNavbar, props))
  );
  const panel = render({
    title: 'Secretariat', nombreComite: 'Security Council', roleBadge: 'Secretariat', roomId: 'TEST',
    activeTab: 'NOTES', tabs: [{ id: 'NOTES', label: 'Notes', badge: 3 }, { id: 'VOTES', label: 'Votes' }],
    onBack() {}, hasBackDropdown: true, backDropdownOpen: true,
    backOptions: [{ label: 'Chair', onClick() {} }], onExit() {}
  });
  assert.match(panel, /aria-current="page"[^>]*title="Notes"/);
  assert.equal((panel.match(/aria-current="page"/g) || []).length, 1);
  assert.match(panel, /dashboard-unread">3</);
  assert.match(panel, /dashboard-committee-context/);
  assert.match(panel, /has-context/);
  assert.match(panel, /aria-expanded="true"/);
  assert.match(panel, /Chair/);
  assert.match(panel, /Security Council/);
  const sidebarId = panel.match(/aria-controls="([^"]+)"/)[1];
  assert.ok(panel.includes(`id="${sidebarId}"`), 'Tools toggle must point to its sidebar');
  assert.doesNotMatch(panel, /dashboard-session-states/, 'Read-only panels must not expose session controls');

  const entry = render({ title: 'Join session', showContext: false });
  assert.match(entry, /dashboard-nav-title">Join session</);
  assert.match(entry, /<nav hidden=""/);
  assert.doesNotMatch(entry, /dashboard-committee-context|has-context|dashboard-session-states/);
  console.log('Navbar: panel tabs, badges, sidebar association, back menu and entry layout OK');
} finally {
  globalThis.localStorage = previousStorage;
  await server.close();
}
