const { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const derive = promisify(scrypt);
const sessionLifetime = 8 * 60 * 60 * 1000;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function id(value) {
  if (typeof value !== 'string' || !idPattern.test(value)) throw httpError(400, 'Identificador inválido');
  return value;
}

function field(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) {
    throw httpError(400, 'Campo de texto inválido');
  }
  return value.trim();
}

function pinInput(value) {
  return field(value, 64);
}

function pinMaterial(pin, pepper) {
  return createHmac('sha256', pepper).update(pin).digest();
}

async function hashPin(pin, pepper = process.env.PIN_PEPPER) {
  const salt = randomBytes(16);
  const hash = await derive(pinMaterial(pinInput(pin), pepper), salt, 32);
  return 'scrypt:' + salt.toString('hex') + ':' + hash.toString('hex');
}

async function matchesPin(pin, verifier, pepper = process.env.PIN_PEPPER) {
  const match = /^scrypt:([0-9a-f]{32}):([0-9a-f]{64})$/.exec(verifier);
  if (!match) return false;
  const hash = await derive(pinMaterial(pin, pepper), Buffer.from(match[1], 'hex'), 32);
  return timingSafeEqual(hash, Buffer.from(match[2], 'hex'));
}

function createSessions(now = Date.now) {
  const entries = new Map();
  const key = token => createHash('sha256').update(token).digest('hex');

  return {
    issue(identity) {
      const time = now();
      if (entries.size >= 10_000) {
        for (const [digest, entry] of entries) {
          if (entry.expiresAt <= time) entries.delete(digest);
        }
        if (entries.size >= 10_000) throw httpError(503, 'Capacidad de sesiones agotada');
      }
      const token = randomBytes(32).toString('base64url');
      const expiresAt = time + sessionLifetime;
      entries.set(key(token), Object.freeze({ ...identity, expiresAt }));
      return { token, expiresAt };
    },
    get(token) {
      if (typeof token !== 'string' || !tokenPattern.test(token)) return undefined;
      const digest = key(token);
      const entry = entries.get(digest);
      if (entry && entry.expiresAt <= now()) {
        entries.delete(digest);
        return undefined;
      }
      return entry;
    },
    revoke(predicate) {
      for (const [digest, entry] of entries) if (predicate(entry)) entries.delete(digest);
    }
  };
}

function createLoginLimiter(now = Date.now) {
  let deadline = 0;
  const counts = new Map();
  return (ip, scope) => {
    const time = now();
    if (time >= deadline) {
      counts.clear();
      deadline = time + 60_000;
    }
    const ipKey = 'ip:' + ip;
    const scopeKey = 'scope:' + scope;
    if (counts.size >= 20_000 || (counts.get(ipKey) ?? 0) >= 12 || (counts.get(scopeKey) ?? 0) >= 30) {
      throw httpError(429, 'Demasiados intentos');
    }
    for (const key of [ipKey, scopeKey]) counts.set(key, (counts.get(key) ?? 0) + 1);
    const attemptDeadline = deadline;
    let settled = false;
    return () => {
      if (settled || deadline !== attemptDeadline) return;
      settled = true;
      for (const key of [ipKey, scopeKey]) counts.set(key, Math.max(0, (counts.get(key) || 0) - 1));
    };
  };
}

function requireScope(identity, conferenceId, committeeId, roles) {
  if (!identity) throw httpError(401, 'Sesión inválida');
  if (identity.conferenceId !== conferenceId ||
      (committeeId && identity.committeeId !== committeeId && identity.role !== 'org') ||
      (roles && !roles.includes(identity.role))) {
    throw httpError(403, 'Acceso denegado');
  }
  return identity;
}

module.exports = { createSessions, createLoginLimiter, field, id, httpError, hashPin, matchesPin, pinInput, requireScope };
