import i18n from '../languages/index.js';
import { useTranslation } from 'react-i18next';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import peerService, { MSG_TYPES, canReceiveNote, generateRoomCode, DEFAULT_ROOM_SETTINGS } from '../services/peerService';
import { SESSION_STORAGE_KEYS, limpiarDatosSesionPrevia } from '../utils/sessionValidator';
import { registrarAvisoPropio } from '../utils/announcementHelpers';

const P2PContext = createContext();

export const P2PProvider = ({ children }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState(() => {
    // Detectar si la URL contiene parámetros de unión directa (?room=... o ?mode=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const isLocal = params.get('local') === 'true';
      if (mode && ['delegate', 'secretariat', 'backroom', 'staff', 'join'].includes(mode)) {
        if ((mode === 'secretariat' || mode === 'staff') && !isLocal) {
          return 'join';
        }
        return mode;
      }
      if (params.get('room')) {
        return 'join';
      }
    }
    return 'chair'; // Modo Chair por defecto
  });

  const [role, setRole] = useState('none'); // 'chair' | 'delegate' | 'secretariat' | 'backroom' | 'staff' | 'none'
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'host_active' | 'error'
  const [error, setError] = useState(null);
  const [roomId, setRoomId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const prevRoom = localStorage.getItem('openmun_last_room_id');
      if (urlRoom && prevRoom && urlRoom.trim().toUpperCase() !== prevRoom.trim().toUpperCase()) {
        limpiarDatosSesionPrevia();
      }
      return urlRoom || prevRoom || generateRoomCode();
    }
    return generateRoomCode();
  });

  const [clientCountry, setClientCountry] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openmun_last_country');
      return (saved && saved !== 'null' && saved !== 'undefined') ? saved.trim() : '';
    }
    return '';
  });

  const [secretPassword, setSecretPassword] = useState(() => {
    return localStorage.getItem('openmun_secret_pass') || 'secreto123';
  });

  const [backroomPassword, setBackroomPassword] = useState(() => {
    return localStorage.getItem('openmun_backroom_pass') || 'crisis123';
  });

  const [staffPassword, setStaffPassword] = useState(() => {
    return localStorage.getItem('openmun_staff_pass') || 'staff123';
  });

  // Ajustes de Sala y Permisos de Delegados
  const [roomSettings, setRoomSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_room_settings');
      return saved ? { ...DEFAULT_ROOM_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_ROOM_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_ROOM_SETTINGS };
    }
  });

  const [connectedPeers, setConnectedPeers] = useState([]);
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_notes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [unreadNotesCount, setUnreadNotesCount] = useState(0);
  const [speakingRequests, setSpeakingRequests] = useState([]);
  const [enmiendasPropuestas, setEnmiendasPropuestas] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_enmiendas_propuestas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [remoteSessionState, setRemoteSessionState] = useState(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [liveModalTab, setLiveModalTab] = useState('SALA');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    localStorage.setItem('openmun_enmiendas_propuestas', JSON.stringify(enmiendasPropuestas));
  }, [enmiendasPropuestas]);

  useEffect(() => {
    // Las vistas de participantes no deben sustituir el histórico completo de la Mesa en otra pestaña.
    if (role === 'chair' || role === 'none') localStorage.setItem('openmun_notes', JSON.stringify(notes));
    if (peerService) {
      peerService.latestNotes = notes;
    }
  }, [notes, role]);

  useEffect(() => {
    localStorage.setItem('openmun_announcements', JSON.stringify(announcements));
    if (peerService) {
      peerService.latestAnnouncements = announcements;
    }
  }, [announcements]);

  // Sincronizar ajustes P2P y notas si se importan datos a localStorage
  useEffect(() => {
    const handleSessionImported = () => {
      try {
        const savedSettings = localStorage.getItem('openmun_room_settings');
        if (savedSettings) {
          setRoomSettings(JSON.parse(savedSettings));
        }
        const savedSecret = localStorage.getItem('openmun_secret_pass');
        if (savedSecret) setSecretPassword(savedSecret);
        const savedBackroom = localStorage.getItem('openmun_backroom_pass');
        if (savedBackroom) setBackroomPassword(savedBackroom);
        const savedCountry = localStorage.getItem('openmun_last_country');
        if (savedCountry) setClientCountry(savedCountry);
        const savedNotes = localStorage.getItem('openmun_notes');
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          if (Array.isArray(parsedNotes)) {
            setNotes(parsedNotes);
            if (peerService) peerService.latestNotes = parsedNotes;
          }
        }
      } catch (e) {
        console.error('Error sincronizando P2PContext tras importación:', e);
      }
    };

    window.addEventListener('openmun_session_imported', handleSessionImported);
    window.addEventListener('storage', handleSessionImported);
    return () => {
      window.removeEventListener('openmun_session_imported', handleSessionImported);
      window.removeEventListener('storage', handleSessionImported);
    };
  }, []);

  // Callback ref para manipulación de SessionContext desde Host al procesar solicitudes automáticas o remotas
  const sessionActionHandlersRef = useRef({
    onAddSpeakerGSL: null,
    onAddSpeakerCaucus: null,
    onAddMotion: null,
    onCastVote: null,
    onSessionAction: null,
    onSyncState: null
  });

  const registerSessionHandlers = useCallback((handlers) => {
    sessionActionHandlersRef.current = { ...sessionActionHandlersRef.current, ...handlers };
  }, []);

  const lastNotificationRef = useRef({ text: '', timestamp: 0 });
  const addNotification = useCallback((text, type = 'info') => {
    if (!text) return;
    const now = Date.now();
    if (lastNotificationRef.current.text === text && (now - lastNotificationRef.current.timestamp) < 4000) {
      return;
    }
    lastNotificationRef.current = { text, timestamp: now };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openmun_toast', {
        detail: {
          message: text,
          type: type === 'error' ? 'error' : (type === 'warning' ? 'warning' : (type === 'success' ? 'success' : 'info'))
        }
      }));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // SUSCRIPCIÓN A EVENTOS DEL PEERSERVICE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = peerService.subscribe((event, data) => {
      if (event === 'notes_replaced') setNotes(data);
      if (event === 'announcements_replaced') setAnnouncements(data);
      if (event === 'host_ready') {
        setConnectionStatus('host_active');
        setRole('chair');
        setError(null);
        setRoomId(data.roomId);
        if (data.roomSettings) setRoomSettings(data.roomSettings);
        localStorage.setItem('openmun_last_room_id', data.roomId);
        addNotification(t('ui.liveRoomStartedSuccessfully', { v0: data.roomId }), 'success');
      }

      if (event === 'connected') {
        setConnectionStatus('connected');
        setRole(data.role);
        setError(null);
        const validCountry = (typeof data.country === 'string' && data.country.trim() && data.country !== 'null' && data.country !== 'undefined') ? data.country.trim() : null;
        if (validCountry) {
          setClientCountry(validCountry);
          localStorage.setItem('openmun_last_country', validCountry);
          if (roomId) localStorage.setItem(`openmun_country_${roomId}`, validCountry);
        } else if (data.role === 'delegate') {
          // Si el host no tiene país registrado aún, verificar si en esta sala o en general teníamos uno
          const currentRoom = roomId || (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : '');
          const savedCountry = currentRoom ? (localStorage.getItem(`openmun_country_${currentRoom}`) || localStorage.getItem('openmun_last_country')) : (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_country') : null);
          if (savedCountry && savedCountry !== 'null' && savedCountry !== 'undefined') {
            const clean = savedCountry.trim();
            setClientCountry(clean);
            localStorage.setItem('openmun_last_country', clean);
            if (currentRoom) localStorage.setItem(`openmun_country_${currentRoom}`, clean);
            peerService.selectCountryAsClient(clean);
          } else {
            setClientCountry('');
          }
        }
        if (data.sessionState) {
          setRemoteSessionState(data.sessionState);
          if (sessionActionHandlersRef.current.onSyncState) {
            sessionActionHandlersRef.current.onSyncState(data.sessionState);
          }
        }
        if (Array.isArray(data.connectedPeers)) {
          setConnectedPeers(data.connectedPeers);
        }
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
        }
        if (data.roomSettings) setRoomSettings(data.roomSettings);
        if (data.speakingRequests) setSpeakingRequests(data.speakingRequests);
        if (data.message) {
          addNotification(data.message, 'warning');
        }
        addNotification(data.country ? t('ui.connectedToTheRoomAs', { v0: data.country }) : t('ui.connectedToTheRoom', { v0: data.role }), 'success');
      }

      if (event === 'session_action') {
        const { action, payload } = data;
        if (action === 'eliminar_propuesta_enmienda' && payload?.id) {
          setEnmiendasPropuestas(prev => {
            const next = prev.filter(p => p.id !== payload.id);
            peerService.broadcastAmendments(next);
            return next;
          });
        }
        if (sessionActionHandlersRef.current.onSessionAction) {
          sessionActionHandlersRef.current.onSessionAction(action, payload);
        }
      }

      if (event === 'connection_lost') {
        setConnectionStatus('reconnecting');
      }

      if (event === 'disconnected') {
        setConnectionStatus('disconnected');
        addNotification(data.reason || t('ui.disconnectedFromTheRoom'), 'warning');
      }

      if (event === 'error') {
        const errorMsg = typeof data === 'string' ? data : (data?.error || '');
        // Suprimir bucle de errores de transporte mientras el socket reintenta reconectar
        if (
          errorMsg.toLowerCase().includes('websocket') ||
          errorMsg.toLowerCase().includes('xhr poll') ||
          errorMsg.toLowerCase().includes('connect_error')
        ) {
          setConnectionStatus('reconnecting');
          return;
        }
        setError(errorMsg);
        if (!peerService.socket?.connected) setConnectionStatus('error');
        addNotification(errorMsg, 'error');
      }

      if (event === 'peer_list_updated') {
        setConnectedPeers(data);
      }

      if (event === 'peer_authenticated') {
        addNotification(t('ui.hasJoinedTheRoom', { v0: data.meta.country || data.meta.role }), 'info');
      }

      if (event === 'peer_disconnected') {
        if (data.meta) {
          addNotification(`${data.meta.country || data.meta.role} se ha desconectado`, 'info');
        }
      }

      if (event === 'room_settings_updated') {
        setRoomSettings(data);
        localStorage.setItem('openmun_room_settings', JSON.stringify(data));
        addNotification(t('ui.roomSettingsAndPermissionsUpdated'), 'info');
      }

      // Solicitud directa de orador (Host auto-adiciona a la sesión)
      if (event === 'direct_speaker_request') {
        const { speechType, country } = data;
        if (speechType === 'GSL') {
          if (sessionActionHandlersRef.current.onAddSpeakerGSL) {
            sessionActionHandlersRef.current.onAddSpeakerGSL({ nombre: country });
          }
          addNotification(t('ui.joinedTheSpeakersListDirect', { v0: country }), 'success');
        } else if (speechType === 'CAUCUS') {
          if (sessionActionHandlersRef.current.onAddSpeakerCaucus) {
            sessionActionHandlersRef.current.onAddSpeakerCaucus({ nombre: country });
          }
          addNotification(t('ui.joinedTheModeratedCaucusDirect', { v0: country }), 'success');
        }
      }

      // Procesamiento de solicitud desde Secretaría (Host ejecuta)
      if (event === 'process_speaking_request') {
        const { requestId, action, requestData } = data;
        setSpeakingRequests(prev => {
          const updated = prev.filter(r => r.id !== requestId);
          peerService.broadcastSpeakingRequests(updated);
          return updated;
        });
        if (action === 'accept' && requestData) {
          if (requestData.speechType === 'GSL' && sessionActionHandlersRef.current.onAddSpeakerGSL) {
            sessionActionHandlersRef.current.onAddSpeakerGSL({ nombre: requestData.country });
          } else if (requestData.speechType === 'CAUCUS' && sessionActionHandlersRef.current.onAddSpeakerCaucus) {
            sessionActionHandlersRef.current.onAddSpeakerCaucus({ nombre: requestData.country });
          } else if ((requestData.speechType === 'MOTION' || requestData.speechType === 'POINT_MOTION') && sessionActionHandlersRef.current.onAddMotion) {
            sessionActionHandlersRef.current.onAddMotion({
              tipo: requestData.details?.tipo || 'Caucus Moderado',
              proponente: requestData.country,
              posicionProponente: requestData.details?.posicionProponente || 'Primero',
              varianteConsulta: requestData.details?.varianteConsulta || '',
              tema: requestData.details?.tema || 'Tema de Debate',
              tiempoTotal: requestData.details?.tiempoTotal || 0,
              tiempoOrador: requestData.details?.tiempoOrador || 0
            });
          }
          addNotification(t('ui.requestFromApprovedByTheSecretariat', { v0: requestData.country }), 'success');
        } else if (action === 'reject') {
          addNotification(t('ui.requestRejectedByTheSecretariat'), 'info');
        }
      }

      // Recepción de voto telemático en Host
      if (event === 'vote_received') {
        const { country, vote } = data;
        if (sessionActionHandlersRef.current.onCastVote) {
          sessionActionHandlersRef.current.onCastVote(country, vote);
        }
        addNotification(`Voto registrado de ${country}: ${vote}`, 'info');
      }

      // Recepción de Propuesta de Enmienda desde Delegado en Host
      if (event === 'amendment_proposed_by_delegate') {
        setEnmiendasPropuestas(prev => {
          const next = [data, ...prev.filter(a => a.id !== data.id)];
          peerService.broadcastAmendments(next);
          return next;
        });
        addNotification(`Nueva propuesta de enmienda de ${data.paisProponente}`, 'info');
      }

      // Recepción de Notas con de-duplicación estricta
      if (event === 'note_for_chair') {
        setNotes(prev => {
          if (prev.some(n => n.id === data.id)) {
            return prev.map(n => n.id === data.id ? { ...n, ...data } : n);
          }
          return [data, ...prev];
        });
        if (canReceiveNote(data, 'chair') && data.fromRole !== 'chair' && data.type !== 'speaker_annotation') {
          setUnreadNotesCount(prev => prev + 1);
          addNotification(t('ui.noteFromTo', { v0: data.from, v1: data.to }), 'info');
        }
      }

      // Recepción de Avisos Importantes en tiempo real
      if (event === 'announcement_received') {
        setAnnouncements(prev => [data, ...prev.filter(a => a.id !== data.id)]);
        addNotification(`Aviso Oficial: ${data.title}`, 'info');
      }

      if (event === 'announcement_deleted') {
        setAnnouncements(prev => prev.filter(a => a.id !== data.id));
      }

      // Mensajes recibidos en Host desde clientes
      if (event === 'message_received_by_host') {
        const { senderMeta, message } = data;
        if (message.type === MSG_TYPES.REQUEST_SPEAKING) {
          const targetCountry = message.payload?.details?.country || senderMeta?.country || message.senderMeta?.country || 'Delegación';
          const req = {
            id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            country: targetCountry,
            speechType: message.payload.speechType,
            details: message.payload.details,
            timestamp: Date.now()
          };
          setSpeakingRequests(prev => {
            const next = [req, ...prev.filter(r => !(r.country === req.country && r.speechType === req.speechType))];
            peerService.broadcastSpeakingRequests(next);
            return next;
          });
          const typeLabel = req.speechType === 'POINT' ? 'Punto Parlamentario (POI)' : (req.speechType === 'MOTION' ? 'Moción' : req.speechType);
          addNotification(t('ui.requestedASpeakingTurn', { v0: targetCountry, v1: typeLabel }), 'info');
        }
      }

      // Mensajes recibidos en Cliente desde Host
      if (event === 'message') {
        const message = data;
        if (message.type === MSG_TYPES.AUTH_RESULT) {
          if (message.payload?.success) {
            setConnectionStatus('connected');
            if (message.payload.role) setRole(message.payload.role);
            if (message.payload.country) setClientCountry(message.payload.country);
            if (message.payload.roomSettings) {
              setRoomSettings(message.payload.roomSettings);
            }
            if (message.payload.speakingRequests) {
              setSpeakingRequests(message.payload.speakingRequests);
            }
            if (Array.isArray(message.payload.enmiendasPropuestas)) {
              setEnmiendasPropuestas(message.payload.enmiendasPropuestas);
            }
            if (Array.isArray(message.payload.connectedPeers)) {
              setConnectedPeers(message.payload.connectedPeers);
            }
            if (Array.isArray(message.payload.announcements)) {
              setAnnouncements(message.payload.announcements);
            }
            if (Array.isArray(message.payload.notes) && message.payload.notes.length > 0) {
              setNotes(prev => {
                const map = new Map();
                // Añadir notas entrantes del Host
                message.payload.notes.forEach(n => { if (n && n.id) map.set(n.id, n); });
                // Combinar con las locales que pudieran existir
                prev.forEach(n => { if (n && n.id && !map.has(n.id)) map.set(n.id, n); });
                return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              });
            }
            if (message.payload.sessionState) {
              setRemoteSessionState(message.payload.sessionState);
              if (sessionActionHandlersRef.current.onSyncState) {
                sessionActionHandlersRef.current.onSyncState(message.payload.sessionState);
              }
            }
          }
        } else if (message.type === MSG_TYPES.SELECT_COUNTRY_RESULT) {
          if (message.payload?.success) {
            const countryName = message.payload.country;
            if (countryName) {
              setClientCountry(countryName);
              localStorage.setItem('openmun_last_country', countryName);
            }
            if (Array.isArray(message.payload.notes) && message.payload.notes.length > 0) {
              setNotes(prev => {
                const map = new Map();
                message.payload.notes.forEach(n => { if (n && n.id) map.set(n.id, n); });
                prev.forEach(n => { if (n && n.id && !map.has(n.id)) map.set(n.id, n); });
                return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              });
            }
            addNotification(t('ui.assignedDelegation', { v0: countryName }), 'success');
          } else {
            addNotification(message.payload?.message || t('ui.errorSelectingCountry'), 'error');
          }
        } else if (message.type === MSG_TYPES.SYNC_STATE || message.type === MSG_TYPES.DELTA_STATE) {
          setRemoteSessionState(message.payload);
          if (sessionActionHandlersRef.current.onSyncState) {
            sessionActionHandlersRef.current.onSyncState(message.payload);
          }
          if (message.payload?.roomSettings) {
            setRoomSettings(message.payload.roomSettings);
          }
          if (message.payload?.speakingRequests) {
            setSpeakingRequests(message.payload.speakingRequests);
          }
          if (Array.isArray(message.payload?.announcements)) {
            setAnnouncements(message.payload.announcements);
          }
        } else if (message.type === MSG_TYPES.SPEAKING_REQUESTS_UPDATED) {
          setSpeakingRequests(message.payload || []);
        } else if (message.type === MSG_TYPES.PEER_LIST_UPDATED) {
          setConnectedPeers(message.payload || []);
        } else if (message.type === MSG_TYPES.AMENDMENTS_PROPOSALS_UPDATED) {
          setEnmiendasPropuestas(message.payload || []);
        } else if (message.type === MSG_TYPES.ROOM_SETTINGS_UPDATED) {
          setRoomSettings(message.payload);
          addNotification(t('ui.roomSettingsAndPermissionsUpdatedByTheChair'), 'info');
        } else if (message.type === MSG_TYPES.SPEAKING_PROCESSED) {
          const { success, mode, message: msgText } = message.payload || {};
          addNotification(msgText || (success ? t('ui.requestProcessed') : t('ui.couldNotProcess')), success ? 'success' : 'warning');
        } else if (message.type === MSG_TYPES.NOTE_RECEIVED) {
          setNotes(prev => {
            if (prev.some(n => n.id === message.payload.id)) {
              return prev.map(n => n.id === message.payload.id ? { ...n, ...message.payload } : n);
            }
            return [message.payload, ...prev];
          });
          if (message.payload?.type !== 'speaker_annotation') {
            setUnreadNotesCount(prev => prev + 1);
            addNotification(t('ui.newNoteFrom', { v0: message.payload.from }), 'info');
          }
        } else if (message.type === MSG_TYPES.BROADCAST_ANNOUNCEMENT) {
          setAnnouncements(prev => [message.payload, ...prev.filter(a => a.id !== message.payload.id)]);
          addNotification(`Aviso Oficial: ${message.payload.title}`, 'info');
        } else if (message.type === MSG_TYPES.DELETE_ANNOUNCEMENT) {
          setAnnouncements(prev => prev.filter(a => a.id !== message.payload?.id));
        } else if (message.type === MSG_TYPES.CRISIS_ALERT) {
          addNotification(`AVISO DE CRISIS: ${message.payload.title || t('ui.officialAnnouncement2')}`, 'error');
        } else if (message.type === MSG_TYPES.KICK) {
          peerService.destroy();
          setConnectionStatus('disconnected');
          setRole('none');
          setViewMode('join');
          addNotification(t('ui.youHaveBeenDisconnectedFromTheRoomByTheChair'), 'warning');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addNotification]);

  // Guardar contraseñas y ajustes cuando cambien
  useEffect(() => {
    localStorage.setItem('openmun_secret_pass', secretPassword);
    localStorage.setItem('openmun_backroom_pass', backroomPassword);
    localStorage.setItem('openmun_staff_pass', staffPassword);
  }, [secretPassword, backroomPassword, staffPassword]);

  useEffect(() => {
    localStorage.setItem('openmun_room_settings', JSON.stringify(roomSettings));
  }, [roomSettings]);

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS DE CONTROL
  // ─────────────────────────────────────────────────────────────
  const updateRoomSettings = useCallback((newSettings) => {
    const merged = { ...roomSettings, ...newSettings };
    setRoomSettings(merged);
    localStorage.setItem('openmun_room_settings', JSON.stringify(merged));

    if (connectionStatus === 'host_active') {
      peerService.broadcastRoomSettings(merged);
    } else if (connectionStatus === 'connected' && (role === 'secretariat' || role === 'chair')) {
      peerService.updateRoomSettingsAsClient(merged);
    }
    addNotification(t('ui.roomSettingsSaved'), 'success');
  }, [roomSettings, connectionStatus, role, addNotification, t]);

  const startHosting = useCallback(async (customRoomId, secPass, bckPass, customSettings = null, stfPass = null) => {
    const finalRoomId = customRoomId || roomId || generateRoomCode();
    const finalSecPass = secPass || secretPassword;
    const finalBckPass = bckPass || backroomPassword;
    const finalStaffPass = stfPass || staffPassword;
    const finalSettings = customSettings || roomSettings;

    setConnectionStatus('connecting');
    setError(null);
    try {
      await peerService.initHost(finalRoomId, {
        secretPassword: finalSecPass,
        backroomPassword: finalBckPass,
        staffPassword: finalStaffPass,
        roomSettings: finalSettings
      });
      return true;
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
      return false;
    }
  }, [roomId, secretPassword, backroomPassword, staffPassword, roomSettings]);

  const stopHosting = useCallback(() => {
    peerService.destroy();
    setConnectionStatus('disconnected');
    setConnectedPeers([]);
    setRole('none');
    addNotification(t('ui.liveRoomEnded'), 'info');
  }, [addNotification, t]);

  const joinRoom = useCallback(async ({ targetRoomId, targetRole, password, country, isLocalBroadcast = false }) => {
    setConnectionStatus('connecting');
    setError(null);
    try {
      const finalTargetId = (targetRoomId || roomId || '').trim();
      const previousRoomId = typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : null;
      const isDifferentRoom = Boolean(previousRoomId && finalTargetId && previousRoomId.trim().toUpperCase() !== finalTargetId.toUpperCase());

      // Si es una sala distinta a la previa, limpiar datos de la sala anterior ANTES de conectar
      if (isDifferentRoom) {
        console.log(`[openMUN] Sala distinta detectada (${finalTargetId} vs ${previousRoomId}). Limpiando datos de sesión previa...`);
        limpiarDatosSesionPrevia();
        setNotes([]);
        setAnnouncements([]);
        setSpeakingRequests([]);
        setEnmiendasPropuestas([]);
        setRemoteSessionState(null);
        if (peerService) {
          peerService.latestNotes = [];
          peerService.latestAnnouncements = [];
          peerService.latestSpeakingRequests = [];
          peerService.latestSessionState = null;
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('openmun_session_cleared'));
      }

      // Determinar país para esta sesión: preservar la delegación del usuario (sala específica o general)
      const isValid = (c) => typeof c === 'string' && c.trim() && c.trim() !== 'null' && c.trim() !== 'undefined';
      let effectiveCountry = '';
      if (targetRole === 'delegate') {
        if (isValid(country)) {
          effectiveCountry = country.trim();
        } else if (typeof window !== 'undefined') {
          const roomCountry = localStorage.getItem(`openmun_country_${finalTargetId}`) || localStorage.getItem('openmun_last_country');
          if (isValid(roomCountry)) {
            effectiveCountry = roomCountry.trim();
          }
        }
      }

      await peerService.initClient({
        roomId: finalTargetId,
        role: targetRole,
        password,
        country: effectiveCountry || null,
        isLocalBroadcast
      });

      if (finalTargetId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('openmun_last_room_id', finalTargetId);
          if (!isLocalBroadcast) {
            localStorage.setItem('openmun_current_comite_id', peerService.luaxSession?.committeeId || finalTargetId);
            localStorage.setItem('openmun_user_role', targetRole);
          }
        }
        setRoomId(finalTargetId);
      }
      setRole(targetRole);
      setViewMode(targetRole);
      if (typeof window !== 'undefined' && !isLocalBroadcast && finalTargetId) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('mode', targetRole);
          url.searchParams.set('room', finalTargetId);
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
        } catch (e) { }
      }
      if (targetRole === 'delegate') {
        if (effectiveCountry) {
          setClientCountry(effectiveCountry);
          localStorage.setItem('openmun_last_country', effectiveCountry);
          if (finalTargetId) localStorage.setItem(`openmun_country_${finalTargetId}`, effectiveCountry);
        } else {
          setClientCountry('');
        }
      } else {
        setClientCountry('');
      }
      return true;
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
      return false;
    }
  }, [roomId]);

  const selectCountry = useCallback((countryName) => {
    if (!countryName || !countryName.trim()) {
      return Promise.resolve({ success: false, message: t('ui.invalidCountry') });
    }
    const cleanName = countryName.trim();
    return new Promise((resolve) => {
      let resolved = false;
      const unsubscribe = peerService.subscribe((event, data) => {
        if (event === 'message' && data?.type === MSG_TYPES.SELECT_COUNTRY_RESULT) {
          if (!resolved) {
            resolved = true;
            unsubscribe();
            if (data.payload?.success) {
              const assignedCountry = (data.payload.country || cleanName).trim();
              setClientCountry(assignedCountry);
              localStorage.setItem('openmun_last_country', assignedCountry);
              const curRoom = roomId || (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : '');
              if (curRoom) localStorage.setItem(`openmun_country_${curRoom}`, assignedCountry);
              resolve({ success: true, country: assignedCountry });
            } else {
              resolve({ success: false, message: data.payload?.message || 'País no disponible' });
            }
          }
        }
      });

      const sent = peerService.selectCountryAsClient(cleanName);
      if (!sent) {
        resolved = true;
        unsubscribe();
        resolve({ success: false, message: t('ui.couldNotCommunicateWithTheMainChair') });
        return;
      }

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve({ success: false, message: t('ui.countrySelectionTimedOut') });
        }
      }, 8000);
    });
  }, [roomId, t]);

  const resetCountrySelection = useCallback(() => {
    setClientCountry('');
    localStorage.removeItem('openmun_last_country');
    const curRoom = roomId || (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : '');
    if (curRoom) localStorage.removeItem(`openmun_country_${curRoom}`);
    peerService.releaseCountryAsClient();
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    peerService.releaseCountryAsClient();
    peerService.destroy();
    setConnectionStatus('disconnected');
    setRole('none');
    setClientCountry('');
    setViewMode('join');
    setNotes([]);
    setAnnouncements([]);
    setSpeakingRequests([]);
    setEnmiendasPropuestas([]);
    setRemoteSessionState(null);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        url.searchParams.delete('room');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
      } catch (e) { }
      localStorage.removeItem('openmun_last_country');
      localStorage.removeItem('openmun_user_role');
      const curRoom = roomId || localStorage.getItem('openmun_last_room_id');
      if (curRoom) localStorage.removeItem(`openmun_country_${curRoom}`);
    }
  }, [roomId]);

  const sendNote = useCallback(async (to, text, type = 'general') => {
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ok = await peerService.sendNoteAsClient(to, text, type, noteId);
    if (ok) {
      let senderName = role;
      if (role === 'backroom') {
        senderName = 'Backroom';
      } else if (role === 'chair') {
        senderName = 'Mesa de Presidencia';
      } else if (role === 'secretariat') {
        senderName = 'Secretaría';
      } else if (role === 'staff') {
        senderName = 'Staff';
      } else if (role === 'delegate') {
        senderName = clientCountry || 'Delegación';
      }

      const selfNote = {
        id: noteId,
        from: senderName,
        fromRole: role,
        senderClientId: peerService.clientId,
        to,
        text,
        type,
        status: role === 'delegate' && roomSettings.requireStaffNoteApproval ? 'pending' : 'delivered',
        timestamp: Date.now(),
        isOutgoing: true
      };
      setNotes(prev => {
        if (prev.some(n => n.id === noteId)) return prev;
        return [selfNote, ...prev];
      });
    }
    return ok;
  }, [clientCountry, role, roomSettings.requireStaffNoteApproval]);

  const reviewNote = useCallback((id, status) => peerService.reviewNoteAsClient(id, status), []);

  const broadcastAnnouncement = useCallback(async (annData) => {
    const ann = {
      id: annData.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: annData.title || 'Aviso Oficial',
      text: annData.text || '',
      priority: annData.priority || 'general',
      senderRole: role || 'chair',
      senderName: (role === 'secretariat' ? 'Secretaría' : (role === 'staff' ? 'Staff' : 'Mesa de Presidencia')),
      timestamp: Date.now(),
      target: annData.target || 'ALL'
    };
    const sent = await (connectionStatus === 'host_active'
      ? peerService.broadcastAnnouncement(ann) : peerService.broadcastAnnouncementAsClient(ann));
    if (sent === false) return false;
    registrarAvisoPropio(ann.id);
    setAnnouncements(prev => [ann, ...prev.filter(a => a.id !== ann.id)]);
    addNotification(t('ui.announcementIssuedSuccessfully'), 'success');
    return true;
  }, [connectionStatus, role, addNotification, t]);

  const deleteAnnouncement = useCallback(async (id) => {
    const removed = await (connectionStatus === 'host_active'
      ? peerService.deleteAnnouncement(id) : peerService.deleteAnnouncementAsClient(id));
    if (removed === false) return false;
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    addNotification(t('ui.announcementWithdrawn'), 'info');
  }, [connectionStatus, addNotification, t]);

  const requestSpeaking = useCallback((speechType, details = {}) => {
    return peerService.requestSpeakingAsClient(speechType, details);
  }, []);

  const approveSpeakingRequest = useCallback((req) => {
    if (connectionStatus === 'host_active') {
      // Si somos el Chair/Host, ejecutamos inmediatamente con los handlers registrados
      if (req.speechType === 'GSL' && sessionActionHandlersRef.current.onAddSpeakerGSL) {
        sessionActionHandlersRef.current.onAddSpeakerGSL({ nombre: req.country });
      } else if (req.speechType === 'CAUCUS' && sessionActionHandlersRef.current.onAddSpeakerCaucus) {
        sessionActionHandlersRef.current.onAddSpeakerCaucus({ nombre: req.country });
      } else if ((req.speechType === 'MOTION' || req.speechType === 'POINT_MOTION') && sessionActionHandlersRef.current.onAddMotion) {
        sessionActionHandlersRef.current.onAddMotion({
          tipo: req.details?.tipo || 'Caucus Moderado',
          proponente: req.country,
          posicionProponente: req.details?.posicionProponente || 'Primero',
          varianteConsulta: req.details?.varianteConsulta || '',
          tema: req.details?.tema || 'Tema de Debate',
          tiempoTotal: req.details?.tiempoTotal || 0,
          tiempoOrador: req.details?.tiempoOrador || 0
        });
      }
      setSpeakingRequests(prev => {
        const next = prev.filter(r => r.id !== req.id);
        peerService.broadcastSpeakingRequests(next);
        return next;
      });
      addNotification(`Aceptada solicitud de ${req.country}`, 'success');
    } else {
      // Si somos Secretaría (cliente remoto o local), enviamos el comando al host
      peerService.processSpeakingRequestAsClient(req.id, 'accept', req);
      setSpeakingRequests(prev => prev.filter(r => r.id !== req.id));
      addNotification(t('ui.approvalSentFor', { v0: req.country }), 'info');
    }
  }, [connectionStatus, addNotification, t]);

  const respondToPointWithNote = useCallback((pointReq, noteText) => {
    if (!pointReq || !noteText) return;
    sendNote(pointReq.country, noteText, 'urgente');
    if (connectionStatus === 'host_active') {
      setSpeakingRequests(prev => {
        const next = prev.filter(r => r.id !== pointReq.id);
        peerService.broadcastSpeakingRequests(next);
        return next;
      });
    } else {
      peerService.processSpeakingRequestAsClient(pointReq.id, 'reject');
      setSpeakingRequests(prev => prev.filter(r => r.id !== pointReq.id));
    }
    addNotification(t('ui.replySentToByNote', { v0: pointReq.country }), 'success');
  }, [sendNote, connectionStatus, addNotification, t]);

  const requestFullSync = useCallback(() => {
    if (connectionStatus === 'connected') {
      peerService.requestFullSyncAsClient();
      addNotification(t('ui.syncRequestedFromTheChair'), 'info');
    }
  }, [connectionStatus, addNotification, t]);

  const rejectSpeakingRequest = useCallback((reqId) => {
    if (connectionStatus === 'host_active') {
      setSpeakingRequests(prev => {
        const next = prev.filter(r => r.id !== reqId);
        peerService.broadcastSpeakingRequests(next);
        return next;
      });
    } else {
      peerService.processSpeakingRequestAsClient(reqId, 'reject');
      setSpeakingRequests(prev => prev.filter(r => r.id !== reqId));
    }
    addNotification(t('ui.requestRejected'), 'info');
  }, [connectionStatus, addNotification, t]);

  const castVote = useCallback((voteOption) => {
    if (connectionStatus === 'connected' && role === 'delegate') {
      peerService.castVoteAsClient(clientCountry, voteOption);
      addNotification(`Voto emitido: ${voteOption}`, 'success');
    }
  }, [connectionStatus, role, clientCountry, addNotification]);

  const kickPeer = useCallback((peerId) => {
    if (connectionStatus === 'host_active') {
      peerService.kickPeer(peerId);
    } else {
      peerService.kickPeerAsClient(peerId);
    }
  }, [connectionStatus]);

  const markNotesAsRead = useCallback(() => {
    setUnreadNotesCount(0);
  }, []);

  // Broadcast desde el Chair hacia todos los clientes
  const broadcastCurrentState = useCallback((state) => {
    if (connectionStatus === 'host_active' || (connectionStatus === 'reconnecting' && peerService.isHost)) {
      peerService.broadcastStateToClients(state);
    }
  }, [connectionStatus]);

  // Enviar acción de sesión desde Secretaría al Host o ejecutarla localmente si somos Host
  const sendSessionAction = useCallback((action, payload) => {
    if (connectionStatus === 'host_active') {
      if (sessionActionHandlersRef.current.onSessionAction) {
        sessionActionHandlersRef.current.onSessionAction(action, payload);
      }
    } else {
      peerService.sendSessionActionAsClient(action, payload);
    }
  }, [connectionStatus]);

  // Reenviar acciones de sesión emitidas localmente al Host P2P si somos cliente
  useEffect(() => {
    const handleAction = (e) => {
      if (e.detail?.action && connectionStatus !== 'host_active') {
        peerService.sendSessionActionAsClient(e.detail.action, e.detail.payload);
      }
    };
    window.addEventListener('openmun_session_action', handleAction);
    return () => window.removeEventListener('openmun_session_action', handleAction);
  }, [connectionStatus]);

  const submitAmendment = useCallback((amendmentData) => {
    const formatted = {
      ...amendmentData,
      paisProponente: amendmentData.paisProponente || clientCountry || 'Delegación',
      timestamp: Date.now()
    };
    if (connectionStatus === 'connected' && role === 'delegate') {
      peerService.submitAmendmentAsClient(formatted);
      addNotification(t('ui.amendmentProposalSentToTheChair'), 'success');
    } else {
      // Si somos Host / modo local
      setEnmiendasPropuestas(prev => [formatted, ...prev]);
      addNotification(t('ui.amendmentRegisteredInTheProposalInbox'), 'info');
    }
  }, [connectionStatus, role, clientCountry, addNotification, t]);

  const eliminarEnmiendaPropuesta = useCallback((propId) => {
    setEnmiendasPropuestas(prev => {
      const next = prev.filter(p => p.id !== propId);
      if (connectionStatus === 'host_active') {
        peerService.broadcastAmendments(next);
      } else {
        peerService.sendSessionActionAsClient('eliminar_propuesta_enmienda', { id: propId });
      }
      return next;
    });
  }, [connectionStatus]);

  const openLiveModal = useCallback((tab = 'SALA') => {
    if (tab && typeof tab === 'string') {
      setLiveModalTab(tab);
    }
    setIsLiveModalOpen(true);
  }, []);
  const closeLiveModal = useCallback(() => setIsLiveModalOpen(false), []);

  const contextValue = useMemo(() => ({
    viewMode,
    setViewMode,
    role,
    connectionStatus,
    error,
    roomId,
    setRoomId,
    clientCountry,
    setClientCountry,
    secretPassword,
    setSecretPassword,
    backroomPassword,
    setBackroomPassword,
    staffPassword,
    setStaffPassword,
    announcements,
    setAnnouncements,
    broadcastAnnouncement,
    deleteAnnouncement,
    roomSettings,
    setRoomSettings,
    updateRoomSettings,
    connectedPeers,
    notes,
    setNotes,
    unreadNotesCount,
    markNotesAsRead,
    speakingRequests,
    setSpeakingRequests,
    approveSpeakingRequest,
    rejectSpeakingRequest,
    respondToPointWithNote,
    requestFullSync,
    enmiendasPropuestas,
    setEnmiendasPropuestas,
    submitAmendment,
    eliminarEnmiendaPropuesta,
    castVote,
    remoteSessionState,
    isLiveModalOpen,
    liveModalTab,
    setLiveModalTab,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinRoom,
    leaveRoom,
    selectCountry,
    resetCountrySelection,
    sendNote,
    reviewNote,
    requestSpeaking,
    kickPeer,
    broadcastCurrentState,
    sendSessionAction,
    registerSessionHandlers,
    notifications
  }), [
    viewMode,
    setViewMode,
    role,
    connectionStatus,
    error,
    roomId,
    setRoomId,
    clientCountry,
    setClientCountry,
    secretPassword,
    setSecretPassword,
    backroomPassword,
    setBackroomPassword,
    staffPassword,
    setStaffPassword,
    announcements,
    setAnnouncements,
    broadcastAnnouncement,
    deleteAnnouncement,
    roomSettings,
    setRoomSettings,
    updateRoomSettings,
    connectedPeers,
    notes,
    setNotes,
    unreadNotesCount,
    markNotesAsRead,
    speakingRequests,
    setSpeakingRequests,
    approveSpeakingRequest,
    rejectSpeakingRequest,
    respondToPointWithNote,
    requestFullSync,
    enmiendasPropuestas,
    setEnmiendasPropuestas,
    submitAmendment,
    eliminarEnmiendaPropuesta,
    castVote,
    remoteSessionState,
    isLiveModalOpen,
    liveModalTab,
    setLiveModalTab,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinRoom,
    leaveRoom,
    selectCountry,
    resetCountrySelection,
    sendNote,
    reviewNote,
    requestSpeaking,
    kickPeer,
    broadcastCurrentState,
    sendSessionAction,
    registerSessionHandlers,
    notifications
  ]);

  return (
    <P2PContext.Provider value={contextValue}>
      {children}

      </P2PContext.Provider>
  );
};

export const useP2P = () => {
  const context = useContext(P2PContext);
  if (!context) {
    throw new Error(i18n.t('ui.usep2pMustBeUsedWithinAP2pprovider'));
  }
  return context;
};

export default P2PContext;

