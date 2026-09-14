import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Trophy, 
  Clock, 
  FileText, 
  CheckCircle, 
  HelpCircle, 
  ArrowUpDown, 
  Calendar, 
  Layers, 
  Mic, 
  TrendingUp, 
  Flame, 
  RotateCcw, 
  FileSignature,
  BarChart3,
  Table,
  Download,
  Loader2
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import GraficosParticipacion from '../dashboard/GraficosParticipacion';
import { exportCommitteeReportPdf } from '../../utils/committeeReportGenerator';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';

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
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
  const { isLight } = useAccessibility();
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
  const [vistaModo, setVistaModo] = useState('tabla'); // 'tabla' | 'graficos'
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Ajustes manuales persistentes por país y por día (o global)
  // Formato: { "TODOS_idPais": 60, "2026-08-15_idPais": 120 }
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

  // 1. Detectar y ordenar cronológicamente todos los días registrados en el MUN
  const diasDisponibles = useMemo(() => {
    const fechasSet = new Set();

    // Fecha de hoy como referencia disponible
    const hoyStr = new Date().toISOString().slice(0, 10);
    fechasSet.add(hoyStr);

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
      labelCorta: `Día ${index + 1} (${formatearFechaCorta(fStr)})`,
      labelCompleta: `Día ${index + 1} - ${formatearFechaCorta(fStr)}`
    }));
  }, [registroIntervenciones, listaMocionesFuente, listaEnmiendasFuente]);

  // Helpers para ajustes manuales
  const getAdjustmentKey = (paisId) => `${diaSeleccionado}_${paisId}`;

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
    if (diaSeleccionado === 'TODOS') return registroIntervenciones;
    return registroIntervenciones.filter(i => extraerClaveFecha(i) === diaSeleccionado);
  }, [registroIntervenciones, diaSeleccionado]);

  const mocionesFiltradas = useMemo(() => {
    if (diaSeleccionado === 'TODOS') return listaMocionesFuente;
    return listaMocionesFuente.filter(m => extraerClaveFecha(m) === diaSeleccionado);
  }, [listaMocionesFuente, diaSeleccionado]);

  const enmiendasFiltradas = useMemo(() => {
    if (diaSeleccionado === 'TODOS') return listaEnmiendasFuente;
    return listaEnmiendasFuente.filter(e => extraerClaveFecha(e) === diaSeleccionado);
  }, [listaEnmiendasFuente, diaSeleccionado]);

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

      // Enmiendas en el filtro activo (propuestas y aprobadas/aceptadas)
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

      // Cómputo global histórico de tiempo (para mostrar contexto cuando se filtra un día)
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

      // Cómputo exacto en minutos
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
  }, [paises, intervencionesFiltradas, mocionesFiltradas, enmiendasFiltradas, registroIntervenciones, tiempoExtra, preguntasExtras, diaSeleccionado]);

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

    // Delegación con más tiempo hablado
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

  // Filtrar por búsqueda
  const paisesFiltrados = useMemo(() => {
    return datosPaises.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [datosPaises, busqueda]);

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
        nombreComite: comiteConfig?.nombre || 'Comité General',
        agendaSesion,
        paises,
        estadisticasDelegaciones: delegacionesParaReporte,
        registroIntervenciones,
        mociones: listaMocionesFuente,
        enmiendasSesion,
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
      fontFamily: 'var(--font-mono)',
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
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.6rem' 
      }}>
        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'rgba(255, 0, 127, 0.15)',
            border: '1px solid rgba(255, 0, 127, 0.4)',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Trophy size={16} color="#ff007f" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.92rem', letterSpacing: '0.04em', color: 'var(--text-color)' }}>
              {t('history.titleUpper', 'HISTÓRICO DE DELEGACIONES')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: '-2px' }}>
              {t('history.subtitle', 'Métricas de oratoria, intervenciones y mociones')}
            </div>
          </div>
        </div>

        {/* Acciones: Alternar Vista + Exportar PDF / Excel + Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Alternador de Vista (Tabla / Gráficos) */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '2px'
          }}>
            <button
              onClick={() => setVistaModo('tabla')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: vistaModo === 'tabla' ? 'var(--btn-bg)' : 'transparent',
                color: vistaModo === 'tabla' ? 'var(--btn-text)' : 'var(--muted-text)',
                cursor: 'pointer'
              }}
            >
              <Table size={13} />
              <span>Tabla</span>
            </button>
            <button
              onClick={() => setVistaModo('graficos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: vistaModo === 'graficos' ? 'var(--btn-bg)' : 'transparent',
                color: vistaModo === 'graficos' ? 'var(--btn-text)' : 'var(--muted-text)',
                cursor: 'pointer'
              }}
            >
              <BarChart3 size={13} />
              <span>Gráficos</span>
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
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: exportandoPdf ? 'not-allowed' : 'pointer'
            }}
            title="Generar y descargar Acta Oficial de Sesión en PDF"
          >
            {exportandoPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            <span>Acta (PDF)</span>
          </button>

          {/* Buscador */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isLight ? '#ffffff' : 'rgba(5, 5, 8, 0.75)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '0.28rem 0.6rem',
            gap: '0.4rem',
            maxWidth: '180px',
            boxShadow: isLight ? 'inset 0 1px 2px rgba(0,0,0,0.04)' : 'none'
          }}>
            <Search size={13} style={{ opacity: 0.6, color: '#3b82f6' }} />
            <input
              type="text"
              placeholder={t('history.searchPlaceholder', 'BUSCAR PAÍS...')}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                outline: 'none',
                fontSize: '0.74rem',
                width: '100%',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── FILTRO POR DÍAS (PILLS INTERACTIVAS) ─── */}
      <div style={{
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
          gap: '0.3rem', 
          fontSize: '0.72rem', 
          color: 'var(--muted-text)', 
          fontWeight: '700',
          marginRight: '0.2rem',
          whiteSpace: 'nowrap'
        }}>
          <Calendar size={13} style={{ color: '#ff007f' }} />
          <span>{t('history.filterByDay', 'FILTRAR POR DÍA:')}</span>
        </div>

        {/* Opción Global: Todos los Días */}
        <button
          onClick={() => setDiaSeleccionado('TODOS')}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: diaSeleccionado === 'TODOS' ? '1px solid #ff007f' : '1px solid var(--border-color)',
            backgroundColor: diaSeleccionado === 'TODOS' 
              ? (isLight ? '#fdf2f8' : 'rgba(255, 0, 127, 0.2)') 
              : (isLight ? 'var(--card-header-bg)' : 'rgba(255, 255, 255, 0.03)'),
            color: diaSeleccionado === 'TODOS' ? '#db2777' : 'var(--text-color)',
            fontSize: '0.72rem',
            fontWeight: diaSeleccionado === 'TODOS' ? '800' : '500',
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
              onClick={() => setDiaSeleccionado(dia.key)}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                backgroundColor: isSelected 
                  ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.22)') 
                  : (isLight ? 'var(--card-header-bg)' : 'rgba(255, 255, 255, 0.03)'),
                color: isSelected ? (isLight ? '#1d4ed8' : '#60a5fa') : 'var(--text-color)',
                fontSize: '0.72rem',
                fontWeight: isSelected ? '800' : '500',
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
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  borderRadius: '3px',
                  color: '#22c55e',
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
          backgroundColor: 'rgba(255, 0, 127, 0.08)',
          border: '1px solid rgba(255, 0, 127, 0.3)',
          borderRadius: '8px',
          padding: '0.5rem 0.7rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ff007f', fontSize: '0.66rem', fontWeight: '700' }}>
            <span>{t('history.totalTime', 'CÓMPUTO TOTAL TIEMPO')}</span>
            <Clock size={13} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ff007f', marginTop: '2px' }}>
            {estadisticasGenerales.totalMinutos} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>min</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)' }}>
            ≈ {formatTiempoLargo(estadisticasGenerales.totalSegundos)}
          </div>
        </div>

        {/* KPI 2: Intervenciones Totales */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '8px',
          padding: '0.5rem 0.7rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#60a5fa', fontSize: '0.66rem', fontWeight: '700' }}>
            <span>{t('history.interventions', 'INTERVENCIONES')}</span>
            <Mic size={13} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#60a5fa', marginTop: '2px' }}>
            {estadisticasGenerales.totalIntervenciones}
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)' }}>
            {t('history.speechesRecorded', 'Oratorias registradas')}
          </div>
        </div>

        {/* KPI 3: Mociones Aprobadas */}
        <div style={{
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '8px',
          padding: '0.5rem 0.7rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80', fontSize: '0.66rem', fontWeight: '700' }}>
            <span>{t('history.motionsPassed', 'MOCIONES APROBADAS')}</span>
            <CheckCircle size={13} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#4ade80', marginTop: '2px' }}>
            {estadisticasGenerales.totalMocionesAprobadas} <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--muted-text)' }}>/ {estadisticasGenerales.totalMociones}</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)' }}>
            {estadisticasGenerales.tasaAprobacion}% {t('history.approvalRate', 'de aprobación')}
          </div>
        </div>

        {/* KPI 4: Enmiendas Aprobadas */}
        <div style={{
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '8px',
          padding: '0.5rem 0.7rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c084fc', fontSize: '0.66rem', fontWeight: '700' }}>
            <span>{t('history.amendmentsPassed', 'ENMIENDAS APROBADAS')}</span>
            <FileSignature size={13} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#c084fc', marginTop: '2px' }}>
            {estadisticasGenerales.totalEnmiendasAprobadas} <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--muted-text)' }}>/ {estadisticasGenerales.totalEnmiendas}</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)' }}>
            {estadisticasGenerales.tasaAprobacionEnmiendas}% {t('history.approvalRate', 'de aprobación')}
          </div>
        </div>

        {/* KPI 5: Delegación Más Activa */}
        <div style={{
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '8px',
          padding: '0.5rem 0.7rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#facc15', fontSize: '0.66rem', fontWeight: '700' }}>
            <span>{t('history.leaderDelegation', 'DELEGACIÓN LÍDER')}</span>
            <Flame size={13} />
          </div>
          {estadisticasGenerales.paisLider ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
              <CountryFlag bandera={estadisticasGenerales.paisLider.bandera} nombre={estadisticasGenerales.paisLider.nombre} size="xs" />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: '800' }}>
                {estadisticasGenerales.paisLider.nombre}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
              {t('history.noInterventions', 'Sin intervenciones')}
            </div>
          )}
          <div style={{ fontSize: '0.64rem', color: 'var(--muted-text)', marginTop: '1px' }}>
            {estadisticasGenerales.paisLider ? `${estadisticasGenerales.paisLider.minutosExactos} ${t('history.minSpoken', 'min hablados')}` : t('history.registerSpeakers', 'Registra oradores')}
          </div>
        </div>
      </div>

      {/* ─── TABLA DEL HISTÓRICO ─── */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        border: '1px solid var(--border-color)', 
        borderRadius: 'var(--border-radius)',
        backgroundColor: isLight ? 'var(--panel-color)' : 'rgba(0, 0, 0, 0.15)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 2 }}>
              <th onClick={() => cambiarOrden('nombre')} style={{ padding: '0.45rem 0.65rem', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.country', 'PAÍS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('mociones')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.motionsPresented', 'MOC. PRESENTADAS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('aprobadas')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.motionsPassedCol', 'MOC. APROBADAS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('enmiendas')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.amendmentsPresented', 'ENM. PROPUESTAS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('enmiendasAprobadas')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.amendmentsPassedCol', 'ENM. APROBADAS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('tiempoHablado')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.speakingTimeCol', 'TIEMPO HABLADO & MINUTOS')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th onClick={() => cambiarOrden('preguntas')} style={{ padding: '0.45rem 0.6rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t('history.questionsCol', 'PREGUNTAS / POIs')} <ArrowUpDown size={11} style={{ display: 'inline', opacity: 0.7 }} />
              </th>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', userSelect: 'none' }}>
                {t('history.quotaCol', '% CUOTA')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paisesOrdenados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)' }}>
                  {t('history.noMatchingDelegations', 'No hay delegaciones que coincidan con los filtros aplicados.')}
                </td>
              </tr>
            ) : (
              paisesOrdenados.map((p, idx) => {
                const totalComiteSeg = estadisticasGenerales.totalSegundos;
                const porcentajeCuota = totalComiteSeg > 0 ? Math.round((p.segHablados / totalComiteSeg) * 100) : 0;

                return (
                  <tr 
                    key={p.id} 
                    style={{
                      borderBottom: '1px solid var(--subborder-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : (isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.015)'),
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* País */}
                    <td style={{ padding: '0.45rem 0.65rem', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                        <span style={{ fontSize: '0.8rem' }}>{p.nombre}</span>
                      </div>
                    </td>

                    {/* Mociones Presentadas */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: '700', color: p.mocPresentadas > 0 ? '#3b82f6' : 'inherit' }}>
                      {p.mocPresentadas}
                    </td>

                    {/* Mociones Aprobadas */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: '700', color: p.mocAprobadas > 0 ? '#22c55e' : 'inherit' }}>
                      {p.mocAprobadas}
                    </td>

                    {/* Enmiendas Propuestas */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: '700', color: p.enmPresentadas > 0 ? '#c084fc' : 'inherit' }}>
                      {p.enmPresentadas}
                    </td>

                    {/* Enmiendas Aprobadas */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: '700', color: p.enmAprobadas > 0 ? '#10b981' : 'inherit' }}>
                      {p.enmAprobadas}
                    </td>

                    {/* Tiempo Hablado (Cómputo de minutos y ajuste manual) */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <button
                            onClick={() => handleAjustarTiempo(p.id, -60)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-color)',
                              padding: '1px 3px',
                              fontSize: '0.65rem',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Restar 1 minuto"
                          >
                            -1m
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '65px' }}>
                            <span style={{ 
                              fontWeight: '800', 
                              color: p.segHablados > 0 ? '#ff007f' : 'inherit', 
                              fontSize: '0.82rem'
                            }}>
                              {formatTiempoCompacto(p.segHablados)}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                              ({p.minutosExactos} min)
                            </span>
                          </div>

                          <button
                            onClick={() => handleAjustarTiempo(p.id, 60)}
                            style={{
                              background: 'rgba(255, 0, 127, 0.12)',
                              border: '1px solid #ff007f',
                              color: '#ff007f',
                              padding: '1px 3px',
                              fontSize: '0.65rem',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                            title="Sumar 1 minuto"
                          >
                            +1m
                          </button>
                        </div>

                        {/* Si se filtra un día específico, mostrar el acumulado global de todos los días */}
                        {diaSeleccionado !== 'TODOS' && (
                          <span style={{ fontSize: '0.62rem', color: 'var(--muted-text)', marginTop: '1px' }}>
                            {t('history.totalMUN', 'Total MUN')}: {formatTiempoCompacto(p.segGlobalHablados)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Preguntas Realizadas / POIs */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <button
                          onClick={() => handleDecrementarPregunta(p.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-color)',
                            width: '18px',
                            height: '18px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            lineHeight: 1
                          }}
                          title="Restar 1 pregunta"
                        >
                          -
                        </button>
                        <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>
                          {p.totalPreguntas}
                        </span>
                        <button
                          onClick={() => handleIncrementarPregunta(p.id)}
                          style={{
                            background: 'rgba(255, 0, 127, 0.15)',
                            border: '1px solid #ff007f',
                            color: '#ff007f',
                            width: '18px',
                            height: '18px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            lineHeight: 1,
                            fontWeight: '700'
                          }}
                          title="Sumar 1 pregunta realizada"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Cuota de participación (%) */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                        <div style={{
                          width: '45px',
                          height: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, porcentajeCuota)}%`,
                            height: '100%',
                            backgroundColor: porcentajeCuota > 15 ? '#ff007f' : '#3b82f6',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', minWidth: '25px', textAlign: 'right' }}>
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
