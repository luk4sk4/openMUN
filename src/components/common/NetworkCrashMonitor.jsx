import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';
import { useSession } from '../../context/SessionContext';
import { useP2P } from '../../context/P2PContext';
import { googleDriveService } from '../../services/googleDriveService';
import conferenceService from '../../services/conferenceService';

const TOAST_OFFLINE_ID = 'openmun_network_offline_alert';

/**
 * NetworkCrashMonitor
 * Monitorea el estado de la conexión a internet. Si el usuario utiliza funciones
 * que requieren red (Google Drive, Conferencia, Sesión en Vivo con delegados) y la red se cae,
 * muestra un toast interactivo contextual advirtiendo que la app seguirá funcionando offline
 * y ofreciendo descargar el archivo de respaldo.
 */
export const NetworkCrashMonitor = () => {
  const { t } = useTranslation();
  const { addToast, removeToast } = useToast();
  const { isDriveLinked, descargarSesionJSON, sincronizarDriveManual } = useSession();
  const { viewMode, connectionStatus, connectedPeers, roomId, role } = useP2P();

  // 1. Google Drive vinculado o sesión autenticada activa
  const hasDrive = Boolean(isDriveLinked || googleDriveService.isAuthenticated());

  // 2. Participando o moderando una conferencia
  const inConference = Boolean(
    viewMode === 'conference' ||
    conferenceService.obtenerSesionActiva()?.id ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('openmun_current_conf_id') ||
      localStorage.getItem('openmun_active_conference')
    ))
  );

  // 3. Sesión en vivo activa (con delegados conectados, como host, en sala o reconectando)
  const hasLive = Boolean(
    connectionStatus === 'host_active' ||
    connectionStatus === 'connected' ||
    connectionStatus === 'reconnecting' ||
    (Array.isArray(connectedPeers) && connectedPeers.length > 0) ||
    Boolean(roomId && role && role !== 'none') ||
    Boolean(peerService && (peerService.isHost || peerService.socket || peerService.roomId))
  );

  // El usuario requiere red si utiliza alguna de estas 3 características
  const needsNetwork = hasDrive || inConference || hasLive;

  // Mantener referencia actualizada a todos los estados para los event listeners del DOM
  const stateRef = useRef({
    hasDrive,
    inConference,
    hasLive,
    needsNetwork,
    viewMode,
    descargarSesionJSON,
    sincronizarDriveManual
  });

  useEffect(() => {
    stateRef.current = {
      hasDrive,
      inConference,
      hasLive,
      needsNetwork,
      viewMode,
      descargarSesionJSON,
      sincronizarDriveManual
    };
  }, [hasDrive, inConference, hasLive, needsNetwork, viewMode, descargarSesionJSON, sincronizarDriveManual]);

  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleNetworkLost = () => {
      const current = stateRef.current;
      wasOfflineRef.current = true;

      // Construcción del mensaje según el contexto activo
      const messageParts = [];

      if (current.inConference) {
        messageParts.push(
          t(
            'toast.networkCrashConference',
            'Conexión con la conferencia perdida. Se guardará la sesión cuando se recupere la conexión. Si no, se recomienda descargar el archivo'
          )
        );
      }

      if (current.hasLive) {
        messageParts.push(
          t('toast.networkCrashLive', 'Conexión con los delegados caída')
        );
      }

      if (current.hasDrive) {
        messageParts.push(
          t(
            'toast.networkCrashDrive',
            'Para guardar la sesión sin conexión y moverla a otro ordenador, descarga el archivo'
          )
        );
      }

      // Si no usa Drive, conferencia ni sala en vivo, mostrar mensaje tranquilizador
      if (messageParts.length === 0) {
        messageParts.push(
          t(
            'toast.networkCrashGeneral',
            'Se ha perdido la conexión a internet. OpenMUN continuará funcionando con normalidad en modo local.'
          )
        );
      }

      const toastMessage = messageParts.join('\n\n');

      // Botón de acción para descargar la sesión o la conferencia directamente
      const downloadAction = (current.hasDrive || current.inConference || current.hasLive) ? {
        label: t('toast.networkCrashDownloadBtn', 'Descargar archivo'),
        onClick: () => {
          if (current.viewMode === 'conference') {
            window.dispatchEvent(new CustomEvent('openmun_export_conference_request'));
          } else if (typeof current.descargarSesionJSON === 'function') {
            current.descargarSesionJSON();
          }
        }
      } : null;

      addToast({
        id: TOAST_OFFLINE_ID,
        type: 'warning',
        title: t('toast.networkCrashTitle', 'Conexión perdida, la aplicación seguirá funcionando'),
        message: toastMessage,
        duration: 16000,
        action: downloadAction,
        isLarge: true
      });
    };

    const handleNetworkRestored = () => {
      // Si existía alerta de desconexión, la descartamos
      removeToast(TOAST_OFFLINE_ID);

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        const current = stateRef.current;

        addToast({
          type: 'success',
          title: t('toast.networkRestoredTitle', 'Conexión restablecida'),
          message: t('toast.networkRestoredDesc', 'Se ha restablecido la conexión a internet.'),
          duration: 4500
        });

        // Si tiene Google Drive vinculado, intentar sincronizar en segundo plano
        if (current.hasDrive && typeof current.sincronizarDriveManual === 'function') {
          current.sincronizarDriveManual(false).catch(() => {});
        }
      }
    };

    // Comprobación inmediata al montar
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleNetworkLost();
    }

    // Intervalo de seguridad para detectar caídas de red si el evento offline del navegador no se dispara
    const probeInterval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        if (!navigator.onLine && !wasOfflineRef.current) {
          handleNetworkLost();
        } else if (navigator.onLine && wasOfflineRef.current && (!stateRef.current.hasLive || connectionStatus !== 'reconnecting')) {
          handleNetworkRestored();
        }
      }
    }, 2500);

    window.addEventListener('offline', handleNetworkLost);
    window.addEventListener('online', handleNetworkRestored);
    window.addEventListener('openmun_network_failure', handleNetworkLost);
    window.addEventListener('openmun_network_restored', handleNetworkRestored);

    return () => {
      clearInterval(probeInterval);
      window.removeEventListener('offline', handleNetworkLost);
      window.removeEventListener('online', handleNetworkRestored);
      window.removeEventListener('openmun_network_failure', handleNetworkLost);
      window.removeEventListener('openmun_network_restored', handleNetworkRestored);
    };
  }, [addToast, removeToast, connectionStatus, t]);

  return null;
};

export default NetworkCrashMonitor;
