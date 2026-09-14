import { useEffect } from 'react';
import { getFlagEmoji } from '../utils/flags';

/**
 * Hook para gestionar el registro de handlers P2P y la emisión automática del estado de la sesión
 */
export function useDashboardP2P({ session, p2p }) {
  const {
    paises,
    oradoresCola,
    oradoresCaucus,
    caucusActivo,
    votacionSesion,
    mociones,
    enmiendasSesion,
    agendaSesion,
    nombreComite,
    agregarOrador,
    agregarOradorCaucus,
    agregarMocion,
    registrarVotoPais,
    ejecutarAccion,
    aplicarEstadoExterno
  } = session;

  const {
    registerSessionHandlers,
    broadcastCurrentState,
    roomSettings,
    speakingRequests
  } = p2p;

  // Registrar handlers de sesión para solicitudes P2P automáticas, acciones remotas y sincronización
  useEffect(() => {
    if (!registerSessionHandlers) return;

    registerSessionHandlers({
      onAddSpeakerGSL: (pais) => {
        const countryName = typeof pais === 'string' ? pais : pais?.nombre;
        const match = paises?.find(p => p.nombre?.toLowerCase() === countryName?.toLowerCase());
        agregarOrador(match || pais);
      },
      onAddSpeakerCaucus: (pais) => {
        const countryName = typeof pais === 'string' ? pais : pais?.nombre;
        const match = paises?.find(p => p.nombre?.toLowerCase() === countryName?.toLowerCase());
        agregarOradorCaucus(match || pais);
      },
      onAddMotion: (mocion) => {
        const match = paises?.find(p => p.nombre?.toLowerCase() === mocion.proponente?.toLowerCase());
        agregarMocion({
          ...mocion,
          bandera: match?.bandera || mocion.bandera || getFlagEmoji(null, mocion.proponente)
        });
      },
      onCastVote: (country, vote) => registrarVotoPais(country, vote),
      onSessionAction: (accion, payload) => ejecutarAccion(accion, payload),
      onSyncState: (state) => aplicarEstadoExterno(state)
    });
  }, [
    registerSessionHandlers,
    agregarOrador,
    agregarOradorCaucus,
    agregarMocion,
    registrarVotoPais,
    ejecutarAccion,
    aplicarEstadoExterno,
    paises
  ]);

  // Sincronizar estado automáticamente a todos los peers conectados si el Chair está emitiendo
  useEffect(() => {
    if (!broadcastCurrentState) return;

    broadcastCurrentState({
      comision: nombreComite || 'Asamblea General - openMUN',
      paises,
      oradoresCola,
      oradoresCaucus,
      mociones,
      caucusActivo,
      agendaSesion,
      nombreComite,
      votacionSesion,
      enmiendasSesion,
      roomSettings,
      speakingRequests
    });
  }, [
    broadcastCurrentState,
    paises,
    oradoresCola,
    oradoresCaucus,
    mociones,
    caucusActivo,
    agendaSesion,
    nombreComite,
    votacionSesion,
    enmiendasSesion,
    roomSettings,
    speakingRequests
  ]);
}

export default useDashboardP2P;
