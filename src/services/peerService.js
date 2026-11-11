import i18n from '../languages/index.js';
import { io } from 'socket.io-client';
import { compressData, decompressData } from '../utils/compression.js';
import { LUAX_API_URL } from './luaxAccess.js';
import { connectLuax, sendLuax } from './luaxRealtime.js';

const noteRoles = Object.assign(Object.create(null), {
  CHAIR: 'chair',
  MESA: 'chair',
  'MESA DE PRESIDENCIA': 'chair',
  STAFF: 'staff',
  BACKROOM: 'backroom',
  SECRETARIA: 'secretariat'
});

export function canReceiveNote(note, role, country, clientId) {
  if (!note?.text) return false;
  const senderRole = note.fromRole || noteRoles[note.from?.trim().toUpperCase()] || 'delegate';
  const countryName = country?.trim().toUpperCase();
  const isSender = senderRole === role && (
    role === 'delegate' ? countryName && note.from?.trim().toUpperCase() === countryName :
      role === 'chair' || (clientId && clientId === note.senderClientId)
  );
  if (isSender) return true;
  if (role === 'staff' && senderRole === 'delegate') return true;
  if (['pending', 'rejected'].includes(note.status)) return false;

  const target = note.to?.trim().toUpperCase();
  if (target === 'TODOS' || target === 'ALL') return true;
  const targetRole = noteRoles[target];
  if (targetRole) return role === targetRole || (targetRole === 'chair' && role === 'secretariat');
  return role === 'delegate' && Boolean(countryName) && target === countryName;
}

function canReceiveAnnouncement(announcement, role, country) {
  const target = String(announcement.target || 'ALL').trim().toUpperCase();
  if (target === 'ALL' || target === 'TODOS') return true;
  if (noteRoles[target]) return noteRoles[target] === role;
  return role === 'delegate' && target === country?.trim().toUpperCase();
}

export const LOCAL_BROADCAST_CHANNEL_NAME = 'openmun_local_secret_channel';
export const SOCKET_SERVER_URL = import.meta.env?.VITE_LUAX_API_URL?.trim().replace(/\/$/, '')
  || import.meta.env?.VITE_SOCKET_SERVER_URL
  || 'https://api.openmun.app';

/**
 * Sanitiza y optimiza el estado antes de enviarlo por la red:
 * 1. Mantiene propiedades esenciales incluyendo 'bandera' (códigos ISO ligeros o Base64).
 * 2. Omite registros históricos pesados innecesarios para clientes ('registroIntervenciones', 'historicoMociones').
 */
export function sanitizeStateForBroadcast(state) {
  if (!state || typeof state !== 'object') return state;

  const sanitized = { ...state };

  // 1. Sanitizar lista de países manteniendo bandera
  if (Array.isArray(sanitized.paises)) {
    sanitized.paises = sanitized.paises.map(p => {
      if (!p) return p;
      if (typeof p === 'string') return { nombre: p };
      return {
        id: p.id,
        nombre: p.nombre,
        bandera: p.bandera || p.flag,
        estatus: p.estatus,
        veto: p.veto || p.tieneVeto
      };
    });
  }

  // 2. Sanitizar oradores en cola
  if (Array.isArray(sanitized.oradoresCola)) {
    sanitized.oradoresCola = sanitized.oradoresCola.map(o => {
      if (!o) return o;
      if (typeof o === 'string') return { id: o, nombre: o };
      return {
        id: o.id,
        nombre: o.nombre,
        bandera: o.bandera || o.flag
      };
    });
  }

  // 3. Sanitizar oradores caucus
  if (Array.isArray(sanitized.oradoresCaucus)) {
    sanitized.oradoresCaucus = sanitized.oradoresCaucus.map(o => {
      if (!o) return o;
      if (typeof o === 'string') return { id: o, nombre: o };
      return {
        id: o.id,
        nombre: o.nombre,
        bandera: o.bandera || o.flag
      };
    });
  }

  // 4. Sanitizar solicitudes de palabra preservando speechType y details
  if (Array.isArray(sanitized.speakingRequests)) {
    sanitized.speakingRequests = sanitized.speakingRequests.map(r => {
      if (!r) return r;
      return {
        id: r.id,
        country: r.country,
        bandera: r.bandera || r.flag,
        timestamp: r.timestamp,
        speechType: r.speechType || r.type,
        type: r.type || r.speechType,
        details: r.details,
        peerId: r.peerId
      };
    });
  }

  // 5. Omitir logs históricos gigantes innecesarios para clientes
  delete sanitized.registroIntervenciones;
  delete sanitized.historicoMociones;
  delete sanitized.announcements;
  delete sanitized.notes;
  delete sanitized.openmun_notes;
  if (sanitized.snapshot && typeof sanitized.snapshot === 'object') {
    sanitized.snapshot = { ...sanitized.snapshot };
    delete sanitized.snapshot.announcements;
    delete sanitized.snapshot.openmun_announcements;
    delete sanitized.snapshot.notes;
    delete sanitized.snapshot.openmun_notes;
  }

  return sanitized;
}

/**
 * Ajustes de Sala y Permisos por defecto
 */
export const DEFAULT_ROOM_SETTINGS = {
  privacyMode: 'normal',          // 'normal' | 'hidden'
  speakerRequestMode: 'approval', // 'direct' | 'approval' | 'disabled'
  caucusRequestMode: 'approval',  // 'direct' | 'approval' | 'disabled'
  allowDelegateNotes: true,
  requireStaffNoteApproval: false,
  allowChairNotes: true,
  allowMotions: true,
  allowLiveVoting: true
};

/**
 * Tipos de mensajes normalizados
 */
export const MSG_TYPES = {
  AUTH: 'AUTH',
  AUTH_RESULT: 'AUTH_RESULT',
  SELECT_COUNTRY: 'SELECT_COUNTRY',
  SELECT_COUNTRY_RESULT: 'SELECT_COUNTRY_RESULT',
  SYNC_STATE: 'SYNC_STATE',
  DELTA_STATE: 'DELTA_STATE',
  SESSION_ACTION: 'SESSION_ACTION',
  UPDATE_ROOM_SETTINGS: 'UPDATE_ROOM_SETTINGS',
  ROOM_SETTINGS_UPDATED: 'ROOM_SETTINGS_UPDATED',
  REQUEST_SPEAKING: 'REQUEST_SPEAKING',
  SPEAKING_PROCESSED: 'SPEAKING_PROCESSED',
  PROCESS_SPEAKING_REQUEST: 'PROCESS_SPEAKING_REQUEST',
  SPEAKING_REQUESTS_UPDATED: 'SPEAKING_REQUESTS_UPDATED',
  SEND_NOTE: 'SEND_NOTE',
  NOTE_RECEIVED: 'NOTE_RECEIVED',
  REVIEW_NOTE: 'REVIEW_NOTE',
  CRISIS_ALERT: 'CRISIS_ALERT',
  BROADCAST_ANNOUNCEMENT: 'BROADCAST_ANNOUNCEMENT',
  DELETE_ANNOUNCEMENT: 'DELETE_ANNOUNCEMENT',
  CAST_VOTE: 'CAST_VOTE',
  SUBMIT_AMENDMENT: 'SUBMIT_AMENDMENT',
  AMENDMENTS_PROPOSALS_UPDATED: 'AMENDMENTS_PROPOSALS_UPDATED',
  REQUEST_FULL_SYNC: 'REQUEST_FULL_SYNC',
  KICK: 'KICK',
  KICK_PEER: 'KICK_PEER',
  PEER_LIST_UPDATED: 'PEER_LIST_UPDATED',
  RELEASE_COUNTRY: 'RELEASE_COUNTRY',
  PEER_DISCONNECTED: 'PEER_DISCONNECTED',
  PING: 'PING',
  PONG: 'PONG'
};

/**
 * Genera o recupera un identificador de sesión persistente para el cliente
 */
export function getOrCreateClientId() {
  if (typeof window === 'undefined') return 'server_client';
  try {
    let id = localStorage.getItem('openmun_client_uuid');
    if (!id) {
      id = `client_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
      localStorage.setItem('openmun_client_uuid', id);
    }
    return id;
  } catch (e) {
    return `client_${Date.now().toString(36)}`;
  }
}

/**
 * Generador de ID de sala amigable (ej: MUN-4921)
 */
export function generateRoomCode() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MUN-${randomNum}`;
}

class NetworkService {
  constructor() {
    this.clientId = getOrCreateClientId();
    this.socket = null;
    this.socketId = null;
    this.peerMetadata = new Map(); // socketId -> { role, country, connectedAt, clientId }
    this.broadcastChannel = null;
    this.isHost = false;
    this.role = 'none';
    this.clientCountry = null;
    this.listeners = new Set();
    this.roomId = null;
    this.secretPassword = 'secreto123';
    this.backroomPassword = 'crisis123';
    this.staffPassword = 'staff123';
    this.roomSettings = { ...DEFAULT_ROOM_SETTINGS };
    this.latestSpeakingRequests = [];
    this.latestEnmiendasPropuestas = [];
    this.latestSessionState = null;
    this.latestNotes = [];
    this.latestAnnouncements = [];
    this.broadcastDebounceTimer = null;
    this.pendingStateToBroadcast = null;
    try {
      if (typeof window !== 'undefined') {
        const savedNotes = localStorage.getItem('openmun_notes');
        if (savedNotes) this.latestNotes = JSON.parse(savedNotes);
        const savedAnn = localStorage.getItem('openmun_announcements');
        if (savedAnn) this.latestAnnouncements = JSON.parse(savedAnn);
        const savedEnm = localStorage.getItem('openmun_enmiendas_propuestas');
        if (savedEnm) this.latestEnmiendasPropuestas = JSON.parse(savedEnm);
      }
    } catch (e) {}
  }

  getNotesForRole(role, country, clientId) {
    return this.latestNotes.filter(note => canReceiveNote(note, role, country, clientId));
  }

  // Suscripción a eventos de red
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (err) {
        console.error('Error en listener de NetworkService:', err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DEL HOST (CHAIR)
  // ─────────────────────────────────────────────────────────────
  async initHost(roomId, options = {}) {
    const committeeId = LUAX_API_URL && localStorage.getItem('openmun_current_comite_id');
    const cleanRoomId = (committeeId || roomId || generateRoomCode()).trim().toUpperCase();
    this.destroy();
    this.isHost = true;
    this.role = 'chair';
    this.roomId = cleanRoomId;
    this.secretPassword = options.secretPassword || 'secreto123';
    this.backroomPassword = options.backroomPassword || 'crisis123';
    this.staffPassword = options.staffPassword || 'staff123';
    if (options.roomSettings) {
      this.roomSettings = { ...DEFAULT_ROOM_SETTINGS, ...options.roomSettings };
    }

    // REGLA DE ORO: Inicializar BroadcastChannel para la sesión secreta local (mismo navegador / segundo monitor)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME + '-' + cleanRoomId);
        this.broadcastChannel.onmessage = async (event) => {
          const decompressed = await decompressData(event.data);
          this.handleIncomingMessage('local_broadcast_secretariat', decompressed, true);
        };
      } catch (err) {
        console.warn('BroadcastChannel no soportado o bloqueado:', err);
      }
    }

    if (!this.latestSessionState && typeof window !== 'undefined') {
      try {
        const rawPaises = localStorage.getItem('openmun_paises');
        if (rawPaises) {
          const paises = JSON.parse(rawPaises);
          const nombreComite = localStorage.getItem('openmun_comite') || '';
          this.latestSessionState = {
            comision: nombreComite || 'Comité',
            nombreComite,
            paises: Array.isArray(paises) ? paises : [],
            oradoresCola: JSON.parse(localStorage.getItem('openmun_oradores') || '[]'),
            oradoresCaucus: JSON.parse(localStorage.getItem('openmun_oradores_caucus') || '[]'),
            mociones: JSON.parse(localStorage.getItem('openmun_mociones') || '[]'),
            caucusActivo: JSON.parse(localStorage.getItem('openmun_caucus') || 'null'),
            agendaSesion: JSON.parse(localStorage.getItem('openmun_agenda') || 'null'),
            votacionSesion: JSON.parse(localStorage.getItem('openmun_votacion') || 'null'),
            enmiendasSesion: JSON.parse(localStorage.getItem('openmun_enmiendas') || 'null'),
            roomSettings: this.roomSettings
          };
        }
      } catch (e) {}
    }

    if (LUAX_API_URL) return connectLuax(this, options);
    return new Promise((resolve, reject) => {
      const registrationTimeout = setTimeout(() => {
        this.destroy();
        reject(new Error(i18n.t('ui.theChairReceivedNoConfirmationUpdateTheServerAsWell')));
      }, 15000);
      try {
        this.socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 30,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });

        this.socket.on('connect', () => {
          this.socketId = this.socket.id;
          const conferenceId = typeof window !== 'undefined' && localStorage.getItem('openmun_current_conf_id');
          if (conferenceId) this.socket.emit('unirse-conferencia', conferenceId);
          // Unirse a la sala del comité en el servidor central
          this.socket.emit('unirse-comite', { sala: this.roomId, isHost: true }, (result) => {
            clearTimeout(registrationTimeout);
            if (!result?.ok) {
              const error = new Error(result?.error || i18n.t('ui.couldNotRegisterTheChair'));
              this.emit('error', { error: error.message });
              this.destroy();
              reject(error);
              return;
            }
            this.emit('host_ready', { roomId: this.roomId, roomSettings: this.roomSettings });
            resolve(this.roomId);
          });
        });

        // Escuchar datos entrantes desde el servidor central Socket.io
        this.socket.on('nuevos-datos', async (raw) => {
          if (!raw) return;
          const data = await decompressData(raw);
          if (!data) return;
          // Ignorar ecos emitidos por el propio socket si el servidor reenvía a toda la sala
          if (data.senderSocketId && data.senderSocketId === this.socketId) return;

          // Si el mensaje es una acción dirigida al Host, procesarla
          this.handleIncomingMessage(data.senderSocketId || data.senderId || 'remote', data, false);
        });

        // Cargar estado inicial persistido en SQLite al reconectar o unirse
        this.socket.on('cargar-estado-inicial', async (initialState) => {
          if (initialState) {
            this.emit('initial_state_loaded', initialState);
          }
        });

        this.socket.on('avisos-actualizados', detail => {
          if (typeof window !== 'undefined' && detail?.conferencia_id) {
            window.dispatchEvent(new CustomEvent('openmun_avisos_actualizados', { detail }));
          }
        });

        this.socket.on('aviso-desactivado', (data) => {
          if (!data) return;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_aviso_desactivado', { detail: data }));
          }
        });

        // Cierre forzado por caducidad (12h en servidor)
        this.socket.on('cierre-forzado', (motivo) => {
          console.warn('Cierre forzado de sala desde el servidor:', motivo);
          this.emit('error', { error: motivo || 'La sala ha sido cerrada automáticamente por caducidad.' });
        });

        this.socket.on('connect_error', (err) => {
          console.warn('Error de conexión Socket.io en Host (reintentando en segundo plano):', err.message);
          if (typeof window !== 'undefined' && (!navigator.onLine || this.consecutiveErrors > 2)) {
            window.dispatchEvent(new CustomEvent('openmun_network_failure'));
          }
          this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
          this.emit('connection_lost', { error: err.message });
        });

        this.socket.on('reconnect', (attemptNumber) => {
          this.consecutiveErrors = 0;
          console.log(`Reconectado exitosamente al servidor (intento ${attemptNumber})`);
          this.socketId = this.socket.id;
          const conferenceId = typeof window !== 'undefined' && localStorage.getItem('openmun_current_conf_id');
          if (conferenceId) this.socket.emit('unirse-conferencia', conferenceId);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_restored'));
            window.dispatchEvent(new Event('online'));
          }
          if (this.roomId) {
            this.socket.emit('unirse-comite', { sala: this.roomId, isHost: true });
            // Re-enviar el estado actual para resincronizar a los participantes
            if (this.latestSessionState) {
              this.broadcastStateToClients(this.latestSessionState);
            }
          }
          this.emit('host_ready', { roomId: this.roomId, roomSettings: this.roomSettings });
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('Host desconectado del servidor Socket.io:', reason);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_failure'));
          }
          this.emit('connection_lost', { reason });
          if (reason === 'io server disconnect') {
            this.socket.connect();
          }
        });

      } catch (err) {
        console.error('Error al inicializar Socket.io Host:', err);
        clearTimeout(registrationTimeout);
        reject(err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DEL CLIENTE (DELEGADO / SECRETO / BACKROOM)
  // ─────────────────────────────────────────────────────────────
  async initClient({ roomId, role, password, country, isLocalBroadcast = false }) {
    const localCommittee = LUAX_API_URL && isLocalBroadcast && localStorage.getItem('openmun_current_comite_id');
    const cleanRoomId = (localCommittee || roomId || '').trim().toUpperCase();
    this.destroy();
    this.isHost = false;
    this.role = role;
    this.clientCountry = role === 'delegate' ? (country || null) : null;
    this.roomId = cleanRoomId;

    if (LUAX_API_URL && isLocalBroadcast) {
      const credentialKey = role === 'secretariat' ? 'openmun_secret_pass' : role === 'staff' ? 'openmun_staff_pass' : null;
      return connectLuax(this, { password: credentialKey ? localStorage.getItem(credentialKey) : password });
    }

    // REGLA DE ORO: Modo Secreto Local mediante BroadcastChannel (sin internet)
    if (isLocalBroadcast) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME + '-' + cleanRoomId);
        this.broadcastChannel.onmessage = async (event) => {
          const decompressed = await decompressData(event.data);
          if (decompressed?.type === MSG_TYPES.BROADCAST_ANNOUNCEMENT &&
              !canReceiveAnnouncement(decompressed.payload, this.role, this.clientCountry)) return;
          if (decompressed?.type === MSG_TYPES.NOTE_RECEIVED &&
              !canReceiveNote(decompressed.payload, this.role, this.clientCountry, this.clientId)) return;
          if (decompressed?.type === MSG_TYPES.AUTH_RESULT &&
              (decompressed.targetClientId !== this.clientId || decompressed.payload?.role !== this.role)) return;
          this.emit('message', decompressed);
        };
        // Notificar al Chair que se ha unido una pantalla secreta local
        this.broadcastLocal({
          type: MSG_TYPES.AUTH,
          payload: {
            role: role || 'secretariat',
            country: country || (role === 'staff' ? 'Staff Local' : 'Secretaría Local'),
            isLocal: true,
            clientId: this.clientId
          },
          id: `auth-${Date.now()}`
        });
        this.emit('connected', {
          role: role || 'secretariat',
          country: country || (role === 'staff' ? 'Staff Local' : 'Secretaría Local'),
          isLocal: true,
          roomSettings: this.roomSettings,
          speakingRequests: this.latestSpeakingRequests || [],
          enmiendasPropuestas: this.latestEnmiendasPropuestas || []
        });
        return true;
      }
      throw new Error(i18n.t('ui.broadcastchannelIsNotSupportedByThisBrowser'));
    }

    // Cliente Socket.io remoto
    if (LUAX_API_URL) return connectLuax(this, { password });
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const connectTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(i18n.t('ui.connectionToCommitteeTimedOutCheckYourConnectionOr', { v0: cleanRoomId })));
        }
      }, 15000);

      try {
        this.socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 30,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });

        this.socket.on('connect', () => {
          this.socketId = this.socket.id;
          const conferenceId = typeof window !== 'undefined' && localStorage.getItem('openmun_current_conf_id');
          if (conferenceId) this.socket.emit('unirse-conferencia', conferenceId);
          // Unirse a la sala del comité
          this.socket.emit('unirse-comite', cleanRoomId);

          // Enviar solicitud de autenticación / registro de rol
          this.emitSocketMessage({
            type: MSG_TYPES.AUTH,
            payload: { role, password, country: this.clientCountry, clientId: this.clientId },
            senderSocketId: this.socket.id,
            id: `auth-${Date.now()}`
          });
        });

        // Escuchar datos del servidor
        this.socket.on('nuevos-datos', async (raw) => {
          if (!raw) return;
          const data = await decompressData(raw);
          if (!data || !data.type) return;

          // Ignorar ecos propios
          if (data.senderSocketId && data.senderSocketId === this.socketId) return;

          // Mensajes dirigidos a un socket específico
          if (data.targetSocketId && data.targetSocketId !== this.socketId) return;

          // Manejo de respuesta de Autenticación
          if (data.type === MSG_TYPES.AUTH_RESULT) {
            if (!isResolved || data.payload?.success) {
              if (data.payload?.success) {
                isResolved = true;
                clearTimeout(connectTimeout);
                if (data.payload.roomSettings) {
                  this.roomSettings = data.payload.roomSettings;
                }
                if (data.payload.speakingRequests) {
                  this.latestSpeakingRequests = data.payload.speakingRequests;
                }
                if (data.payload.notes) {
                  this.latestNotes = data.payload.notes;
                }
                this.emit('connected', {
                  role: data.payload.role,
                  country: data.payload.country,
                  sessionState: data.payload.sessionState,
                  roomSettings: data.payload.roomSettings,
                  speakingRequests: data.payload.speakingRequests || [],
                  enmiendasPropuestas: data.payload.enmiendasPropuestas || [],
                  connectedPeers: data.payload.connectedPeers || [],
                  announcements: data.payload.announcements || [],
                  notes: data.payload.notes || [],
                  message: data.payload.message || null
                });
                this.emit('message', data);
                resolve(data.payload);
              } else {
                isResolved = true;
                clearTimeout(connectTimeout);
                this.destroy();
                reject(new Error(data.payload?.message || i18n.t('ui.roomAccessDenied')));
              }
            }
            return;
          }

          // Si es expulsión
          if (data.type === MSG_TYPES.KICK) {
            this.emit('message', data);
            return;
          }

          // Mantener sincronizado el array latestNotes del cliente si llega una nota
          if (data.type === MSG_TYPES.NOTE_RECEIVED && data.payload) {
            if (!this.latestNotes) this.latestNotes = [];
            this.latestNotes = [data.payload, ...this.latestNotes.filter(n => n.id !== data.payload.id)];
          }

          // Distribución general de mensajes
          this.emit('message', data);
        });

        // Cargar estado inicial desde SQLite si el host no está transmitiendo activamente
        this.socket.on('cargar-estado-inicial', async (initialState) => {
          if (initialState) {
            this.emit('message', {
              type: MSG_TYPES.SYNC_STATE,
              payload: { sessionState: initialState }
            });
          }
        });

        this.socket.on('avisos-actualizados', detail => {
          if (typeof window !== 'undefined' && detail?.conferencia_id) {
            window.dispatchEvent(new CustomEvent('openmun_avisos_actualizados', { detail }));
          }
        });

        this.socket.on('aviso-desactivado', (data) => {
          if (!data) return;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_aviso_desactivado', { detail: data }));
          }
        });

        // Notificación de caducidad o cierre de sala
        this.socket.on('cierre-forzado', (motivo) => {
          console.warn('Cierre forzado de la sala desde el servidor:', motivo);
          this.emit('error', { error: motivo || 'La sala ha sido cerrada por el servidor.' });
        });

        this.socket.on('connect_error', (err) => {
          if (!isResolved) {
            console.warn('Error de conexión en cliente Socket.io:', err.message);
          } else {
            console.warn('Error de conexión en cliente Socket.io (reintentando en segundo plano):', err.message);
            if (typeof window !== 'undefined' && (!navigator.onLine || this.consecutiveClientErrors > 2)) {
              window.dispatchEvent(new CustomEvent('openmun_network_failure'));
            }
            this.consecutiveClientErrors = (this.consecutiveClientErrors || 0) + 1;
            this.emit('connection_lost', { error: err.message });
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          this.consecutiveClientErrors = 0;
          console.log(`Cliente reconectado a sala ${cleanRoomId} (intento ${attemptNumber})`);
          this.socketId = this.socket.id;
          const conferenceId = typeof window !== 'undefined' && localStorage.getItem('openmun_current_conf_id');
          if (conferenceId) this.socket.emit('unirse-conferencia', conferenceId);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_restored'));
            window.dispatchEvent(new Event('online'));
          }
          if (cleanRoomId) {
            this.socket.emit('unirse-comite', cleanRoomId);
            // Re-autenticar silenciosamente
            this.emitSocketMessage({
              type: MSG_TYPES.AUTH,
              payload: { role: this.role, password, country: this.clientCountry },
              senderSocketId: this.socket.id,
              id: `auth-reconnect-${Date.now()}`
            });
          }
          this.emit('connected', {
            role: this.role,
            country: this.clientCountry,
            roomSettings: this.roomSettings
          });
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('Cliente desconectado de la sala:', reason);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_failure'));
          }
          this.emit('connection_lost', { reason });
          if (reason === 'io server disconnect') {
            this.socket.connect();
          }
        });

      } catch (err) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(connectTimeout);
          reject(err);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ENRUTAMIENTO Y PROCESAMIENTO DE MENSAJES EN EL HOST (CHAIR)
  // ─────────────────────────────────────────────────────────────
  handleIncomingMessage(senderId, message, isLocal = false) {
    if (!message || !message.type) return;

    const senderSocketId = message.senderSocketId || senderId;

    // 1. Mensaje de Autenticación
    if (message.type === MSG_TYPES.AUTH) {
      const { role, password, country, clientId } = message.payload || {};
      let authorized = false;
      let errorMsg = '';
      let assignedCountry = null;
      let conflictNotice = null;

      if (isLocal) {
        authorized = true;
        assignedCountry = country || null;
      } else if (role === 'delegate') {
        if (country && country.trim()) {
          const cleanCountry = country.trim();
          // Validar si el país ya está ocupado por OTRO participante
          const existingPeerEntry = Array.from(this.peerMetadata.entries()).find(
            ([id, m]) => m.role === 'delegate' && m.country && m.country.toLowerCase() === cleanCountry.toLowerCase()
          );

          if (existingPeerEntry) {
            const [existingSocketId, existingMeta] = existingPeerEntry;
            // Si es el mismo cliente (mismo clientId o mismo socketId), permitir reconexión sin error
            const esMismoCliente = Boolean(
              existingSocketId === senderSocketId ||
              (clientId && existingMeta.clientId === clientId)
            );

            if (esMismoCliente) {
              authorized = true;
              assignedCountry = cleanCountry;
              if (existingSocketId !== senderSocketId) {
                this.peerMetadata.delete(existingSocketId);
              }
            } else {
              // En vez de rechazar al delegado, se le permite entrar a la sala para seleccionar otra delegación
              authorized = true;
              assignedCountry = null;
              conflictNotice = i18n.t('ui.theDelegationOfIsAlreadyOccupiedByAnotherDelegate', { v0: cleanCountry });
            }
          } else {
            authorized = true;
            assignedCountry = cleanCountry;
          }
        } else {
          // El delegado entra a la sala para elegir país desde la lista oficial
          authorized = true;
          assignedCountry = null;
        }
      } else if (role === 'secretariat') {
        if (password === this.secretPassword) {
          authorized = true;
        } else {
          errorMsg = 'Contraseña de Secretaría incorrecta';
        }
      } else if (role === 'backroom') {
        if (password === this.backroomPassword) {
          authorized = true;
        } else {
          errorMsg = 'Contraseña de Backroom incorrecta';
        }
      } else if (role === 'staff') {
        if (password === this.staffPassword) {
          authorized = true;
        } else {
          errorMsg = 'Contraseña de Staff incorrecta';
        }
      } else {
        errorMsg = 'Rol desconocido';
      }

      if (!isLocal) {
        if (authorized) {
          const meta = {
            role,
            country: assignedCountry,
            connectedAt: Date.now(),
            socketId: senderSocketId,
            clientId: clientId || null
          };
          this.peerMetadata.set(senderSocketId, meta);

          const roleNotes = this.getNotesForRole(role, meta.country, meta.clientId || meta.socketId);

          const currentPeerList = Array.from(this.peerMetadata.entries()).map(([id, pmeta]) => ({
            peerId: id,
            ...pmeta
          }));

          if (!this.latestSessionState && typeof window !== 'undefined') {
            try {
              const rawPaises = localStorage.getItem('openmun_paises');
              if (rawPaises) {
                const paises = JSON.parse(rawPaises);
                const nombreComite = localStorage.getItem('openmun_comite') || '';
                this.latestSessionState = {
                  comision: nombreComite || 'Comité',
                  nombreComite,
                  paises: Array.isArray(paises) ? paises : [],
                  oradoresCola: JSON.parse(localStorage.getItem('openmun_oradores') || '[]'),
                  oradoresCaucus: JSON.parse(localStorage.getItem('openmun_oradores_caucus') || '[]'),
                  mociones: JSON.parse(localStorage.getItem('openmun_mociones') || '[]'),
                  caucusActivo: JSON.parse(localStorage.getItem('openmun_caucus') || 'null'),
                  agendaSesion: JSON.parse(localStorage.getItem('openmun_agenda') || 'null'),
                  votacionSesion: JSON.parse(localStorage.getItem('openmun_votacion') || 'null'),
                  enmiendasSesion: JSON.parse(localStorage.getItem('openmun_enmiendas') || 'null'),
                  roomSettings: this.roomSettings
                };
              }
            } catch (e) {}
          }

          // Enviar respuesta de autenticación dirigida al socket solicitante
          this.emitSocketMessage({
            type: MSG_TYPES.AUTH_RESULT,
            targetSocketId: senderSocketId,
            payload: {
              success: true,
              role,
              country: meta.country,
              roomSettings: this.roomSettings,
              speakingRequests: this.latestSpeakingRequests || [],
              enmiendasPropuestas: this.latestEnmiendasPropuestas || [],
              sessionState: sanitizeStateForBroadcast(this.latestSessionState) || null,
              notes: roleNotes,
              announcements: this.latestAnnouncements.filter(ann => canReceiveAnnouncement(ann, role, meta.country)),
              connectedPeers: currentPeerList,
              message: conflictNotice || null
            }
          });

          this.emit('peer_authenticated', { peerId: senderSocketId, meta });
          this.broadcastPeerList();
        } else {
          this.emitSocketMessage({
            type: MSG_TYPES.AUTH_RESULT,
            targetSocketId: senderSocketId,
            payload: { success: false, message: errorMsg }
          });
        }
      } else if (isLocal && authorized) {
        const localRole = role || 'secretariat';
        const localCountry = country || (localRole === 'staff' ? 'Staff Local' : 'Secretaría Local');
        const localId = `local-${localRole}-${Date.now().toString(36)}`;
        this.peerMetadata.set(localId, {
          role: localRole,
          country: localCountry,
          connectedAt: Date.now(),
          isLocal: true,
          socketId: localId
        });

        const currentPeerList = Array.from(this.peerMetadata.entries()).map(([id, pmeta]) => ({
          peerId: id,
          ...pmeta
        }));

        this.broadcastLocal({
          type: MSG_TYPES.AUTH_RESULT,
          targetClientId: clientId,
          payload: {
            success: true,
            role: localRole,
            country: localCountry,
            roomSettings: this.roomSettings,
            speakingRequests: this.latestSpeakingRequests || [],
            enmiendasPropuestas: this.latestEnmiendasPropuestas || [],
            sessionState: sanitizeStateForBroadcast(this.latestSessionState) || null,
            notes: this.getNotesForRole(localRole, localCountry, clientId),
            announcements: this.latestAnnouncements.filter(ann => canReceiveAnnouncement(ann, localRole, localCountry)),
            connectedPeers: currentPeerList
          }
        });
        this.broadcastPeerList();
      }
      return;
    }

    // 1.1 Selección / Toma de País por parte del Delegado
    if (message.type === MSG_TYPES.SELECT_COUNTRY) {
      const selectedCountry = (message.payload?.country || '').trim();
      const clientId = message.payload?.clientId;
      if (!selectedCountry) {
        this.emitSocketMessage({
          type: MSG_TYPES.SELECT_COUNTRY_RESULT,
          targetSocketId: senderSocketId,
          payload: { success: false, message: i18n.t('ui.pleaseSelectAValidCountry') }
        });
        return;
      }

      // Validar si otro participante ya tiene asignado este país
      const existingPeerEntry = Array.from(this.peerMetadata.entries()).find(
        ([id, m]) => m.role === 'delegate' && m.country && m.country.toLowerCase() === selectedCountry.toLowerCase()
      );

      if (existingPeerEntry) {
        const [existingSocketId, existingMeta] = existingPeerEntry;
        const esMismoCliente = Boolean(
          existingSocketId === senderSocketId ||
          (clientId && existingMeta.clientId === clientId)
        );

        if (!esMismoCliente) {
          this.emitSocketMessage({
            type: MSG_TYPES.SELECT_COUNTRY_RESULT,
            targetSocketId: senderSocketId,
            payload: { success: false, message: i18n.t('ui.theDelegationOfHasAlreadyBeenSelectedByAnother', { v0: selectedCountry }) }
          });
          return;
        }
        if (existingSocketId !== senderSocketId) {
          this.peerMetadata.delete(existingSocketId);
        }
      }

      // Asignar el país al participante
      const currentMeta = this.peerMetadata.get(senderSocketId) || {
        role: 'delegate',
        connectedAt: Date.now(),
        socketId: senderSocketId
      };
      const updatedMeta = { ...currentMeta, country: selectedCountry, clientId: clientId || currentMeta.clientId || null };
      this.peerMetadata.set(senderSocketId, updatedMeta);

      const roleNotes = this.getNotesForRole('delegate', selectedCountry);

      this.emitSocketMessage({
        type: MSG_TYPES.SELECT_COUNTRY_RESULT,
        targetSocketId: senderSocketId,
        payload: {
          success: true,
          country: selectedCountry,
          notes: roleNotes
        }
      });

      this.emit('peer_authenticated', { peerId: senderSocketId, meta: updatedMeta });
      this.broadcastPeerList();
      return;
    }

    // 1.2 Liberación voluntaria de país
    if (message.type === MSG_TYPES.RELEASE_COUNTRY) {
      const clientId = message.payload?.clientId;
      const currentMeta = this.peerMetadata.get(senderSocketId);
      if (currentMeta) {
        currentMeta.country = null;
        this.peerMetadata.set(senderSocketId, currentMeta);
      }
      if (clientId) {
        for (const [id, m] of this.peerMetadata.entries()) {
          if (m.clientId === clientId) {
            m.country = null;
          }
        }
      }
      this.broadcastPeerList();
      return;
    }

    // 1.3 Notificación de Desconexión de Socket
    if (message.type === MSG_TYPES.PEER_DISCONNECTED) {
      const discSocketId = message.payload?.socketId;
      if (discSocketId && this.peerMetadata.has(discSocketId)) {
        this.peerMetadata.delete(discSocketId);
        this.broadcastPeerList();
      }
      return;
    }

    // Los clientes remotos usan el rol registrado al autenticarse, nunca el declarado en cada mensaje.
    const senderMeta = isLocal
      ? (message.senderMeta || { role: 'secretariat', country: 'Secretaría Local' })
      : this.peerMetadata.get(senderSocketId);
    if (!isLocal && !senderMeta) {
      return;
    }

    // 2. Modificación de Ajustes de Sala
    if (message.type === MSG_TYPES.UPDATE_ROOM_SETTINGS) {
      if (senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        this.roomSettings = { ...this.roomSettings, ...message.payload };
        this.emit('room_settings_updated', this.roomSettings);
        this.broadcastRoomSettings();
      }
      return;
    }

    // 3. Procesamiento de Solicitudes de Oradores desde Secretaría
    if (message.type === MSG_TYPES.PROCESS_SPEAKING_REQUEST) {
      if (senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        this.emit('process_speaking_request', message.payload);
      }
      return;
    }

    // 4. Expulsión de participante
    if (message.type === MSG_TYPES.KICK_PEER) {
      if (senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        this.kickPeer(message.payload?.peerId);
      }
      return;
    }

    // 5. Emisión de Voto desde Delegado
    if (message.type === MSG_TYPES.CAST_VOTE) {
      if (this.roomSettings.allowLiveVoting) {
        this.emit('vote_received', {
          country: senderMeta.country,
          vote: message.payload?.vote
        });
      }
      return;
    }

    // 5.1 Envío de Enmienda desde Delegado
    if (message.type === MSG_TYPES.SUBMIT_AMENDMENT) {
      const amendmentData = {
        id: message.payload?.id || `prop_del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        paisProponente: message.payload?.paisProponente || senderMeta?.country || message.senderMeta?.country || 'Delegación',
        tipo: message.payload?.tipo || 'modificacion',
        articuloId: message.payload?.articuloId || null,
        articuloNumero: message.payload?.articuloNumero || '',
        textoOriginal: message.payload?.textoOriginal || '',
        textoPropuesto: message.payload?.textoPropuesto || '',
        justificacion: message.payload?.justificacion || '',
        timestamp: message.payload?.timestamp || Date.now()
      };

      if (!this.latestEnmiendasPropuestas) this.latestEnmiendasPropuestas = [];
      this.latestEnmiendasPropuestas = [amendmentData, ...this.latestEnmiendasPropuestas.filter(a => a.id !== amendmentData.id)];
      this.broadcastAmendments(this.latestEnmiendasPropuestas);

      this.emit('amendment_proposed_by_delegate', amendmentData);

      this.emitSocketMessage({
        type: MSG_TYPES.SPEAKING_PROCESSED,
        targetSocketId: senderSocketId,
        payload: { success: true, mode: 'amendment', message: i18n.t('ui.amendmentSentToTheChairForReview') }
      });
      return;
    }

    // 6. Solicitudes de Orador / Moción / POI (desde Delegado)
    if (message.type === MSG_TYPES.REQUEST_SPEAKING) {
      const speechType = message.payload?.speechType; // 'GSL' | 'CAUCUS' | 'POINT_MOTION' | 'POINT' | 'MOTION'
      const country = message.payload?.details?.country || senderMeta?.country || message.senderMeta?.country || 'Delegación';

      if (speechType === 'GSL') {
        const mode = this.roomSettings.speakerRequestMode;
        if (mode === 'disabled') {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: i18n.t('ui.theChairHasClosedSpeakersListRequests') }
          });
          return;
        } else if (mode === 'direct') {
          this.emit('direct_speaker_request', { speechType: 'GSL', country });
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: true, mode: 'direct', message: i18n.t('ui.youHaveJoinedTheSpeakersList') }
          });
          return;
        }
      } else if (speechType === 'CAUCUS') {
        const mode = this.roomSettings.caucusRequestMode;
        if (mode === 'disabled') {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: i18n.t('ui.theChairHasClosedModeratedCaucusRequests') }
          });
          return;
        } else if (mode === 'direct') {
          this.emit('direct_speaker_request', { speechType: 'CAUCUS', country });
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: true, mode: 'direct', message: i18n.t('ui.youHaveJoinedTheCaucusList') }
          });
          return;
        }
      } else if (speechType === 'MOTION' || speechType === 'POINT_MOTION') {
        if (!this.roomSettings.allowMotions) {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: i18n.t('ui.theChairHasDisabledMotionSubmissions') }
          });
          return;
        }
      } else if (speechType === 'POINT') {
        // Los puntos parlamentarios siempre son aceptados para que lleguen como avisos especiales a la Mesa
      }

      // Si requiere aprobación o es un punto/moción, informar al delegado
      this.emitSocketMessage({
        type: MSG_TYPES.SPEAKING_PROCESSED,
        targetSocketId: senderSocketId,
        payload: { 
          success: true, 
          mode: speechType === 'POINT' ? 'point' : 'approval', 
          message: speechType === 'POINT' ? 'Punto parlamentario transmitido a la Mesa Directiva.' : 'Solicitud enviada a la Mesa para su aprobación.' 
        }
      });
    }

    // Notificar al Host de la recepción del mensaje
    this.emit('message_received_by_host', { peerId: senderSocketId, senderMeta, message });

    // 6.1 Petición de Sincronización Completa desde Cliente
    if (message.type === MSG_TYPES.REQUEST_FULL_SYNC) {
      if (!this.latestSessionState && typeof window !== 'undefined') {
        try {
          const rawPaises = localStorage.getItem('openmun_paises');
          if (rawPaises) {
            this.latestSessionState = {
              comision: localStorage.getItem('openmun_comite') || 'Comité',
              nombreComite: localStorage.getItem('openmun_comite') || '',
              paises: JSON.parse(rawPaises),
              oradoresCola: JSON.parse(localStorage.getItem('openmun_oradores') || '[]'),
              oradoresCaucus: JSON.parse(localStorage.getItem('openmun_oradores_caucus') || '[]'),
              mociones: JSON.parse(localStorage.getItem('openmun_mociones') || '[]'),
              caucusActivo: JSON.parse(localStorage.getItem('openmun_caucus') || 'null'),
              agendaSesion: JSON.parse(localStorage.getItem('openmun_agenda') || 'null'),
              votacionSesion: JSON.parse(localStorage.getItem('openmun_votacion') || 'null'),
              enmiendasSesion: JSON.parse(localStorage.getItem('openmun_enmiendas') || 'null'),
              roomSettings: this.roomSettings
            };
          }
        } catch (e) {}
      }
      if (this.latestSessionState) {
        this.executeBroadcastState(this.latestSessionState);
      }
      return;
    }

    if (message.type === MSG_TYPES.REVIEW_NOTE) {
      if (senderMeta.role !== 'staff') return;
      const note = this.latestNotes.find(n => n.id === message.payload?.id);
      const status = message.payload?.status;
      if (!note || note.status !== 'pending' || !['approved', 'rejected'].includes(status)) return;
      const reviewed = { ...note, status, reviewedBy: isLocal ? 'local-staff' : senderSocketId, reviewedAt: Date.now() };
      this.latestNotes = this.latestNotes.map(n => n.id === reviewed.id ? reviewed : n);
      this.publishNote(reviewed);
      return;
    }

    // 7. Enrutamiento de Notas (Pajes / Mensajería)
    if (message.type === MSG_TYPES.SEND_NOTE) {
      if (senderMeta.role === 'delegate') {
        const target = String(message.payload?.to || '').trim().toUpperCase();
        if (target === 'CHAIR' && !this.roomSettings.allowChairNotes) return;
        if (target !== 'CHAIR' && target !== 'BACKROOM' && !this.roomSettings.allowDelegateNotes) return;
      }
      this.routeNoteMessage(senderMeta, message);
    }

    // 8. Acción de Sesión
    if (message.type === MSG_TYPES.SESSION_ACTION) {
      if (senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        this.emit('session_action', {
          peerId: senderSocketId,
          senderMeta,
          action: message.payload?.action,
          payload: message.payload?.payload,
          timestamp: message.payload?.timestamp || Date.now()
        });
      }
      return;
    }

    // 9. Emisión de Avisos Importantes (Secretaría / Staff / Presidencia)
    if (message.type === MSG_TYPES.BROADCAST_ANNOUNCEMENT) {
      if (senderMeta.role === 'staff' || senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        const raw = message.payload || {};
        const ann = {
          id: raw.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: raw.title || 'Aviso Oficial',
          text: raw.text || '',
          priority: raw.priority || 'general', // 'general' | 'urgente' | 'logistica' | 'receso' | 'documento'
          senderRole: senderMeta.role,
          senderName: senderMeta.role === 'secretariat' ? 'Secretaría' : (senderMeta.role === 'chair' ? 'Mesa de Presidencia' : 'Staff'),
          timestamp: raw.timestamp || Date.now(),
          target: raw.target || 'ALL'
        };

        if (!this.latestAnnouncements) this.latestAnnouncements = [];
        this.latestAnnouncements = [ann, ...this.latestAnnouncements.filter(a => a.id !== ann.id)];
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('openmun_announcements', JSON.stringify(this.latestAnnouncements));
          }
        } catch (e) {}

        this.publishAnnouncement(ann);
      }
      return;
    }

    // 10. Borrado de Avisos Importantes
    if (message.type === MSG_TYPES.DELETE_ANNOUNCEMENT) {
      if (senderMeta.role === 'staff' || senderMeta.role === 'secretariat' || senderMeta.role === 'chair' || isLocal) {
        const annId = message.payload?.id;
        if (annId) {
          this.latestAnnouncements = (this.latestAnnouncements || []).filter(a => a.id !== annId);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('openmun_announcements', JSON.stringify(this.latestAnnouncements));
            }
          } catch (e) {}
          this.emitSocketMessage({
            type: MSG_TYPES.DELETE_ANNOUNCEMENT,
            payload: { id: annId }
          });
          this.broadcastLocal({
            type: MSG_TYPES.DELETE_ANNOUNCEMENT,
            payload: { id: annId }
          });
          this.emit('announcement_deleted', { id: annId });
        }
      }
      return;
    }
  }

  // Enrutador de Notas según Matriz de Privacidad
  routeNoteMessage(senderMeta, message) {
    const note = message.payload;
    if (!note || typeof note.to !== 'string' || typeof note.text !== 'string' || !note.text.trim()) return;
    if (this.latestNotes.some(n => n.id === note.id)) return;

    let fromRole = senderMeta?.role || 'delegate';
    let fromName = senderMeta?.country || fromRole;
    if (fromRole === 'backroom') {
      fromName = 'Backroom';
    } else if (fromRole === 'chair') {
      fromName = 'Mesa de Presidencia';
    } else if (fromRole === 'secretariat') {
      fromName = 'Secretaría';
    } else if (fromRole === 'staff') {
      fromName = 'Staff';
    } else if (fromRole === 'delegate') {
      fromName = senderMeta?.country || 'Delegación';
    }

    const formattedNote = {
      to: note.to.trim(),
      text: note.text.trim(),
      type: note.type || 'general',
      status: fromRole === 'delegate' && this.roomSettings.requireStaffNoteApproval ? 'pending' : 'delivered',
      id: note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      from: fromName,
      fromRole,
      senderClientId: senderMeta?.clientId || senderMeta?.socketId,
      timestamp: Date.now()
    };

    this.latestNotes = [formattedNote, ...this.latestNotes];

    this.publishNote(formattedNote);
  }

  publishNote(note) {
    try {
      localStorage.setItem('openmun_notes', JSON.stringify(this.latestNotes));
    } catch (e) { }
    // Las notas pendientes nunca se transmiten al destinatario ni al resto de la sala.
    for (const [peerId, meta] of this.peerMetadata) {
      if (!meta.isLocal && canReceiveNote(note, meta.role, meta.country, meta.clientId || peerId)) {
        this.emitSocketMessage({ type: MSG_TYPES.NOTE_RECEIVED, targetSocketId: peerId, payload: note });
      }
    }
    this.broadcastLocal({
      type: MSG_TYPES.NOTE_RECEIVED,
      payload: note
    });

    // Notificar al propio Chair
    this.emit('note_for_chair', note);
  }

  // ─────────────────────────────────────────────────────────────
  // EMISIÓN Y SINCRONIZACIÓN DESDE EL CHAIR
  // ─────────────────────────────────────────────────────────────
  broadcastStateToClients(state) {
    if (!state) return;

    // Debounce / coalescing de ráfagas para optimizar rendimiento de red y CPU (160ms)
    this.pendingStateToBroadcast = state;
    if (this.broadcastDebounceTimer) return;

    this.broadcastDebounceTimer = setTimeout(() => {
      this.broadcastDebounceTimer = null;
      const stateToProcess = this.pendingStateToBroadcast;
      this.pendingStateToBroadcast = null;
      if (!stateToProcess) return;

      this.executeBroadcastState(stateToProcess);
    }, 160);
  }

  executeBroadcastState(state) {
    const cleanState = sanitizeStateForBroadcast(state);
    const fullPayload = {
      ...cleanState,
      roomSettings: this.roomSettings,
      speakingRequests: this.latestSpeakingRequests || []
    };

    const msgToSend = {
      type: MSG_TYPES.SYNC_STATE,
      payload: fullPayload
    };

    this.latestSessionState = fullPayload;
    this.emitSocketMessage(msgToSend);
    this.broadcastLocal(msgToSend);
  }

  broadcastSpeakingRequests(requests) {
    const sanitizedRequests = (requests || []).map(r => {
      if (!r) return r;
      return {
        id: r.id,
        country: r.country,
        bandera: r.bandera || r.flag,
        timestamp: r.timestamp,
        speechType: r.speechType || r.type,
        type: r.type || r.speechType,
        details: r.details,
        peerId: r.peerId
      };
    });
    this.latestSpeakingRequests = sanitizedRequests;
    const msg = {
      type: MSG_TYPES.SPEAKING_REQUESTS_UPDATED,
      payload: sanitizedRequests
    };

    this.emitSocketMessage(msg);
    this.broadcastLocal(msg);
  }

  broadcastRoomSettings(settings = null) {
    if (settings) {
      this.roomSettings = { ...this.roomSettings, ...settings };
    }
    const msg = {
      type: MSG_TYPES.ROOM_SETTINGS_UPDATED,
      payload: this.roomSettings
    };

    this.emitSocketMessage(msg);
    this.broadcastLocal(msg);
  }

  broadcastCrisisAlert(alertData) {
    const msg = {
      type: MSG_TYPES.CRISIS_ALERT,
      payload: alertData
    };

    this.emitSocketMessage(msg);
    this.broadcastLocal(msg);
  }

  broadcastAnnouncement(announcementData) {
    if (LUAX_API_URL && this.socket) return this.emitSocketMessage({ type: MSG_TYPES.BROADCAST_ANNOUNCEMENT, payload: announcementData });
    const ann = {
      id: announcementData.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: announcementData.title || 'Aviso Oficial',
      text: announcementData.text || '',
      priority: announcementData.priority || 'general',
      senderRole: 'chair',
      senderName: 'Mesa de Presidencia',
      timestamp: announcementData.timestamp || Date.now(),
      target: announcementData.target || 'ALL'
    };
    if (!this.latestAnnouncements) this.latestAnnouncements = [];
    this.latestAnnouncements = [ann, ...this.latestAnnouncements.filter(a => a.id !== ann.id)];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('openmun_announcements', JSON.stringify(this.latestAnnouncements));
      }
    } catch (e) {}
    this.publishAnnouncement(ann);
    return true;
  }

  publishAnnouncement(ann) {
    const message = { type: MSG_TYPES.BROADCAST_ANNOUNCEMENT, payload: ann };
    if (LUAX_API_URL && this.socket) {
      this.emitSocketMessage(message);
      return;
    }
    for (const [peerId, meta] of this.peerMetadata) {
      if (!meta.isLocal && canReceiveAnnouncement(ann, meta.role, meta.country)) {
        this.emitSocketMessage({ ...message, targetSocketId: peerId });
      }
    }
    this.broadcastLocal(message);
    if (canReceiveAnnouncement(ann, this.role)) this.emit('announcement_received', ann);
  }

  deleteAnnouncement(announcementId) {
    if (LUAX_API_URL && this.socket) return this.emitSocketMessage({ type: MSG_TYPES.DELETE_ANNOUNCEMENT, payload: { id: announcementId } });
    this.latestAnnouncements = (this.latestAnnouncements || []).filter(a => a.id !== announcementId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('openmun_announcements', JSON.stringify(this.latestAnnouncements));
      }
    } catch (e) {}
    this.emitSocketMessage({
      type: MSG_TYPES.DELETE_ANNOUNCEMENT,
      payload: { id: announcementId }
    });
    this.broadcastLocal({
      type: MSG_TYPES.DELETE_ANNOUNCEMENT,
      payload: { id: announcementId }
    });
    this.emit('announcement_deleted', { id: announcementId });
    return true;
  }

  broadcastPeerList() {
    const list = Array.from(this.peerMetadata.entries()).map(([id, meta]) => ({
      peerId: id,
      ...meta
    }));
    const msg = {
      type: MSG_TYPES.PEER_LIST_UPDATED,
      payload: list
    };
    this.emit('peer_list_updated', list);
    this.emitSocketMessage(msg);
    this.broadcastLocal(msg);
  }

  broadcastAmendments(proposals) {
    this.latestEnmiendasPropuestas = proposals || [];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('openmun_enmiendas_propuestas', JSON.stringify(this.latestEnmiendasPropuestas));
      }
    } catch (e) {}
    const msg = {
      type: MSG_TYPES.AMENDMENTS_PROPOSALS_UPDATED,
      payload: this.latestEnmiendasPropuestas
    };
    this.emitSocketMessage(msg);
    this.broadcastLocal(msg);
  }

  async broadcastLocal(data) {
    const channel = this.broadcastChannel;
    if (channel) {
      this.localSendQueue = (this.localSendQueue || Promise.resolve()).then(async () => {
        try {
          const payload = await compressData(data);
          if (this.broadcastChannel === channel) channel.postMessage(payload);
        } catch (e) { }
      });
      return this.localSendQueue;
    }
  }

  // Helper para emitir al servidor central Socket.io con compresión automática
  async emitSocketMessage(data) {
    if (LUAX_API_URL) return sendLuax(this, data);
    const socket = this.socket;
    const roomId = this.roomId;
    if (socket && socket.connected && roomId) {
      this.socketSendQueue = (this.socketSendQueue || Promise.resolve()).then(async () => {
        try {
          const payload = await compressData(data);
          if (this.socket !== socket || this.roomId !== roomId || !socket.connected) return false;
          socket.emit('enviar-datos', {
            sala: roomId,
            json: payload
          });
          return true;
        } catch (err) {
          console.warn('Error emitiendo por Socket.io:', err);
        }
        return false;
      });
      return this.socketSendQueue;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS DEL CLIENTE
  // ─────────────────────────────────────────────────────────────
  sendToServer(type, payload) {
    if (LUAX_API_URL && this.socket) return this.emitSocketMessage({ type, payload });
    const senderRole = this.role || 'delegate';
    const senderCountry = senderRole === 'delegate' ? (this.clientCountry || null) : null;
    const msg = {
      type,
      payload,
      senderSocketId: this.socketId,
      senderMeta: { role: senderRole, country: senderCountry, clientId: this.clientId },
      id: `msg-${Date.now()}`
    };

    let sent = false;

    if (this.socket && this.socket.connected) {
      this.emitSocketMessage(msg);
      sent = true;
    }

    if (this.broadcastChannel) {
      this.broadcastLocal(msg);
      sent = true;
    }

    return sent;
  }

  reviewNoteAsClient(id, status) {
    if (this.role !== 'staff' || !['approved', 'rejected'].includes(status)) return false;
    return this.sendToServer(MSG_TYPES.REVIEW_NOTE, { id, status });
  }

  sendNoteAsClient(to, text, type = 'general', customId = null) {
    const finalId = customId || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (LUAX_API_URL && this.socket) return sendLuax(this, { type: MSG_TYPES.SEND_NOTE, payload: { id: finalId, to, text, type } });
    if (this.isHost && !LUAX_API_URL) {
      this.routeNoteMessage(
        { role: 'chair', country: null },
        { payload: { id: finalId, to, text, type, timestamp: Date.now() } }
      );
      return true;
    }
    return this.sendToServer(MSG_TYPES.SEND_NOTE, {
      id: finalId,
      to,
      text,
      type,
      timestamp: Date.now()
    });
  }

  requestSpeakingAsClient(speechType, details = {}) {
    return this.sendToServer(MSG_TYPES.REQUEST_SPEAKING, {
      speechType, // 'GSL' | 'CAUCUS' | 'MOTION' | 'POINT' | 'POINT_MOTION'
      details,
      timestamp: Date.now()
    });
  }

  requestFullSyncAsClient() {
    return this.sendToServer(MSG_TYPES.REQUEST_FULL_SYNC, {
      timestamp: Date.now()
    });
  }

  updateRoomSettingsAsClient(settings) {
    return this.sendToServer(MSG_TYPES.UPDATE_ROOM_SETTINGS, settings);
  }

  processSpeakingRequestAsClient(requestId, action, requestData = {}) {
    return this.sendToServer(MSG_TYPES.PROCESS_SPEAKING_REQUEST, {
      requestId,
      action, // 'accept' | 'reject'
      requestData
    });
  }

  selectCountryAsClient(country) {
    this.clientCountry = country;
    return this.sendToServer(MSG_TYPES.SELECT_COUNTRY, {
      country,
      clientId: this.clientId,
      timestamp: Date.now()
    });
  }

  releaseCountryAsClient() {
    this.clientCountry = null;
    return this.sendToServer(MSG_TYPES.RELEASE_COUNTRY, {
      clientId: this.clientId,
      timestamp: Date.now()
    });
  }

  castVoteAsClient(country, vote) {
    return this.sendToServer(MSG_TYPES.CAST_VOTE, {
      country,
      vote,
      timestamp: Date.now()
    });
  }

  submitAmendmentAsClient(amendmentData) {
    return this.sendToServer(MSG_TYPES.SUBMIT_AMENDMENT, amendmentData);
  }

  sendSessionActionAsClient(action, payload) {
    return this.sendToServer(MSG_TYPES.SESSION_ACTION, {
      action,
      payload,
      timestamp: Date.now()
    });
  }

  broadcastAnnouncementAsClient(announcementData) {
    return this.sendToServer(MSG_TYPES.BROADCAST_ANNOUNCEMENT, announcementData);
  }

  deleteAnnouncementAsClient(announcementId) {
    return this.sendToServer(MSG_TYPES.DELETE_ANNOUNCEMENT, { id: announcementId });
  }

  kickPeerAsClient(peerId) {
    return this.sendToServer(MSG_TYPES.KICK_PEER, { peerId });
  }

  kickPeer(peerId) {
    if (this.socket && this.socket.connected) {
      this.emitSocketMessage({
        type: MSG_TYPES.KICK,
        targetSocketId: peerId,
        payload: { reason: 'Desconectado por la Mesa (Chair)' }
      });
    }
    this.peerMetadata.delete(peerId);
    this.broadcastPeerList();
  }

  // ─────────────────────────────────────────────────────────────
  // LIMPIEZA
  // ─────────────────────────────────────────────────────────────
  destroy() {
    this.luaxJoined = false;
    this.luaxPendingState = null;
    if (this.broadcastDebounceTimer) {
      clearTimeout(this.broadcastDebounceTimer);
      this.broadcastDebounceTimer = null;
    }
    this.pendingStateToBroadcast = null;
    if (this.peerMetadata) {
      this.peerMetadata.clear();
    }
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch (e) { }
      this.broadcastChannel = null;
    }
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (e) { }
      this.socket = null;
    }
    this.socketId = null;
    this.isHost = false;
    this.role = 'none';
    this.clientCountry = null;
    this.roomId = null;
  }
}

export const peerService = new NetworkService();
export default peerService;
