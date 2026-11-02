import React, { useState, useMemo, Suspense } from 'react';
import {
  Play,
  Radio,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Code2,
  Coffee,
  Building2,
  Layers
} from 'lucide-react';
import OpenMunLogo from '../common/OpenMunLogo';
import YoutubeIcon from '../common/YoutubeIcon';
import GavelAnimation from '../common/GavelAnimation';
import { useTranslation } from 'react-i18next';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
const CreateConferenceModal = lazyWithRetry(() => import('../modals/CreateConferenceModal'), 'CreateConferenceModal');
import HowToUseModal from '../modals/HowToUseModal';
import KineticGrid from '../../assets/Kinetic';
import { navigateTo } from '../../utils/router';

const FAQ_ITEMS = [
  {
    id: 'que-es',
    categoria: 'General',
    pregunta: '¿Qué es OpenMUN y para qué sirve?',
    respuesta: 'OpenMUN es una plataforma web de código abierto diseñada para facilitar la moderación y gestión de simulaciones de Modelos de Naciones Unidas (MUN). Permite a las Mesas de Presidencia llevar el control de oradores, cronómetros, mociones, votaciones, cálculo de quorum y transmitir el estado de la sesión en vivo a delegados y pantallas de proyección.'
  },
  {
    id: 'gratuito',
    categoria: 'Licencia',
    pregunta: '¿Es realmente 100% gratuito y de código abierto?',
    respuesta: 'Sí, totalmente. OpenMUN es software libre bajo licencia GNU AGPLv3. No incluye pagos, suscripciones premium ni publicidad. Todo el código fuente está disponible públicamente en GitHub para ser auditado, utilizado o modificado por cualquier comité o institución.'
  },
  {
    id: 'p2p-sync',
    categoria: 'Tecnología',
    pregunta: '¿Cómo funciona la sincronización en vivo (Mesa, Delegados y Secretaría)?',
    respuesta: 'OpenMUN utiliza comunicación WebSocket cifrada de alta velocidad y canales locales (BroadcastChannel). La Mesa de Presidencia actúa como sala principal y comparte un código o código QR. Las actualizaciones de cronómetro, oradores y mociones se transmiten en tiempo real entre dispositivos sin almacenar datos en servidores de terceros.'
  },
  {
    id: 'instalacion-cuenta',
    categoria: 'Uso',
    pregunta: '¿Necesito instalar programas o registrar una cuenta?',
    respuesta: 'No. Funciona de manera inmediata desde cualquier navegador web moderno (Chrome, Firefox, Safari, Edge) en computadoras, tablets o smartphones. Puedes conectar tu cuenta de Google para sincronizar el Drive y no tener que mover los archivos manualmente.'
  },
  {
    id: 'persistencia-datos',
    categoria: 'Datos',
    pregunta: '¿Se guardan mis configuraciones si cierro el navegador?',
    respuesta: 'Sí. Todo el progreso de la sesión (oradores, votaciones, quorum y notas) se guarda automáticamente de forma local en tu navegador (LocalStorage). También puedes exportar e importar tu configuración completa en archivos JSON o Excel. Si conectas tu Google Drive, se guardará y cargará desde este.'
  },
  {
    id: 'importar-paises',
    categoria: 'Comité',
    pregunta: '¿Cómo puedo importar mi lista de países o delegaciones?',
    respuesta: 'En la pestaña "Comienzo" o mediante el widget de "Importar Países", puedes cargar archivos Excel (.xlsx/.xls) o pegar una lista en formato de texto. El sistema genera automáticamente la matriz de países y el quorum de la sesión. Para tener banderas personalizadas puedes usar imágenes, emojis o SVG. Si son de países actuales, nosotros te cubrimos automáticamente.'
  },
  {
    id: 'modo-offline',
    categoria: 'Tecnología',
    pregunta: '¿Puedo usar OpenMUN sin conexión a internet (offline)?',
    respuesta: 'Sí. Una vez cargada la página, las herramientas de la Mesa (cronómetros, GSL, mociones, votaciones) funcionan 100% sin conexión a internet. Para proyectar en segunda pantalla offline, puedes abrir la vista de Secretaría en una ventana adicional. Perderás la función de conectarte con Backroom y delegaciones, además de la sincronización con conferencias.'
  },
  {
    id: 'como-funcionan-conferencias',
    categoria: 'Tecnología',
    pregunta: '¿Cómo funcionan las conferencias?',
    respuesta: 'Cuando creas una conferencia, guardamos un archivo en nuestra base de datos. Cuando te unes a ella, modificas o lees ese archivo. La base de datos es privada y nadie más que vosotros y nosotros tenemos acceso. Como ese espacio es limitado, los avisos se borran a las 24 horas y las conferencias completas, tras un mes sin actividad en la conferencia. Si pones un correo electrónico, te mandaremos un archivo con toda la información de la conferencia para que no pierdas nada.'
  },
  {
    id: 'donar',
    categoria: 'Comunidad',
    pregunta: '¿Cómo se mantiene OpenMUN?',
    respuesta: 'Para vosotros, OpenMUN es gratuito. Para nosotros no. Desarrollarla llevó esfuerzo, tiempo y dinero, y mantenerla otro tanto. No cobramos porque creemos que aquellos que puedan, algo nos donarán, mientras que los que no se lo puedan permitir podrán disfrutar de la herramienta igualmente.'
  },
  {
    id: 'colaborar',
    categoria: 'Comunidad',
    pregunta: '¿Cómo puedo colaborar, proponer mejoras o reportar fallos?',
    respuesta: 'Puedes abrir un issue o Pull Request en el repositorio de GitHub, o escribirnos directamente a contacto@openmun.app. Toda contribución, reporte o sugerencia es bienvenida.'
  }
];

const HomePage = ({ onNavigateToComienzo, onNavigateToJoin, isLight }) => {
  const { t } = useTranslation();
  const [isCreateConfModalOpen, setIsCreateConfModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);
  const [showGavel, setShowGavel] = useState(false);

  // Copiar email
  const [copiado, setCopiado] = useState(false);
  const emailPlaceholder = 'contacto@openmun.app';

  // FAQ
  const [faqAbierto, setFaqAbierto] = useState('que-es');
  const [busquedaFaq, setBusquedaFaq] = useState('');
  const [categoriaFaq, setCategoriaFaq] = useState('Todas');

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailPlaceholder);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const faqsFiltrados = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const coincideTexto =
        item.pregunta.toLowerCase().includes(busquedaFaq.toLowerCase()) ||
        item.respuesta.toLowerCase().includes(busquedaFaq.toLowerCase());
      const coincideCat = categoriaFaq === 'Todas' || item.categoria === categoriaFaq;
      return coincideTexto && coincideCat;
    });
  }, [busquedaFaq, categoriaFaq]);

  const categorias = useMemo(() => {
    return ['Todas', ...new Set(FAQ_ITEMS.map((item) => item.categoria))];
  }, []);

  // Tokens de diseño del sistema OpenMUN (fondos sólidos no transparentes para botones y controles)
  const controlBg = isLight ? '#ffffff' : '#363636';
  const controlBgHover = isLight ? '#f7f6f4' : '#3f3f3f';
  const borderColor = 'var(--border-color)';
  const subBorderColor = 'var(--subborder-color)';
  const textPrimary = 'var(--text-color)';
  const textMuted = 'var(--muted-text)';
  const accentColor = 'var(--accent-color)';

  return (
    <div style={{
      position: 'relative',
      minHeight: '100%',
      width: '100%',
      color: textPrimary,
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)'
    }}>

      {/* ── FONDO INTERACTIVO KINETIC GRID (DETRÁS DE TODA LA PÁGINA) ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: isLight ? 0.35 : 0.45
      }}>
        <KineticGrid
          background="transparent"
          dotColor={isLight ? "rgba(0, 0, 0, 0.22)" : "rgba(255, 255, 255, 0.25)"}
          lineColor={isLight ? "rgba(184, 84, 52, 0.32)" : "rgba(239, 163, 127, 0.38)"}
          trailColor={isLight ? "#b85434" : "#efa37f"}
          spacing={42}
          radius={300}
          strength={6}
          trail={true}
        />
      </div>

      {/* Contenedor Principal Integrado en el Fondo */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '1.5rem 1.25rem 4rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3.5rem'
      }}>

        {/* ── 1. HERO SECTION (Integrada directamente en el fondo) ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          paddingTop: '0.75rem'
        }}>
          {/* Bloque Superior: Logo + descripción (izq) y Botones de acción (der) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center'
          }}>
            {/* Columna Izquierda: Logo grande y descripción */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1rem'
            }}>
              <OpenMunLogo height={88} isLight={isLight} showText={true} />

              <div>
                <h1 style={{
                  fontSize: 'clamp(1.65rem, 2.8vw, 2.2rem)',
                  fontWeight: '800',
                  lineHeight: '1.22',
                  margin: '0.4rem 0 0.85rem 0',
                  letterSpacing: '-0.025em',
                  color: textPrimary
                }}>
                  {t('home.heroTitle', 'La plataforma abierta y definitiva para Modelos de Naciones Unidas')}
                </h1>

                <p style={{
                  fontSize: '0.96rem',
                  lineHeight: '1.65',
                  color: textMuted,
                  margin: 0,
                  maxWidth: '560px'
                }}>
                  {t('home.heroPurpose', 'Plataforma educativa web diseñada para estudiantes, docentes y comités que participan en simulaciones de Modelos de Naciones Unidas (MUN). Modera debates diplomáticos, gestiona oradores, cronómetros y votaciones en tiempo real de forma inmediata y sin barreras.')}
                </p>
              </div>
            </div>

            {/* Columna Derecha: Botones ejecutables */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              width: '100%'
            }}>
              {/* Acción Principal: Iniciar Mesa de Presidencia */}
              <button
                onClick={onNavigateToComienzo}
                style={{
                  width: '100%',
                  padding: '0.95rem 1.25rem',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: '1px solid var(--btn-bg)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'filter 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.98rem', fontWeight: '700' }}>
                    {t('home.chairCardTitle', 'Iniciar Mesa de Presidencia')}
                  </span>
                  <span style={{ fontSize: '0.78rem', opacity: 0.92, fontWeight: '400' }}>
                    {t('home.chairCardDescShort', 'Panel de moderación, oradores, caucuses y votaciones')}
                  </span>
                </div>
                <Play size={18} fill="currentColor" />
              </button>

              {/* Acción Secundaria: Unirse como Delegación */}
              {onNavigateToJoin && (
                <button
                  onClick={onNavigateToJoin}
                  style={{
                    width: '100%',
                    padding: '0.82rem 1.15rem',
                    backgroundColor: controlBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 'var(--border-radius, 6px)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = controlBgHover;
                    e.currentTarget.style.borderColor = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = controlBg;
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '650' }}>
                      {t('home.joinCardTitle', 'Unirse como Delegación')}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: textMuted, fontWeight: '400' }}>
                      {t('home.joinCardDescShort', 'Conéctate a una sala activa con código o QR')}
                    </span>
                  </div>
                  <Radio size={16} style={{ color: textMuted }} />
                </button>
              )}

              {/* Acción Secundaria: Crear Conferencia */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                    detail: { view: 'create-conference' }
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.82rem 1.15rem',
                  backgroundColor: controlBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = controlBgHover;
                  e.currentTarget.style.borderColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = controlBg;
                  e.currentTarget.style.borderColor = borderColor;
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '650' }}>
                    {t('conferences.createTitle', 'Crear Nueva Conferencia')}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: textMuted, fontWeight: '400' }}>
                    {t('conferences.createDescShort', 'Organiza un evento multi-comité sincronizado en vivo')}
                  </span>
                </div>
                <Building2 size={16} style={{ color: textMuted }} />
              </button>

              {/* Acción Secundaria: Unirse a Conferencia */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                    detail: { view: 'conference', mode: 'explore' }
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.82rem 1.15rem',
                  backgroundColor: controlBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = controlBgHover;
                  e.currentTarget.style.borderColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = controlBg;
                  e.currentTarget.style.borderColor = borderColor;
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '650' }}>
                    {t('conferences.joinTitle', 'Unirse a una Conferencia')}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: textMuted, fontWeight: '400' }}>
                    {t('conferences.joinDescShort', 'Explora comités de un evento o entra como mesa directiva')}
                  </span>
                </div>
                <Layers size={16} style={{ color: textMuted }} />
              </button>

              {/* Acceso al modal: ¿Cómo usar OpenMUN? */}
              <button
                onClick={() => setIsHowToUseModalOpen(true)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1.15rem',
                  backgroundColor: controlBg,
                  color: accentColor,
                  border: `1px dashed ${borderColor}`,
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = controlBgHover;
                  e.currentTarget.style.borderColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = controlBg;
                  e.currentTarget.style.borderColor = borderColor;
                }}
              >
                <HelpCircle size={15} />
                <span>{t('home.howToUseOpenMun', '¿Cómo usar OpenMUN?')}</span>
              </button>
              <button
                type="button"
                className="gavel-demo-button"
                disabled={showGavel}
                onClick={() => setShowGavel(true)}
              >
                {t('home.testGavel', 'Probar mazo (temporal)')}
              </button>
            </div>
          </div>

          {/* Bloque Inferior: Donaciones, YouTube y Ver Código */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${subBorderColor}`
          }}>
            {/* Donaciones */}
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: `1px solid ${borderColor}`,
                backgroundColor: controlBg,
                color: textPrimary,
                fontSize: '0.84rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = controlBgHover;
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = controlBg;
                e.currentTarget.style.borderColor = borderColor;
              }}
            >
              <Coffee size={15} style={{ color: textMuted }} />
              <span>{t('home.coffee', 'Invítanos a un café')}</span>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/playlist?list=PLYm1G3W5Ex2k"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: `1px solid ${borderColor}`,
                backgroundColor: controlBg,
                color: textPrimary,
                fontSize: '0.84rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = controlBgHover;
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = controlBg;
                e.currentTarget.style.borderColor = borderColor;
              }}
            >
              <YoutubeIcon size={15} color="var(--muted-text)" />
              <span>{t('header.tutorials', 'Tutoriales')}</span>
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/luk4sk4/OPENMUN"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: `1px solid ${borderColor}`,
                backgroundColor: controlBg,
                color: textPrimary,
                fontSize: '0.84rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = controlBgHover;
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = controlBg;
                e.currentTarget.style.borderColor = borderColor;
              }}
            >
              <Code2 size={15} style={{ color: textMuted }} />
              <span>{t('home.github', 'Ver Código en GitHub')}</span>
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </a>
          </div>
        </section>

        {/* ── 2. PROPÓSITO EDUCATIVO DE OPENMUN (Columnas editoriales sin tarjeta) ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              margin: '0 0 0.4rem 0',
              color: textPrimary,
              letterSpacing: '-0.02em'
            }}>
              {t('home.purposeSectionTitle', 'Propósito Educativo de OpenMUN')}
            </h2>
            <p style={{ fontSize: '0.92rem', color: textMuted, margin: 0, lineHeight: '1.6' }}>
              {t('home.purposeSectionSubtitle', 'Fomentando el debate diplomático, la oratoria y la resolución constructiva de controversias internacionales en colegios y universidades.')}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {/* Columna 1: Qué es MUN */}
            <div style={{
              paddingTop: '1.25rem',
              borderTop: `2px solid ${subBorderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('home.purposeMunTitle', '¿Qué es un Modelo de Naciones Unidas (MUN)?')}
              </h3>
              <p style={{ fontSize: '0.88rem', color: textMuted, lineHeight: '1.6', margin: 0 }}>
                {t('home.purposeMunDesc', 'Un Modelo de Naciones Unidas es una actividad pedagógica donde estudiantes asumen el papel de diplomáticos de Estados Miembros de la ONU para debatir problemas globales reales, redactar resoluciones y negociar acuerdos siguiendo procedimientos parlamentarios formales.')}
              </p>
            </div>

            {/* Columna 2: Cómo ayuda OpenMUN */}
            <div style={{
              paddingTop: '1.25rem',
              borderTop: `2px solid ${subBorderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('home.purposeRoleTitle', '¿Cómo ayuda OpenMUN a la educación?')}
              </h3>
              <p style={{ fontSize: '0.88rem', color: textMuted, lineHeight: '1.6', margin: 0 }}>
                {t('home.purposeRoleDesc', 'OpenMUN digitaliza y simplifica las herramientas de moderación. Permite a las Mesas calcular quórums, gestionar listas de oradores (GSL), cronometrar discursos y registrar votaciones en tiempo real, transmitiendo a delegados y proyectores sin costes ni servidores.')}
              </p>
            </div>

            {/* Columna 3: 100% Libre */}
            <div style={{
              paddingTop: '1.25rem',
              borderTop: `2px solid ${subBorderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                {t('home.purposeOpenTitle', '100% Gratuito y Libre (AGPLv3)')}
              </h3>
              <p style={{ fontSize: '0.88rem', color: textMuted, lineHeight: '1.6', margin: 0 }}>
                {t('home.purposeOpenDesc', 'OpenMUN es software libre accesible para cualquier institución educativa del mundo. Sin muros de pago, sin suscripciones, sin publicidad y sin recopilación de datos invasiva.')}
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. PREGUNTAS FRECUENTES (FAQ) (Integradas en el fondo) ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} style={{ color: accentColor }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: textPrimary, letterSpacing: '-0.02em' }}>
                {t('home.faqTitle', 'Preguntas Frecuentes')}
              </h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: textMuted, margin: 0 }}>
              {t('home.faqSubtitle', 'Respuestas a las dudas habituales sobre el funcionamiento y privacidad de OpenMUN.')}
            </p>
          </div>

          {/* Buscador y Filtros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: textMuted,
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder={t('home.faqSearchPlaceholder', 'Buscar en preguntas frecuentes (ej. P2P, Excel, offline...)')}
                value={busquedaFaq}
                onChange={(e) => setBusquedaFaq(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem 0.7rem 2.4rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: controlBg,
                  color: textPrimary,
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {busquedaFaq && (
                <button
                  onClick={() => setBusquedaFaq('')}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: textMuted,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}
                >
                  {t('common.clear', 'Limpiar')}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {categorias.map((cat) => {
                const activa = categoriaFaq === cat;
                const catLabel = cat === 'Todas' ? t('home.faqAllCategories', 'Todas') : t(`home.faqCategories.${cat}`, cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaFaq(cat)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      fontSize: '0.78rem',
                      fontWeight: activa ? '700' : '500',
                      border: `1px solid ${activa ? 'var(--btn-bg)' : borderColor}`,
                      backgroundColor: activa ? 'var(--btn-bg)' : controlBg,
                      color: activa ? 'var(--btn-text)' : textPrimary,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {catLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Acordeones continuos */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {faqsFiltrados.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: textMuted, fontSize: '0.9rem' }}>
                {t('home.faqNoResults', 'No se encontraron resultados para')} "<strong>{busquedaFaq}</strong>".
              </div>
            ) : (
              faqsFiltrados.map((faq) => {
                const estaAbierto = faqAbierto === faq.id;
                const pregunta = t(`home.faq.${faq.id}.pregunta`, faq.pregunta);
                const respuesta = t(`home.faq.${faq.id}.respuesta`, faq.respuesta);
                const catLabel = t(`home.faqCategories.${faq.categoria}`, faq.categoria);
                return (
                  <div
                    key={faq.id}
                    style={{
                      borderBottom: `1px solid ${subBorderColor}`,
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <button
                      onClick={() => setFaqAbierto(estaAbierto ? null : faq.id)}
                      style={{
                        width: '100%',
                        padding: '1rem 0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: textPrimary
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: `1px solid ${subBorderColor}`,
                          backgroundColor: controlBg,
                          color: textMuted,
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}>
                          {catLabel}
                        </span>
                        <span style={{
                          fontSize: '0.94rem',
                          fontWeight: '600',
                          color: estaAbierto ? accentColor : textPrimary,
                          transition: 'color 0.15s ease'
                        }}>
                          {pregunta}
                        </span>
                      </div>
                      {estaAbierto ? (
                        <ChevronUp size={18} style={{ color: accentColor, flexShrink: 0 }} />
                      ) : (
                        <ChevronDown size={18} style={{ color: textMuted, flexShrink: 0 }} />
                      )}
                    </button>

                    {estaAbierto && (
                      <div style={{
                        padding: '0 0.25rem 1.1rem 0.25rem',
                        fontSize: '0.88rem',
                        lineHeight: '1.6',
                        color: textMuted
                      }}>
                        {respuesta}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── 4. SUGERENCIAS Y COMUNIDAD (Integrada en el fondo) ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
          padding: '1rem 0'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: textPrimary, letterSpacing: '-0.02em' }}>
              {t('home.communityTitle', 'Sugerencias y Comunidad')}
            </h3>
            <p style={{ fontSize: '0.9rem', color: textMuted, margin: 0, maxWidth: '620px', lineHeight: '1.6' }}>
              {t('home.communityDesc', 'OpenMUN se mantiene en constante evolución. Si deseas reportar un error o sugerir una mejora, contáctanos directamente.')}
            </p>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: controlBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.55rem 0.9rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} style={{ color: textMuted }} />
              <span style={{ fontSize: '0.9rem', fontWeight: '600', fontFamily: 'monospace', color: textPrimary }}>
                {emailPlaceholder}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleCopyEmail}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.75rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: 'none',
                  backgroundColor: copiado ? 'var(--success-color)' : 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {copiado ? <Check size={14} /> : <Copy size={14} />}
                {copiado ? t('common.copied', 'Copiado') : t('common.copy', 'Copiar')}
              </button>

              <a
                href="https://github.com/luk4sk4/OPENMUN"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.75rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: controlBg,
                  color: textPrimary,
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                <Code2 size={14} style={{ color: textMuted }} /> GitHub <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </a>
            </div>
          </div>
        </section>

        {/* ── 5. FOOTER ── */}
        <footer style={{
          paddingTop: '1.25rem',
          borderTop: `1px solid ${subBorderColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: textMuted,
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span>{t('home.developedBy', 'Desarrollado por')} <strong>Lucas R. Kowalski</strong></span>
            <span style={{ color: subBorderColor }}>•</span>
            <a
              href="https://github.com/luk4sk4"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: textMuted, textDecoration: 'none', fontWeight: '500' }}
              onMouseEnter={(e) => e.currentTarget.style.color = textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
            >
              GitHub
            </a>
            <span style={{ color: subBorderColor }}>•</span>
            <a
              href="https://linkedin.com/in/lucas-kowalski"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: textMuted, textDecoration: 'none', fontWeight: '500' }}
              onMouseEnter={(e) => e.currentTarget.style.color = textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
            >
              LinkedIn
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigateTo('/privacy')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: textMuted,
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: '500',
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
            >
              {t('legalBanner.privacyLink', 'Política de Privacidad')}
            </button>
            <span style={{ color: subBorderColor }}>•</span>
            <button
              onClick={() => navigateTo('/terms')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: textMuted,
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: '500',
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
            >
              {t('legalBanner.termsLink', 'Términos y Condiciones')}
            </button>
            <span style={{ color: subBorderColor }}>•</span>
            <span style={{ color: textMuted, fontWeight: '500', fontSize: '0.8rem' }}>
              0 Cookies / 100% LocalStorage
            </span>
          </div>

          <div>
            OpenMUN 1.3 © {new Date().getFullYear()} — {t('home.footerDesc', 'Software Libre para Modelos de Naciones Unidas')}
          </div>
          <div>
            {t('home.footerTagline', 'Por una cultura accesible para todos')}
          </div>
        </footer>
      </div>

      {/* Modal Crear Conferencia */}
      {showGavel && <GavelAnimation onComplete={() => setShowGavel(false)} />}
      <Suspense fallback={null}>
        <CreateConferenceModal
          isOpen={isCreateConfModalOpen}
          onClose={() => setIsCreateConfModalOpen(false)}
          isLight={isLight}
        />
      </Suspense>

      {/* Modal Cómo Usar OpenMUN */}
      <HowToUseModal
        isOpen={isHowToUseModalOpen}
        onClose={() => setIsHowToUseModalOpen(false)}
        onStartModeration={onNavigateToComienzo}
      />
    </div>
  );
};

export default HomePage;
