import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, AlertCircle, Info, AlertTriangle, X, Radio, EyeOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import conferenceService from '../../services/conferenceService';
import {
  formatearMensajeAviso,
  correspondeAviso,
  obtenerEtiquetaDestino,
  obtenerAvisosIgnorados,
  ignorarAviso,
  puedeBorrarAviso
} from '../../utils/announcementHelpers';

const ConferenceBanner = ({
  isLight,
  role = null,
  comiteId = null,
  comiteNombre = null,
  comites: propComites = null
}) => {
  const { t } = useTranslation();
  const [avisos, setAvisos] = useState(() => (conferenceService.obtenerAvisosEnMemoria ? conferenceService.obtenerAvisosEnMemoria() : []));
  const [comites, setComites] = useState(propComites || []);
  const [avisoActualIndex, setAvisoActualIndex] = useState(0);
  const [descartados, setDescartados] = useState(() => obtenerAvisosIgnorados());

  const effectiveComiteId = comiteId || (typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null);
  const effectiveRole = role || (typeof window !== 'undefined' ? (localStorage.getItem('openmun_user_role') || 'chair') : 'chair');
  const effectiveComiteNombre = comiteNombre || (typeof window !== 'undefined' ? (localStorage.getItem('openmun_current_comite_nombre') || localStorage.getItem('openmun_p2p_room_name')) : null);

  // Cargar comités de la conferencia si no se proporcionan por props
  useEffect(() => {
    if (propComites && propComites.length > 0) {
      setComites(propComites);
      return;
    }
    const confData = conferenceService.obtenerSesionActiva();
    if (confData?.id) {
      conferenceService.obtenerResumen(confData.id).then(res => {
        if (res?.comites && Array.isArray(res.comites)) {
          setComites(res.comites);
        }
      }).catch(() => {});
    }
  }, [propComites]);

  const fetchAvisos = useCallback(async () => {
    try {
      const confData = conferenceService.obtenerSesionActiva();
      if (!confData?.id) return;

      const res = await conferenceService.obtenerAvisos(confData.id, effectiveComiteId, effectiveRole, effectiveComiteNombre);
      if (res && Array.isArray(res.avisos)) {
        setAvisos(res.avisos);
        conferenceService.guardarAvisosEnMemoria?.(res.avisos);
      }
    } catch (e) {
      // En modo offline o sin servidor simplemente silenciar
    }
  }, [effectiveComiteId, effectiveRole, effectiveComiteNombre]);

  useEffect(() => {
    fetchAvisos();
    const interval = setInterval(fetchAvisos, 25000); // Polling regular
    return () => clearInterval(interval);
  }, [fetchAvisos]);

  // Listener para avisos que lleguen en vivo por evento custom
  useEffect(() => {
    const handleNuevoAviso = (e) => {
      if (e.detail) {
        setAvisos(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
        conferenceService.guardarAvisosEnMemoria?.([e.detail]);
      }
    };

    const handleAvisoDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisos(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };

    const handleAvisoIgnorado = (e) => {
      if (e.detail?.id) {
        setDescartados(prev => [...new Set([...prev, String(e.detail.id)])]);
      }
    };

    const handleAvisoRestaurado = (e) => {
      if (e.detail?.id) {
        setDescartados(prev => prev.filter(id => String(id) !== String(e.detail.id)));
      }
    };

    window.addEventListener('openmun_nuevo_aviso', handleNuevoAviso);
    window.addEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
    window.addEventListener('openmun_aviso_ignorado', handleAvisoIgnorado);
    window.addEventListener('openmun_aviso_restaurado', handleAvisoRestaurado);

    return () => {
      window.removeEventListener('openmun_nuevo_aviso', handleNuevoAviso);
      window.removeEventListener('openmun_aviso_desactivado', handleAvisoDesactivado);
      window.removeEventListener('openmun_aviso_ignorado', handleAvisoIgnorado);
      window.removeEventListener('openmun_aviso_restaurado', handleAvisoRestaurado);
    };
  }, []);

  const listaComitesEfectiva = (propComites && propComites.length > 0) ? propComites : comites;

  // Filtrar avisos correspondientes al rol y comité actual
  const avisosVisibles = avisos.filter(a => {
    if (!a) return false;
    if (descartados.map(String).includes(String(a.id))) return false;
    return correspondeAviso(a, {
      role: effectiveRole,
      currentComiteId: effectiveComiteId,
      currentComiteNombre: effectiveComiteNombre,
      comites: listaComitesEfectiva
    });
  });

  if (avisosVisibles.length === 0) return null;

  const aviso = avisosVisibles[avisoActualIndex % avisosVisibles.length];
  const esPropio = puedeBorrarAviso(aviso, effectiveRole);

  const handleIgnorar = () => {
    if (!aviso) return;
    ignorarAviso(aviso.id);
    setDescartados(prev => [...new Set([...prev, String(aviso.id)])]);
  };

  const handleBorrar = async () => {
    if (!aviso) return;
    const confirmacion = window.confirm(
      t('avisos.deleteNoticeConfirm', '¿Seguro que deseas borrar este aviso para toda la conferencia?')
    );
    if (!confirmacion) return;

    try {
      const confData = conferenceService.obtenerSesionActiva();
      await conferenceService.desactivarAviso(aviso.id, confData?.id);
      setAvisos(prev => prev.filter(a => String(a.id) !== String(aviso.id)));
    } catch (err) {
      alert(t('common.error', 'Error al borrar aviso: ') + err.message);
    }
  };

  const getTipoStyle = (tipo) => {
    switch (tipo) {
      case 'urgente':
        return {
          bg: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.25)',
          border: isLight ? '#fca5a5' : 'rgba(239, 68, 68, 0.6)',
          text: isLight ? '#991b1b' : '#fca5a5',
          badgeBg: '#ef4444',
          badgeText: '#ffffff',
          Icon: AlertCircle
        };
      case 'alerta':
      case 'logistica':
        return {
          bg: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.25)',
          border: isLight ? '#fcd34d' : 'rgba(245, 158, 11, 0.6)',
          text: isLight ? '#92400e' : '#fde68a',
          badgeBg: '#f59e0b',
          badgeText: '#000000',
          Icon: AlertTriangle
        };
      case 'info':
      default:
        return {
          bg: isLight ? '#e0f2fe' : 'rgba(59, 130, 246, 0.22)',
          border: isLight ? '#bae6fd' : 'rgba(59, 130, 246, 0.55)',
          text: isLight ? '#075985' : '#93c5fd',
          badgeBg: '#3b82f6',
          badgeText: '#ffffff',
          Icon: Info
        };
    }
  };

  const styleConfig = getTipoStyle(aviso.tipo);
  const IconComponent = styleConfig.Icon;
  const metaDestino = obtenerEtiquetaDestino(aviso.comite_id, listaComitesEfectiva);

  return (
    <div style={{
      width: '100%',
      backgroundColor: styleConfig.bg,
      borderBottom: `1px solid ${styleConfig.border}`,
      color: styleConfig.text,
      padding: '0.55rem 1.2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      fontSize: '0.86rem',
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      position: 'relative',
      zIndex: 100,
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, overflow: 'hidden' }}>
        <IconComponent size={18} style={{ flexShrink: 0 }} />

        {/* Badge de Emisor */}
        <span style={{
          padding: '0.15rem 0.5rem',
          borderRadius: '6px',
          backgroundColor: styleConfig.badgeBg,
          color: styleConfig.badgeText,
          fontSize: '0.72rem',
          fontWeight: '800',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0
        }}>
          {aviso.emisor || 'Aviso Oficial'}
        </span>

        {/* Badge de Destinatario si es dirigido */}
        {aviso.comite_id && aviso.comite_id !== 'GLOBAL' && (
          <span style={{
            padding: '0.12rem 0.45rem',
            borderRadius: '6px',
            backgroundColor: metaDestino.badgeBg,
            color: metaDestino.badgeColor,
            border: `1px solid ${metaDestino.badgeBorder}`,
            fontSize: '0.7rem',
            fontWeight: '800',
            flexShrink: 0
          }}>
            Para: {metaDestino.shortLabel}
          </span>
        )}

        {/* Mensaje formateado */}
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1
        }}>
          {formatearMensajeAviso(aviso.mensaje, null, comites)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {avisosVisibles.length > 1 && (
          <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
            {(avisoActualIndex % avisosVisibles.length) + 1}/{avisosVisibles.length}
          </span>
        )}

        {avisosVisibles.length > 1 && (
          <button
            onClick={() => setAvisoActualIndex(prev => prev + 1)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: '0.75rem',
              fontWeight: '700',
              textDecoration: 'underline'
            }}
          >
            Siguiente
          </button>
        )}

        {/* Botón Eliminar: solo si lo envió el usuario actual o tiene rol secretaría/admin */}
        {esPropio && (
          <button
            onClick={handleBorrar}
            title={t('avisos.deleteNoticeTooltip', 'Eliminar aviso para toda la conferencia')}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.55)',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '0.2rem 0.55rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: '800',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={13} />
            <span>{t('avisos.deleteNotice', 'Eliminar')}</span>
          </button>
        )}

        {/* Botón Descartar: disponible para cualquier persona para ocultarlo de su vista */}
        <button
          onClick={handleIgnorar}
          title={t('avisos.dismissTooltip', 'Descartar este aviso (ocultarlo de tu vista)')}
          style={{
            background: 'rgba(0, 0, 0, 0.08)',
            border: '1px solid currentColor',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0.2rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: '700',
            opacity: 0.9,
            transition: 'all 0.15s ease'
          }}
        >
          <EyeOff size={13} />
          <span>{t('avisos.dismiss', 'Descartar')}</span>
        </button>
      </div>
    </div>
  );
};

export default ConferenceBanner;
