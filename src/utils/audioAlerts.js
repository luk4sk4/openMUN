// ─────────────────────────────────────────────────────────────────────────────
// Generador de Efectos de Sonido Sintetizados con Web Audio API para openMUN
// 100% autónomo, no requiere archivos de audio externos ni dependencias.
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Sonido de "Tic / Ruleta / Paso de Tarjeta" táctil y suave
 */
export function playTickSound(volume = 0.25) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    console.debug('Audio playTick error:', e);
  }
}

/**
 * Sonido de "Fanfarria / Acierto / Selección de País" armónico y brillante
 */
export function playFanfareSound(volume = 0.4) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notas = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
    notas.forEach((freq, index) => {
      const delay = index * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume * 0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    });
  } catch (e) {
    console.debug('Audio playFanfare error:', e);
  }
}

/**
 * Alerta de "Breaking News / Noticiero de Crisis / Última Hora"
 * Dos tonos de transmisión de emergencia seguidos de un acorde de impacto
 */
export function playBreakingNewsAlert(volume = 0.45) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Tono 1 (880 Hz - La5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.19);

    // Tono 2 (659 Hz - Mi5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.19);
    gain2.gain.setValueAtTime(volume * 0.3, ctx.currentTime + 0.19);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.19);
    osc2.stop(ctx.currentTime + 0.39);

    // Acorde orquestal de impacto (Do menor / tensión dramática)
    const chordFreqs = [261.63, 311.13, 392.00, 523.25];
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 1.25);
    });
  } catch (e) {
    console.debug('Audio playBreakingNews error:', e);
  }
}

/**
 * Pulso de alarma táctica / emergencia
 */
export function playEmergencyPulse(volume = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      const delay = i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(950, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + delay + 0.09);

      gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.1);
    }
  } catch (e) {
    console.debug('Audio playEmergencyPulse error:', e);
  }
}

/**
 * Campana / Chime suave para Avisos Oficiales y Notificaciones
 */
export function playChimeAlert(volume = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const freqs = [587.33, 880.00]; // Re5, La5
    freqs.forEach((f, idx) => {
      const delay = idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.65);
    });
  } catch (e) {
    console.debug('Audio playChimeAlert error:', e);
  }
}

/**
 * Pitido de aviso de finalización de tiempo para cronómetros
 */
export function playTimerAlarm(volume = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.debug('Audio playTimerAlarm error:', e);
  }
}



