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

  // 4. Sanitizar solicitudes de palabra
  if (Array.isArray(sanitized.speakingRequests)) {
    sanitized.speakingRequests = sanitized.speakingRequests.map(r => {
      if (!r) return r;
      return {
        id: r.id,
        country: r.country,
        bandera: r.bandera || r.flag,
        timestamp: r.timestamp,
        type: r.type,
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
  CRISIS_ALERT: 'CRISIS_ALERT',
  BROADCAST_ANNOUNCEMENT: 'BROADCAST_ANNOUNCEMENT',
  DELETE_ANNOUNCEMENT: 'DELETE_ANNOUNCEMENT',
  CAST_VOTE: 'CAST_VOTE',
  SUBMIT_AMENDMENT: 'SUBMIT_AMENDMENT',
  REQUEST_FULL_SYNC: 'REQUEST_FULL_SYNC',
  KICK: 'KICK',
  KICK_PEER: 'KICK_PEER',
  PEER_LIST_UPDATED: 'PEER_LIST_UPDATED',
  PING: 'PING',
  PONG: 'PONG'
};

/**
 * Generador de ID de sala amigable (ej: MUN-4921)
 */
export function generateRoomCode() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MUN-${randomNum}`;
}

class NetworkService {
  constructor() {
    this.socket = null;
    this.socketId = null;
    this.peerMetadata = new Map(); // socketId -> { role, country, connectedAt }
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
      }
    } catch (e) {}
  }

  // Filtrar histórico de notas según el rol y país del receptor
  getNotesForRole(role, country) {
    if (!Array.isArray(this.latestNotes)) return [];
    if (role === 'secretariat' || role === 'chair') {
      return this.latestNotes;
    }
    if (role === 'staff') {
      return this.latestNotes.filter(n =>
        n.to?.toUpperCase() === 'STAFF' ||
        n.fromRole === 'staff' ||
        n.from?.toUpperCase() === 'STAFF' ||
        n.to?.toUpperCase() === 'TODOS' ||
        n.type === 'logistica' ||
        n.type === 'paje'
      );
    }
    if (role === 'backroom') {
      return this.latestNotes.filter(n =>
        n.to?.toUpperCase() === 'BACKROOM' ||
        n.fromRole === 'backroom' ||
        n.from?.toUpperCase() === 'BACKROOM' ||
        n.to?.toUpperCase() === 'TODOS' ||
        n.type === 'crisis'
      );
    }
    if (role === 'delegate' && country) {
      const cleanCountry = country.toLowerCase().trim();
      return this.latestNotes.filter(n =>
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
        this.broadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = async (event) => {
          const decompressed = await decompressData(event.data);
          this.handleIncomingMessage('local_broadcast_secretariat', decompressed, true);
        };
      } catch (err) {
        console.warn('BroadcastChannel no soportado o bloqueado:', err);
      }
    }

    return new Promise((resolve, reject) => {
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
          // Unirse a la sala del comité en el servidor central
          this.socket.emit('unirse-comite', this.roomId);
          this.emit('host_ready', { roomId: this.roomId, roomSettings: this.roomSettings });
          resolve(this.roomId);
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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_failure'));
          }
          this.emit('connection_lost', { error: err.message });
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`Reconectado exitosamente al servidor (intento ${attemptNumber})`);
          this.socketId = this.socket.id;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openmun_network_restored'));
            window.dispatchEvent(new Event('online'));
          }
          if (this.roomId) {
            this.socket.emit('unirse-comite', this.roomId);
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
        reject(err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN DEL CLIENTE (DELEGADO / SECRETO / BACKROOM)
  // ─────────────────────────────────────────────────────────────
  async initClient({ roomId, role, password, country, isLocalBroadcast = false }) {
    const cleanRoomId = (roomId || '').trim().toUpperCase();
    this.destroy();
    this.isHost = false;
    this.role = role;
    this.clientCountry = role === 'delegate' ? (country || null) : null;
    this.roomId = cleanRoomId;

    // REGLA DE ORO: Modo Secreto Local mediante BroadcastChannel (sin internet)
    if (isLocalBroadcast) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = async (event) => {
          const decompressed = await decompressData(event.data);
          this.emit('message', decompressed);
        };
        // Notificar al Chair que se ha unido una pantalla secreta local
        this.broadcastLocal({
          type: MSG_TYPES.AUTH,
          payload: { role: 'secretariat', country: 'Secretaría Local', isLocal: true },
          id: `auth-${Date.now()}`
        });
        this.emit('connected', { role: 'secretariat', isLocal: true, roomSettings: this.roomSettings });
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
          // Unirse a la sala del comité
          this.socket.emit('unirse-comite', cleanRoomId);

          // Enviar solicitud de autenticación / registro de rol
          this.emitSocketMessage({
            type: MSG_TYPES.AUTH,
            payload: { role, password, country },
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
            if (!isResolved) {
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
                  speakingRequests: data.payload.speakingRequests || []
                });
                resolve(data.payload);
              } else {
                isResolved = true;
                clearTimeout(connectTimeout);
                this.destroy();
                reject(new Error(data.payload?.message || 'Acceso denegado a la sala'));
              }
            }
            return;
          }

          // Si es expulsión
          if (data.type === MSG_TYPES.KICK) {
            this.emit('message', data);
            return;
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
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('openmun_network_failure'));
            }
            this.emit('connection_lost', { error: err.message });
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`Cliente reconectado a sala ${cleanRoomId} (intento ${attemptNumber})`);
          this.socketId = this.socket.id;
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
      const { role, password, country } = message.payload || {};
      let authorized = false;
      let errorMsg = '';

      if (isLocal) {
        authorized = true;
      } else if (role === 'delegate') {
        if (country && country.trim()) {
          // Validar si el país ya está ocupado
          const yaConectado = Array.from(this.peerMetadata.values()).some(
            m => m.role === 'delegate' && m.country && m.country.toLowerCase() === country.trim().toLowerCase()
          );
          if (yaConectado) {
            errorMsg = `La delegación de ${country} ya está conectada`;
          } else {
            authorized = true;
          }
        } else {
          // El delegado entra a la sala para elegir país desde la lista oficial
          authorized = true;
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
          const meta = { role, country: country?.trim() || null, connectedAt: Date.now(), socketId: senderSocketId };
          this.peerMetadata.set(senderSocketId, meta);

          const roleNotes = meta.country ? this.getNotesForRole(role, meta.country) : (role === 'backroom' ? this.getNotesForRole('backroom') : (role === 'staff' ? this.getNotesForRole('staff') : []));

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
              sessionState: this.latestSessionState || null,
              notes: roleNotes,
              announcements: this.latestAnnouncements || []
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
        this.broadcastLocal({
          type: MSG_TYPES.AUTH_RESULT,
          payload: {
            success: true,
            role: 'secretariat',
            country: 'Secretaría Local',
            roomSettings: this.roomSettings,
            speakingRequests: this.latestSpeakingRequests || [],
            sessionState: this.latestSessionState || null,
            notes: this.latestNotes || [],
            announcements: this.latestAnnouncements || []
          }
        });
      }
      return;
    }

    // 1.1 Selección / Toma de País por parte del Delegado
    if (message.type === MSG_TYPES.SELECT_COUNTRY) {
      const selectedCountry = (message.payload?.country || '').trim();
      if (!selectedCountry) {
        this.emitSocketMessage({
          type: MSG_TYPES.SELECT_COUNTRY_RESULT,
          targetSocketId: senderSocketId,
          payload: { success: false, message: 'Por favor selecciona un país válido' }
        });
        return;
      }

      // Validar si otro participante ya tiene asignado este país
      const yaOcupado = Array.from(this.peerMetadata.entries()).some(
        ([id, m]) => id !== senderSocketId && m.role === 'delegate' && m.country && m.country.toLowerCase() === selectedCountry.toLowerCase()
      );

      if (yaOcupado) {
        this.emitSocketMessage({
          type: MSG_TYPES.SELECT_COUNTRY_RESULT,
          targetSocketId: senderSocketId,
          payload: { success: false, message: `La delegación de ${selectedCountry} ya ha sido seleccionada por otro participante.` }
        });
        return;
      }

      // Asignar el país al participante
      const currentMeta = this.peerMetadata.get(senderSocketId) || { role: 'delegate', connectedAt: Date.now(), socketId: senderSocketId };
      const updatedMeta = { ...currentMeta, country: selectedCountry };
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

    // Obtener metadatos del remitente
    const senderMeta = isLocal ? { role: 'secretariat', country: 'Secretaría Local' } : (this.peerMetadata.get(senderSocketId) || message.senderMeta);
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
        id: `prop_del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        paisProponente: senderMeta.country,
        tipo: message.payload?.tipo || 'modificacion',
        articuloId: message.payload?.articuloId || null,
        articuloNumero: message.payload?.articuloNumero || '',
        textoOriginal: message.payload?.textoOriginal || '',
        textoPropuesto: message.payload?.textoPropuesto || '',
        justificacion: message.payload?.justificacion || '',
        timestamp: Date.now()
      };

      this.emit('amendment_proposed_by_delegate', amendmentData);

      this.emitSocketMessage({
        type: MSG_TYPES.SPEAKING_PROCESSED,
        targetSocketId: senderSocketId,
        payload: { success: true, mode: 'amendment', message: '¡Enmienda enviada a la Mesa para su revisión!' }
      });
      return;
    }

    // 6. Solicitudes de Orador / Moción (desde Delegado)
    if (message.type === MSG_TYPES.REQUEST_SPEAKING) {
      const speechType = message.payload?.speechType; // 'GSL' | 'CAUCUS' | 'POINT_MOTION'
      const country = senderMeta.country;

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
      if (this.latestSessionState) {
        this.executeBroadcastState(this.latestSessionState);
      }
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
    } else if (fromRole === 'secretariat' || fromRole === 'chair') {
      fromName = 'Secretaría';
    } else if (fromRole === 'staff') {
      fromName = 'Staff';
    } else if (fromRole === 'delegate') {
      fromName = senderMeta?.country || 'Delegación';
    }

    const formattedNote = {
      ...note,
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

    if (this.latestSessionState) {
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
        type: r.type,
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
  }

  async broadcastLocal(data) {
    if (this.broadcastChannel) {
      try {
        const payload = await compressData(data);
        this.broadcastChannel.postMessage(payload);
      } catch (e) { }
    }
  }

  // Helper para emitir al servidor central Socket.io con compresión automática
  async emitSocketMessage(data) {
    if (this.socket && this.socket.connected && this.roomId) {
      try {
        const payload = await compressData(data);
        this.socket.emit('enviar-datos', {
          sala: this.roomId,
          json: payload
        });
        return true;
      } catch (err) {
        console.warn('Error emitiendo por Socket.io:', err);
      }
    }
    return false;
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

  sendNoteAsClient(to, text, type = 'general', customId = null) {
    return this.sendToServer(MSG_TYPES.SEND_NOTE, {
      id: customId || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
