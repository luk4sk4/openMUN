import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import peerService, { MSG_TYPES, generateRoomCode, DEFAULT_ROOM_SETTINGS } from '../services/peerService';
import { applyStateDelta } from '../utils/deltaSync';

const P2PContext = createContext();

export const P2PProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState(() => {
    // Detectar si la URL contiene parámetros de unión directa (?room=... o ?mode=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode && ['delegate', 'secretariat', 'backroom', 'staff', 'join'].includes(mode)) {
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
      return params.get('room') || localStorage.getItem('openmun_last_room_id') || generateRoomCode();
    }
    return generateRoomCode();
  });

  const [clientCountry, setClientCountry] = useState(() => {
    return localStorage.getItem('openmun_last_country') || '';
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
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    localStorage.setItem('openmun_enmiendas_propuestas', JSON.stringify(enmiendasPropuestas));
  }, [enmiendasPropuestas]);

  useEffect(() => {
    localStorage.setItem('openmun_notes', JSON.stringify(notes));
    if (peerService) {
      peerService.latestNotes = notes;
    }
  }, [notes]);

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
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // SUSCRIPCIÓN A EVENTOS DEL PEERSERVICE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = peerService.subscribe((event, data) => {
      if (event === 'host_ready') {
        setConnectionStatus('host_active');
        setRole('chair');
        setError(null);
        setRoomId(data.roomId);
        if (data.roomSettings) setRoomSettings(data.roomSettings);
        localStorage.setItem('openmun_last_room_id', data.roomId);
        addNotification(`Sala en vivo iniciada con éxito (${data.roomId})`, 'success');
      }

      if (event === 'connected') {
        setConnectionStatus('connected');
        setRole(data.role);
        setError(null);
        if (data.country) {
          setClientCountry(data.country);
        } else if (data.role === 'delegate') {
          setClientCountry('');
        }
        if (data.sessionState) {
          setRemoteSessionState(data.sessionState);
          if (sessionActionHandlersRef.current.onSyncState) {
            sessionActionHandlersRef.current.onSyncState(data.sessionState);
          }
        }
        if (data.roomSettings) setRoomSettings(data.roomSettings);
        if (data.speakingRequests) setSpeakingRequests(data.speakingRequests);
        addNotification(data.country ? `Conectado a la sala como ${data.country}` : `Conectado a la sala (${data.role})`, 'success');
      }

      if (event === 'session_action') {
        const { action, payload } = data;
        if (sessionActionHandlersRef.current.onSessionAction) {
          sessionActionHandlersRef.current.onSessionAction(action, payload);
        }
      }

      if (event === 'connection_lost') {
        setConnectionStatus('reconnecting');
      }

      if (event === 'disconnected') {
        setConnectionStatus('disconnected');
        addNotification(data.reason || 'Desconectado de la sala', 'warning');
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
        setConnectionStatus('error');
        addNotification(errorMsg, 'error');
      }

      if (event === 'peer_list_updated') {
        setConnectedPeers(data);
      }

      if (event === 'peer_authenticated') {
        addNotification(`${data.meta.country || data.meta.role} se ha unido a la sala`, 'info');
      }

      if (event === 'peer_disconnected') {
        if (data.meta) {
          addNotification(`${data.meta.country || data.meta.role} se ha desconectado`, 'info');
        }
      }

      if (event === 'room_settings_updated') {
        setRoomSettings(data);
        localStorage.setItem('openmun_room_settings', JSON.stringify(data));
        addNotification('Ajustes de sala y permisos actualizados', 'info');
      }

      // Solicitud directa de orador (Host auto-adiciona a la sesión)
      if (event === 'direct_speaker_request') {
        const { speechType, country } = data;
        if (speechType === 'GSL') {
          if (sessionActionHandlersRef.current.onAddSpeakerGSL) {
            sessionActionHandlersRef.current.onAddSpeakerGSL({ nombre: country });
          }
          addNotification(`${country} se ha añadido a la Lista de Oradores (Directo)`, 'success');
        } else if (speechType === 'CAUCUS') {
          if (sessionActionHandlersRef.current.onAddSpeakerCaucus) {
            sessionActionHandlersRef.current.onAddSpeakerCaucus({ nombre: country });
          }
          addNotification(`${country} se ha añadido al Caucus Moderado (Directo)`, 'success');
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
          addNotification(`Solicitud de ${requestData.country} aprobada por Secretaría`, 'success');
        } else if (action === 'reject') {
          addNotification(`Solicitud rechazada por Secretaría`, 'info');
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
        setEnmiendasPropuestas(prev => [data, ...prev]);
        addNotification(`Nueva propuesta de enmienda de ${data.paisProponente}`, 'info');
      }

      // Recepción de Notas con de-duplicación estricta
      if (event === 'note_for_chair') {
        setNotes(prev => {
          if (prev.some(n => n.id === data.id || (n.from === data.from && n.to === data.to && n.text === data.text && Math.abs((n.timestamp || 0) - (data.timestamp || 0)) < 3000))) {
            return prev;
          }
          return [data, ...prev];
        });
        setUnreadNotesCount(prev => prev + 1);
        addNotification(`Nota de ${data.from} para ${data.to}`, 'info');
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
          const req = {
            id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            country: senderMeta.country,
            speechType: message.payload.speechType,
            details: message.payload.details,
            timestamp: Date.now()
          };
          setSpeakingRequests(prev => {
            const next = [req, ...prev.filter(r => !(r.country === req.country && r.speechType === req.speechType))];
            peerService.broadcastSpeakingRequests(next);
            return next;
          });
          const typeLabel = req.speechType === 'POINT' ? 'Punto Parlamentario' : (req.speechType === 'MOTION' ? 'Moción' : req.speechType);
          addNotification(`${senderMeta.country} ha solicitado turno (${typeLabel})`, 'info');
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
            addNotification(`Delegación asignada: ${countryName}`, 'success');
          } else {
            addNotification(message.payload?.message || 'Error al seleccionar país', 'error');
          }
        } else if (message.type === MSG_TYPES.SYNC_STATE) {
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
        } else if (message.type === MSG_TYPES.DELTA_STATE) {
          setRemoteSessionState(prev => {
            const updated = applyStateDelta(prev || {}, message.payload);
            if (sessionActionHandlersRef.current.onSyncState) {
              sessionActionHandlersRef.current.onSyncState(updated);
            }
            if (updated.roomSettings) {
              setRoomSettings(updated.roomSettings);
            }
            if (updated.speakingRequests) {
              setSpeakingRequests(updated.speakingRequests);
            }
            if (Array.isArray(updated.announcements)) {
              setAnnouncements(updated.announcements);
            }
            return updated;
          });
        } else if (message.type === MSG_TYPES.SPEAKING_REQUESTS_UPDATED) {
          setSpeakingRequests(message.payload || []);
        } else if (message.type === MSG_TYPES.ROOM_SETTINGS_UPDATED) {
          setRoomSettings(message.payload);
          addNotification('Ajustes de sala y permisos actualizados por la Mesa', 'info');
        } else if (message.type === MSG_TYPES.SPEAKING_PROCESSED) {
          const { success, mode, message: msgText } = message.payload || {};
          addNotification(msgText || (success ? 'Solicitud procesada' : 'No se pudo procesar'), success ? 'success' : 'warning');
        } else if (message.type === MSG_TYPES.NOTE_RECEIVED) {
          setNotes(prev => {
            if (prev.some(n => n.id === message.payload.id || (n.from === message.payload.from && n.to === message.payload.to && n.text === message.payload.text && Math.abs((n.timestamp || 0) - (message.payload.timestamp || 0)) < 3000))) {
              return prev;
            }
            return [message.payload, ...prev];
          });
          setUnreadNotesCount(prev => prev + 1);
          addNotification(`Nueva nota de ${message.payload.from}`, 'info');
        } else if (message.type === MSG_TYPES.BROADCAST_ANNOUNCEMENT) {
          setAnnouncements(prev => [message.payload, ...prev.filter(a => a.id !== message.payload.id)]);
          addNotification(`Aviso Oficial: ${message.payload.title}`, 'info');
        } else if (message.type === MSG_TYPES.DELETE_ANNOUNCEMENT) {
          setAnnouncements(prev => prev.filter(a => a.id !== message.payload?.id));
        } else if (message.type === MSG_TYPES.CRISIS_ALERT) {
          addNotification(`AVISO DE CRISIS: ${message.payload.title || 'Comunicado oficial'}`, 'error');
        } else if (message.type === MSG_TYPES.KICK) {
          peerService.destroy();
          setConnectionStatus('disconnected');
          setRole('none');
          setViewMode('join');
          addNotification('Has sido desconectado de la sala por la Mesa.', 'warning');
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
    addNotification('Ajustes de sala guardados', 'success');
  }, [roomSettings, connectionStatus, role, addNotification]);

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
    addNotification('Sala en vivo finalizada', 'info');
  }, [addNotification]);

  const joinRoom = useCallback(async ({ targetRoomId, targetRole, password, country, isLocalBroadcast = false }) => {
    setConnectionStatus('connecting');
    setError(null);
    try {
      await peerService.initClient({
        roomId: targetRoomId || roomId,
        role: targetRole,
        password,
        country: country || null,
        isLocalBroadcast
      });
      const finalTargetId = (targetRoomId || roomId || '').trim();
      if (finalTargetId) {
        setRoomId(finalTargetId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('openmun_last_room_id', finalTargetId);
          localStorage.setItem('openmun_current_comite_id', finalTargetId);
          localStorage.setItem('openmun_user_role', targetRole);
        }
      }
      setRole(targetRole);
      setViewMode(targetRole);
      if (targetRole === 'delegate') {
        if (country) {
          setClientCountry(country);
          localStorage.setItem('openmun_last_country', country);
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
      return Promise.resolve({ success: false, message: 'País no válido' });
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
              resolve({ success: true, country: data.payload.country || cleanName });
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
        resolve({ success: false, message: 'No se pudo comunicar con la Mesa Principal' });
        return;
      }

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve({ success: false, message: 'Tiempo de espera agotado al seleccionar país' });
        }
      }, 8000);
    });
  }, []);

  const resetCountrySelection = useCallback(() => {
    setClientCountry('');
    localStorage.removeItem('openmun_last_country');
  }, []);

  const leaveRoom = useCallback(() => {
    peerService.destroy();
    setConnectionStatus('disconnected');
    setRole('none');
    setClientCountry('');
    setViewMode('chair');
  }, []);

  const sendNote = useCallback((to, text, type = 'general') => {
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ok = peerService.sendNoteAsClient(to, text, type, noteId);
    if (ok) {
      let senderName = role;
      if (role === 'backroom') {
        senderName = 'Backroom';
      } else if (role === 'secretariat' || role === 'chair') {
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
        to,
        text,
        type,
        timestamp: Date.now(),
        isOutgoing: true
      };
      setNotes(prev => {
        if (prev.some(n => n.id === noteId)) return prev;
        return [selfNote, ...prev];
      });
    }
    return ok;
  }, [clientCountry, role]);

  const broadcastAnnouncement = useCallback((annData) => {
    const ann = {
      id: annData.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: annData.title || 'Aviso Oficial',
      text: annData.text || '',
      priority: annData.priority || 'general',
      senderRole: role || 'chair',
      senderName: annData.senderName || (role === 'secretariat' ? 'Secretaría' : (role === 'staff' ? 'Staff' : 'Mesa de Presidencia')),
      timestamp: Date.now(),
      target: annData.target || 'ALL'
    };
    if (connectionStatus === 'host_active') {
      peerService.broadcastAnnouncement(ann);
    } else {
      peerService.broadcastAnnouncementAsClient(ann);
    }
    setAnnouncements(prev => [ann, ...prev.filter(a => a.id !== ann.id)]);
    addNotification('Aviso emitido con éxito', 'success');
  }, [connectionStatus, role, addNotification]);

  const deleteAnnouncement = useCallback((id) => {
    if (connectionStatus === 'host_active') {
      peerService.deleteAnnouncement(id);
    } else {
      peerService.deleteAnnouncementAsClient(id);
    }
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    addNotification('Aviso retirado', 'info');
  }, [connectionStatus, addNotification]);

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
      addNotification(`Aprobación enviada para ${req.country}`, 'info');
    }
  }, [connectionStatus, addNotification]);

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
    addNotification(`Respuesta enviada a ${pointReq.country} por nota`, 'success');
  }, [sendNote, connectionStatus, addNotification]);

  const requestFullSync = useCallback(() => {
    if (connectionStatus === 'connected') {
      peerService.requestFullSyncAsClient();
      addNotification('Sincronización solicitada a la Presidencia', 'info');
    }
  }, [connectionStatus, addNotification]);

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
    addNotification('Solicitud rechazada', 'info');
  }, [connectionStatus, addNotification]);

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
    if (connectionStatus === 'host_active') {
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

  const submitAmendment = useCallback((amendmentData) => {
    const formatted = {
      ...amendmentData,
      paisProponente: amendmentData.paisProponente || clientCountry || 'Delegación',
      timestamp: Date.now()
    };
    if (connectionStatus === 'connected' && role === 'delegate') {
      peerService.submitAmendmentAsClient(formatted);
      addNotification('Propuesta de enmienda enviada a la Presidencia', 'success');
    } else {
      // Si somos Host / modo local
      setEnmiendasPropuestas(prev => [formatted, ...prev]);
      addNotification('Enmienda registrada en bandeja de propuestas', 'info');
    }
  }, [connectionStatus, role, clientCountry, addNotification]);

  const eliminarEnmiendaPropuesta = useCallback((propId) => {
    setEnmiendasPropuestas(prev => prev.filter(p => p.id !== propId));
  }, []);

  const openLiveModal = useCallback(() => setIsLiveModalOpen(true), []);
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
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinRoom,
    leaveRoom,
    selectCountry,
    resetCountrySelection,
    sendNote,
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
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinRoom,
    leaveRoom,
    selectCountry,
    resetCountrySelection,
    sendNote,
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

      {/* Renderizado de Notificaciones Toasts Globales */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none'
        }}>
          {notifications.map(n => {
            const IconComponent = n.type === 'error' ? AlertCircle : (n.type === 'success' ? CheckCircle2 : (n.type === 'warning' ? AlertTriangle : Info));
            const iconColor = n.type === 'error' ? '#ef4444' : (n.type === 'success' ? '#22c55e' : (n.type === 'warning' ? '#f59e0b' : '#3b82f6'));

            return (
              <div
                key={n.id}
                style={{
                  backgroundColor: n.type === 'error' ? '#450a0a' : (n.type === 'success' ? '#052e16' : '#18181b'),
                  border: `1px solid ${n.type === 'error' ? '#ef4444' : (n.type === 'success' ? '#22c55e' : '#3f3f46')}`,
                  color: '#ffffff',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  animation: 'slideInRight 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  maxWidth: '380px'
                }}
              >
                <IconComponent size={16} color={iconColor} style={{ flexShrink: 0 }} />
                <span>{n.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </P2PContext.Provider>
  );
};

export const useP2P = () => {
  const context = useContext(P2PContext);
  if (!context) {
    throw new Error('useP2P debe ser usado dentro de un P2PProvider');
  }
  return context;
};

export default P2PContext;

