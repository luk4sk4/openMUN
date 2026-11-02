import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { getDashboardTabs } = await server.ssrLoadModule('/src/utils/dashboardTabs.js');
  const { FIXED_LAYOUTS } = await server.ssrLoadModule('/src/utils/fixedLayouts.js');
  const { defaultDark, defaultLight, sanitizeConfig, getThemeCssVars } = await server.ssrLoadModule('/src/context/AccessibilityContext.jsx');
  const { default: DashboardSubheader } = await server.ssrLoadModule('/src/components/dashboard/DashboardSubheader.jsx');
  const header = renderToStaticMarkup(React.createElement(DashboardSubheader, {
    nombreComite: 'Consejo <Especial>', agendaSesion: { temaActual: 'Paz y seguridad' },
    tipoSesion: 'receso', cambiarTipoSesion: () => {}
  }));
  assert.ok(header.includes('Consejo &lt;Especial&gt;'));
  assert.ok(header.includes('title="Paz y seguridad"'));
  assert.ok(header.includes('aria-pressed="true">Receso</button>'));
  assert.equal((header.match(/<button /g) || []).length, 4);
  assert.equal((header.match(/aria-pressed="true"/g) || []).length, 1);
  const readOnlyHeader = renderToStaticMarkup(React.createElement(DashboardSubheader));
  assert.ok(readOnlyHeader.includes('Sin comité'));
  assert.ok(readOnlyHeader.includes('Agenda no establecida'));
  assert.ok(!readOnlyHeader.includes('<button'));
  const fixedTabs = getDashboardTabs(false);
  const modularTabs = getDashboardTabs(true);
  assert.deepEqual(fixedTabs, ['COMIENZO', 'GSL', 'DEBATE', 'VOTING', 'ENMIENDAS', 'INFO', 'CRISIS']);
  assert.equal(modularTabs.at(-1), 'LIBRE');
  assert.ok(!FIXED_LAYOUTS.COMIENZO.some(panel => panel.i === 'importar_paises'));
  assert.equal(FIXED_LAYOUTS.COMIENZO.find(panel => panel.i === 'establecer_agenda').rowSpan, 7);
  assert.ok(!modularTabs.includes('HOME'));
  for (const tab of fixedTabs) {
    const panels = FIXED_LAYOUTS[tab];
    assert.ok(panels.length > 0, `${tab} must open with content`);
    assert.equal(new Set(panels.map(panel => panel.i)).size, panels.length);
    for (const panel of panels) {
      assert.ok(panel.col >= 0 && panel.col + panel.colSpan <= 12);
      assert.ok(panel.row >= 0 && panel.rowSpan > 0);
      for (const other of panels) {
        if (other === panel) continue;
        const overlap = panel.col < other.col + other.colSpan && other.col < panel.col + panel.colSpan
          && panel.row < other.row + other.rowSpan && other.row < panel.row + panel.rowSpan;
        assert.equal(overlap, false, `${tab}: panels must not overlap`);
      }
    }
  }
  const customLayout = [{ i: 'lista_oradores', col: 2, row: 1, colSpan: 5, rowSpan: 4 }];
  const migrated = sanitizeConfig({ theme: { backgroundColor: '#0c0e14' }, layouts: { GSL: customLayout } });
  assert.equal(migrated.theme.backgroundColor, '#2c2c2c');
  assert.deepEqual(migrated.layouts.GSL, customLayout);
  assert.notDeepEqual(FIXED_LAYOUTS.GSL, customLayout);
  assert.equal(sanitizeConfig({ accessibility: { themeMode: 'light' } }).theme.backgroundColor, '#ffffff');
  assert.equal(sanitizeConfig({ theme: { ...defaultDark, primaryColor: '#123456' } }).theme.primaryColor, '#123456');
  assert.equal(getThemeCssVars(defaultDark, { themeMode: 'dark' })['--bg-color'], '#2c2c2c');
  assert.equal(getThemeCssVars(defaultLight, { themeMode: 'light' })['--bg-color'], '#ffffff');
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const contrast = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const [themeMode, theme] of [['dark', defaultDark], ['light', defaultLight]]) {
    const vars = getThemeCssVars(theme, { themeMode });
    assert.ok(contrast(vars['--btn-text'], vars['--btn-bg']) >= 4.5, `${themeMode}: primary button contrast`);
    for (const status of ['success', 'danger', 'warning', 'info']) {
      assert.ok(contrast(vars[`--${status}-color`], vars['--panel-color']) >= 4.5, `${themeMode}: ${status} text contrast`);
      assert.ok(contrast('#ffffff', vars[`--${status}-solid`]) >= 4.5, `${themeMode}: ${status} button contrast`);
    }
  }
  console.log('Dashboard modes, fixed layouts and theme migration: OK');
} finally {
  await server.close();
}
