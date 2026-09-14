import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Search, 
  Clock, 
  Users, 
  FileText, 
  Timer, 
  Hourglass, 
  Globe, 
  BarChart3, 
  Check,
  Zap,
  Sliders,
  Vote,
  FileCheck2,
  Upload,
  Building2,
  UserPlus,
  RotateCcw,
  LayoutTemplate,
  Star,
  ChevronLeft,
  Download,
  Layers,
  Sparkles,
  Info,
  FlaskConical,
  Dices,
  Flame,
  Radio,
  Shuffle,
  Tv,
  PenTool,
  Palette,
  Map,
  FileSignature
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import WidgetRegistry from '../widgets/WidgetRegistry';
import configMaster from '../../config/config_master.json';
import { PRESET_TEMPLATES } from '../../plantillas/widgets';

// Metadata rica para cada widget disponible
export const WIDGET_METADATA = {
  cronometro_enmiendas: {
    title: 'Cronómetro de Enmiendas',
    category: 'Debate',
    description: 'Temporizador compacto para oradores en debate de enmiendas, con selección de país, presets (30s-120s) y sincronización directa con el Histórico de Delegaciones.',
    icon: Clock,
    iconBg: 'rgba(234, 179, 8, 0.2)',
    iconColor: '#eab308',
    defaultColSpan: 4,
    defaultRowSpan: 3,
  },
  controlador_enmiendas: {
    title: 'Controlador de Enmiendas & Resolución',
    category: 'Debate',
    description: 'Gestión y procesamiento de borradores de resolución (.txt, .md, Google Docs), desglose artículo por artículo y formulación de mociones de adición, supresión y modificación con actualización automática.',
    icon: FileSignature,
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10b981',
    defaultColSpan: 7,
    defaultRowSpan: 6,
  },
  mini_votacion: {
    title: 'Mini Sistema de Votación (Roll Call)',
    category: 'Votaciones',
    description: 'Votación nominal sincronizada en tiempo real para enmiendas, flujo ágil de Roll Call con pasadas en 2da ronda, ajustes rápidos y vista expandible a pantalla completa.',
    icon: Vote,
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
    defaultColSpan: 5,
    defaultRowSpan: 6,
  },
  mapa_votacion: {
    title: 'Mapa Mundial de Votación',
    category: 'Votaciones',
    description: 'Mapa geopolítico interactivo que colorea en tiempo real cada país según su voto (A Favor, En Contra, Abstención, Veto P5) con zoom y tooltips.',
    icon: Map,
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  pizarra_interactiva: {
    title: 'Pizarra Interactiva & Mapas',
    category: 'Debate',
    description: 'Lienzo táctico para dibujar, marcar posiciones geopolíticas y hacer anotaciones sobre mapas mundiales o imágenes personalizadas.',
    icon: Palette,
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10b981',
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  tele_noticias: {
    title: 'Televisión de Noticias (En Vivo)',
    category: 'Debate',
    description: 'Monitor con forma de TV que emite exclusivamente la alerta de crisis o noticia que se está proyectando en directo.',
    icon: Tv,
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#60a5fa',
    defaultColSpan: 6,
    defaultRowSpan: 5,
  },
  selector_aleatorio: {
    title: 'Selector Aleatorio (Ruleta)',
    category: 'Debate',
    description: 'Ruleta animada y sorteo de delegaciones ("Cold Calling") para dinamizar el debate.',
    icon: Dices,
    iconBg: 'rgba(236, 72, 153, 0.2)',
    iconColor: '#ec4899',
    defaultColSpan: 5,
    defaultRowSpan: 5,
  },
  gestor_crisis: {
    title: 'Gestor de Crisis & Noticiero',
    category: 'Debate',
    description: 'Titulares en vivo estilo noticiero TV ("Última Hora"), reloj de simulación y línea de crisis.',
    icon: Flame,
    iconBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#ef4444',
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  anadir_paises_gsl: {
    title: 'Añadir Países GSL',
    category: 'Debate',
    description: 'Búsqueda rápida y selección de países para la Lista General de Oradores (GSL).',
    icon: UserPlus,
    iconBg: 'rgba(168, 85, 247, 0.2)',
    iconColor: '#c084fc',
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  anadir_paises_debate: {
    title: 'Añadir Países Debate',
    category: 'Debate',
    description: 'Búsqueda rápida y selección de países para Caucus Moderado y Debate.',
    icon: Timer,
    iconBg: 'rgba(249, 115, 22, 0.2)',
    iconColor: '#fb923c',
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  establecer_agenda: {
    title: 'Comité y Agenda',
    category: 'Configuración',
    description: 'Configuración del nombre del comité y gestión ordenada de los puntos de agenda.',
    icon: FileCheck2,
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  votacion_oficial: {
    title: 'Sistema de Votación Oficial',
    category: 'Votaciones',
    description: 'Votación Procedimental vs Sustantiva, tipos de mayoría, Veto P5, orden alfabético y Roll Call.',
    icon: Vote,
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  cronometro_principal: {
    title: 'Cronómetro Principal',
    category: 'Tiempo',
    description: 'Temporizador para discursos de delegaciones con tiempos predefinidos y ceder palabra.',
    icon: Clock,
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    defaultColSpan: 6,
    defaultRowSpan: 3,
  },
  lista_oradores: {
    title: 'Lista de Oradores',
    category: 'Debate',
    description: 'Gestión de la cola de oradores GSL y control de turnos en directo.',
    icon: Users,
    iconBg: 'rgba(168, 85, 247, 0.15)',
    iconColor: '#a855f7',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  pizarra_mociones: {
    title: 'Pizarra de Mociones',
    category: 'Mociones',
    description: 'Registro interactivo, ordenamiento y votación rápida de mociones.',
    icon: FileText,
    iconBg: 'rgba(234, 179, 8, 0.15)',
    iconColor: '#eab308',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  cronometro_dual: {
    title: 'Cronómetro Dual',
    category: 'Tiempo',
    description: 'Reloj doble para tiempo individual por orador y tiempo total del caucus.',
    icon: Timer,
    iconBg: 'rgba(249, 115, 22, 0.15)',
    iconColor: '#f97316',
    defaultColSpan: 5,
    defaultRowSpan: 4,
  },
  cronometro_only_time: {
    title: 'Cronómetro Solo Tiempo',
    category: 'Tiempo',
    description: 'Temporizador simplificado de tiempo total para libres negociaciones.',
    icon: Hourglass,
    iconBg: 'rgba(236, 72, 153, 0.15)',
    iconColor: '#ec4899',
    defaultColSpan: 5,
    defaultRowSpan: 3,
  },
  matriz_paises: {
    title: 'Matriz de Países',
    category: 'Votaciones',
    description: 'Control de asistencia, derecho a veto, quórum y votaciones roll-call.',
    icon: Globe,
    iconBg: 'rgba(34, 197, 94, 0.15)',
    iconColor: '#22c55e',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  historico_delegaciones: {
    title: 'Histórico Delegaciones',
    category: 'Estadísticas',
    description: 'Estadísticas de participación, interrupciones e intervenciones.',
    icon: BarChart3,
    iconBg: 'rgba(6, 182, 212, 0.15)',
    iconColor: '#06b6d4',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  importar_paises: {
    title: 'Importar Países',
    category: 'Configuración',
    description: 'Carga delegaciones desde archivo xlsx, csv o json, o añádelas manualmente.',
    icon: Upload,
    iconBg: 'rgba(234, 179, 8, 0.15)',
    iconColor: '#eab308',
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
};

// Lista canónica de widgets únicos sin alias redundantes
export const CANONICAL_WIDGET_IDS = [
  'establecer_agenda',
  'importar_paises',
  'lista_oradores',
  'anadir_paises_gsl',
  'cronometro_principal',
  'cronometro_dual',
  'cronometro_only_time',
  'cronometro_enmiendas',
  'pizarra_mociones',
  'anadir_paises_debate',
  'votacion_oficial',
  'mini_votacion',
  'controlador_enmiendas',
  'mapa_votacion',
  'matriz_paises',
  'historico_delegaciones',
  'selector_aleatorio',
  'gestor_crisis',
  'tele_noticias',
  'pizarra_interactiva'
];

// Mapeo de widgets por defecto según la pestaña/aspecto activo
export const DEFAULT_WIDGETS_BY_TAB = {
  COMIENZO: ['establecer_agenda', 'importar_paises', 'matriz_paises'],
  GSL: ['lista_oradores', 'cronometro_principal', 'anadir_paises_gsl'],
  DEBATE: ['cronometro_dual', 'pizarra_mociones', 'anadir_paises_debate'],
  VOTING: ['votacion_oficial', 'matriz_paises', 'mapa_votacion'],
  ENMIENDAS: ['controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas'],
  INFO: ['matriz_paises', 'historico_delegaciones'],
  LIBRE: [],
  HOME: ['lista_oradores', 'cronometro_principal', 'pizarra_mociones', 'votacion_oficial', 'matriz_paises']
};

// Mapeo de widgets recomendados según la pestaña/aspecto activo
export const RECOMMENDED_BY_TAB = {
  COMIENZO: ['establecer_agenda', 'importar_paises', 'matriz_paises'],
  GSL: ['lista_oradores', 'cronometro_principal', 'anadir_paises_gsl', 'selector_aleatorio'],
  DEBATE: ['cronometro_dual', 'pizarra_mociones', 'anadir_paises_debate', 'cronometro_enmiendas', 'cronometro_only_time', 'selector_aleatorio', 'gestor_crisis', 'tele_noticias', 'pizarra_interactiva', 'mapa_votacion'],
  VOTING: ['votacion_oficial', 'matriz_paises', 'mapa_votacion', 'mini_votacion'],
  ENMIENDAS: ['controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas', 'votacion_oficial', 'matriz_paises'],
  INFO: ['matriz_paises', 'historico_delegaciones'],
  LIBRE: ['mapa_votacion', 'pizarra_interactiva', 'selector_aleatorio', 'gestor_crisis', 'tele_noticias', 'controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas'],
  HOME: ['lista_oradores', 'cronometro_principal', 'pizarra_mociones', 'votacion_oficial', 'matriz_paises', 'mapa_votacion', 'pizarra_interactiva', 'establecer_agenda', 'selector_aleatorio', 'gestor_crisis', 'tele_noticias', 'controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas']
};

// Re-exportar plantillas predefinidas importadas modularmente
export { PRESET_TEMPLATES };

// Componente Toggle Estilizado de Alta Gama
const StylizedToggle = ({ checked, onChange, disabled }) => {
  const { isLight } = useAccessibility();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '48px',
        height: '26px',
        borderRadius: '9999px',
        padding: '3px',
        backgroundColor: checked ? '#3b82f6' : (isLight ? '#cbd5e1' : '#27272a'),
        boxShadow: checked ? '0 0 12px rgba(59, 130, 246, 0.4)' : (isLight ? 'inset 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.5)'),
        border: `1px solid ${checked ? '#60a5fa' : (isLight ? '#94a3b8' : '#3f3f46')}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        flexShrink: 0
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          transform: checked ? 'translateX(22px)' : 'translateX(0px)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease',
        }}
      >
        {checked && <Check size={11} color="#3b82f6" strokeWidth={3.5} />}
      </span>
    </button>
  );
};

const WidgetSidebar = ({ 
  isOpen, 
  onClose, 
  currentLayout = [], 
  activeTab = 'HOME', 
  onToggleWidget, 
  onActivateAll, 
  onDeactivateAll,
  onResetDefault,
  onApplyTemplate
}) => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODOS');
  const [currentView, setCurrentView] = useState('widgets'); // 'widgets' | 'templates'
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [templateFilterCategory, setTemplateFilterCategory] = useState('TODAS');
  const jsonFileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 2800);
  };

  const allWidgetIds = useMemo(() => {
    // Usar la lista canónica de widgets únicos sin alias redundantes
    return CANONICAL_WIDGET_IDS;
  }, []);

  const activeWidgetIds = useMemo(() => {
    return currentLayout.map(item => item.i);
  }, [currentLayout]);

  const defaultWidgetIdsForTab = useMemo(() => {
    return DEFAULT_WIDGETS_BY_TAB[activeTab] || [];
  }, [activeTab]);

  const recommendedWidgetIdsForTab = useMemo(() => {
    return RECOMMENDED_BY_TAB[activeTab] || defaultWidgetIdsForTab;
  }, [activeTab, defaultWidgetIdsForTab]);

  const categories = ['TODOS', 'Recomendados', 'Tiempo', 'Debate', 'Mociones', 'Votaciones', 'Estadísticas', 'Configuración'];
  const templateCategories = ['TODAS', 'Debate', 'Votaciones', 'Configuración', 'Estadísticas', 'Tiempo'];

  // Ordenar los widgets colocando ARRIBA DE TODO los que son default y recomendados en el aspecto actual
  const sortedAndFilteredWidgets = useMemo(() => {
    const filtered = allWidgetIds.filter(id => {
      const meta = WIDGET_METADATA[id] || { title: id, category: 'Otros', description: '' };
      const isRec = recommendedWidgetIdsForTab.includes(id);
      const isDef = defaultWidgetIdsForTab.includes(id);

      const matchesSearch = meta.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            meta.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = true;
      if (filterCategory === 'Recomendados') {
        matchesCategory = isRec || isDef;
      } else if (filterCategory !== 'TODOS') {
        matchesCategory = meta.category === filterCategory;
      }

      return matchesSearch && matchesCategory;
    });

    // Ordenamiento prioritario:
    // 1º Widgets Default para este aspecto (pestaña activa)
    // 2º Widgets Recomendados adicionales
    // 3º Resto de widgets
    return filtered.sort((a, b) => {
      const aIsDefault = defaultWidgetIdsForTab.includes(a);
      const bIsDefault = defaultWidgetIdsForTab.includes(b);
      const aIsRec = recommendedWidgetIdsForTab.includes(a);
      const bIsRec = recommendedWidgetIdsForTab.includes(b);

      const aScore = (aIsDefault ? 4 : 0) + (aIsRec ? 2 : 0);
      const bScore = (bIsDefault ? 4 : 0) + (bIsRec ? 2 : 0);

      if (aScore !== bScore) {
        return bScore - aScore; // mayor puntuación primero
      }

      // Orden secundario por título alfabético
      const aTitle = (WIDGET_METADATA[a]?.title || a).toLowerCase();
      const bTitle = (WIDGET_METADATA[b]?.title || b).toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }, [allWidgetIds, searchTerm, filterCategory, recommendedWidgetIdsForTab, defaultWidgetIdsForTab]);

  // Manejador para restablecer aspecto a su Default
  const handleResetToDefault = () => {
    if (onResetDefault) {
      onResetDefault(activeTab);
      showToast(`Layout restablecido al predeterminado de "${activeTab}"`);
    }
  };

  // Manejador para aplicar una plantilla
  const handleSelectTemplate = (template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template.widgets, activeTab);
      showToast(`Plantilla "${template.title}" aplicada en ${activeTab}`);
      setCurrentView('widgets');
    }
  };

  // Exportar layout actual como JSON
  const handleExportCurrentLayout = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLayout, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `plantilla_openmun_${activeTab.toLowerCase()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Plantilla exportada como JSON`);
    } catch (err) {
      showToast('Error al exportar plantilla', 'error');
    }
  };

  // Importar plantilla desde archivo JSON
  const handleImportJSONTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => item.i)) {
          if (onApplyTemplate) {
            onApplyTemplate(parsed, activeTab);
            showToast(`Plantilla importada con ${parsed.length} widgets`);
            setCurrentView('widgets');
          }
        } else {
          showToast('Formato JSON inválido para plantilla', 'error');
        }
      } catch (err) {
        showToast('Error al leer el archivo JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease-out'
        }} 
      />
      
      {/* Sidebar Content */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: '420px',
        maxWidth: '92vw',
        backgroundColor: 'var(--panel-color)',
        borderRight: '1px solid var(--border-color)',
        boxShadow: '10px 0 35px rgba(0,0,0,0.5)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        color: 'var(--text-color)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {/* Header con tabs de vista */}
        <div style={{ 
          padding: '1.25rem 1.5rem 1rem 1.5rem', 
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--card-header-bg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {currentView === 'templates' ? (
                <button
                  onClick={() => setCurrentView('widgets')}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                  title="Volver al catálogo de widgets"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : (
                <Sliders size={20} color="currentColor" />
              )}
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
                {currentView === 'templates' ? t('sidebar.templatesLibrary', 'Biblioteca de Plantillas') : t('sidebar.title', 'Gestor de Widgets')}
              </h3>
            </div>
            
            <button 
              onClick={onClose} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--muted-text)', 
                cursor: 'pointer', 
                display: 'flex',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.15s ease'
              }}
              title={t('common.close', 'Cerrar Panel')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Subheader info aspecto / pestaña */}
          <div style={{ 
            marginTop: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: isLight ? 'var(--text-color)' : '#a1a1aa',
            backgroundColor: isLight ? 'var(--subnav-bg)' : '#18181b',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: isLight ? '1px solid var(--border-color)' : '1px solid #27272a'
          }}>
            <span>{t('sidebar.tabAspect', 'Pestaña / Aspecto')}:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ 
                fontWeight: '800', 
                color: isLight ? '#1d4ed8' : '#60a5fa', 
                backgroundColor: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '4px',
                letterSpacing: '0.04em'
              }}>
                {activeTab}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                ({activeWidgetIds.length} {t('common.activePlural', 'activos')})
              </span>
            </div>
          </div>

          {/* Barra de Acciones Principales: DEFAULT & LOAD TEMPLATE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={handleResetToDefault}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                backgroundColor: isLight ? 'var(--card-header-bg)' : '#18181b',
                border: isLight ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #3b82f644',
                color: isLight ? '#1d4ed8' : '#60a5fa',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title={`Restablecer widgets al diseño por defecto de ${activeTab}`}
            >
              <RotateCcw size={14} />
              <span>{t('common.default', 'Default')} ({activeTab})</span>
            </button>

            <button
              onClick={() => setCurrentView(currentView === 'templates' ? 'widgets' : 'templates')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                backgroundColor: currentView === 'templates' 
                  ? (isLight ? '#ede9fe' : 'rgba(168, 85, 247, 0.2)') 
                  : (isLight ? 'var(--card-header-bg)' : '#18181b'),
                border: isLight 
                  ? (currentView === 'templates' ? '1px solid #8b5cf6' : '1px solid rgba(168, 85, 247, 0.35)') 
                  : (currentView === 'templates' ? '1px solid #a855f7' : '1px solid #a855f744'),
                color: isLight ? '#7c3aed' : '#c084fc',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title="Explorar y cargar plantillas predefinidas"
            >
              <LayoutTemplate size={14} />
              <span>{currentView === 'templates' ? t('sidebar.viewWidgets', 'Ver Widgets') : t('sidebar.templates', 'Plantillas')}</span>
            </button>
          </div>
        </div>

        {/* Notificación Toast Flotante */}
        {feedbackToast && (
          <div style={{
            margin: '0.75rem 1.5rem 0 1.5rem',
            padding: '0.5rem 0.85rem',
            backgroundColor: feedbackToast.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${feedbackToast.type === 'error' ? '#ef4444' : '#22c55e'}`,
            borderRadius: '6px',
            color: feedbackToast.type === 'error' ? '#fca5a5' : '#86efac',
            fontSize: '0.78rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {feedbackToast.type === 'error' ? <X size={15} /> : <Check size={15} />}
            <span>{feedbackToast.message}</span>
          </div>
        )}

        {/* ─── VISTA 1: GESTOR DE WIDGETS CON ORDENAMIENTO PRIORITARIO ─── */}
        {currentView === 'widgets' && (
          <>
            {/* Buscador & Categorías */}
            <div style={{ padding: '0.85rem 1.5rem 0.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Buscador */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                <input
                  type="text"
                  placeholder={t('sidebar.searchPlaceholder', 'Buscar widget por nombre o categoría...')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.83rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>

              {/* Categorías (Pills) con opción destacada "Recomendados" */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
                {categories.map(cat => {
                  const isSelected = filterCategory === cat;
                  const isRecPill = cat === 'Recomendados';
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.73rem',
                        fontWeight: isSelected ? '700' : '500',
                        borderRadius: '9999px',
                        border: isSelected 
                          ? (isRecPill ? '1px solid #f59e0b' : '1px solid var(--btn-bg)') 
                          : (isRecPill ? '1px solid #f59e0b44' : '1px solid var(--border-color)'),
                        backgroundColor: isSelected 
                          ? (isRecPill ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.15)') 
                          : (isRecPill ? 'rgba(245, 158, 11, 0.08)' : 'var(--card-header-bg)'),
                        color: isSelected 
                          ? (isRecPill ? '#d97706' : 'var(--btn-bg)') 
                          : (isRecPill ? '#f59e0b' : 'var(--muted-text)'),
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {isRecPill && <Star size={12} fill={isSelected ? 'currentColor' : 'none'} />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Botones de acción masiva */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                <button
                  onClick={onActivateAll}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    color: '#16a34a',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={13} /> {t('sidebar.activateAll', 'Activar Todos')}
                </button>
                <button
                  onClick={onDeactivateAll}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    color: '#dc2626',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <X size={13} /> {t('sidebar.deactivateAll', 'Desactivar Todos')}
                </button>
              </div>
            </div>

            {/* Lista de Widgets Ordenada con Default y Recomendados ARRIBA */}
            <div style={{ 
              padding: '0.75rem 1.5rem 1.5rem 1.5rem', 
              overflowY: 'auto', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem' 
            }}>
              {sortedAndFilteredWidgets.length === 0 ? (
                <div style={{ color: 'var(--muted-text)', textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem' }}>
                  {t('sidebar.noWidgetsFound', 'No se encontraron widgets para el filtro actual.')}
                </div>
              ) : (
                sortedAndFilteredWidgets.map(widgetId => {
                  const meta = WIDGET_METADATA[widgetId] || {
                    title: widgetId,
                    category: 'General',
                    description: 'Widget personalizado',
                    icon: Sliders,
                    iconBg: 'rgba(255, 255, 255, 0.1)',
                    iconColor: 'var(--text-color)'
                  };

                  const isActive = activeWidgetIds.includes(widgetId);
                  const isDefaultWidget = defaultWidgetIdsForTab.includes(widgetId);
                  const isRecommendedWidget = recommendedWidgetIdsForTab.includes(widgetId);
                  const IconComp = meta.icon || Sliders;

                  return (
                    <div 
                      key={widgetId}
                      onClick={() => onToggleWidget(widgetId, !isActive)}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: isActive ? 'var(--card-header-bg)' : 'var(--panel-color)',
                        border: isDefaultWidget 
                          ? (isActive ? '1px solid #3b82f6aa' : '1px solid #3b82f644')
                          : (isActive ? '1px solid var(--subborder-color)' : '1px solid var(--border-color)'),
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {/* Icono + Información */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: meta.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}>
                          <IconComp size={19} color={meta.iconColor} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                              {t(`sidebar.widgets.${widgetId}.title`, meta.title)}
                            </span>

                            {/* Badge Default del Aspecto Actual */}
                            {isDefaultWidget && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: '800',
                                color: '#2563eb',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                <Sparkles size={10} /> Default {activeTab}
                              </span>
                            )}

                            {/* Badge Recomendado si no es default */}
                            {!isDefaultWidget && isRecommendedWidget && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: '800',
                                color: '#d97706',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                <Star size={10} /> {t('sidebar.recommended', 'Recomendado')}
                              </span>
                            )}

                            {/* Badge Categoría */}
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              color: meta.iconColor,
                              backgroundColor: meta.iconBg,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px'
                            }}>
                              {t(`sidebar.widgets.${widgetId}.category`, meta.category)}
                            </span>
                          </div>

                          <div style={{ 
                            fontSize: '0.73rem', 
                            color: 'var(--muted-text)', 
                            marginTop: '0.2rem', 
                            lineHeight: '1.3',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {t(`sidebar.widgets.${widgetId}.description`, meta.description)}
                          </div>

                          {/* Badge de Estado */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem' }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#22c55e' : 'var(--muted-text)',
                              boxShadow: isActive ? '0 0 6px #22c55e' : 'none'
                            }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: isActive ? '#16a34a' : 'var(--muted-text)' }}>
                              {isActive ? t('common.active', 'ACTIVO') : t('common.inactive', 'INACTIVO')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Switch Toggle Estilizado */}
                      <StylizedToggle
                        checked={isActive}
                        onChange={() => onToggleWidget(widgetId, !isActive)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ─── VISTA 2: BIBLIOTECA DE PLANTILLAS (LOAD TEMPLATE) ─── */}
        {currentView === 'templates' && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto', 
            padding: '1rem 1.5rem 1.5rem 1.5rem', 
            gap: '1rem' 
          }}>
            {/* Filtros de Categoría de Plantillas */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
              {templateCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateFilterCategory(cat)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.73rem',
                    fontWeight: templateFilterCategory === cat ? '700' : '500',
                    borderRadius: '9999px',
                    border: templateFilterCategory === cat ? '1px solid #a855f7' : '1px solid var(--border-color)',
                    backgroundColor: templateFilterCategory === cat ? 'rgba(168, 85, 247, 0.2)' : 'var(--card-header-bg)',
                    color: templateFilterCategory === cat ? '#a855f7' : 'var(--muted-text)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Listado de Tarjetas de Plantillas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {PRESET_TEMPLATES
                .filter(tpl => templateFilterCategory === 'TODAS' || tpl.category === templateFilterCategory)
                .map(template => {
                  const IconComp = template.icon || Layers;
                  const isMatchingTab = template.targetTab === activeTab;

                  return (
                    <div
                      key={template.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--panel-color)',
                        border: `1px solid ${isMatchingTab ? '#a855f7aa' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            backgroundColor: template.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComp size={18} color={template.iconColor} />
                          </div>

                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                              {template.title}
                            </div>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: '700',
                              color: template.iconColor,
                              backgroundColor: template.iconBg,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {template.badge}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectTemplate(template)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#a855f7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Zap size={13} />
                          <span>{t('sidebar.loadIn', 'Cargar en')} {activeTab}</span>
                        </button>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', lineHeight: '1.35' }}>
                        {template.description}
                      </div>

                      {/* Lista de widgets que contiene la plantilla */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.1rem' }}>
                        {template.widgets.map(w => {
                          const meta = WIDGET_METADATA[w.i] || { title: w.i };
                          return (
                            <span
                              key={w.i}
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--text-color)',
                                backgroundColor: 'var(--card-header-bg)',
                                border: '1px solid var(--subborder-color)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px'
                              }}
                            >
                              • {meta.title}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Sección de Importar / Exportar Plantillas JSON */}
            <div style={{
              marginTop: '0.5rem',
              padding: '1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                <Layers size={15} />
                <span>{t('sidebar.customTemplatesJson', 'Plantillas Personalizadas JSON')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={13} /> {t('common.importJson', 'Importar JSON')}
                </button>

                <button
                  onClick={handleExportCurrentLayout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={13} /> {t('common.export', 'Exportar')} {activeTab}
                </button>
              </div>

              <input
                type="file"
                ref={jsonFileInputRef}
                accept=".json"
                onChange={handleImportJSONTemplate}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WidgetSidebar;
