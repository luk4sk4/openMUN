import React, { useEffect, useState } from 'react';
import { ShieldCheck, Scale, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import ConsoleNavbar from '../dashboard/ConsoleNavbar';
import { navigateTo } from '../../utils/router';
import '../common/LegalBanner.css';

// ponytail: flat editorial prose on shared tokens instead of nested card boxes
export default function TermsConditionsPage({ isLight: propIsLight, onBack }) {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  useEffect(() => {
    document.title = t('terms.pageTitle', 'OpenMUN - Términos y Condiciones de Uso');
    window.scrollTo(0, 0);
  }, [t]);

  const legalTabs = [
    { id: 'privacy', label: t('legalBanner.privacyLink', 'Política de Privacidad'), icon: ShieldCheck },
    { id: 'terms', label: t('legalBanner.termsLink', 'Términos y Condiciones'), icon: Scale }
  ];

  return (
    <div className="openmun-legal-page">
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      <ConsoleNavbar
        showContext={false}
        activeTab="terms"
        setActiveTab={(tab) => navigateTo(tab === 'privacy' ? '/privacy' : '/terms')}
        tabs={legalTabs}
        isLight={isLight}
        toggleThemeMode={toggleThemeMode}
        setIsAccessOpen={setIsAccessModalOpen}
        onBack={onBack || (() => navigateTo('/'))}
      />

      <main className="openmun-legal-doc">
        <header className="openmun-legal-doc-header">
          <div className="openmun-legal-kicker">
            <Scale size={14} />
            <span>{t('terms.badge', 'Condiciones de Uso y Licencia Libre')}</span>
          </div>

          <h1>{t('terms.title', 'Términos y Condiciones de Uso')}</h1>

          <p className="openmun-legal-lead">
            {t(
              'terms.subtitle',
              'Bienvenido a OpenMUN, una plataforma web libre y gratuita diseñada para optimizar la gestión y el debate en Modelos de Naciones Unidas.'
            )}
          </p>
        </header>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec1Title', '1. Carácter Gratuito y Educativo')}</h2>
          <p>
            {t(
              'terms.sec1Desc',
              'OpenMUN se ofrece libremente y sin coste para conferencias, instituciones educativas, mesas presidenciales y delegados. Su objetivo principal es enriquecer la cultura académica, el debate constructivo y la diplomacia escolar y universitaria.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec2Title', '2. Propiedad Intelectual y Licencia Libre (GNU AGPLv3)')}</h2>
          <p>
            {t(
              'terms.sec2Desc',
              'OpenMUN es un proyecto de Software Libre desarrollado originalmente por Lucas R. Kowalski y publicado bajo los términos de la Licencia Pública General de Affero de GNU versión 3 (GNU AGPLv3 o superior). Tienes total libertad para utilizarlo, estudiarlo, modificarlo y compartirlo, siempre bajo el respeto a los derechos morales de autoría y las condiciones de la licencia.'
            )}
          </p>

          <h3>{t('terms.sec2LicenseTitle', '2.1 Alcance y Obligaciones de la Licencia GNU AGPLv3')}</h3>
          <p>
            {t(
              'terms.sec2LicenseDesc',
              'La licencia GNU AGPLv3 es una licencia con copyleft robusto especialmente diseñada para software accesible a través de redes y servidores telemáticos. Su adopción acarrea las siguientes libertades y condiciones obligatorias:'
            )}
          </p>
          <ul className="openmun-legal-list">
            <li>
              <strong>{t('terms.sec2AgplFreedomPrefix', 'Libertades de uso y modificación: ')}</strong>
              {t('terms.sec2AgplFreedom', 'Cualquier persona, institución educativa o conferencia MUN puede ejecutar el software para cualquier fin, inspeccionar su código fuente y adaptarlo a sus necesidades sin coste alguno.')}
            </li>
            <li>
              <strong>{t('terms.sec2AgplNetworkPrefix', 'Copyleft en red (Obligación de reciprocidad): ')}</strong>
              {t('terms.sec2AgplNetwork', 'Si modificas el código de OpenMUN y ejecutas la versión modificada en un servidor para prestar servicios o permitir el acceso a terceros a través de una red (internet o red local), estás legalmente obligado a poner el código fuente completo modificado a disposición de todos los usuarios de la red bajo los mismos términos de la licencia GNU AGPLv3.')}
            </li>
            <li>
              <strong>{t('terms.sec2AgplNoticesPrefix', 'Conservación de avisos y autoría: ')}</strong>
              {t('terms.sec2AgplNotices', 'Cualquier redistribución o trabajo derivado debe conservar íntegros los créditos de autoría original, los avisos de copyright y el texto íntegro de la licencia GNU AGPLv3.')}
            </li>
            <li>
              <strong>{t('terms.sec2AgplNoWarrantyPrefix', 'Sin garantías comerciales: ')}</strong>
              {t('terms.sec2AgplNoWarranty', 'El software se distribuye «tal cual» con fines educativos y de debate, sin garantías implícitas ni explícitas de adecuación comercial.')}
            </li>
          </ul>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <span>{t('terms.sec2LinkText', 'Consultar el texto oficial de la Licencia GNU AGPLv3 (GNU Affero General Public License)')}</span>
              <ExternalLink size={13} />
            </a>
            <a
              href="https://github.com/luk4sk4/OPENMUN"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <span>{t('terms.sec2RepoLinkText', 'Ver el repositorio oficial de código abierto en GitHub')}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec3Title', '3. Gestión de Datos, Sincronización y Copias de Seguridad')}</h2>

          <h3>{t('terms.sec3LocalTitle', 'Sesiones Locales:')}</h3>
          <p>
            {t(
              'terms.sec3LocalDesc',
              'El usuario es el único responsable de la custodia de los datos alojados en el almacenamiento local del navegador (LocalStorage) o en sus copias de seguridad descargadas (.json). OpenMUN no utiliza servicios de almacenamiento en la nube de terceros como Google Drive. La limpieza de caché o datos del navegador eliminará las sesiones locales que no hayan sido exportadas previamente.'
            )}
          </p>

          <h3>{t('terms.sec3ConfTitle', 'Conferencias en Servidor:')}</h3>
          <p>
            {t(
              'terms.sec3ConfDesc',
              'En las conferencias sincronizadas a través del servidor, OpenMUN facilita la concurrencia entre comités y proporciona mecanismos de exportación (incluido el envío del archivo por correo electrónico). No obstante, OpenMUN es una herramienta de soporte al debate en vivo y no constituye un servicio de almacenamiento en la nube indefinido, por lo que se recomienda exportar el archivo de la sesión (.json) al término de cada jornada o debate.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec4Title', '4. Uso Aceptable')}</h2>
          <p>
            {t(
              'terms.sec4Desc',
              'El usuario se compromete a no utilizar la infraestructura del servidor, los WebSockets ni la base de datos de conferencias para realizar ataques de denegación de servicio, saturación no autorizada, inyección de código malicioso o cualquier actividad contraria a la ley o que perjudique la disponibilidad del servicio para otros comités.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec5Title', '5. Exención de Garantías y Responsabilidad')}</h2>
          <p>
            {t(
              'terms.sec5Desc',
              'El software se entrega «tal cual» (AS IS), sin garantías de ningún tipo respecto a disponibilidad ininterrumpida, ausencia de errores o idoneidad para un fin determinado. OpenMUN no será responsable de posibles pérdidas de datos derivadas de fallos de red local, problemas de conectividad de los usuarios o interrupciones de infraestructura de terceros.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec6Title', '6. Modificaciones de los Términos')}</h2>
          <p>
            {t(
              'terms.sec6Desc',
              'Nos reservamos el derecho de actualizar estos términos para reflejar mejoras técnicas o cambios normativos. La versión vigente estará siempre accesible públicamente en la plataforma.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('terms.sec7Title', '7. Contacto')}</h2>
          <p>
            {t(
              'terms.sec7Desc',
              'Para resolver dudas o realizar consultas relacionadas con estas condiciones, puedes escribir a contacto@openmun.app.'
            )}
          </p>
        </section>

        <footer className="openmun-legal-doc-footer">
          <span>{t('ui.lastUpdatedNovember', 'Última actualización: Noviembre')} {new Date().getFullYear()} — OpenMUN</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button type="button" className="openmun-legal-text-btn" onClick={() => navigateTo('/privacy')}>
              {t('legalBanner.privacyLink', 'Política de Privacidad')}
            </button>
            <button type="button" className="openmun-legal-text-btn" onClick={onBack || (() => navigateTo('/'))}>
              {t('common.backToMainPanel', 'Volver al panel principal')}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
