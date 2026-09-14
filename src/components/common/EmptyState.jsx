import React from 'react';

/**
 * Componente reutilizable para estados vacíos interactivos e ilustrados
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  badge,
  compact = false,
  style = {}
}) => {
  return (
    <div
      className="anim-fade-scale"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '1.25rem 1rem' : '2.25rem 1.5rem',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--border-color)',
        margin: '0.5rem 0',
        ...style
      }}
    >
      {/* Icono con halo brillante sutil */}
      {Icon && (
        <div
          style={{
            width: compact ? '40px' : '56px',
            height: compact ? '40px' : '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--btn-bg)',
            marginBottom: compact ? '0.5rem' : '0.85rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
          }}
        >
          <Icon size={compact ? 20 : 28} strokeWidth={1.75} />
        </div>
      )}

      {badge && (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            marginBottom: '0.4rem'
          }}
        >
          {badge}
        </span>
      )}

      {title && (
        <h4
          style={{
            margin: '0 0 0.35rem 0',
            fontSize: compact ? '0.9rem' : '1.05rem',
            fontWeight: '700',
            color: 'var(--text-color)'
          }}
        >
          {title}
        </h4>
      )}

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: compact ? '0.78rem' : '0.84rem',
            color: 'var(--muted-text)',
            maxWidth: '380px',
            lineHeight: 1.45
          }}
        >
          {description}
        </p>
      )}

      {/* Botones de acción contextual rápida */}
      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: compact ? '0.75rem' : '1.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                border: 'none',
                borderRadius: '6px',
                padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.95rem',
                fontSize: compact ? '0.78rem' : '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                transition: 'transform 0.15s ease, opacity 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'transparent',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.95rem',
                fontSize: compact ? '0.78rem' : '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-header-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
