import { useState, useRef, useEffect, useCallback } from 'react';
import { COLS, MIN_ROWS, ROW_HEIGHT, GAP, getCellSize } from '../utils/gridUtils';
import configMaster from '../config/config_master.json';
import { WIDGET_METADATA } from '../components/panels/WidgetSidebar';
import WidgetRegistry from '../components/widgets/WidgetRegistry';

/**
 * Hook para la gestión completa de la cuadrícula interactiva de widgets (Drag, Resize, Toggles y Layouts)
 */
export function useGridLayout({ activeTab, config, setConfig }) {
  const [boardW, setBoardW] = useState(0);
  const [focusedWidgetId, setFocusedWidgetId] = useState(null);
  const [activeInteraction, setActiveInteraction] = useState(null);

  // Referencias mutables
  const activeTabRef = useRef(activeTab);
  const activeInteractionRef = useRef(null);
  const boardResizeObserverRef = useRef(null);
  const boardNodeRef = useRef(null);

  // Mantener referencia actualizada de la pestaña activa para evitar stale closures
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Callback ref: se ejecuta cada vez que el contenedor DOM del tablero se monta o desmonta
  const boardRef = useCallback((node) => {
    if (boardResizeObserverRef.current) {
      boardResizeObserverRef.current.disconnect();
      boardResizeObserverRef.current = null;
    }
    boardNodeRef.current = node;
    if (node) {
      setBoardW(node.offsetWidth);
      const observer = new ResizeObserver(() => {
        setBoardW(node.offsetWidth);
      });
      observer.observe(node);
      boardResizeObserverRef.current = observer;
    } else {
      setBoardW(0);
    }
  }, []);

  // Lista de widgets actuales para la pestaña activa
  const widgets = (config?.layouts && config.layouts[activeTab]) || configMaster.layouts[activeTab] || [];

  // Actualizador seguro para la pestaña activa
  const updateActiveLayout = useCallback((updater) => {
    const currentTab = activeTabRef.current;
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      const currentWidgets = prevLayouts[currentTab] || configMaster.layouts[currentTab] || [];
      const newWidgets = typeof updater === 'function' ? updater(currentWidgets) : updater;
      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [currentTab]: newWidgets
        }
      };
    });
  }, [setConfig]);

  // Iniciar Arrastre (Drag)
  const handleStartDrag = useCallback((e, widgetId) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusedWidgetId(widgetId);

    const currentLayout = (config?.layouts && config.layouts[activeTabRef.current]) || configMaster.layouts[activeTabRef.current] || [];
    const targetWidget = currentLayout.find(w => w.i === widgetId);
    if (!targetWidget) return;

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    const dragData = {
      type: 'drag',
      widgetId,
      startX: clientX,
      startY: clientY,
      startCol: targetWidget.col,
      startRow: targetWidget.row,
      colSpan: targetWidget.colSpan,
      rowSpan: targetWidget.rowSpan
    };

    activeInteractionRef.current = dragData;
    setActiveInteraction(dragData);
  }, [config]);

  // Iniciar Redimensionamiento (Resize)
  const handleStartResize = useCallback((e, widgetId) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusedWidgetId(widgetId);

    const currentLayout = (config?.layouts && config.layouts[activeTabRef.current]) || configMaster.layouts[activeTabRef.current] || [];
    const targetWidget = currentLayout.find(w => w.i === widgetId);
    if (!targetWidget) return;

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    const resizeData = {
      type: 'resize',
      widgetId,
      startX: clientX,
      startY: clientY,
      startCol: targetWidget.col,
      startRow: targetWidget.row,
      startColSpan: targetWidget.colSpan,
      startRowSpan: targetWidget.rowSpan
    };

    activeInteractionRef.current = resizeData;
    setActiveInteraction(resizeData);
  }, [config]);

  // Movimiento de puntero
  const handlePointerMove = useCallback((e) => {
    const active = activeInteractionRef.current;
    if (!active || !boardNodeRef.current || boardW === 0) return;

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    const dx = clientX - active.startX;
    const dy = clientY - active.startY;

    const { cellW, cellH } = getCellSize(boardW);
    const colDelta = Math.round(dx / (cellW + GAP));
    const rowDelta = Math.round(dy / (cellH + GAP));

    if (active.type === 'drag') {
      const newCol = Math.max(0, Math.min(COLS - active.colSpan, active.startCol + colDelta));
      const newRow = Math.max(0, active.startRow + rowDelta);

      updateActiveLayout(prev => {
        const target = prev.find(w => w.i === active.widgetId);
        if (!target || (target.col === newCol && target.row === newRow)) {
          return prev;
        }
        return prev.map(w => {
          if (w.i !== active.widgetId) return w;
          return { ...w, col: newCol, row: newRow };
        });
      });
    } else if (active.type === 'resize') {
      const newColSpan = Math.max(1, Math.min(COLS - active.startCol, active.startColSpan + colDelta));
      const newRowSpan = Math.max(1, active.startRowSpan + rowDelta);

      updateActiveLayout(prev => {
        const target = prev.find(w => w.i === active.widgetId);
        if (!target || (target.colSpan === newColSpan && target.rowSpan === newRowSpan)) {
          return prev;
        }
        return prev.map(w => {
          if (w.i !== active.widgetId) return w;
          return { ...w, colSpan: newColSpan, rowSpan: newRowSpan };
        });
      });
    }
  }, [boardW, updateActiveLayout]);

  // Finalizar interacción
  const handlePointerUp = useCallback(() => {
    if (activeInteractionRef.current) {
      activeInteractionRef.current = null;
      setActiveInteraction(null);
    }
  }, []);

  // Listeners globales para arrastre fluido
  useEffect(() => {
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Toggle de un Widget individual
  const handleToggleWidget = useCallback((widgetId, shouldBeActive) => {
    const currentTab = activeTabRef.current;
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      const currentWidgets = prevLayouts[currentTab] || configMaster.layouts[currentTab] || [];
      const exists = currentWidgets.some(w => w.i === widgetId);

      let nextWidgets = [...currentWidgets];

      if (shouldBeActive && !exists) {
        const meta = WIDGET_METADATA[widgetId] || { defaultColSpan: 8, defaultRowSpan: 6 };
        const maxRow = currentWidgets.reduce((max, w) => Math.max(max, w.row + w.rowSpan), 0);

        nextWidgets.push({
          i: widgetId,
          col: 0,
          row: maxRow,
          colSpan: meta.defaultColSpan || 8,
          rowSpan: meta.defaultRowSpan || 6
        });
      } else if (!shouldBeActive && exists) {
        nextWidgets = nextWidgets.filter(w => w.i !== widgetId);
      }

      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [currentTab]: nextWidgets
        }
      };
    });
  }, [setConfig]);

  // Activar todos los widgets
  const handleActivateAll = useCallback(() => {
    const currentTab = activeTabRef.current;
    const allIds = Object.keys(WidgetRegistry);
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      let currentRow = 0;
      let currentCol = 0;

      const newWidgets = allIds.map(id => {
        const meta = WIDGET_METADATA[id] || { defaultColSpan: 8, defaultRowSpan: 6 };
        const colSpan = meta.defaultColSpan || 8;
        const rowSpan = meta.defaultRowSpan || 6;

        if (currentCol + colSpan > COLS) {
          currentCol = 0;
          currentRow += 6;
        }

        const widget = { i: id, col: currentCol, row: currentRow, colSpan, rowSpan };
        currentCol += colSpan;
        return widget;
      });

      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [currentTab]: newWidgets
        }
      };
    });
  }, [setConfig]);

  // Desactivar todos los widgets de la pestaña activa
  const handleDeactivateAll = useCallback(() => {
    const currentTab = activeTabRef.current;
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [currentTab]: []
        }
      };
    });
  }, [setConfig]);

  // Restablecer layout por defecto
  const handleResetDefault = useCallback((targetTab) => {
    const tabToReset = targetTab || activeTabRef.current;
    const defaultWidgets = configMaster.layouts[tabToReset] || [];
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [tabToReset]: JSON.parse(JSON.stringify(defaultWidgets))
        }
      };
    });
  }, [setConfig]);

  // Aplicar plantilla de widgets
  const handleApplyTemplate = useCallback((templateWidgets, targetTab) => {
    const tabToApply = targetTab || activeTabRef.current;
    setConfig(prev => {
      const prevLayouts = prev?.layouts || configMaster.layouts;
      return {
        ...prev,
        layouts: {
          ...prevLayouts,
          [tabToApply]: JSON.parse(JSON.stringify(templateWidgets))
        }
      };
    });
  }, [setConfig]);

  const removeWidget = useCallback((id) => {
    handleToggleWidget(id, false);
  }, [handleToggleWidget]);

  // Cálculo de dimensiones de la rejilla
  const { cellW, cellH } = boardW ? getCellSize(boardW) : { cellW: 0, cellH: 0 };
  const maxRowUsed = widgets.reduce((max, w) => Math.max(max, w.row + w.rowSpan), MIN_ROWS);
  const boardHeight = GAP + maxRowUsed * (ROW_HEIGHT + GAP);

  return {
    boardRef,
    boardW,
    widgets,
    cellW,
    cellH,
    maxRowUsed,
    boardHeight,
    focusedWidgetId,
    setFocusedWidgetId,
    activeInteraction,
    handleStartDrag,
    handleStartResize,
    handleToggleWidget,
    handleActivateAll,
    handleDeactivateAll,
    handleResetDefault,
    handleApplyTemplate,
    removeWidget
  };
}

export default useGridLayout;
