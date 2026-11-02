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
  UserPlus,
  RotateCcw,
  LayoutTemplate,
  Star,
  ChevronLeft,
  Download,
  Layers,
  Dices,
  Flame,
  Tv,
  Palette,
  Map,
  FileSignature
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PRESET_TEMPLATES } from '../../plantillas/widgets';

// Metadata rica para cada widget disponible
export const WIDGET_METADATA = {
  cronometro_enmiendas: {
    title: 'Cronómetro de Enmiendas',
    category: 'Debate',
    description: 'Temporizador compacto para oradores en debate de enmiendas, con selección de país y presets sincronizados.',
    icon: Clock,
    defaultColSpan: 4,
    defaultRowSpan: 3,
  },
  controlador_enmiendas: {
    title: 'Controlador de Enmiendas & Resolución',
    category: 'Debate',
    description: 'Gestión de borradores de resolución (.txt, .md, Google Docs), desglose por artículos y formulación de mociones.',
    icon: FileSignature,
    defaultColSpan: 7,
    defaultRowSpan: 6,
  },
  panel_enmiendas_votacion: {
    title: 'Debate & Votación de Enmiendas',
    category: 'Votaciones',
    description: 'Panel unificado con orador activo, presets de cronómetro y votación rápida de enmiendas.',
    icon: Vote,
    defaultColSpan: 5,
    defaultRowSpan: 6,
  },
  mini_votacion: {
    title: 'Mini Sistema de Votación (Roll Call)',
    category: 'Votaciones',
    description: 'Votación nominal sincronizada en tiempo real para enmiendas con flujo ágil de Roll Call en segunda ronda.',
    icon: Vote,
    defaultColSpan: 5,
    defaultRowSpan: 6,
  },
  mapa_votacion: {
    title: 'Mapa Mundial de Votación',
    category: 'Votaciones',
    description: 'Mapa geopolítico interactivo que colorea en tiempo real cada país según su voto con zoom y tooltips.',
    icon: Map,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  pizarra_interactiva: {
    title: 'Pizarra Interactiva & Mapas',
    category: 'Debate',
    description: 'Lienzo táctico para dibujar, marcar posiciones geopolíticas y hacer anotaciones sobre mapas o imágenes.',
    icon: Palette,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  tele_noticias: {
    title: 'Televisión de Noticias (En Vivo)',
    category: 'Debate',
    description: 'Monitor con forma de TV que emite exclusivamente la alerta de crisis o noticia proyectada en directo.',
    icon: Tv,
    defaultColSpan: 6,
    defaultRowSpan: 5,
  },
  selector_aleatorio: {
    title: 'Selector Aleatorio (Ruleta)',
    category: 'Debate',
    description: 'Ruleta animada y sorteo de delegaciones ("Cold Calling") para dinamizar el debate del comité.',
    icon: Dices,
    defaultColSpan: 5,
    defaultRowSpan: 5,
  },
  gestor_crisis: {
    title: 'Gestor de Crisis & Noticiero',
    category: 'Debate',
    description: 'Titulares en vivo estilo noticiero TV ("Última Hora"), reloj de simulación y línea temporal de crisis.',
    icon: Flame,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  anadir_paises_gsl: {
    title: 'Añadir Países GSL',
    category: 'Debate',
    description: 'Búsqueda rápida y selección de países para la Lista General de Oradores (GSL).',
    icon: UserPlus,
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  anadir_paises_debate: {
    title: 'Añadir Países Debate',
    category: 'Debate',
    description: 'Búsqueda rápida y selección de países para Caucus Moderado y Debate.',
    icon: Timer,
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  establecer_agenda: {
    title: 'Comité y Agenda',
    category: 'Configuración',
    description: 'Nombre del comité, puntos de agenda, turnos a favor y en contra y votación a mano alzada.',
    icon: FileCheck2,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  votacion_oficial: {
    title: 'Sistema de Votación Oficial',
    category: 'Votaciones',
    description: 'Votación Procedimental vs Sustantiva, tipos de mayoría, Veto P5, orden alfabético y Roll Call.',
    icon: Vote,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  cronometro_principal: {
    title: 'Cronómetro Principal',
    category: 'Tiempo',
    description: 'Temporizador para discursos de delegaciones con tiempos predefinidos y ceder palabra.',
    icon: Clock,
    defaultColSpan: 6,
    defaultRowSpan: 3,
  },
  lista_oradores: {
    title: 'Lista de Oradores',
    category: 'Debate',
    description: 'Gestión de la cola de oradores GSL y control de turnos en directo.',
    icon: Users,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  pizarra_mociones: {
    title: 'Pizarra de Mociones',
    category: 'Mociones',
    description: 'Registro interactivo, ordenamiento y votación rápida de mociones de debate.',
    icon: FileText,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  cronometro_dual: {
    title: 'Cronómetro Dual',
    category: 'Tiempo',
    description: 'Reloj doble para tiempo individual por orador y tiempo total acumulado del caucus.',
    icon: Timer,
    defaultColSpan: 5,
    defaultRowSpan: 4,
  },
  cronometro_only_time: {
    title: 'Cronómetro Solo Tiempo',
    category: 'Tiempo',
    description: 'Temporizador simplificado de tiempo total para libres negociaciones y pausas.',
    icon: Hourglass,
    defaultColSpan: 5,
    defaultRowSpan: 3,
  },
  matriz_paises: {
    title: 'Matriz de Países',
    category: 'Votaciones',
    description: 'Control de asistencia, derecho a veto, quórum y votaciones nominales roll-call.',
    icon: Globe,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  historico_delegaciones: {
    title: 'Histórico Delegaciones',
    category: 'Estadísticas',
    description: 'Estadísticas de participación, interrupciones e intervenciones del comité.',
    icon: BarChart3,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  importar_paises: {
    title: 'Importar Países',
    category: 'Configuración',
    description: 'Carga delegaciones desde archivo xlsx, csv o json, o añádelas manualmente.',
    icon: Upload,
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
  'panel_enmiendas_votacion',
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
  ENMIENDAS: ['controlador_enmiendas', 'panel_enmiendas_votacion', 'mini_votacion', 'cronometro_enmiendas'],
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
  ENMIENDAS: ['controlador_enmiendas', 'panel_enmiendas_votacion', 'mini_votacion', 'cronometro_enmiendas', 'votacion_oficial', 'matriz_paises'],
  INFO: ['matriz_paises', 'historico_delegaciones'],
  LIBRE: ['mapa_votacion', 'pizarra_interactiva', 'selector_aleatorio', 'gestor_crisis', 'tele_noticias', 'controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas'],
  HOME: ['lista_oradores', 'cronometro_principal', 'pizarra_mociones', 'votacion_oficial', 'matriz_paises', 'mapa_votacion', 'pizarra_interactiva', 'establecer_agenda', 'selector_aleatorio', 'gestor_crisis', 'tele_noticias', 'controlador_enmiendas', 'mini_votacion', 'cronometro_enmiendas']
};

// Re-exportar plantillas predefinidas importadas modularmente
export { PRESET_TEMPLATES };

// Componente Toggle Switch sobrio y accesible según el OpenMUN Design System
const StylizedToggle = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="widget-sidebar-toggle-switch"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
    >
      <span className="widget-sidebar-toggle-thumb" />
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

  // Ordenar widgets colocando primero los default y recomendados en el aspecto actual
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

    return filtered.sort((a, b) => {
      const aIsDefault = defaultWidgetIdsForTab.includes(a);
      const bIsDefault = defaultWidgetIdsForTab.includes(b);
      const aIsRec = recommendedWidgetIdsForTab.includes(a);
      const bIsRec = recommendedWidgetIdsForTab.includes(b);

      const aScore = (aIsDefault ? 4 : 0) + (aIsRec ? 2 : 0);
      const bScore = (bIsDefault ? 4 : 0) + (bIsRec ? 2 : 0);

      if (aScore !== bScore) {
        return bScore - aScore;
      }

      const aTitle = (WIDGET_METADATA[a]?.title || a).toLowerCase();
      const bTitle = (WIDGET_METADATA[b]?.title || b).toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }, [allWidgetIds, searchTerm, filterCategory, recommendedWidgetIdsForTab, defaultWidgetIdsForTab]);

  const handleResetToDefault = () => {
    if (onResetDefault) {
      onResetDefault(activeTab);
      showToast(`Layout restablecido al predeterminado de "${activeTab}"`);
    }
  };

  const handleSelectTemplate = (template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template.widgets, activeTab);
      showToast(`Plantilla "${template.title}" aplicada en ${activeTab}`);
      setCurrentView('widgets');
    }
  };

  const handleExportCurrentLayout = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLayout, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `plantilla_openmun_${activeTab.toLowerCase()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Plantilla exportada como JSON');
    } catch {
      showToast('Error al exportar plantilla', 'error');
    }
  };

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
        className="widget-sidebar-overlay"
        onClick={onClose} 
      />
      
      {/* Sidebar Content Panel */}
      <aside 
        className="widget-sidebar-panel"
        role="dialog"
        aria-modal="true"
        aria-label={currentView === 'templates' ? t('sidebar.templatesLibrary', 'Biblioteca de Plantillas') : t('sidebar.title', 'Gestor de Widgets')}
      >
        {/* Header con tabs de vista */}
        <div className="widget-sidebar-header">
          <div className="widget-sidebar-title-row">
            <h3 className="widget-sidebar-title">
              {currentView === 'templates' ? (
                <button
                  type="button"
                  className="widget-sidebar-back-btn"
                  onClick={() => setCurrentView('widgets')}
                  title={t('sidebar.backToWidgets', 'Volver al catálogo de widgets')}
                >
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <Sliders size={18} />
              )}
              <span>
                {currentView === 'templates' ? t('sidebar.templatesLibrary', 'Biblioteca de Plantillas') : t('sidebar.title', 'Gestor de Widgets')}
              </span>
            </h3>
            
            <button 
              type="button"
              className="widget-sidebar-close-btn"
              onClick={onClose} 
              title={t('common.close', 'Cerrar Panel')}
              aria-label={t('common.close', 'Cerrar Panel')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Subheader info aspecto / pestaña */}
          <div className="widget-sidebar-context">
            <span>{t('sidebar.tabAspect', 'Pestaña / Aspecto')}:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="widget-sidebar-tab-pill">
                {activeTab}
              </span>
              <span className="widget-sidebar-count">
                ({activeWidgetIds.length} {t('common.activePlural', 'activos')})
              </span>
            </div>
          </div>

          {/* Barra de Acciones Principales: DEFAULT & LOAD TEMPLATE */}
          <div className="widget-sidebar-view-actions">
            <button
              type="button"
              className="widget-sidebar-btn-secondary"
              onClick={handleResetToDefault}
              title={`Restablecer widgets al diseño por defecto de ${activeTab}`}
            >
              <RotateCcw size={14} />
              <span>{t('common.default', 'Default')} ({activeTab})</span>
            </button>

            <button
              type="button"
              className={`widget-sidebar-btn-secondary${currentView === 'templates' ? ' is-active' : ''}`}
              aria-pressed={currentView === 'templates'}
              onClick={() => setCurrentView(currentView === 'templates' ? 'widgets' : 'templates')}
              title={currentView === 'templates' ? 'Volver al catálogo de widgets' : 'Explorar y cargar plantillas predefinidas'}
            >
              <LayoutTemplate size={14} />
              <span>{currentView === 'templates' ? t('sidebar.viewWidgets', 'Ver Widgets') : t('sidebar.templates', 'Plantillas')}</span>
            </button>
          </div>
        </div>

        {/* Notificación Toast Flotante */}
        {feedbackToast && (
          <div className="widget-sidebar-toast" data-type={feedbackToast.type}>
            {feedbackToast.type === 'error' ? <X size={15} /> : <Check size={15} />}
            <span>{feedbackToast.message}</span>
          </div>
        )}

        {/* ─── VISTA 1: GESTOR DE WIDGETS ─── */}
        {currentView === 'widgets' && (
          <>
            {/* Buscador & Categorías */}
            <div className="widget-sidebar-search-container">
              {/* Buscador */}
              <div className="widget-sidebar-search-box">
                <Search size={15} />
                <input
                  type="text"
                  className="widget-sidebar-search-input"
                  placeholder={t('sidebar.searchPlaceholder', 'Buscar widget por nombre o categoría...')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Categorías (Pills) */}
              <div className="widget-sidebar-pills-row" role="tablist">
                {categories.map(cat => {
                  const isSelected = filterCategory === cat;
                  const isRecPill = cat === 'Recomendados';
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`widget-sidebar-pill${isSelected ? ' is-active' : ''}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {isRecPill && <Star size={12} fill={isSelected ? 'currentColor' : 'none'} />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Botones de acción masiva */}
              <div className="widget-sidebar-mass-actions">
                <button
                  type="button"
                  className="widget-sidebar-mass-btn"
                  onClick={onActivateAll}
                >
                  <Zap size={13} />
                  <span>{t('sidebar.activateAll', 'Activar Todos')}</span>
                </button>
                <button
                  type="button"
                  className="widget-sidebar-mass-btn"
                  onClick={onDeactivateAll}
                >
                  <X size={13} />
                  <span>{t('sidebar.deactivateAll', 'Desactivar Todos')}</span>
                </button>
              </div>
            </div>

            {/* Lista de Widgets Ordenada con Default y Recomendados ARRIBA */}
            <div className="widget-sidebar-list">
              {sortedAndFilteredWidgets.length === 0 ? (
                <div style={{ color: 'var(--muted-text)', textAlign: 'center', marginTop: '3rem', fontSize: '0.82rem' }}>
                  {t('sidebar.noWidgetsFound', 'No se encontraron widgets para el filtro actual.')}
                </div>
              ) : (
                sortedAndFilteredWidgets.map(widgetId => {
                  const meta = WIDGET_METADATA[widgetId] || {
                    title: widgetId,
                    category: 'General',
                    description: 'Widget personalizado',
                    icon: Sliders
                  };

                  const isActive = activeWidgetIds.includes(widgetId);
                  const isDefaultWidget = defaultWidgetIdsForTab.includes(widgetId);
                  const isRecommendedWidget = recommendedWidgetIdsForTab.includes(widgetId);
                  const IconComp = meta.icon || Sliders;

                  return (
                    <div 
                      key={widgetId}
                      className={`widget-sidebar-card${isActive ? ' is-active' : ''}`}
                      onClick={() => onToggleWidget(widgetId, !isActive)}
                    >
                      {/* Icono */}
                      <div className="widget-sidebar-card-icon">
                        <IconComp size={16} />
                      </div>

                      {/* Información */}
                      <div className="widget-sidebar-card-content">
                        <div className="widget-sidebar-card-header">
                          <span className="widget-sidebar-card-title">
                            {t(`sidebar.widgets.${widgetId}.title`, meta.title)}
                          </span>

                          {/* Badge Default del Aspecto Actual */}
                          {isDefaultWidget && (
                            <span className="widget-sidebar-badge-default">
                              <Check size={10} /> Default {activeTab}
                            </span>
                          )}

                          {/* Badge Recomendado si no es default */}
                          {!isDefaultWidget && isRecommendedWidget && (
                            <span className="widget-sidebar-badge-recommended">
                              <Star size={10} /> {t('sidebar.recommended', 'Recomendado')}
                            </span>
                          )}

                          {/* Badge Categoría */}
                          <span className="widget-sidebar-badge-category">
                            {t(`sidebar.widgets.${widgetId}.category`, meta.category)}
                          </span>
                        </div>

                        <div className="widget-sidebar-card-desc">
                          {t(`sidebar.widgets.${widgetId}.description`, meta.description)}
                        </div>

                        {/* Estado */}
                        <div className="widget-sidebar-card-status">
                          <span className={`widget-sidebar-status-dot${isActive ? ' is-active' : ''}`} />
                          <span className={`widget-sidebar-status-text${isActive ? ' is-active' : ''}`}>
                            {isActive ? t('common.active', 'ACTIVO') : t('common.inactive', 'INACTIVO')}
                          </span>
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

        {/* ─── VISTA 2: BIBLIOTECA DE PLANTILLAS ─── */}
        {currentView === 'templates' && (
          <div className="widget-sidebar-list">
            {/* Filtros de Categoría de Plantillas */}
            <div className="widget-sidebar-pills-row" style={{ padding: '4px 0 6px' }} role="tablist">
              {templateCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={templateFilterCategory === cat}
                  className={`widget-sidebar-pill${templateFilterCategory === cat ? ' is-active' : ''}`}
                  onClick={() => setTemplateFilterCategory(cat)}
                >
                  <span>{cat}</span>
                </button>
              ))}
            </div>

            {/* Listado de Tarjetas de Plantillas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRESET_TEMPLATES
                .filter(tpl => templateFilterCategory === 'TODAS' || tpl.category === templateFilterCategory)
                .map(template => {
                  const IconComp = template.icon || Layers;
                  const isMatchingTab = template.targetTab === activeTab;

                  return (
                    <div
                      key={template.id}
                      className={`widget-sidebar-template-card${isMatchingTab ? ' is-matching' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="widget-sidebar-card-icon">
                            <IconComp size={16} />
                          </div>

                          <div>
                            <div style={{ fontWeight: '650', fontSize: '0.85rem', color: 'var(--text-color)' }}>
                              {template.title}
                            </div>
                            <span className="widget-sidebar-badge-category">
                              {template.badge}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="widget-sidebar-btn-primary"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <Zap size={13} />
                          <span>{t('sidebar.loadIn', 'Cargar en')} {activeTab}</span>
                        </button>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', lineHeight: '1.35' }}>
                        {template.description}
                      </div>

                      {/* Lista de widgets que contiene la plantilla */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {template.widgets.map(w => {
                          const meta = WIDGET_METADATA[w.i] || { title: w.i };
                          return (
                            <span
                              key={w.i}
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--muted-text)',
                                backgroundColor: 'var(--card-header-bg)',
                                border: '1px solid var(--subborder-color)',
                                padding: '2px 6px',
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
            <div className="widget-sidebar-json-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '650', color: 'var(--muted-text)' }}>
                <Layers size={14} />
                <span>{t('sidebar.customTemplatesJson', 'Plantillas Personalizadas JSON')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="widget-sidebar-btn-secondary"
                  onClick={() => jsonFileInputRef.current?.click()}
                >
                  <Upload size={13} />
                  <span>{t('common.importJson', 'Importar JSON')}</span>
                </button>

                <button
                  type="button"
                  className="widget-sidebar-btn-secondary"
                  onClick={handleExportCurrentLayout}
                >
                  <Download size={13} />
                  <span>{t('common.export', 'Exportar')} {activeTab}</span>
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
      </aside>
    </>
  );
};

export default WidgetSidebar;
