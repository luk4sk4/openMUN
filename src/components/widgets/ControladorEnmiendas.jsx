import i18n from '../../languages/index.js';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FileSignature,
  Layers,
  BookOpen,
  Upload,
  Clock,
  Plus,
  Search,
  Filter,

  Inbox,
  AlertCircle,
  Loader2,
  Edit3,
  Check,
  X,
  RotateCcw,
  Trash2,
  Copy,
  Download,
  Vote,
  FilePlus,
  FileText
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  extraerTextoDeArchivo,
  descargarResolucionDocx,
  descargarResolucionPdf,
  descargarResolucionTxt
} from '../../utils/documentHandlers';
import {
  parsearResolucion,
  reconstruirTextoResolucion
} from '../../utils/resolutionUtils';

// Subcomponentes modulares optimizados
import CronometroEnmiendas from './CronometroEnmiendas';
import ArticuloItem from './enmiendas/ArticuloItem';
import EnmiendaCard from './enmiendas/EnmiendaCard';
import ProponerEnmiendaModal from './enmiendas/ProponerEnmiendaModal';
import ConfiguradorApartadosModal from './enmiendas/ConfiguradorApartadosModal';
import BuzonPropuestasModal from './enmiendas/BuzonPropuestasModal';
import VistaConsolidadaOficial from './enmiendas/VistaConsolidadaOficial';

// Plantilla de ejemplo de resolución MUN para pruebas y demostraciones


const ControladorEnmiendas = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const { addToast } = useToast();
  const {
    paises = [],
    enmiendasSesion = {},
    guardarResolucionEnmiendas,
    agregarEnmiendaResolucion,
    resolverEnmiendaResolucion,
    eliminarEnmiendaResolucion,
    configurarVotacion,
    resetearVotacion,
    registrarIntervencion
  } = useSession();

  // Integración P2P para propuestas telemáticas de delegados
  const {
    enmiendasPropuestas = [],
    eliminarEnmiendaPropuesta
  } = useP2P() || {};

  const {
    tituloProyecto = i18n.t('ui.draftResolutionARes791'),
    textoResolucion = '',
    articulos = [],
    enmiendas = []
  } = enmiendasSesion || {};

  // Pestañas principales: 'articulos' | 'consolidado' | 'importar'
  const [tabInterna, setTabInterna] = useState('articulos');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'pendiente' | 'aceptada' | 'rechazada'
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'adicion' | 'supresion' | 'modificacion'
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalProponerOpen, setModalProponerOpen] = useState(false);
  const [modalProponerArticuloId, setModalProponerArticuloId] = useState(null);
  const [modalProponerTextoOriginal, setModalProponerTextoOriginal] = useState('');
  const [modalConfigApartadosOpen, setModalConfigApartadosOpen] = useState(false);
  const [modalBuzonOpen, setModalBuzonOpen] = useState(false);
  const [modalNuevoArticuloOpen, setModalNuevoArticuloOpen] = useState(false);
  const [nuevoArticuloPrefijo, setNuevoArticuloPrefijo] = useState('');
  const [nuevoArticuloTexto, setNuevoArticuloTexto] = useState('');

  // Cronómetro embebido (cerrado por defecto ya que PanelEnmiendasVotacion lo incluye)
  const [cronometroVisible, setCronometroVisible] = useState(false);

  // Estados de importación / drag & drop
  const [rawInputTexto, setRawInputTexto] = useState(textoResolucion || '');
  const [rawInputTitulo, setRawInputTitulo] = useState(tituloProyecto || '');
  const [isDragging, setIsDragging] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState(null);
  const fileInputRef = useRef(null);

  // Toast de retroalimentación visual no invasivo
  // Toast de retroalimentación visual via ToastContext
  const showToast = useCallback((msg, type = 'info') => {
    addToast({ title: t('ui.amendmentsResolution'), message: msg, type });
  }, [addToast, t]);

  // Países asistentes para filtros y selectores
  const paisesAsistentes = useMemo(() => {
    return (paises || []).filter(p => p.estatus !== 'Ausente');
  }, [paises]);

  // Sincronizar artículos si existe texto pero aún no se estructuraron
  useEffect(() => {
    if (textoResolucion && (!articulos || articulos.length === 0)) {
      const parsed = parsearResolucion(textoResolucion);
      if (parsed && parsed.length > 0) {
        guardarResolucionEnmiendas({ articulos: parsed });
      }
    }
  }, [textoResolucion, articulos, guardarResolucionEnmiendas]);

  // Sincronizar inputs crudos con el estado global cuando cambia externamente
  useEffect(() => {
    if (textoResolucion && textoResolucion !== rawInputTexto) {
      setRawInputTexto(textoResolucion);
    }
  }, [textoResolucion]);

  useEffect(() => {
    if (tituloProyecto && tituloProyecto !== rawInputTitulo) {
      setRawInputTitulo(tituloProyecto);
    }
  }, [tituloProyecto]);

  // Artículos parseados actuales
  const articulosActuales = useMemo(() => {
    if (articulos && articulos.length > 0) return articulos;
    if (textoResolucion && textoResolucion.trim()) {
      return parsearResolucion(textoResolucion);
    }
    return [];
  }, [articulos, textoResolucion]);

  const articulosOperativos = useMemo(() => {
    return articulosActuales.filter(a => !a.esPreambulo);
  }, [articulosActuales]);

  const tienePreambulo = useMemo(() => {
    return articulosActuales.some(a => a.esPreambulo);
  }, [articulosActuales]);

  // Estadísticas globales
  const totalEnmiendas = enmiendas.length;
  const enmiendasPendientes = useMemo(
    () => enmiendas.filter(e => e.estado?.toLowerCase() === 'pendiente').length,
    [enmiendas]
  );
  const enmiendasAceptadas = useMemo(
    () => enmiendas.filter(e => e.estado?.toLowerCase() === 'aceptada').length,
    [enmiendas]
  );
  const enmiendasRechazadas = useMemo(
    () => enmiendas.filter(e => e.estado?.toLowerCase() === 'rechazada').length,
    [enmiendas]
  );

  // Enmiendas filtradas por estado, tipo y texto de búsqueda
  const enmiendasFiltradas = useMemo(() => {
    return enmiendas.filter(e => {
      if (filtroEstado !== 'todos' && e.estado?.toLowerCase() !== filtroEstado) return false;
      if (filtroTipo !== 'todos' && e.tipo?.toLowerCase() !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincidePais = e.paisProponente?.toLowerCase().includes(q);
        const coincideTexto = (e.textoPropuesto && e.textoPropuesto.toLowerCase().includes(q)) ||
                              (e.textoOriginal && e.textoOriginal.toLowerCase().includes(q));
        const coincideJust = e.justificacion && e.justificacion.toLowerCase().includes(q);
        if (!coincidePais && !coincideTexto && !coincideJust) return false;
      }
      return true;
    });
  }, [enmiendas, filtroEstado, filtroTipo, busqueda]);

  // Enmiendas generales / adiciones al final
  const enmiendasGeneralesOFinales = useMemo(() => {
    return enmiendasFiltradas.filter(e => {
      const artAsoc = articulosActuales.find(a => a.id === e.articuloId);
      return !e.articuloId || !artAsoc;
    });
  }, [enmiendasFiltradas, articulosActuales]);

  // Artículos filtrados por búsqueda
  const articulosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return articulosActuales;
    const q = busqueda.toLowerCase();
    return articulosActuales.filter(a => {
      const coincidePrefijo = a.prefijo && a.prefijo.toLowerCase().includes(q);
      const coincideTexto = a.texto && a.texto.toLowerCase().includes(q);
      const tieneEnmiendaCoincidente = enmiendasFiltradas.some(e => e.articuloId === a.id);
      return coincidePrefijo || coincideTexto || tieneEnmiendaCoincidente;
    });
  }, [articulosActuales, busqueda, enmiendasFiltradas]);

  // ── MANEJADORES DE ACCIÓN ──

  const handleOpenProponer = (artId = null, textoSeleccionado = '') => {
    setModalProponerArticuloId(artId);
    setModalProponerTextoOriginal(textoSeleccionado || '');
    setModalProponerOpen(true);
  };

  const handleCrearEnmienda = (nuevaEnmienda) => {
    agregarEnmiendaResolucion(nuevaEnmienda);
    showToast(t('ui.amendmentMotionFromRegistered', { v0: nuevaEnmienda.paisProponente || 'Delegación' }));
  };

  const handleResolverEnmienda = (id, nuevoEstado) => {
    resolverEnmiendaResolucion(id, nuevoEstado);
    showToast(
      nuevoEstado === 'aceptada'
        ? t('ui.amendmentAcceptedAndIncorporatedIntoTheText')
        : nuevoEstado === 'rechazada'
          ? t('ui.amendmentRejected2')
          : t('ui.amendmentDecisionResetToPending')
    );
  };

  const handleEliminarEnmienda = (id) => {
    eliminarEnmiendaResolucion(id);
    showToast(t('ui.amendmentDeleted'));
  };

  const handleVotarEnmienda = (enmienda) => {
    const tipoBadge = enmienda.tipo === 'adicion'
      ? i18n.t('ui.addition2')
      : enmienda.tipo === 'supresion'
        ? i18n.t('ui.deletion2')
        : i18n.t('ui.modification2');

    const asuntoVoto = t('ui.amendmentSubject', { type: tipoBadge, article: enmienda.articuloNumero || 'Art.', country: enmienda.paisProponente });

    configurarVotacion({
      asunto: asuntoVoto,
      tipoVotacion: 'substantive',
      tipoMayoria: 'simple',
      aplicarVeto: true
    });
    resetearVotacion();
    showToast(t('ui.motionSentToVoting', { v0: asuntoVoto }));
  };

  const handleAprobarPropuestaDelegado = (prop) => {
    agregarEnmiendaResolucion({
      tipo: prop.tipo || 'modificacion',
      articuloId: prop.articuloId || null,
      articuloNumero: prop.articuloNumero || i18n.t('ui.article4'),
      paisProponente: prop.paisProponente || 'Delegación',
      textoOriginal: prop.textoOriginal || '',
      textoPropuesto: prop.textoPropuesto || '',
      justificacion: prop.justificacion || ''
    });
    if (eliminarEnmiendaPropuesta) {
      eliminarEnmiendaPropuesta(prop.id);
    }
    showToast(`Propuesta de ${prop.paisProponente || 'Delegado'} aprobada e incorporada`);
  };

  const handleEditarArticulo = (artId, prefijo, texto) => {
    const updated = articulosActuales.map(a => {
      if (a.id !== artId) return a;
      return {
        ...a,
        prefijo: prefijo.trim() || a.prefijo,
        texto: texto.trim(),
        modificado: true
      };
    });
    const nuevoTexto = reconstruirTextoResolucion(updated);
    guardarResolucionEnmiendas({
      articulos: updated,
      texto: nuevoTexto
    });
    showToast(t('ui.clauseUpdatedSuccessfully'));
  };

  const handleEliminarArticulo = (artId) => {
    const updated = articulosActuales.filter(a => a.id !== artId);
    const nuevoTexto = reconstruirTextoResolucion(updated);
    guardarResolucionEnmiendas({
      articulos: updated,
      texto: nuevoTexto
    });
    showToast(t('ui.sectionDeletedFromResolution'));
  };

  const handleGuardarNuevoArticulo = (e) => {
    e.preventDefault();
    if (!nuevoArticuloTexto.trim()) return;
    const num = articulosOperativos.length + 1;
    const nuevo = {
      id: `art_${Date.now()}_nuevo`,
      numero: num,
      prefijo: nuevoArticuloPrefijo.trim() || t('ui.article2', { v0: num }),
      texto: nuevoArticuloTexto.trim(),
      modificado: true
    };
    const updated = [...articulosActuales, nuevo];
    const nuevoTexto = reconstruirTextoResolucion(updated);
    guardarResolucionEnmiendas({
      articulos: updated,
      texto: nuevoTexto
    });
    setModalNuevoArticuloOpen(false);
    setNuevoArticuloTexto('');
    setNuevoArticuloPrefijo('');
    showToast(t('ui.articleAddedToTheResolution', { v0: num }));
  };

  const handleGuardarApartadosManuales = (apartadosNormalizados, textoReconstruido) => {
    guardarResolucionEnmiendas({
      titulo: rawInputTitulo.trim() || i18n.t('ui.draftResolution'),
      texto: textoReconstruido,
      articulos: apartadosNormalizados
    });
    setRawInputTexto(textoReconstruido);
    showToast(t('ui.sectionStructureReconfiguredSuccessfully'));
  };

  // Cargar borrador de ejemplo
  const handleCargarEjemplo = () => {
    const parsed = parsearResolucion(t('samples.resolution'));
    guardarResolucionEnmiendas({
      titulo: i18n.t('ui.draftResolutionARes79L4'),
      texto: t('samples.resolution'),
      articulos: parsed
    });
    setRawInputTexto(t('samples.resolution'));
    setRawInputTitulo(i18n.t('ui.draftResolutionARes79L4'));
    setTabInterna('articulos');
    showToast(t('ui.sampleResolutionLoaded'));
  };

  // Guardar texto pegado
  const handleGuardarTextoPegado = (e) => {
    e.preventDefault();
    const parsed = parsearResolucion(rawInputTexto);
    guardarResolucionEnmiendas({
      titulo: rawInputTitulo.trim() || i18n.t('ui.draftResolution'),
      texto: rawInputTexto,
      articulos: parsed
    });
    setTabInterna('articulos');
    showToast(t('ui.resolutionProcessedAndSaved'));
  };

  // Procesamiento de archivos subidos (.docx, .pdf, .txt, .md)
  const procesarArchivoSubido = async (file) => {
    if (!file) return;
    setCargandoArchivo(true);
    setErrorArchivo(null);

    try {
      const { texto, nombre } = await extraerTextoDeArchivo(file);
      if (!texto || !texto.trim()) {
        throw new Error(t('ui.couldNotExtractFileTextOrTheDocumentIsEmpty'));
      }

      const parsed = parsearResolucion(texto);
      const tituloFinal = nombre || i18n.t('ui.draftResolution');

      guardarResolucionEnmiendas({
        titulo: tituloFinal,
        texto: texto,
        articulos: parsed
      });

      setRawInputTexto(texto);
      setRawInputTitulo(tituloFinal);
      setTabInterna('articulos');
      showToast(`Archivo "${file.name}" cargado y parseado`);
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      const msg = err.message || i18n.t('ui.errorProcessingTheSelectedFile');
      setErrorArchivo(msg);
      alert(t('ui.errorProcessingFile2', { v0: msg }));
    } finally {
      setCargandoArchivo(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await procesarArchivoSubido(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await procesarArchivoSubido(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--panel-color)',
        color: 'var(--text-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >


      {/* ── OVERLAY DE DRAG & DROP ── */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '3px dashed var(--accent-color)',
          borderRadius: '8px',
          zIndex: 180,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          gap: '0.75rem',
          pointerEvents: 'none'
        }}>
          <div style={{
            backgroundColor: 'var(--accent-soft)',
            padding: '1.25rem',
            borderRadius: '50%',
            color: 'var(--accent-color)'
          }}>
            <Upload size={40} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>
            {t('ui.dropTheResolutionFileHere')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>
            {t('ui.supportedFormatsWordDocxPdfPdfAndTextTxtMd')}
          </div>
        </div>
      )}

      {/* ── OVERLAY DE CARGA Y PARSEO DE ARCHIVOS ── */}
      {cargandoArchivo && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          borderRadius: '8px',
          zIndex: 180,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)',
          gap: '0.75rem'
        }}>
          <Loader2 size={36} color="var(--accent-color)" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
            {t('ui.analyzingAndStructuringDocument')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
            {t('ui.detectingPreambulatoryClausesAndOperativeArticles')}
          </div>
        </div>
      )}

      {/* ── HEADER DEL CONTROLADOR DE ENMIENDAS ── */}
      <div style={{
        padding: '0.6rem 0.85rem',
        paddingRight: '65px',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexShrink: 0
      }}>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: '650',
            color: 'var(--text-color)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {tituloProyecto || t('ui.amendmentResolutionController')}
          </div>
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: '700' }}>
              {articulosOperativos.length} {articulosOperativos.length === 1 ? t('ui.article') : t('ui.articles')}
              {tienePreambulo && t('ui.preamble')}
            </span>
            <span>•</span>
            <span style={{ color: 'var(--warning-color)', fontWeight: '700' }}>{enmiendasPendientes} {t('ui.pending')}</span>
            <span>•</span>
            <span style={{ color: 'var(--success-color)', fontWeight: '700' }}>{enmiendasAceptadas} {t('ui.accepted')}</span>
            {enmiendasRechazadas > 0 && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--danger-color)', fontWeight: '700' }}>{enmiendasRechazadas} {t('ui.rejected')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── BARRA DE PESTAÑAS Y HERRAMIENTAS ── */}
      <div style={{
        padding: '0.4rem 0.75rem',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--panel-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {/* Pestañas de navegación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button
            onClick={() => setTabInterna('articulos')}
            style={{
              background: tabInterna === 'articulos' ? 'var(--btn-bg)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              color: tabInterna === 'articulos' ? 'var(--btn-text)' : 'var(--muted-text)',
              border: '1px solid var(--subborder-color)',
              borderRadius: '5px',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Layers size={13} />
            <span>{t('ui.byArticle')}</span>
          </button>

          <button
            onClick={() => setTabInterna('consolidado')}
            style={{
              background: tabInterna === 'consolidado' ? 'var(--btn-bg)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              color: tabInterna === 'consolidado' ? 'var(--btn-text)' : 'var(--muted-text)',
              border: '1px solid var(--subborder-color)',
              borderRadius: '5px',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <BookOpen size={13} />
            <span>{t('ui.consolidatedDocument')}</span>
          </button>

          <button
            onClick={() => setTabInterna('importar')}
            title={t('ui.importOrPasteResolution')}
            style={{
              background: tabInterna === 'importar' ? 'var(--btn-bg)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              color: tabInterna === 'importar' ? 'var(--btn-text)' : 'var(--muted-text)',
              border: '1px solid var(--subborder-color)',
              borderRadius: '5px',
              padding: '0.3rem 0.55rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: '600'
            }}
          >
            <Upload size={13} />
            <span>{t('ui.loadPaste')}</span>
          </button>
        </div>

        {/* Acciones de Buzón P2P y Cronómetro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {enmiendasPropuestas.length > 0 && (
            <button
              onClick={() => setModalBuzonOpen(true)}
              style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-color)',
                color: 'var(--accent-color)',
                borderRadius: '5px',
                padding: '0.3rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                animation: 'pulse 2s infinite'
              }}
            >
              <Inbox size={13} />
              <span>{t('ui.delegateInbox')}{enmiendasPropuestas.length})</span>
            </button>
          )}

          <button
            onClick={() => setCronometroVisible(v => !v)}
            style={{
              background: cronometroVisible ? 'var(--accent-soft)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              border: `1px solid ${cronometroVisible ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
              color: cronometroVisible ? 'var(--accent-color)' : 'var(--muted-text)',
              borderRadius: '5px',
              padding: '0.3rem 0.55rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title={t('ui.showHideContributionTimer')}
          >
            <Clock size={13} />
            <span>{t('timers.title')}</span>
          </button>
        </div>
      </div>

      {/* ── CRONÓMETRO MODULAR INTEGRADO ── */}
      {cronometroVisible && (
        <CronometroEnmiendas
          compact
          paisesAsistentes={paisesAsistentes}
          paises={paises}
          onGuardarIntervencion={registrarIntervencion}
        />
      )}

      {/* ── CUERPO PRINCIPAL DEL WIDGET ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {articulosActuales.length === 0 && tabInterna !== 'importar' ? (
          /* ── ESTADO VACÍO: INVITACIÓN A CARGAR RESOLUCIÓN ── */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            padding: '1.5rem 1rem',
            color: 'var(--muted-text)',
            gap: '1rem'
          }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                maxWidth: '460px',
                border: '2px dashed var(--subborder-color)',
                borderRadius: '12px',
                padding: '1.75rem 1.25rem',
                backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                backgroundColor: 'var(--accent-soft)',
                padding: '0.9rem',
                borderRadius: '50%',
                color: 'var(--accent-color)'
              }}>
                <Upload size={32} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-color)', marginBottom: '0.25rem' }}>
                  {t('ui.dropOrSelectAResolutionFile')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', lineHeight: 1.4 }}>
                  {t('ui.supportsWordDocxPdfPdfAndTextTxtMdDocuments')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: 'var(--accent-soft)', color: 'var(--btn-bg)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  Word (.docx)
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: 'var(--danger-soft)', color: 'var(--danger-color)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  PDF (.pdf)
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: '600', backgroundColor: 'var(--panel-color)', border: '1px solid var(--subborder-color)', color: 'var(--muted-text)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  TXT / Markdown
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleCargarEjemplo}
                style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontWeight: '700',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <FileText size={14} /> {t('ui.loadSampleResolution')}
              </button>

              <button
                onClick={() => setTabInterna('importar')}
                style={{
                  backgroundColor: 'var(--card-hover, rgba(255,255,255,0.05))',
                  border: '1px solid var(--subborder-color)',
                  color: 'var(--text-color)',
                  fontWeight: '700',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Edit3 size={14} /> {t('ui.pasteTextManually')}
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.doc,.pdf,.txt,.md,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              style={{ display: 'none' }}
            />
          </div>
        ) : tabInterna === 'articulos' ? (
          /* ── VISTA POR ARTÍCULOS Y ENMIENDAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Barra de Filtros, Búsqueda y Botones de Acción */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem',
              flexWrap: 'wrap',
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--subborder-color)'
            }}>
              {/* Búsqueda y Filtros */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: 'var(--panel-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '4px',
                  padding: '0.15rem 0.4rem',
                  width: '150px'
                }}>
                  <Search size={12} color="var(--muted-text)" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder={t('ui.filter')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-color)',
                      fontSize: '0.72rem',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Filter size={12} color="var(--muted-text)" />
                  <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                    style={{
                      backgroundColor: 'var(--panel-bg)',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--text-color)',
                      borderRadius: '4px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.72rem',
                      outline: 'none'
                    }}
                  >
                    <option value="todos">{t('ui.all')}{totalEnmiendas})</option>
                    <option value="pendiente">{t('ui.pending2')}{enmiendasPendientes})</option>
                    <option value="aceptada">{t('ui.accepted2')}{enmiendasAceptadas})</option>
                    <option value="rechazada">{t('ui.rejected2')}{enmiendasRechazadas})</option>
                  </select>
                </div>
              </div>

              {/* Botones de configuración, añadir cláusula y proponer */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setModalConfigApartadosOpen(true)}
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-soft)',
                    color: 'var(--accent-color)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title={t('ui.configureAndReclassifySectionsManually')}
                >
                  <Layers size={13} />
                  <span>{t('ui.adjustSections')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextNum = articulosOperativos.length + 1;
                    setNuevoArticuloPrefijo(t('ui.article2', { v0: nextNum }));
                    setNuevoArticuloTexto('');
                    setModalNuevoArticuloOpen(true);
                  }}
                  style={{
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Plus size={13} />
                  <span>{t('ui.addClause2')}</span>
                </button>

                <button
                  onClick={() => handleOpenProponer(null)}
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-soft)',
                    color: 'var(--accent-color)',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <FilePlus size={13} />
                  <span>{t('ui.proposeAmendment')}</span>
                </button>
              </div>
            </div>

            {/* Listado de Artículos */}
            {articulosFiltrados.map(art => {
              const enmiendasArticulo = enmiendasFiltradas.filter(e => e.articuloId === art.id);

              return (
                <ArticuloItem
                  key={art.id}
                  art={art}
                  enmiendas={enmiendasArticulo}
                  paises={paises}
                  onProponerEnmienda={handleOpenProponer}
                  onEditarArticulo={handleEditarArticulo}
                  onEliminarArticulo={handleEliminarArticulo}
                  onVotarEnmienda={handleVotarEnmienda}
                  onResolverEnmienda={handleResolverEnmienda}
                  onEliminarEnmienda={handleEliminarEnmienda}
                  isLight={isLight}
                />
              );
            })}

            {/* Enmiendas Generales / Adiciones al Final */}
            {enmiendasGeneralesOFinales.length > 0 && (
              <div style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px dashed var(--accent-soft)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                  <FilePlus size={14} />
                  <span>{t('ui.newArticlesAndGeneralAmendmentsAtTheEnd')}{enmiendasGeneralesOFinales.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {enmiendasGeneralesOFinales.map(enm => (
                    <EnmiendaCard
                      key={enm.id}
                      enm={enm}
                      paises={paises}
                      onVotar={handleVotarEnmienda}
                      onResolver={handleResolverEnmienda}
                      onEliminar={handleEliminarEnmienda}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tabInterna === 'consolidado' ? (
          /* ── VISTA CONSOLIDADA OFICIAL MUN ── */
          <VistaConsolidadaOficial
            titulo={tituloProyecto}
            articulos={articulosActuales}
            textoResolucion={textoResolucion}
            isLight={isLight}
            onShowToast={showToast}
          />
        ) : (
          /* ── VISTA DE IMPORTACIÓN Y PEGADO CON DROPZONE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{t('ui.loadDraftResolution')}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
              {t('ui.dropAWordDocxOrPdfPdfFileOrPaste')}
            </div>

            {/* Dropzone interactivo */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--subborder-color)',
                borderRadius: '8px',
                padding: '1.25rem 1rem',
                backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{
                backgroundColor: 'var(--accent-soft)',
                padding: '0.6rem',
                borderRadius: '50%',
                color: 'var(--accent-color)'
              }}>
                <Upload size={22} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
                {t('ui.clickOrDropYourWordDocxPdfPdfOrText')}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                {t('ui.articlesAndClausesWillBeStructuredAutomatically')}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.doc,.pdf,.txt,.md,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              style={{ display: 'none' }}
            />

            {/* Formulario de pegado manual */}
            <form onSubmit={handleGuardarTextoPegado} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  {t('ui.draftResolutionTitle')}
                </label>
                <input
                  type="text"
                  value={rawInputTitulo}
                  onChange={e => setRawInputTitulo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: isLight ? '#ffffff' : '#1e293b',
                    border: `1px solid ${isLight ? 'var(--subborder-color)' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  placeholder={t('ui.eGDraftResolutionARes79L2')}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  {t('ui.fullDraftText')}
                </label>
                <textarea
                  value={rawInputTexto}
                  onChange={e => setRawInputTexto(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: isLight ? '#ffffff' : '#1e293b',
                    border: `1px solid ${isLight ? 'var(--subborder-color)' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder={t('ui.pasteTheResolutionContentHere')}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCargarEjemplo}
                  style={{
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('ui.useExample')}
                </button>

                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    color: 'var(--btn-text)',
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Check size={13} />
                  <span>{t('ui.processAndSave')}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── MODAL: PROPONER ENMIENDA ── */}
      <ProponerEnmiendaModal
        isOpen={modalProponerOpen}
        onClose={() => setModalProponerOpen(false)}
        onSubmit={handleCrearEnmienda}
        articulos={articulosActuales}
        paisesAsistentes={paisesAsistentes}
        paises={paises}
        initialArticuloId={modalProponerArticuloId}
        initialTextoOriginal={modalProponerTextoOriginal}
        isLight={isLight}
      />

      {/* ── MODAL: CONFIGURAR APARTADOS MANUALMENTE ── */}
      <ConfiguradorApartadosModal
        isOpen={modalConfigApartadosOpen}
        onClose={() => setModalConfigApartadosOpen(false)}
        articulos={articulosActuales}
        tituloResolucion={tituloProyecto}
        onGuardar={handleGuardarApartadosManuales}
        isLight={isLight}
      />

      {/* ── MODAL: BUZÓN TELEMÁTICO DE DELEGADOS (P2P) ── */}
      <BuzonPropuestasModal
        isOpen={modalBuzonOpen}
        onClose={() => setModalBuzonOpen(false)}
        propuestas={enmiendasPropuestas}
        paises={paises}
        onAprobarPropuesta={handleAprobarPropuestaDelegado}
        onRechazarPropuesta={eliminarEnmiendaPropuesta}
      />

      {/* ── MODAL: AÑADIR NUEVA CLÁUSULA DIRECTAMENTE ── */}
      {modalNuevoArticuloOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '12px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 20px 48px rgba(0,0,0,0.65)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '800' }}>
                <Plus size={16} style={{ color: 'var(--accent-color)' }} />
                <span>{t('ui.addNewClauseToResolution')}</span>
              </div>
              <button
                onClick={() => setModalNuevoArticuloOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoArticulo} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  {t('ui.clausePrefixNumbering')}
                </label>
                <input
                  type="text"
                  value={nuevoArticuloPrefijo}
                  onChange={e => setNuevoArticuloPrefijo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: isLight ? '#ffffff' : '#1e293b',
                    border: `1px solid ${isLight ? 'var(--subborder-color)' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                  placeholder={t('ui.eGArticle5OrClause5')}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  {t('ui.operativeClauseText')}
                </label>
                <textarea
                  value={nuevoArticuloTexto}
                  onChange={e => setNuevoArticuloTexto(e.target.value)}
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: isLight ? '#ffffff' : '#1e293b',
                    border: `1px solid ${isLight ? 'var(--subborder-color)' : '#334155'}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder={t('ui.writeTheNewClauseText')}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevoArticuloOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('toast.cancelBtn')}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {t('ui.addClause2')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControladorEnmiendas;
