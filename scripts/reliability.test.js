import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createStateDelta, applyStateDelta } from '../src/utils/deltaSync.js';
import { validateSessionJSON } from '../src/utils/sessionValidator.js';
import { createSessionSnapshot, readStoredJSON } from '../src/utils/sessionSnapshot.js';
import { elapsedTicks } from '../src/hooks/useElapsedInterval.js';

test('shrinking, emptying and editing synchronized lists preserves the exact state', () => {
  for (const list of [[], ['A'], ['A', 'B'], ['B', 'C', 'D']]) {
    const old = { queue: ['A', 'B', 'C', 'D'], vote: { a: 'favor' } };
    const next = { queue: list, vote: {} };
    assert.deepEqual(applyStateDelta(old, createStateDelta(old, next)), next);
    assert.deepEqual(old.queue, ['A', 'B', 'C', 'D']);
  }
  assert.deepEqual(applyStateDelta({}, { '__proto__.polluted': true }), {});
  assert.equal({}.polluted, undefined);
});

test('imports reject malformed storage before it can be written and preserve custom flags', () => {
  for (const input of [
    { tipo: 'openmun_full_backup', localStorageSnapshot: { openmun_intervenciones: '[' } },
    { openmun_intervenciones: '[' },
    { tipo: 'openmun_full_backup', notes: 'not a list' }
  ]) assert.equal(validateSessionJSON(input).valid, false);
  const flag = 'data:image/png;base64,' + 'A'.repeat(70000);
  const result = validateSessionJSON({ paises: [{ id: 'a', nombre: 'A', bandera: flag }], localStorageSnapshot: { openmun_api_server_url: 'https://evil.invalid', openmun_oradores: '[]' } });
  assert.equal(result.valid, true);
  assert.equal(result.data.paises[0].bandera, flag);
  assert.equal(result.data.localStorageSnapshot.openmun_api_server_url, undefined);
  assert.deepEqual(result.data.localStorageSnapshot.openmun_oradores, []);
});

test('all persistence paths have the same complete recoverable snapshot', () => {
  const values = { openmun_crisis_eventos: [{ id: 1 }], openmun_notes: [{ id: 'n', status: 'pending' }], openmun_crisis_reloj: { minutos: 10 }, openmun_room_settings: { requireStaffNoteApproval: true } };
  const storage = { getItem: key => key in values ? JSON.stringify(values[key]) : null };
  const snapshot = createSessionSnapshot({ paises: [], nombreComite: 'Test' }, storage);
  assert.deepEqual(snapshot.notes, values.openmun_notes);
  assert.deepEqual(snapshot.eventosCrisis, values.openmun_crisis_eventos);
  assert.deepEqual(snapshot.relojCrisis, values.openmun_crisis_reloj);
  assert.equal(validateSessionJSON(snapshot).valid, true);
  const warnings = console.warn;
  console.warn = () => {};
  try { assert.deepEqual(readStoredJSON('broken', [], { getItem: () => '[' }), []); }
  finally { console.warn = warnings; }
});

test('timers count delayed callbacks using elapsed time, including simulation speed', () => {
  assert.equal(elapsedTicks(1000, 7000), 6);
  assert.equal(elapsedTicks(1000, 1500), 0);
  assert.equal(elapsedTicks(1000, 7000, 100), 60);
  assert.equal(elapsedTicks(1000, 500), 0);
});

test('voting stays provisional with outstanding votes, including a veto', () => {
  const source = fs.readFileSync(new URL('../src/components/widgets/VotacionOficial.jsx', import.meta.url), 'utf8');
  const logic = source.slice(source.indexOf('  const { asunto'), source.indexOf('  // Lista de Países para la Ronda'));
  const evaluate = votes => {
    const context = { paises: Array.from({ length: 10 }, (_, i) => ({ id: String(i), estatus: 'Presente', nombre: String(i), veto: i === 0 })), votacionSesion: { tipoVotacion: 'substantive', tipoMayoria: 'simple', aplicarVeto: true, votos: votes }, useMemo: fn => fn(), t: (_key, fallback) => fallback };
    vm.createContext(context);
    vm.runInContext(logic + '\nglobalThis.result = estadoVotacion;', context);
    return context.result;
  };
  assert.equal(evaluate({ 0: 'favor' }), 'EN_PROCESO');
  assert.equal(evaluate({ 0: 'contra' }), 'EN_PROCESO');
  assert.equal(evaluate(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 'favor']))), 'APROBADA');
});

test('Drive status changes do not schedule a new upload of unchanged data', async () => {
  const source = fs.readFileSync(new URL('../src/context/SessionContext.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('  useEffect(() => {', source.indexOf('// 6. AUTO-GUARDADO CONTINUO EN GOOGLE DRIVE'));
  const end = source.indexOf('  }, [paises', start);
  const dependencies = source.slice(end, source.indexOf('// 7.', end));
  assert.equal(dependencies.includes('driveSyncStatus'), false);
  let upload;
  let scope = 'a';
  let role = 'chair';
  let count = 0;
  const context = { localStorage: { getItem: () => role }, getSessionScope: () => scope, isDriveLinked: true, driveFileId: 'test', driveConflictRef: { current: false }, isInitialSyncRef: { current: true }, driveRemoteModifiedTimeRef: { current: null }, googleDriveService: { isAuthenticated: () => true, actualizarArchivoSesion: async () => { count++; return { modifiedTime: 'now' }; } }, generarSnapshotSesion: () => ({}), setDriveSyncStatus() {}, setDriveRemoteModifiedTime() {}, setDriveLastSync() {}, useEffect: fn => fn(), setTimeout: fn => { upload = fn; }, clearTimeout() {}, Date, console };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '  });', context);
  await upload();
  assert.equal(count, 1);
  vm.runInContext(source.slice(start, end) + '  });', context);
  scope = 'b';
  await upload();
  assert.equal(count, 1, 'a delayed save cannot write a new room into the old Drive file');
  scope = 'a';
  vm.runInContext(source.slice(start, end) + '  });', context);
  role = 'staff';
  await upload();
  assert.equal(count, 1, 'a delayed chair backup is cancelled after changing role in the same room');
});
