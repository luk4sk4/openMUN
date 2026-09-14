import React, { useState } from 'react';
import {
  Crown,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Sparkles,
  RotateCcw,
  ArrowUpDown,
  GripVertical,
  Edit2,
  Check
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import EditarPaisModal from '../modals/EditarPaisModal';
import EmptyState from '../common/EmptyState';
import VirtualizedList from '../common/VirtualizedList';
import { useTranslation } from 'react-i18next';

const MatrizPaises = () => {
  const { t } = useTranslation();
  const {
    paises,
    cambiarEstatusPais,
    actualizarPais,
    eliminarPais,
    resetearAsistencia,
    toggleVetoPais,
    ordenarPaisesAlfabetico,
    reordenarPaises
  } = useSession();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paisAEditar, setPaisAEditar] = useState(null);

  // Estado para Roll Call Nominal de Asistencia
  const [modoRollCall, setModoRollCall] = useState(false);
  const [rondaRollCall, setRondaRollCall] = useState(1); // 1 = Primera Ronda, 2 = Segunda Ronda (Pasados)
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [paisesPasados, setPaisesPasados] = useState([]); // IDs de países que seleccionaron 'Pasar' en Ronda 1

  // Cálculo de Quórum
  const totalPaises = paises.length;
  const presentes = paises.filter(p => p.estatus === 'Presente').length;
  const presentesYVotando = paises.filter(p => p.estatus === 'Presente y Votando').length;
  const ausentes = paises.filter(p => p.estatus === 'Ausente').length;

  const totalAsistentes = presentes + presentesYVotando;
  const porcentajeAsistencia = totalPaises > 0 ? Math.round((totalAsistentes / totalPaises) * 100) : 0;

  const mayoriaSimple = Math.floor(totalAsistentes / 2) + 1;
  const mayoriaCualificada = Math.ceil((totalAsistentes * 2) / 3);

  // Lista de Países para la Ronda de Roll Call Actual
  const listaPaisesRondaRollCall = React.useMemo(() => {
    const todosOrdenados = [...paises].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (rondaRollCall === 1) {
      return todosOrdenados;
    } else {
      // Ronda 2: Únicamente países que pasaron en Ronda 1 (lista estable)
      return todosOrdenados.filter(p => paisesPasados.includes(p.id));
    }
  }, [paises, rondaRollCall, paisesPasados]);

  const paisActualRollCall = listaPaisesRondaRollCall[indiceRollCall] || null;

  // Iniciar / Resetear Modo Roll Call
  const toggleModoRollCall = () => {
    if (!modoRollCall) {
      setModoRollCall(true);
      setRondaRollCall(1);
      setIndiceRollCall(0);
      setPaisesPasados([]);
    } else {
      setModoRollCall(false);
    }
  };

  // Estatus en Roll Call Nominal con avance de ronda
  const registrarYAvanzarRollCall = (estatus) => {
    if (!paisActualRollCall) return;

    let nuevosPasados = paisesPasados;
    if (estatus === 'pasar') {
      if (!paisesPasados.includes(paisActualRollCall.id)) {
        nuevosPasados = [...paisesPasados, paisActualRollCall.id];
        setPaisesPasados(nuevosPasados);
      }
    } else {
      cambiarEstatusPais(paisActualRollCall.id, estatus);
    }

    // Avanzar dentro de la lista actual
    if (indiceRollCall < listaPaisesRondaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else {
      // Final de la ronda actual
      if (rondaRollCall === 1) {
        if (nuevosPasados.length > 0) {
          setRondaRollCall(2);
          setIndiceRollCall(0);
        } else {
          setModoRollCall(false);
        }
      } else {
        // Final de la Ronda 2
        setModoRollCall(false);
      }
    }
  };

  // Filtrado
  const paisesFiltrados = paises.filter(p => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (filtroEstatus === 'TODOS') return coincideNombre;
    if (filtroEstatus === 'VETO') return coincideNombre && p.veto;
    return coincideNombre && p.estatus === filtroEstatus;
  });

  const renderPaisItem = (p, index) => {
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={p.id}
        draggable
        onDragStart={() => setDraggedIndex(index)}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverIndex !== index) setDragOverIndex(index);
        }}
        onDrop={() => {
          if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            const fromOriginal = paises.findIndex(item => item.id === paisesFiltrados[draggedIndex].id);
            const toOriginal = paises.findIndex(item => item.id === paisesFiltrados[dragOverIndex].id);
            if (fromOriginal !== -1 && toOriginal !== -1) {
              reordenarPaises(fromOriginal, toOriginal);
            }
          }
          setDraggedIndex(null);
          setDragOverIndex(null);
        }}
        onDragEnd={() => {
          setDraggedIndex(null);
          setDragOverIndex(null);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.75rem',
          backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.15)' : 'var(--card-header-bg)',
          border: isDragOver ? '2px dashed #3b82f6' : '1px solid var(--border-color)',
          borderRadius: '6px',
          fontSize: '0.82rem',
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        {/* Lado Izquierdo: Drag + Bandera + Nombre + Veto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GripVertical size={13} style={{ color: '#71717a', cursor: 'grab', flexShrink: 0 }} title="Arrastrar para reordenar país" />
          
          {/* Bandera con click para editar */}
          <div
            onClick={() => setPaisAEditar(p)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Haz clic para cambiar bandera o imagen"
          >
            <CountryFlag bandera={p.bandera} nombre={p.nombre} size="md" />
          </div>

          <span
            onClick={() => setPaisAEditar(p)}
            style={{
              fontWeight: '700',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Haz clic para editar delegación"
          >
            {p.nombre}
          </span>

          {/* Botón / Indicador de Veto 👑 */}
          <button
            onClick={() => toggleVetoPais(p.id)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              opacity: p.veto ? 1 : 0.2
            }}
            title={p.veto ? 'Tiene derecho a Veto (P5)' : 'Sin derecho a Veto'}
          >
            <Crown size={14} color={p.veto ? '#facc15' : '#888888'} fill={p.veto ? '#facc15' : 'none'} />
          </button>

          {/* Botón editar delegación */}
          <button
            onClick={() => setPaisAEditar(p)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--muted-text)',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.6
            }}
            title="Editar nombre o bandera"
          >
            <Edit2 size={12} />
          </button>
        </div>

        {/* Selector de Estatus Roll Call */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => cambiarEstatusPais(p.id, 'Presente')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid #15803d',
              backgroundColor: p.estatus === 'Presente' ? '#15803d' : 'transparent',
              color: p.estatus === 'Presente' ? '#ffffff' : '#22c55e',
              cursor: 'pointer'
            }}
          >
            {t('countries.present', 'Presente')}
          </button>

          <button
            onClick={() => cambiarEstatusPais(p.id, 'Presente y Votando')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid #1d4ed8',
              backgroundColor: p.estatus === 'Presente y Votando' ? '#1d4ed8' : 'transparent',
              color: p.estatus === 'Presente y Votando' ? '#ffffff' : '#3b82f6',
              cursor: 'pointer'
            }}
          >
            {t('countries.presentAndVotingShort', 'P. y Votando')}
          </button>

          <button
            onClick={() => cambiarEstatusPais(p.id, 'Ausente')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid #b91c1c',
              backgroundColor: p.estatus === 'Ausente' ? '#b91c1c' : 'transparent',
              color: p.estatus === 'Ausente' ? '#ffffff' : '#ef4444',
              cursor: 'pointer'
            }}
          >
            {t('countries.absent', 'Ausente')}
          </button>
        </div>
      </div>
    );
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
      gap: '0.75rem',
      position: 'relative'
    }}>
      {/* Modal de edición rápida de país */}
      {paisAEditar && (
        <EditarPaisModal
          isOpen={!!paisAEditar}
          pais={paisAEditar}
          onClose={() => setPaisAEditar(null)}
          onGuardar={(id, datos) => {
            actualizarPais(id, datos);
            setPaisAEditar(null);
          }}
          onEliminar={(id) => {
            eliminarPais(id);
            setPaisAEditar(null);
          }}
        />
      )}

      {/* HEADER & BARRA DE ESTADÍSTICAS / QUÓRUM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.5rem',
        padding: '0.6rem 0.8rem',
        backgroundColor: 'var(--card-header-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px'
      }}>
        {/* Total Delegaciones */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.totalQuorum', 'Total Quórum')}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-color)' }}>
              {totalAsistentes}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>/ {totalPaises} ({porcentajeAsistencia}%)</span>
          </div>
        </div>

        {/* Presentes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.present', 'Presentes')}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#22c55e' }}>
            {presentes}
          </span>
        </div>

        {/* Presentes y Votando */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.presentAndVotingShort', 'P. y Votando')}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3b82f6' }}>
            {presentesYVotando}
          </span>
        </div>

        {/* Ausentes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.absent', 'Ausentes')}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444' }}>
            {ausentes}
          </span>
        </div>

        {/* Mayorías Calculadas */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('voting.majorityRequired', 'Mayorías (Simp / 2/3)')}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#eab308' }} title="Mayoría Simple">
              {mayoriaSimple}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>|</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f59e0b' }} title="Mayoría Cualificada (2/3)">
              {mayoriaCualificada}
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLES Y HERRAMIENTAS DE PASO DE LISTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Buscador y Filtros */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--muted-text)' }} />
            <input
              type="text"
              placeholder={t('countries.searchPlaceholder', 'Buscar delegación...')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem 0.4rem 1.8rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-header-bg)',
                color: 'var(--text-color)'
              }}
            />
          </div>

          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-header-bg)',
              color: 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            <option value="TODOS">{t('common.all', 'Todos')} ({totalPaises})</option>
            <option value="Presente">{t('countries.present', 'Presente')} ({presentes})</option>
            <option value="Presente y Votando">{t('countries.presentAndVoting', 'P. y Votando')} ({presentesYVotando})</option>
            <option value="Ausente">{t('countries.absent', 'Ausente')} ({ausentes})</option>
            <option value="VETO">{t('voting.vetoEnabled', 'P5 / Veto')}</option>
          </select>
        </div>

        {/* Acciones Rápidas */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            onClick={ordenarPaisesAlfabetico}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.65rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Ordenar alfabéticamente A-Z"
          >
            <ArrowUpDown size={13} />
            <span>A-Z</span>
          </button>

          <button
            onClick={resetearAsistencia}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.65rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Marcar a todos como Ausente para iniciar nueva sesión"
          >
            <RotateCcw size={13} />
            <span>{t('countries.resetAttendance', 'Reiniciar Lista')}</span>
          </button>

          <button
            onClick={toggleModoRollCall}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.85rem',
              backgroundColor: modoRollCall ? '#ef4444' : '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <Play size={13} fill="#ffffff" />
            <span>{modoRollCall ? t('countries.closeRollCall', 'Cerrar Paso Nominal') : t('countries.rollCall', 'Paso Nominal (Roll Call)')}</span>
          </button>
        </div>
      </div>

      {/* ── MODO ROLL CALL NOMINAL INTERACTIVO ── */}
      {modoRollCall && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {/* Banner de Ronda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} color={rondaRollCall === 2 ? '#f59e0b' : '#3b82f6'} />
              <span style={{ fontWeight: '800', fontSize: '0.82rem', color: rondaRollCall === 2 ? '#f59e0b' : '#60a5fa' }}>
                {rondaRollCall === 1 ? t('countries.round1', 'PRIMERA RONDA - PASO DE LISTA NOMINAL') : t('countries.round2', 'SEGUNDA RONDA - PASADOS / AUSENTES')}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
              {paisActualRollCall ? `${t('countries.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('countries.rollCallFinished', 'Paso de Lista Finalizado')}
            </span>
          </div>

          {paisActualRollCall ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CountryFlag bandera={paisActualRollCall.bandera} nombre={paisActualRollCall.nombre} size="xl" />
                <div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('countries.currentStatus', 'Estatus actual')}: {paisActualRollCall.estatus}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={16} color="#facc15" fill="#facc15" title="Veto P5" />}
                  </div>
                </div>
              </div>

              {/* Botones de Asistencia Roll Call */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={() => registrarYAvanzarRollCall('Presente')}
                  style={{
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('countries.present', 'Presente')}
                </button>

                <button
                  onClick={() => registrarYAvanzarRollCall('Presente y Votando')}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('countries.presentAndVoting', 'Pres. y Votando')}
                </button>

                <button
                  onClick={() => registrarYAvanzarRollCall('Ausente')}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('countries.absent', 'Ausente')}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.75rem', color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Check size={16} />
              <span>{t('countries.rollCallCompleted', 'Paso de lista nominal completado para todas las delegaciones.')}</span>
            </div>
          )}
        </div>
      )}

      {/* ── LISTA / MATRIZ DE DELEGACIONES (VIRTUALIZADA PARA ASAMBLEAS GRANDES) ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {paisesFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title={paises.length === 0 ? t('countries.noDelegationsLoaded', 'No hay delegaciones cargadas') : t('countries.noMatchFound', 'Sin coincidencias')}
            description={paises.length === 0 ? t('countries.importHelp', 'Carga delegaciones desde la pestaña "Comienzo" o importa un archivo Excel/CSV.') : t('countries.filterHelp', 'Prueba con otro término de búsqueda o limpia el filtro de estatus.')}
            compact={true}
          />
        ) : paisesFiltrados.length > 25 ? (
          <VirtualizedList
            items={paisesFiltrados}
            itemHeight={44}
            overscan={6}
            renderItem={(p, index) => renderPaisItem(p, index)}
          />
        ) : (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            paddingRight: '0.2rem'
          }}>
            {paisesFiltrados.map((p, index) => renderPaisItem(p, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrizPaises;
