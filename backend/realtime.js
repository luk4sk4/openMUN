const { gunzipSync } = require('node:zlib');
const { publicState, canReadNote } = require('./security.js');

const normalize = value => String(value || '').trim().toUpperCase();
const hostTypes = new Set(['ROOM_CREDENTIALS', 'AUTH_RESULT', 'SELECT_COUNTRY_RESULT', 'SYNC_STATE', 'DELTA_STATE', 'ROOM_SETTINGS_UPDATED', 'SPEAKING_PROCESSED', 'SPEAKING_REQUESTS_UPDATED', 'NOTE_RECEIVED', 'CRISIS_ALERT', 'BROADCAST_ANNOUNCEMENT', 'DELETE_ANNOUNCEMENT', 'AMENDMENTS_PROPOSALS_UPDATED', 'KICK', 'PEER_LIST_UPDATED', 'PONG']);
const clientRoles = {
  UPDATE_ROOM_SETTINGS: ['secretariat'], PROCESS_SPEAKING_REQUEST: ['secretariat'], KICK_PEER: ['secretariat'],
  SESSION_ACTION: ['secretariat'], CAST_VOTE: ['delegate'], REQUEST_SPEAKING: ['delegate'],
  SUBMIT_AMENDMENT: ['delegate'], SEND_NOTE: ['delegate', 'staff', 'backroom', 'secretariat'],
  REVIEW_NOTE: ['staff'], REQUEST_FULL_SYNC: ['delegate', 'staff', 'backroom', 'secretariat'],
  SELECT_COUNTRY: ['delegate'], RELEASE_COUNTRY: ['delegate'],
  BROADCAST_ANNOUNCEMENT: ['staff', 'secretariat'], DELETE_ANNOUNCEMENT: ['staff', 'secretariat']
};

function decode(packet) {
  const data = packet?._c === true
    ? JSON.parse(gunzipSync(Buffer.from(packet.data, 'base64'), { maxOutputLength: 2 * 1024 * 1024 }).toString())
    : packet;
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.type !== 'string') throw new Error('Mensaje inválido.');
  return data;
}

function applyDelta(state, delta) {
  const result = structuredClone(state || {});
  for (const [path, value] of Object.entries(delta || {})) {
    const keys = path.split('.');
    if (!path || keys.some(k => ['__proto__', 'constructor', 'prototype'].includes(k))) continue;
    let target = result;
    for (const key of keys.slice(0, -1)) target = target[key] ||= {};
    const key = keys.at(-1);
    if (value === '__OPENMUN_DELETED__') delete target[key];
    else target[key] = value;
  }
  return result;
}

function attachRealtime(io, db, security) {
  const rooms = new Map();
  const failedJoins = new Map();
  const cleanUp = setInterval(() => {
    for (const [address, entry] of failedJoins) if (Date.now() - entry.since > 60000) failedJoins.delete(address);
    for (const [id, room] of rooms) if (Date.now() - room.createdAt > 12 * 60 * 60 * 1000) {
      io.to(id).emit('cierre-forzado', 'La sala ha excedido el límite de 12 horas.');
      io.in(id).socketsLeave(id);
      rooms.delete(id);
    }
  }, 60000);
  cleanUp.unref();
  const peers = id => [...io.sockets.sockets.values()].filter(peer => peer.rooms.has(id) && peer.data.roomId === id);
  const notifyHost = (room, message) => room.hostId && io.to(room.hostId).emit('nuevos-datos', message);
  const chooseCountry = (id, socket, requested, state) => {
    if (!requested) return null;
    const country = (state.paises || []).find(p => String(p.nombre || p).toLowerCase().trim() === String(requested).toLowerCase().trim());
    if (!country) throw new Error('La delegación no pertenece a este comité.');
    const name = country.nombre || country;
    if (peers(id).some(p => p.id !== socket.id && p.data.identity?.role === 'delegate' && p.data.identity.country === name)) throw new Error('Esta delegación ya está ocupada.');
    return name;
  };
  io.on('connection', socket => {
    socket.data.messageWindow = { since: Date.now(), count: 0 };
    socket.on('unirse-conferencia', (request, ack = () => {}) => {
      const address = socket.handshake.address;
      const failed = failedJoins.get(address);
      if (failed && Date.now() - failed.since < 60000 && failed.count >= 20) return ack({ error: 'Demasiados intentos. Espera un minuto.' });
      const confId = String(request?.confId || '').toLowerCase().trim();
      const identity = security.identify(request || {}, confId);
      if (!identity) {
        const entry = failed && Date.now() - failed.since < 60000 ? failed : { since: Date.now(), count: 0 };
        entry.count++; failedJoins.set(address, entry);
        return ack({ error: 'Acceso denegado.' });
      }
      if (socket.data.roomId && socket.data.identity?.confId !== confId) return ack({ error: 'La conexión pertenece a otra sala.' });
      if (!socket.data.roomId) socket.data.identity = identity;
      socket.join(`conf:${confId}`);
      ack({ ok: true });
    });
    socket.on('unirse-comite', (request, ack = () => {}) => {
      const address = socket.handshake.address;
      const failed = failedJoins.get(address);
      if (failed && Date.now() - failed.since < 60000 && failed.count >= 20) return ack({ error: 'Demasiados intentos. Espera un minuto.' });
      try {
        const previousId = socket.data.roomId;
        const previousIdentity = socket.data.identity;
        if (!request || typeof request !== 'object') throw new Error('Actualiza la aplicación para conectar de forma segura.');
        const id = normalize(request.sala);
        if (!/^[A-Z0-9_-]{3,120}$/.test(id)) throw new Error('Código de sala inválido.');
        const com = security.committee(id);
        const confId = com?.conferencia_id;
        let room = rooms.get(id);
        const role = request.role;
        if (role === 'chair') {
          const identity = com && security.identify(request, confId, com.id);
          if (com && !['chair', 'secretariat'].includes(identity?.role) && (com.pin_mesa || !identity)) throw new Error('Verifica el PIN de mesa antes de emitir.');
          if (typeof request.ownerToken !== 'string' || request.ownerToken.length < 32) throw new Error('Credencial de sala inválida.');
          if (room && room.ownerToken !== request.ownerToken && room.hostId && io.sockets.sockets.has(room.hostId)) throw new Error('Otra mesa ya está emitiendo en esta sala.');
          if (room && !com && room.ownerToken !== request.ownerToken) throw new Error('Esta sala pertenece a otra mesa.');
          const passwords = { secretariat: request.secretPassword, backroom: request.backroomPassword, staff: request.staffPassword };
          if (Object.values(passwords).some(value => typeof value !== 'string' || value.length < 4 || value.length > 128)) throw new Error('Las contraseñas de rol deben tener entre 4 y 128 caracteres.');
          if (!room) {
            let state = {};
            try { state = JSON.parse(com?.datos_json || '{}'); } catch { /* Keep the corrupt database row intact for recovery. */ }
            room = { createdAt: Date.now(), state: publicState(state), notes: new Map((Array.isArray(state.notes) ? state.notes : []).map(note => [note.id, note])) };
            rooms.set(id, room);
          }
          room.ownerToken = request.ownerToken;
          room.hostId = socket.id;
          room.passwords = passwords;
          room.settings = request.roomSettings || {};
          socket.data.identity = { role: 'chair', confId, comiteId: com?.id };
        } else {
          if (!room?.hostId || !io.sockets.sockets.has(room.hostId)) throw Object.assign(new Error('La mesa no está emitiendo.'), { retryable: true });
          if (!['delegate', 'secretariat', 'backroom', 'staff'].includes(role)) throw new Error('Rol desconocido.');
          const elevated = com && security.identify(request, confId, com.id)?.role === 'secretariat';
          if (role !== 'delegate' && !elevated && (typeof request.password !== 'string' || request.password !== room.passwords[role])) throw new Error('Contraseña de rol incorrecta.');
          const country = role === 'delegate' ? chooseCountry(id, socket, request.country, room.state) : null;
          socket.data.identity = { role, country, confId, comiteId: com?.id };
        }
        if (previousId && previousId !== id) {
          socket.leave(previousId);
          const previousRoom = rooms.get(previousId);
          if (previousRoom) {
            notifyHost(previousRoom, { type: 'PEER_DISCONNECTED', _authenticated: true, payload: { socketId: socket.id } });
            if (previousRoom.hostId === socket.id) previousRoom.hostId = null;
          }
        }
        if (previousIdentity?.confId && previousIdentity.confId !== confId) socket.leave(`conf:${previousIdentity.confId}`);
        socket.data.roomId = id;
        socket.join(id);
        if (confId) socket.join(`conf:${confId}`);
        const token = security.sign(socket.data.identity);
        const restored = role === 'chair' && request.restoreState && com ? { ...JSON.parse(com.datos_json || '{}'), ...room.state, notes: [...room.notes.values()] } : undefined;
        ack({ ok: true, token, role, country: socket.data.identity.country, state: restored });
        if (role !== 'chair') notifyHost(room, { type: 'AUTH', senderSocketId: socket.id, _authenticated: true, payload: { role, country: socket.data.identity.country, clientId: socket.id } });
        if (role === 'chair') {
          for (const peer of peers(id)) if (peer.id !== socket.id) notifyHost(room, { type: 'AUTH', senderSocketId: peer.id, _authenticated: true, payload: { ...peer.data.identity, clientId: peer.id } });
        }
      } catch (error) {
        if (error.retryable) return ack({ error: error.message, retryable: true });
        const entry = failed && Date.now() - failed.since < 60000 ? failed : { since: Date.now(), count: 0 };
        entry.count++; failedJoins.set(address, entry);
        ack({ error: error.message });
      }
    });
    socket.on('enviar-datos', (packet, ack = () => {}) => {
      try {
        const id = normalize(packet?.sala);
        const room = rooms.get(id);
        const identity = socket.data.identity;
        if (!room || socket.data.roomId !== id || !socket.rooms.has(id) || !identity) throw new Error('No perteneces a esta sala.');
        const window = socket.data.messageWindow;
        if (Date.now() - window.since > 10000) { window.since = Date.now(); window.count = 0; }
        if (++window.count > 200) throw new Error('Demasiados mensajes.');
        const incoming = decode(packet.json);
        const isHost = socket.id === room.hostId && identity.role === 'chair';
        if (isHost ? !hostTypes.has(incoming.type) : !clientRoles[incoming.type]?.includes(identity.role)) throw new Error('Acción no autorizada.');
        const message = { type: incoming.type, payload: incoming.payload, id: incoming.id, senderSocketId: socket.id, senderMeta: { role: identity.role, country: identity.country } };
        if (!isHost) {
          if (message.type === 'SELECT_COUNTRY') {
            identity.country = chooseCountry(id, socket, message.payload?.country, room.state);
            message.payload = { country: identity.country, clientId: socket.id };
            message.senderMeta.country = identity.country;
          }
          if (message.type === 'RELEASE_COUNTRY') { identity.country = null; message.payload = { clientId: socket.id }; }
          if (message.type === 'CAST_VOTE' && (!identity.country || !room.settings.allowLiveVoting || !['favor', 'contra', 'abstencion', 'pasar'].includes(message.payload?.vote))) throw new Error('Voto no permitido.');
          if (message.type === 'REQUEST_SPEAKING') message.payload = { ...message.payload, details: { ...message.payload?.details, country: identity.country } };
          if (message.type === 'SUBMIT_AMENDMENT') message.payload = { ...message.payload, paisProponente: identity.country };
          if (message.type === 'SEND_NOTE') {
            const raw = message.payload;
            if (typeof raw?.id !== 'string' || typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 10000 || typeof raw.to !== 'string' || raw.to.length > 200) throw new Error('Nota inválida.');
            if (identity.role === 'delegate' && (!identity.country || (normalize(raw.to) === 'CHAIR' ? room.settings.allowChairNotes === false : !['BACKROOM', 'STAFF'].includes(normalize(raw.to)) && room.settings.allowDelegateNotes === false))) throw new Error('Las notas no están permitidas.');
            if (room.notes.has(raw.id)) return ack({ ok: true });
            const from = identity.role === 'delegate' ? identity.country : { staff: 'Staff', backroom: 'Backroom', secretariat: 'Secretaría' }[identity.role];
            room.notes.set(raw.id, { ...raw, fromRole: identity.role, from, status: identity.role === 'delegate' && room.settings.requireStaffNoteApproval ? 'pending' : 'delivered', senderSocketId: socket.id });
          }
          if (message.type === 'REVIEW_NOTE') {
            const note = room.notes.get(message.payload?.id);
            if (!note || note.status !== 'pending' || !['approved', 'rejected'].includes(message.payload?.status)) throw new Error('La nota ya fue revisada o no existe.');
            note.status = message.payload.status;
            note.reviewedBy = socket.id;
            note.reviewedAt = Date.now();
            message.payload = { id: note.id, status: note.status, reviewedBy: note.reviewedBy, reviewedAt: note.reviewedAt };
          }
          notifyHost(room, message);
        } else {
          if (message.type === 'ROOM_CREDENTIALS') {
            if (!['secretariat', 'backroom', 'staff'].every(role => typeof message.payload?.[role] === 'string' && message.payload[role].length >= 4 && message.payload[role].length <= 128)) throw new Error('Contraseñas de rol inválidas.');
            room.passwords = message.payload;
            return ack({ ok: true });
          }
          if (incoming.targetSocketId) {
            const target = io.sockets.sockets.get(incoming.targetSocketId);
            if (!target?.rooms.has(id)) throw new Error('Destinatario fuera de la sala.');
            message.targetSocketId = target.id;
            if (message.type === 'AUTH_RESULT') message.payload = { ...message.payload, role: target.data.identity.role, country: target.data.identity.country, notes: (message.payload.notes || []).filter(n => canReadNote(n, target.data.identity)), sessionState: publicState(message.payload.sessionState) };
            target.emit('nuevos-datos', message);
            if (message.type === 'KICK') { target.leave(id); target.data.roomId = null; }
          } else {
            if (message.type === 'SYNC_STATE') { message.payload = publicState(message.payload); room.state = message.payload; }
            if (message.type === 'DELTA_STATE') {
              room.state = publicState(applyDelta(room.state, message.payload));
              message.payload = Object.fromEntries(Object.entries(message.payload || {}).filter(([path]) => Object.hasOwn(publicState({ [path.split('.')[0]]: true }), path.split('.')[0])));
            }
            if (message.type === 'ROOM_SETTINGS_UPDATED') room.settings = message.payload;
            if (message.type === 'NOTE_RECEIVED') {
              const existing = room.notes.get(message.payload?.id);
              if (incoming.localReview === true && existing?.status === 'pending' && message.payload?.reviewedBy === 'local-staff' && ['approved', 'rejected'].includes(message.payload.status)) {
                existing.status = message.payload.status; existing.reviewedBy = 'local-staff'; existing.reviewedAt = Date.now();
              }
              if (message.payload?.fromRole === 'delegate' && !existing) throw new Error('Nota sin remitente autenticado.');
              message.payload = { ...message.payload, ...existing };
              room.notes.set(message.payload.id, message.payload);
              for (const peer of peers(id)) if (canReadNote(message.payload, peer.data.identity)) peer.emit('nuevos-datos', message);
            } else socket.to(id).emit('nuevos-datos', message);
          }
        }
        ack({ ok: true });
      } catch (error) { ack({ error: error.message }); }
    });
    socket.on('disconnecting', () => {
      const id = socket.data.roomId;
      const room = rooms.get(id);
      if (!room) return;
      notifyHost(room, { type: 'PEER_DISCONNECTED', payload: { socketId: socket.id }, _authenticated: true });
    });
  });
  return { rooms, close: () => clearInterval(cleanUp) };
}

module.exports = { attachRealtime, decode, applyDelta };
