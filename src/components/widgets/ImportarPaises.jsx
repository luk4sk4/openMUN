import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  ClipboardPaste,
  UserPlus,
  Trash2,
  Crown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Globe2,
  Sparkles,
  X,
  Camera,
  Image as ImageIcon,
  Edit2,
  Plus,
  Clock,
  Search,
  Download,
  ArrowUpDown,
  Check,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import {
  normalizarBandera,
  procesarImagenBandera,
  DICCIONARIO_PAISES_ISO
} from '../../utils/flags';
import { PLANTILLAS_PAISES } from '../../plantillas/paises';
import { normalizarDatosComite } from '../../utils/sessionValidator';

const P5_SET = new Set([
  'estados unidos', 'eeuu', 'usa', 'united states', 'ee.uu.',
  'reino unido', 'uk', 'united kingdom', 'gran bretaña', 'gran bretana',
  'francia', 'france',
  'rusia', 'federacion rusa', 'federación rusa', 'russia',
  'china'
]);

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function autodetectarBanderaYVeto(nombre) {
  const norm = normalizarTexto(nombre);
  const bandera = normalizarBandera('', nombre);
  const veto = P5_SET.has(norm);
  return { bandera, veto };
}

// ── Funciones detectoras de columnas para ignorar datos no requeridos ────────
function esHeaderPais(header) {
  const norm = normalizarTexto(header);
  // Si dice expresamente delegado (sin decir pais/country), alumno, estudiante, email, colegio, comite, etc., descartar
  if (/(?:^|\s)(delegad[oa]s?|alumn[oa]s?|estudiantes?|students?|personas?|representantes?|participantes?|correo|email|colegio|school|comit[eé])(?:\s|$)/i.test(norm) && !/(?:pais|pa[ií]s|country)/i.test(norm)) {
    return false;
  }
  return /\b(pais|pa[ií]s|pa[ií]ses|country|countries|delegaci[oó]n|delegaciones|delegation|delegations|estado|estados|state|states|naci[oó]n|naciones|nation|nations|representaci[oó]n)\b/i.test(norm) ||
         /(?:nombre\s*(?:del\s*)?)?(?:pais|pa[ií]s|country)/i.test(norm);
}

function esHeaderDelegadoONombre(header) {
  const norm = normalizarTexto(header);
  // Si ya es un header de país (ej. "Nombre del País", "País asignado"), NO es delegado/nombre de persona
  if (esHeaderPais(header)) {
    return false;
  }
  return /delegad|alumno|estudiante|student|persona|representante|participant|asistente|nombre|name/i.test(norm);
}

function esHeaderNombreGenerico(header) {
  const norm = normalizarTexto(header);
  if (/delegad|alumno|estudiante|student|persona|representante|participant|asistente|email|correo|mail|comit|coleg|escuela|school|observa|nota|rol|cargo/i.test(norm)) {
    return false;
  }
  return /^(nombre|name|delegaciones|countries|pa[ií]ses)$/i.test(norm) || /nombre\s*(del\s*)?(pais|pa[ií]s|country|estado)/i.test(norm);
}

function esHeaderBandera(header) {
  const norm = normalizarTexto(header);
  return /bandera|flag|iso|c[oó]digo|code|emoji|imagen|image|avatar|icono|icon/i.test(norm);
}

function esHeaderVeto(header) {
  const norm = normalizarTexto(header);
  return /veto|p5|perm|permanente|permanent|derecho\s*a\s*veto|poder\s*de\s*veto/i.test(norm);
}

function esCeldaBandera(val) {
  if (!val) return false;
  const str = String(val).trim();
  if (/^[a-zA-Z]{2}$/.test(str)) return true; // Código ISO
  if (/^https?:\/\//i.test(str) || /^data:image\//i.test(str)) return true; // URL o base64
  // Emoji de bandera
  if (emojiToIso(str)) return true;
  return false;
}

// Analiza una tabla o matriz para determinar qué columnas contienen el País, Delegado, Bandera y Veto
function detectarColumnasTabla(filas) {
  if (!filas || filas.length === 0) return { colPais: 0, colVeto: -1, colBandera: -1, colDelegado: -1, filaInicio: 0 };
  const maxCols = Math.max(...filas.map(r => Array.isArray(r) ? r.length : 0));
  if (maxCols <= 1) return { colPais: 0, colVeto: -1, colBandera: -1, colDelegado: -1, filaInicio: 0 };

  // 1. Buscar si en las primeras 10 filas hay una fila con cabecera explícita
  const limiteCabecera = Math.min(filas.length, 10);
  for (let rIdx = 0; rIdx < limiteCabecera; rIdx++) {
    const r = filas[rIdx];
    if (!Array.isArray(r)) continue;

    // Si la fila sólo tiene 1 celda con contenido y la tabla tiene 2 o más columnas, suele ser un título superior
    const celdasLlenas = r.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (celdasLlenas.length <= 1 && maxCols > 1) continue;

    const indicesPais = [];
    const indicesNombre = [];
    let idxVeto = -1;
    let idxBandera = -1;

    r.forEach((cell, cIdx) => {
      const val = String(cell ?? '').trim();
      if (!val) return;
      if (esHeaderPais(val)) {
        indicesPais.push(cIdx);
      } else if (esHeaderDelegadoONombre(val)) {
        indicesNombre.push(cIdx);
      }
      if (esHeaderVeto(val)) idxVeto = cIdx;
      if (esHeaderBandera(val)) idxBandera = cIdx;
    });

    // Si encontramos una columna explícita de PAÍS
    if (indicesPais.length > 0) {
      const colPais = indicesPais[0];
      // Si hay columna NOMBRE o DELEGADO, se asume que es el nombre del delegado y no del país
      const colDelegado = indicesNombre.find(idx => idx !== colPais) ?? -1;
      return {
        colPais,
        colVeto: idxVeto !== colPais ? idxVeto : -1,
        colBandera: idxBandera !== colPais ? idxBandera : -1,
        colDelegado,
        filaInicio: rIdx + 1
      };
    }

    // Si no hay columna 'PAIS', pero hay columna NOMBRE genérica junto con veto o bandera u otros headers MUN
    if (indicesNombre.length > 0 && (idxVeto >= 0 || idxBandera >= 0 || r.some(c => esHeaderNombreGenerico(c)))) {
      return {
        colPais: indicesNombre[0],
        colVeto: idxVeto,
        colBandera: idxBandera,
        colDelegado: -1,
        filaInicio: rIdx + 1
      };
    }
  }

  // 2. Si no hay fila de cabecera clara, detección por scoring estadístico de celdas
  const scorePais = new Array(maxCols).fill(0);
  const scoreVeto = new Array(maxCols).fill(0);
  const scoreBandera = new Array(maxCols).fill(0);

  filas.forEach(r => {
    if (!Array.isArray(r)) return;
    r.forEach((cell, colIdx) => {
      const val = String(cell ?? '').trim();
      if (!val) return;
      const norm = normalizarTexto(val);
      if (DICCIONARIO_PAISES_ISO[norm] !== undefined || P5_SET.has(norm)) {
        scorePais[colIdx] += 4; // Fuerte preferencia para países reconocidos en diccionario
      } else if (!/^\d+$/.test(val) && !/@/.test(val) && !/^(true|false|si|no)$/i.test(val) && val.length > 2) {
        scorePais[colIdx] += 1;
      }
      if (/^(true|false|si|sí|no|yes|p5|p-5)$/i.test(val)) {
        scoreVeto[colIdx] += 3;
      }
      if (esCeldaBandera(val)) {
        scoreBandera[colIdx] += 3;
      }
    });
  });

  let colPais = 0, maxP = -1;
  scorePais.forEach((s, idx) => { if (s > maxP) { maxP = s; colPais = idx; } });

  let colVeto = -1, maxV = 0;
  scoreVeto.forEach((s, idx) => { if (idx !== colPais && s > maxV) { maxV = s; colVeto = idx; } });

  let colBandera = -1, maxB = 0;
  scoreBandera.forEach((s, idx) => { if (idx !== colPais && idx !== colVeto && s > maxB) { maxB = s; colBandera = idx; } });

  // Si se detectó una columna de país por scoring, buscar columna de delegado si hay otra columna de texto
  let colDelegado = -1;
  if (maxP > 0) {
    let maxTextoDelegado = 0;
    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      if (cIdx === colPais || cIdx === colVeto || cIdx === colBandera) continue;
      let scoreTexto = 0;
      filas.forEach(r => {
        if (!Array.isArray(r)) return;
        const val = String(r[cIdx] ?? '').trim();
        if (val.length > 2 && !/^\d+$/.test(val) && !/@/.test(val) && !esCeldaBandera(val) && !/^(true|false|si|sí|no|yes|p5|p-5)$/i.test(val)) {
          scoreTexto++;
        }
      });
      if (scoreTexto > maxTextoDelegado) {
        maxTextoDelegado = scoreTexto;
        colDelegado = cIdx;
      }
    }
  }

  return { colPais, colVeto, colBandera, colDelegado, filaInicio: 0 };
}

function procesarFilaArray(fila, index, indicesCol = null) {
  if (!Array.isArray(fila) || fila.length === 0) return null;

  // Si ya tenemos columnas detectadas para toda la tabla, usarlas e ignorar el resto
  if (indicesCol && indicesCol.colPais !== undefined && indicesCol.colPais >= 0) {
    const rawNombre = fila[indicesCol.colPais];
    const nombre = String(rawNombre ?? '').trim();
    if (!nombre) return null;

    const rawBandera = indicesCol.colBandera >= 0 ? String(fila[indicesCol.colBandera] ?? '').trim() : '';
    const rawVeto = indicesCol.colVeto >= 0 ? String(fila[indicesCol.colVeto] ?? '').trim() : undefined;
    const rawDelegado = indicesCol.colDelegado >= 0 ? String(fila[indicesCol.colDelegado] ?? '').trim() : '';

    const auto = autodetectarBanderaYVeto(nombre);
    const bandera = rawBandera ? normalizarBandera(rawBandera, nombre) : auto.bandera;
    const veto = rawVeto !== undefined && rawVeto !== ''
      ? ['true', '1', 'si', 'sí', 'yes', 'p5', 'p-5'].includes(rawVeto.toLowerCase())
      : auto.veto;

    return {
      id: `pais_${Date.now()}_${index}`,
      nombre,
      bandera,
      veto: Boolean(veto),
      delegado: rawDelegado || undefined,
      estatus: 'Ausente'
    };
  }

  // Detección por fila individual
  const celdas = fila
    .map((c, i) => ({ val: String(c ?? '').trim(), col: i }))
    .filter(c => c.val !== '');

  if (celdas.length === 0) return null;

  // 1. Buscar celda que coincida con país conocido en el diccionario
  let cellPais = celdas.find(c => {
    const norm = normalizarTexto(c.val);
    return DICCIONARIO_PAISES_ISO[norm] !== undefined || P5_SET.has(norm);
  });

  // 2. Si no coincide con país conocido, descartar valores numéricos, emails, urls, booleans
  if (!cellPais) {
    cellPais = celdas.find(c => {
      const v = c.val;
      if (/^\d+$/.test(v)) return false;
      if (/@/.test(v)) return false;
      if (/^(true|false|si|no|yes)$/i.test(v)) return false;
      if (/^https?:\/\//i.test(v)) return false;
      return v.length > 2;
    }) || celdas[0];
  }

  if (!cellPais) return null;
  const nombre = cellPais.val;
  const paisCol = cellPais.col;

  // Buscar veto en las celdas restantes (e ignorar el resto)
  const cellVeto = celdas.find(c => c.col !== paisCol && /^(true|false|si|sí|no|yes|p5|p-5)$/i.test(c.val));
  const rawVeto = cellVeto ? cellVeto.val : undefined;

  // Buscar bandera en las celdas restantes (e ignorar el resto)
  const cellBandera = celdas.find(c =>
    c.col !== paisCol &&
    (cellVeto ? c.col !== cellVeto.col : true) &&
    esCeldaBandera(c.val)
  );
  const rawBandera = cellBandera ? cellBandera.val : '';

  const auto = autodetectarBanderaYVeto(nombre);
  const bandera = rawBandera ? normalizarBandera(rawBandera, nombre) : auto.bandera;
  const veto = rawVeto !== undefined
    ? ['true', '1', 'si', 'sí', 'yes', 'p5', 'p-5'].includes(rawVeto.toLowerCase())
    : auto.veto;

  // Buscar delegado en las celdas restantes si no hay cabecera explícita
  const cellDelegado = celdas.find(c =>
    c.col !== paisCol &&
    (cellVeto ? c.col !== cellVeto.col : true) &&
    (cellBandera ? c.col !== cellBandera.col : true) &&
    !/^\d+$/.test(c.val) &&
    !/@/.test(c.val) &&
    !/^(true|false|si|sí|no|yes|p5|p-5)$/i.test(c.val) &&
    !esCeldaBandera(c.val) &&
    c.val.length > 2
  );

  return {
    id: `pais_${Date.now()}_${index}`,
    nombre,
    bandera,
    veto: Boolean(veto),
    delegado: cellDelegado ? cellDelegado.val : undefined,
    estatus: 'Ausente'
  };
}

// ── Parsers flexibles (Base siempre 'Ausente') ──────────────────────────────
function filaAPais(fila, index, indicesCol = null) {
  if (!fila) return null;

  if (typeof fila === 'string') {
    const limpio = fila.trim();
    if (!limpio) return null;
    const { bandera, veto } = autodetectarBanderaYVeto(limpio);
    return {
      id: `pais_${Date.now()}_${index}`,
      nombre: limpio,
      bandera,
      veto,
      estatus: 'Ausente'
    };
  }

  // Si fila es un Array (fila de Excel o tabla sin cabecera)
  if (Array.isArray(fila)) {
    return procesarFilaArray(fila, index, indicesCol);
  }

  // Si fila es un Objeto (con cabeceras como claves):
  // Se seleccionan ÚNICAMENTE las columnas requeridas (País, Bandera, Veto, ID) e IGNORAN las demás
  const allKeys = Object.keys(fila).filter(k => k && String(fila[k]).trim() !== '');

  // Regla crítica: Si existen tanto clave PAIS como clave NOMBRE / DELEGADO,
  // la columna que lee como país es estrictamente 'PAIS', asumiendo que 'NOMBRE' es el delegado
  const keyPais = allKeys.find(k => esHeaderPais(k));
  const keyDelegado = allKeys.find(k => k !== keyPais && esHeaderDelegadoONombre(k));

  let colNombre = keyPais;
  if (!colNombre && !keyPais) {
    colNombre = allKeys.find(k => esHeaderNombreGenerico(k));
  }
  if (!colNombre && !keyPais) {
    colNombre = allKeys.find(k => {
      const val = normalizarTexto(fila[k]);
      return DICCIONARIO_PAISES_ISO[val] !== undefined || P5_SET.has(val);
    });
  }
  if (!colNombre && !keyPais) {
    colNombre = allKeys.find(k => {
      const norm = normalizarTexto(k);
      return !/id|email|correo|mail|telefono|phone|comit|coleg|escuela|school|fecha|date|hora|time|precio|pago|status|estatus|observa|notas/i.test(norm);
    });
  }

  if (!colNombre) return null;
  const nombre = String(fila[colNombre]).trim();
  if (!nombre) return null;

  const rawDelegado = keyDelegado ? String(fila[keyDelegado] || '').trim() : '';

  // 2. Columna Bandera / ISO (si existe, ignorando el resto)
  const colBandera = allKeys.find(k => k !== colNombre && k !== keyDelegado && esHeaderBandera(k));
  const rawBandera = colBandera ? String(fila[colBandera]).trim() : '';

  // 3. Columna Veto (si existe, ignorando el resto)
  const colVeto = allKeys.find(k => k !== colNombre && k !== keyDelegado && k !== colBandera && esHeaderVeto(k));
  const rawVeto = colVeto ? String(fila[colVeto]).trim() : undefined;

  // 4. Columna ID (si existe)
  const colId = allKeys.find(k => k !== colNombre && k !== keyDelegado && k !== colBandera && k !== colVeto && /^(id|codigo|c[oó]digo|code|iso)$/i.test(normalizarTexto(k)));
  const id = colId ? String(fila[colId]).trim() : `pais_${Date.now()}_${index}`;

  const auto = autodetectarBanderaYVeto(nombre);
  const bandera = rawBandera ? normalizarBandera(rawBandera, nombre) : auto.bandera;
  const veto = rawVeto !== undefined
    ? ['true', '1', 'si', 'sí', 'yes', 'p5', 'p-5'].includes(String(rawVeto).toLowerCase())
    : auto.veto;

  return {
    id: String(id),
    nombre,
    bandera,
    veto: Boolean(veto),
    delegado: rawDelegado || undefined,
    estatus: 'Ausente'
  };
}

function limpiarLineaTexto(txt) {
  if (!txt) return '';
  return String(txt)
    .replace(/^["']|["']$/g, '')
    .replace(/^(\d+[\.\)\-:]|\*|\-|\•)\s*/, '')
    .trim();
}

function dividirLineaCSV(linea, separador) {
  if (separador === '\t') {
    return linea.split('\t').map(c => limpiarLineaTexto(c));
  }
  const resultado = [];
  let actual = '';
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];
    if (char === '"' || char === "'") {
      dentroComillas = !dentroComillas;
    } else if (char === separador && !dentroComillas) {
      resultado.push(limpiarLineaTexto(actual));
      actual = '';
    } else {
      actual += char;
    }
  }
  resultado.push(limpiarLineaTexto(actual));
  return resultado;
}

function parsearTexto(texto) {
  if (!texto || !texto.trim()) return [];

  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length === 0) return [];

  const primera = lineas[0];
  const separador = primera.includes('\t') ? '\t' : primera.includes(';') ? ';' : primera.includes(',') ? ',' : null;

  if (separador) {
    const lineasMatriz = lineas.map(l => dividirLineaCSV(l, separador));
    if (lineasMatriz.length > 0) {
      const infoCols = detectarColumnasTabla(lineasMatriz);
      if (infoCols.filaInicio > 0) {
        return lineasMatriz.slice(infoCols.filaInicio)
          .map((fila, index) => filaAPais(fila, index, infoCols))
          .filter(Boolean);
      } else if (lineasMatriz.length > 1 && lineasMatriz.every(parts => parts.length >= 2)) {
        return lineasMatriz
          .map((celdas, index) => filaAPais(celdas, index, infoCols))
          .filter(Boolean);
      }
    }

    // Si sólo hay 1 línea y el separador es coma: es una lista simple de nombres separados por coma
    if (lineas.length === 1 && separador === ',') {
      return primera.split(',').map((item, i) => {
        const limpio = limpiarLineaTexto(item);
        return limpio ? filaAPais(limpio, i) : null;
      }).filter(Boolean);
    }
  }

  // Lista plana de países (1 por línea o separados por comas)
  const items = lineas.flatMap(linea => {
    if (linea.includes(',') && !linea.includes(';') && !linea.includes('\t')) {
      return linea.split(',').map(s => limpiarLineaTexto(s)).filter(Boolean);
    }
    const limpio = limpiarLineaTexto(linea);
    return limpio ? [limpio] : [];
  });

  return items.map((item, i) => filaAPais(item, i)).filter(Boolean);
}

const parsearCSV = parsearTexto;
const parsearTextoPlano = parsearTexto;

function parsearJSON(texto) {
  const data = JSON.parse(texto);

  // Si el JSON importado contiene alertas de crisis o snapshot, sincronizarlas
  if (data && typeof data === 'object') {
    const crisisData = data.alertasCrisis || data.eventosCrisis || data.crisisEventos || (data.localStorageSnapshot && data.localStorageSnapshot.openmun_crisis_eventos);
    if (Array.isArray(crisisData) && crisisData.length > 0) {
      localStorage.setItem('openmun_crisis_eventos', JSON.stringify(crisisData));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', { detail: crisisData }));
    }
    const relojData = data.relojCrisis || data.relojSimulacion || (data.localStorageSnapshot && data.localStorageSnapshot.openmun_crisis_reloj);
    if (relojData && typeof relojData === 'object') {
      localStorage.setItem('openmun_crisis_reloj', JSON.stringify(relojData));
      window.dispatchEvent(new CustomEvent('openmun_crisis_update', { detail: { reloj: relojData } }));
    }
  }

  let arr = Array.isArray(data) ? data
    : Array.isArray(data.paises) ? data.paises
      : Array.isArray(data.delegaciones) ? data.delegaciones
        : Array.isArray(data.countries) ? data.countries
          : (data.localStorageSnapshot && Array.isArray(data.localStorageSnapshot.openmun_paises))
            ? data.localStorageSnapshot.openmun_paises
            : null;

  if (!arr && data && data.localStorageSnapshot && typeof data.localStorageSnapshot.openmun_paises === 'string') {
    try {
      const parsed = JSON.parse(data.localStorageSnapshot.openmun_paises);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {}
  }

  if (!arr) throw new Error('El JSON debe contener una lista o un array en "paises".');
  return arr.map((item, i) => filaAPais(item, i)).filter(Boolean);
}

async function parsearXLSX(archivo) {
  let XLSX;
  try {
    const mod = await import('xlsx');
    XLSX = mod.default || mod;
  } catch (err) {
    console.warn('Error al importar xlsx local, probando fallback CDN:', err);
    const cdnMod = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    XLSX = cdnMod.default || cdnMod;
  }

  const buffer = await archivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo.');
  }

  // Buscar la primera hoja con datos
  let rawData = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (sheet) {
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (Array.isArray(data) && data.length > 0) {
        rawData = data;
        break;
      }
    }
  }

  if (rawData.length === 0) {
    throw new Error('El archivo Excel está vacío o no contiene filas con datos.');
  }

  // Filtrar filas completamente vacías
  const filasMatriz = rawData
    .filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map(row => row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : ''));

  if (filasMatriz.length === 0) {
    throw new Error('No se detectaron delegaciones válidas en el archivo Excel.');
  }

  // Detectar columnas y fila de inicio revisando cabeceras en las primeras filas
  const infoCols = detectarColumnasTabla(filasMatriz);

  if (infoCols.filaInicio > 0) {
    const filasDatos = filasMatriz.slice(infoCols.filaInicio);
    return filasDatos.map((fila, index) => filaAPais(fila, index, infoCols)).filter(Boolean);
  }

  // Si no tiene cabecera explícita, procesar con las columnas detectadas por scoring
  return filasMatriz.map((fila, index) => filaAPais(fila, index, infoCols)).filter(Boolean);
}

const parsearExcel = parsearXLSX;

// ── Componente Principal ────────────────────────────────────────────────────
const ImportarPaises = () => {
  const { t } = useTranslation();
  const {
    paises,
    setPaises,
    nombreComite,
    setNombreComite,
    agendaSesion,
    establecerAgenda,
    establecerEstadoComiteCompleto
  } = useSession();

  const [tab, setTab] = useState('archivo'); // 'archivo' | 'pegar' | 'individual' | 'presets'
  const [textoPegar, setTextoPegar] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaBandera, setNuevaBandera] = useState('');
  const [nuevoVeto, setNuevoVeto] = useState(false);
  
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(null);
  const [sesionCompletaDetectada, setSesionCompletaDetectada] = useState(null);
  const [busquedaPreview, setBusquedaPreview] = useState('');
  const [filtroPreview, setFiltroPreview] = useState('TODOS'); // 'TODOS' | 'VETO' | 'SIN_VETO'
  const [busquedaPreset, setBusquedaPreset] = useState('');
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);

  const [urlInputIndividual, setUrlInputIndividual] = useState('');
  const [filtroIsoIndividual, setFiltroIsoIndividual] = useState('');
  const [mostrarBuscadorIsoIndividual, setMostrarBuscadorIsoIndividual] = useState(false);
  const [mostrarPersonalizarBandera, setMostrarPersonalizarBandera] = useState(false);
  const [isDraggingIndividual, setIsDraggingIndividual] = useState(false);
  const [mensajeFeedbackIndividual, setMensajeFeedbackIndividual] = useState('');

  const fileInputRef = useRef(null);
  const rowFileInputRef = useRef(null);
  const individualFileInputRef = useRef(null);
  const inputIndividualRef = useRef(null);

  // Auto-enfocar el input al cambiar al modo individual
  useEffect(() => {
    if (tab === 'individual') {
      const timer = setTimeout(() => {
        inputIndividualRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [tab]);

  // Listener para pegar imagen (Ctrl+V) en modo 1 País
  useEffect(() => {
    if (tab !== 'individual') return;

    const handlePasteIndividual = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const base64 = await procesarImagenBandera(file);
              setNuevaBandera(base64);
              setMensajeFeedbackIndividual('¡Imagen pegada del portapapeles con éxito!');
              setTimeout(() => setMensajeFeedbackIndividual(''), 3000);
            } catch (err) {
              console.error('Error al procesar imagen del portapapeles:', err);
              setMensajeFeedbackIndividual('Error al procesar imagen');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePasteIndividual);
    return () => window.removeEventListener('paste', handlePasteIndividual);
  }, [tab]);

  // Sugerencias de autocompletado para el formulario individual
  const sugerenciasNombres = useMemo(() => {
    if (!nuevoNombre.trim() || nuevoNombre.length < 2) return [];
    const q = normalizarTexto(nuevoNombre);
    const resultados = [];
    const vistos = new Set();

    for (const [clave, iso] of Object.entries(DICCIONARIO_PAISES_ISO)) {
      if (clave.includes(q)) {
        const nombreFormateado = clave.charAt(0).toUpperCase() + clave.slice(1);
        if (!vistos.has(nombreFormateado)) {
          vistos.add(nombreFormateado);
          resultados.push({ nombre: nombreFormateado, iso });
        }
      }
      if (resultados.length >= 6) break;
    }
    return resultados;
  }, [nuevoNombre]);

  // Actualización automática de bandera e indicación de veto al escribir nombre individual
  const banderaDetectadaIndividual = useMemo(() => {
    if (nuevaBandera) return nuevaBandera;
    if (!nuevoNombre.trim()) return 'un';
    return autodetectarBanderaYVeto(nuevoNombre).bandera;
  }, [nuevoNombre, nuevaBandera]);

  const vetoSugeridoIndividual = useMemo(() => {
    if (!nuevoNombre.trim()) return false;
    return autodetectarBanderaYVeto(nuevoNombre).veto;
  }, [nuevoNombre]);

  // Sincronizar veto sugerido si el usuario no lo ha cambiado manualmente
  useEffect(() => {
    if (vetoSugeridoIndividual && !nuevoVeto) {
      setNuevoVeto(true);
    }
  }, [vetoSugeridoIndividual]);

  // Soporte global de Pegado (Ctrl+V) cuando se tiene una fila de preview seleccionada o en individual
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const base64 = await procesarImagenBandera(file);
              if (preview && selectedPreviewIndex !== null && preview[selectedPreviewIndex]) {
                e.preventDefault();
                setPreview(prev => {
                  const copy = [...prev];
                  copy[selectedPreviewIndex] = { ...copy[selectedPreviewIndex], bandera: base64 };
                  return copy;
                });
                setExito(`Imagen asignada a "${preview[selectedPreviewIndex].nombre}"`);
                setTimeout(() => setExito(''), 3000);
              } else if (tab === 'individual') {
                e.preventDefault();
                setNuevaBandera(base64);
                setExito('Imagen de bandera asignada');
                setTimeout(() => setExito(''), 3000);
              }
            } catch (err) {
              console.error('Error al procesar imagen pegada:', err);
              setError('No se pudo procesar la imagen del portapapeles');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [preview, selectedPreviewIndex, tab]);

  // Procesar archivo seleccionado o soltado
  const procesarArchivoObjeto = async (archivo) => {
    if (!archivo) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setCargando(true);
    setError('');
    setExito('');
    setPreview(null);
    setSelectedPreviewIndex(null);
    setSesionCompletaDetectada(null);

    try {
      const ext = archivo.name.split('.').pop().toLowerCase();
      let parsed = [];

      if (ext === 'json') {
        const rawText = await archivo.text();
        const norm = normalizarDatosComite(rawText, archivo.name?.replace(/\.json$/i, ''));
        if (norm && norm.paises && norm.paises.length > 0) {
          parsed = norm.paises;
          setSesionCompletaDetectada(norm);
        } else {
          parsed = parsearJSON(rawText);
        }
      } else if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        parsed = parsearTexto(await archivo.text());
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsed = await parsearXLSX(archivo);
      } else {
        throw new Error('Formato no soportado. Sube archivos .xlsx, .xls, .csv, .tsv, .json o .txt');
      }

      if (parsed.length === 0) {
        throw new Error('No se detectaron delegaciones válidas en el archivo.');
      }
      setPreview(parsed);
      setExito(`¡Archivo procesado con éxito! Revisa la lista antes de guardar.`);
      setTimeout(() => setExito(''), 3500);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo.');
    } finally {
      setCargando(false);
    }
  };

  const handleArchivoChange = (e) => {
    const archivo = e.target.files?.[0];
    if (archivo) procesarArchivoObjeto(archivo);
  };

  // Drag and drop sobre la zona de carga de archivo
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) {
      procesarArchivoObjeto(archivo);
    }
  };

  // Procesar texto pegado
  const handleProcesarPegado = () => {
    setError('');
    setExito('');
    setSesionCompletaDetectada(null);
    if (!textoPegar.trim()) {
      setError('Pega una lista de países o datos antes de continuar.');
      return;
    }
    try {
      let parsed = [];
      if (textoPegar.trim().startsWith('[') || textoPegar.trim().startsWith('{')) {
        try {
          const norm = normalizarDatosComite(textoPegar);
          if (norm && norm.paises && norm.paises.length > 0) {
            parsed = norm.paises;
            setSesionCompletaDetectada(norm);
          } else {
            parsed = parsearJSON(textoPegar);
          }
        } catch {
          parsed = parsearTexto(textoPegar);
        }
      } else {
        parsed = parsearTexto(textoPegar);
      }

      if (parsed.length === 0) {
        setError('No se encontraron países válidos en el texto.');
        return;
      }
      setPreview(parsed);
      setSelectedPreviewIndex(null);
      setExito(`Se detectaron ${parsed.length} delegaciones.`);
      setTimeout(() => setExito(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al interpretar el texto pegado.');
    }
  };

  // Pegar directo desde el portapapeles del sistema
  const handlePegarDesdeClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError('Acceso al portapapeles no soportado por el navegador.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError('El portapapeles está vacío.');
        return;
      }
      setTextoPegar(text);
      setExito('Texto pegado del portapapeles');
      setTimeout(() => setExito(''), 2500);
    } catch (err) {
      console.error(err);
      setError('Permiso de portapapeles denegado. Usa Ctrl+V manualmente.');
    }
  };

  // Cargar preset de comisión desde los archivos JSON
  const handleCargarPreset = (preset, aplicarDirecto = false) => {
    const parsed = preset.paises.map((p, i) => ({
      id: `preset_${preset.id}_${i}_${Date.now()}`,
      nombre: p.nombre,
      bandera: p.bandera,
      veto: !!p.veto,
      estatus: 'Ausente'
    }));

    if (preset.nombre && typeof setNombreComite === 'function') {
      setNombreComite(preset.nombre);
    }

    if (aplicarDirecto) {
      setPaises(parsed);
      setExito(`Comité "${preset.nombre}" cargado (${parsed.length} delegaciones).`);
      setTimeout(() => setExito(''), 3500);
    } else {
      setPreview(parsed);
      setSelectedPreviewIndex(null);
    }
  };

  // Añadir un solo país al instante
  const handleAñadirIndividual = (e) => {
    e?.preventDefault();
    if (!nuevoNombre.trim()) {
      setError('Escribe el nombre de la delegación.');
      return;
    }

    const auto = autodetectarBanderaYVeto(nuevoNombre.trim());
    const finalBandera = nuevaBandera || auto.bandera;

    const nuevo = {
      id: `pais_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nombre: nuevoNombre.trim(),
      bandera: finalBandera,
      veto: nuevoVeto,
      estatus: 'Ausente'
    };

    // Validar duplicado exacto
    const existe = paises.some(p => p.nombre.toLowerCase() === nuevo.nombre.toLowerCase());
    if (existe) {
      if (!confirm(`"${nuevo.nombre}" ya existe en la sesión. ¿Añadirla de todos modos?`)) {
        return;
      }
    }

    setPaises([...paises, nuevo]);
    setNuevoNombre('');
    setNuevaBandera('');
    setNuevoVeto(false);
    setExito(`"${nuevo.nombre}" añadida a la sesión.`);
    setTimeout(() => setExito(''), 3000);
    setTimeout(() => {
      inputIndividualRef.current?.focus();
    }, 50);
  };

  // Subir imagen para una fila concreta de la previsualización
  const handleSubirImagenFila = async (e) => {
    const file = e.target.files?.[0];
    if (!file || selectedPreviewIndex === null) return;

    try {
      const base64 = await procesarImagenBandera(file);
      setPreview(prev => {
        const copy = [...prev];
        copy[selectedPreviewIndex] = { ...copy[selectedPreviewIndex], bandera: base64 };
        return copy;
      });
      setExito(`Imagen asignada a "${preview[selectedPreviewIndex].nombre}"`);
      setTimeout(() => setExito(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al procesar la imagen seleccionada.');
    } finally {
      if (rowFileInputRef.current) rowFileInputRef.current.value = '';
    }
  };

  // Subir imagen para creación individual
  const handleSubirImagenIndividual = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await procesarImagenBandera(file);
      setNuevaBandera(base64);
      setMensajeFeedbackIndividual('Imagen cargada correctamente');
      setTimeout(() => setMensajeFeedbackIndividual(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al procesar la imagen.');
    }
  };

  const handleDropIndividual = async (e) => {
    e.preventDefault();
    setIsDraggingIndividual(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await procesarImagenBandera(file);
        setNuevaBandera(base64);
        setMensajeFeedbackIndividual('Imagen arrastrada y procesada');
        setTimeout(() => setMensajeFeedbackIndividual(''), 3000);
      } catch (err) {
        console.error('Error al procesar drop:', err);
      }
    }
  };

  const handleAplicarUrlIndividual = () => {
    if (urlInputIndividual.trim()) {
      setNuevaBandera(urlInputIndividual.trim());
      setMensajeFeedbackIndividual('URL de imagen aplicada');
      setTimeout(() => setMensajeFeedbackIndividual(''), 3000);
    }
  };

  // Descargar plantilla CSV de muestra (con estatus Ausente de base)
  const handleDescargarPlantilla = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
      'Nombre,Bandera,Veto\n' +
      'Estados Unidos,us,true\n' +
      'Reino Unido,gb,true\n' +
      'Francia,fr,true\n' +
      'España,es,false\n' +
      'México,mx,false\n' +
      'Japón,jp,false\n' +
      'Brasil,br,false\n'
    );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'plantilla_delegaciones_openMUN.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExito('Plantilla CSV descargada');
    setTimeout(() => setExito(''), 3000);
  };

  // Aplicar preview a la sesión
  const handleAplicar = (modo) => {
    if (!preview || preview.length === 0) return;

    if (sesionCompletaDetectada) {
      if (modo === 'reemplazar') {
        if (typeof establecerEstadoComiteCompleto === 'function') {
          establecerEstadoComiteCompleto(sesionCompletaDetectada);
        } else {
          setPaises(preview);
        }
        setExito(`¡Comité "${sesionCompletaDetectada.nombreComite}" cargado al 100%! (${preview.length} delegaciones y agenda restauradas).`);
      } else {
        if (!nombreComite && sesionCompletaDetectada.nombreComite && typeof setNombreComite === 'function') {
          setNombreComite(sesionCompletaDetectada.nombreComite);
        }
        if ((!agendaSesion?.temasPropuestos || agendaSesion.temasPropuestos.length === 0) && sesionCompletaDetectada.agendaSesion && typeof establecerAgenda === 'function') {
          establecerAgenda(sesionCompletaDetectada.agendaSesion);
        }
        const nombresExistentes = new Set(paises.map(p => p.nombre.toLowerCase()));
        const nuevos = preview.filter(p => !nombresExistentes.has(p.nombre.toLowerCase()));
        setPaises([...paises, ...nuevos]);
        setExito(`${nuevos.length} delegaciones nuevas añadidas.`);
      }
    } else {
      if (modo === 'reemplazar') {
        setPaises(preview);
        setExito(`Lista actualizada: ${preview.length} delegaciones.`);
      } else {
        const nombresExistentes = new Set(paises.map(p => p.nombre.toLowerCase()));
        const nuevos = preview.filter(p => !nombresExistentes.has(p.nombre.toLowerCase()));
        setPaises([...paises, ...nuevos]);
        setExito(`${nuevos.length} delegaciones nuevas añadidas.`);
      }
    }
    setPreview(null);
    setSelectedPreviewIndex(null);
    setTextoPegar('');
    setSesionCompletaDetectada(null);
    setTimeout(() => setExito(''), 3500);
  };

  const handleVaciarLista = () => {
    if (paises.length === 0) return;
    setPaises([]);
    setConfirmandoVaciar(false);
    setExito('Lista de delegaciones vaciada por completo.');
    setTimeout(() => setExito(''), 3000);
  };

  // Filtrado de la previsualización
  const previewFiltrada = useMemo(() => {
    if (!preview) return [];
    const q = normalizarTexto(busquedaPreview);
    return preview.filter(p => {
      const matchNombre = normalizarTexto(p.nombre).includes(q);
      if (!matchNombre) return false;
      if (filtroPreview === 'VETO') return p.veto;
      if (filtroPreview === 'SIN_VETO') return !p.veto;
      return true;
    });
  }, [preview, busquedaPreview, filtroPreview]);

  // Filtrado de presets JSON
  const presetsFiltrados = useMemo(() => {
    if (!busquedaPreset.trim()) return PLANTILLAS_PAISES;
    const q = normalizarTexto(busquedaPreset);
    return PLANTILLAS_PAISES.filter(p => 
      normalizarTexto(p.nombre).includes(q) || 
      normalizarTexto(p.descripcion).includes(q) ||
      normalizarTexto(p.categoria).includes(q)
    );
  }, [busquedaPreset]);

  // Acciones en lote en la previsualización
  const handleMarcarTodosVeto = (valor) => {
    if (!preview) return;
    setPreview(prev => prev.map(p => ({ ...p, veto: valor })));
  };

  const handleOrdenarPreviewAZ = () => {
    if (!preview) return;
    setPreview(prev => [...prev].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
  };

  const totalVetosSesion = paises.filter(p => p.veto).length;

  return (
    <div style={{
      position: 'relative',
      padding: '0.85rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.65rem',
      fontSize: '0.82rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Input oculto para subida de imagen por fila en preview */}
      <input
        ref={rowFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSubirImagenFila}
        style={{ display: 'none' }}
      />

      {/* ── HEADER SUPERIOR CON METRICAS Y ACCIONES (AZUL Y VERDE) ──────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.5rem 0.65rem',
        backgroundColor: 'var(--card-header-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px'
      }}>
        {/* Lado izquierdo: Título y Contadores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <Globe2 size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.86rem' }}>
              <span>Importar Países</span>
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: 'rgba(59, 130, 246, 0.18)',
                color: '#60a5fa',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontWeight: '700'
              }}>
                {paises.length} en sesión
              </span>
              {totalVetosSesion > 0 && (
                <span style={{
                  fontSize: '0.66rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontWeight: '700'
                }}>
                  <Crown size={10} /> {totalVetosSesion} Veto
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Acciones de header (Plantilla y Vaciar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={handleDescargarPlantilla}
            title="Descargar plantilla de Excel / CSV lista para rellenar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              color: 'var(--text-color)',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={12} color="#3b82f6" />
            <span>Plantilla</span>
          </button>

          {paises.length > 0 && !confirmandoVaciar && (
            <button
              type="button"
              onClick={() => setConfirmandoVaciar(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '5px',
                color: '#ef4444',
                fontSize: '0.7rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Borrar todas las delegaciones de la sesión"
            >
              <Trash2 size={12} />
              <span>Vaciar</span>
            </button>
          )}

          {confirmandoVaciar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'rgba(239,68,68,0.2)', padding: '0.15rem 0.4rem', borderRadius: '5px', border: '1px solid #ef4444' }}>
              <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '700' }}>¿Vaciar?</span>
              <button
                type="button"
                onClick={handleVaciarLista}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', padding: '1px 6px', fontSize: '0.66rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoVaciar(false)}
                style={{ background: 'transparent', color: 'var(--text-color)', border: 'none', padding: '1px 4px', fontSize: '0.66rem', cursor: 'pointer' }}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SELECTOR DE MODO (LAS 4 OPCIONES CON ESTILO AZUL OPENMUN) ────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.3rem',
        backgroundColor: 'var(--card-header-bg)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        {[
          { key: 'archivo', label: t('countries.tabFile', 'Archivo'), icon: Upload, desc: 'Excel, CSV, JSON' },
          { key: 'pegar', label: t('countries.tabPaste', 'Pegar'), icon: ClipboardPaste, desc: 'Texto directo' },
          { key: 'individual', label: t('countries.tabSingle', 'Añadir País'), icon: UserPlus, desc: 'Añadir único' },
          { key: 'presets', label: t('countries.tabPresets', 'Plantillas'), icon: Sparkles, desc: 'Comités listos' }
        ].map(m => {
          const Icon = m.icon;
          const activo = tab === m.key && !preview;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setTab(m.key);
                setError('');
                setExito('');
                setPreview(null);
                setSelectedPreviewIndex(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.2rem',
                fontSize: '0.75rem',
                fontWeight: activo ? '800' : '600',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activo ? '#3b82f6' : 'transparent',
                color: activo ? '#ffffff' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: activo ? '0 2px 6px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <Icon size={14} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ALERTAS DE FEEDBACK ──────────────────────────────────────────────── */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '6px',
          padding: '0.45rem 0.65rem',
          fontSize: '0.74rem',
          color: '#f87171'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      )}
      {exito && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '6px',
          padding: '0.45rem 0.65rem',
          fontSize: '0.74rem',
          color: '#4ade80'
        }}>
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{exito}</span>
          <button onClick={() => setExito('')} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── CONTENIDO PRINCIPAL: MODO 1 - ARCHIVO ────────────────────────────── */}
      {tab === 'archivo' && !preview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem', minHeight: 0 }}>
          {/* Zona de Drop Drag & Drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              flex: 1,
              border: isDraggingFile ? '2px dashed #3b82f6' : '2px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: isDraggingFile ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
            onMouseEnter={e => {
              if (!isDraggingFile) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
              }
            }}
            onMouseLeave={e => {
              if (!isDraggingFile) {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.02)';
              }
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Upload size={22} />
            </div>

            <div style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-color)' }}>
              {isDraggingFile ? '¡Suelta el archivo aquí!' : 'Arrastra tu archivo o haz clic para explorar'}
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['.xlsx', '.xls', '.csv', '.json', '.txt'].map(fmt => (
                <span key={fmt} style={{
                  fontSize: '0.67rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--muted-text)',
                  fontFamily: 'monospace'
                }}>
                  {fmt}
                </span>
              ))}
            </div>

            {cargando && (
              <div style={{
                fontSize: '0.72rem',
                color: '#3b82f6',
                marginTop: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: '700'
              }}>
                <Clock size={14} className="animate-spin" />
                <span>Analizando archivo y banderas...</span>
              </div>
            )}
          </div>

          {/* Guía rápida de columnas */}
          <div style={{
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.55rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: 'var(--text-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileSpreadsheet size={13} color="#3b82f6" />
                <span>Columnas Soportadas</span>
              </div>
              <button
                type="button"
                onClick={handleDescargarPlantilla}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  textDecoration: 'underline'
                }}
              >
                Descargar Ejemplo
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem' }}>
              {[
                { col: 'Nombre / Pais', req: true, desc: 'Nombre delegación (ej: España)' },
                { col: 'Bandera / ISO', req: false, desc: 'Código ISO (es, us) o URL' },
                { col: 'Veto / P5', req: false, desc: 'true/si/1 para derecho a veto' }
              ].map(c => (
                <div key={c.col} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--subborder-color, var(--border-color))',
                  borderRadius: '5px',
                  padding: '0.35rem 0.45rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                    <code style={{ fontSize: '0.7rem', fontWeight: '700', color: '#60a5fa' }}>{c.col}</code>
                    {c.req && <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: '800' }}>*</span>}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', lineHeight: '1.2' }}>
                    {c.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.json,.txt"
            onChange={handleArchivoChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ── CONTENIDO PRINCIPAL: MODO 2 - PEGAR TEXTO ─────────────────────────── */}
      {tab === 'pegar' && !preview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
          {/* Barra de herramientas rápida sobre el textarea */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePegarDesdeClipboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '4px',
                  color: '#60a5fa',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <ClipboardPaste size={12} />
                <span>Pegar Portapapeles</span>
              </button>

              <button
                type="button"
                onClick={() => setTextoPegar("España\nFrancia\nAlemania\nEstados Unidos\nChina\nJapón\nBrasil")}
                style={{
                  padding: '0.25rem 0.45rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-color)',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
              >
                Ejemplo Lista
              </button>

              <button
                type="button"
                onClick={() => setTextoPegar("nombre,bandera,veto\nEstados Unidos,us,true\nFrancia,fr,true\nEspaña,es,false\nChile,cl,false")}
                style={{
                  padding: '0.25rem 0.45rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-color)',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
              >
                Ejemplo CSV
              </button>
            </div>

            {textoPegar && (
              <button
                type="button"
                onClick={() => setTextoPegar('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <Trash2 size={11} /> Limpiar
              </button>
            )}
          </div>

          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={textoPegar}
              onChange={(e) => setTextoPegar(e.target.value)}
              placeholder="Pega nombres de países (uno por línea o separados por coma):&#10;España&#10;Francia&#10;Estados Unidos&#10;Reino Unido&#10;China&#10;Japón..."
              style={{
                flex: 1,
                minHeight: '120px',
                padding: '0.65rem',
                backgroundColor: 'var(--input-bg, rgba(255,255,255,0.04))',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-color)',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.4'
              }}
            />
            {textoPegar && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: 'var(--muted-text)'
              }}>
                {textoPegar.split(/\r?\n/).filter(Boolean).length} líneas
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleProcesarPegado}
            style={{
              padding: '0.55rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontWeight: '800',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)'
            }}
          >
            <Sparkles size={14} />
            <span>Interpretar y Previsualizar</span>
          </button>
        </div>
      )}

      {/* ── CONTENIDO PRINCIPAL: MODO 3 - AÑADIR UN PAÍS (SIMPLIFICADO Y ÁGIL) ── */}
      {tab === 'individual' && !preview && (
        <form
          onSubmit={handleAñadirIndividual}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            minHeight: 0,
            overflowY: 'auto',
            padding: '2px'
          }}
        >
          {/* Cabecera con contador contextual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-color)' }}>
              {t('countries.singleCountryTitle', 'Añadir delegación individual')}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', fontWeight: '600' }}>
              {paises.length} {paises.length === 1 ? 'delegación en sesión' : 'delegaciones en sesión'}
            </span>
          </div>

          {/* Tarjeta principal integrada: Bandera en vivo + Input + Veto P5 + Botón Añadir */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.7rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Fila compacta de entrada rápida */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {/* Bandera interactiva en vivo */}
              <div
                onClick={() => setMostrarPersonalizarBandera(prev => !prev)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease'
                }}
                title={nuevaBandera ? 'Bandera personalizada (clic para opciones)' : `Bandera detectada: ${banderaDetectadaIndividual.toUpperCase()} (clic para personalizar)`}
              >
                <CountryFlag
                  bandera={banderaDetectadaIndividual}
                  nombre={nuevoNombre || 'Delegación'}
                  size="md"
                />
              </div>

              {/* Input con autocompletado */}
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  ref={inputIndividualRef}
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder={t('countries.inputPlaceholder', 'Nombre del país o delegación...')}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.48rem 0.65rem',
                    backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Sugerencias flotantes */}
                {sugerenciasNombres.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 40,
                    backgroundColor: 'var(--card-bg, #1e293b)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                    marginTop: '3px',
                    overflow: 'hidden'
                  }}>
                    {sugerenciasNombres.map(sug => (
                      <div
                        key={sug.nombre}
                        onClick={() => {
                          setNuevoNombre(sug.nombre);
                          setNuevaBandera('');
                          inputIndividualRef.current?.focus();
                        }}
                        style={{
                          padding: '0.38rem 0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--subborder-color, rgba(255,255,255,0.05))',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <CountryFlag bandera={sug.iso} nombre={sug.nombre} size="xs" />
                        <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{sug.nombre}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)', marginLeft: 'auto' }}>
                          {sug.iso.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón rápido de Veto (P5) */}
              <button
                type="button"
                onClick={() => setNuevoVeto(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem 0.55rem',
                  borderRadius: '6px',
                  border: nuevoVeto ? '1px solid #eab308' : '1px solid var(--border-color)',
                  backgroundColor: nuevoVeto ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                  color: nuevoVeto ? '#eab308' : 'var(--muted-text)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: nuevoVeto ? '700' : '500',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                title={nuevoVeto ? 'Miembro Permanente con Derecho a Veto (P5) activado' : 'Hacer clic para otorgar derecho a veto (P5)'}
              >
                <Crown size={13} fill={nuevoVeto ? '#eab308' : 'none'} color={nuevoVeto ? '#eab308' : 'currentColor'} />
                <span>{nuevoVeto ? 'Veto P5' : 'Veto'}</span>
              </button>

              {/* Botón Añadir principal */}
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.48rem 0.8rem',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontWeight: '800',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={14} />
                <span>{t('common.add', 'Añadir')}</span>
              </button>
            </div>

            {/* Fila informativa inferior */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted-text)', paddingTop: '2px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} color="#22c55e" />
                {nuevaBandera ? 'Bandera personalizada activa' : 'Bandera y Veto detectados automáticamente'}
              </span>
              <button
                type="button"
                onClick={() => setMostrarPersonalizarBandera(prev => !prev)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: mostrarPersonalizarBandera ? '#3b82f6' : 'var(--muted-text)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0',
                  textDecoration: 'underline'
                }}
              >
                <ImageIcon size={11} />
                {mostrarPersonalizarBandera ? 'Cerrar opciones de bandera' : 'Personalizar bandera...'}
              </button>
            </div>
          </div>

          {/* Panel colapsable de Personalización de Bandera (solo si se necesita) */}
          {mostrarPersonalizarBandera && (
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ImageIcon size={13} color="#3b82f6" />
                  Personalizar imagen de bandera
                </span>
                {mensajeFeedbackIndividual && (
                  <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '600' }}>
                    {mensajeFeedbackIndividual}
                  </span>
                )}
              </div>

              {/* Fila compacta de subida o URL */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={urlInputIndividual}
                  onChange={(e) => setUrlInputIndividual(e.target.value)}
                  placeholder="Pegar URL de imagen (https://...)"
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.55rem',
                    backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAplicarUrlIndividual}
                  style={{
                    padding: '0.35rem 0.6rem',
                    backgroundColor: 'var(--border-color)',
                    color: 'var(--text-color)',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: '600'
                  }}
                >
                  {t('common.apply', 'Aplicar')}
                </button>
                <button
                  type="button"
                  onClick={() => individualFileInputRef.current?.click()}
                  style={{
                    padding: '0.35rem 0.6rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Upload size={12} />
                  Subir
                </button>
                <input
                  ref={individualFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSubirImagenIndividual}
                  style={{ display: 'none' }}
                />
                {nuevaBandera && (
                  <button
                    type="button"
                    onClick={() => { setNuevaBandera(''); setUrlInputIndividual(''); }}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--muted-text)',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.7rem'
                    }}
                    title="Restablecer a bandera automática"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sugerencias Rápidas de Delegaciones Comunes (clic para autocompletar) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            padding: '0.5rem 0.65rem',
            backgroundColor: 'rgba(0,0,0,0.06)',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)' }}>
              Sugerencias rápidas (clic para autocompletar):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {[
                { nombre: 'España', iso: 'es' },
                { nombre: 'Estados Unidos', iso: 'us' },
                { nombre: 'Reino Unido', iso: 'gb' },
                { nombre: 'Francia', iso: 'fr' },
                { nombre: 'Alemania', iso: 'de' },
                { nombre: 'Japón', iso: 'jp' },
                { nombre: 'Brasil', iso: 'br' },
                { nombre: 'China', iso: 'cn' },
                { nombre: 'México', iso: 'mx' },
                { nombre: 'Argentina', iso: 'ar' },
                { nombre: 'Italia', iso: 'it' },
                { nombre: 'Canadá', iso: 'ca' }
              ]
                .filter(p => !paises.some(exist => exist.nombre.toLowerCase() === p.nombre.toLowerCase()))
                .slice(0, 8)
                .map(item => (
                  <button
                    key={item.nombre}
                    type="button"
                    onClick={() => {
                      setNuevoNombre(item.nombre);
                      setNuevaBandera('');
                      inputIndividualRef.current?.focus();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.22rem 0.45rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '5px',
                      color: 'var(--text-color)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <CountryFlag bandera={item.iso} nombre={item.nombre} size="xs" />
                    <span>{item.nombre}</span>
                  </button>
                ))}
            </div>
          </div>
        </form>
      )}

      {/* ── CONTENIDO PRINCIPAL: MODO 4 - PLANTILLAS (.JSON) ──────────────────── */}
      {tab === 'presets' && !preview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: 0 }}>
          {/* Buscador de plantillas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.3rem 0.6rem',
            gap: '0.4rem'
          }}>
            <Search size={13} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar plantilla de comité (.json)..."
              value={busquedaPreset}
              onChange={e => setBusquedaPreset(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                outline: 'none',
                fontSize: '0.76rem',
                width: '100%'
              }}
            />
            {busquedaPreset && (
              <button
                type="button"
                onClick={() => setBusquedaPreset('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista de Presets JSON */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            paddingRight: '2px'
          }}>
            {presetsFiltrados.map(p => {
              const vetosCount = p.paises.filter(x => x.veto).length;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.55rem 0.65rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Encabezado del preset */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.82rem', color: 'var(--text-color)' }}>
                        {p.nombre}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--muted-text)', lineHeight: '1.25', marginTop: '1px' }}>
                        {p.descripcion}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#60a5fa',
                      whiteSpace: 'nowrap'
                    }}>
                      {p.categoria}
                    </span>
                  </div>

                  {/* Banderas muestra & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', overflowX: 'hidden' }}>
                      {p.paises.slice(0, 6).map((c, i) => (
                        <CountryFlag key={i} bandera={c.bandera} nombre={c.nombre} size="xs" />
                      ))}
                      {p.paises.length > 6 && (
                        <span style={{ fontSize: '0.64rem', color: 'var(--muted-text)', marginLeft: '2px', fontWeight: '700' }}>
                          +{p.paises.length - 6}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#3b82f6' }}>
                        {p.paises.length} delegaciones
                      </span>
                      {vetosCount > 0 && (
                        <span style={{ fontSize: '0.64rem', color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '1px', fontWeight: '700' }}>
                          • <Crown size={10} /> {vetosCount} Veto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción del preset */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.15rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCargarPreset(p, false)}
                      style={{
                        padding: '0.3rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        color: 'var(--text-color)',
                        fontWeight: '700',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Edit2 size={11} />
                      <span>Revisar / Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCargarPreset(p, true)}
                      style={{
                        padding: '0.3rem',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: '800',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Check size={12} />
                      <span>Cargar Inmediato</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PASO DE REVISIÓN / PREVISUALIZACIÓN INTERACTIVA ───────────────────── */}
      {preview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: 0 }}>
          {/* Header de Previsualización */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.6rem',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#3b82f6" />
              <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>
                Revisión: <strong style={{ color: '#3b82f6' }}>{preview.length} delegaciones</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={handleOrdenarPreviewAZ}
                title="Ordenar alfabéticamente A-Z"
                style={{
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.68rem',
                  fontWeight: '600',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <ArrowUpDown size={11} /> A-Z
              </button>

              <button
                type="button"
                onClick={() => { setPreview(null); setSelectedPreviewIndex(null); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title="Cancelar y volver"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Barra de Filtro en Previsualización */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 140px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              padding: '0.25rem 0.5rem',
              gap: '0.35rem'
            }}>
              <Search size={12} style={{ color: 'var(--muted-text)' }} />
              <input
                type="text"
                placeholder="Filtrar delegación..."
                value={busquedaPreview}
                onChange={(e) => setBusquedaPreview(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  outline: 'none',
                  fontSize: '0.72rem',
                  width: '100%'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setFiltroPreview(filtroPreview === 'VETO' ? 'TODOS' : 'VETO')}
                style={{
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.68rem',
                  borderRadius: '4px',
                  border: filtroPreview === 'VETO' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                  backgroundColor: filtroPreview === 'VETO' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                  color: filtroPreview === 'VETO' ? '#60a5fa' : 'var(--muted-text)',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                <Crown size={11} style={{ display: 'inline', marginRight: '2px' }} /> Solo Veto
              </button>
            </div>
          </div>

          {/* Hint de personalización de imagen */}
          <div style={{
            fontSize: '0.66rem',
            color: 'var(--muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.15rem 0.2rem'
          }}>
            <Camera size={12} color="#3b82f6" />
            <span>Haz clic en una fila y presiona <strong>Ctrl+V</strong> o el icono de cámara para cambiar la bandera.</span>
          </div>

          {/* Lista de Delegaciones en Previsualización (Sin selector de estatus, siempre Ausente de base) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.35rem',
            minHeight: '120px'
          }}>
            {previewFiltrada.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted-text)', fontSize: '0.75rem', padding: '1rem' }}>
                No se encontraron delegaciones con el filtro actual.
              </div>
            ) : (
              previewFiltrada.map((p, idx) => {
                const originalIndex = preview.findIndex(item => item === p);
                const isSelected = selectedPreviewIndex === originalIndex;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPreviewIndex(originalIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.45rem',
                      borderRadius: '5px',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Bandera */}
                    <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />

                    {/* Botón rápido de cámara para imagen */}
                    <button
                      type="button"
                      title="Cambiar imagen de bandera"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewIndex(originalIndex);
                        rowFileInputRef.current?.click();
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '2px',
                        color: isSelected ? '#3b82f6' : 'var(--muted-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Camera size={12} />
                    </button>

                    {/* Input inline de nombre */}
                    <input
                      type="text"
                      value={p.nombre}
                      onChange={(e) => {
                        const nuevo = e.target.value;
                        setPreview(prev => {
                          const copy = [...prev];
                          copy[originalIndex] = { ...copy[originalIndex], nombre: nuevo };
                          return copy;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px dashed rgba(255,255,255,0.15)',
                        color: 'var(--text-color)',
                        fontWeight: '700',
                        fontSize: '0.76rem',
                        outline: 'none'
                      }}
                    />

                    {/* Badge de Delegado (si existe en el Excel/tabla) */}
                    {p.delegado && (
                      <span
                        title={`Delegado asignado: ${p.delegado}`}
                        style={{
                          fontSize: '0.66rem',
                          color: '#60a5fa',
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Delegado: {p.delegado}
                      </span>
                    )}

                    {/* Botón Veto (P5) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(prev => {
                          const copy = [...prev];
                          copy[originalIndex] = { ...copy[originalIndex], veto: !copy[originalIndex].veto };
                          return copy;
                        });
                      }}
                      title={p.veto ? 'Tiene derecho a veto (P5)' : 'Sin derecho a veto'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: p.veto ? 1 : 0.25
                      }}
                    >
                      <Crown size={14} color="#3b82f6" fill={p.veto ? '#3b82f6' : 'none'} />
                    </button>

                    {/* Eliminar fila */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(prev => prev.filter((_, idx) => idx !== originalIndex));
                        if (selectedPreviewIndex === originalIndex) setSelectedPreviewIndex(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                      title="Eliminar de la lista"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Banner de Sesión / Comité Completo Detectado */}
          {sesionCompletaDetectada && (
            <div style={{
              padding: '0.45rem 0.65rem',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Sparkles size={13} style={{ flexShrink: 0 }} />
              <span>
                Se detectaron datos completos de <strong>"{sesionCompletaDetectada.nombreComite}"</strong> (Agenda, Tópicos y Módulos). Al reemplazar se restaurará el comité al 100%.
              </span>
            </div>
          )}

          {/* Botonera de Aplicación con Azul y Verde */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleAplicar('reemplazar')}
              style={{
                padding: '0.55rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: '800',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.76rem',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)'
              }}
            >
              {t('countries.importReplace', 'Reemplazar Lista Actual')}
            </button>
            <button
              type="button"
              onClick={() => handleAplicar('fusionar')}
              style={{
                padding: '0.55rem',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                fontWeight: '800',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.76rem',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)'
              }}
            >
              {t('countries.importAppend', 'Añadir a la Actual (Fusionar)')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarPaises;
