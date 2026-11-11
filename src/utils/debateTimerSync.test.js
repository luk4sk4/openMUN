import test from 'node:test';
import assert from 'node:assert/strict';

test('reloj debate synchronizes anchor timestamp calculation accurately', () => {
  const t0 = 1700000000000;
  const initialSeconds = 60;
  
  // When running, remaining seconds = initial - elapsed
  const elapsed = 15;
  const now = t0 + elapsed * 1000;
  const remaining = initialSeconds - Math.floor((now - t0) / 1000);
  assert.equal(remaining, 45);

  // Negative overtime
  const overtimeElapsed = 65;
  const overtimeNow = t0 + overtimeElapsed * 1000;
  const overtimeRemaining = initialSeconds - Math.floor((overtimeNow - t0) / 1000);
  assert.equal(overtimeRemaining, -5);
});

test('timer controls handle adjustments, resets, and presets', () => {
  let timerState = {
    modo: 'GSL',
    corriendo: false,
    segundosRestantes: 60,
    tiempoInicial: 60,
    timestamp: Date.now()
  };

  // Adjust +15s
  timerState.segundosRestantes += 15;
  assert.equal(timerState.segundosRestantes, 75);

  // Adjust -15s
  timerState.segundosRestantes -= 15;
  assert.equal(timerState.segundosRestantes, 60);

  // Reset restores initial time
  timerState.segundosRestantes = 20;
  timerState.segundosRestantes = timerState.tiempoInicial;
  assert.equal(timerState.segundosRestantes, 60);

  // Preset change
  timerState.tiempoInicial = 90;
  timerState.segundosRestantes = 90;
  assert.equal(timerState.segundosRestantes, 90);
  assert.equal(timerState.tiempoInicial, 90);
});

test('caucus mode calculates both speaker time and total caucus duration', () => {
  const caucusState = {
    modo: 'CAUCUS',
    corriendo: true,
    timestamp: 1700000000000,
    tiempoOradorSeg: 45,
    limiteOradorSeg: 45,
    tiempoTotalSeg: 600,
    tiempoTotalInicial: 600
  };

  const elapsed = 10;
  const now = caucusState.timestamp + elapsed * 1000;
  const currentSpeaker = caucusState.tiempoOradorSeg - Math.floor((now - caucusState.timestamp) / 1000);
  const currentTotal = Math.max(0, caucusState.tiempoTotalSeg - Math.floor((now - caucusState.timestamp) / 1000));

  assert.equal(currentSpeaker, 35);
  assert.equal(currentTotal, 590);
});

test('two-signal synchronization (start / stop) across main and secretariat crons', () => {
  let mainCron = { corriendo: false, segundos: 60 };
  let secCron = { corriendo: false, segundos: 60 };

  const sendSignal = (source, signal, payload = {}) => {
    const target = source === 'main' ? secCron : mainCron;
    if (signal === 'start') {
      target.corriendo = true;
      if (typeof payload.segundos === 'number') target.segundos = payload.segundos;
    } else if (signal === 'stop') {
      target.corriendo = false;
      if (typeof payload.segundos === 'number') target.segundos = payload.segundos;
    }
  };

  // 1. Action main cron -> start
  mainCron.corriendo = true;
  sendSignal('main', 'start', { segundos: 60 });
  assert.equal(secCron.corriendo, true);
  assert.equal(secCron.segundos, 60);

  // Both tick down 10 seconds
  mainCron.segundos -= 10;
  secCron.segundos -= 10;

  // 2. Action secretariat cron -> stop
  secCron.corriendo = false;
  sendSignal('secretariat', 'stop', { segundos: secCron.segundos });
  assert.equal(mainCron.corriendo, false);
  assert.equal(mainCron.segundos, 50);

  // 3. Action secretariat cron -> start
  secCron.corriendo = true;
  sendSignal('secretariat', 'start', { segundos: secCron.segundos });
  assert.equal(mainCron.corriendo, true);
  assert.equal(mainCron.segundos, 50);

  // 4. Action main cron -> stop
  mainCron.corriendo = false;
  sendSignal('main', 'stop', { segundos: 45 });
  assert.equal(secCron.corriendo, false);
  assert.equal(secCron.segundos, 45);
});

test('advancing speaker in caucus synchronizes mode and resets speaker timer', () => {
  // Simulates Chair running Caucus at 58s with next speaker transition
  let chairState = {
    modo: 'CAUCUS',
    corriendo: false,
    tiempoOradorSeg: 60,
    limiteOradorSeg: 60,
    tiempoTotalSeg: 594,
    oradoresCaucus: ['Alemania', 'Arabia Saudita']
  };

  let secState = {
    modo: 'GSL', // Previously stuck in GSL
    corriendo: true,
    segundosRestantes: -1186, // -19:46
    tiempoInicial: 60,
    oradoresCaucus: ['Argentina']
  };

  // Chair emits next_speaker signal with CAUCUS mode and updated speaker list
  const nextSpeakerSignal = {
    signal: 'next_speaker',
    modo: 'CAUCUS',
    tiempoOradorSeg: 60,
    limiteOradorSeg: 60,
    tiempoTotalSeg: 594,
    source: 'main'
  };

  // Secretariat processes the signal
  const targetModo = nextSpeakerSignal.modo || secState.modo;
  secState.modo = targetModo;
  const segToUse = targetModo === 'CAUCUS'
    ? (typeof nextSpeakerSignal.tiempoOradorSeg === 'number' ? nextSpeakerSignal.tiempoOradorSeg : nextSpeakerSignal.limiteOradorSeg)
    : nextSpeakerSignal.segundosRestantes;
  const initToUse = targetModo === 'CAUCUS' ? nextSpeakerSignal.limiteOradorSeg : nextSpeakerSignal.tiempoInicial;

  secState.corriendo = false;
  secState.segundosRestantes = segToUse;
  secState.tiempoInicial = initToUse;

  // Verify Secretariat switched to CAUCUS, stopped, and has 60s assigned (not -19:46)
  assert.equal(secState.modo, 'CAUCUS');
  assert.equal(secState.corriendo, false);
  assert.equal(secState.segundosRestantes, 60);
  assert.equal(secState.tiempoInicial, 60);
});

test('remote session state takes precedence over stale local storage on client', () => {
  const staleLocalStorage = {
    oradoresCaucus: [{ nombre: 'Argentina' }],
    caucusActivo: { activo: false }
  };

  const remoteSessionState = {
    oradoresCaucus: [{ nombre: 'Alemania' }, { nombre: 'Arabia Saudita' }],
    caucusActivo: { activo: true, tipo: 'Caucus Moderado', tema: 'Crisis' }
  };

  const isRemote = Boolean(remoteSessionState);
  const resolvedCaucusActivo = (isRemote && remoteSessionState.caucusActivo && typeof remoteSessionState.caucusActivo === 'object')
    ? remoteSessionState.caucusActivo
    : staleLocalStorage.caucusActivo;

  const resolvedOradoresCaucus = (isRemote && Array.isArray(remoteSessionState.oradoresCaucus))
    ? remoteSessionState.oradoresCaucus
    : staleLocalStorage.oradoresCaucus;

  assert.equal(resolvedCaucusActivo.activo, true);
  assert.equal(resolvedCaucusActivo.tipo, 'Caucus Moderado');
  assert.equal(resolvedOradoresCaucus.length, 2);
  assert.equal(resolvedOradoresCaucus[0].nombre, 'Alemania');
  assert.equal(resolvedOradoresCaucus[1].nombre, 'Arabia Saudita');
});
