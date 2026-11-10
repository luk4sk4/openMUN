import React, { useMemo } from 'react';
import { COLS, GAP } from '../../utils/gridUtils';
import { FIXED_LAYOUTS } from '../../utils/fixedLayouts';
import WidgetCard from './WidgetCard';

const WidgetGridBoard = ({
  activeTab,
  fixedLayout = false,
  boardRef,
  boardW,
  boardHeight,
  maxRowUsed,
  cellW,
  cellH,
  widgets,
  isLight,
  activeInteraction,
  focusedWidgetId,
  setFocusedWidgetId,
  handleStartDrag,
  handleStartResize,
  removeWidget
}) => {
  const gridCells = useMemo(() => {
    if (boardW <= 0 || !maxRowUsed) return null;
    return Array.from({ length: maxRowUsed }, (_, row) =>
      Array.from({ length: COLS }, (_, col) => {
        const x = GAP + col * (cellW + GAP);
        const y = GAP + row * (cellH + GAP);
        return (
          <div
            key={`cell-${col}-${row}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cellW,
              height: cellH,
              border: '1px dashed var(--grid-line)',
              borderRadius: '6px',
              backgroundColor: 'rgba(128,128,128,0.01)',
              pointerEvents: 'none',
              transition: 'border-color 0.3s ease'
            }}
          />
        );
      })
    );
  }, [boardW, maxRowUsed, cellW, cellH]);

  if (fixedLayout) {
    const panels = FIXED_LAYOUTS[activeTab] || [];
    const rows = Math.max(1, ...panels.map(panel => panel.row + panel.rowSpan));
    return <main className="dashboard-fixed-view">
      <div key={activeTab} className={`dashboard-fixed-grid dashboard-fixed-grid--${activeTab.toLowerCase()} dashboard-tab-pane-transition`} style={{ '--fixed-rows': rows }}>
        {panels.map(widget => <WidgetCard key={widget.i} widget={widget} fixedLayout isLight={isLight} />)}
      </div>
    </main>;
  }

  return (
    <main key={activeTab} className="dashboard-modular-view dashboard-tab-pane-transition" style={{
      flex: 1,
      padding: '1rem',
      userSelect: activeInteraction ? 'none' : 'auto',
      overflowX: 'hidden'
    }}>
      <div
        ref={boardRef}
        className="dashboard-modular-grid"
        style={{
          position: 'relative',
          width: '100%',
          height: `${boardHeight}px`,
          minHeight: '600px',
          transition: 'height 0.2s ease'
        }}
      >
        {/* Rejilla Guía */}
        <div className="dashboard-modular-guides" aria-hidden="true">{gridCells}</div>

        {/* Renderizado de Widgets */}
        {boardW > 0 && widgets.map(w => {
          const isInteracting = activeInteraction?.widgetId === w.i;
          const isFocused = focusedWidgetId === w.i;
          const isDraggingThis = isInteracting && activeInteraction.type === 'drag';
          const isResizingThis = isInteracting && activeInteraction.type === 'resize';

          return (
            <WidgetCard
              key={w.i}
              widget={w}
              cellW={cellW}
              cellH={cellH}
              gap={GAP}
              isLight={isLight}
              isInteracting={isInteracting}
              isFocused={isFocused}
              isDraggingThis={isDraggingThis}
              isResizingThis={isResizingThis}
              onFocus={() => setFocusedWidgetId(w.i)}
              onStartDrag={(e) => handleStartDrag(e, w.i)}
              onStartResize={(e) => handleStartResize(e, w.i)}
              onRemove={() => removeWidget(w.i)}
            />
          );
        })}
      </div>
    </main>
  );
};

export default WidgetGridBoard;
