import i18n from '../languages/index.js';

/**
 * Generador de Reportes y Actas Oficiales de Conferencia para OpenMUN.
 * Adaptado al Sistema de Diseño Oficial de OpenMUN (/openmun-design):
 *  - Paleta institucional sobria y cálida: Terracota (#b85434 / #a84728), superficies neutras cálidas (#f5f4f0 / #faf9f7).
 *  - Jerarquía clara: peso, escala tipográfica proporcional y espaciado consistente.
 *  - Distinción estricta de acento de marca vs. colores semánticos con indicadores visuales y etiquetas explícitas.
 *  - Tablas ejecutivas limpias, paginación con encabezados/pies recurrentes y firmas institucionales.
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

// ── TOKENS DEL SISTEMA DE DISEÑO DE OPENMUN (LIGHT DOCUMENT MODE) ──
const THEME = {
  // Acento Institucional Terracota
  primary: [184, 84, 52],        // #b85434 (--btn-bg)
  accent: [168, 71, 40],         // #a84728 (--accent-color light)
  accentDarkBg: [239, 163, 127], // #efa37f (--accent-color dark / texto sobre cabecera oscura)
  accentSoft: [253, 246, 243],   // #fdf6f3 (lavado suave terracota)

  // Superficies y Fondos
  headerDark: [44, 44, 44],        // #2c2c2c (--header-bg / superficie oscura OpenMUN)
  headerMuted: [185, 185, 185],    // #b9b9b9 (--muted-text en modo oscuro)
  surfaceWarm: [245, 244, 240],    // #f5f4f0 (--card-header-bg / superficie de panel claro)
  surfaceSubtle: [250, 249, 247],  // #faf9f7 (fondo alterno en filas de tabla)
  white: [255, 255, 255],          // #ffffff (página y filas base)

  // Bordes y Separadores
  border: [220, 216, 209],       // #dcd8d1 (--border-color)
  subborder: [230, 227, 220],    // #e6e3dc (--subborder-color)

  // Tipografía y Textos
  textMain: [32, 32, 32],        // #202020 (--text-color)
  textMuted: [102, 98, 93],      // #66625d (--muted-text)

  // Estados Semánticos (OpenMUN Light Theme)
  success: [36, 94, 57],         // #245e39 (--success-color: Presente, Aprobada)
  info: [51, 95, 133],           // #335f85 (--info-color: Presente y Votando)
  danger: [163, 61, 52],         // #a33d34 (--danger-color: Ausente, Rechazada)
  warning: [122, 89, 30]         // #7a591e (--warning-color: Mayoría, Atención)
};

/**
 * Genera y descarga el Acta Oficial Ejecutiva en PDF conforme a /openmun-design
 */
export async function exportCommitteeReportPdf({
  nombreComite = i18n.t('ui.generalCommittee', 'Comité General'),
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
  const margin = 38;
  const contentWidth = pageWidth - margin * 2; // ~536 pt
  let cursorY = margin;

  // Helper de salto de página con reanudación limpia
  const checkPageBreak = (neededSpace = 30, onNewPage = null) => {
    if (cursorY + neededSpace > pageHeight - margin - 22) {
      doc.addPage();
      cursorY = margin + 14;
      if (typeof onNewPage === 'function') {
        onNewPage();
      }
      return true;
    }
    return false;
  };

  const fechaActualStr = new Date().toLocaleDateString(i18n.resolvedLanguage, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Helper para títulos de sección según el sistema OpenMUN
  const drawSectionTitle = (titleText, subtitleText = '') => {
    checkPageBreak(36);
    // Marcador sutil terracota (4x10 pt)
    doc.setFillColor(...THEME.primary);
    doc.rect(margin, cursorY + 1.5, 3.5, 10.5, 'F');

    // Texto de título principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.textMain);
    doc.text(titleText, margin + 9, cursorY + 10.5);

    if (subtitleText) {
      const titleWidth = doc.getTextWidth(titleText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...THEME.textMuted);
      doc.text(`— ${subtitleText}`, margin + 13 + titleWidth, cursorY + 10.5);
    }

    cursorY += 16;
  };

  // Helper para dibujar estado con punto semántico
  const drawStatusWithDot = (statusText, x, y, statusType = 'Presente') => {
    let dotColor = THEME.success;
    if (statusType.includes('Votando') || statusType === 'Presente y Votando') {
      dotColor = THEME.info;
    } else if (statusType.includes('Ausente') || statusType === 'Rechazada' || statusType === 'Fallida') {
      dotColor = THEME.danger;
    } else if (statusType.includes('Abstención') || statusType.includes('Pendiente') || statusType.includes('Mayoría')) {
      dotColor = THEME.warning;
    }

    doc.setFillColor(...dotColor);
    doc.circle(x + 3.5, y - 2.5, 2.3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...THEME.textMain);
    doc.text(statusText, x + 9, y);
  };

  // ══════════════════════════════════════════════════════════════
  // 1. ENCABEZADO INSTITUCIONAL OPENMUN
  // ══════════════════════════════════════════════════════════════
  const headerHeight = 72;
  doc.setFillColor(...THEME.headerDark);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Franja terracota inferior de acento (identidad OpenMUN)
  doc.setFillColor(...THEME.primary);
  doc.rect(0, headerHeight, pageWidth, 3.5, 'F');

  // Logotipo y Título Documental
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...THEME.accentDarkBg);
  doc.text('OPENMUN', margin, 27);

  const openMunW = doc.getTextWidth('OPENMUN');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.text(' ·  ' + i18n.t('ui.officialSessionMinutes', 'ACTA OFICIAL DE SESIÓN Y EVALUACIÓN'), margin + openMunW, 27);

  // Insignia Oficial a la derecha
  const badgeText = i18n.t('ui.certifiedDocument', 'DOCUMENTO OFICIAL');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  const badgeW = doc.getTextWidth(badgeText) + 12;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(58, 58, 58);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.6);
  doc.roundedRect(badgeX, 16, badgeW, 15, 3, 3, 'FD');
  doc.setTextColor(...THEME.accentDarkBg);
  doc.text(badgeText, badgeX + 6, 26.5);

  // Línea 2: Nombre de Comité y Fecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 242, 235);
  const comiteUpper = nombreComite.toUpperCase();
  doc.text(comiteUpper, margin, 46);

  const comiteW = doc.getTextWidth(comiteUpper);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.headerMuted);
  doc.text('  |  ' + fechaActualStr, margin + comiteW, 46);

  // Línea 3: Tópico / Agenda
  const temaStr = i18n.t('ui.topic3', { v0: agendaSesion?.temaActual || i18n.t('ui.generalSessionAgenda', 'Agenda General de Sesión') });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.headerMuted);
  doc.text(temaStr.substring(0, 95), margin, 60);

  cursorY = 94;

  // ══════════════════════════════════════════════════════════════
  // 2. SECCIÓN: QUÓRUM Y CONFIGURACIÓN PARLAMENTARIA
  // ══════════════════════════════════════════════════════════════
  drawSectionTitle(i18n.t('ui.1QuorumAndParliamentarySettings', '1. QUÓRUM Y CONFIGURACIÓN PARLAMENTARIA'));

  const totalP = paises.length;
  const presentes = paises.filter(p => p.estatus === 'Presente').length;
  const presYVot = paises.filter(p => p.estatus === 'Presente y Votando').length;
  const ausentes = paises.filter(p => p.estatus === 'Ausente').length;
  const totalAsistentes = presentes + presYVot;
  const mayoriaSimple = Math.floor(totalAsistentes / 2) + 1;
  const mayoriaDosTercios = Math.ceil((totalAsistentes * 2) / 3);
  const totalVetoP5 = paises.filter(p => p.veto).length;

  const cardHeightQuorum = 48;
  doc.setFillColor(...THEME.surfaceWarm);
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cursorY, contentWidth, cardHeightQuorum, 5, 5, 'FD');

  const colW = contentWidth / 4;

  // Columna 1: Totales generales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.totalDelegationsLabel', 'Total Delegaciones:'), margin + 10, cursorY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(String(totalP), margin + 88, cursorY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.attendingQuorumLabel', 'Asistentes (Quórum):'), margin + 10, cursorY + 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(String(totalAsistentes), margin + 88, cursorY + 34);

  // Columna 2: Estados Presente y Presente y Votando (con puntos semánticos)
  drawStatusWithDot(
    i18n.t('report.present', { count: presentes }),
    margin + colW + 10,
    cursorY + 16,
    'Presente'
  );
  drawStatusWithDot(
    i18n.t('report.presentAndVoting', { count: presYVot }),
    margin + colW + 10,
    cursorY + 34,
    'Presente y Votando'
  );

  // Columna 3: Ausentes y P5 Veto
  drawStatusWithDot(
    i18n.t('report.absent', { count: ausentes }),
    margin + colW * 2 + 10,
    cursorY + 16,
    'Ausente'
  );
  drawStatusWithDot(
    i18n.t('report.veto', { count: totalVetoP5 }),
    margin + colW * 2 + 10,
    cursorY + 34,
    'Mayoría'
  );

  // Columna 4: Mayorías parlamentarias requeridas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.simpleMajorityLabel', 'Mayoría Simple:'), margin + colW * 3 + 10, cursorY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.textMain);
  doc.text(`${mayoriaSimple} ${i18n.t('ui.votesAbbr', 'votos')}`, margin + colW * 3 + 70, cursorY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.23MajorityLabel', 'Mayoría 2/3:'), margin + colW * 3 + 10, cursorY + 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.textMain);
  doc.text(`${mayoriaDosTercios} ${i18n.t('ui.votesAbbr', 'votos')}`, margin + colW * 3 + 70, cursorY + 34);

  cursorY += cardHeightQuorum + 16;

  // ══════════════════════════════════════════════════════════════
  // 3. SECCIÓN: BALANCE DEL DEBATE Y PARTICIPACIÓN GLOBAL
  // ══════════════════════════════════════════════════════════════
  drawSectionTitle(i18n.t('ui.2DebateBalanceAndOverallParticipation', '2. BALANCE DE DEBATE Y PARTICIPACIÓN GLOBAL'));

  const totalSegHablados = estadisticasDelegaciones.reduce((acc, d) => acc + (d.tiempoHabladoTotal || 0), 0);
  const totalDiscursos = estadisticasDelegaciones.reduce((acc, d) => acc + (d.cantidadIntervenciones || 0), 0);
  const totalMociones = mociones.length;
  const mocionesAprobadas = mociones.filter(m => m.estado === 'Aprobada').length;
  const tasaMociones = totalMociones > 0 ? Math.round((mocionesAprobadas / totalMociones) * 100) : 0;

  const cardHeightMetrics = 42;
  doc.setFillColor(...THEME.surfaceWarm);
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cursorY, contentWidth, cardHeightMetrics, 5, 5, 'FD');

  const metricColW = contentWidth / 4;

  // Métrica 1: Tiempo en sala
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.timeInSessionLabel', 'TIEMPO TOTAL EN SALA'), margin + 10, cursorY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(formatSegundosLargo(totalSegHablados), margin + 10, cursorY + 29);

  // Métrica 2: Discursos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.contributionsLabel', 'TOTAL INTERVENCIONES'), margin + metricColW + 10, cursorY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`${totalDiscursos} ${i18n.t('ui.speechesCount', 'discursos')}`, margin + metricColW + 10, cursorY + 29);

  // Métrica 3: Mociones
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.motionsEvaluatedLabel', 'MOCIONES EVALUADAS'), margin + metricColW * 2 + 10, cursorY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`${totalMociones} ${i18n.t('ui.motionsCount', 'mociones')}`, margin + metricColW * 2 + 10, cursorY + 29);

  // Métrica 4: Aprobación
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.approvalRateLabel', 'TASA DE APROBACIÓN'), margin + metricColW * 3 + 10, cursorY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...THEME.primary);
  doc.text(`${mocionesAprobadas} (${tasaMociones}%)`, margin + metricColW * 3 + 10, cursorY + 29);

  cursorY += cardHeightMetrics + 18;

  // ══════════════════════════════════════════════════════════════
  // 4. SECCIÓN: TABLA DETALLADA DE DELEGACIONES (EVALUACIÓN)
  // ══════════════════════════════════════════════════════════════
  drawSectionTitle(
    i18n.t('ui.3IndividualDelegationBreakdownEvaluation', '3. DESGLOSE INDIVIDUAL POR DELEGACIÓN (EVALUACIÓN)'),
    i18n.t('ui.sortedBySpeakingTime', 'Ordenado por tiempo en tribuna')
  );

  const headers = [
    '#',
    i18n.t('ui.delegation2', 'Delegación'),
    i18n.t('ui.status', 'Estatus'),
    i18n.t('ui.speakingTime', 'Tiempo en Tribuna'),
    i18n.t('ui.speeches3', 'Interv.'),
    i18n.t('ui.questions2', 'Preg.'),
    i18n.t('ui.motPassed', 'Moc. (Apr.)')
  ];
  // Columnas proporcionales sumando 536 pt
  const colWidths = [24, 150, 94, 96, 54, 54, 64];
  const colAligns = ['center', 'left', 'left', 'left', 'center', 'center', 'center'];

  const drawDelegationsTableHeader = (y) => {
    doc.setFillColor(...THEME.headerDark);
    doc.rect(margin, y, contentWidth, 20, 'F');

    // Fina línea inferior terracota
    doc.setFillColor(...THEME.primary);
    doc.rect(margin, y + 18.5, contentWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    headers.forEach((h, i) => {
      const align = colAligns[i];
      if (align === 'center') {
        doc.text(h, curX + colWidths[i] / 2, y + 13, { align: 'center' });
      } else if (align === 'right') {
        doc.text(h, curX + colWidths[i] - 6, y + 13, { align: 'right' });
      } else {
        doc.text(h, curX + 6, y + 13);
      }
      curX += colWidths[i];
    });
  };

  drawDelegationsTableHeader(cursorY);
  cursorY += 20;

  const listaOrdenada = [...estadisticasDelegaciones].sort((a, b) => (b.tiempoHabladoTotal || 0) - (a.tiempoHabladoTotal || 0));

  listaOrdenada.forEach((del, idx) => {
    checkPageBreak(20, () => {
      drawDelegationsTableHeader(cursorY);
      cursorY += 20;
    });

    const isAlternate = idx % 2 === 1;
    if (isAlternate) {
      doc.setFillColor(...THEME.surfaceSubtle);
      doc.rect(margin, cursorY, contentWidth, 18, 'F');
    }

    // Línea separadora sutil
    doc.setDrawColor(...THEME.subborder);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY + 18, margin + contentWidth, cursorY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.textMain);

    let cellX = margin;

    // # Índice
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    doc.text(String(idx + 1), cellX + colWidths[0] / 2, cursorY + 12, { align: 'center' });
    cellX += colWidths[0];

    // Nombre + Distintivo Veto
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textMain);
    const nombreBase = String(del.nombre || i18n.t('ui.delegation2', 'Delegación')).substring(0, 24);
    doc.text(nombreBase, cellX + 6, cursorY + 12);

    if (del.veto) {
      const nameW = doc.getTextWidth(nombreBase);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...THEME.primary);
      doc.text('[P5]', cellX + 10 + nameW, cursorY + 11.5);
    }
    cellX += colWidths[1];

    // Estatus con punto semántico
    const estatusRaw = del.estatus || 'Presente';
    const estatusLabel = i18n.t(`sessionValues.${estatusRaw}`, estatusRaw);
    drawStatusWithDot(estatusLabel, cellX + 4, cursorY + 12, estatusRaw);
    cellX += colWidths[2];

    // Tiempo Hablado
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.textMain);
    doc.text(formatSegundosLargo(del.tiempoHabladoTotal), cellX + 6, cursorY + 12);
    cellX += colWidths[3];

    // Discursos
    doc.text(String(del.cantidadIntervenciones || 0), cellX + colWidths[4] / 2, cursorY + 12, { align: 'center' });
    cellX += colWidths[4];

    // Preguntas
    doc.text(String(del.preguntasRealizadas || 0), cellX + colWidths[5] / 2, cursorY + 12, { align: 'center' });
    cellX += colWidths[5];

    // Mociones
    const mocStr = `${del.mocionesPropuestas || 0} (${del.mocionesAprobadas || 0})`;
    doc.text(mocStr, cellX + colWidths[6] / 2, cursorY + 12, { align: 'center' });

    cursorY += 18;
  });

  cursorY += 16;

  // ══════════════════════════════════════════════════════════════
  // 5. SECCIÓN: REGISTRO DE MOCIONES (SI EXISTEN EN LA SESIÓN)
  // ══════════════════════════════════════════════════════════════
  if (mociones && mociones.length > 0) {
    checkPageBreak(80);
    drawSectionTitle(
      i18n.t('ui.4MotionsRecord', '4. REGISTRO DE MOCIONES Y PROCEDIMIENTOS'),
      `${mociones.length} ${i18n.t('ui.motionsRecordedCount', 'registradas')}`
    );

    const mHeaders = [
      '#',
      i18n.t('ui.delegation2', 'Delegación'),
      i18n.t('ui.motionTypeAndTopic', 'Tipo y Asunto de Moción'),
      i18n.t('ui.status', 'Resultado')
    ];
    const mWidths = [24, 130, 262, 120];

    const drawMotionsTableHeader = (y) => {
      doc.setFillColor(...THEME.headerDark);
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setFillColor(...THEME.primary);
      doc.rect(margin, y + 16.5, contentWidth, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let curX = margin;
      mHeaders.forEach((h, i) => {
        if (i === 0) {
          doc.text(h, curX + mWidths[i] / 2, y + 12, { align: 'center' });
        } else {
          doc.text(h, curX + 6, y + 12);
        }
        curX += mWidths[i];
      });
    };

    drawMotionsTableHeader(cursorY);
    cursorY += 18;

    mociones.slice(0, 30).forEach((m, mIdx) => {
      checkPageBreak(18, () => {
        drawMotionsTableHeader(cursorY);
        cursorY += 18;
      });

      if (mIdx % 2 === 1) {
        doc.setFillColor(...THEME.surfaceSubtle);
        doc.rect(margin, cursorY, contentWidth, 17, 'F');
      }

      doc.setDrawColor(...THEME.subborder);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY + 17, margin + contentWidth, cursorY + 17);

      let mCellX = margin;

      // #
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...THEME.textMuted);
      doc.text(String(mIdx + 1), mCellX + mWidths[0] / 2, cursorY + 11.5, { align: 'center' });
      mCellX += mWidths[0];

      // Delegación proponente
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...THEME.textMain);
      doc.text(String(m.pais || m.proponente || '—').substring(0, 22), mCellX + 6, cursorY + 11.5);
      mCellX += mWidths[1];

      // Tipo y Asunto
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...THEME.textMain);
      const descMocion = `${m.tipo || i18n.t('ui.motion', 'Moción')} · ${m.tema || m.descripcion || ''}`.trim();
      doc.text(descMocion.substring(0, 52), mCellX + 6, cursorY + 11.5);
      mCellX += mWidths[2];

      // Estado con punto semántico
      const estM = m.estado || 'Pendiente';
      drawStatusWithDot(estM, mCellX + 4, cursorY + 11.5, estM);

      cursorY += 17;
    });

    cursorY += 14;
  }

  // ══════════════════════════════════════════════════════════════
  // 6. FIRMAS INSTITUCIONALES Y VALIDACIÓN
  // ══════════════════════════════════════════════════════════════
  checkPageBreak(85);
  cursorY += 8;

  const sigLineWidth = 180;
  const leftSigX = margin + 25;
  const rightSigX = pageWidth - margin - sigLineWidth - 25;

  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.75);
  doc.line(leftSigX, cursorY + 28, leftSigX + sigLineWidth, cursorY + 28);
  doc.line(rightSigX, cursorY + 28, rightSigX + sigLineWidth, cursorY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMain);
  doc.text(i18n.t('ui.committeePresidentChair', 'Presidente / Chair del Comité'), leftSigX + sigLineWidth / 2, cursorY + 40, { align: 'center' });
  doc.text(i18n.t('ui.moderatorCoChairSecretariat', 'Moderador / Co-Chair / Secretaría'), rightSigX + sigLineWidth / 2, cursorY + 40, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(i18n.t('ui.signatureVerificationNote', 'Mesa Directiva de Presidencia'), leftSigX + sigLineWidth / 2, cursorY + 50, { align: 'center' });
  doc.text(i18n.t('ui.secretariatVerificationNote', 'Secretaría General / Staff'), rightSigX + sigLineWidth / 2, cursorY + 50, { align: 'center' });

  // ══════════════════════════════════════════════════════════════
  // 7. MULTIPÁGINA: ENCABEZADOS Y PIES DE PÁGINA RECURRENTES
  // ══════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Encabezado recurrente en páginas 2 en adelante
    if (p > 1) {
      doc.setFillColor(...THEME.surfaceWarm);
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setDrawColor(...THEME.border);
      doc.setLineWidth(0.5);
      doc.line(0, 24, pageWidth, 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...THEME.primary);
      doc.text('OPENMUN', margin, 16);

      const subW = doc.getTextWidth('OPENMUN');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...THEME.textMuted);
      doc.text(` · ${i18n.t('ui.officialMinutesShort', 'ACTA OFICIAL')}: ${comiteUpper}`, margin + subW, 16);

      doc.text(`${i18n.t('ui.page', 'Página')} ${p} / ${totalPages}`, pageWidth - margin, 16, { align: 'right' });
    }

    // Pie de página oficial en todas las páginas
    const footerY = pageHeight - 20;
    doc.setDrawColor(...THEME.subborder);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textMuted);
    doc.text('OpenMUN · ' + i18n.t('ui.parliamentaryManagementSystem', 'Sistema de Gestión Parlamentaria'), margin, footerY);
    doc.text(nombreComite, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`${i18n.t('ui.page', 'Página')} ${p} ${i18n.t('ui.of', 'de')} ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Descargar PDF
  const nombreLimpio = sanitizarNombre(nombreComite);
  doc.save(`Acta_Oficial_${nombreLimpio}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
