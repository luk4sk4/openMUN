import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Breadcrumbs Component - Componente de migas de pan para navegación de jerarquía.
 *
 * @param {Array} items - Array de objetos { label, icon, onClick, active }
 * @param {Boolean} isLight - Tema claro u oscuro
 * @param {Function} onNavigateHome - Callback para volver al inicio
 */
export default function Breadcrumbs({ items = [], isLight = false, onNavigateHome }) {
  const { t } = useTranslation();

  const defaultHome = {
    label: t('tabs.home', 'Inicio'),
    icon: Home,
    onClick: onNavigateHome,
    active: items.length === 0
  };

  const breadcrumbList = [defaultHome, ...items];

  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex items-center text-xs font-medium"
    >
      <ol
        className="flex items-center gap-1.5 flex-wrap"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {breadcrumbList.map((item, index) => {
          const isLast = index === breadcrumbList.length - 1;
          const Icon = item.icon;

          return (
            <li
              key={index}
              className="flex items-center gap-1.5"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isLight ? 'text-slate-400' : 'text-slate-600'
                  }`}
                  aria-hidden="true"
                />
              )}

              {item.onClick && !isLast ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  itemProp="item"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    isLight
                      ? 'text-slate-600 hover:text-blue-600 hover:bg-slate-200/60'
                      : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/60'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span itemProp="name">{item.label}</span>
                </button>
              ) : (
                <span
                  itemProp="item"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                    isLast
                      ? isLight
                        ? 'text-blue-600 font-semibold bg-blue-50'
                        : 'text-blue-400 font-semibold bg-blue-950/40'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span itemProp="name">{item.label}</span>
                </span>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
