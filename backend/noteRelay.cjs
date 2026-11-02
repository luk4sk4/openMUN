const { gunzipSync } = require('node:zlib');

// El servidor debe dirigir también los paquetes comprimidos; ocultar notas solo en la UI no basta.
function createNoteRelay(io) {
  const hosts = new Map();
  const hostOnly = new Set(['NOTE_RECEIVED', 'AUTH_RESULT', 'SELECT_COUNTRY_RESULT']);
  const toHost = new Set(['AUTH', 'SEND_NOTE', 'REVIEW_NOTE']);
  return {
    registerHost(socket, room) {
      const current = hosts.get(room);
      if (current && current !== socket.id) return false;
      hosts.set(room, socket.id);
      return true;
    },
    release(socket) {
      for (const [room, id] of hosts) if (id === socket.id) hosts.delete(room);
    },
    expire(room) {
      hosts.delete(room);
    },
    forward(socket, room, raw) {
      if (!socket.rooms.has(room)) return false;
      let message;
      try {
        message = raw?._c === true
          ? JSON.parse(gunzipSync(Buffer.from(raw.data, 'base64'), { maxOutputLength: 25 * 1024 * 1024 }).toString('utf8'))
          : raw;
      } catch {
        return false;
      }
      if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
      const host = hosts.get(room);
      if (hostOnly.has(message.type) && socket.id !== host) return false;
      const packet = { ...message, senderSocketId: socket.id };
      delete packet.senderMeta;
      if (toHost.has(message.type)) {
        if (!host || host === socket.id) return false;
        io.to(host).emit('nuevos-datos', packet);
      } else if (message.targetSocketId) {
        if (socket.id !== host) return false;
        const target = io.sockets.sockets.get(message.targetSocketId);
        if (!target?.rooms.has(room)) return false;
        io.to(target.id).emit('nuevos-datos', packet);
      } else {
        // Nunca admitir una nota o un histórico privado sin destinatario explícito.
        if (hostOnly.has(message.type)) return false;
        socket.to(room).emit('nuevos-datos', packet);
      }
      return true;
    }
  };
}

module.exports = { createNoteRelay };
