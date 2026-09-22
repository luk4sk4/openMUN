import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Check,
  X,
  RotateCcw,
  Trash2,
  Copy,
  Download,
  Vote,
  Sparkles,
  FileSignature,
  Edit3,
  FilePlus,
  FileMinus,
  ArrowRight,
  Filter,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Volume2,
  Mic,
  Send,
  Inbox,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  FileDown,
  Scissors,
  Link2,
  ArrowUp,
  ArrowDown,
  Wand2
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import CountryFlag from '../common/CountryFlag';
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

// Plantilla de ejemplo de resolución MUN
const RESOLUCION_EJEMPLO = `# PROYECTO DE RESOLUCIÓN A/RES/79/L.4

**Comité:** Asamblea General - Primera Comisión (DISEC)  
**Tema:** Cooperación Internacional en la Prevención de Ciberamenazas y Seguridad Digital  
**Países Firmantes:** Francia, Brasil, Japón, Sudáfrica, Canadá  

---

### CLÁUSULAS PREAMBULATORIAS

*Reafirmando* los propósitos y principios consagrados en la Carta de las Naciones Unidas relativos al mantenimiento de la paz y seguridad internacional,

*Reconociendo* la creciente interdependencia de las infraestructuras críticas globales y su vulnerabilidad frente a ataques cibernéticos transfronterizos,

*Consciente* de la imperiosa necesidad de fortalecer las capacidades técnicas y de ciberdefensa en los Estados en desarrollo,

---

### CLÁUSULAS OPERATIVAS

**Artículo 1.** *Insta* a todos los Estados Miembros a adoptar directrices multilaterales vinculantes para la protección de infraestructuras críticas energéticas, financieras y hospitalarias contra ciberataques hostiles.

**Artículo 2.** *Propone* la creación de un Fondo Global de Asistencia Tecnológica y Ciberseguridad (FGATC), administrado bajo la supervisión de la Unión Internacional de Telecomunicaciones (UIT), financiado mediante contribuciones voluntarias de los Estados y el sector privado.

**Artículo 3.** *Exhorta* a la cooperación entre los equipos nacionales de respuesta a emergencias cibernéticas (CERT/CSIRT) para el intercambio ágil de información técnica sobre amenazas emergentes y vulnerabilidades críticas.

**Artículo 4.** *Solicita* al Secretario General que presente un informe exhaustivo en el octogésimo período de sesiones sobre los avances e implementación de mecanismos de fomento de la confianza en el ciberespacio.`;

const ControladorEnmiendas = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const {
    paises,
    enmiendasSesion,
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
    tituloProyecto = 'Proyecto de Resolución A/RES/79/1',
    textoResolucion = '',
    articulos = [],
    enmiendas = []
  } = enmiendasSesion || {};

  // Pestañas internas del widget: 'articulos' | 'consolidado' | 'importar'
  const [tabInterna, setTabInterna] = useState('articulos');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'pendiente' | 'aceptada' | 'rechazada'
  const [showBuzonDelegadosModal, setShowBuzonDelegadosModal] = useState(false);

  // Mini Cronómetro Integrado
  const [cronometroVisible, setCronometroVisible] = useState(true);
  const [cronometroPais, setCronometroPais] = useState('');
  const [cronometroSegundos, setCronometroSegundos] = useState(60);
  const [cronometroInicial, setCronometroInicial] = useState(60);
  const [cronometroCorriendo, setCronometroCorriendo] = useState(false);

  // Estado del modal de proponer enmienda
  const [modalProponerOpen, setModalProponerOpen] = useState(false);
  const [selectedArticuloId, setSelectedArticuloId] = useState(null);
  const [tipoEnmienda, setTipoEnmienda] = useState('modificacion'); // 'adicion' | 'supresion' | 'modificacion'
  const [paisProponente, setPaisProponente] = useState('');
  const [textoOriginal, setTextoOriginal] = useState('');
  const [textoPropuesto, setTextoPropuesto] = useState('');
  const [justificacion, setJustificacion] = useState('');

  // Estado del editor de importación / pegado
  const [rawInputTexto, setRawInputTexto] = useState(textoResolucion || '');
  const [rawInputTitulo, setRawInputTitulo] = useState(tituloProyecto || '');
  const [isDragging, setIsDragging] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState(null);
  const [descargandoFormato, setDescargandoFormato] = useState(null);
  const fileInputRef = useRef(null);
  const rawTextareaRef = useRef(null);

  // Estados del Editor / Segmentador Manual de Apartados
  const [modoEditorApartados, setModoEditorApartados] = useState(false);
  const [apartadosEditables, setApartadosEditables] = useState([]);
  const [textoSeleccionadoRaw, setTextoSeleccionadoRaw] = useState('');

  // Estados para edición directa de artículo en la pestaña 'articulos'
  const [editingArticuloId, setEditingArticuloId] = useState(null);
  const [editTextoArticulo, setEditTextoArticulo] = useState('');
  const [editPrefijoArticulo, setEditPrefijoArticulo] = useState('');

  // Estados para modal de añadir artículo directamente
  const [modalNuevoArticuloOpen, setModalNuevoArticuloOpen] = useState(false);
  const [nuevoArticuloPrefijo, setNuevoArticuloPrefijo] = useState('');
  const [nuevoArticuloTexto, setNuevoArticuloTexto] = useState('');

  // Países asistentes para el selector de proponentes y cronómetro
  const paisesAsistentes = useMemo(() => {
    return (paises || []).filter(p => p.estatus !== 'Ausente');
  }, [paises]);

  // Sincronizar artículos en SessionContext si textoResolucion existe pero articulos aún no se cargaron
  useEffect(() => {
    if (textoResolucion && (!articulos || articulos.length === 0)) {
      guardarResolucionEnmiendas({ articulos: parsearResolucion(textoResolucion) });
    }
  }, [textoResolucion, articulos, guardarResolucionEnmiendas]);

  // Estilos limpios y consistentes para selectores e inputs en modo claro y oscuro
  const inputBgColor = isLight ? '#ffffff' : '#1a1e2b';
  const inputBorderColor = isLight ? 'var(--subborder-color)' : '#334155';
  const optionBgColor = isLight ? '#ffffff' : '#1a1e2b';
  const optionTextColor = isLight ? '#0f172a' : '#f1f5f9';

  // Inicializar proponente y país de cronómetro por defecto
  useEffect(() => {
    if (paisesAsistentes.length > 0) {
      if (!paisProponente) setPaisProponente(paisesAsistentes[0].nombre);
      if (!cronometroPais) setCronometroPais(paisesAsistentes[0].nombre);
    }
  }, [paisesAsistentes, paisProponente, cronometroPais]);

  // Efecto del Cronómetro
  useEffect(() => {
    let interval = null;
    if (cronometroCorriendo) {
      interval = setInterval(() => {
        setCronometroSegundos(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cronometroCorriendo]);

  // Manejador para guardar intervención en el Histórico de Delegaciones
  const handleGuardarIntervencionCronometro = () => {
    if (!cronometroPais) return;
    const tiempoHablado = Math.max(1, cronometroInicial - Math.max(0, cronometroSegundos));
    const overtime = cronometroSegundos < 0 ? Math.abs(cronometroSegundos) : 0;

    if (registrarIntervencion) {
      registrarIntervencion(cronometroPais, cronometroInicial, tiempoHablado, overtime);
    }

    setCronometroCorriendo(false);
    setCronometroSegundos(cronometroInicial);
  };

  // Artículos parseados actuales o generados dinámicamente
  const articulosActuales = useMemo(() => {
    if (articulos && articulos.length > 0) return articulos;
    if (textoResolucion && textoResolucion.trim()) {
      return parsearResolucion(textoResolucion);
    }
    return [];
  }, [articulos, textoResolucion]);

  // Desglose de artículos operativos y preámbulo
  const articulosOperativos = useMemo(() => {
    return articulosActuales.filter(a => !a.esPreambulo);
  }, [articulosActuales]);

  const tienePreambulo = useMemo(() => {
    return articulosActuales.some(a => a.esPreambulo);
  }, [articulosActuales]);

  // Enmiendas que no corresponden a un artículo específico o son generales / adiciones al final
  const enmiendasGeneralesOFinales = useMemo(() => {
    return enmiendas.filter(e => {
      const artAsoc = articulosActuales.find(a => a.id === e.articuloId);
      const esGeneral = !e.articuloId || !artAsoc;
      if (!esGeneral) return false;
      if (filtroEstado !== 'todos' && e.estado?.toLowerCase() !== filtroEstado) return false;
      return true;
    });
  }, [enmiendas, articulosActuales, filtroEstado]);

  // Procesamiento unificado de archivos (.docx, .pdf, .txt, .md)
  const procesarArchivoSubido = async (file) => {
    if (!file) return;
    setCargandoArchivo(true);
    setErrorArchivo(null);

    try {
      const { texto, nombre } = await extraerTextoDeArchivo(file);
      if (!texto || !texto.trim()) {
        throw new Error('No se pudo extraer texto del archivo o el documento está vacío.');
      }

      const parsed = parsearResolucion(texto);
      const tituloFinal = nombre || 'Proyecto de Resolución';

      guardarResolucionEnmiendas({
        titulo: tituloFinal,
        texto: texto,
        articulos: parsed
      });

      setRawInputTexto(texto);
      setRawInputTitulo(tituloFinal);
      setTabInterna('articulos');
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      const msg = err.message || 'Error al procesar el archivo seleccionado.';
      setErrorArchivo(msg);
      alert(`Error al procesar el archivo: ${msg}`);
    } finally {
      setCargandoArchivo(false);
    }
  };

  // Manejador de evento input file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await procesarArchivoSubido(file);
    }
    e.target.value = '';
  };

  // Manejadores de Drag and Drop
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

  // Cargar borrador de ejemplo
  const handleCargarEjemplo = () => {
    const parsed = parsearResolucion(RESOLUCION_EJEMPLO);
    guardarResolucionEnmiendas({
      titulo: 'Proyecto de Resolución A/RES/79/L.4',
      texto: RESOLUCION_EJEMPLO,
      articulos: parsed
    });
    setRawInputTexto(RESOLUCION_EJEMPLO);
    setRawInputTitulo('Proyecto de Resolución A/RES/79/L.4');
    setTabInterna('articulos');
  };

  // Guardar texto pegado manualmente
  const handleGuardarTextoPegado = (e) => {
    e.preventDefault();
    const parsed = parsearResolucion(rawInputTexto);
    guardarResolucionEnmiendas({
      titulo: rawInputTitulo.trim() || 'Proyecto de Resolución',
      texto: rawInputTexto,
      articulos: parsed
    });
    setTabInterna('articulos');
  };

  // Activar editor manual de apartados desde el texto actual
  const handleAbrirEditorApartados = (textoAUsar = null, tituloAUsar = null) => {
    const texto = textoAUsar !== null ? textoAUsar : rawInputTexto;
    const titulo = tituloAUsar !== null ? tituloAUsar : rawInputTitulo;
    if (!texto || !texto.trim()) {
      alert('Pega o escribe texto antes de configurar los apartados.');
      return;
    }
    const parsed = parsearResolucion(texto);
    const adaptados = parsed.map((art, idx) => ({
      ...art,
      id: art.id || `manual_apartado_${Date.now()}_${idx}`
    }));
    setApartadosEditables(adaptados);
    setModoEditorApartados(true);
    if (titulo) setRawInputTitulo(titulo);
  };

  // Abrir editor manual desde la pestaña de artículos
  const handleAbrirEditorApartadosDesdeArticulos = () => {
    setApartadosEditables(articulosActuales.map(a => ({ ...a })));
    setModoEditorApartados(true);
    setTabInterna('importar');
  };

  // Cambiar tipo de apartado (Preámbulo vs Artículo Operativo)
  const handleToggleTipoApartado = (id) => {
    setApartadosEditables(prev => prev.map(ap => {
      if (ap.id !== id) return ap;
      const nuevoEsPreambulo = !ap.esPreambulo;
      return {
        ...ap,
        esPreambulo: nuevoEsPreambulo,
        prefijo: nuevoEsPreambulo ? 'Preámbulo / Antecedentes' : `Artículo ${ap.numero || 1}.`
      };
    }));
  };

  // Modificar prefijo o texto de un apartado en el editor manual
  const handleUpdateApartado = (id, campo, valor) => {
    setApartadosEditables(prev => prev.map(ap => {
      if (ap.id !== id) return ap;
      return { ...ap, [campo]: valor };
    }));
  };

  // Dividir un apartado en dos partes
  const handleDividirApartado = (id) => {
    setApartadosEditables(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx === -1) return prev;
      const actual = prev[idx];
      const lineas = actual.texto.split(/\n/);
      const mitad = Math.max(1, Math.floor(lineas.length / 2));
      const parte1 = lineas.slice(0, mitad).join('\n').trim();
      const parte2 = lineas.slice(mitad).join('\n').trim() || '[Nuevo fragmento]';

      const ap1 = { ...actual, texto: parte1 };
      const ap2 = {
        id: `manual_apartado_${Date.now()}_split`,
        esPreambulo: actual.esPreambulo,
        numero: (actual.numero || 1) + 1,
        prefijo: actual.esPreambulo ? 'Preámbulo / Antecedentes' : `Artículo ${(actual.numero || 1) + 1}.`,
        texto: parte2
      };

      const copia = [...prev];
      copia.splice(idx, 1, ap1, ap2);
      return copia;
    });
  };

  // Unir apartado con el siguiente
  const handleUnirConSiguiente = (index) => {
    setApartadosEditables(prev => {
      if (index >= prev.length - 1) return prev;
      const act = prev[index];
      const sig = prev[index + 1];
      const fusionado = {
        ...act,
        texto: `${act.texto.trim()}\n\n${sig.texto.trim()}`
      };
      const copia = [...prev];
      copia.splice(index, 2, fusionado);
      return copia;
    });
  };

  // Mover apartado arriba o abajo
  const handleMoverApartado = (index, direccion) => {
    setApartadosEditables(prev => {
      const target = index + direccion;
      if (target < 0 || target >= prev.length) return prev;
      const copia = [...prev];
      const [item] = copia.splice(index, 1);
      copia.splice(target, 0, item);
      return copia;
    });
  };

  // Eliminar apartado del editor manual
  const handleEliminarApartado = (id) => {
    setApartadosEditables(prev => prev.filter(a => a.id !== id));
  };

  // Añadir un nuevo apartado en blanco al final
  const handleAnadirApartadoEnBlanco = () => {
    const num = apartadosEditables.filter(a => !a.esPreambulo).length + 1;
    const nuevo = {
      id: `manual_apartado_${Date.now()}_nuevo`,
      esPreambulo: false,
      numero: num,
      prefijo: `Artículo ${num}.`,
      texto: ''
    };
    setApartadosEditables(prev => [...prev, nuevo]);
  };

  // Capturar selección de texto en el textarea raw para asignación manual
  const handleCapturarSeleccionRaw = () => {
    if (rawTextareaRef.current) {
      const start = rawTextareaRef.current.selectionStart;
      const end = rawTextareaRef.current.selectionEnd;
      const sel = rawInputTexto.substring(start, end).trim();
      if (sel) {
        setTextoSeleccionadoRaw(sel);
      }
    }
  };

  // Asignar texto seleccionado como Preámbulo o Artículo
  const handleAsignarSeleccion = (tipo = 'articulo') => {
    if (!textoSeleccionadoRaw.trim()) {
      alert('Primero selecciona con el ratón el fragmento de texto en el área de texto.');
      return;
    }
    const esPreambulo = tipo === 'preambulo';
    const num = apartadosEditables.filter(a => !a.esPreambulo).length + 1;
    const nuevo = {
      id: `manual_apartado_${Date.now()}_sel`,
      esPreambulo,
      numero: esPreambulo ? 0 : num,
      prefijo: esPreambulo ? 'Preámbulo / Antecedentes' : `Artículo ${num}.`,
      texto: textoSeleccionadoRaw.trim()
    };
    setApartadosEditables(prev => [...prev, nuevo]);
    setTextoSeleccionadoRaw('');
  };

  // Guardar definitivamente los apartados manuales
  const handleGuardarApartadosManuales = () => {
    if (apartadosEditables.length === 0) {
      alert('Debes definir al menos un apartado para guardar la resolución.');
      return;
    }
    let contadorOperativo = 1;
    const apartadosNormalizados = apartadosEditables.map(ap => {
      if (ap.esPreambulo) {
        return { ...ap, numero: 0, prefijo: 'Preámbulo / Antecedentes' };
      }
      const num = contadorOperativo++;
      return {
        ...ap,
        numero: num,
        prefijo: ap.prefijo?.trim() || `Artículo ${num}.`
      };
    });

    const textoReconstruido = reconstruirTextoResolucion(apartadosNormalizados);
    guardarResolucionEnmiendas({
      titulo: rawInputTitulo.trim() || 'Proyecto de Resolución',
      texto: textoReconstruido,
      articulos: apartadosNormalizados
    });

    setRawInputTexto(textoReconstruido);
    setModoEditorApartados(false);
    setTabInterna('articulos');
  };

  // Handlers para edición directa en pestaña 'articulos'
  const handleStartEditArticulo = (art) => {
    setEditingArticuloId(art.id);
    setEditPrefijoArticulo(art.prefijo || (art.esPreambulo ? 'Preámbulo' : `Artículo ${art.numero}.`));
    setEditTextoArticulo(art.texto || '');
  };

  const handleSaveEditArticulo = () => {
    if (!editingArticuloId) return;
    const updated = articulosActuales.map(a => {
      if (a.id !== editingArticuloId) return a;
      return {
        ...a,
        prefijo: editPrefijoArticulo.trim() || a.prefijo,
        texto: editTextoArticulo.trim(),
        modificado: true
      };
    });
    const nuevoTexto = reconstruirTextoResolucion(updated);
    guardarResolucionEnmiendas({
      articulos: updated,
      texto: nuevoTexto
    });
    setEditingArticuloId(null);
  };

  const handleCancelEditArticulo = () => {
    setEditingArticuloId(null);
    setEditTextoArticulo('');
    setEditPrefijoArticulo('');
  };

  const handleEliminarArticulo = (artId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este apartado de la resolución?')) return;
    const updated = articulosActuales.filter(a => a.id !== artId);
    const nuevoTexto = reconstruirTextoResolucion(updated);
    guardarResolucionEnmiendas({
      articulos: updated,
      texto: nuevoTexto
    });
  };

  const handleGuardarNuevoArticulo = (e) => {
    e.preventDefault();
    if (!nuevoArticuloTexto.trim()) return;
    const num = articulosOperativos.length + 1;
    const nuevo = {
      id: `art_${Date.now()}_nuevo`,
      numero: num,
      prefijo: nuevoArticuloPrefijo.trim() || `Artículo ${num}.`,
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
  };

  // Abrir modal de enmienda con contexto de artículo
  const handleOpenProponer = (artId, textoSeleccionado = '') => {
    const art = articulosActuales.find(a => a.id === artId);
    setSelectedArticuloId(artId || null);
    if (textoSeleccionado) {
      setTextoOriginal(textoSeleccionado);
      setTipoEnmienda('modificacion');
    } else if (art) {
      setTextoOriginal(art.texto);
    } else {
      setTextoOriginal('');
    }
    setTextoPropuesto('');
    setJustificacion('');
    if (paisesAsistentes.length > 0 && !paisProponente) {
      setPaisProponente(paisesAsistentes[0].nombre);
    }
    setModalProponerOpen(true);
  };

  // Enviar formulario de proponer enmienda
  const handleSubmitEnmienda = (e) => {
    e.preventDefault();
    const art = articulosActuales.find(a => a.id === selectedArticuloId);
    const num = art ? art.numero : (articulosOperativos.length + 1);

    agregarEnmiendaResolucion({
      tipo: tipoEnmienda,
      articuloId: selectedArticuloId || null,
      articuloNumero: art ? (art.prefijo || `Artículo ${art.numero}`) : `Nuevo Artículo ${num}`,
      paisProponente: paisProponente.trim() || 'Delegación',
      textoOriginal: textoOriginal.trim(),
      textoPropuesto: textoPropuesto.trim(),
      justificacion: justificacion.trim()
    });

    setModalProponerOpen(false);
    setTextoPropuesto('');
    setTextoOriginal('');
  };

  // Sincronizar enmienda directamente con el Mini Widget de Votación
  const handleVotarEnmienda = (enmienda) => {
    const tipoBadge = enmienda.tipo === 'adicion'
      ? 'Adición'
      : enmienda.tipo === 'supresion'
        ? 'Supresión'
        : 'Modificación';

    const asuntoVoto = `Enmienda de ${tipoBadge} - ${enmienda.articuloNumero || 'Art.'} (${enmienda.paisProponente})`;
    
    configurarVotacion({
      asunto: asuntoVoto,
      tipoVotacion: 'substantive',
      tipoMayoria: 'simple',
      aplicarVeto: true
    });
    resetearVotacion();
  };

  // Aprobar propuesta telemática de delegado
  const handleAprobarPropuestaDelegado = (prop) => {
    agregarEnmiendaResolucion({
      tipo: prop.tipo || 'modificacion',
      articuloId: prop.articuloId || null,
      articuloNumero: prop.articuloNumero || 'Artículo',
      paisProponente: prop.paisProponente || 'Delegación',
      textoOriginal: prop.textoOriginal || '',
      textoPropuesto: prop.textoPropuesto || '',
      justificacion: prop.justificacion || ''
    });
    if (eliminarEnmiendaPropuesta) {
      eliminarEnmiendaPropuesta(prop.id);
    }
  };

  // Copiar resolución consolidada al portapapeles
  const handleCopiarResolucion = () => {
    const texto = reconstruirTextoResolucion(articulosActuales);
    navigator.clipboard.writeText(texto || textoResolucion);
    alert('¡Texto de la resolución copiado al portapapeles!');
  };

  // Descargar archivo de la resolución en formatos .docx, .pdf o .txt
  const handleDescargarResolucion = async (formato = 'docx') => {
    setDescargandoFormato(formato);
    try {
      const payload = {
        titulo: tituloProyecto || 'Proyecto de Resolucion',
        articulos: articulosActuales,
        textoRaw: reconstruirTextoResolucion(articulosActuales) || textoResolucion
      };

      if (formato === 'docx') {
        await descargarResolucionDocx(payload);
      } else if (formato === 'pdf') {
        await descargarResolucionPdf(payload);
      } else {
        descargarResolucionTxt(payload);
      }
    } catch (err) {
      console.error('Error al exportar resolución:', err);
      alert(`Error al generar el archivo ${formato.toUpperCase()}: ${err.message}`);
    } finally {
      setDescargandoFormato(null);
    }
  };


  // Estadísticas y contadores corregidos
  const totalEnmiendas = enmiendas.length;
  const enmiendasPendientes = enmiendas.filter(e => e.estado?.toLowerCase() === 'pendiente').length;
  const enmiendasAceptadas = enmiendas.filter(e => e.estado?.toLowerCase() === 'aceptada').length;
  const enmiendasRechazadas = enmiendas.filter(e => e.estado?.toLowerCase() === 'rechazada').length;

  // Formato MM:SS para el cronómetro
  const formatTiempo = (totalSeg) => {
    const isNeg = totalSeg < 0;
    const abs = Math.abs(totalSeg);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${isNeg ? '-' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
      {/* ── OVERLAY VISUAL DE ARRASTRE DE ARCHIVOS ── */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          border: '3px dashed #3b82f6',
          borderRadius: '8px',
          zIndex: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          gap: '0.85rem',
          pointerEvents: 'none'
        }}>
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.25)',
            padding: '1.25rem',
            borderRadius: '50%',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Upload size={42} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff' }}>
            Suelta aquí tu archivo de resolución
          </div>
          <div style={{ fontSize: '0.78rem', color: '#93c5fd', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ backgroundColor: 'rgba(37, 99, 235, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>📄 Word (.docx)</span>
            <span style={{ backgroundColor: 'rgba(220, 38, 38, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>📑 PDF (.pdf)</span>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>📝 Texto (.txt, .md)</span>
          </div>
        </div>
      )}

      {/* ── OVERLAY DE PROCESAMIENTO DE ARCHIVOS ── */}
      {cargandoArchivo && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '8px',
          zIndex: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)',
          gap: '0.85rem'
        }}>
          <Loader2 size={38} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
            Extrayendo y parseando resolución...
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
            Detectando cláusulas preambulatorias y operativas
          </div>
        </div>
      )}

      {/* ── HEADER DEL CONTROLADOR DE ENMIENDAS ── */}
      <div style={{
        padding: '0.65rem 0.85rem',
        paddingRight: '60px',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexShrink: 0
      }}>
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          padding: '0.35rem',
          borderRadius: '6px',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <FileSignature size={18} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: '800',
            color: 'var(--text-color)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {tituloProyecto || 'Controlador de Enmiendas'}
          </div>
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span style={{ fontWeight: '700' }}>
              {articulosOperativos.length} {articulosOperativos.length === 1 ? 'artículo' : 'artículos'}
              {tienePreambulo && ' • 1 preámbulo'}
            </span>
            <span>•</span>
            <span style={{ color: '#eab308', fontWeight: '700' }}>{enmiendasPendientes} pendientes</span>
            <span>•</span>
            <span style={{ color: '#22c55e', fontWeight: '700' }}>{enmiendasAceptadas} aceptadas</span>
          </div>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y PESTAÑAS ── */}
      <div style={{
        padding: '0.4rem 0.75rem',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--panel-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.35rem',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
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
            <span>Por Artículos</span>
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
            <span>Documento Consolidado</span>
          </button>

          <button
            onClick={() => setTabInterna('importar')}
            title="Importar o Pegar Resolución"
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
            <span>Cargar / Pegar</span>
          </button>
        </div>

        {/* Acciones de Buzón Telemático y Cronómetro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {enmiendasPropuestas.length > 0 && (
            <button
              onClick={() => setShowBuzonDelegadosModal(true)}
              style={{
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid #a855f7',
                color: '#c084fc',
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
              <span>Buzón Delegados ({enmiendasPropuestas.length})</span>
            </button>
          )}

          <button
            onClick={() => setCronometroVisible(v => !v)}
            style={{
              background: cronometroVisible ? 'rgba(59, 130, 246, 0.2)' : 'var(--card-hover, rgba(255,255,255,0.05))',
              border: `1px solid ${cronometroVisible ? '#3b82f6' : 'var(--subborder-color)'}`,
              color: cronometroVisible ? '#60a5fa' : 'var(--muted-text)',
              borderRadius: '5px',
              padding: '0.3rem 0.55rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Mostrar / Ocultar Cronómetro de Intervenciones"
          >
            <Clock size={13} />
            <span>Cronómetro</span>
          </button>
        </div>
      </div>

      {/* ── MINI CRONÓMETRO INTEGRADO CON SINCRONIZACIÓN AL HISTÓRICO ── */}
      {cronometroVisible && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          borderBottom: '1px solid var(--subborder-color)',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          flexShrink: 0
        }}>
          {/* Selector de País con Bandera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)' }}>Orador:</span>
            {paisesAsistentes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {(() => {
                  const pObj = paisesAsistentes.find(p => p.nombre === cronometroPais) || paisesAsistentes[0];
                  return pObj ? <CountryFlag country={pObj} bandera={pObj.bandera} nombre={pObj.nombre} size="xs" /> : null;
                })()}
                <select
                  value={cronometroPais}
                  onChange={e => setCronometroPais(e.target.value)}
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)',
                    borderRadius: '4px',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.72rem',
                    fontWeight: '700'
                  }}
                >
                  {paisesAsistentes.map(p => (
                    <option key={p.id} value={p.nombre} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                type="text"
                value={cronometroPais}
                onChange={e => setCronometroPais(e.target.value)}
                placeholder="Nombre del país"
                style={{
                  backgroundColor: 'var(--panel-bg)',
                  border: '1px solid var(--subborder-color)',
                  color: 'var(--text-color)',
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.72rem'
                }}
              />
            )}
          </div>

          {/* Reloj y Controles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: '900',
              fontFamily: 'monospace',
              color: cronometroSegundos < 10 ? '#ef4444' : cronometroSegundos < 20 ? '#eab308' : '#22c55e',
              minWidth: '55px',
              textAlign: 'center'
            }}>
              {formatTiempo(cronometroSegundos)}
            </div>

            <button
              onClick={() => setCronometroCorriendo(c => !c)}
              style={{
                backgroundColor: cronometroCorriendo ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                border: `1px solid ${cronometroCorriendo ? '#eab308' : '#22c55e'}`,
                color: cronometroCorriendo ? '#eab308' : '#22c55e',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              {cronometroCorriendo ? <Pause size={12} /> : <Play size={12} />}
              <span>{cronometroCorriendo ? 'Pausa' : 'Iniciar'}</span>
            </button>

            <button
              onClick={() => {
                setCronometroCorriendo(false);
                setCronometroSegundos(cronometroInicial);
              }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                borderRadius: '4px',
                padding: '0.25rem 0.4rem',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
              title="Reiniciar reloj"
            >
              <RotateCcw size={12} />
            </button>

            {/* Presets de Tiempo */}
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {[30, 45, 60, 90].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setCronometroInicial(s);
                    setCronometroSegundos(s);
                    setCronometroCorriendo(false);
                  }}
                  style={{
                    backgroundColor: cronometroInicial === s ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                    border: '1px solid var(--subborder-color)',
                    color: cronometroInicial === s ? '#60a5fa' : 'var(--muted-text)',
                    borderRadius: '3px',
                    padding: '0.15rem 0.35rem',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* Botón Guardar en Histórico */}
            <button
              onClick={handleGuardarIntervencionCronometro}
              title="Guardar intervención y sumar segundos en el Histórico de Delegaciones"
              style={{
                backgroundColor: 'var(--btn-bg)',
                border: 'none',
                color: 'var(--btn-text)',
                borderRadius: '4px',
                padding: '0.25rem 0.55rem',
                fontSize: '0.7rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Check size={12} />
              <span>Guardar en Histórico</span>
            </button>
          </div>
        </div>
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
                padding: '1.5rem 1.25rem',
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
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                padding: '0.9rem',
                borderRadius: '50%',
                color: '#3b82f6'
              }}>
                <Upload size={32} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-color)', marginBottom: '0.25rem' }}>
                  Arrastra o selecciona un archivo de resolución
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', lineHeight: 1.4 }}>
                  Compatible con documentos Word (.docx), PDF (.pdf) y texto plano (.txt, .md)
                </div>
              </div>

              {/* Badges de formatos soportados */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  DOCX / Word
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  PDF
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  TXT / Markdown
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleCargarEjemplo}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
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
                <Sparkles size={14} /> Cargar Resolución de Ejemplo
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
                <Edit3 size={14} /> Pegar Texto Manualmente
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
          /* ── VISTA ARTÍCULO POR ARTÍCULO Y ENMIENDAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Barra de Filtros y Botón de Nueva Enmienda Global */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--subborder-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={13} color="var(--muted-text)" />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)' }}>Filtrar:</span>
                <select
                  value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)}
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)',
                    borderRadius: '4px',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.72rem'
                  }}
                >
                  <option value="todos">Todas ({totalEnmiendas})</option>
                  <option value="pendiente">Pendientes ({enmiendasPendientes})</option>
                  <option value="aceptada">Aceptadas ({enmiendasAceptadas})</option>
                  <option value="rechazada">Rechazadas ({enmiendasRechazadas})</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleAbrirEditorApartadosDesdeArticulos}
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#a855f7',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title="Configurar y reclasificar los apartados manualmente"
                >
                  <Layers size={13} /> Ajustar Apartados
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextNum = articulosActuales.filter(a => !a.esPreambulo).length + 1;
                    setNuevoArticuloPrefijo(`Artículo ${nextNum}.`);
                    setNuevoArticuloTexto('');
                    setModalNuevoArticuloOpen(true);
                  }}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Plus size={13} /> Añadir Artículo
                </button>

                <button
                  onClick={() => handleOpenProponer(null)}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <FilePlus size={13} /> Proponer Enmienda
                </button>
              </div>
            </div>

            {/* Listado de Artículos Existentes */}
            {articulosActuales.map(art => {
              const enmiendasArticulo = enmiendas.filter(e => {
                const coincideArt = e.articuloId === art.id;
                if (!coincideArt) return false;
                if (filtroEstado !== 'todos' && e.estado?.toLowerCase() !== filtroEstado) return false;
                return true;
              });

              return (
                <div
                  key={art.id}
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: `1px solid ${art.modificado ? 'rgba(34, 197, 94, 0.4)' : 'var(--subborder-color)'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Cabecera del Artículo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        backgroundColor: art.esPreambulo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: art.esPreambulo ? '#a855f7' : '#3b82f6',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {art.prefijo || (art.esPreambulo ? 'Preámbulo' : `Artículo ${art.numero}`)}
                      </span>
                      {art.modificado && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px'
                        }}>
                          Modificado
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {editingArticuloId !== art.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditArticulo(art)}
                            title="Editar texto o prefijo de este apartado"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--subborder-color)',
                              color: 'var(--text-color)',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Edit2 size={11} /> Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEliminarArticulo(art.id)}
                            title="Eliminar este apartado"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--subborder-color)',
                              color: '#ef4444',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={() => handleOpenProponer(art.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--subborder-color)',
                          color: 'var(--text-color)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Plus size={12} /> Proponer Enmienda
                      </button>
                    </div>
                  </div>

                  {/* Texto Oficial o Editor Inline del Artículo */}
                  {editingArticuloId === art.id ? (
                    <div style={{
                      backgroundColor: 'var(--panel-bg)',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)' }}>Prefijo / Título:</label>
                        <input
                          type="text"
                          value={editPrefijoArticulo}
                          onChange={e => setEditPrefijoArticulo(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.45rem',
                            backgroundColor: inputBgColor,
                            border: `1px solid ${inputBorderColor}`,
                            borderRadius: '4px',
                            color: 'var(--text-color)',
                            fontSize: '0.74rem'
                          }}
                          placeholder="Ej. Artículo 1. o Preámbulo"
                        />
                      </div>
                      <textarea
                        value={editTextoArticulo}
                        onChange={e => setEditTextoArticulo(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          backgroundColor: inputBgColor,
                          border: `1px solid ${inputBorderColor}`,
                          borderRadius: '4px',
                          color: 'var(--text-color)',
                          fontSize: '0.78rem',
                          lineHeight: 1.4,
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={handleCancelEditArticulo}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--subborder-color)',
                            color: 'var(--muted-text)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditArticulo}
                          style={{
                            backgroundColor: '#16a34a',
                            border: 'none',
                            color: '#ffffff',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Check size={12} /> Guardar Cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        lineHeight: 1.5,
                        color: 'var(--text-color)',
                        backgroundColor: 'var(--panel-bg)',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--subborder-color)',
                        whiteSpace: 'pre-wrap',
                        userSelect: 'text'
                      }}
                    >
                      {art.texto}
                    </div>
                  )}

                  {/* Feed de Enmiendas Propuestas para este Artículo */}
                  {enmiendasArticulo.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Mociones de Enmienda ({enmiendasArticulo.length})
                      </div>

                      {enmiendasArticulo.map(enm => (
                        <EnmiendaCard
                          key={enm.id}
                          enm={enm}
                          paises={paises}
                          onVotar={handleVotarEnmienda}
                          onResolver={resolverEnmiendaResolucion}
                          onEliminar={eliminarEnmiendaResolucion}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* SECCIÓN ESPECIAL: ENMIENDAS GENERALES / NUEVAS CLÁUSULAS PROPUESTAS AL FINAL */}
            {enmiendasGeneralesOFinales.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: '800', color: '#60a5fa' }}>
                    <FilePlus size={14} /> Nuevos Artículos y Enmiendas Generales al Final ({enmiendasGeneralesOFinales.length})
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {enmiendasGeneralesOFinales.map(enm => (
                    <EnmiendaCard
                      key={enm.id}
                      enm={enm}
                      paises={paises}
                      onVotar={handleVotarEnmienda}
                      onResolver={resolverEnmiendaResolucion}
                      onEliminar={eliminarEnmiendaResolucion}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tabInterna === 'consolidado' ? (
          /* ── VISTA CONSOLIDADA FINAL Y EXPORTACIÓN MULTIFORMATO (DOCX, PDF, TXT) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>Texto Consolidado de la Resolución</div>
              
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={handleCopiarResolucion}
                  style={{
                    backgroundColor: 'var(--card-hover, rgba(255,255,255,0.06))',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)',
                    padding: '0.3rem 0.55rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title="Copiar texto al portapapeles"
                >
                  <Copy size={12} /> Copiar
                </button>

                {/* Descargar en Word (.docx) */}
                <button
                  onClick={() => handleDescargarResolucion('docx')}
                  disabled={descargandoFormato === 'docx'}
                  title="Descargar documento Microsoft Word (.docx)"
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    border: '1px solid #3b82f6',
                    color: '#60a5fa',
                    padding: '0.3rem 0.55rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {descargandoFormato === 'docx' ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <FileDown size={12} />
                  )}
                  <span>Word (.docx)</span>
                </button>

                {/* Descargar en PDF (.pdf) */}
                <button
                  onClick={() => handleDescargarResolucion('pdf')}
                  disabled={descargandoFormato === 'pdf'}
                  title="Descargar documento formal en PDF (.pdf)"
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '0.3rem 0.55rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {descargandoFormato === 'pdf' ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <FileDown size={12} />
                  )}
                  <span>PDF (.pdf)</span>
                </button>

                {/* Descargar en Texto (.txt) */}
                <button
                  onClick={() => handleDescargarResolucion('txt')}
                  disabled={descargandoFormato === 'txt'}
                  title="Descargar como archivo de texto (.txt)"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    padding: '0.3rem 0.55rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {descargandoFormato === 'txt' ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Download size={12} />
                  )}
                  <span>Texto (.txt)</span>
                </button>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: 'var(--text-color)',
              whiteSpace: 'pre-wrap',
              userSelect: 'text'
            }}>
              {articulosActuales.length > 0
                ? reconstruirTextoResolucion(articulosActuales)
                : (textoResolucion || 'Sin contenido')}
            </div>
          </div>
        ) : modoEditorApartados ? (
          /* ── CONFIGURADOR MANUAL DE APARTADOS (PREÁMBULO Y ARTÍCULOS) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--subborder-color)',
              paddingBottom: '0.6rem'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={16} color="#a855f7" /> Configurador Manual de Apartados
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
                  Asigna manualmente qué secciones son Preámbulo o Artículos Operativos, divide, une o edita cláusulas con total control.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleAnadirApartadoEnBlanco}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Plus size={13} /> Añadir Apartado
                </button>

                <button
                  type="button"
                  onClick={() => setModoEditorApartados(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--muted-text)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Volver al Texto
                </button>

                <button
                  type="button"
                  onClick={handleGuardarApartadosManuales}
                  style={{
                    backgroundColor: '#16a34a',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <Check size={14} /> Guardar y Aplicar Resolución
                </button>
              </div>
            </div>

            {/* Asistente interactivo de texto original: seleccionar texto y asignar */}
            {rawInputTexto && rawInputTexto.trim() && (
              <details style={{
                backgroundColor: 'var(--card-hover, rgba(255,255,255,0.02))',
                border: '1px solid var(--subborder-color)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem'
              }}>
                <summary style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-color)', cursor: 'pointer', userSelect: 'none' }}>
                  🔍 Asistente de Selección desde el Borrador Original (Haz clic para desplegar)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                    Selecciona cualquier párrafo o fragmento con el ratón en el cuadro inferior y asígnalo con un clic:
                  </div>
                  <textarea
                    ref={rawTextareaRef}
                    defaultValue={rawInputTexto}
                    onMouseUp={handleCapturarSeleccionRaw}
                    onKeyUp={handleCapturarSeleccionRaw}
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      backgroundColor: inputBgColor,
                      border: `1px solid ${inputBorderColor}`,
                      borderRadius: '5px',
                      color: 'var(--text-color)',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.3
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.7rem', color: textoSeleccionadoRaw ? '#10b981' : 'var(--muted-text)' }}>
                      {textoSeleccionadoRaw ? `Seleccionados ${textoSeleccionadoRaw.length} caracteres` : 'Ningún texto seleccionado actualmente.'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleAsignarSeleccion('preambulo')}
                        disabled={!textoSeleccionadoRaw}
                        style={{
                          backgroundColor: textoSeleccionadoRaw ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                          border: '1px solid var(--subborder-color)',
                          color: textoSeleccionadoRaw ? '#a855f7' : 'var(--muted-text)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: textoSeleccionadoRaw ? 'pointer' : 'not-allowed'
                        }}
                      >
                        + Añadir Selección como Preámbulo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAsignarSeleccion('articulo')}
                        disabled={!textoSeleccionadoRaw}
                        style={{
                          backgroundColor: textoSeleccionadoRaw ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          border: '1px solid var(--subborder-color)',
                          color: textoSeleccionadoRaw ? '#3b82f6' : 'var(--muted-text)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: textoSeleccionadoRaw ? 'pointer' : 'not-allowed'
                        }}
                      >
                        + Añadir Selección como Artículo Operativo
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {/* Listado de tarjetas de apartados editables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {apartadosEditables.map((ap, idx) => {
                const esPreambulo = ap.esPreambulo;
                return (
                  <div
                    key={ap.id}
                    style={{
                      backgroundColor: 'var(--card-header-bg)',
                      border: `1px solid ${esPreambulo ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                      borderLeft: `4px solid ${esPreambulo ? '#a855f7' : '#3b82f6'}`,
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    {/* Fila 1: Selector de tipo, input de prefijo y controles de posición/división */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {/* Botón conmutador Preámbulo vs Artículo */}
                        <button
                          type="button"
                          onClick={() => handleToggleTipoApartado(ap.id)}
                          title="Haz clic para alternar entre Preámbulo y Artículo Operativo"
                          style={{
                            backgroundColor: esPreambulo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            border: `1px solid ${esPreambulo ? '#a855f7' : '#3b82f6'}`,
                            color: esPreambulo ? '#a855f7' : '#3b82f6',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Wand2 size={11} /> {esPreambulo ? 'Preámbulo' : 'Artículo Operativo'} ⇄
                        </button>

                        <input
                          type="text"
                          value={ap.prefijo || ''}
                          onChange={e => handleUpdateApartado(ap.id, 'prefijo', e.target.value)}
                          placeholder={esPreambulo ? 'Preámbulo / Considerando' : `Artículo ${idx + 1}.`}
                          style={{
                            padding: '0.2rem 0.45rem',
                            backgroundColor: inputBgColor,
                            border: `1px solid ${inputBorderColor}`,
                            borderRadius: '4px',
                            color: 'var(--text-color)',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            width: '180px'
                          }}
                        />
                      </div>

                      {/* Botones de acción del apartado: Subir, Bajar, Dividir, Unir, Eliminar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => handleMoverApartado(idx, -1)}
                          disabled={idx === 0}
                          title="Subir posición"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--subborder-color)',
                            color: idx === 0 ? 'var(--muted-text)' : 'var(--text-color)',
                            padding: '0.2rem 0.35rem',
                            borderRadius: '3px',
                            cursor: idx === 0 ? 'default' : 'pointer'
                          }}
                        >
                          <ArrowUp size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoverApartado(idx, 1)}
                          disabled={idx === apartadosEditables.length - 1}
                          title="Bajar posición"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--subborder-color)',
                            color: idx === apartadosEditables.length - 1 ? 'var(--muted-text)' : 'var(--text-color)',
                            padding: '0.2rem 0.35rem',
                            borderRadius: '3px',
                            cursor: idx === apartadosEditables.length - 1 ? 'default' : 'pointer'
                          }}
                        >
                          <ArrowDown size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDividirApartado(ap.id)}
                          title="Dividir este apartado en dos por la mitad"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#3b82f6',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '3px',
                            fontSize: '0.68rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Scissors size={11} /> Dividir
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUnirConSiguiente(idx)}
                          disabled={idx === apartadosEditables.length - 1}
                          title="Unir con el siguiente apartado"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--subborder-color)',
                            color: idx === apartadosEditables.length - 1 ? 'var(--muted-text)' : 'var(--text-color)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '3px',
                            fontSize: '0.68rem',
                            fontWeight: '600',
                            cursor: idx === apartadosEditables.length - 1 ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Link2 size={11} /> Unir
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminarApartado(ap.id)}
                          title="Eliminar este apartado"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            padding: '0.2rem 0.35rem',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Fila 2: Texto del apartado */}
                    <textarea
                      value={ap.texto}
                      onChange={e => handleUpdateApartado(ap.id, 'texto', e.target.value)}
                      rows={Math.min(8, Math.max(3, (ap.texto || '').split('\n').length))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: inputBgColor,
                        border: `1px solid ${inputBorderColor}`,
                        borderRadius: '5px',
                        color: 'var(--text-color)',
                        fontSize: '0.78rem',
                        lineHeight: 1.4,
                        resize: 'vertical',
                        outline: 'none'
                      }}
                      placeholder={esPreambulo ? 'Escribe las cláusulas preambulatorias aquí...' : 'Escribe el contenido de esta cláusula operativa aquí...'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── VISTA DE IMPORTACIÓN Y PEGADO CON DROPZONE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>Cargar Proyecto de Resolución</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
              Arrastra un archivo o pega el texto directamente desde Google Docs o Word. El sistema segmentará automáticamente las cláusulas y artículos.
            </div>

            {/* Dropzone interactivo de subida */}
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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                padding: '0.6rem',
                borderRadius: '50%',
                color: '#3b82f6'
              }}>
                <Upload size={22} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
                Haz clic o arrastra aquí tu archivo Word (.docx), PDF (.pdf) o Texto (.txt / .md)
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                Se detectará el título y se estructurarán las cláusulas automáticamente
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
                  Título del Proyecto de Resolución:
                </label>
                <input
                  type="text"
                  value={rawInputTitulo}
                  onChange={e => setRawInputTitulo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  placeholder="Ej. Proyecto de Resolución A/RES/79/L.2"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  Texto Completo del Borrador:
                </label>
                <textarea
                  value={rawInputTexto}
                  onChange={e => setRawInputTexto(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder="Pega aquí el contenido del proyecto de resolución..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAbrirEditorApartados()}
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#a855f7',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                  title="Ajustar y definir manualmente qué partes son preámbulo o artículos"
                >
                  <Layers size={14} /> Ajustar Apartados Manualmente
                </button>

                <button
                  type="button"
                  onClick={handleCargarEjemplo}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Usar Ejemplo
                </button>

                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    color: 'var(--btn-text)',
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Procesar y Guardar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── MODAL DE BUZÓN DE PROPUESTAS DE DELEGADOS (P2P) ── */}
      {showBuzonDelegadosModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '800' }}>
                <Inbox size={16} color="#a855f7" /> Propuestas de Enmienda de Delegados ({enmiendasPropuestas.length})
              </div>
              <button
                onClick={() => setShowBuzonDelegadosModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {enmiendasPropuestas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                No hay propuestas pendientes en el buzón.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {enmiendasPropuestas.map(prop => {
                  const pObj = (paises || []).find(p => p.nombre?.toLowerCase() === prop.paisProponente?.toLowerCase());
                  return (
                    <div
                      key={prop.id}
                      style={{
                        backgroundColor: 'var(--card-header-bg)',
                        border: '1px solid var(--subborder-color)',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CountryFlag country={pObj} bandera={pObj?.bandera} nombre={prop.paisProponente} size="xs" />
                          <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{prop.paisProponente}</span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa'
                          }}>
                            {prop.tipo?.toUpperCase()} · {prop.articuloNumero || 'General'}
                          </span>
                        </div>
                      </div>

                      {prop.textoOriginal && (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', textDecoration: 'line-through' }}>
                          {prop.textoOriginal}
                        </div>
                      )}

                      {prop.textoPropuesto && (
                        <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>
                          + {prop.textoPropuesto}
                        </div>
                      )}

                      {prop.justificacion && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                          Motivo: {prop.justificacion}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                        <button
                          onClick={() => eliminarEnmiendaPropuesta && eliminarEnmiendaPropuesta(prop.id)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            borderRadius: '4px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Rechazar
                        </button>

                        <button
                          onClick={() => handleAprobarPropuestaDelegado(prop)}
                          style={{
                            backgroundColor: '#16a34a',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '4px',
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Check size={12} /> Aprobar y Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE PROPONER ENMIENDA / MOCIÓN ── */}
      {modalProponerOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '800' }}>Proponer Enmienda / Moción</div>
              <button
                onClick={() => setModalProponerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitEnmienda} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Selector de Tipo de Enmienda */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.3rem' }}>
                  Naturaleza de la Enmienda:
                </label>
                <div 
                  className="selector-tipo-enmienda"
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', 
                    gap: '0.4rem',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setTipoEnmienda('adicion')}
                    style={{
                      padding: '0.45rem 0.35rem',
                      borderRadius: '6px',
                      border: `1px solid ${tipoEnmienda === 'adicion' ? '#22c55e' : 'var(--subborder-color)'}`,
                      backgroundColor: tipoEnmienda === 'adicion' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                      color: tipoEnmienda === 'adicion' ? '#22c55e' : 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <FilePlus size={13} style={{ flexShrink: 0 }} /> <span>Adición</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoEnmienda('supresion')}
                    style={{
                      padding: '0.45rem 0.35rem',
                      borderRadius: '6px',
                      border: `1px solid ${tipoEnmienda === 'supresion' ? '#ef4444' : 'var(--subborder-color)'}`,
                      backgroundColor: tipoEnmienda === 'supresion' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: tipoEnmienda === 'supresion' ? '#ef4444' : 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <FileMinus size={13} style={{ flexShrink: 0 }} /> <span>Supresión</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoEnmienda('modificacion')}
                    style={{
                      padding: '0.45rem 0.35rem',
                      borderRadius: '6px',
                      border: `1px solid ${tipoEnmienda === 'modificacion' ? '#3b82f6' : 'var(--subborder-color)'}`,
                      backgroundColor: tipoEnmienda === 'modificacion' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      color: tipoEnmienda === 'modificacion' ? '#3b82f6' : 'var(--text-color)',
                      fontWeight: '700',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <Edit3 size={13} style={{ flexShrink: 0 }} /> <span>Modificación</span>
                  </button>
                </div>
              </div>

              {/* Selector de Artículo Objetivo */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  Artículo / Cláusula Objetivo:
                </label>
                <select
                  value={selectedArticuloId || ''}
                  onChange={e => {
                    setSelectedArticuloId(e.target.value || null);
                    const art = articulosActuales.find(a => a.id === e.target.value);
                    if (art && tipoEnmienda !== 'adicion') {
                      setTextoOriginal(art.texto);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                    -- Añadir Nuevo Artículo al Final / Enmienda General --
                  </option>
                  {articulosActuales.map(art => (
                    <option key={art.id} value={art.id} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                      {art.prefijo || `Artículo ${art.numero}`} - {art.texto.substring(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Delegación Proponente con Bandera */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  Delegación Proponente:
                </label>
                {paisesAsistentes.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {(() => {
                      const pObj = paisesAsistentes.find(p => p.nombre === paisProponente) || paisesAsistentes[0];
                      return pObj ? <CountryFlag country={pObj} bandera={pObj.bandera} nombre={pObj.nombre} size="sm" /> : null;
                    })()}
                    <select
                      value={paisProponente}
                      onChange={e => setPaisProponente(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.65rem',
                        backgroundColor: inputBgColor,
                        border: `1px solid ${inputBorderColor}`,
                        borderRadius: '6px',
                        color: 'var(--text-color)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        cursor: 'pointer'
                      }}
                    >
                      {paisesAsistentes.map(p => (
                        <option key={p.id} value={p.nombre} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={paisProponente}
                    onChange={e => setPaisProponente(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.65rem',
                      backgroundColor: inputBgColor,
                      border: `1px solid ${inputBorderColor}`,
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                    placeholder="Ej. Francia"
                  />
                )}
              </div>

              {/* Campo de Texto Original (para Supresión o Modificación) */}
              {(tipoEnmienda === 'supresion' || tipoEnmienda === 'modificacion') && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>
                    {tipoEnmienda === 'supresion' ? 'Texto o Cláusula a Suprimir:' : 'Texto Original a Modificar / Reemplazar:'}
                  </label>
                  <textarea
                    value={textoOriginal}
                    onChange={e => setTextoOriginal(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      fontSize: '0.76rem',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Pega o escribe el fragmento de texto a suprimir/reemplazar..."
                  />
                </div>
              )}

              {/* Campo de Texto Propuesto (para Adición o Modificación) */}
              {(tipoEnmienda === 'adicion' || tipoEnmienda === 'modificacion') && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#22c55e', display: 'block', marginBottom: '0.2rem' }}>
                    {tipoEnmienda === 'adicion' ? 'Texto Nuevo a Añadir:' : 'Texto Propuesto de Reemplazo:'}
                  </label>
                  <textarea
                    value={textoPropuesto}
                    onChange={e => setTextoPropuesto(e.target.value)}
                    rows={3}
                    required
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'rgba(34, 197, 94, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      fontSize: '0.76rem',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Escribe el texto propuesto..."
                  />
                </div>
              )}

              {/* Motivación / Justificación */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  Justificación / Argumento (Opcional):
                </label>
                <input
                  type="text"
                  value={justificacion}
                  onChange={e => setJustificacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.76rem'
                  }}
                  placeholder="Ej. Armonizar con el derecho internacional vigente"
                />
              </div>

              {/* Botones del Modal */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalProponerOpen(false)}
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--btn-text)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Registrar Moción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PARA AÑADIR NUEVO ARTÍCULO O CLÁUSULA DIRECTAMENTE ── */}
      {modalNuevoArticuloOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '800' }}>
                <Plus size={16} color="#10b981" /> Añadir Nueva Cláusula a la Resolución
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
                  Prefijo / Numeración de la Cláusula:
                </label>
                <input
                  type="text"
                  value={nuevoArticuloPrefijo}
                  onChange={e => setNuevoArticuloPrefijo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                  placeholder="Ej. Artículo 5. o Cláusula 5."
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
                  Texto de la Cláusula:
                </label>
                <textarea
                  value={nuevoArticuloTexto}
                  onChange={e => setNuevoArticuloTexto(e.target.value)}
                  rows={5}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder="Escribe el texto de la nueva cláusula..."
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
                  Cancelar
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
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Añadir Cláusula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente reutilizable para cada tarjeta de enmienda con bandera y proponente prominente
const EnmiendaCard = ({ enm, paises, onVotar, onResolver, onEliminar }) => {
  const paisObj = (paises || []).find(p => p.nombre?.toLowerCase() === enm.paisProponente?.toLowerCase());
  const esAdicion = enm.tipo === 'adicion';
  const esSupresion = enm.tipo === 'supresion';
  const esModificacion = enm.tipo === 'modificacion';

  return (
    <div
      style={{
        backgroundColor: enm.estado === 'aceptada'
          ? 'rgba(34, 197, 94, 0.08)'
          : enm.estado === 'rechazada'
            ? 'rgba(239, 68, 68, 0.08)'
            : 'var(--card-hover, rgba(255,255,255,0.03))',
        border: `1px solid ${
          enm.estado === 'aceptada'
            ? 'rgba(34, 197, 94, 0.4)'
            : enm.estado === 'rechazada'
              ? 'rgba(239, 68, 68, 0.4)'
              : 'var(--subborder-color)'
        }`,
        borderRadius: '6px',
        padding: '0.65rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem'
      }}
    >
      {/* Cabecera de la Enmienda con Proponente Prominente */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Badge de Tipo */}
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '800',
            padding: '0.12rem 0.4rem',
            borderRadius: '4px',
            backgroundColor: esAdicion
              ? 'rgba(34, 197, 94, 0.2)'
              : esSupresion
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(59, 130, 246, 0.2)',
            color: esAdicion ? '#22c55e' : esSupresion ? '#ef4444' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            {esAdicion && <FilePlus size={12} />}
            {esSupresion && <FileMinus size={12} />}
            {esModificacion && <Edit3 size={12} />}
            {esAdicion ? 'Adición' : esSupresion ? 'Supresión' : 'Modificación'}
          </span>

          {/* País Proponente Prominente */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'rgba(255,255,255,0.06)',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            border: '1px solid var(--subborder-color)'
          }}>
            <CountryFlag country={paisObj} bandera={paisObj?.bandera} nombre={enm.paisProponente} size="xs" />
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-color)' }}>
              {enm.paisProponente || 'Delegación'}
            </span>
          </div>
        </div>

        {/* Estado de la Enmienda */}
        <span style={{
          fontSize: '0.65rem',
          fontWeight: '800',
          padding: '0.12rem 0.45rem',
          borderRadius: '4px',
          textTransform: 'uppercase',
          backgroundColor: enm.estado === 'aceptada'
            ? 'rgba(34, 197, 94, 0.2)'
            : enm.estado === 'rechazada'
              ? 'rgba(239, 68, 68, 0.2)'
              : 'rgba(234, 179, 8, 0.2)',
          color: enm.estado === 'aceptada'
            ? '#22c55e'
            : enm.estado === 'rechazada'
              ? '#ef4444'
              : '#eab308'
        }}>
          {enm.estado}
        </span>
      </div>

      {/* Contenido Visual Diff */}
      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {esAdicion && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            borderLeft: '3px solid #22c55e',
            padding: '0.35rem 0.5rem',
            borderRadius: '0 4px 4px 0',
            color: '#22c55e',
            fontWeight: '600'
          }}>
            + {enm.textoPropuesto}
          </div>
        )}

        {esSupresion && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderLeft: '3px solid #ef4444',
            padding: '0.35rem 0.5rem',
            borderRadius: '0 4px 4px 0',
            color: '#ef4444',
            textDecoration: 'line-through',
            fontWeight: '500'
          }}>
            - {enm.textoOriginal || 'Supresión total del artículo'}
          </div>
        )}

        {esModificacion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {enm.textoOriginal && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                color: '#ef4444',
                textDecoration: 'line-through',
                fontSize: '0.72rem'
              }}>
                {enm.textoOriginal}
              </div>
            )}
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              padding: '0.25rem 0.45rem',
              borderRadius: '4px',
              color: '#22c55e',
              fontWeight: '600',
              fontSize: '0.72rem'
            }}>
              ➔ {enm.textoPropuesto}
            </div>
          </div>
        )}

        {enm.justificacion && (
          <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontStyle: 'italic', marginTop: '0.1rem' }}>
            Motivación: {enm.justificacion}
          </div>
        )}
      </div>

      {/* Botones de Acción sobre la Enmienda */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginTop: '0.2rem' }}>
        <button
          onClick={() => onVotar(enm)}
          title="Votar esta enmienda en el Mini Sistema de Votación"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Vote size={12} /> Votar Moción
        </button>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {enm.estado === 'pendiente' ? (
            <>
              <button
                onClick={() => onResolver(enm.id, 'aceptada')}
                title="Aceptar enmienda y actualizar texto automáticamente"
                style={{
                  backgroundColor: '#16a34a',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Check size={12} /> Aceptar
              </button>

              <button
                onClick={() => onResolver(enm.id, 'rechazada')}
                title="Rechazar enmienda"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <X size={12} /> Rechazar
              </button>
            </>
          ) : (
            <button
              onClick={() => onResolver(enm.id, 'pendiente')}
              title="Deshacer decisión y volver a pendiente"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <RotateCcw size={11} /> Deshacer
            </button>
          )}

          <button
            onClick={() => onEliminar(enm.id)}
            title="Eliminar enmienda"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              padding: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControladorEnmiendas;
