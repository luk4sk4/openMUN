import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  plugins: [{
    name: 'matrix-session-fixture',
    enforce: 'pre',
    transform(_code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/context/SessionContext.jsx')) return;
      return `
        let paises = [];
        export const setTestCountries = (value) => { paises = value; };
        export const useSession = () => ({ paises });
      `;
    }
  }]
});

try {
  const { setTestCountries } = await server.ssrLoadModule('/src/context/SessionContext.jsx');
  const { default: MatrizPaises } = await server.ssrLoadModule('/src/components/widgets/MatrizPaises.jsx');
  const { default: ImportarPaises } = await server.ssrLoadModule('/src/components/widgets/ImportarPaises.jsx');
  const render = (component) => renderToStaticMarkup(React.createElement(component));

  const empty = render(MatrizPaises);
  assert.ok(empty.includes('Añadir países'));
  assert.ok(empty.includes('<dialog'));
  assert.ok(!empty.includes('Importar Países'), 'Importer is only mounted when opening the modal');
  assert.ok(empty.includes('attendance-summary'));
  assert.ok(empty.includes('No hay delegaciones cargadas'));
  assert.ok(!empty.includes('<details'));

  setTestCountries([{ id: 'es', nombre: 'España', bandera: 'es', estatus: 'Presente', veto: false }]);
  const populated = render(MatrizPaises);
  assert.ok(populated.includes('España'));
  assert.ok(populated.includes('attendance-summary'));
  assert.ok(!populated.includes('<details'));
  assert.ok(populated.includes('Añadir países'), 'Add button remains available with countries');
  assert.ok(populated.indexOf('country-matrix-add') > populated.indexOf('attendance-row'), 'Add button follows the list');
  assert.ok(!populated.includes('Importar Países'));
  assert.ok(render(ImportarPaises).includes('Importar Países'), 'Standalone widget remains available');
  console.log('Country matrix: empty/populated list, add button, modal and standalone importer OK');
} finally {
  await server.close();
}
