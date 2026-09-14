/**
 * Generador de Reportes y Actas Oficiales de Conferencia para OpenMUN.
 * Utiliza importaciones dinámicas on-demand (jspdf / xlsx) para optimizar el bundle.
 */

// Helper para limpiar nombres de archivo
function sanitizarNombre(nombre) {
  return String(nombre || 'Comite')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 40);
}

function formatSegundosLargo(totalSeg = 0) {
  if (!totalSeg || totalSeg <= 0) return '0 min 00 s';
  const horas = Math.floor(totalSeg / 3600);
  const mins = Math.floor((totalSeg % 3600) / 60);
  const secs = totalSeg % 60;
  if (horas > 0) return `${horas}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Genera y descarga el Acta Oficial Ejecutiva en PDF
 */
export async function exportCommitteeReportPdf({
  nombreComite = 'Comité General',
  agendaSesion = {},
  paises = [],
  estadisticasDelegaciones = [],
  registroIntervenciones = [],
  mociones = [],
  enmiendasSesion = {},
  votacionSesion = {}
}) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededSpace = 30) => {
    if (cursorY + neededSpace > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
      return true;
    }
    return false;
  };

  const fechaActualStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // ── 1. ENCABEZADO OFICIAL OPENMUN ──
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 75, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OPENMUN — ACTA OFICIAL DE SESIÓN Y EVALUACIÓN', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Comité: ${nombreComite.toUpperCase()} | Fecha: ${fechaActualStr}`, margin, 50);
  doc.text(`Tópico: ${agendaSesion?.temaActual || 'Agenda General de Sesión'}`, margin, 64);

  cursorY = 95;

  // ── 2. SECCIÓN: QUÓRUM Y ASISTENCIA ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. QUÓRUM Y CONFIGURACIÓN PARLAMENTARIA', margin, cursorY);
  cursorY += 16;

  const totalP = paises.length;
  const presentes = paises.filter(p => p.estatus === 'Presente').length;
  const presYVot = paises.filter(p => p.estatus === 'Presente y Votando').length;
  const ausentes = paises.filter(p => p.estatus === 'Ausente').length;
  const totalAsistentes = presentes + presYVot;
  const mayoriaSimple = Math.floor(totalAsistentes / 2) + 1;
  const mayoriaDosTercios = Math.ceil((totalAsistentes * 2) / 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const colW = contentWidth / 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 38, 4, 4, 'F');

  doc.text(`Total Delegaciones: ${totalP}`, margin + 10, cursorY + 15);
  doc.text(`Asistentes (Quórum): ${totalAsistentes}`, margin + 10, cursorY + 28);

  doc.text(`Presentes: ${presentes}`, margin + colW + 10, cursorY + 15);
  doc.text(`Presentes y Votando: ${presYVot}`, margin + colW + 10, cursorY + 28);

  doc.text(`Ausentes: ${ausentes}`, margin + colW * 2 + 10, cursorY + 15);
  doc.text(`Mayoría Simple: ${mayoriaSimple} votos`, margin + colW * 2 + 10, cursorY + 28);

  doc.text(`Mayoría 2/3: ${mayoriaDosTercios} votos`, margin + colW * 3 + 10, cursorY + 15);
  doc.text(`P5 / Derecho a Veto: ${paises.filter(p => p.veto).length}`, margin + colW * 3 + 10, cursorY + 28);

  cursorY += 52;

  // ── 3. SECCIÓN: MÉTRICAS Y ANALÍTICAS GENERALES ──
  checkPageBreak(80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. BALANCE DE DEBATE Y PARTICIPACIÓN GLOBAL', margin, cursorY);
  cursorY += 16;

  const totalSegHablados = estadisticasDelegaciones.reduce((acc, d) => acc + (d.tiempoHabladoTotal || 0), 0);
  const totalDiscursos = estadisticasDelegaciones.reduce((acc, d) => acc + (d.cantidadIntervenciones || 0), 0);
  const totalMociones = mociones.length;
  const mocionesAprobadas = mociones.filter(m => m.estado === 'Aprobada').length;
  const tasaMociones = totalMociones > 0 ? Math.round((mocionesAprobadas / totalMociones) * 100) : 0;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 34, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Tiempo Total en Sala: ${formatSegundosLargo(totalSegHablados)}`, margin + 10, cursorY + 14);
  doc.text(`Total Intervenciones: ${totalDiscursos}`, margin + 10, cursorY + 26);

  doc.text(`Mociones Propuestas: ${totalMociones}`, margin + colW * 2, cursorY + 14);
  doc.text(`Mociones Aprobadas: ${mocionesAprobadas} (${tasaMociones}% éxito)`, margin + colW * 2, cursorY + 26);

  cursorY += 46;

  // ── 4. SECCIÓN: TABLA DETALLADA DE DELEGACIONES Y PREMIACIÓN ──
  checkPageBreak(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DESGLOSE INDIVIDUAL POR DELEGACIÓN (EVALUACIÓN)', margin, cursorY);
  cursorY += 16;

  // Cabecera de la tabla
  const headers = ['#', 'Delegación', 'Estatus', 'Tiempo Hablado', 'Interv.', 'Preg.', 'Moc. (Apr.)'];
  const colWidths = [24, 150, 95, 95, 45, 45, 78];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, cursorY, contentWidth, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  headers.forEach((h, i) => {
    doc.text(h, currentX + 4, cursorY + 13);
    currentX += colWidths[i];
  });

  cursorY += 20;

  // Filas de delegaciones
  const listaOrdenada = [...estadisticasDelegaciones].sort((a, b) => (b.tiempoHabladoTotal || 0) - (a.tiempoHabladoTotal || 0));

  listaOrdenada.forEach((del, idx) => {
    checkPageBreak(22);

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, cursorY, contentWidth, 18, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let cellX = margin;
    // Index
    doc.text(String(idx + 1), cellX + 4, cursorY + 12);
    cellX += colWidths[0];

    // Nombre + Veto
    const nombrePais = del.veto ? `${del.nombre} (P5)` : del.nombre;
    doc.text(nombrePais.substring(0, 26), cellX + 4, cursorY + 12);
    cellX += colWidths[1];

    // Estatus
    doc.text(del.estatus || 'Presente', cellX + 4, cursorY + 12);
    cellX += colWidths[2];

    // Tiempo hablado
    doc.text(formatSegundosLargo(del.tiempoHabladoTotal), cellX + 4, cursorY + 12);
    cellX += colWidths[3];

    // Discursos
    doc.text(String(del.cantidadIntervenciones || 0), cellX + 12, cursorY + 12);
    cellX += colWidths[4];

    // Preguntas
    doc.text(String(del.preguntasRealizadas || 0), cellX + 12, cursorY + 12);
    cellX += colWidths[5];

    // Mociones
    const mocStr = `${del.mocionesPropuestas || 0} (${del.mocionesAprobadas || 0})`;
    doc.text(mocStr, cellX + 12, cursorY + 12);

    cursorY += 18;
  });

  cursorY += 15;

  // ── 5. FIRMAS DE MESA DE PRESIDENCIA ──
  checkPageBreak(70);
  cursorY += 10;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 40, cursorY + 30, margin + 200, cursorY + 30);
  doc.line(pageWidth - margin - 200, cursorY + 30, pageWidth - margin - 40, cursorY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Presidente / Chair del Comité', margin + 65, cursorY + 44);
  doc.text('Moderador / Co-Chair / Secretaría', pageWidth - margin - 190, cursorY + 44);

  // Descargar PDF
  const nombreLimpio = sanitizarNombre(nombreComite);
  doc.save(`Acta_Oficial_${nombreLimpio}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

