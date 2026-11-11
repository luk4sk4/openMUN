import React, { useEffect, useState } from 'react';
import { ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import ConsoleNavbar from '../dashboard/ConsoleNavbar';
import { navigateTo } from '../../utils/router';
import '../common/LegalBanner.css';

// ponytail: flat editorial prose on shared tokens instead of nested card boxes
export default function PrivacyPolicyPage({ isLight: propIsLight, onBack }) {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  useEffect(() => {
    document.title = t('privacy.pageTitle', 'OpenMUN - Política de Privacidad');
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
        activeTab="privacy"
        setActiveTab={(tab) => navigateTo(tab === 'terms' ? '/terms' : '/privacy')}
        tabs={legalTabs}
        isLight={isLight}
        toggleThemeMode={toggleThemeMode}
        setIsAccessOpen={setIsAccessModalOpen}
        onBack={onBack || (() => navigateTo('/'))}
      />

      <main className="openmun-legal-doc">
        <header className="openmun-legal-doc-header">
          <div className="openmun-legal-kicker">
            <ShieldCheck size={14} />
            <span>{t('privacy.badge', 'Compromiso Total con la Privacidad')}</span>
          </div>

          <h1>{t('privacy.title', 'Política de Privacidad')}</h1>

          <p className="openmun-legal-lead">
            {t(
              'privacy.subtitle',
              'OpenMUN ha sido diseñado desde su origen bajo el principio de Privacidad por Diseño y por Defecto. Nuestro compromiso es la transparencia absoluta y el tratamiento mínimo de datos imprescindible para el funcionamiento de la plataforma.'
            )}
          </p>

          <div className="openmun-legal-note" role="note">
            <div className="openmun-legal-note-label">
              <CheckCircle2 size={14} />
              <span>{t('privacy.noCookiesTitle', 'Garantía Libre de Cookies Publicitarias y de Rastreo')}</span>
            </div>
            <h2>{t('privacy.noCookiesHeading', 'NO Utilizamos Cookies Publicitarias ni de Rastreo')}</h2>
            <p>
              {t(
                'privacy.noCookiesDescription',
                'En OpenMUN NO utilizamos cookies de seguimiento, ni cookies de terceros, ni píxeles publicitarios. No creamos perfiles de usuario ni comercializamos tu información bajo ninguna circunstancia.'
              )}
            </p>
          </div>
        </header>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec1Title', '1. Almacenamiento y Tratamiento de Datos')}</h2>
          <p>{t('privacy.sec1Intro', 'OpenMUN funciona mediante dos modalidades según la función que utilices:')}</p>

          <h3>{t('privacy.sec1LocalTitle', 'Sesiones Locales (Comité Individual):')}</h3>
          <p>
            {t(
              'privacy.sec1LocalDesc',
              'Si gestionas un comité estándar sin sincronización central, los datos (nombres de comités, listas de delegados, mociones, cronómetros y preferencias de interfaz) se almacenan exclusivamente de forma local en tu navegador mediante LocalStorage. Estos datos nunca se envían a nuestros servidores y puedes eliminarlos limpiando el almacenamiento de tu navegador.'
            )}
          </p>

          <h3>{t('privacy.sec1ConfTitle', 'Conferencias Multi-Comité Sincronizadas:')}</h3>
          <p>
            {t(
              'privacy.sec1ConfDesc',
              'Si creas o gestionas una conferencia sincronizada con múltiples comités, la estructura de la conferencia, los estados de los debates y las listas de participantes se procesan y almacenan en una base de datos segura en nuestro servidor para permitir la sincronización en tiempo real y la persistencia de las salas activas.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec2Title', '2. Tratamiento de Correo Electrónico (Copia de Respaldo)')}</h2>
          <p>
            {t(
              'privacy.sec2Intro',
              'Si decides voluntariamente proporcionar tu dirección de correo electrónico para recibir el archivo de respaldo de tu conferencia:'
            )}
          </p>
          <ul className="openmun-legal-list">
            <li>{t('privacy.sec2Finalidad', 'Finalidad: Utilizaremos tu email únicamente para remitirte el archivo exportado de tu conferencia o comité.')}</li>
            <li>{t('privacy.sec2BaseJuridica', 'Base jurídica: El consentimiento explícito al solicitar el envío de dicho archivo.')}</li>
            <li>{t('privacy.sec2Conservacion', 'Conservación: Tu dirección de correo se utiliza de forma transitoria para procesar el envío y no se emplea para fines comerciales, boletines (newsletters) ni cesión a terceros.')}</li>
            <li>{t('privacy.sec2Terceros', 'Terceros proveedores: Para la entrega del correo electrónico podemos apoyarnos en servicios de infraestructura de correo transaccional que cumplen con las normativas europeas de protección de datos.')}</li>
          </ul>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec3Title', '3. Conexiones en Tiempo Real (WebSockets Seguros)')}</h2>
          <p>
            {t(
              'privacy.sec3Desc',
              'Las funciones de sincronización en vivo (como el modo Delegado, Secretaría o Backroom) utilizan WebSockets seguros (wss://). La comunicación de eventos de debate se transmite de forma cifrada en tránsito entre los clientes conectados y el servidor de sincronización.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec4Title', '4. Ausencia Total de Servicios e Integración con Google')}</h2>
          <p>
            {t(
              'privacy.sec4Desc',
              'OpenMUN es una plataforma totalmente independiente y autónoma. No utilizamos servicios, APIs, librerías, sistemas de autenticación ni almacenamiento en la nube de Google (como Google Drive, Google Identity o Google OAuth). Ningún dato de los comités, delegados o debates es recopilado, procesado ni compartido con servidores de Google ni de otros proveedores tecnológicos externos.'
            )}
          </p>

          <h3>{t('privacy.sec4IndependenceTitle', '4.1 Autonomía e Independencia de Terceros')}</h3>
          <p>
            {t(
              'privacy.sec4IndependenceDesc',
              'OpenMUN no requiere cuentas de Google ni credenciales externas para su funcionamiento. La plataforma opera de forma autónoma sin dependencias de servicios en la nube de terceros ni vinculación con proveedores tecnológicos externos.'
            )}
          </p>

          <h3>{t('privacy.sec4StorageTitle', '4.2 Respaldos Locales y Soberanía de Datos')}</h3>
          <p>
            {t(
              'privacy.sec4StorageDesc',
              'Todas las copias de seguridad de las sesiones de debate se gestionan de forma soberana por el usuario mediante la descarga directa de archivos abiertos (.json) a su propio dispositivo o almacenamiento local del navegador (LocalStorage). OpenMUN no almacena ni respalda sesiones en servicios en la nube de terceros.'
            )}
          </p>

          <h3>{t('privacy.sec4NoTransferTitle', '4.3 Cero Cesión o Transferencia de Datos')}</h3>
          <p>
            {t(
              'privacy.sec4NoTransferDesc',
              'No cedemos, no comercializamos ni transferimos información de ningún tipo a Google, empresas de intermediación de datos ni plataformas publicitarias bajo ninguna circunstancia. Tus datos nunca se emplean para publicidad dirigida ni para el entrenamiento de modelos de Inteligencia Artificial.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec5Title', '5. Métricas y Rendimiento (Cloudflare Web Analytics)')}</h2>
          <p>
            {t(
              'privacy.sec5Desc',
              'Utilizamos Cloudflare Web Analytics con el único fin de monitorizar el rendimiento técnico y el volumen de tráfico general de la plataforma. Esta herramienta no utiliza cookies, no almacena identificadores persistentes ni rastrea tu navegación individual entre diferentes sitios web.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec6Title', '6. Tus Derechos (RGPD / Normativa de Protección de Datos)')}</h2>
          <p>
            {t(
              'privacy.sec6Desc',
              'Tienes derecho a acceder, rectificar, limitar o solicitar la supresión de los datos que conserves en nuestros servidores (incluida la eliminación de conferencias o el registro de correo). Para ejercer estos derechos, ponte en contacto en contacto@openmun.app.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec7Title', '7. Código Abierto y Transparencia')}</h2>
          <p>
            {t(
              'privacy.sec7Desc',
              'OpenMUN es un proyecto de Software Libre e independiente. Cualquiera puede auditar el código fuente público en nuestro repositorio de GitHub para verificar el funcionamiento técnico y el respeto estricto a la privacidad.'
            )}
          </p>
        </section>

        <section className="openmun-legal-section">
          <h2>{t('privacy.sec8Title', '8. Contacto')}</h2>
          <p>
            {t(
              'privacy.sec8Desc',
              'Si tienes dudas sobre esta política o sobre la gestión técnica de los datos, contáctanos en contacto@openmun.app.'
            )}
          </p>
        </section>

        <footer className="openmun-legal-doc-footer">
          <span>{t('ui.lastUpdatedNovember', 'Última actualización: Noviembre')} {new Date().getFullYear()} — OpenMUN</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button type="button" className="openmun-legal-text-btn" onClick={() => navigateTo('/terms')}>
              {t('legalBanner.termsLink', 'Términos y Condiciones')}
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
