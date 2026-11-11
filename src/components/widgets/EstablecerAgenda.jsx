import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, MessageSquare, Play, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import { resolverDebateAgenda, segundosRestantes } from '../../utils/agendaDebate';
import DebateAgendaModal from '../modals/DebateAgendaModal';
import './EstablecerAgenda.css';

const ESTADOS = ['Pendiente', 'En Discusión', 'Pausado', 'Concluido'];

const EstablecerAgenda = () => {
  const { t } = useTranslation();
  const {
    nombreComite,
    setNombreComite,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual,
    irASiguienteTema,
    dispararCelebracionVoto,
    paises
  } = useSession();
  const [comite, setComite] = useState(nombreComite || '');
  const [nuevoTema, setNuevoTema] = useState('');
  const [ahora, setAhora] = useState(Date.now());
  const [modalTemaId, setModalTemaId] = useState(null);

  const temas = agendaSesion.temasPropuestos || [];
  const presentes = paises.filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  const hayReloj = temas.some(item => item.debate?.reloj?.fin && item.debate.fase === 'debate');

  useEffect(() => { setComite(nombreComite || ''); }, [nombreComite]);

  useEffect(() => {
    if (!hayReloj) return;
    const timer = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(timer);
  }, [hayReloj]);

  const guardar = (lista, actual = agendaSesion.temaActual || '') => establecerAgenda(actual, lista);

  const actualizarTema = (id, cambios) => guardar(temas.map(item => item.id === id ? { ...item, ...cambios } : item));

  const actualizarDebate = (item, cambios) => {
    actualizarTema(item.id, { debate: { ...item.debate, ...cambios } });
  };

  const agregarTema = e => {
    e.preventDefault();
    if (!nuevoTema.trim()) return;
    guardar([...temas, { id: crypto.randomUUID(), titulo: nuevoTema.trim(), estado: 'Pendiente' }]);
    setNuevoTema('');
  };

  const mover = (index, desplazamiento) => {
    const lista = [...temas];
    const destino = index + desplazamiento;
    if (destino < 0 || destino >= lista.length) return;
    [lista[index], lista[destino]] = [lista[destino], lista[index]];
    guardar(lista);
  };

  const cambiarEstado = (item, estado) => {
    const actual = estado === 'En Discusión' ? item.titulo : (agendaSesion.temaActual === item.titulo ? '' : agendaSesion.temaActual);
    guardar(temas.map(tema => tema.id === item.id ? { ...tema, estado }
      : (estado === 'En Discusión' && tema.estado === 'En Discusión' ? { ...tema, estado: 'Pendiente' } : tema)), actual);
  };

  const activarTema = (item) => {
    const lista = temas.map(tema => tema.id === item.id
      ? { ...tema, estado: tema.estado === 'Pendiente' ? 'En Discusión' : tema.estado }
      : (tema.estado === 'En Discusión' ? { ...tema, estado: 'Pendiente' } : tema)
    );
    guardar(lista, item.titulo);
    if (typeof cambiarTemaActual === 'function') {
      cambiarTemaActual(item.titulo);
    }
  };

  const desactivarTema = (item) => {
    guardar(temas, '');
    if (typeof cambiarTemaActual === 'function') {
      cambiarTemaActual('');
    }
  };

  const abrirDebate = (item) => {
    if (!item.debate || item.debate.fase === 'cancelado') {
      actualizarDebate(item, {
        fase: 'debate',
        turnos: item.debate?.turnos || [],
        duracion: item.debate?.duracion || 60,
        reloj: { restante: item.debate?.duracion || 60, fin: null },
        turnoActivo: null,
        favor: 0,
        contra: 0,
        resultado: null
      });
    }
    setModalTemaId(item.id);
  };

  const reiniciarDebate = (item) => {
    actualizarDebate(item, {
      fase: 'debate',
      turnos: [],
      duracion: 60,
      reloj: { restante: 60, fin: null },
      turnoActivo: null,
      favor: 0,
      contra: 0,
      resultado: null
    });
  };

  const cancelarDebate = (item) => {
    actualizarTema(item.id, { debate: null });
    setModalTemaId(null);
  };

  const resolverDebate = (item) => {
    const resultado = resolverDebateAgenda(agendaSesion, item.id);
    guardar(resultado.temasPropuestos, resultado.temaActual);
    const temaResuelto = (resultado.temasPropuestos || []).find(tItem => tItem.id === item.id);
    if (typeof dispararCelebracionVoto === 'function') {
      dispararCelebracionVoto(temaResuelto?.debate?.resultado === 'aprobado');
    }
  };

  const handleIrASiguienteTemaDesdeModal = () => {
    if (typeof irASiguienteTema === 'function') {
      irASiguienteTema();
    }
    setModalTemaId(null);
  };

  const temaEnModal = temas.find(t => t.id === modalTemaId);

  return (
    <div className="agenda-widget">
      <label className="agenda-heading">
        {t('agenda.committeeName')}
        <input
          value={comite}
          placeholder={t('agenda.committeePlaceholder')}
          onChange={e => setComite(e.target.value)}
          onBlur={() => setNombreComite(comite.trim())}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </label>

      <div className="agenda-heading">
        {t('agenda.agendaItems')} <span>{temas.length}</span>
      </div>

      <form className="agenda-inline" onSubmit={agregarTema}>
        <input
          aria-label={t('agenda.addTopic')}
          value={nuevoTema}
          onChange={e => setNuevoTema(e.target.value)}
          placeholder={t('agenda.newTopicPlaceholder')}
        />
        <button disabled={!nuevoTema.trim()}>
          <Plus size={14} />{t('common.add', 'Añadir')}
        </button>
      </form>

      {!temas.length && <p className="agenda-muted">{t('agenda.noTopics')}</p>}

      {temas.map((item, index) => {
        const debate = item.debate;
        const abierto = debate?.fase === 'debate';
        const votando = debate?.fase === 'votacion';
        const activo = item.titulo === agendaSesion.temaActual;
        const restante = debate?.reloj ? segundosRestantes(debate.reloj, ahora) : 0;

        return (
          <section key={item.id} className={`agenda-topic${activo ? ' agenda-topic-active' : ''}`}>
            {/* Fila 1: Título y controles de orden / borrado */}
            <div className="agenda-inline">
              <span className="agenda-number">{index + 1}.</span>
              <input
                className="agenda-topic-title"
                aria-label={t('agenda.pointTitle')}
                defaultValue={item.titulo}
                key={`${item.id}-${item.titulo}`}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onBlur={e => {
                  const titulo = e.target.value.trim();
                  if (!titulo) { e.target.value = item.titulo; return; }
                  if (titulo !== item.titulo) {
                    guardar(
                      temas.map(tema => tema.id === item.id ? { ...tema, titulo } : tema),
                      activo ? titulo : agendaSesion.temaActual
                    );
                  }
                }}
              />
              <button
                type="button"
                className="agenda-btn-icon"
                disabled={index === 0}
                onClick={() => mover(index, -1)}
                aria-label={t('agenda.moveUp')}
                title={t('agenda.moveUp')}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="agenda-btn-icon"
                disabled={index === temas.length - 1}
                onClick={() => mover(index, 1)}
                aria-label={t('agenda.moveDown')}
                title={t('agenda.moveDown')}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className="agenda-btn-icon agenda-btn-delete"
                aria-label={t('agenda.deletePoint')}
                title={t('agenda.deletePoint')}
                onClick={() => guardar(temas.filter(tema => tema.id !== item.id), activo ? '' : agendaSesion.temaActual)}
              >
                <X size={14} />
              </button>
            </div>

            {/* Fila 2: Selector de estado + Botón Activar + Botón de Debate + Badge de Resultado */}
            <div className="agenda-inline agenda-wrap">
              <select
                aria-label={t('agenda.pointStatus')}
                value={item.estado || 'Pendiente'}
                onChange={e => cambiarEstado(item, e.target.value)}
              >
                {ESTADOS.map((estado, i) => (
                  <option key={estado} value={estado}>
                    {t(`agenda.${['pending', 'discussion', 'paused', 'completed'][i]}`)}
                  </option>
                ))}
              </select>

              {/* Botón Activar / Activo */}
              {activo ? (
                <button
                  type="button"
                  className="agenda-btn-active is-active"
                  onClick={() => desactivarTema(item)}
                  title={t('agenda.activeTopic', 'Tema activo en la sesión (clic para desactivar)')}
                  aria-pressed="true"
                >
                  <Check size={13} />
                  {t('agenda.active', 'Activo')}
                </button>
              ) : (
                <button
                  type="button"
                  className="agenda-btn-active"
                  onClick={() => activarTema(item)}
                  title={t('agenda.activateTopic', 'Fijar como tema activo en la sesión')}
                  aria-pressed="false"
                >
                  <Play size={13} />
                  {t('agenda.activate', 'Activar')}
                </button>
              )}

              {/* Botón de Debate (abre el Modal) */}
              <button
                type="button"
                className={`agenda-btn-debate ${abierto || votando ? 'in-debate' : ''}`}
                onClick={() => abrirDebate(item)}
              >
                <MessageSquare size={14} />
                {debate?.fase === 'debate'
                  ? `${t('agenda.inDebate', 'En debate')} (${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')})`
                  : debate?.fase === 'votacion'
                    ? t('agenda.votingInCourse', 'En votación...')
                    : debate
                      ? t('agenda.continueDebate', 'Ver debate')
                      : t('agenda.generateDebate', 'Debatir')}
              </button>

              {/* Badge de Resultado si ya se votó */}
              {debate?.fase === 'resultado' && (
                <strong
                  role="status"
                  className={`agenda-badge ${debate.resultado === 'aprobado' ? 'agenda-approved' : 'agenda-rejected'}`}
                >
                  {t(`agenda.${debate.resultado}`)} · {debate.favor} / {debate.contra}
                </strong>
              )}
            </div>
          </section>
        );
      })}

      {/* Modal de Debate de Agenda */}
      {temaEnModal && (
        <DebateAgendaModal
          isOpen={Boolean(modalTemaId)}
          onClose={() => setModalTemaId(null)}
          tema={temaEnModal}
          comiteNombre={comite || nombreComite}
          presentes={presentes}
          onActualizarDebate={(cambios) => actualizarDebate(temaEnModal, cambios)}
          onResolverDebate={() => resolverDebate(temaEnModal)}
          onReiniciarDebate={() => reiniciarDebate(temaEnModal)}
          onCancelarDebate={() => cancelarDebate(temaEnModal)}
          onIrASiguienteTema={temas.length > 1 ? handleIrASiguienteTemaDesdeModal : null}
        />
      )}
    </div>
  );
};

export { EstablecerAgenda };
export default EstablecerAgenda;
