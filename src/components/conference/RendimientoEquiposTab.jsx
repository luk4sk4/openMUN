import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Lock,
  Unlock,
  Shield,
  Key,
  Eye,
  EyeOff,
  Trophy,
  Clock,
  Mic,
  FileText,
  FileSignature,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  School,
  Award,
  Layers,
  Check,
  Flame,
  Globe,
  RefreshCw
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { normalizarDatosComite } from '../../utils/sessionValidator';
import conferenceService from '../../services/conferenceService';

// Formatear segundos a texto legible
function formatTiempo(segundos = 0) {
  if (!segundos || segundos <= 0) return '0m 00s';
  const horas = Math.floor(segundos / 3600);
  const mins = Math.floor((segundos % 3600) / 60);
  const secs = Math.floor(segundos % 60);
  if (horas > 0) {
    return `${horas}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

// Helper para convertir datos a CSV descargable
function exportarCsvEquipos(equipos, confNombre) {
  const headers = [
    'Equipo / Institución',
    'Delegación',
    'Alumno / Delegado',
    'Comité',
    'Estatus Asistencia',
    'Tiempo Hablado (segundos)',
    'Tiempo Hablado (legible)',
    'Discursos / Intervenciones',
    'Mociones Propuestas',
    'Mociones Aprobadas',
    'Enmiendas Propuestas',
    'Enmiendas Aprobadas',
    'Puntuación Estimada'
  ];

  const filas = [];
  equipos.forEach(eq => {
    eq.miembros.forEach(m => {
      filas.push([
        `"${eq.nombre.replace(/"/g, '""')}"`,
        `"${m.paisNombre.replace(/"/g, '""')}"`,
        `"${(m.delegado || '').replace(/"/g, '""')}"`,
        `"${m.comiteNombre.replace(/"/g, '""')}"`,
        `"${m.estatus}"`,
        m.segHablados,
        `"${formatTiempo(m.segHablados)}"`,
        m.intervencionesCount,
        m.mocPresentadas,
        m.mocAprobadas,
        m.enmPresentadas,
        m.enmAprobadas,
        m.score
      ].join(';'));
    });
  });

  const contenidoCsv = '\uFEFF' + [headers.join(';'), ...filas].join('\r\n');
  const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rendimiento_equipos_${(confNombre || 'conferencia').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const RendimientoEquiposTab = ({
  conferencia,
  listaComites = [],
  isAdmin = false,
  isLight = false,
  onRefresh = null
}) => {
  const confId = conferencia?.id ? String(conferencia.id).toLowerCase().trim() : '';

  // ── ESTADO DE AUTENTICACIÓN (TRAS CONTRASEÑA) ──
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (isAdmin) return true;
    if (!confId) return false;
    try {
      const auth = localStorage.getItem(`openmun_conf_faculty_auth_${confId}`) ||
                   sessionStorage.getItem(`openmun_conf_faculty_auth_${confId}`);
      return Boolean(auth);
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros y Visualización
  const [filtroEquipo, setFiltroEquipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('SCORE'); // 'SCORE' | 'TIEMPO' | 'MOCIONES' | 'ALFABETICO'
  const [equiposExpandidos, setEquiposExpandidos] = useState({});

  // Sincronizar si entra como admin
  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticated(true);
    }
  }, [isAdmin]);

  // Refresco manual de datos
  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.warn('Error al refrescar datos de comités:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Auto-refresco en segundo plano cada 20s cuando el profesor está autenticado
  useEffect(() => {
    if (!isAuthenticated || !onRefresh) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onRefresh();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, onRefresh]);

  // Manejar Login del Profesor / Faculty Advisor
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const pin = passwordInput.trim();
    if (!pin) {
      setAuthError('Por favor ingresa la contraseña de acceso.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      // 1. Comprobar PIN específico de Profesores/Faculty Advisors guardado localmente
      const facultyPin = localStorage.getItem(`openmun_conf_faculty_pin_${confId}`) || '';
      if (facultyPin && facultyPin.trim() === pin) {
        setIsAuthenticated(true);
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        return;
      }

      // 2. Comprobar PIN de Organización (Admin)
      const adminPinGuardado = localStorage.getItem(`openmun_conf_admin_pin_${confId}`) || conferencia?.pin_admin || '';
      if (adminPinGuardado && adminPinGuardado.trim() === pin) {
        setIsAuthenticated(true);
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        return;
      }

      // 3. Comprobar con el servicio backend si coincide con el PIN Admin
      try {
        await conferenceService.verificarAdmin(confId, pin);
        setIsAuthenticated(true);
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        return;
      } catch (errAdmin) {
        // No es admin
      }

      // 4. Comprobar PIN de Acceso general a la conferencia (si existe)
      const accessPin = localStorage.getItem(`openmun_conf_pin_${confId}`) || conferencia?.pin_acceso || '';
      if (accessPin && accessPin.trim() === pin) {
        setIsAuthenticated(true);
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        return;
      }

      // 5. Si no hay ningún PIN configurado aún en la conferencia, permitir acceso con aviso
      if (!facultyPin && !adminPinGuardado && !accessPin) {
        setIsAuthenticated(true);
        localStorage.setItem(`openmun_conf_faculty_auth_${confId}`, 'true');
        return;
      }

      setAuthError('Contraseña incorrecta. Contacta a la organización del evento si necesitas el PIN de profesores.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCerrarSesion = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError(null);
    try {
      localStorage.removeItem(`openmun_conf_faculty_auth_${confId}`);
      sessionStorage.removeItem(`openmun_conf_faculty_auth_${confId}`);
    } catch {}
  };

  // ── EXTRACCIÓN Y AGREGACIÓN DE DATOS DE RENDIMIENTO ──
  const datosEquipos = useMemo(() => {
    const mapaEquipos = new Map();

    listaComites.forEach(comite => {
      if (!comite) return;
      const cleanNom = comite.nombre || comite.id || 'Comité';

      // Cargar datos normalizados del comité
      let rawData = comite.datos_json || {};
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch { rawData = {}; }
      }
      if (!rawData.paises || !Array.isArray(rawData.paises) || rawData.paises.length === 0) {
        try {
          const local = localStorage.getItem(`openmun_comite_data_${comite.id}`);
          if (local) rawData = JSON.parse(local);
        } catch {}
      }

      const datosComite = normalizarDatosComite(rawData, cleanNom) || {};
      const paises = datosComite.paises || [];
      const intervenciones = datosComite.registroIntervenciones || [];
      const mociones = datosComite.historicoMociones?.length > 0 ? datosComite.historicoMociones : (datosComite.mociones || []);
      const enmiendas = datosComite.enmiendasSesion?.enmiendas || [];

      paises.forEach(p => {
        const pNombreNorm = (p.nombre || '').toLowerCase().trim();
        if (!pNombreNorm) return;

        // Estadísticas individuales en este comité
        const intervencionesPais = intervenciones.filter(i => {
          const n = (i.pais || i.orador || '').toLowerCase().trim();
          return n === pNombreNorm;
        });

        const segHablados = intervencionesPais.reduce((acc, curr) => {
          return acc + (curr.tiempoHabladoExacto || curr.tiempoHablado || 0);
        }, 0);

        const intervencionesCount = intervencionesPais.length;

        const mocPresentadas = mociones.filter(m => {
          return (m.proponente || '').toLowerCase().trim() === pNombreNorm;
        }).length;

        const mocAprobadas = mociones.filter(m => {
          const prop = (m.proponente || '').toLowerCase().trim();
          const st = (m.estado || '').toLowerCase().trim();
          return prop === pNombreNorm && (st === 'aprobada' || st === 'aprobado');
        }).length;

        const enmPresentadas = enmiendas.filter(e => {
          const prop = (e.paisProponente || e.proponente || '').toLowerCase().trim();
          return prop === pNombreNorm;
        }).length;

        const enmAprobadas = enmiendas.filter(e => {
          const prop = (e.paisProponente || e.proponente || '').toLowerCase().trim();
          const st = (e.estado || '').toLowerCase().trim();
          return prop === pNombreNorm && (st === 'aceptada' || st === 'aceptado' || st === 'aprobada' || st === 'aprobado');
        }).length;

        // Puntuación ponderada de participación
        const score = Math.round(
          (segHablados / 60) * 2 +
          intervencionesCount * 4 +
          mocAprobadas * 8 +
          mocPresentadas * 2 +
          enmAprobadas * 12 +
          enmPresentadas * 3 +
          (p.estatus === 'Presente y Votando' ? 5 : (p.estatus === 'Presente' ? 3 : 0))
        );

        // Insignias individuales
        const insignias = [];
        if (segHablados >= 300) insignias.push('🗣️ Gran Oratoria');
        if (mocAprobadas >= 2) insignias.push('📜 Líder de Mociones');
        if (enmAprobadas >= 1) insignias.push('✍️ Redactor Clave');
        if (p.estatus === 'Presente y Votando') insignias.push('🗳️ Quórum Comprometido');

        const miembro = {
          paisId: p.id,
          paisNombre: p.nombre,
          delegado: p.delegado || '',
          bandera: p.bandera,
          veto: p.veto,
          estatus: p.estatus || 'Ausente',
          comiteId: comite.id,
          comiteNombre: cleanNom,
          segHablados,
          intervencionesCount,
          mocPresentadas,
          mocAprobadas,
          enmPresentadas,
          enmAprobadas,
          score,
          insignias
        };

        const equipoKey = (p.equipo && p.equipo.trim()) ? p.equipo.trim() : 'Sin Equipo Asignado';

        if (!mapaEquipos.has(equipoKey)) {
          mapaEquipos.set(equipoKey, {
            nombre: equipoKey,
            esSinEquipo: equipoKey === 'Sin Equipo Asignado',
            miembros: [],
            totalSegundos: 0,
            totalIntervenciones: 0,
            totalMociones: 0,
            totalMocionesAprobadas: 0,
            totalEnmiendas: 0,
            totalEnmiendasAprobadas: 0,
            totalScore: 0,
            comitesSet: new Set(),
            asistencia: { presente: 0, presenteVotando: 0, ausente: 0 }
          });
        }

        const eqData = mapaEquipos.get(equipoKey);
        eqData.miembros.push(miembro);
        eqData.totalSegundos += segHablados;
        eqData.totalIntervenciones += intervencionesCount;
        eqData.totalMociones += mocPresentadas;
        eqData.totalMocionesAprobadas += mocAprobadas;
        eqData.totalEnmiendas += enmPresentadas;
        eqData.totalEnmiendasAprobadas += enmAprobadas;
        eqData.totalScore += score;
        eqData.comitesSet.add(cleanNom);

        if (p.estatus === 'Presente y Votando') eqData.asistencia.presenteVotando++;
        else if (p.estatus === 'Presente') eqData.asistencia.presente++;
        else eqData.asistencia.ausente++;
      });
    });

    return Array.from(mapaEquipos.values()).map(eq => ({
      ...eq,
      totalComites: eq.comitesSet.size,
      tasaMociones: eq.totalMociones > 0 ? Math.round((eq.totalMocionesAprobadas / eq.totalMociones) * 100) : 0,
      tasaAsistencia: eq.miembros.length > 0
        ? Math.round(((eq.asistencia.presente + eq.asistencia.presenteVotando) / eq.miembros.length) * 100)
        : 0
    }));
  }, [listaComites]);

  // Lista única de nombres de equipos
  const nombresEquipos = useMemo(() => {
    return datosEquipos.filter(e => !e.esSinEquipo).map(e => e.nombre).sort((a, b) => a.localeCompare(b, 'es'));
  }, [datosEquipos]);

  // Filtrado y Ordenación de Equipos
  const equiposFiltrados = useMemo(() => {
    let resultado = datosEquipos;

    if (filtroEquipo !== 'TODOS') {
      resultado = resultado.filter(e => e.nombre === filtroEquipo);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(e => {
        const matchNombre = e.nombre.toLowerCase().includes(q);
        const matchMiembros = e.miembros.some(m =>
          m.paisNombre.toLowerCase().includes(q) ||
          m.comiteNombre.toLowerCase().includes(q) ||
          (m.delegado && m.delegado.toLowerCase().includes(q))
        );
        return matchNombre || matchMiembros;
      });
    }

    return [...resultado].sort((a, b) => {
      // Dejar 'Sin Equipo' siempre al final a menos que sea búsqueda específica
      if (a.esSinEquipo && !b.esSinEquipo) return 1;
      if (!a.esSinEquipo && b.esSinEquipo) return -1;

      if (orden === 'SCORE') return b.totalScore - a.totalScore;
      if (orden === 'TIEMPO') return b.totalSegundos - a.totalSegundos;
      if (orden === 'MOCIONES') return b.totalMocionesAprobadas - a.totalMocionesAprobadas;
      if (orden === 'ALFABETICO') return a.nombre.localeCompare(b.nombre, 'es');
      return 0;
    });
  }, [datosEquipos, filtroEquipo, busqueda, orden]);

  // KPIs Globales de Toda la Conferencia
  const kpisGlobales = useMemo(() => {
    const equiposReales = datosEquipos.filter(e => !e.esSinEquipo);
    const totalDelegaciones = datosEquipos.reduce((acc, e) => acc + e.miembros.length, 0);
    const totalSegundos = datosEquipos.reduce((acc, e) => acc + e.totalSegundos, 0);
    const totalMocionesAprobadas = datosEquipos.reduce((acc, e) => acc + e.totalMocionesAprobadas, 0);
    const totalMociones = datosEquipos.reduce((acc, e) => acc + e.totalMociones, 0);
    const equipoLider = [...equiposReales].sort((a, b) => b.totalScore - a.totalScore)[0] || null;

    return {
      totalEquipos: equiposReales.length,
      totalDelegaciones,
      totalSegundos,
      totalMocionesAprobadas,
      totalMociones,
      equipoLider
    };
  }, [datosEquipos]);

  const toggleExpandir = (nombreEq) => {
    setEquiposExpandidos(prev => ({
      ...prev,
      [nombreEq]: prev[nombreEq] === undefined ? false : !prev[nombreEq]
    }));
  };

  const expandirTodos = () => {
    const nuevo = {};
    datosEquipos.forEach(e => { nuevo[e.nombre] = true; });
    setEquiposExpandidos(nuevo);
  };

  const colapsarTodos = () => {
    const nuevo = {};
    datosEquipos.forEach(e => { nuevo[e.nombre] = false; });
    setEquiposExpandidos(nuevo);
  };

  // Colores y tokens según tema
  const bgCard = isLight ? '#ffffff' : 'var(--panel-color)';
  const borderCol = 'var(--border-color)';
  const textMuted = 'var(--muted-text)';
  const headerBg = isLight ? '#f1f5f9' : 'var(--card-header-bg)';

  // ─────────────────────────────────────────────────────────────
  // PANTALLA DE ACCESO TRAS CONTRASEÑA
  // ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{
        maxWidth: '460px',
        margin: '3rem auto',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '16px',
        padding: '2.2rem 1.8rem',
        textAlign: 'center',
        boxShadow: isLight
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
          : '0 15px 35px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '58px',
          height: '58px',
          borderRadius: '16px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <Users size={30} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
          Rendimiento de Equipos
        </h2>
        <p style={{ fontSize: '0.86rem', color: textMuted, margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
          Espacio exclusivo para profesores y <em>Faculty Advisors</em>. Ingresa la contraseña de profesores u organización para supervisar el rendimiento de tus alumnos y colegios.
        </p>

        {authError && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: isLight ? '#b91c1c' : '#fca5a5',
            fontSize: '0.84rem',
            marginBottom: '1.25rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: textMuted, marginBottom: '0.35rem' }}>
              Contraseña de Profesores / Faculty Advisor
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Introduce la contraseña..."
                style={{
                  width: '100%',
                  padding: '0.75rem 2.6rem 0.75rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: headerBg,
                  color: 'var(--text-color)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            style={{
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: '800',
              cursor: isVerifying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Key size={16} />
            {isVerifying ? 'Verificando...' : 'Acceder al Panel de Rendimiento'}
          </button>
        </form>

        <p style={{ fontSize: '0.75rem', color: textMuted, marginTop: '1.25rem', marginBottom: 0 }}>
          🔒 El acceso está protegido para garantizar la confidencialidad de las evaluaciones académicas.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VISTA PRINCIPAL: PANEL DE RENDIMIENTO DE EQUIPOS
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ── CABECERA Y ACCIONES ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '12px',
        boxShadow: isLight ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div style={{
              padding: '0.4rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex'
            }}>
              <Award size={20} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
              Rendimiento de Equipos & Alumnos
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0 }}>
            Supervisión académica en tiempo real para profesores y delegaciones de <strong>{conferencia?.nombre || 'la Conferencia'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: isRefreshing ? 'wait' : 'pointer'
              }}
              title="Actualizar datos en tiempo real de todos los comités"
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          )}

          <button
            onClick={() => exportarCsvEquipos(datosEquipos, conferencia?.nombre)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              backgroundColor: headerBg,
              color: 'var(--text-color)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Descargar datos en formato CSV para Excel"
          >
            <Download size={15} /> Exportar CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              backgroundColor: headerBg,
              color: 'var(--text-color)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Imprimir o guardar como PDF"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>

          {!isAdmin && (
            <button
              onClick={handleCerrarSesion}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                color: isLight ? '#dc2626' : '#f87171',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Bloquear y salir del modo profesor"
            >
              <Lock size={14} /> Bloquear
            </button>
          )}
        </div>
      </div>

      {/* ── BARRA DE KPIS GLOBALES ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem'
      }}>
        {/* KPI 1: Equipos Registrados */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#10b981', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Equipos / Colegios</span>
            <School size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text-color)', marginTop: '0.2rem' }}>
            {kpisGlobales.totalEquipos}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.totalDelegaciones} delegaciones registradas
          </div>
        </div>

        {/* KPI 2: Tiempo Hablado Total */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#3b82f6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Tiempo de Oratoria</span>
            <Clock size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#3b82f6', marginTop: '0.2rem' }}>
            {formatTiempo(kpisGlobales.totalSegundos)}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            En debates de comités
          </div>
        </div>

        {/* KPI 3: Mociones Aprobadas */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8b5cf6', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Mociones Aprobadas</span>
            <FileText size={16} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#8b5cf6', marginTop: '0.2rem' }}>
            {kpisGlobales.totalMocionesAprobadas} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: textMuted }}>/ {kpisGlobales.totalMociones}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.totalMociones > 0 ? Math.round((kpisGlobales.totalMocionesAprobadas / kpisGlobales.totalMociones) * 100) : 0}% tasa de aprobación
          </div>
        </div>

        {/* KPI 4: Equipo con Mayor Desempeño */}
        <div style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
            <span>Equipo Líder</span>
            <Trophy size={16} />
          </div>
          <div style={{
            fontSize: '1.15rem',
            fontWeight: '900',
            color: 'var(--text-color)',
            marginTop: '0.3rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {kpisGlobales.equipoLider ? kpisGlobales.equipoLider.nombre : '—'}
          </div>
          <div style={{ fontSize: '0.74rem', color: textMuted }}>
            {kpisGlobales.equipoLider ? `${kpisGlobales.equipoLider.totalScore} pts acumulados` : 'Sin datos de actividad'}
          </div>
        </div>
      </div>

      {/* ── CONTROLES Y FILTROS ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        backgroundColor: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 320px', flexWrap: 'wrap' }}>
          {/* Selector de Equipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Equipo:</span>
            <select
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
            >
              <option value="TODOS">Todos los Equipos ({datosEquipos.length})</option>
              {nombresEquipos.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
            <input
              type="text"
              placeholder="Buscar alumno, país, comité..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem 0.45rem 1.85rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Orden */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: textMuted }}>Ordenar:</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              style={{
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
            >
              <option value="SCORE">Puntuación / Desempeño</option>
              <option value="TIEMPO">Tiempo Hablado</option>
              <option value="MOCIONES">Mociones Aprobadas</option>
              <option value="ALFABETICO">Alfabético</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button
              onClick={expandirTodos}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: textMuted,
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Expandir todos
            </button>
            <button
              onClick={colapsarTodos}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${borderCol}`,
                backgroundColor: headerBg,
                color: textMuted,
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Colapsar todos
            </button>
          </div>
        </div>
      </div>

      {/* ── LISTADO DETALLADO POR EQUIPO ── */}
      {equiposFiltrados.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: '12px'
        }}>
          <Users size={36} style={{ color: textMuted, margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.35rem 0', color: 'var(--text-color)' }}>
            No se encontraron equipos
          </h3>
          <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            {busqueda || filtroEquipo !== 'TODOS'
              ? 'Prueba a cambiar los filtros o el término de búsqueda.'
              : 'Aún no se han asignado equipos a las delegaciones en los comités. Las mesas directivas pueden asignarlos en la Matriz de Países.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {equiposFiltrados.map((equipo, index) => {
            const isExpandido = equiposExpandidos[equipo.nombre] !== false; // Abierto por defecto
            const rank = index + 1;

            return (
              <div
                key={equipo.nombre}
                style={{
                  backgroundColor: bgCard,
                  border: `1px solid ${equipo.esSinEquipo ? 'rgba(239, 68, 68, 0.25)' : borderCol}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Cabecera del Equipo */}
                <div
                  onClick={() => toggleExpandir(equipo.nombre)}
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: equipo.esSinEquipo
                      ? (isLight ? '#fff1f2' : 'rgba(239, 68, 68, 0.08)')
                      : headerBg,
                    borderBottom: isExpandido ? `1px solid ${borderCol}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 260px' }}>
                    {!equipo.esSinEquipo && (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: rank === 1 ? '#eab308' : (rank === 2 ? '#94a3b8' : (rank === 3 ? '#d97706' : 'rgba(99, 102, 241, 0.15)')),
                        color: rank <= 3 ? '#ffffff' : '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: '900',
                        flexShrink: 0
                      }}>
                        {rank}
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          margin: 0,
                          color: equipo.esSinEquipo ? '#ef4444' : 'var(--text-color)'
                        }}>
                          {equipo.nombre}
                        </h3>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                          color: textMuted,
                          fontWeight: '700'
                        }}>
                          {equipo.miembros.length} {equipo.miembros.length === 1 ? 'delegación' : 'delegaciones'}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontWeight: '700'
                        }}>
                          {equipo.totalComites} {equipo.totalComites === 1 ? 'comité' : 'comités'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Métricas del Equipo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Tiempo Hablado
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#3b82f6' }}>
                        {formatTiempo(equipo.totalSegundos)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Mociones
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#10b981' }}>
                        {equipo.totalMocionesAprobadas} <span style={{ fontSize: '0.72rem', color: textMuted }}>/ {equipo.totalMociones}</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Puntuación
                      </span>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: '900',
                        color: '#6366f1',
                        padding: '0.1rem 0.5rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        borderRadius: '6px'
                      }}>
                        {equipo.totalScore} pts
                      </span>
                    </div>

                    <div style={{ color: textMuted, display: 'flex', alignItems: 'center' }}>
                      {isExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Tabla de Miembros / Alumnos */}
                {isExpandido && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)',
                          borderBottom: `1px solid ${borderCol}`,
                          color: textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase'
                        }}>
                          <th style={{ padding: '0.6rem 0.85rem' }}>Delegación & Alumno</th>
                          <th style={{ padding: '0.6rem 0.85rem' }}>Comité</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Asistencia</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Tiempo Hablado</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Discursos</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Mociones</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Enmiendas</th>
                          <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Desempeño</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipo.miembros.map((m, idx) => (
                          <tr
                            key={`${m.comiteId}_${m.paisId}`}
                            style={{
                              borderBottom: idx < equipo.miembros.length - 1 ? `1px solid ${borderCol}` : 'none',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : (isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)')
                            }}
                          >
                            {/* Delegación & Alumno */}
                            <td style={{ padding: '0.6rem 0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CountryFlag bandera={m.bandera} nombre={m.paisNombre} size="sm" />
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span>{m.paisNombre}</span>
                                    {m.veto && <span title="P5 / Veto" style={{ fontSize: '0.7rem' }}>👑</span>}
                                  </div>
                                  {m.delegado && (
                                    <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                      {m.delegado}
                                    </div>
                                  )}
                                  {m.insignias.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                      {m.insignias.map(ins => (
                                        <span
                                          key={ins}
                                          style={{
                                            fontSize: '0.62rem',
                                            padding: '0.05rem 0.35rem',
                                            borderRadius: '4px',
                                            backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                                            color: textMuted,
                                            fontWeight: '600'
                                          }}
                                        >
                                          {ins}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Comité */}
                            <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-color)' }}>
                              <span style={{
                                fontSize: '0.76rem',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '6px',
                                backgroundColor: isLight ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)',
                                color: isLight ? '#0369a1' : '#38bdf8',
                                fontWeight: '700'
                              }}>
                                {m.comiteNombre}
                              </span>
                            </td>

                            {/* Asistencia */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontWeight: '700',
                                backgroundColor: m.estatus === 'Presente y Votando'
                                  ? (isLight ? '#dbeafe' : 'rgba(59, 130, 246, 0.15)')
                                  : (m.estatus === 'Presente'
                                    ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)')
                                    : (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)')),
                                color: m.estatus === 'Presente y Votando'
                                  ? '#2563eb'
                                  : (m.estatus === 'Presente' ? '#16a34a' : '#dc2626')
                              }}>
                                {m.estatus}
                              </span>
                            </td>

                            {/* Tiempo Hablado */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700', color: m.segHablados > 0 ? '#3b82f6' : textMuted }}>
                              {formatTiempo(m.segHablados)}
                            </td>

                            {/* Discursos */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700' }}>
                              {m.intervencionesCount}
                            </td>

                            {/* Mociones */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{ fontWeight: '700', color: m.mocAprobadas > 0 ? '#10b981' : 'inherit' }}>
                                {m.mocAprobadas}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.mocPresentadas}</span>
                            </td>

                            {/* Enmiendas */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              <span style={{ fontWeight: '700', color: m.enmAprobadas > 0 ? '#8b5cf6' : 'inherit' }}>
                                {m.enmAprobadas}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: textMuted }}> / {m.enmPresentadas}</span>
                            </td>

                            {/* Desempeño Individual */}
                            <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '0.82rem',
                                fontWeight: '900',
                                color: '#6366f1',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)'
                              }}>
                                {m.score} pts
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RendimientoEquiposTab;
