import React from 'react';
import { Globe, Users, Shield, Landmark, MessageSquare, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Constantes y definiciones de destinos para avisos
 */
export const CODIGOS_DESTINO = {
  GLOBAL: 'GLOBAL',
  SECRETARIA: 'SECRETARIA',
  STAFF_ALL: 'STAFF_ALL',
  CHAIRS_ALL: 'CHAIRS_ALL'
};

/**
 * Genera la lista completa y estructurada de destinatarios disponibles
 * agrupada de forma lógica para su uso en selectores de cualquier vista.
 *
 * @param {Array} comites - Lista de comités activos en la conferencia
 * @param {string} rolActual - Rol del emisor ('chair'|'staff'|'staff_global'|'secretaria'|'organizacion')
 * @param {string} currentComiteId - ID del comité actual si aplica
 */
export const obtenerOpcionesDestino = (comites = [], rolActual = 'mesa', currentComiteId = null) => {
  const opcionesGenerales = [
    { value: 'GLOBAL', label: '📢 Toda la Conferencia (Global)', icon: Globe },
    { value: 'SECRETARIA', label: '🛡️ Organización / Secretaría General', icon: Shield },
    { value: 'STAFF_ALL', label: '👥 Todo el Equipo de Staff', icon: Users },
    { value: 'CHAIRS_ALL', label: '🏛️ Todas las Mesas Directivas', icon: Landmark }
  ];

  // Si el emisor está en un comité, añadir accesos rápidos locales
  const opcionesLocales = [];
  if (currentComiteId) {
    const comiteActual = comites.find(c => String(c.id).toLowerCase() === String(currentComiteId).toLowerCase());
    const comiteNombre = comiteActual?.nombre || currentComiteId;

    if (rolActual === 'chair' || rolActual === 'mesa') {
      opcionesLocales.push({
        value: `STAFF_COMITE_${currentComiteId}`,
        label: `👥 Staff Asignado a mi Sala (${comiteNombre})`
      });
      opcionesLocales.push({
        value: currentComiteId,
        label: `🌐 Mi Comité Completo (${comiteNombre})`
      });
    } else if (rolActual === 'staff') {
      opcionesLocales.push({
        value: `CHAIR_${currentComiteId}`,
        label: `🏛️ Mesa Directiva de mi Sala (${comiteNombre})`
      });
      opcionesLocales.push({
        value: currentComiteId,
        label: `🌐 Mi Comité Completo (${comiteNombre})`
      });
    }
  }

  // Grupos por cada comité de la conferencia
  const gruposMesas = (comites || []).map(c => ({
    value: `CHAIR_${c.id}`,
    comiteId: c.id,
    label: `🏛️ Mesa de ${c.nombre || c.id}`
  }));

  const gruposStaff = (comites || []).map(c => ({
    value: `STAFF_COMITE_${c.id}`,
    comiteId: c.id,
    label: `👥 Staff de ${c.nombre || c.id}`
  }));

  const gruposSalas = (comites || []).map(c => ({
    value: c.id,
    comiteId: c.id,
    label: `🌐 Sala Completa de ${c.nombre || c.id}`
  }));

  return {
    opcionesGenerales,
    opcionesLocales,
    gruposMesas,
    gruposStaff,
    gruposSalas
  };
};

/**
 * Obtiene la etiqueta descriptiva, icono y colores asociados a un código de destino.
 *
 * @param {string} comiteId - El código guardado en el aviso (`comite_id`)
 * @param {Array} comites - Lista de comités de la conferencia
 */
export const obtenerEtiquetaDestino = (comiteId, comites = []) => {
  if (!comiteId || comiteId === 'GLOBAL' || comiteId === '') {
    return {
      label: 'Toda la Conferencia',
      shortLabel: 'Global',
      icon: Globe,
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      badgeColor: '#3b82f6',
      badgeBorder: 'rgba(59, 130, 246, 0.35)'
    };
  }

  const clean = String(comiteId).trim();

  if (clean === 'SECRETARIA' || clean === 'ORGANIZACION') {
    return {
      label: 'Organización / Secretaría',
      shortLabel: 'Organización',
      icon: Shield,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeColor: '#8b5cf6',
      badgeBorder: 'rgba(139, 92, 246, 0.35)'
    };
  }

  if (clean === 'STAFF_ALL') {
    return {
      label: 'Todo el Staff',
      shortLabel: 'Todo Staff',
      icon: Users,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#f59e0b',
      badgeBorder: 'rgba(245, 158, 11, 0.35)'
    };
  }

  if (clean === 'CHAIRS_ALL') {
    return {
      label: 'Todas las Mesas',
      shortLabel: 'Todas Mesas',
      icon: Landmark,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#10b981',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }

  if (clean.startsWith('STAFF_COMITE_') || clean.startsWith('STAFF_')) {
    const rawId = clean.replace('STAFF_COMITE_', '').replace('STAFF_', '');
    const comite = comites.find(c => String(c.id).toLowerCase() === rawId.toLowerCase());
    const nombre = comite?.nombre || rawId;
    return {
      label: `Staff de ${nombre}`,
      shortLabel: `Staff (${nombre})`,
      icon: Users,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#f59e0b',
      badgeBorder: 'rgba(245, 158, 11, 0.35)'
    };
  }

  if (clean.startsWith('CHAIR_') || clean.startsWith('MESA_')) {
    const rawId = clean.replace('CHAIR_', '').replace('MESA_', '');
    const comite = comites.find(c => String(c.id).toLowerCase() === rawId.toLowerCase());
    const nombre = comite?.nombre || rawId;
    return {
      label: `Mesa de ${nombre}`,
      shortLabel: `Mesa (${nombre})`,
      icon: Landmark,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#10b981',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }

  // Si es un ID directo de comité (ej: 'c1' o 'COMITE_c1')
  const rawId = clean.replace('COMITE_', '');
  const comite = comites.find(c => String(c.id).toLowerCase() === rawId.toLowerCase());
  const nombre = comite?.nombre || rawId;

  return {
    label: `Sala de ${nombre}`,
    shortLabel: nombre,
    icon: Globe,
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeColor: '#3b82f6',
    badgeBorder: 'rgba(59, 130, 246, 0.35)'
  };
};

/**
 * Parsea el texto del mensaje buscando patrones de destinatario al inicio como `[Para X]`, `[Para Todo Staff]`, etc.
 * Retorna un componente con el tag estilizado como badge y el resto del texto formateado.
 *
 * @param {string} mensaje - El texto del mensaje recibido
 * @param {string} comiteId - Destino guardado en el aviso si no hay tag en el texto
 * @param {Array} comites - Lista de comités
 */
export const formatearMensajeAviso = (mensaje, comiteId = null, comites = []) => {
  if (!mensaje || typeof mensaje !== 'string') return mensaje;

  // Coincide con [Para ...] o [PARA ...] al inicio del mensaje
  const match = mensaje.match(/^(\[(?:Para|PARA|para)\s+([^\]]+)\])\s*(.*)/s);

  if (match) {
    const [_, fullTag, targetName, contenidoRestante] = match;
    const targetClean = targetName.trim();
    const targetLower = targetClean.toLowerCase();

    let badgeBg = 'rgba(59, 130, 246, 0.15)';
    let badgeColor = '#3b82f6';
    let badgeBorder = 'rgba(59, 130, 246, 0.35)';

    if (targetLower.includes('urgente') || targetLower.includes('alerta') || targetLower.includes('seguridad')) {
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeColor = '#ef4444';
      badgeBorder = 'rgba(239, 68, 68, 0.35)';
    } else if (targetLower.includes('staff') || targetLower.includes('logistica') || targetLower.includes('logística')) {
      badgeBg = 'rgba(245, 158, 11, 0.15)';
      badgeColor = '#f59e0b';
      badgeBorder = 'rgba(245, 158, 11, 0.35)';
    } else if (targetLower.includes('secretar') || targetLower.includes('organizac') || targetLower.includes('presidencia')) {
      badgeBg = 'rgba(139, 92, 246, 0.15)';
      badgeColor = '#a855f7';
      badgeBorder = 'rgba(139, 92, 246, 0.35)';
    }

    return (
      <div style={{ display: 'inline', wordBreak: 'break-word' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '0.12rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            marginRight: '0.45rem',
            letterSpacing: '0.02em',
            verticalAlign: 'baseline',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <span style={{ opacity: 0.75, fontWeight: '600' }}>Para:</span>
          <span>{targetClean}</span>
        </span>
        <span>{contenidoRestante}</span>
      </div>
    );
  }

  // Si no tiene tag en texto pero tiene un comiteId específico que no es global
  if (comiteId && comiteId !== 'GLOBAL') {
    const meta = obtenerEtiquetaDestino(comiteId, comites);
    return (
      <div style={{ display: 'inline', wordBreak: 'break-word' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '0.12rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: meta.badgeBg,
            color: meta.badgeColor,
            border: `1px solid ${meta.badgeBorder}`,
            marginRight: '0.45rem',
            letterSpacing: '0.02em',
            verticalAlign: 'baseline',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <span style={{ opacity: 0.75, fontWeight: '600' }}>Para:</span>
          <span>{meta.shortLabel}</span>
        </span>
        <span>{mensaje}</span>
      </div>
    );
  }

  return <span>{mensaje}</span>;
};

/**
 * Filtra si un aviso de Base de Datos le corresponde a la entidad/rol actual.
 *
 * @param {object} aviso - Objeto de aviso desde la base de datos
 * @param {object} context - Contexto del visor { role: 'secretaria'|'staff'|'staff_global'|'chair'|'delegate', currentComiteId: string }
 * @returns {boolean}
 */
export const correspondeAviso = (aviso, { role = 'staff', currentComiteId = null } = {}) => {
  if (!aviso) return false;

  // 1. La Secretaría General / Organización siempre ve TODO
  if (role === 'secretaria' || role === 'organizacion' || role === 'admin') {
    return true;
  }

  const comiteId = aviso.comite_id ? String(aviso.comite_id).trim() : '';
  const comiteUpper = comiteId.toUpperCase();
  const currentClean = currentComiteId ? String(currentComiteId).trim().toLowerCase() : '';

  // 2. Mensajes Globales (sin comite_id o 'GLOBAL') -> Llegan a todos
  if (!comiteId || comiteUpper === 'GLOBAL') {
    return true;
  }

  // 3. Si el rol es STAFF GLOBAL / Staff de Conferencia
  if (role === 'staff_global') {
    // Ve todo lo relativo a Staff
    if (comiteUpper === 'STAFF_ALL' || comiteUpper.startsWith('STAFF_')) {
      return true;
    }
    // Si tiene sala asignada, avisos directos a su sala
    if (currentClean && (comiteId.toLowerCase() === currentClean || comiteId.toLowerCase() === `comite_${currentClean}`)) {
      return true;
    }
    // No debe ver avisos específicos para mesas directivas ni de secretaría
    return false;
  }

  // 4. Si el rol es STAFF de un comité
  if (role === 'staff') {
    // Aviso general para todo el equipo de Staff
    if (comiteUpper === 'STAFF_ALL') return true;

    // Aviso para el staff de una sala específica
    if (currentClean && currentClean !== 'todos') {
      if (comiteId.toLowerCase() === currentClean) return true;
      if (comiteId.toLowerCase() === `comite_${currentClean}`) return true;
      if (comiteId.toLowerCase() === `staff_${currentClean}`) return true;
      if (comiteId.toLowerCase() === `staff_comite_${currentClean}`) return true;
    } else {
      // Si no tiene sala fija asignada (o filtro TODOS), ve cualquier requerimiento dirigido a staff
      if (comiteUpper.startsWith('STAFF_')) return true;
    }

    // El staff nunca ve avisos exclusivos para mesas directivas ni de secretaría
    return false;
  }

  // 5. Si el rol es CHAIR / MESA DIRECTIVA de un comité
  if (role === 'chair' || role === 'mesa') {
    // Las mesas NUNCA deben ver avisos dirigidos a Staff ni a Secretaría
    if (comiteUpper === 'STAFF_ALL' || comiteUpper.startsWith('STAFF_')) {
      return false;
    }
    if (comiteUpper === 'SECRETARIA' || comiteUpper === 'ORGANIZACION') {
      return false;
    }

    // Avisos dirigidos a todas las mesas
    if (comiteUpper === 'CHAIRS_ALL') return true;

    // Avisos dirigidos a su propia mesa o comité
    if (currentClean && currentClean !== 'todos') {
      if (comiteId.toLowerCase() === currentClean) return true;
      if (comiteId.toLowerCase() === `comite_${currentClean}`) return true;
      if (comiteId.toLowerCase() === `chair_${currentClean}`) return true;
      if (comiteId.toLowerCase() === `mesa_${currentClean}`) return true;
    }

    // Bloquear avisos de otras mesas y de otros comités
    return false;
  }

  // 6. Si el rol es DELEGATE de un comité
  if (role === 'delegate') {
    // Los delegados no ven avisos internos de staff, mesas o secretaría
    if (comiteUpper === 'STAFF_ALL' || comiteUpper.startsWith('STAFF_')) return false;
    if (comiteUpper === 'CHAIRS_ALL' || comiteUpper.startsWith('CHAIR_') || comiteUpper.startsWith('MESA_')) return false;
    if (comiteUpper === 'SECRETARIA' || comiteUpper === 'ORGANIZACION') return false;

    if (currentClean && currentClean !== 'todos') {
      if (comiteId.toLowerCase() === currentClean) return true;
      if (comiteId.toLowerCase() === `comite_${currentClean}`) return true;
    }
    return false;
  }

  // Usuarios generales o preliminares (solo ven comunicados globales)
  return false;
};
