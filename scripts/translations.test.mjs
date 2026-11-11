import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { parse, parseExpression } from '@babel/parser';
import i18next from 'i18next';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const dictionaries = Object.fromEntries(['es', 'en'].map(language => [language, JSON.parse(read(`src/languages/${language}.json`))]));
const flatten = (object, prefix = '') => Object.fromEntries(Object.entries(object).flatMap(([key, value]) =>
  typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flatten(value, `${prefix}${key}.`))));
const flat = Object.fromEntries(Object.entries(dictionaries).map(([language, dictionary]) => [language, flatten(dictionary)]));
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
};

test('both languages contain the same keys, without duplicate sections or lost interpolation values', () => {
  assert.deepEqual(Object.keys(flat.es).sort(), Object.keys(flat.en).sort());
  for (const language of ['es', 'en']) {
    walk(parseExpression(read(`src/languages/${language}.json`)), node => {
      if (node.type !== 'ObjectExpression') return;
      const keys = node.properties.map(property => property.key.value);
      assert.equal(new Set(keys).size, keys.length, `${language}: duplicate dictionary key`);
    });
  }
  const variables = value => [...value.matchAll(/{{\s*([^}]+)\s*}}/g)].map(match => match[1].trim()).sort();
  for (const key of Object.keys(flat.es)) {
    assert.ok(flat.en[key].trim(), `${key}: empty English translation`);
    assert.deepEqual(variables(flat.es[key]), variables(flat.en[key]), `${key}: interpolation mismatch`);
  }
});

test('literal translation keys exist in both languages and visible Spanish labels use translation', () => {
  const files = readdirSync(new URL('src/', root), { recursive: true }).filter(path => /\.(jsx|js)$/.test(path) && !path.includes('.test.') && !path.includes('RendimientoEquiposTab'));
  for (const file of files) {
    const source = read(`src/${file}`);
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
    walk(ast, node => {
      if (node.type === 'CallExpression' && (node.callee.name === 't' || node.callee.property?.name === 't') && node.arguments[0]?.type === 'StringLiteral') {
        const key = node.arguments[0].value;
        for (const language of ['es', 'en']) assert.ok(flat[language][key], `${file}: missing ${language} key ${key}`);
      }
      if (node.type === 'JSXText') assert.doesNotMatch(node.value, /[áéíóúñ¿¡]|\b(Guardar|Cancelar|Eliminar|Cerrar|Añadir|Todos|Todas|Pendiente|Rechazar)\b/, `${file}: untranslated JSX text`);
      if (node.type === 'JSXAttribute' && ['title', 'placeholder', 'aria-label', 'alt', 'label'].includes(node.name.name) && node.value?.type === 'StringLiteral') {
        assert.doesNotMatch(node.value.value, /[áéíóúñ¿¡]|\b(Guardar|Cancelar|Eliminar|Cerrar|Añadir)\b/, `${file}: untranslated ${node.name.name}`);
      }
      if (node.type === 'ClassMethod') walk(node.body, child => {
        assert.ok(!(child.type === 'CallExpression' && child.callee.name === 'useTranslation'), `${file}: translation hook inside a class`);
      });
    });
  }
});

test('language changes translate labels and system values without changing stored session values', async () => {
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: Object.fromEntries(Object.entries(dictionaries).map(([language, translation]) => [language, { translation }])) });
  const status = 'Presente y Votando';
  assert.equal(i18n.t(`sessionValues.${status}`), 'Present and Voting');
  assert.equal(i18n.t('common.save'), 'Save');
  assert.equal(i18n.t('timers.noSpeakersDescWithMotions', { count: 3 }), 'There are 3 motions on the motions board.');
  await i18n.changeLanguage('es');
  assert.equal(i18n.t(`sessionValues.${status}`), status);
  assert.equal(i18n.t('common.save'), 'Guardar');
});

test('English and Spanish sample resolutions both parse into four operative articles', async () => {
  const { parsearResolucion } = await import('../src/utils/resolutionUtils.js');
  for (const language of ['es', 'en']) {
    const result = parsearResolucion(dictionaries[language].samples.resolution);
    assert.equal(result.filter(article => !article.esPreambulo).length, 4, language);
    assert.ok(result.some(article => article.esPreambulo), language);
  }
});
