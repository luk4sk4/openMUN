// Funciones de utilidad para importación y exportación de resoluciones y documentos
// Las librerías pesadas (docx, jspdf, mammoth, pdfjs-dist) se importan dinámicamente on-demand para optimizar el tiempo de carga inicial.


/**
 * Extrae texto de archivos .txt, .md, .docx y .pdf
 * @param {File} file 
 * @returns {Promise<{ texto: string, nombre: string }>}
 */
export async function extraerTextoDeArchivo(file) {
  if (!file) throw new Error('No se proporcionó ningún archivo');

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const nombreLimpio = file.name.replace(/\.[^/.]+$/, '');

  // 1. Archivos de texto plano (.txt, .md, .text)
  if (['txt', 'md', 'text', 'markdown'].includes(extension)) {
    const texto = await file.text();
    return { texto, nombre: nombreLimpio };
  }

  // 2. Archivos Word (.docx)
  if (extension === 'docx') {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { texto: result.value || '', nombre: nombreLimpio };
  }

  // 3. Archivos PDF (.pdf)
  if (extension === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      } catch (e) {
        console.warn('PDF Worker initialization fallback:', e);
      }
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          // Detectar saltos de línea basados en cambio de coordenada Y
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
      }

      fullText += (pageNum > 1 ? '\n\n' : '') + pageText.trim();
    }

    return { texto: fullText, nombre: nombreLimpio };
  }

  // Si no coincide con las extensiones anteriores, intentar leer como texto plano por defecto
  try {
    const texto = await file.text();
    return { texto, nombre: nombreLimpio };
  } catch (err) {
    throw new Error(`El formato .${extension} no es compatible. Por favor sube un archivo .docx, .pdf o .txt`);
  }
}

/**
 * Genera y descarga un archivo .txt con el texto de la resolución
 */
export function descargarResolucionTxt({ titulo = 'resolucion', articulos = [], textoRaw = '' }) {
  const contenido = articulos.length > 0
    ? articulos.map(a => `${a.prefijo ? a.prefijo + ' ' : ''}${a.texto}`).join('\n\n')
    : textoRaw;

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  triggerDescargaBlob(blob, `${sanitizarNombreArchivo(titulo)}.txt`);
}

/**
 * Genera y descarga un archivo Word (.docx) formal con formato MUN
 */
export async function descargarResolucionDocx({ titulo = 'Proyecto de Resolución', articulos = [], textoRaw = '' }) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    UnderlineType
  } = await import('docx');

  const children = [];

  // Título principal
  children.push(
    new Paragraph({
      text: titulo.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 }
    })
  );

  if (articulos.length > 0) {
    articulos.forEach(art => {
      if (art.esPreambulo) {
        // Encabezado de Preámbulo
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'CLÁUSULAS PREAMBULATORIAS',
                bold: true,
                size: 24
              })
            ],
            spacing: { before: 240, after: 120 }
          })
        );

        // Párrafos del preámbulo
        const lineasPreambulo = art.texto.split('\n').filter(l => l.trim().length > 0);
        lineasPreambulo.forEach(lin => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: lin.trim(),
                  italics: true,
                  size: 22
                })
              ],
              spacing: { after: 120 },
              alignment: AlignmentType.JUSTIFIED
            })
          );
        });
      } else {
        // Cláusulas operativas / Artículos
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${art.prefijo || `Artículo ${art.numero}.`} `,
                bold: true,
                size: 22
              }),
              new TextRun({
                text: art.texto,
                size: 22
              })
            ],
            spacing: { before: 140, after: 140 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
      }
    });
  } else if (textoRaw.trim()) {
    // Si no hay artículos parseados, exportar el texto crudo estructurado
    const parrafos = textoRaw.split('\n\n').filter(p => p.trim().length > 0);
    parrafos.forEach(p => {
      children.push(
        new Paragraph({
          text: p.trim(),
          spacing: { after: 140 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerDescargaBlob(blob, `${sanitizarNombreArchivo(titulo)}.docx`);
}

/**
 * Genera y descarga un archivo PDF formal con formato MUN
 */
export async function descargarResolucionPdf({ titulo = 'Proyecto de Resolución', articulos = [], textoRaw = '' }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54; // 0.75 in
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const agregarNuevaPaginaSiEsNecesario = (espacioRequerido = 30) => {
    if (cursorY + espacioRequerido > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
      return true;
    }
    return false;
  };

  // Encabezado de la página
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const tituloLineas = doc.splitTextToSize(titulo.toUpperCase(), maxLineWidth);
  tituloLineas.forEach(linea => {
    agregarNuevaPaginaSiEsNecesario(25);
    doc.text(linea, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 18;
  });

  cursorY += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.75);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;

  if (articulos.length > 0) {
    articulos.forEach(art => {
      if (art.esPreambulo) {
        agregarNuevaPaginaSiEsNecesario(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(60, 60, 60);
        doc.text('CLÁUSULAS PREAMBULATORIAS', margin, cursorY);
        cursorY += 14;

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);

        const lineasPreambulo = art.texto.split('\n').filter(l => l.trim().length > 0);
        lineasPreambulo.forEach(lp => {
          const splitLines = doc.splitTextToSize(lp.trim(), maxLineWidth);
          splitLines.forEach(l => {
            agregarNuevaPaginaSiEsNecesario(14);
            doc.text(l, margin, cursorY);
            cursorY += 13;
          });
          cursorY += 5;
        });
        cursorY += 8;
      } else {
        // Artículo Operativo
        agregarNuevaPaginaSiEsNecesario(24);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);

        const prefijo = art.prefijo || `Artículo ${art.numero}.`;
        const textoCompleto = `${prefijo} ${art.texto}`;
        const splitLines = doc.splitTextToSize(textoCompleto, maxLineWidth);

        splitLines.forEach((linea, idx) => {
          agregarNuevaPaginaSiEsNecesario(14);
          if (idx === 0) {
            // Primera línea con negrita en el prefijo si es posible
            doc.setFont('helvetica', 'normal');
            doc.text(linea, margin, cursorY);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.text(linea, margin, cursorY);
          }
          cursorY += 13;
        });
        cursorY += 7;
      }
    });
  } else if (textoRaw.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    const splitLines = doc.splitTextToSize(textoRaw, maxLineWidth);
    splitLines.forEach(linea => {
      agregarNuevaPaginaSiEsNecesario(14);
      doc.text(linea, margin, cursorY);
      cursorY += 13;
    });
  }

  // Pie de página con numeración
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Página ${i} de ${totalPages} • Generado por OpenMUN`,
      pageWidth / 2,
      pageHeight - 25,
      { align: 'center' }
    );
  }

  doc.save(`${sanitizarNombreArchivo(titulo)}.pdf`);
}

/**
 * Función auxiliar para disparar la descarga de un Blob en el navegador
 */
function triggerDescargaBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Limpia el nombre del archivo para que sea seguro en el sistema operativo
 */
function sanitizarNombreArchivo(nombre = 'documento') {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'resolucion_openmun';
}
