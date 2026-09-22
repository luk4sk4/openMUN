// Utilidades para análisis, modificación y reconstrucción de resoluciones y enmiendas MUN

/**
 * Normaliza espacios y saltos de línea para comparaciones robustas.
 */
export function normalizarEspacios(str) {
  return String(str || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Reemplaza texto dentro de un artículo con tolerancia a diferencias sutiles
 * de saltos de línea, espacios o mayúsculas/minúsculas.
 */
export function reemplazarTextoConTolerancia(textoBase = '', textoOriginal = '', textoPropuesto = '') {
  if (!textoOriginal || !textoOriginal.trim()) {
    return textoPropuesto;
  }

  const base = String(textoBase || '');
  const orig = String(textoOriginal || '').trim();
  const prop = String(textoPropuesto || '').trim();

  // 1. Coincidencia exacta directa
  if (base.includes(orig)) {
    return base.replace(orig, prop);
  }

  // 2. Coincidencia normalizando saltos de línea (\r\n a \n)
  const baseLF = base.replace(/\r\n/g, '\n');
  const origLF = orig.replace(/\r\n/g, '\n');
  if (baseLF.includes(origLF)) {
    return baseLF.replace(origLF, prop);
  }

  // 3. Si el texto original normalizado es idéntico a todo el artículo normalizado
  const baseNorm = normalizarEspacios(base);
  const origNorm = normalizarEspacios(orig);
  if (baseNorm === origNorm) {
    return prop;
  }

  // 4. Coincidencia flexible de palabras (tokens) si es un fragmento
  if (origNorm.length > 0 && baseNorm.includes(origNorm)) {
    const palabras = origNorm.split(' ').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (palabras.length > 0) {
      try {
        const regex = new RegExp(palabras.join('\\s+'), 'i');
        if (regex.test(base)) {
          return base.replace(regex, prop);
        }
      } catch {
        // Fallback
      }
    }
  }

  // 5. Si el fragmento abarca la mayor parte del texto (> 75%), reemplazar todo
  if (origNorm.length >= baseNorm.length * 0.75) {
    return prop;
  }

  // 6. Intento final eliminando signos de puntuación iniciales o finales
  const origTrimmedPunct = orig.replace(/^[,\.;:\s]+|[,\.;:\s]+$/g, '');
  if (origTrimmedPunct && base.includes(origTrimmedPunct)) {
    return base.replace(origTrimmedPunct, prop);
  }

  return base;
}

function romanoAEntero(str) {
  const romanMap = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  const s = String(str || '').toLowerCase().trim();
  if (!/^[ivxlcdm]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const curr = romanMap[s[i]];
    const next = romanMap[s[i + 1]];
    if (next && curr < next) {
      total -= curr;
    } else {
      total += curr;
    }
  }
  return total > 0 ? total : null;
}

const REGEX_CABECERA_PREAMBULO = /^(?:#+\s*|\*{1,2}|_{1,2})?\s*(?:CL[AÁ]USULAS\s+PREAMBULATORIAS|SECCI[OÓ]N\s+PREAMBULAR|PRE[AÁ]MBULO|PREAMBLE|ANTECEDENTES|CONSIDERANDO|P[AÁ]RRAFOS\s+PREAMBULATORIOS)\b/i;
const REGEX_CABECERA_OPERATIVAS = /^(?:#+\s*|\*{1,2}|_{1,2})?\s*(?:CL[AÁ]USULAS\s+(?:OPERATIVAS|RESOLUTIVAS|DISPOSITIVAS)|SECCI[OÓ]N\s+(?:OPERATIVA|RESOLUTIVA)|OPERATIVE\s+(?:CLAUSES|SECTION|PARAGRAPHS)|DISPOSITIVAS|RESUELVE:|DECLARA:|ACUERDA:|HA RESUELTO:|DECIDE:)\b/i;

const REGEX_VERBO_OPERATIVO = /^(?:(?:\*\*|\*|#+|_{1,2})\s*)?(Decide|Condena|Insta|Exhorta|Recomienda|Pide|Solicita|Afirma|Aprueba|Autoriza|Confirma|Declara|Designa|Enfatiza|Expresa|Llama|Proclama|Reafirma|Reconoce|Resuelve|Subraya|Toma nota|Invita|Reitera|Felicita|Lamenta|Recuerda|Determina|Exige|Instruye|Establece|Condemns|Decides|Declares|Encourages|Endorses|Emphasizes|Expresses|Invites|Notes|Recommends|Reminds|Requests|Resolves|Stresses|Urges|Calls upon|Affirms|Approves|Authorizes|Congratulates|Deplores|Designates|Draws attention|Proclaims|Reaffirms|Supports|Takes note|Transmits|Trusts|Demands|Establishes)(?:(?:\*\*|\*|_{1,2}))?\b(.*)/i;

const REGEX_SUBINCISO = /^\s*(?:[a-z]\)|\([a-z]\)|\([0-9]+\)|[0-9]+\.[0-9]+|[ivxlcdm]+\)|\([ivxlcdm]+\)|[-•*+])\s+/i;
const REGEX_METADATOS = /^(?:Comit[eé]|Tema|T[oó]pico|Patrocinadores|Firmantes|Sponsors|Signatories|Topic|Committee|Draft Resolution|Proyecto de Resoluci[oó]n|Asunto):\s*/i;

/**
 * Parsea un texto de resolución completo en cláusulas preambulatorias y operativas
 * con alta tolerancia a diferentes estilos de redacción MUN.
 */
export function parsearResolucion(textoCompleto = '') {
  if (!textoCompleto || !textoCompleto.trim()) return [];

  const lineas = textoCompleto.split(/\r?\n/);
  const articulos = [];
  let buffer = [];
  let numArticulo = 1;
  let enPreambulo = true;
  let textoPreambulo = [];
  let prefijoActual = '';

  const flushBuffer = () => {
    if (buffer.length > 0) {
      articulos.push({
        id: `art_${numArticulo - 1}`,
        numero: numArticulo - 1,
        prefijo: prefijoActual || `Artículo ${numArticulo - 1}.`,
        texto: buffer.join('\n').trim()
      });
      buffer = [];
    }
  };

  const flushPreambulo = () => {
    if (textoPreambulo.length > 0) {
      const contenido = textoPreambulo.join('\n').trim();
      if (contenido) {
        articulos.push({
          id: 'preambulo',
          numero: 0,
          prefijo: 'Preámbulo / Antecedentes',
          texto: contenido,
          esPreambulo: true
        });
      }
      textoPreambulo = [];
    }
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const lineaTrim = linea.trim();
    if (!lineaTrim) {
      if (!enPreambulo && buffer.length > 0) buffer.push('');
      else if (enPreambulo && textoPreambulo.length > 0) textoPreambulo.push('');
      continue;
    }

    // Omitir líneas de metadatos al inicio si aún estamos en preámbulo vacío
    if (enPreambulo && textoPreambulo.length === 0 && REGEX_METADATOS.test(lineaTrim)) {
      continue;
    }

    // Cabeceras de preámbulo explícitas
    if (REGEX_CABECERA_PREAMBULO.test(lineaTrim)) {
      enPreambulo = true;
      continue;
    }

    // Cabeceras operativas explícitas (mayúsculas, minúsculas, markdown, sin acento)
    if (REGEX_CABECERA_OPERATIVAS.test(lineaTrim)) {
      flushPreambulo();
      flushBuffer();
      enPreambulo = false;
      continue;
    }

    // Si es un subinciso sangrado dentro de un artículo, mantenerlo dentro del buffer
    if (!enPreambulo && buffer.length > 0 && REGEX_SUBINCISO.test(lineaTrim)) {
      buffer.push(linea);
      continue;
    }

    // Comprobar si la línea inicia un nuevo artículo operativo
    let matchNumero = null;
    let restoTexto = '';
    let prefijoDetectado = '';

    // Patrón 1: "Artículo 1.", "Art. 1:", "Cláusula 1", "Operative Clause 1", "OP 1:", "OP1.", "Párrafo 1"
    const mArt = lineaTrim.match(/^(?:(?:\*\*|\*|#+|_{1,2})\s*)?(?:Art[ií]culo|Art\.|Cl[aá]usula|Clause|Operative Clause|OP\b|OP\.|P[aá]rrafo Operativo|P[aá]rrafo|P[aá]r\.)\s*([0-9]+|[IVXLCDM]+)[\.:\*\s\)\-]*(.*)/i);
    if (mArt) {
      const rawNum = mArt[1];
      const parsedNum = /^\d+$/.test(rawNum) ? parseInt(rawNum, 10) : (romanoAEntero(rawNum) || numArticulo);
      matchNumero = parsedNum;
      prefijoDetectado = `Artículo ${rawNum}.`;
      restoTexto = mArt[2] || '';
    } else {
      // Patrón 2: Número arábigo al inicio: "1.", "**1.**", "1)", "1.-", "1: "
      const mNum = lineaTrim.match(/^(?:(?:\*\*|\*|#+|_{1,2})\s*)?(\d+)[\.\)\-:]\s*(?:\*\*|\*|_{1,2})?\s*(.*)/) ||
                   lineaTrim.match(/^(?:(?:\*\*|\*|#+|_{1,2})\s*)?(\d+)(?:\*\*|\*|_{1,2})[\.\)\-:]\s*(.*)/);
      if (mNum && (mNum[2].trim().length > 0 || !enPreambulo)) {
        matchNumero = parseInt(mNum[1], 10);
        prefijoDetectado = `Artículo ${matchNumero}.`;
        restoTexto = mNum[2] || '';
      } else {
        // Patrón 3: Número romano al inicio: "I.", "**I.**", "II)"
        const mRom = lineaTrim.match(/^(?:(?:\*\*|\*|#+|_{1,2})\s*)([IVXLCDM]+)[\.\)\-:]\s*(?:\*\*|\*|_{1,2})?\s*(.*)/i) ||
                     lineaTrim.match(/^([IVXLCDM]{1,6})[\.\)\-:]\s+(.*)/i);
        if (mRom && romanoAEntero(mRom[1])) {
          matchNumero = romanoAEntero(mRom[1]);
          prefijoDetectado = `Artículo ${mRom[1].toUpperCase()}.`;
          restoTexto = mRom[2] || '';
        } else {
          // Patrón 4: Verbo operativo MUN (permite transicionar a operativo incluso sin cabecera)
          const mVerbo = lineaTrim.match(REGEX_VERBO_OPERATIVO);
          if (mVerbo) {
            matchNumero = numArticulo;
            prefijoDetectado = `Artículo ${numArticulo}.`;
            restoTexto = lineaTrim;
          }
        }
      }
    }

    if (matchNumero !== null) {
      if (enPreambulo) {
        flushPreambulo();
        enPreambulo = false;
      } else {
        flushBuffer();
      }

      numArticulo = matchNumero + 1;
      prefijoActual = prefijoDetectado;
      if (restoTexto.trim()) {
        buffer.push(restoTexto.trim());
      }
    } else if (enPreambulo) {
      textoPreambulo.push(linea);
    } else {
      buffer.push(linea);
    }
  }

  if (enPreambulo) {
    flushPreambulo();
  }
  flushBuffer();

  // Si sólo quedó un preámbulo pero no hay cabecera explícita de preámbulo y hay varios párrafos
  if (articulos.length === 1 && articulos[0].esPreambulo) {
    const txt = articulos[0].texto;
    const tieneCabeceraPreambulo = REGEX_CABECERA_PREAMBULO.test(textoCompleto);
    const parrafos = txt.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (!tieneCabeceraPreambulo && parrafos.length > 1) {
      return parrafos.map((p, idx) => ({
        id: `art_${idx + 1}`,
        numero: idx + 1,
        prefijo: `Artículo ${idx + 1}.`,
        texto: p.trim()
      }));
    }
  }

  // Fallback si no hay artículos reconocidos
  if (articulos.length === 0 && textoCompleto.trim().length > 0) {
    const parrafos = textoCompleto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return parrafos.map((p, idx) => ({
      id: `art_${idx + 1}`,
      numero: idx + 1,
      prefijo: `Artículo ${idx + 1}.`,
      texto: p.trim()
    }));
  }

  return articulos;
}

/**
 * Reconstruye el texto completo de una resolución a partir de sus artículos estructurados.
 * Garantiza que el preámbulo no lleve prefijo artificial y que las cláusulas operativas
 * mantengan su encabezado formal.
 */
export function reconstruirTextoResolucion(articulos = []) {
  if (!articulos || articulos.length === 0) return '';

  const partes = [];
  const preambulo = articulos.find(a => a.esPreambulo);
  const operativos = articulos.filter(a => !a.esPreambulo);

  if (preambulo && preambulo.texto) {
    // El texto del preámbulo se agrega directo sin prefijo "Preámbulo / Antecedentes"
    partes.push(preambulo.texto.trim());
  }

  if (operativos.length > 0) {
    const tieneCabeceraOperativa = preambulo && /CL[AÁ]USULAS OPERATIVAS|OPERATIVE CLAUSES/i.test(preambulo.texto);
    if (preambulo && !tieneCabeceraOperativa) {
      partes.push('---\n\n### CLÁUSULAS OPERATIVAS');
    }

    operativos.forEach(op => {
      const prefijo = op.prefijo ? op.prefijo.trim() : `Artículo ${op.numero}.`;
      const textoLimpio = (op.texto || '').trim();
      const prefijoSinPunto = prefijo.replace(/[\.:]$/, '');
      const regexPrefijo = new RegExp(`^(?:\\*\\*|#+)?\\s*${prefijoSinPunto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\.:\\*\\s]*`, 'i');
      
      if (regexPrefijo.test(textoLimpio)) {
        partes.push(textoLimpio);
      } else {
        partes.push(`**${prefijo}** ${textoLimpio}`);
      }
    });
  }

  return partes.join('\n\n');
}

/**
 * Aplica una enmienda aprobada a la lista de artículos estructurados.
 */
export function aplicarEnmiendaAArticulos(articulos = [], enmienda = {}) {
  let nuevos = articulos.map(a => ({ ...a }));
  const { tipo, articuloId, textoOriginal = '', textoPropuesto = '' } = enmienda;

  if (articuloId) {
    const index = nuevos.findIndex(a => a.id === articuloId);
    if (index !== -1) {
      const art = { ...nuevos[index] };
      const textoActual = art.texto || '';

      if (tipo === 'adicion') {
        const prop = textoPropuesto.trim();
        if (textoOriginal && textoOriginal.trim() && textoActual.includes(textoOriginal.trim())) {
          // Insertar a continuación del texto original de referencia
          art.texto = textoActual.replace(textoOriginal.trim(), `${textoOriginal.trim()} ${prop}`);
        } else {
          // Agregar al final del artículo
          const sep = textoActual.endsWith('.') || textoActual.endsWith(';') ? ' ' : '. ';
          art.texto = textoActual ? `${textoActual}${sep}${prop}` : prop;
        }
        art.modificado = true;
      } else if (tipo === 'supresion') {
        const orig = textoOriginal.trim();
        if (orig && normalizarEspacios(orig) !== normalizarEspacios(textoActual)) {
          // Supresión parcial de texto
          art.texto = reemplazarTextoConTolerancia(textoActual, orig, '').replace(/\s+/g, ' ').trim();
        } else {
          // Supresión del artículo completo
          art.texto = '[CLÁUSULA SUPRIMIDA]';
          art.suprimido = true;
        }
        art.modificado = true;
      } else if (tipo === 'modificacion') {
        art.texto = reemplazarTextoConTolerancia(textoActual, textoOriginal, textoPropuesto);
        art.modificado = true;
      }

      nuevos[index] = art;
      return nuevos;
    }
  }

  // Si no se especificó articuloId o es una adición global de nuevo artículo
  if (tipo === 'adicion') {
    const operativos = nuevos.filter(a => !a.esPreambulo);
    const num = operativos.length + 1;
    const nuevoArt = {
      id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      numero: num,
      prefijo: `Artículo ${num}.`,
      texto: textoPropuesto.trim(),
      modificado: true
    };
    nuevos.push(nuevoArt);
    return nuevos;
  }

  // Si es modificación o supresión sin articuloId, intentar localizar el texto en los artículos existentes
  if ((tipo === 'modificacion' || tipo === 'supresion') && textoOriginal) {
    const origNorm = normalizarEspacios(textoOriginal);
    let matched = false;

    nuevos = nuevos.map(art => {
      if (matched) return art;
      if (art.texto && (art.texto.includes(textoOriginal.trim()) || normalizarEspacios(art.texto).includes(origNorm))) {
        matched = true;
        if (tipo === 'supresion') {
          return {
            ...art,
            texto: reemplazarTextoConTolerancia(art.texto, textoOriginal, '').replace(/\s+/g, ' ').trim(),
            modificado: true
          };
        } else {
          return {
            ...art,
            texto: reemplazarTextoConTolerancia(art.texto, textoOriginal, textoPropuesto),
            modificado: true
          };
        }
      }
      return art;
    });
  }

  return nuevos;
}
