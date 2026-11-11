import { io } from 'socket.io-client';
import { luaxAccess, LUAX_API_URL } from './luaxAccess.js';

async function acknowledged(socket, event, body) {
  const result = await socket.timeout(15000).emitWithAck(event, body);
  if (!result?.ok) throw new Error(result?.error || 'No se pudo confirmar la operación');
  return result;
}

export async function connectLuax(service, { password, ...options } = {}) {
  const cid = service.roomId.toLowerCase();
  let conferenceId = localStorage.getItem('openmun_current_conf_id');
  if (service.isHost) {
    if (!luaxAccess.hasChair(cid)) {
      if (conferenceId && luaxAccess.hasOrganization(conferenceId)) {
        await luaxAccess.enterChairWithoutPin(conferenceId, cid);
      } else if (!conferenceId) {
        const pin = crypto.randomUUID();
        conferenceId = 'room-' + crypto.randomUUID();
        await luaxAccess.registerConference({ id: conferenceId, nombre: cid, pin_admin: pin });
        await luaxAccess.createCommittee(conferenceId, { id: cid, nombre: cid, datos_json: service.latestSessionState || {} });
        await luaxAccess.enterChairWithoutPin(conferenceId, cid);
        localStorage.setItem('openmun_current_conf_id', conferenceId);
        localStorage.setItem('openmun_current_comite_id', cid);
      } else throw new Error('Vuelve a acceder con el PIN de Mesa antes de emitir');
    }
    await luaxAccess.configureParticipants(cid, conferenceId, {
      secretariat: options.secretPassword, staff: options.staffPassword, backroom: options.backroomPassword
    });
  } else {
    await luaxAccess.accessParticipant(cid, service.role, password, conferenceId);
  }
  const session = luaxAccess.socketSession(cid, conferenceId, service.role);
  if (!session) throw new Error('Sesión no disponible');
  service.luaxSession = session;
  localStorage.setItem('openmun_current_conf_id', session.conferenceId);
  localStorage.setItem('openmun_current_comite_id', cid);
  service.luaxRevision = 0;
  service.luaxJoined = false;
  const socket = io(LUAX_API_URL, { auth: { token: session.token }, transports: ['websocket', 'polling'], autoConnect: false });
  service.socket = socket;
  function receive(message) {
    if (message.type === 'PEER_LIST_UPDATED') {
      service.peerMetadata = new Map(message.payload.map(peer => [peer.peerId, peer]));
      service.emit('peer_list_updated', message.payload);
    }
    if (message.type === 'NOTE_RECEIVED') {
      service.latestNotes = [message.payload, ...service.latestNotes.filter(note => note.id !== message.payload.id)];
    }
    if (message.type === 'SELECT_COUNTRY_RESULT' && message.payload.success) {
      service.clientCountry = message.payload.country;
      service.latestNotes = message.payload.notes || [];
      service.emit('notes_replaced', service.latestNotes);
    }
    service.emit('message', message);
  }
  socket.on('luax-message', receive);
  socket.on('luax-command', message => {
    if (!service.isHost) return;
    service.peerMetadata.set(message.senderSocketId, message.senderMeta);
    service.handleIncomingMessage(message.senderSocketId, message, false);
  });
  socket.on('luax-state', data => {
    if (data.revision <= service.luaxRevision) return;
    service.luaxRevision = data.revision;
    service.latestSessionState = data.state;
    receive({ type: 'SYNC_STATE', payload: data.state });
  });
  for (const [event, name] of [['nuevo-aviso', 'openmun_nuevo_aviso'], ['aviso-desactivado', 'openmun_aviso_desactivado']]) {
    socket.on(event, detail => window.dispatchEvent(new CustomEvent(name, { detail })));
  }
  socket.on('disconnect', reason => {
    service.luaxJoined = false;
    service.emit(reason === 'io server disconnect' ? 'disconnected' : 'connection_lost', { reason });
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Tiempo de conexión agotado')); }, 15000);
    socket.on('connect_error', error => { clearTimeout(timer); service.emit('error', error.message); reject(error); });
    socket.on('connect', async () => {
      try {
        service.socketId = socket.id;
        const result = await acknowledged(socket, 'luax-join', { comiteId: cid });
        const pendingState = service.isHost ? service.luaxPendingState : null;
        service.luaxRevision = result.revision;
        service.luaxJoined = true;
        service.latestSessionState = pendingState || result.sessionState;
        service.latestNotes = result.notes;
        service.latestAnnouncements = result.announcements || [];
        service.latestSpeakingRequests = result.speakingRequests;
        service.roomSettings = { ...service.roomSettings, ...result.roomSettings };
        service.emit('notes_replaced', result.notes);
        service.emit('announcements_replaced', service.latestAnnouncements);
        if (service.isHost) {
          receive({ type: 'SYNC_STATE', payload: service.latestSessionState });
          service.emit('host_ready', { roomId: service.roomId, roomSettings: service.roomSettings });
          if (pendingState) void sendLuax(service, { type: 'SYNC_STATE' });
        } else service.emit('connected', result);
        clearTimeout(timer);
        resolve(service.isHost ? service.roomId : result);
      } catch (error) {
        clearTimeout(timer);
        socket.disconnect();
        service.emit('error', error.message);
        reject(error);
      }
    });
    socket.connect();
  });
}

export async function sendLuax(service, message) {
  const socket = service.socket;
  const isSnapshot = message.type === 'SYNC_STATE' || message.type === 'DELTA_STATE';
  if (isSnapshot) service.luaxPendingState = service.latestSessionState;
  if (!socket?.connected || !service.luaxJoined) return false;
  try {
    if (message.type === 'PEER_LIST_UPDATED' || message.type === 'AUTH_RESULT' || message.type === 'NOTE_RECEIVED') return false;
    if (isSnapshot) {
      if (service.luaxSaving) return true;
      service.luaxSaving = true;
      try {
        while (service.luaxPendingState && socket === service.socket && service.luaxJoined) {
          const state = service.luaxPendingState;
          service.luaxPendingState = null;
          const revision = service.luaxRevision + 1;
          try {
            const saved = await acknowledged(socket, 'luax-snapshot', { revision, state });
            if (saved.persisted !== revision) throw new Error('El servidor no confirmó la revisión del estado');
          } catch (error) {
            if (!service.luaxPendingState) service.luaxPendingState = state;
            throw error;
          }
          service.luaxRevision = revision;
          service.emit('state_persisted', { revision });
        }
      } finally { service.luaxSaving = false; }
      return true;
    }
    if (message.type === 'KICK') message = { type: 'KICK_PEER', payload: { peerId: message.targetSocketId } };
    if (message.type === 'REVIEW_NOTE') {
      const note = service.latestNotes.find(note => note.id === message.payload.id);
      message = { ...message, payload: { mensajeId: note?.serverId, status: message.payload.status } };
    }
    await acknowledged(socket, 'luax-command', message);
    return true;
  } catch (error) {
    if (message.type === 'SELECT_COUNTRY') service.emit('message', { type: 'SELECT_COUNTRY_RESULT', payload: { success: false, message: error.message } });
    service.emit('error', error.message);
    return false;
  }
}
