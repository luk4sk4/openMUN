import React, { Suspense } from 'react';
import { GripVertical, X } from 'lucide-react';
import WidgetRegistry from '../widgets/WidgetRegistry';
import { WIDGET_METADATA } from '../panels/WidgetSidebar';
import WidgetSkeleton from '../skeletons/WidgetSkeleton';
import WidgetErrorBoundary from '../common/WidgetErrorBoundary';


const WidgetCard = ({
  widget,
  cellW,
  cellH,
  gap,
  isLight,
  isInteracting,
  isFocused,
  isDraggingThis,
  isResizingThis,
  onFocus,
  onStartDrag,
  onStartResize,
  onRemove
}) => {
  const { i: id, col, row, colSpan, rowSpan } = widget;
  const x = gap + col * (cellW + gap);
  const y = gap + row * (cellH + gap);
  const width = colSpan * cellW + (colSpan - 1) * gap;
  const height = rowSpan * cellH + (rowSpan - 1) * gap;

  const WidgetComponent = WidgetRegistry[id];
  const meta = WIDGET_METADATA[id] || { title: id, category: 'Widget' };

  const computedZIndex = isInteracting ? 100 : (isFocused ? 50 : 1);

  return (
    <div
      className={`widget-card ${isInteracting ? 'is-interacting' : ''}`}
      onMouseDown={onFocus}
      onTouchStart={onFocus}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        backgroundColor: 'var(--panel-color)',
        border: isInteracting ? '2px solid var(--text-color)' : '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        boxShadow: isFocused || isInteracting
          ? (isLight ? '0 10px 30px rgba(0,0,0,0.15)' : '0 12px 35px rgba(0,0,0,0.85)')
          : (isLight ? '0 4px 15px rgba(0,0,0,0.06)' : '0 6px 20px rgba(0,0,0,0.6)'),
        display: 'flex',
        flexDirection: 'column',
        transition: isInteracting
          ? 'none'
          : 'left 0.15s cubic-bezier(0.2, 0, 0, 1), top 0.15s cubic-bezier(0.2, 0, 0, 1), width 0.15s cubic-bezier(0.2, 0, 0, 1), height 0.15s cubic-bezier(0.2, 0, 0, 1), background-color 0.3s ease, border-color 0.3s ease',
        zIndex: computedZIndex,
        transform: isDraggingThis ? 'scale(1.01)' : 'scale(1)'
      }}
    >
      {/* Borde Superior Draggable Fino (Reserva de arrastre) */}
      <div
        onMouseDown={onStartDrag}
        onTouchStart={onStartDrag}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          zIndex: 15,
          cursor: isDraggingThis ? 'grabbing' : 'grab',
          borderTopLeftRadius: 'var(--border-radius)',
          borderTopRightRadius: 'var(--border-radius)'
        }}
        title={`Arrastrar widget: ${meta.title}`}
      />

      {/* Botones Flotantes Compactos de Control (Visibles al pasar el ratón) */}
      <div
        className="widget-floating-controls"
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: isLight ? 'rgba(240, 242, 245, 0.92)' : 'rgba(16, 18, 26, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '2px 4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          userSelect: 'none'
        }}
      >
        {/* Icono / Handle para Arrastrar */}
        <div
          onMouseDown={onStartDrag}
          onTouchStart={onStartDrag}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDraggingThis ? 'grabbing' : 'grab',
            padding: '2px 4px',
            borderRadius: '4px',
            color: 'var(--text-color)',
            opacity: 0.8
          }}
          title={`Arrastrar widget: ${meta.title}`}
        >
          <GripVertical size={14} />
        </div>

        {isInteracting && (
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '700',
            backgroundColor: 'var(--btn-bg)',
            color: 'var(--btn-text)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            lineHeight: 1
          }}>
            {colSpan}x{rowSpan}
          </span>
        )}

        {/* Botón para Cerrar / Desactivar Widget */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            padding: '2px',
            borderRadius: '4px',
            transition: 'opacity 0.15s ease'
          }}
          title={`Quitar widget (${meta.title})`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Contenido del Widget */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        borderRadius: 'var(--border-radius)',
        pointerEvents: isInteracting ? 'none' : 'auto'
      }}>
        {WidgetComponent ? (
          <WidgetErrorBoundary widgetId={id} widgetTitle={meta.title} isLight={isLight}>
            <Suspense fallback={<WidgetSkeleton widgetId={id} meta={meta} isLight={isLight} />}>
              <WidgetComponent isLight={isLight} />
            </Suspense>
          </WidgetErrorBoundary>
        ) : (
          <div style={{ padding: '1rem', opacity: 0.5, textAlign: 'center' }}>
            Widget: {id}
          </div>
        )}
      </div>

      {/* Handle de Resize Esquina */}
      <div
        onMouseDown={onStartResize}
        onTouchStart={onStartResize}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '18px',
          height: '18px',
          cursor: 'nwse-resize',
          opacity: isResizingThis ? 1 : 0.6,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '3px',
          borderBottomRightRadius: 'var(--border-radius)',
          zIndex: 10
        }}
        title="Arrastrar para cambiar tamaño"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default React.memo(WidgetCard);
