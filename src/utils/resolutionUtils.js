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

/**
 * Parsea un texto de resolución completo en cláusulas preambulatorias y operativas.
 */
export function parsearResolucion(textoCompleto = '') {
  if (!textoCompleto || !textoCompleto.trim()) return [];

  const lineas = textoCompleto.split(/\r?\n/);
  const articulos = [];
  let buffer = [];
  let numArticulo = 1;
  let enPreambulo = true;
  let textoPreambulo = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const matchArticulo = linea.match(/^(?:(?:\*\*|\*|#+)?\s*(?:Artículo|Art\.|Cláusula|Operative Clause)\s*(\d+)[\.:\*\s]*)(.*)/i) ||
                          linea.match(/^(\d+)[\.\)]\s+(.*)/);

    if (matchArticulo) {
      if (enPreambulo && textoPreambulo.length > 0) {
        articulos.push({
          id: 'preambulo',
          numero: 0,
          prefijo: 'Preámbulo / Antecedentes',
          texto: textoPreambulo.join('\n').trim(),
          esPreambulo: true
        });
        textoPreambulo = [];
        enPreambulo = false;
      } else if (buffer.length > 0) {
        articulos.push({
          id: `art_${numArticulo - 1}`,
          numero: numArticulo - 1,
          prefijo: `Artículo ${numArticulo - 1}.`,
          texto: buffer.join('\n').trim()
        });
        buffer = [];
      }

      const numParsed = parseInt(matchArticulo[1], 10) || numArticulo;
      numArticulo = numParsed + 1;
      const contenidoRestante = matchArticulo[2] || '';
      if (contenidoRestante.trim()) {
        buffer.push(contenidoRestante.trim());
      }
    } else if (enPreambulo) {
      if (linea.includes('CLÁUSULAS OPERATIVAS') || linea.includes('OPERATIVE CLAUSES')) {
        enPreambulo = false;
        if (textoPreambulo.length > 0) {
          articulos.push({
            id: 'preambulo',
            numero: 0,
            prefijo: 'Preámbulo / Antecedentes',
            texto: textoPreambulo.join('\n').trim(),
            esPreambulo: true
          });
          textoPreambulo = [];
        }
      } else {
        textoPreambulo.push(linea);
      }
    } else {
      buffer.push(linea);
    }
  }

  if (enPreambulo && textoPreambulo.length > 0) {
    articulos.push({
      id: 'preambulo',
      numero: 0,
      prefijo: 'Preámbulo / Antecedentes',
      texto: textoPreambulo.join('\n').trim(),
      esPreambulo: true
    });
  } else if (buffer.length > 0) {
    articulos.push({
      id: `art_${numArticulo - 1}`,
      numero: numArticulo - 1,
      prefijo: `Artículo ${numArticulo - 1}.`,
      texto: buffer.join('\n').trim()
    });
  }

  // Fallback si no hay artículos numerados explícitos: segmentar por párrafos
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
