import { sessionStore as localStorage, getSessionScope, setSessionScope } from '../utils/sessionStorage';
import { getAccessCredentials, rememberAccessToken } from './accessCredentials';
import { io } from 'socket.io-client';
import { compressData, decompressData } from '../utils/compression.js';
import { createStateDelta } from '../utils/deltaSync.js';
import { playChimeAlert } from '../utils/audioAlerts.js';

export const LOCAL_BROADCAST_CHANNEL_NAME = 'openmun_local_secret_channel';
export const SOCKET_SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_SERVER_URL)
  ? import.meta.env.VITE_SOCKET_SERVER_URL
  : 'https://api.openmun.app';

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
      id = `client_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
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
  return `MUN-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
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

  // Filtrar histórico de notas según el rol y país del receptor
  getNotesForRole(role, country) {
    if (!Array.isArray(this.latestNotes)) return [];
    const visible = this.latestNotes.filter(n => !['pending', 'rejected'].includes(n.status) || ['staff', 'chair', 'secretariat'].includes(role) || (role === 'delegate' && String(n.from).toLowerCase() === String(country).toLowerCase()));
    if (role === 'secretariat' || role === 'chair') {
      return visible;
    }
    if (role === 'staff') {
      return visible.filter(n => {
        const dest = (n.to || '').toUpperCase().trim();
        return (
          n.status === 'pending' || n.status === 'rejected' || n.reviewedAt ||
          dest === 'STAFF' ||
          dest === 'CHAIR' ||
          dest === 'MESA' ||
          dest === 'MESA DE PRESIDENCIA' ||
          dest === 'TODOS' ||
          dest === 'ALL' ||
          n.fromRole === 'staff' ||
          n.fromRole === 'chair' ||
          n.from === 'Staff' ||
          n.from === 'Mesa de Presidencia' ||
          n.type === 'logistica' ||
          n.type === 'paje'
        );
      });
    }
    if (role === 'backroom') {
      return visible.filter(n =>
        n.to?.toUpperCase() === 'BACKROOM' ||
        n.fromRole === 'backroom' ||
        n.from?.toUpperCase() === 'BACKROOM' ||
        n.to?.toUpperCase() === 'TODOS' ||
        n.type === 'crisis'
      );
    }
    if (role === 'delegate' && country) {
      const cleanCountry = country.toLowerCase().trim();
      return visible.filter(n =>
        (n.to && n.to.toLowerCase().trim() === cleanCountry) ||
        (n.from && n.from.toLowerCase().trim() === cleanCountry) ||
        n.to?.toUpperCase() === 'TODOS'
      );
    }
    return [];
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
    const cleanRoomId = (roomId || generateRoomCode()).trim().toUpperCase();
    setSessionScope(cleanRoomId, true);
    const previousScope = this.roomId;
    this.destroy();
    if (previousScope && previousScope !== cleanRoomId) { this.latestSessionState = null; this.latestNotes = []; this.latestAnnouncements = []; this.latestSpeakingRequests = []; }
    localStorage.setItem('openmun_user_role', 'chair');
    try { this.latestNotes = JSON.parse(localStorage.getItem('openmun_notes') || '[]'); } catch { this.latestNotes = []; }
    this.isHost = true;
    this.role = 'chair';
    this.roomId = cleanRoomId;
    this.secretPassword = options.secretPassword || crypto.randomUUID().slice(0, 12);
    this.backroomPassword = options.backroomPassword || crypto.randomUUID().slice(0, 12);
    this.staffPassword = options.staffPassword || crypto.randomUUID().slice(0, 12);
    if (options.roomSettings) {
      this.roomSettings = { ...DEFAULT_ROOM_SETTINGS, ...options.roomSettings };
    }

    // REGLA DE ORO: Inicializar BroadcastChannel para la sesión secreta local (mismo navegador / segundo monitor)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`${LOCAL_BROADCAST_CHANNEL_NAME}:${getSessionScope()}`);
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

    return new Promise((resolve, reject) => {
      this.connectTimer = setTimeout(() => {
        this.destroy();
        const error = 'Tiempo de espera agotado al iniciar la sala.';
        this.emit('error', { error });
        reject(new Error(error));
      }, 20000);
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
          let ownerToken = sessionStorage.getItem(`openmun_room_owner_${this.roomId}`);
          if (!ownerToken) {
            ownerToken = crypto.randomUUID();
            sessionStorage.setItem(`openmun_room_owner_${this.roomId}`, ownerToken);
          }
          this.socket.emit('unirse-comite', {
            sala: this.roomId, role: 'chair', ownerToken, restoreState: !this.latestSessionState,
            ...getAccessCredentials(undefined, this.roomId),
            secretPassword: this.secretPassword, backroomPassword: this.backroomPassword,
            staffPassword: this.staffPassword, roomSettings: this.roomSettings
          }, result => {
            clearTimeout(this.connectTimer);
            this.peerMetadata.clear();
            if (result?.error) {
              this.emit('error', { error: result.error });
              reject(new Error(result.error));
              this.destroy();
              return;
            }
            rememberAccessToken(result?.token);
            if (result?.state) {
              this.latestNotes = result.state.notes || [];
              this.latestSessionState = sanitizeStateForBroadcast(result.state);
              this.emit('initial_state_loaded', result.state);
            }
            this.needsFullSync = true;
            if (this.latestSessionState) this.executeBroadcastState(this.latestSessionState);
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

        // Recepción de Avisos en Tiempo Real desde el Backend
        this.socket.on('nuevo-aviso', (aviso) => {
          if (!aviso) return;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_nuevo_aviso', { detail: aviso }));
            try {
              playChimeAlert(0.4);
            } catch (e) {}
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
        reject(err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DEL CLIENTE (DELEGADO / SECRETO / BACKROOM)
  // ─────────────────────────────────────────────────────────────
  async initClient({ roomId, role, password, country, isLocalBroadcast = false }) {
    const cleanRoomId = (roomId || '').trim().toUpperCase();
    setSessionScope(cleanRoomId);
    localStorage.setItem('openmun_mesa_activa', 'false');
    localStorage.setItem('openmun_user_role', role);
    this.destroy();
    this.isHost = false;
    this.role = role;
    this.clientCountry = role === 'delegate' ? (country || null) : null;
    this.roomId = cleanRoomId;

    // REGLA DE ORO: Modo Secreto Local mediante BroadcastChannel (sin internet)
    if (isLocalBroadcast) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`${LOCAL_BROADCAST_CHANNEL_NAME}:${getSessionScope()}`);
        this.broadcastChannel.onmessage = async (event) => {
          const decompressed = await decompressData(event.data);
          this.emit('message', decompressed);
        };
        // Notificar al Chair que se ha unido una pantalla secreta local
        this.broadcastLocal({
          type: MSG_TYPES.AUTH,
          payload: {
            role: role || 'secretariat',
            country: country || (role === 'staff' ? 'Staff Local' : 'Secretaría Local'),
            isLocal: true
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
      throw new Error('BroadcastChannel no soportado en este navegador');
    }

    // Cliente Socket.io remoto
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const connectTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.destroy();
          reject(new Error(`Tiempo de espera agotado al conectar con el comité "${cleanRoomId}". Verifica tu conexión o el código de sala.`));
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
          clearTimeout(this.joinRetryTimer);
          const socket = this.socket;
          let attempts = 0;
          const join = () => {
            if (socket !== this.socket || !socket.connected) return;
            socket.emit('unirse-comite', {
              sala: cleanRoomId, role: this.role, password, country: this.clientCountry,
              ...getAccessCredentials(undefined, cleanRoomId)
            }, result => {
              if (result?.retryable && attempts++ < 25) {
                this.joinRetryTimer = setTimeout(join, 500);
                return;
              }
              if (result?.error) {
                clearTimeout(connectTimeout);
                if (!isResolved) { isResolved = true; reject(new Error(result.error)); }
                this.emit('error', { error: result.error });
                this.destroy();
                return;
              }
              rememberAccessToken(result?.token);
            });
          };
          join();
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
            if (!data.payload?.success) {
              clearTimeout(connectTimeout);
              if (!isResolved) { isResolved = true; reject(new Error(data.payload?.message || 'Acceso denegado a la sala')); }
              this.destroy();
              return;
            }
            clearTimeout(connectTimeout);
            this.roomSettings = data.payload.roomSettings || this.roomSettings;
            this.latestNotes = data.payload.notes || [];
            this.latestSpeakingRequests = data.payload.speakingRequests || [];
            this.emit('connected', data.payload);
            this.emit('message', data);
            if (!isResolved) { isResolved = true; resolve(data.payload); }
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
              payload: initialState
            });
          }
        });

        // Recepción de Avisos en Tiempo Real desde el Backend
        this.socket.on('nuevo-aviso', (aviso) => {
          if (!aviso) return;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_nuevo_aviso', { detail: aviso }));
            try {
              playChimeAlert(0.4);
            } catch (e) {}
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
      if (!isLocal && message._authenticated !== true) return;
      const { role, country, clientId } = message.payload || {};
      const authorized = true;
      const assignedCountry = country || null;
      const conflictNotice = null;
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

          const roleNotes = this.getNotesForRole(role, meta.country);

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
              sessionState: this.latestSessionState || null,
              notes: roleNotes,
              announcements: this.latestAnnouncements || [],
              connectedPeers: currentPeerList,
              message: conflictNotice || null
            }
          });

          this.emit('peer_authenticated', { peerId: senderSocketId, meta });
          this.broadcastPeerList();
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
          payload: {
            success: true,
            role: localRole,
            country: localCountry,
            roomSettings: this.roomSettings,
            speakingRequests: this.latestSpeakingRequests || [],
            enmiendasPropuestas: this.latestEnmiendasPropuestas || [],
            sessionState: this.latestSessionState || null,
            notes: this.latestNotes || [],
            announcements: this.latestAnnouncements || [],
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
          payload: { success: false, message: 'Por favor selecciona un país válido' }
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
            payload: { success: false, message: `La delegación de ${selectedCountry} ya ha sido seleccionada por otro participante.` }
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
      if (!isLocal && message._authenticated !== true) return;
      const discSocketId = message.payload?.socketId;
      if (discSocketId && this.peerMetadata.has(discSocketId)) {
        this.peerMetadata.delete(discSocketId);
        this.broadcastPeerList();
      }
      return;
    }

    const senderMeta = isLocal
      ? { role: message.senderMeta?.role || 'secretariat', country: message.senderMeta?.country || null }
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
        paisProponente: senderMeta?.country || 'Delegación',
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
        payload: { success: true, mode: 'amendment', message: '¡Enmienda enviada a la Mesa para su revisión!' }
      });
      return;
    }

    // 6. Solicitudes de Orador / Moción / POI (desde Delegado)
    if (message.type === MSG_TYPES.REQUEST_SPEAKING) {
      const speechType = message.payload?.speechType; // 'GSL' | 'CAUCUS' | 'POINT_MOTION' | 'POINT' | 'MOTION'
      const country = senderMeta?.country || 'Delegación';

      if (speechType === 'GSL') {
        const mode = this.roomSettings.speakerRequestMode;
        if (mode === 'disabled') {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: 'Las solicitudes a la Lista de Oradores están cerradas por la Mesa.' }
          });
          return;
        } else if (mode === 'direct') {
          this.emit('direct_speaker_request', { speechType: 'GSL', country });
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: true, mode: 'direct', message: '¡Te has añadido a la Lista de Oradores!' }
          });
          return;
        }
      } else if (speechType === 'CAUCUS') {
        const mode = this.roomSettings.caucusRequestMode;
        if (mode === 'disabled') {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: 'Las solicitudes para Caucus Moderado están cerradas por la Mesa.' }
          });
          return;
        } else if (mode === 'direct') {
          this.emit('direct_speaker_request', { speechType: 'CAUCUS', country });
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: true, mode: 'direct', message: '¡Te has añadido a la lista del Caucus!' }
          });
          return;
        }
      } else if (speechType === 'MOTION' || speechType === 'POINT_MOTION') {
        if (!this.roomSettings.allowMotions) {
          this.emitSocketMessage({
            type: MSG_TYPES.SPEAKING_PROCESSED,
            targetSocketId: senderSocketId,
            payload: { success: false, mode: 'disabled', message: 'La presentación de mociones está deshabilitada por la Mesa.' }
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
        this.needsFullSync = true;
        this.executeBroadcastState(this.latestSessionState);
      }
      return;
    }

    if (message.type === MSG_TYPES.REVIEW_NOTE) {
      if (senderMeta.role !== 'staff') return;
      const note = this.latestNotes.find(n => n.id === message.payload?.id);
      if (!note || note.status !== 'pending' || !['approved', 'rejected'].includes(message.payload.status)) return;
      const reviewed = { ...note, status: message.payload.status, reviewedBy: isLocal ? 'local-staff' : senderSocketId, reviewedAt: message.payload.reviewedAt || Date.now() };
      this.latestNotes = this.latestNotes.map(n => n.id === reviewed.id ? reviewed : n);
      this.emitSocketMessage({ type: MSG_TYPES.NOTE_RECEIVED, payload: reviewed, localReview: isLocal });
      this.broadcastLocal({ type: MSG_TYPES.NOTE_RECEIVED, payload: reviewed });
      this.emit('note_for_chair', reviewed);
      return;
    }

    // 7. Enrutamiento de Notas (Pajes / Mensajería)
    if (message.type === MSG_TYPES.SEND_NOTE) {
      if (senderMeta.role === 'delegate') {
        const target = message.payload?.to;
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
          senderRole: senderMeta?.role || raw.senderRole || 'staff',
          senderName: raw.senderName || (senderMeta?.role === 'secretariat' ? 'Secretaría' : (senderMeta?.role === 'chair' ? 'Mesa de Presidencia' : 'Staff')),
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

        this.emitSocketMessage({
          type: MSG_TYPES.BROADCAST_ANNOUNCEMENT,
          payload: ann
        });
        this.broadcastLocal({
          type: MSG_TYPES.BROADCAST_ANNOUNCEMENT,
          payload: ann
        });
        this.emit('announcement_received', ann);
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
    if (!note || !note.to) return;

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
      ...note,
      status: fromRole === 'delegate' && this.roomSettings.requireStaffNoteApproval ? 'pending' : 'delivered',
      id: note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      from: fromName,
      fromRole: fromRole,
      timestamp: note.timestamp || Date.now()
    };

    // Guardar en el histórico del Host
    if (!this.latestNotes) this.latestNotes = [];
    if (!this.latestNotes.some(n => n.id === formattedNote.id)) {
      this.latestNotes = [formattedNote, ...this.latestNotes];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('openmun_notes', JSON.stringify(this.latestNotes));
        }
      } catch (e) {}
    }

    // Transmitir la nota a la sala Socket.io
    this.emitSocketMessage({
      type: MSG_TYPES.NOTE_RECEIVED,
      payload: formattedNote
    });

    // Enviar a Secretaría Local (BroadcastChannel)
    this.broadcastLocal({
      type: MSG_TYPES.NOTE_RECEIVED,
      payload: formattedNote
    });

    // Notificar al propio Chair
    this.emit('note_for_chair', formattedNote);
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
      speakingRequests: this.latestSpeakingRequests || [],
      announcements: this.latestAnnouncements || []
    };

    let msgToSend = null;

    if (this.latestSessionState && !this.needsFullSync) {
      const diff = createStateDelta(this.latestSessionState, fullPayload);
      const diffKeys = Object.keys(diff);

      if (diffKeys.length > 0) {
        const deltaMsg = {
          type: MSG_TYPES.DELTA_STATE,
          payload: diff
        };

        const syncMsg = {
          type: MSG_TYPES.SYNC_STATE,
          payload: fullPayload
        };

        const deltaStrLen = JSON.stringify(deltaMsg).length;
        const syncStrLen = JSON.stringify(syncMsg).length;

        // Si la diferencia es sustancialmente menor (< 65% del tamaño completo) y no hay demasiados cambios individuales
        if (deltaStrLen < syncStrLen * 0.65 && diffKeys.length < 150) {
          msgToSend = deltaMsg;
        } else {
          msgToSend = syncMsg;
        }
      }
    } else {
      msgToSend = {
        type: MSG_TYPES.SYNC_STATE,
        payload: fullPayload
      };
    }

    this.latestSessionState = fullPayload;
    this.needsFullSync = false;

    if (msgToSend) {
      this.emitSocketMessage(msgToSend);
      this.broadcastLocal(msgToSend);
    }
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
    const ann = {
      id: announcementData.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: announcementData.title || 'Aviso Oficial',
      text: announcementData.text || '',
      priority: announcementData.priority || 'general',
      senderRole: announcementData.senderRole || 'chair',
      senderName: announcementData.senderName || 'Mesa de Presidencia',
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
    this.emitSocketMessage({
      type: MSG_TYPES.BROADCAST_ANNOUNCEMENT,
      payload: ann
    });
    this.broadcastLocal({
      type: MSG_TYPES.BROADCAST_ANNOUNCEMENT,
      payload: ann
    });
    this.emit('announcement_received', ann);
  }

  deleteAnnouncement(announcementId) {
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

  broadcastLocal(data) {
    const channel = this.broadcastChannel;
    this.localQueue = (this.localQueue || Promise.resolve()).then(async () => {
      if (!channel || channel !== this.broadcastChannel) return;
      const payload = await compressData(data);
      if (channel === this.broadcastChannel) channel.postMessage(payload);
    }).catch(error => console.warn('Error de transmisión local:', error));
    return this.localQueue;
  }

  emitSocketMessage(data) {
    const socket = this.socket;
    const roomId = this.roomId;
    if (!socket?.connected || !roomId) return Promise.resolve(false);
    this.sendQueue = (this.sendQueue || Promise.resolve()).then(async () => {
      if (socket !== this.socket || !socket.connected) return false;
      const payload = await compressData(data);
      if (socket !== this.socket || !socket.connected) return false;
      return new Promise(resolve => {
        socket.timeout(10000).emit('enviar-datos', { sala: roomId, json: payload }, (error, result) => {
          if (socket !== this.socket) return resolve(false);
          if (error || result?.error) {
            this.emit('action_error', { error: result?.error || 'No se ha confirmado la entrega del mensaje.' });
            if (error) this.needsFullSync = true;
            return resolve(false);
          }
          resolve(true);
        });
      });
    }).catch(error => { this.emit('action_error', { error: error.message }); return false; });
    return this.sendQueue;
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS DEL CLIENTE
  // ─────────────────────────────────────────────────────────────
  sendToServer(type, payload) {
    const senderRole = this.role || 'delegate';
    const senderCountry = senderRole === 'delegate' ? (this.clientCountry || null) : null;
    const msg = {
      type,
      payload,
      senderSocketId: this.socketId,
      senderMeta: { role: senderRole, country: senderCountry },
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
    return this.sendToServer(MSG_TYPES.REVIEW_NOTE, { id, status });
  }

  sendNoteAsClient(to, text, type = 'general', customId = null) {
    const finalId = customId || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (this.isHost) {
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
    clearTimeout(this.connectTimer);
    clearTimeout(this.joinRetryTimer);
    this.sendQueue = Promise.resolve();
    this.localQueue = Promise.resolve();
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
