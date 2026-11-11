import i18n from '../../languages/index.js';
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
import { useToast } from '../../context/ToastContext';
import { TAB_CONFIG } from '../../utils/dashboardTabs';

const CATEGORY_LABEL_KEYS = {
  TODOS: 'sidebar.categories.allUpper',
  TODAS: 'sidebar.categories.allFemUpper',
  Recomendados: 'sidebar.categories.recommended',
  Tiempo: 'sidebar.categories.time',
  Debate: 'sidebar.categories.debate',
  Mociones: 'sidebar.categories.motions',
  Votaciones: 'sidebar.categories.voting',
  Estadísticas: 'sidebar.categories.statistics',
  Configuración: 'sidebar.categories.settings',
};

// Metadata rica para cada widget disponible
export const WIDGET_METADATA = {
  cronometro_enmiendas: {
    get title() { return i18n.t('sidebar.widgets.cronometro_enmiendas.title'); },
    get category() { return i18n.t('sidebar.widgets.cronometro_enmiendas.category'); },
    get description() { return i18n.t('sidebar.widgets.cronometro_enmiendas.description'); },
    icon: Clock,
    defaultColSpan: 4,
    defaultRowSpan: 3,
  },
  controlador_enmiendas: {
    get title() { return i18n.t('sidebar.widgets.controlador_enmiendas.title'); },
    get category() { return i18n.t('sidebar.widgets.controlador_enmiendas.category'); },
    get description() { return i18n.t('sidebar.widgets.controlador_enmiendas.description'); },
    icon: FileSignature,
    defaultColSpan: 7,
    defaultRowSpan: 6,
  },
  panel_enmiendas_votacion: {
    get title() { return i18n.t('sidebar.widgets.panel_enmiendas_votacion.title'); },
    get category() { return i18n.t('sidebar.widgets.panel_enmiendas_votacion.category'); },
    get description() { return i18n.t('sidebar.widgets.panel_enmiendas_votacion.description'); },
    icon: Vote,
    defaultColSpan: 5,
    defaultRowSpan: 6,
  },
  mini_votacion: {
    get title() { return i18n.t('sidebar.widgets.mini_votacion.title'); },
    get category() { return i18n.t('sidebar.widgets.mini_votacion.category'); },
    get description() { return i18n.t('sidebar.widgets.mini_votacion.description'); },
    icon: Vote,
    defaultColSpan: 5,
    defaultRowSpan: 6,
  },
  mapa_votacion: {
    get title() { return i18n.t('sidebar.widgets.mapa_votacion.title'); },
    get category() { return i18n.t('sidebar.widgets.mapa_votacion.category'); },
    get description() { return i18n.t('sidebar.widgets.mapa_votacion.description'); },
    icon: Map,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  pizarra_interactiva: {
    get title() { return i18n.t('sidebar.widgets.pizarra_interactiva.title'); },
    get category() { return i18n.t('sidebar.widgets.pizarra_interactiva.category'); },
    get description() { return i18n.t('sidebar.widgets.pizarra_interactiva.description'); },
    icon: Palette,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  tele_noticias: {
    get title() { return i18n.t('sidebar.widgets.tele_noticias.title'); },
    get category() { return i18n.t('sidebar.widgets.tele_noticias.category'); },
    get description() { return i18n.t('sidebar.widgets.tele_noticias.description'); },
    icon: Tv,
    defaultColSpan: 6,
    defaultRowSpan: 5,
  },
  selector_aleatorio: {
    get title() { return i18n.t('sidebar.widgets.selector_aleatorio.title'); },
    get category() { return i18n.t('sidebar.widgets.selector_aleatorio.category'); },
    get description() { return i18n.t('sidebar.widgets.selector_aleatorio.description'); },
    icon: Dices,
    defaultColSpan: 5,
    defaultRowSpan: 5,
  },
  gestor_crisis: {
    get title() { return i18n.t('sidebar.widgets.gestor_crisis.title'); },
    get category() { return i18n.t('sidebar.widgets.gestor_crisis.category'); },
    get description() { return i18n.t('sidebar.widgets.gestor_crisis.description'); },
    icon: Flame,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  anadir_paises_gsl: {
    get title() { return i18n.t('sidebar.widgets.anadir_paises_gsl.title'); },
    get category() { return i18n.t('sidebar.widgets.anadir_paises_gsl.category'); },
    get description() { return i18n.t('sidebar.widgets.anadir_paises_gsl.description'); },
    icon: UserPlus,
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  anadir_paises_debate: {
    get title() { return i18n.t('sidebar.widgets.anadir_paises_debate.title'); },
    get category() { return i18n.t('sidebar.widgets.anadir_paises_debate.category'); },
    get description() { return i18n.t('sidebar.widgets.anadir_paises_debate.description'); },
    icon: Timer,
    defaultColSpan: 4,
    defaultRowSpan: 5,
  },
  establecer_agenda: {
    get title() { return i18n.t('sidebar.widgets.establecer_agenda.title'); },
    get category() { return i18n.t('sidebar.widgets.establecer_agenda.category'); },
    get description() { return i18n.t('sidebar.widgets.establecer_agenda.description'); },
    icon: FileCheck2,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  votacion_oficial: {
    get title() { return i18n.t('sidebar.widgets.votacion_oficial.title'); },
    get category() { return i18n.t('sidebar.widgets.votacion_oficial.category'); },
    get description() { return i18n.t('sidebar.widgets.votacion_oficial.description'); },
    icon: Vote,
    defaultColSpan: 7,
    defaultRowSpan: 5,
  },
  cronometro_principal: {
    get title() { return i18n.t('sidebar.widgets.cronometro_principal.title'); },
    get category() { return i18n.t('sidebar.widgets.cronometro_principal.category'); },
    get description() { return i18n.t('sidebar.widgets.cronometro_principal.description'); },
    icon: Clock,
    defaultColSpan: 6,
    defaultRowSpan: 3,
  },
  lista_oradores: {
    get title() { return i18n.t('sidebar.widgets.lista_oradores.title'); },
    get category() { return i18n.t('sidebar.widgets.lista_oradores.category'); },
    get description() { return i18n.t('sidebar.widgets.lista_oradores.description'); },
    icon: Users,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  pizarra_mociones: {
    get title() { return i18n.t('sidebar.widgets.pizarra_mociones.title'); },
    get category() { return i18n.t('sidebar.widgets.pizarra_mociones.category'); },
    get description() { return i18n.t('sidebar.widgets.pizarra_mociones.description'); },
    icon: FileText,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  cronometro_dual: {
    get title() { return i18n.t('sidebar.widgets.cronometro_dual.title'); },
    get category() { return i18n.t('sidebar.widgets.cronometro_dual.category'); },
    get description() { return i18n.t('sidebar.widgets.cronometro_dual.description'); },
    icon: Timer,
    defaultColSpan: 5,
    defaultRowSpan: 4,
  },
  cronometro_only_time: {
    get title() { return i18n.t('sidebar.widgets.cronometro_only_time.title'); },
    get category() { return i18n.t('sidebar.widgets.cronometro_only_time.category'); },
    get description() { return i18n.t('sidebar.widgets.cronometro_only_time.description'); },
    icon: Hourglass,
    defaultColSpan: 5,
    defaultRowSpan: 3,
  },
  matriz_paises: {
    get title() { return i18n.t('sidebar.widgets.matriz_paises.title'); },
    get category() { return i18n.t('sidebar.widgets.matriz_paises.category'); },
    get description() { return i18n.t('sidebar.widgets.matriz_paises.description'); },
    icon: Globe,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  historico_delegaciones: {
    get title() { return i18n.t('sidebar.widgets.historico_delegaciones.title'); },
    get category() { return i18n.t('sidebar.widgets.historico_delegaciones.category'); },
    get description() { return i18n.t('sidebar.widgets.historico_delegaciones.description'); },
    icon: BarChart3,
    defaultColSpan: 6,
    defaultRowSpan: 4,
  },
  importar_paises: {
    get title() { return i18n.t('sidebar.widgets.importar_paises.title'); },
    get category() { return i18n.t('sidebar.widgets.importar_paises.category'); },
    get description() { return i18n.t('sidebar.widgets.importar_paises.description'); },
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
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODOS');
  const [currentView, setCurrentView] = useState('widgets'); // 'widgets' | 'templates'
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [templateFilterCategory, setTemplateFilterCategory] = useState('TODAS');
  const jsonFileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    addToast({ title: t('ui.widgetsTemplates'), message, type: type === 'error' ? 'error' : 'success' });
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
      showToast(t('ui.templateExportedAsJson'));
    } catch {
      showToast(t('ui.errorExportingTemplate'), 'error');
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
          showToast(t('ui.invalidJsonTemplateFormat'), 'error');
        }
      } catch (err) {
        showToast(t('ui.errorReadingJsonFile') + err.message, 'error');
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
                {t(TAB_CONFIG[activeTab]?.labelKey, activeTab)}
              </span>
              <span className="widget-sidebar-count">
                ({activeWidgetIds.length} {activeWidgetIds.length === 1 ? t('common.activeSingular', 'activo') : t('common.activePlural', 'activos')})
              </span>
            </div>
          </div>

          {/* Barra de Acciones Principales: DEFAULT & LOAD TEMPLATE */}
          <div className="widget-sidebar-view-actions">
            <button
              type="button"
              className="widget-sidebar-btn-secondary"
              onClick={handleResetToDefault}
              title={t('ui.resetWidgetsToTheDefaultLayout', { v0: activeTab })}
            >
              <RotateCcw size={14} />
              <span>{t('common.default', 'Default')} ({t(TAB_CONFIG[activeTab]?.labelKey, activeTab)})</span>
            </button>

            <button
              type="button"
              className={`widget-sidebar-btn-secondary${currentView === 'templates' ? ' is-active' : ''}`}
              aria-pressed={currentView === 'templates'}
              onClick={() => setCurrentView(currentView === 'templates' ? 'widgets' : 'templates')}
              title={currentView === 'templates' ? t('sidebar.backToWidgets') : t('ui.browseAndLoadPredefinedTemplates')}
            >
              <LayoutTemplate size={14} />
              <span>{currentView === 'templates' ? t('sidebar.viewWidgets', 'Ver Widgets') : t('sidebar.templates', 'Plantillas')}</span>
            </button>
          </div>
        </div>



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
                  const label = t(CATEGORY_LABEL_KEYS[cat] || `sidebar.categories.${cat.toLowerCase()}`, cat);
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
                      <span>{label}</span>
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
                    category: t('views.staff.priorityGeneral'),
                    description: t('ui.customWidget'),
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
                              <Check size={10} /> {t('ui.default')} {activeTab}
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
              {templateCategories.map(cat => {
                const label = t(CATEGORY_LABEL_KEYS[cat] || `sidebar.categories.${cat.toLowerCase()}`, cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={templateFilterCategory === cat}
                    className={`widget-sidebar-pill${templateFilterCategory === cat ? ' is-active' : ''}`}
                    onClick={() => setTemplateFilterCategory(cat)}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
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
