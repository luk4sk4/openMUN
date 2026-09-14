/**
 * Utilidades de Sincronización Diferencial (Delta Sync) para openMUN.
 * Permite calcular únicamente los cambios puntuales (diffs) entre dos estados de sesión,
 * reduciendo el consumo de red en hasta un 99% por actualización.
 */

/**
 * Compara recursivamente dos objetos/arrays y devuelve un mapa plano de propiedades modificadas.
 * Las claves del diff utilizan notación de puntos (ej: "votacionSesion.votos.pais-1").
 * 
 * @param {Object} oldState - Estado anterior
 * @param {Object} newState - Estado nuevo
 * @param {string} prefix - Prefijo interno para notación de puntos
 * @returns {Object} Mapa de diferencias { "path.a.prop": nuevoValor }
 */
export function createStateDelta(oldState, newState, prefix = '') {
  if (oldState === newState) return {};

  if (!oldState || !newState || typeof oldState !== 'object' || typeof newState !== 'object') {
    return { [prefix]: newState };
  }

  // Si los tipos difieren (array vs objeto plano), reemplazar directamente
  const oldIsArray = Array.isArray(oldState);
  const newIsArray = Array.isArray(newState);
  if (oldIsArray !== newIsArray) {
    return { [prefix]: newState };
  }

  const diff = {};

  // Recorrer las claves del nuevo estado
  for (const key of Object.keys(newState)) {
    const currentPrefix = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldState[key];
    const newVal = newState[key];

    if (oldVal === newVal) continue;

    if (
      oldVal !== null &&
      newVal !== null &&
      typeof oldVal === 'object' &&
      typeof newVal === 'object'
    ) {
      // Comparación profunda
      const nestedDiff = createStateDelta(oldVal, newVal, currentPrefix);
      Object.assign(diff, nestedDiff);
    } else {
      diff[currentPrefix] = newVal;
    }
  }

  // Detectar claves o elementos eliminados
  for (const key of Object.keys(oldState)) {
    if (!(key in newState)) {
      const currentPrefix = prefix ? `${prefix}.${key}` : key;
      diff[currentPrefix] = '__OPENMUN_DELETED__';
    }
  }

  return diff;
}

/**
 * Aplica un mapa de diferencias (delta diff) sobre un objeto de estado existente.
 * Retorna un nuevo objeto inmutable con las mutaciones aplicadas.
 * 
 * @param {Object} currentState - Estado actual en el cliente
 * @param {Object} diff - Mapa de diferencias con notación de puntos
 * @returns {Object} Estado actualizado
 */
export function applyStateDelta(currentState, diff) {
  if (!currentState || typeof currentState !== 'object') return currentState;
  if (!diff || typeof diff !== 'object' || Object.keys(diff).length === 0) return currentState;

  // Clonar superficialmente la raíz para inmutabilidad de React
  let updatedState = Array.isArray(currentState) ? [...currentState] : { ...currentState };

  for (const [path, value] of Object.entries(diff)) {
    const keys = path.split('.');
    
    // Navegar y clonar la ruta hasta la penúltima clave
    let curr = updatedState;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!curr[k] || typeof curr[k] !== 'object') {
        // Si no existe el nivel intermedio, crearlo según el siguiente segmento
        const nextKeyIsNum = !isNaN(Number(keys[i + 1]));
        curr[k] = nextKeyIsNum ? [] : {};
      } else {
        // Clonar para preservar inmutabilidad
        curr[k] = Array.isArray(curr[k]) ? [...curr[k]] : { ...curr[k] };
      }
      curr = curr[k];
    }

    const lastKey = keys[keys.length - 1];
    if (value === '__OPENMUN_DELETED__') {
      if (Array.isArray(curr)) {
        const index = Number(lastKey);
        if (!isNaN(index)) curr.splice(index, 1);
      } else {
        delete curr[lastKey];
      }
    } else {
      curr[lastKey] = value;
    }
  }

  return updatedState;
}
