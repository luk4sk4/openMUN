import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Play,
  Radio,
  ExternalLink,
  Edit3,
  Mail,
  Copy,
  Check,
  Users,
  Clock,
  FileText,
  Vote,
  Sliders,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  Laptop,
  Trash2,
  Save,
  HelpCircle,
  Code2,
  ShieldCheck,
  Coffee,
  Heart,
  X,
  Building2,
  Sparkles,
  Shield,
  Layers
} from 'lucide-react';
import OpenMunLogo from '../common/OpenMunLogo';
import YoutubeIcon from '../common/YoutubeIcon';
import { useTranslation } from 'react-i18next';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
const CreateConferenceModal = lazyWithRetry(() => import('../modals/CreateConferenceModal'), 'CreateConferenceModal');
import KineticGrid from '../../assets/Kinetic';
import { navigateTo } from '../../utils/router';
import WorkflowSection from './WorkflowSection';
import FooterLinks from './FooterLinks';
import InfoBar from './InfoBar';

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
    respuesta: 'En la pestaña "Comienzo" o mediante el widget de "Importar Países", puedes cargar archivos Excel (.xlsx/.xls) o pegar una lista en formato de texto. El sistema genera automáticamente la matriz de países y el quorum de la sesión. Para tener banderas personalizadas puedes usar imágenes, emojis o SVG. Si son de países actuales, nosotros te crubrimos automáticamente.'
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

const FEATURES = [
  {
    icon: Users,
    title: 'Lista General de Oradores (GSL)',
    desc: 'Gestión fluida de delegaciones con tiempos configurables por orador, cesiones de palabra y visualización en cola en tiempo real.'
  },
  {
    icon: Clock,
    title: 'Cronómetros Dinámicos',
    desc: 'Temporizadores para caucuses y tiempos individuales por orador con indicadores de semáforo y alertas sonoras optativas.'
  },
  {
    icon: FileText,
    title: 'Pizarra de Mociones',
    desc: 'Registro rápido de propuestas parlamentarias con orden de precedencia automático, tipo de debate y votación inmediata.'
  },
  {
    icon: Vote,
    title: 'Sistema de Votaciones & Quorum',
    desc: 'Cálculo instantáneo de mayorías (simple, 2/3, cualificada), votación en rol, registro de presentes y abstenciones automáticas.'
  },
  {
    icon: Radio,
    title: 'Transmisión en Directo',
    desc: 'Sincronización en tiempo real entre la Mesa, delegados y pantallas de proyección utilizando WebSockets seguros (WSS) y canales locales de alta velocidad.'
  },
  {
    icon: Sliders,
    title: 'Tablero Modular Personalizable',
    desc: 'Disposición drag-and-drop de widgets, soporte para modo claro/oscuro, ajuste de tipografía para dislexia y exportación de datos.'
  }
];

const HomePage = ({ onNavigateToComienzo, onNavigateToJoin, isLight }) => {
  const { t } = useTranslation();
  // Estado para visibilidad del modal de Crear Conferencia
  const [isCreateConfModalOpen, setIsCreateConfModalOpen] = useState(false);
  // Estado para visibilidad del banner de donaciones (oculto temporalmente)
  const [showDonationBanner, setShowDonationBanner] = useState(false);
  
  // Sincronizar si cambia en storage
  useEffect(() => {
    const handleStorageUpdate = () => {
      const savedNotes = localStorage.getItem('openmun_home_notes');
      if (savedNotes !== null) {
        setNotasUsuario(savedNotes);
        setNotasTemp(savedNotes);
      }
    };
    window.addEventListener('openmun_session_imported', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('openmun_session_imported', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

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

  // Tokens de estilo limpios y consistentes
  const surfaceBg = isLight ? '#ffffff' : 'var(--panel-color)';
  const headerBg = isLight ? '#f8fafc' : 'var(--card-header-bg)';
  const borderColor = 'var(--border-color)';
  const subBorderColor = 'var(--subborder-color)';
  const textPrimary = 'var(--text-color)';
  const textMuted = 'var(--muted-text)';
  const accentColor = '#3b82f6';

  return (
    <div style={{
      position: 'relative',
      minHeight: '100%',
      width: '100%',
      color: textPrimary,
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)'
    }}>

      {/* ── FONDO FONDO INTERACTIVO KINETIC GRID (DETRÁS DE TODA LA PÁGINA) ── */}
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
          lineColor={isLight ? "rgba(37, 99, 235, 0.28)" : "rgba(59, 130, 246, 0.35)"}
          trailColor="#3b82f6"
          spacing={42}
          radius={300}
          strength={6}
          trail={true}
        />
      </div>

      {/* ── CONTENIDO PRINCIPAL POR ENCIMA DEL FONDO ── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '1rem 1rem 3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem'
      }}>

        {/* ── BANNER DE DONACIONES PARA MANTENER LA PLATAFORMA ── */}
        {showDonationBanner && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: isLight 
              ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.75) 100%)' 
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(180, 83, 9, 0.1) 100%)',
            border: isLight 
              ? '1px solid rgba(245, 158, 11, 0.4)' 
              : '1px solid rgba(245, 158, 11, 0.3)',
            boxShadow: isLight 
              ? '0 4px 16px rgba(245, 158, 11, 0.12)' 
              : '0 4px 20px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              flex: '1 1 320px'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                minWidth: '42px',
                borderRadius: '10px',
                backgroundColor: isLight ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)',
                color: isLight ? '#ffffff' : '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isLight ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
              }}>
                <Heart size={20} fill={isLight ? '#ffffff' : '#fbbf24'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: isLight ? '#92400e' : '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <span>{t('home.donationBannerTitle', '¡Apoya el mantenimiento de OpenMUN!')}</span>
                </div>
                <div style={{
                  fontSize: '0.84rem',
                  color: isLight ? '#78350f' : '#d1d5db',
                  lineHeight: '1.4'
                }}>
                  {t('home.donationBannerDesc', 'OpenMUN es 100% gratuito, libre y sin publicidad. Tu donación nos ayuda a costear los servidores y mantener la plataforma activa para todas las delegaciones.')}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginLeft: 'auto'
            }}>
              <a
                href="https://buymeacoffee.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  backgroundColor: '#ffdd00',
                  color: '#000000',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  textDecoration: 'none',
                  boxShadow: '0 3px 10px rgba(255, 221, 0, 0.3)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 5px 14px rgba(255, 221, 0, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(255, 221, 0, 0.3)';
                }}
              >
                <Coffee size={16} /> {t('home.coffee', 'Invítanos a un café')}
              </a>
              <button
                onClick={() => setShowDonationBanner(false)}
                title="Cerrar banner"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isLight ? '#92400e' : '#9ca3af',
                  padding: '0.35rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.75,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.75';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── 1. HERO SECTION PRINCIPAL ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '3rem 2rem 2.5rem 2rem',
          borderRadius: '16px',
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(22, 25, 34, 0.9)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${borderColor}`,
          boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.04)' : '0 10px 30px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Logo oficial y Badge de Versión */}
          <div style={{
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <OpenMunLogo height={80} isLight={isLight} />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.28rem 0.8rem',
              borderRadius: '9999px',
              backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.18)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: isLight ? '#2563eb' : '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: '700',
              letterSpacing: '0.04em',
              boxShadow: isLight ? '0 2px 8px rgba(59, 130, 246, 0.08)' : '0 2px 10px rgba(0, 0, 0, 0.2)'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 6px #3b82f6'
              }} />
              Beta 1.2
            </div>
          </div>

          {/* Título principal */}
          <h1 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
            fontWeight: '800',
            lineHeight: '1.25',
            maxWidth: '820px',
            margin: '0 0 0.85rem 0',
            letterSpacing: '-0.02em',
            color: textPrimary
          }}>
            {t('home.heroTitle', 'La plataforma abierta y definitiva para Modelos de Naciones Unidas')}
          </h1>

          {/* Subtítulo sobrio y directo */}
          <p style={{
            fontSize: '1.05rem',
            lineHeight: '1.6',
            maxWidth: '680px',
            color: textMuted,
            fontWeight: '400'
          }}>
            {t('home.heroSubtitle', 'Diseñada para Mesas de Presidencia, Delegados, Secretaría y Equipos de Crisis. Sincronización en tiempo real en sesiones en vivo, cronómetros de alta precisión, mapas dinámicos y cero configuraciones de servidor.')}
          </p>

          {/* Accesos Rápidos Principales (Hub de Acción Directa) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            width: '100%',
            maxWidth: '1000px',
            marginBottom: '1.75rem'
          }}>
            {/* Fila Superior: Mesa de Presidencia y Unirse a Sesión */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              width: '100%'
            }}>
              {/* Card 1: Mesa de Presidencia */}
              <div style={{
                backgroundColor: headerBg,
                border: `1px solid ${subBorderColor}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                textAlign: 'left'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Play size={18} style={{ color: accentColor }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                      {t('home.chairCardTitle', 'Mesa de Presidencia')}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
                    {t('home.chairCardDesc', 'Panel de control completo para moderar debate, oradores, caucuses y votaciones.')}
                  </p>
                </div>
                <button
                  onClick={onNavigateToComienzo}
                  style={{
                    padding: '0.65rem 1rem',
                    backgroundColor: accentColor,
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor}
                >
                  <Play size={16} fill="#ffffff" /> {t('home.startModerating', 'Iniciar Moderación')}
                </button>
              </div>

              {/* Card 4: Unirse a Sala (Delegados / P2P) */}
              {onNavigateToJoin && (
                <div style={{
                  backgroundColor: headerBg,
                  border: `1px solid ${subBorderColor}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  textAlign: 'left'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <Radio size={18} style={{ color: '#10b981' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                        {t('home.joinCardTitle', 'Unirse a Sesión')}
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
                      {t('home.joinCardDesc', 'Conéctate en directo mediante código de sala o QR para seguir la sesión.')}
                    </p>
                  </div>
                  <button
                    onClick={onNavigateToJoin}
                    style={{
                      padding: '0.65rem 1rem',
                      backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: isLight ? '#059669' : '#34d399',
                      fontWeight: '700',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)'}
                  >
                    <Radio size={16} /> {t('home.joinLive', 'Unirse a Sesión en Vivo')}
                  </button>
                </div>
              )}
            </div>

            {/* Divider con texto/icono para indicar que esto es para conferencias */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              margin: '0.5rem 0'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: borderColor, opacity: 0.6 }}></div>
              <span style={{
                padding: '0 1rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}>
                <Building2 size={14} style={{ color: '#8b5cf6' }} /> Eventos & Conferencias Online
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: borderColor, opacity: 0.6 }}></div>
            </div>

            {/* Fila Inferior: Crear Conferencia y Unirse a Conferencia */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              width: '100%'
            }}>
              {/* Card 2: Crear Conferencia */}
              <div style={{
                backgroundColor: headerBg,
                border: `1px solid ${subBorderColor}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                textAlign: 'left'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Building2 size={18} style={{ color: '#8b5cf6' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                      {t('conferences.createTitle', 'Crear Conferencia')}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
                    Crea un evento central, organiza comités con PIN y sincroniza todo en vivo.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateConfModalOpen(true)}
                  style={{
                    padding: '0.65rem 1rem',
                    backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.18)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: isLight ? '#7c3aed' : '#a78bfa',
                    fontWeight: '700',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.28)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.18)'}
                >
                  <Sparkles size={16} /> {t('conferences.createBtn', 'Crear Conferencia')}
                </button>
              </div>

              {/* Card 3: Unirse a Conferencia */}
              <div style={{
                backgroundColor: headerBg,
                border: `1px solid ${subBorderColor}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                textAlign: 'left'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Layers size={18} style={{ color: '#0284c7' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: textPrimary }}>
                      {t('conferences.joinTitle', 'Unirse a Conferencia')}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: textMuted, margin: 0, lineHeight: '1.45' }}>
                    Explora comités de un evento, entra como mesa directiva o abre el panel general.
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                      detail: { view: 'conference', mode: 'explore' }
                    }));
                  }}
                  style={{
                    padding: '0.65rem 1rem',
                    backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.18)',
                    border: '1px solid rgba(2, 132, 199, 0.4)',
                    color: isLight ? '#0284c7' : '#38bdf8',
                    fontWeight: '700',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2, 132, 199, 0.28)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.18)'}
                >
                  <Layers size={16} /> {t('conferences.enterConference', 'Entrar en conferencia')}
                </button>
              </div>
            </div>
          </div>

          {/* Botones Complementarios: Donación (Café) y GitHub */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '1.75rem'
          }}>
            {/* Botón de Donaciones */}
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#ffdd00',
                color: '#000000',
                fontSize: '0.88rem',
                fontWeight: '800',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(255, 221, 0, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Coffee size={17} /> {t('home.coffee', 'Invítanos a un café')}
            </a>

            {/* Botón de Tutoriales YouTube */}
            <a
              href="https://www.youtube.com/playlist?list=PLYm1G3W5Ex2k"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: isLight ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(239, 68, 68, 0.45)',
                backgroundColor: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
                color: isLight ? '#dc2626' : '#f87171',
                fontSize: '0.88rem',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: isLight ? '0 2px 8px rgba(239, 68, 68, 0.08)' : '0 2px 10px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)';
              }}
              title={t('header.tutorialsTooltip', 'Ver Vídeos Tutoriales de OpenMUN (YouTube)')}
            >
              <YoutubeIcon size={18} color="#ef4444" /> {t('header.tutorials', 'Vídeos Tutoriales')} <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </a>

            {/* Botón de GitHub */}
            <a
              href="https://github.com/luk4sk4/OPENMUN"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: headerBg,
                color: textPrimary,
                fontSize: '0.88rem',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Code2 size={17} /> {t('home.github', 'Ver Código en GitHub')} <ExternalLink size={13} style={{ opacity: 0.6 }} />
            </a>
          </div>

          {/* Barra informativa de características clave */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            justifyContent: 'center',
            paddingTop: '1.25rem',
            borderTop: `1px solid ${subBorderColor}`,
            width: '100%',
            maxWidth: '850px',
            fontSize: '0.84rem',
            color: textMuted
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
              <ShieldCheck size={16} style={{ color: '#22c55e' }} /> {t('home.freeSoftware', 'Software 100% Libre')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
              <Zap size={16} style={{ color: '#eab308' }} /> {t('home.noRegistration', 'Sin Registro Obligatorio')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
              <Globe size={16} style={{ color: accentColor }} /> {t('home.p2pSync', 'Sincronización P2P')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
              <Laptop size={16} style={{ color: '#a855f7' }} /> {t('home.offlineCompatible', 'Compatible Offline')}
            </span>
          </div>
        </section>

        {/* ── 2. MOSTRADOR DE HERRAMIENTAS (GRID LIMPIO Y HOMOGÉNEO) ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: '800',
              margin: 0,
              color: textPrimary,
              letterSpacing: '-0.01em'
            }}>
              {t('home.systemTools', 'Herramientas del Sistema')}
            </h2>
            <p style={{ fontSize: '0.9rem', color: textMuted, margin: 0 }}>
              {t('home.systemToolsSubtitle', 'Módulos integrados para la moderación eficiente del debate parlamentario.')}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {FEATURES.map((feat, index) => {
              const IconComponent = feat.icon;
              const title = t(`home.features.${index}.title`, feat.title);
              const desc = t(`home.features.${index}.desc`, feat.desc);
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: surfaceBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                    color: accentColor
                  }}>
                    <IconComponent size={20} />
                  </div>

                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    margin: 0,
                    color: textPrimary
                  }}>
                    {title}
                  </h3>

                  <p style={{
                    fontSize: '0.86rem',
                    lineHeight: '1.5',
                    color: textMuted,
                    margin: 0
                  }}>
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. FLUJO DE TRABAJO RÁPIDO ── */}
        <WorkflowSection isLight={isLight} t={t} accentColor={accentColor} borderColor={borderColor} textPrimary={textPrimary} textMuted={textMuted} surfaceBg={surfaceBg} headerBg={headerBg} subBorderColor={subBorderColor} />

        {/* ── 4. PREGUNTAS FRECUENTES (FAQ) ── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          backgroundColor: surfaceBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '16px',
          padding: '1.75rem 1.5rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={18} style={{ color: accentColor }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: textPrimary }}>
                {t('home.faqTitle', 'Preguntas Frecuentes')}
              </h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: textMuted, margin: 0 }}>
              {t('home.faqSubtitle', 'Respuestas a las dudas habituales sobre el funcionamiento y privacidad de OpenMUN.')}
            </p>
          </div>

          {/* Buscador y Filtros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: 'var(--bg-color)',
                  color: textPrimary,
                  fontSize: '0.88rem',
                  outline: 'none'
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
                      padding: '0.3rem 0.7rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: activa ? '700' : '500',
                      border: `1px solid ${activa ? accentColor : borderColor}`,
                      backgroundColor: activa ? accentColor : 'transparent',
                      color: activa ? '#ffffff' : textPrimary,
                      cursor: 'pointer'
                    }}
                  >
                    {catLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Acordeones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {faqsFiltrados.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: textMuted, fontSize: '0.88rem' }}>
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
                      backgroundColor: headerBg,
                      border: `1px solid ${estaAbierto ? accentColor : subBorderColor}`,
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={() => setFaqAbierto(estaAbierto ? null : faq.id)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.18)',
                          color: accentColor,
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}>
                          {catLabel}
                        </span>
                        <span style={{ fontSize: '0.92rem', fontWeight: '600' }}>
                          {pregunta}
                        </span>
                      </div>
                      {estaAbierto ? <ChevronUp size={18} style={{ color: accentColor }} /> : <ChevronDown size={18} style={{ color: textMuted }} />}
                    </button>

                    {estaAbierto && (
                      <div style={{
                        padding: '0 1rem 0.9rem 1rem',
                        fontSize: '0.86rem',
                        lineHeight: '1.55',
                        color: textMuted,
                        borderTop: `1px solid ${subBorderColor}`,
                        paddingTop: '0.75rem'
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

        {/* ── 5. SUGERENCIAS Y COMUNIDAD ── */}
        <section style={{
          backgroundColor: headerBg,
          border: `1px solid ${subBorderColor}`,
          borderRadius: '16px',
          padding: '1.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: textPrimary }}>
              {t('home.communityTitle', 'Sugerencias y Comunidad')}
            </h3>
            <p style={{ fontSize: '0.88rem', color: textMuted, margin: 0, maxWidth: '620px', lineHeight: '1.5' }}>
              {t('home.communityDesc', 'OpenMUN se mantiene en constante evolución. Si deseas reportar un error o sugerir una mejora, contáctanos directamente.')}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: surfaceBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} style={{ color: accentColor }} />
              <span style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'monospace', color: textPrimary }}>
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
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: copiado ? '#22c55e' : 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
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
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: 'transparent',
                  color: textPrimary,
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                <Code2 size={14} /> GitHub <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </a>
            </div>
          </div>
        </section>

        {/* ── 6. FOOTER SOBRIO Y ELEGANTE ── */}
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
            <a
              href="https://github.com/luk4sk4"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: textPrimary, textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="https://linkedin.com/in/lucas-kowalski"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: textPrimary, textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              LinkedIn
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.25rem 0' }}>
            <button
              onClick={() => navigateTo('/privacy')}
              style={{ background: 'none', border: 'none', padding: 0, color: accentColor, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'underline' }}
            >
              {t('legalBanner.privacyLink', 'Política de Privacidad')}
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('/terms')}
              style={{ background: 'none', border: 'none', padding: 0, color: accentColor, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'underline' }}
            >
              {t('legalBanner.termsLink', 'Términos y Condiciones')}
            </button>
            <span>•</span>
            <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>
              🍪 0 Cookies / 100% LocalStorage
            </span>
          </div>

          <div>
            OpenMUN Beta 1.2 © {new Date().getFullYear()} — {t('home.footerDesc', 'Software Libre para Modelos de Naciones Unidas')}
          </div>
          <div>
            {t('home.footerTagline', 'Por una cultura accesible para todos')}
          </div>
        </footer>
      </div>

      {/* Modal Crear Conferencia */}
      <Suspense fallback={null}>
        <CreateConferenceModal
          isOpen={isCreateConfModalOpen}
          onClose={() => setIsCreateConfModalOpen(false)}
          isLight={isLight}
        />
      </Suspense>
    </div>
  );
};

export default HomePage;

