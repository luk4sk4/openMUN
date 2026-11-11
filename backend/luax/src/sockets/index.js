const { registerCommitteeSockets, createPersistence } = require('./comites.socket');
const { createRelay } = require('./relay');

function initSockets(io, db, sessions, accepting, writers) {
  const persistence = createPersistence(db);
  const pending = new Set();
  const relay = createRelay(io, db, sessions, persistence, writers);
  const revoke = sessions.revoke;
  sessions.revoke = predicate => {
    revoke(predicate);
    for (const socket of io.sockets.sockets.values()) {
      if (!sessions.get(socket.handshake.auth.token)) socket.disconnect(true);
    }
  };

  io.use((socket, next) => {
    const identity = sessions.get(socket.handshake.auth.token);
    if (!accepting() || !identity) return next(new Error('Sesión inválida'));
    next();
  });
  io.on('connection', socket => {
    const token = socket.handshake.auth.token;
    const identity = sessions.get(token);
    if (!identity) return socket.disconnect(true);
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, identity.expiresAt - Date.now()));
    socket.once('disconnect', () => clearTimeout(expiry));

    const on = (event, handler) => socket.on(event, (body, reply) => {
      const ack = typeof reply === 'function' ? reply : () => {};
      const actor = sessions.get(token);
      if (!accepting() || !actor) return ack({ ok: false, error: 'Sesión no disponible' });
      const job = Promise.resolve().then(() => handler(body, actor)).then(
        data => ack({ ok: true, ...data }),
        error => {
          if (!error.status) console.error('Socket operation failed:', event, error.code || error.name);
          ack({ ok: false, error: error.status ? error.message : 'No se pudo completar la operación' });
        }
      );
      pending.add(job);
      job.then(() => pending.delete(job), () => pending.delete(job));
    });

    registerCommitteeSockets(io, socket, on, db, persistence);
    relay(socket, on);
  });

  return async () => {
    await Promise.allSettled([...pending, persistence.drain()]);
  };
}

module.exports = { initSockets };
