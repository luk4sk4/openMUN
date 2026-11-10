import React, { useRef, useState } from 'react';
import {
  Crown,
  Search,
  Plus,
  X,
  Play,
  UserCheck,
  RotateCcw,
  ArrowUpDown,
  GripVertical,
  Edit2,
  Check,
  Users,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import EditarPaisModal from '../modals/EditarPaisModal';
import EmptyState from '../common/EmptyState';
import VirtualizedList from '../common/VirtualizedList';
import ImportarPaises from './ImportarPaises';
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
  const [filtroEquipo, setFiltroEquipo] = useState('TODOS');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paisAEditar, setPaisAEditar] = useState(null);
  const [mostrarImportador, setMostrarImportador] = useState(false);
  const importDialogRef = useRef(null);

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

  // Lista única de equipos presentes en la sesión
  const listaEquipos = React.useMemo(() => {
    const s = new Set();
    paises.forEach(p => {
      if (p.equipo && p.equipo.trim()) s.add(p.equipo.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
  }, [paises]);

  // Filtrado
  const paisesFiltrados = React.useMemo(() => {
    return paises.filter(p => {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto = !q || p.nombre.toLowerCase().includes(q) || (p.equipo && p.equipo.toLowerCase().includes(q));
      if (!coincideTexto) return false;

      if (filtroEstatus === 'VETO' && !p.veto) return false;
      if (filtroEstatus !== 'TODOS' && filtroEstatus !== 'VETO' && p.estatus !== filtroEstatus) return false;

      if (filtroEquipo !== 'TODOS' && (p.equipo || '').trim() !== filtroEquipo) return false;

      return true;
    });
  }, [paises, busqueda, filtroEstatus, filtroEquipo]);

  const renderPaisItem = (p, index) => {
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <div className="attendance-row"
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
          backgroundColor: isDragging ? 'var(--info-soft)' : 'transparent',
          border: isDragOver ? '2px dashed var(--info-color)' : '1px solid transparent',
          borderBottom: '1px solid var(--subborder-color)',
          borderRadius: '6px',
          fontSize: '0.82rem',
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        {/* Lado Izquierdo: Drag + Bandera + Nombre + Veto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GripVertical size={13} style={{ color: '#71717a', cursor: 'grab', flexShrink: 0 }} title={t('ui.dragToReorderCountry')} />
          
          {/* Bandera con click para editar */}
          <div
            onClick={() => setPaisAEditar(p)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title={t('ui.clickToChangeFlagOrImage')}
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
            title={t('ui.clickToEditDelegation')}
          >
            {p.nombre}
          </span>
          {/* Badge de Equipo / Colegio (exclusivo para Matriz e Info de Chairs) */}
          {p.equipo && (
            <span
              title={`${t('editCountry.team', 'Equipo / Colegio')}: ${p.equipo}`}
              style={{
                fontSize: '0.68rem',
                padding: '0.12rem 0.45rem',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-color)',
                border: '1px solid var(--accent-soft)',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                maxWidth: '130px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <Users size={11} />
              {p.equipo}
            </span>
          )}

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
            title={p.veto ? t('ui.hasVetoPowerP5') : t('ui.noVetoPower')}
          >
            <Crown size={14} color={p.veto ? 'var(--warning-color)' : '#888888'} fill={p.veto ? 'var(--warning-color)' : 'none'} />
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
            title={t('ui.editNameOrFlag')}
          >
            <Edit2 size={12} />
          </button>
        </div>

        {/* Selector de Estatus Roll Call */}
        <div className="attendance-status" style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            aria-pressed={p.estatus === 'Presente'}
            onClick={() => cambiarEstatusPais(p.id, 'Presente')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: p.estatus === 'Presente' ? 'var(--success-soft)' : 'transparent',
              color: p.estatus === 'Presente' ? 'var(--success-color)' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {t('countries.present', 'Presente')}
          </button>

          <button
            aria-pressed={p.estatus === 'Presente y Votando'}
            onClick={() => cambiarEstatusPais(p.id, 'Presente y Votando')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: p.estatus === 'Presente y Votando' ? 'var(--info-soft)' : 'transparent',
              color: p.estatus === 'Presente y Votando' ? 'var(--info-color)' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {t('countries.presentAndVotingShort', 'P. y Votando')}
          </button>

          <button
            aria-pressed={p.estatus === 'Ausente'}
            onClick={() => cambiarEstatusPais(p.id, 'Ausente')}
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: p.estatus === 'Ausente' ? 'var(--danger-soft)' : 'transparent',
              color: p.estatus === 'Ausente' ? 'var(--danger-color)' : 'var(--muted-text)',
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
      position: 'relative',
      minHeight: 0,
      overflow: 'hidden'
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
      <div className="attendance-summary" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '0.5rem',
        padding: '0.3rem 0 1.25rem',
        backgroundColor: 'transparent',
        borderBottom: '1px solid var(--subborder-color)',
        borderRadius: '8px'
      }}>
        {/* Total Delegaciones */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.totalQuorum', 'Total Quórum')}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '650', color: 'var(--text-color)' }}>
              {totalAsistentes}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>/ {totalPaises} ({porcentajeAsistencia}%)</span>
          </div>
        </div>

        {/* Presentes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.present', 'Presentes')}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: '650', color: 'var(--text-color)' }}>
            {presentes}
          </span>
        </div>

        {/* Presentes y Votando */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.presentAndVotingShort', 'P. y Votando')}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: '650', color: 'var(--text-color)' }}>
            {presentesYVotando}
          </span>
        </div>

        {/* Ausentes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('countries.absent', 'Ausentes')}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: '650', color: 'var(--text-color)' }}>
            {ausentes}
          </span>
        </div>

        {/* Mayorías Calculadas */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('voting.majorityRequired', 'Mayorías (Simp / 2/3)')}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '650', color: 'var(--text-color)' }} title={t('ui.simpleMajority')}>
              {mayoriaSimple}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>|</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '650', color: 'var(--text-color)' }} title={t('ui.qualifiedMajority23')}>
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
        <div className="mobile-wrap attendance-filters" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: '1 1 280px' }}>
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
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)'
              }}
            />
          </div>

          <select
            aria-label={t('countries.attendance', 'Asistencia')}
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
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
          {listaEquipos.length > 0 && (
            <select
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                cursor: 'pointer'
              }}
              title={t('ui.filterByTeam', 'Filtrar por Equipo / Institución')}
            >
              <option value="TODOS">{t('ui.allTeams', 'Todos los equipos')} ({listaEquipos.length})</option>
              {listaEquipos.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          )}
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
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title={t('ui.sortAlphabeticallyAZ')}
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
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--danger-color)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title={t('ui.markEveryoneAbsentToStartANewSession')}
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
              backgroundColor: modoRollCall ? 'var(--danger-solid)' : 'var(--btn-bg)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
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
          border: '2px solid var(--info-color)',
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
              <UserCheck size={15} color={rondaRollCall === 2 ? 'var(--warning-color)' : 'var(--info-color)'} />
              <span style={{ fontWeight: '800', fontSize: '0.82rem', color: rondaRollCall === 2 ? 'var(--warning-color)' : 'var(--info-color)' }}>
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
                    {t('countries.currentStatus', 'Estatus actual')}: {t(`sessionValues.${paisActualRollCall.estatus}`, paisActualRollCall.estatus)}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={16} color="var(--warning-color)" fill="var(--warning-color)" title={t('voting.vetoP5')} />}
                  </div>
                </div>
              </div>

              {/* Botones de Asistencia Roll Call */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={() => registrarYAvanzarRollCall('Presente')}
                  style={{
                    backgroundColor: 'var(--success-solid)',
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
                    backgroundColor: 'var(--info-solid)',
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
                    backgroundColor: 'var(--danger-solid)',
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
            <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--success-color)', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
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
            title={totalPaises === 0 ? t('countries.noDelegationsLoaded', 'No hay delegaciones cargadas') : t('countries.noMatchFound', 'Sin coincidencias')}
            description={totalPaises === 0 ? t('countries.importBelow', 'Usa «Añadir países» para empezar.') : t('countries.filterHelp', 'Prueba con otro término de búsqueda o limpia el filtro de estatus.')}
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
            minHeight: 0,
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
      <button type="button" className="country-matrix-add" onClick={() => {
        setMostrarImportador(true);
        importDialogRef.current.showModal();
      }}>
        <Plus size={14} /> {t('countries.addCountries', 'Añadir países')}
      </button>
      <dialog ref={importDialogRef} className="country-import-dialog" aria-label={t('countries.addCountries', 'Añadir países')} onClose={() => setMostrarImportador(false)}>
        <div className="country-import-dialog-body">
          <button type="button" className="country-import-dialog-close" aria-label={t('common.close', 'Cerrar')} onClick={() => importDialogRef.current.close()}><X size={18} /></button>
          <div className="country-import-dialog-content">{mostrarImportador && <ImportarPaises />}</div>
        </div>
      </dialog>
    </div>
  );
};

export default MatrizPaises;
