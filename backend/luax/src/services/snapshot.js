const { field, httpError } = require('./auth');

function validateSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['topic', 'timer', 'speakers', 'motion'].includes(key))) {
    throw httpError(400, 'Snapshot inválido');
  }
  const { topic, timer, speakers, motion } = value;
  if (typeof topic !== 'string' || topic.length > 2000 || topic.includes('\0') ||
      !timer || Object.keys(timer).length !== 2 ||
      !Number.isSafeInteger(timer.remainingSeconds) || timer.remainingSeconds < 0 ||
      typeof timer.running !== 'boolean' || !Array.isArray(speakers) || speakers.length > 200) {
    throw httpError(400, 'Snapshot inválido');
  }
  return {
    topic,
    timer: { remainingSeconds: timer.remainingSeconds, running: timer.running },
    speakers: speakers.map(speaker => field(speaker, 128)),
    motion: motion == null ? null : field(motion, 2000)
  };
}

module.exports = { validateSnapshot };
