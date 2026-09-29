import React from 'react';
import CentroMensajeriaModal from '../messaging/CentroMensajeriaModal';

/**
 * AvisosModal - Conector y envoltorio unificado hacia CentroMensajeriaModal
 * Garantiza total retrocompatibilidad con las invocaciones existentes del Dashboard y Command Palette.
 */
const AvisosModal = ({
  isOpen,
  onClose,
  isLight,
  currentRole = 'chair',
  currentComiteId = null,
  currentComiteNombre = null,
  conferenciaId = null,
  comites = [],
  initialTab = 'COMITE',
  onAvisoCreado
}) => {
  return (
    <CentroMensajeriaModal
      isOpen={isOpen}
      onClose={onClose}
      isLight={isLight}
      initialTab={initialTab}
      currentRole={currentRole}
      currentComiteId={currentComiteId}
      currentComiteNombre={currentComiteNombre}
      conferenciaId={conferenciaId}
      comites={comites}
    />
  );
};

export default AvisosModal;
