import i18n from '../../languages/index.js';
import { normalizarSesionesDebate, sesionDelRegistro } from '../../utils/debateSessions';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Trophy, 
  Clock, 
  FileText, 
  CheckCircle, 
  ArrowUpDown, 
  Calendar, 
  Layers, 
  Mic, 
  Flame, 
  FileSignature,
  BarChart3,
  Table,
  Loader2,
  Users,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import GraficosParticipacion from '../dashboard/GraficosParticipacion';
import { exportCommitteeReportPdf } from '../../utils/committeeReportGenerator';
import { useTranslation } from 'react-i18next';

// Helper para extraer la clave de fecha (YYYY-MM-DD) de cualquier entrada
const extraerClaveFecha = (item) => {
  if (!item) return null;
  if (item.fecha) {
    try {
      const d = new Date(item.fecha);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {}
  }
  if (item.id && !isNaN(Number(item.id)) && Number(item.id) > 1000000000000) {
    try {
      const d = new Date(Number(item.id));
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {}
  }
  return null;
};

// Formatear fecha corta tipo "15 Ago" o "15/08"
const formatearFechaCorta = (fechaStr) => {
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'short' });
  } catch {
    return fechaStr;
  }
};

// Formatear segundos a formato legible "Xh Ym Zs" o "Xm Ys"
const formatTiempoLargo = (totalSeg) => {
  if (!totalSeg || totalSeg <= 0) return '0 min 00 s';
  const horas = Math.floor(totalSeg / 3600);
  const mins = Math.floor((totalSeg % 3600) / 60);
  const secs = totalSeg % 60;
  if (horas > 0) {
    return `${horas} h ${mins} min ${secs.toString().padStart(2, '0')} s`;
  }
  return `${mins} min ${secs.toString().padStart(2, '0')} s`;
};

// Formatear tiempo compacto "Xm Ys"
const formatTiempoCompacto = (totalSeg) => {
  if (!totalSeg || totalSeg <= 0) return '0m 00s';
  const mins = Math.floor(totalSeg / 60);
  const secs = totalSeg % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const HistoricoDelegaciones = () => {
  const { t } = useTranslation();
  const { 
    paises, 
    mociones = [], 
    historicoMociones = [], 
    registroIntervenciones = [],
    enmiendasSesion,
    comiteConfig,
    agendaSesion,
    votacionSesion
  } = useSession();

  const [busqueda, setBusqueda] = useState('');
  const [columnaOrden, setColumnaOrden] = useState('tiempoHablado'); // 'nombre' | 'mociones' | 'aprobadas' | 'enmiendas' | 'enmiendasAprobadas' | 'tiempoHablado' | 'preguntas'
  const [ordenAsc, setOrdenAsc] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState('TODOS'); // 'TODOS' | 'YYYY-MM-DD'
  const [sesionSeleccionada, setSesionSeleccionada] = useState('TODAS');
  const [filtroEquipo, setFiltroEquipo] = useState('TODOS');
  const [vistaModo, setVistaModo] = useState('tabla'); // 'tabla' | 'graficos'
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Ajustes manuales persistentes por país y por día (o global)
  const [preguntasExtras, setPreguntasExtras] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('openmun_historico_preguntas_extra')) || {};
    } catch {
      return {};
    }
  });

  const [tiempoExtra, setTiempoExtra] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('openmun_historico_tiempo_extra')) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('openmun_historico_preguntas_extra', JSON.stringify(preguntasExtras));
  }, [preguntasExtras]);

  useEffect(() => {
    localStorage.setItem('openmun_historico_tiempo_extra', JSON.stringify(tiempoExtra));
  }, [tiempoExtra]);

  const listaMocionesFuente = (historicoMociones && historicoMociones.length > 0) ? historicoMociones : mociones;
  const listaEnmiendasFuente = useMemo(() => enmiendasSesion?.enmiendas || [], [enmiendasSesion]);

  const sesionesDebate = useMemo(() => normalizarSesionesDebate(agendaSesion?.sesionesDebate), [agendaSesion?.sesionesDebate]);
  const sesionesDisponibles = useMemo(() => {
    const registros = [...registroIntervenciones, ...listaMocionesFuente, ...listaEnmiendasFuente];
    const delDia = registros.filter(item => diaSeleccionado === 'TODOS' || extraerClaveFecha(item) === diaSeleccionado);
    const ids = new Set(delDia.map(item => sesionDelRegistro(item, sesionesDebate)));
    sesionesDebate.forEach(inicio => {
      if (diaSeleccionado === 'TODOS' || extraerClaveFecha({ fecha: inicio }) === diaSeleccionado) ids.add(inicio);
    });
    return [...ids].sort((a, b) => a === 'SIN_SESION' ? -1 : b === 'SIN_SESION' ? 1 : a - b);
  }, [registroIntervenciones, listaMocionesFuente, listaEnmiendasFuente, sesionesDebate, diaSeleccionado]);
  useEffect(() => {
    if (sesionSeleccionada !== 'TODAS' && !sesionesDisponibles.some(id => String(id) === sesionSeleccionada)) {
      setSesionSeleccionada('TODAS');
    }
  }, [sesionesDisponibles, sesionSeleccionada]);

  // 1. Detectar y ordenar cronológicamente todos los días registrados en el MUN
  const diasDisponibles = useMemo(() => {
    const fechasSet = new Set();
    const hoyStr = new Date().toISOString().slice(0, 10);
    fechasSet.add(hoyStr);
    sesionesDebate.forEach(inicio => fechasSet.add(extraerClaveFecha({ fecha: inicio })));

    registroIntervenciones.forEach(item => {
      const f = extraerClaveFecha(item);
      if (f) fechasSet.add(f);
    });

    listaMocionesFuente.forEach(item => {
      const f = extraerClaveFecha(item);
      if (f) fechasSet.add(f);
    });

    listaEnmiendasFuente.forEach(item => {
      const f = extraerClaveFecha(item);
      if (f) fechasSet.add(f);
    });

    const fechasOrdenadas = Array.from(fechasSet).sort();

    return fechasOrdenadas.map((fStr, index) => ({
      key: fStr,
      numeroDia: index + 1,
      esHoy: fStr === hoyStr,
      labelCorta: t('ui.day', { v0: index + 1, v1: formatearFechaCorta(fStr) }),
      labelCompleta: t('ui.day2', { v0: index + 1, v1: formatearFechaCorta(fStr) })
    }));
  }, [registroIntervenciones, listaMocionesFuente, listaEnmiendasFuente, sesionesDebate, t]);

  // Helpers para ajustes manuales
  const getAdjustmentKey = (paisId) => sesionSeleccionada === 'TODAS'
    ? `${diaSeleccionado}_${paisId}`
    : `${diaSeleccionado}_sesion_${sesionSeleccionada}_${paisId}`;

  const handleIncrementarPregunta = (paisId) => {
    const key = getAdjustmentKey(paisId);
    setPreguntasExtras(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  };

  const handleDecrementarPregunta = (paisId) => {
    const key = getAdjustmentKey(paisId);
    setPreguntasExtras(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1)
    }));
  };

  const handleAjustarTiempo = (paisId, deltaSeg) => {
    const key = getAdjustmentKey(paisId);
    setTiempoExtra(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + deltaSeg
    }));
  };

  // 2. Filtrar intervenciones, mociones y enmiendas según el día seleccionado
  const intervencionesFiltradas = useMemo(() => {
    return registroIntervenciones.filter(i =>
      (diaSeleccionado === 'TODOS' || extraerClaveFecha(i) === diaSeleccionado) &&
      (sesionSeleccionada === 'TODAS' || String(sesionDelRegistro(i, sesionesDebate)) === sesionSeleccionada));
  }, [registroIntervenciones, diaSeleccionado, sesionSeleccionada, sesionesDebate]);

  const mocionesFiltradas = useMemo(() => {
    return listaMocionesFuente.filter(m =>
      (diaSeleccionado === 'TODOS' || extraerClaveFecha(m) === diaSeleccionado) &&
      (sesionSeleccionada === 'TODAS' || String(sesionDelRegistro(m, sesionesDebate)) === sesionSeleccionada));
  }, [listaMocionesFuente, diaSeleccionado, sesionSeleccionada, sesionesDebate]);

  const enmiendasFiltradas = useMemo(() => {
    return listaEnmiendasFuente.filter(e =>
      (diaSeleccionado === 'TODOS' || extraerClaveFecha(e) === diaSeleccionado) &&
      (sesionSeleccionada === 'TODAS' || String(sesionDelRegistro(e, sesionesDebate)) === sesionSeleccionada));
  }, [listaEnmiendasFuente, diaSeleccionado, sesionSeleccionada, sesionesDebate]);

  // 3. Calcular métricas para cada país
  const datosPaises = useMemo(() => {
    return paises.map(p => {
      const nombreNorm = p.nombre.toLowerCase().trim();

      // Mociones en el filtro activo
      const mocPresentadas = mocionesFiltradas.filter(m => m.proponente?.toLowerCase().trim() === nombreNorm).length;
      const mocAprobadas = mocionesFiltradas.filter(m => 
        m.proponente?.toLowerCase().trim() === nombreNorm && 
        (m.estado === 'Aprobada' || m.estado === 'Aprobado')
      ).length;

      // Enmiendas en el filtro activo
      const enmPresentadas = enmiendasFiltradas.filter(e => 
        (e.paisProponente || e.proponente || '').toLowerCase().trim() === nombreNorm
      ).length;
      const enmAprobadas = enmiendasFiltradas.filter(e => {
        const pProp = (e.paisProponente || e.proponente || '').toLowerCase().trim();
        const st = (e.estado || '').toLowerCase().trim();
        return pProp === nombreNorm && (st === 'aceptada' || st === 'aceptado' || st === 'aprobada' || st === 'aprobado');
      }).length;

      // Intervenciones en el filtro activo
      const intervencionesPais = intervencionesFiltradas.filter(i => {
        const pNombre = (i.pais || i.orador || '').toLowerCase().trim();
        return pNombre === nombreNorm;
      });

      const segBase = intervencionesPais.reduce((acc, curr) => acc + (curr.tiempoHabladoExacto || curr.tiempoHablado || 0), 0);
      const segAjuste = tiempoExtra[getAdjustmentKey(p.id)] || 0;
      const segHablados = Math.max(0, segBase + segAjuste);

      // Cómputo global histórico de tiempo
      const todasIntervencionesPais = registroIntervenciones.filter(i => {
        const pNombre = (i.pais || i.orador || '').toLowerCase().trim();
        return pNombre === nombreNorm;
      });
      const segGlobalBase = todasIntervencionesPais.reduce((acc, curr) => acc + (curr.tiempoHabladoExacto || curr.tiempoHablado || 0), 0);
      const segGlobalHablados = Math.max(0, segGlobalBase + (tiempoExtra[`TODOS_${p.id}`] || 0));

      // Preguntas / POIs
      const preguntasBase = intervencionesPais.length;
      const preguntasManuales = preguntasExtras[getAdjustmentKey(p.id)] || 0;
      const totalPreguntas = preguntasBase + preguntasManuales;

      const minutosExactos = (segHablados / 60).toFixed(1);

      return {
        ...p,
        mocPresentadas,
        mocAprobadas,
        enmPresentadas,
        enmAprobadas,
        segHablados,
        segGlobalHablados,
        minutosExactos,
        totalPreguntas,
        intervencionesCount: intervencionesPais.length,
        tiempoHabladoTotal: segHablados,
        cantidadIntervenciones: intervencionesPais.length,
        preguntasRealizadas: totalPreguntas,
        mocionesPropuestas: mocPresentadas,
        mocionesAprobadas: mocAprobadas
      };
    });
  }, [paises, intervencionesFiltradas, mocionesFiltradas, enmiendasFiltradas, registroIntervenciones, tiempoExtra, preguntasExtras, diaSeleccionado, sesionSeleccionada]);

  // Cómputo global de todo el comité para las métricas de cabecera
  const estadisticasGenerales = useMemo(() => {
    const totalSegundos = datosPaises.reduce((acc, p) => acc + p.segHablados, 0);
    const totalMinutos = (totalSegundos / 60).toFixed(1);
    const totalIntervenciones = datosPaises.reduce((acc, p) => acc + p.intervencionesCount, 0);
    const totalMociones = mocionesFiltradas.length;
    const totalMocionesAprobadas = mocionesFiltradas.filter(m => m.estado === 'Aprobada' || m.estado === 'Aprobado').length;

    const totalEnmiendas = enmiendasFiltradas.length;
    const totalEnmiendasAprobadas = enmiendasFiltradas.filter(e => {
      const st = (e.estado || '').toLowerCase().trim();
      return st === 'aceptada' || st === 'aceptado' || st === 'aprobada' || st === 'aprobado';
    }).length;

    const paisLider = [...datosPaises].sort((a, b) => b.segHablados - a.segHablados)[0];

    return {
      totalSegundos,
      totalMinutos,
      totalIntervenciones,
      totalMociones,
      totalMocionesAprobadas,
      tasaAprobacion: totalMociones > 0 ? Math.round((totalMocionesAprobadas / totalMociones) * 100) : 0,
      totalEnmiendas,
      totalEnmiendasAprobadas,
      tasaAprobacionEnmiendas: totalEnmiendas > 0 ? Math.round((totalEnmiendasAprobadas / totalEnmiendas) * 100) : 0,
      paisLider: paisLider && paisLider.segHablados > 0 ? paisLider : null
    };
  }, [datosPaises, mocionesFiltradas, enmiendasFiltradas]);

  // Lista de equipos presentes en este comité
  const listaEquipos = useMemo(() => {
    const s = new Set();
    paises.forEach(p => {
      if (p.equipo && p.equipo.trim()) s.add(p.equipo.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
  }, [paises]);

  // Filtrar por búsqueda y equipo
  const paisesFiltrados = useMemo(() => {
    return datosPaises.filter(p => {
      const q = busqueda.toLowerCase().trim();
      const matchSearch = !q || p.nombre.toLowerCase().includes(q) || (p.equipo && p.equipo.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (filtroEquipo !== 'TODOS') {
        if ((p.equipo || '').trim() !== filtroEquipo) return false;
      }

      return true;
    });
  }, [datosPaises, busqueda, filtroEquipo]);

  // Ordenar
  const paisesOrdenados = useMemo(() => {
    return [...paisesFiltrados].sort((a, b) => {
      let valA = a.nombre;
      let valB = b.nombre;

      if (columnaOrden === 'mociones') {
        valA = a.mocPresentadas;
        valB = b.mocPresentadas;
      } else if (columnaOrden === 'aprobadas') {
        valA = a.mocAprobadas;
        valB = b.mocAprobadas;
      } else if (columnaOrden === 'enmiendas') {
        valA = a.enmPresentadas;
        valB = b.enmPresentadas;
      } else if (columnaOrden === 'enmiendasAprobadas') {
        valA = a.enmAprobadas;
        valB = b.enmAprobadas;
      } else if (columnaOrden === 'tiempoHablado') {
        valA = a.segHablados;
        valB = b.segHablados;
      } else if (columnaOrden === 'preguntas') {
        valA = a.totalPreguntas;
        valB = b.totalPreguntas;
      }

      if (valA < valB) return ordenAsc ? -1 : 1;
      if (valA > valB) return ordenAsc ? 1 : -1;
      return 0;
    });
  }, [paisesFiltrados, columnaOrden, ordenAsc]);

  const cambiarOrden = (col) => {
    if (columnaOrden === col) {
      setOrdenAsc(!ordenAsc);
    } else {
      setColumnaOrden(col);
      setOrdenAsc(false);
    }
  };

  const handleExportarPdf = async () => {
    try {
      setExportandoPdf(true);
      const delegacionesParaReporte = datosPaises.map(d => ({
        id: d.id,
        nombre: d.nombre,
        equipo: d.equipo,
        bandera: d.bandera,
        estatus: d.estatus,
        veto: d.veto,
        tiempoHabladoTotal: d.segHablados,
        cantidadIntervenciones: d.intervencionesCount,
        preguntasRealizadas: d.totalPreguntas,
        mocionesPropuestas: d.mocPresentadas,
        mocionesAprobadas: d.mocAprobadas
      }));

      await exportCommitteeReportPdf({
        nombreComite: comiteConfig?.nombre || i18n.t('ui.generalCommittee'),
        agendaSesion,
        paises,
        estadisticasDelegaciones: delegacionesParaReporte,
        registroIntervenciones: intervencionesFiltradas,
        mociones: mocionesFiltradas,
        enmiendasSesion: { ...enmiendasSesion, enmiendas: enmiendasFiltradas },
        votacionSesion
      });
    } catch (err) {
      console.error('Error exportando reporte PDF:', err);
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div style={{
      padding: '1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family)',
      gap: '0.75rem',
      overflow: 'hidden'
    }}>
      {/* ─── CABECERA SUPERIOR: TÍTULO, SELECTOR DE VISTA, EXPORTACIÓN Y BUSCADOR ─── */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '0.6rem',
        borderBottom: '1px solid var(--subborder-color)', 
        paddingBottom: '0.6rem' 
      }}>
        {/* Título */}
        <div>
          <div style={{ fontWeight: '650', fontSize: '0.95rem', letterSpacing: '0.01em', color: 'var(--text-color)' }}>
            {t('history.titleUpper', 'Histórico de delegaciones')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '-1px' }}>
            {t('history.subtitle', 'Métricas de oratoria, intervenciones y mociones')}
          </div>
        </div>

        {/* Acciones: Alternar Vista + Exportar PDF + Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Alternador de Vista (Tabla / Gráficos) */}
          <div 
            role="tablist"
            aria-label={t('ui.historyView')}
            style={{
              display: 'flex',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '2px'
            }}
          >
            <button
              role="tab"
              aria-selected={vistaModo === 'tabla'}
              onClick={() => setVistaModo('tabla')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                fontWeight: vistaModo === 'tabla' ? '650' : '500',
                border: vistaModo === 'tabla' ? '1px solid var(--accent-color)' : '1px solid transparent',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                backgroundColor: vistaModo === 'tabla' ? 'var(--accent-soft)' : 'transparent',
                color: vistaModo === 'tabla' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Table size={13} />
              <span>{t('history.table', 'Tabla')}</span>
            </button>
            <button
              role="tab"
              aria-selected={vistaModo === 'graficos'}
              onClick={() => setVistaModo('graficos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                fontWeight: vistaModo === 'graficos' ? '650' : '500',
                border: vistaModo === 'graficos' ? '1px solid var(--accent-color)' : '1px solid transparent',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                backgroundColor: vistaModo === 'graficos' ? 'var(--accent-soft)' : 'transparent',
                color: vistaModo === 'graficos' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart3 size={13} />
              <span>{t('history.charts', 'Gráficos')}</span>
            </button>
          </div>

          {/* Botón Descargar Acta Oficial PDF */}
          <button
            onClick={handleExportarPdf}
            disabled={exportandoPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.74rem',
              fontWeight: '600',
              cursor: exportandoPdf ? 'not-allowed' : 'pointer',
              opacity: exportandoPdf ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
            title={t('ui.generateAndDownloadOfficialSessionMinutesAsPdf')}
          >
            {exportandoPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} style={{ color: 'var(--accent-color)' }} />}
            <span>{t('ui.minutesPdf')}</span>
          </button>

          {/* Buscador */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '0.28rem 0.6rem',
            gap: '0.4rem',
            maxWidth: '180px'
          }}>
            <Search size={13} style={{ color: 'var(--muted-text)', opacity: 0.8 }} />
            <input
              type="text"
              placeholder={t('history.searchPlaceholder', 'Buscar país...')}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                outline: 'none',
                fontSize: '0.74rem',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
          </div>
          {/* Selector de Equipo */}
          {listaEquipos.length > 0 && (
            <select
              value={filtroEquipo}
              onChange={e => setFiltroEquipo(e.target.value)}
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 6px)',
                padding: '0.28rem 0.5rem',
                color: 'var(--text-color)',
                fontSize: '0.72rem',
                outline: 'none',
                cursor: 'pointer'
              }}
              title={t('ui.filterByTeam', 'Filtrar por Equipo')}
            >
              <option value="TODOS">{t('ui.allTeams', 'Todos los equipos')} ({listaEquipos.length})</option>
              {listaEquipos.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── FILTRO POR DÍAS (PILLS INTERACTIVAS) ─── */}
      <div className="mobile-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        overflowX: 'auto',
        paddingBottom: '0.2rem',
        scrollbarWidth: 'thin'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          fontSize: '0.72rem', 
          color: 'var(--muted-text)', 
          fontWeight: '600',
          marginRight: '0.2rem',
          whiteSpace: 'nowrap'
        }}>
          <Calendar size={13} style={{ color: 'var(--accent-color)' }} />
          <span>{t('history.filterByDay', 'FILTRAR POR DÍA:')}</span>
        </div>

        {/* Opción Global: Todos los Días */}
        <button
          aria-pressed={diaSeleccionado === 'TODOS'}
          onClick={() => { setDiaSeleccionado('TODOS'); setSesionSeleccionada('TODAS'); }}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--border-radius)',
            border: diaSeleccionado === 'TODOS' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
            backgroundColor: diaSeleccionado === 'TODOS' ? 'var(--accent-soft)' : 'var(--card-header-bg)',
            color: diaSeleccionado === 'TODOS' ? 'var(--accent-color)' : 'var(--text-color)',
            fontSize: '0.72rem',
            fontWeight: diaSeleccionado === 'TODOS' ? '650' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={12} />
          <span>{t('history.allDays', 'Todos los días (Global)')}</span>
        </button>

        {/* Botones para cada día detectado */}
        {diasDisponibles.map(dia => {
          const isSelected = diaSeleccionado === dia.key;
          return (
            <button
              key={dia.key}
              aria-pressed={isSelected}
              onClick={() => { setDiaSeleccionado(dia.key); setSesionSeleccionada('TODAS'); }}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--border-radius)',
                border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                fontSize: '0.72rem',
                fontWeight: isSelected ? '650' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={12} />
              <span>{dia.labelCorta}</span>
              {dia.esHoy && (
                <span style={{
                  fontSize: '0.58rem',
                  padding: '1px 4px',
                  backgroundColor: 'var(--success-soft)',
                  border: '1px solid var(--success-color)',
                  borderRadius: '3px',
                  color: 'var(--success-color)',
                  fontWeight: '700'
                }}>
                  {t('history.today', 'HOY')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── CONTENIDO: VISTA GRÁFICOS O VISTA TABLA + KPIs ─── */}
      <label style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem' }}>
        <Layers size={13} />
        {t('history.filterBySession', 'FILTRAR POR SESIÓN:')}
        <select value={sesionSeleccionada} onChange={e => setSesionSeleccionada(e.target.value)} style={{
          padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border-color)',
          background: 'var(--input-bg)', color: 'var(--text-color)', minWidth: 0
        }}>
          <option value="TODAS">{t('history.allSessions', 'Todas las sesiones')}</option>
          {sesionesDisponibles.map(inicio => <option key={inicio} value={inicio}>
            {inicio === 'SIN_SESION' ? t('history.unassignedSession', 'Sin sesión (registros anteriores)')
              : `${t('history.sessionNumber', 'Sesión {{number}}', { number: sesionesDebate.indexOf(inicio) + 1 })} · ${new Date(inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </option>)}
        </select>
      </label>
      {vistaModo === 'graficos' ? (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <GraficosParticipacion
            paises={paises}
            estadisticasDelegaciones={datosPaises}
            mociones={mocionesFiltradas}
            registroIntervenciones={intervencionesFiltradas}
          />
        </div>
      ) : (
        <>
          {/* ─── BARRA DE RESUMEN KPI (CÓMPUTO TOTAL DE MINUTOS HABLADOS) ─── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem'
          }}>
            {/* KPI 1: Cómputo Total de Minutos Hablados */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-text)', fontSize: '0.66rem', fontWeight: '650', letterSpacing: '0.04em' }}>
                <span>{t('history.totalTime', 'CÓMPUTO TOTAL TIEMPO')}</span>
                <Clock size={13} style={{ color: 'var(--accent-color)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '650', color: 'var(--text-color)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.totalMinutos} <span style={{ fontSize: '0.72rem', fontWeight: '500', color: 'var(--muted-text)' }}>min</span>
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                ≈ {formatTiempoLargo(estadisticasGenerales.totalSegundos)}
              </div>
            </div>

            {/* KPI 2: Intervenciones Totales */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-text)', fontSize: '0.66rem', fontWeight: '650', letterSpacing: '0.04em' }}>
                <span>{t('history.interventions', 'INTERVENCIONES')}</span>
                <Mic size={13} style={{ color: 'var(--info-color)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '650', color: 'var(--text-color)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.totalIntervenciones}
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)' }}>
                {t('history.speechesRecorded', 'Oratorias registradas')}
              </div>
            </div>

            {/* KPI 3: Mociones Aprobadas */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-text)', fontSize: '0.66rem', fontWeight: '650', letterSpacing: '0.04em' }}>
                <span>{t('history.motionsPassed', 'MOCIONES APROBADAS')}</span>
                <CheckCircle size={13} style={{ color: 'var(--success-color)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '650', color: 'var(--text-color)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.totalMocionesAprobadas} <span style={{ fontSize: '0.72rem', fontWeight: '500', color: 'var(--muted-text)' }}>/ {estadisticasGenerales.totalMociones}</span>
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.tasaAprobacion}% {t('history.approvalRate', 'de aprobación')}
              </div>
            </div>

            {/* KPI 4: Enmiendas Aprobadas */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-text)', fontSize: '0.66rem', fontWeight: '650', letterSpacing: '0.04em' }}>
                <span>{t('history.amendmentsPassed', 'ENMIENDAS APROBADAS')}</span>
                <FileSignature size={13} style={{ color: 'var(--info-color)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '650', color: 'var(--text-color)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.totalEnmiendasAprobadas} <span style={{ fontSize: '0.72rem', fontWeight: '500', color: 'var(--muted-text)' }}>/ {estadisticasGenerales.totalEnmiendas}</span>
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.tasaAprobacionEnmiendas}% {t('history.approvalRate', 'de aprobación')}
              </div>
            </div>

            {/* KPI 5: Delegación Más Activa */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-text)', fontSize: '0.66rem', fontWeight: '650', letterSpacing: '0.04em' }}>
                <span>{t('history.leaderDelegation', 'DELEGACIÓN LÍDER')}</span>
                <Flame size={13} style={{ color: 'var(--warning-color)' }} />
              </div>
              {estadisticasGenerales.paisLider ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                  <CountryFlag bandera={estadisticasGenerales.paisLider.bandera} nombre={estadisticasGenerales.paisLider.nombre} size="xs" />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: '650', color: 'var(--text-color)' }}>
                    {estadisticasGenerales.paisLider.nombre}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                  {t('history.noInterventions', 'Sin intervenciones')}
                </div>
              )}
              <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', marginTop: '1px', fontVariantNumeric: 'tabular-nums' }}>
                {estadisticasGenerales.paisLider ? `${estadisticasGenerales.paisLider.minutosExactos} ${t('history.minSpoken', 'min hablados')}` : t('history.registerSpeakers', 'Registra oradores')}
              </div>
            </div>
          </div>

          {/* ─── TABLA DEL HISTÓRICO ─── */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'auto',
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)',
            backgroundColor: 'transparent',
            scrollbarWidth: 'thin'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th onClick={() => cambiarOrden('nombre')} style={{ width: '23%', padding: '0.45rem 0.5rem', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'nombre' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{t('history.country', 'PAÍS')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'nombre' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('mociones')} title={t('history.motionsPresented', 'Mociones presentadas')} style={{ width: '9%', padding: '0.45rem 0.25rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'mociones' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.motionsPresentedShort', 'MOC. PRES.')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'mociones' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('aprobadas')} title={t('history.motionsPassedCol', 'Mociones aprobadas')} style={{ width: '9%', padding: '0.45rem 0.25rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'aprobadas' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.motionsPassedShort', 'MOC. APR.')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'aprobadas' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('enmiendas')} title={t('history.amendmentsPresented', 'Enmiendas propuestas')} style={{ width: '9%', padding: '0.45rem 0.25rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'enmiendas' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.amendmentsPresentedShort', 'ENM. PROP.')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'enmiendas' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('enmiendasAprobadas')} title={t('history.amendmentsPassedCol', 'Enmiendas aprobadas')} style={{ width: '9%', padding: '0.45rem 0.25rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'enmiendasAprobadas' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.amendmentsPassedShort', 'ENM. APR.')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'enmiendasAprobadas' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('tiempoHablado')} title={t('history.speakingTimeCol', 'Tiempo hablado')} style={{ width: '20%', padding: '0.45rem 0.35rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'tiempoHablado' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.speakingTimeCol', 'TIEMPO HABLADO')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'tiempoHablado' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th onClick={() => cambiarOrden('preguntas')} title={t('history.questionsCol', 'Preguntas / POIs')} style={{ width: '10%', padding: '0.45rem 0.25rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: columnaOrden === 'preguntas' ? 'var(--accent-color)' : 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t('history.questionsColShort', 'PREG. / POIs')}</span>
                      <ArrowUpDown size={10} style={{ opacity: columnaOrden === 'preguntas' ? 1 : 0.4, flexShrink: 0 }} />
                    </div>
                  </th>
                  <th title={t('history.quotaCol', '% Cuota de participación')} style={{ width: '11%', padding: '0.45rem 0.35rem', textAlign: 'center', userSelect: 'none', color: 'var(--muted-text)', fontWeight: '650', letterSpacing: '0.02em', fontSize: '0.72rem' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{t('history.quotaCol', '% CUOTA')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paisesOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted-text)' }}>
                      {t('history.noMatchingDelegations', 'No hay delegaciones que coincidan con los filtros aplicados.')}
                    </td>
                  </tr>
                ) : (
                  paisesOrdenados.map((p) => {
                    const totalComiteSeg = estadisticasGenerales.totalSegundos;
                    const porcentajeCuota = totalComiteSeg > 0 ? Math.round((p.segHablados / totalComiteSeg) * 100) : 0;

                    return (
                      <tr 
                        key={p.id} 
                        style={{
                          borderBottom: '1px solid var(--subborder-color)',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--card-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* País */}
                        <td style={{ padding: '0.35rem 0.5rem', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                            <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.nombre}
                              </span>
                              {p.equipo && (
                                <span style={{
                                  fontSize: '0.66rem',
                                  color: 'var(--accent-color)',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  marginTop: '1px'
                                }}>
                                  <Users size={10} /> {p.equipo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Mociones Presentadas */}
                        <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: p.mocPresentadas > 0 ? 'var(--text-color)' : 'var(--muted-text)' }}>
                          {p.mocPresentadas}
                        </td>

                        {/* Mociones Aprobadas */}
                        <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: p.mocAprobadas > 0 ? 'var(--success-color)' : 'var(--muted-text)' }}>
                          {p.mocAprobadas}
                        </td>

                        {/* Enmiendas Propuestas */}
                        <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: p.enmPresentadas > 0 ? 'var(--text-color)' : 'var(--muted-text)' }}>
                          {p.enmPresentadas}
                        </td>

                        {/* Enmiendas Aprobadas */}
                        <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: p.enmAprobadas > 0 ? 'var(--success-color)' : 'var(--muted-text)' }}>
                          {p.enmAprobadas}
                        </td>

                        {/* Tiempo Hablado (Cómputo de minutos y ajuste manual) */}
                        <td style={{ padding: '0.35rem 0.35rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                              <button
                                onClick={() => handleAjustarTiempo(p.id, -60)}
                                style={{
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--muted-text)',
                                  padding: '1px 3px',
                                  fontSize: '0.62rem',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  lineHeight: '1.2',
                                  transition: 'all 0.15s ease'
                                }}
                                title={t('ui.subtract1Minute2')}
                                aria-label={t('ui.subtract1Minute2')}
                              >
                                -1m
                              </button>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                                <span style={{ 
                                  fontWeight: '650', 
                                  color: p.segHablados > 0 ? 'var(--text-color)' : 'var(--muted-text)', 
                                  fontSize: '0.78rem',
                                  fontVariantNumeric: 'tabular-nums'
                                }}>
                                  {formatTiempoCompacto(p.segHablados)}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                                  ({p.minutosExactos} min)
                                </span>
                              </div>

                              <button
                                onClick={() => handleAjustarTiempo(p.id, 60)}
                                style={{
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--accent-color)',
                                  padding: '1px 3px',
                                  fontSize: '0.62rem',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  lineHeight: '1.2',
                                  transition: 'all 0.15s ease'
                                }}
                                title={t('ui.add1Minute')}
                                aria-label={t('ui.add1Minute')}
                              >
                                +1m
                              </button>
                            </div>

                            {/* Si se filtra un día específico, mostrar el acumulado global de todos los días */}
                            {diaSeleccionado !== 'TODOS' && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                                {t('history.totalMUN', 'Total MUN')}: {formatTiempoCompacto(p.segGlobalHablados)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Preguntas Realizadas / POIs */}
                        <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleDecrementarPregunta(p.id)}
                              style={{
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--muted-text)',
                                width: '17px',
                                height: '17px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                lineHeight: 1,
                                transition: 'all 0.15s ease'
                              }}
                              title={t('ui.subtract1Question')}
                              aria-label={t('ui.subtract1Question')}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: '600', minWidth: '16px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: '0.76rem', color: p.totalPreguntas > 0 ? 'var(--text-color)' : 'var(--muted-text)' }}>
                              {p.totalPreguntas}
                            </span>
                            <button
                              onClick={() => handleIncrementarPregunta(p.id)}
                              style={{
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent-color)',
                                width: '17px',
                                height: '17px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                lineHeight: 1,
                                fontWeight: '700',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('ui.add1QuestionAsked')}
                              aria-label={t('ui.add1QuestionAsked')}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Cuota de participación (%) */}
                        <td style={{ padding: '0.35rem 0.35rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                            <div style={{
                              width: '32px',
                              height: '5px',
                              backgroundColor: 'var(--subborder-color)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              <div style={{
                                width: `${Math.min(100, porcentajeCuota)}%`,
                                height: '100%',
                                backgroundColor: 'var(--accent-color)',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', minWidth: '24px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted-text)' }}>
                              {porcentajeCuota}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default HistoricoDelegaciones;
