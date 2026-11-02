import { useTranslation } from 'react-i18next';
import React, { useEffect, Suspense } from 'react';
import { SessionProvider } from './context/SessionContext';
import { P2PProvider, useP2P } from './context/P2PContext';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { ToastProvider } from './context/ToastContext';
import NetworkCrashMonitor from './components/common/NetworkCrashMonitor';
import LegalBanner from './components/common/LegalBanner';
import RootErrorBoundary from './components/common/RootErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useRouter } from './utils/router';
import {
  DashboardSkeleton,
  DelegateSkeleton,
  SecretariatSkeleton,
  StaffSkeleton,
  BackroomSkeleton,
  ConferenceSkeleton,
  JoinSessionSkeleton,
  PageSkeleton
} from './components/skeletons/ViewSkeletons';

const Dashboard = lazyWithRetry(() => import('./layouts/Dashboard'), 'Dashboard');
const DelegateView = lazyWithRetry(() => import('./components/views/DelegateView'), 'DelegateView');
const SecretariatView = lazyWithRetry(() => import('./components/views/SecretariatView'), 'SecretariatView');
const StaffView = lazyWithRetry(() => import('./components/views/StaffView'), 'StaffView');
const BackroomView = lazyWithRetry(() => import('./components/views/BackroomView'), 'BackroomView');
const JoinSessionView = lazyWithRetry(() => import('./components/views/JoinSessionView'), 'JoinSessionView');
const ConferenceView = lazyWithRetry(() => import('./components/views/ConferenceView'), 'ConferenceView');
const CreateConferenceView = lazyWithRetry(() => import('./components/views/CreateConferenceView'), 'CreateConferenceView');
const PrivacyPolicyPage = lazyWithRetry(() => import('./components/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsConditionsPage = lazyWithRetry(() => import('./components/pages/TermsConditionsPage'), 'TermsConditionsPage');


function AppContent() {
  const { t } = useTranslation();
  const { viewMode, setViewMode, joinRoom } = useP2P();
  const { isLight } = useAccessibility();
  const { route, navigateTo } = useRouter();
  const [conferenceParams, setConferenceParams] = React.useState({ confId: '', mode: 'explore' });

  useEffect(() => {
    const handleNavigateView = (e) => {
      if (e.detail?.view === 'conference') {
        setConferenceParams({
          confId: e.detail.confId || '',
          mode: e.detail.mode || 'explore'
        });
        setViewMode('conference');
      } else if (e.detail?.view === 'create-conference') {
        setViewMode('create-conference');
      }
    };
    window.addEventListener('openmun_navigate_view', handleNavigateView);
    return () => window.removeEventListener('openmun_navigate_view', handleNavigateView);
  }, [setViewMode]);

  useEffect(() => {
    if (route === 'privacy') return;
    if (route === 'terms') return;
    if (route === 'create-conference' || viewMode === 'create-conference') {
      document.title = t('pageTitles.createConference');
      return;
    }

    switch (viewMode) {
      case 'create-conference':
        document.title = t('pageTitles.createConference');
        break;
      case 'conference':
        document.title = t('pageTitles.conference');
        break;
      case 'backroom':
        document.title = 'OpenMUN - Backroom';
        break;
      case 'staff':
        document.title = 'OpenMUN - Staff';
        break;
      case 'secretariat':
        document.title = t('pageTitles.secretariat');
        break;
      case 'delegate':
        document.title = t('pageTitles.delegate');
        break;
      case 'join':
        document.title = t('pageTitles.join');
        break;
      case 'chair':
      default:
        document.title = 'OpenMUN';
        break;
    }
  }, [viewMode, route, t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isLocal = params.get('local') === 'true';
      const mode = params.get('mode');

      if (mode === 'conference' || params.get('conf')) {
        setConferenceParams({
          confId: params.get('conf') || '',
          mode: params.get('admin') === 'true' ? 'admin' : 'explore'
        });
        setViewMode('conference');
      } else if (mode === 'create-conference' || mode === 'crear-conferencia') {
        setViewMode('create-conference');
      } else if (isLocal && mode === 'secretariat') {
        // Conexión automática por BroadcastChannel para pantalla secreta local
        joinRoom({
          targetRole: 'secretariat',
          isLocalBroadcast: true
        });
      } else if (isLocal && mode === 'staff') {
        // Conexión automática por BroadcastChannel para consola de staff local
        joinRoom({
          targetRole: 'staff',
          isLocalBroadcast: true
        });
      } else if (mode === 'delegate') {
        const savedRoom = params.get('room') || (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : '');
        const savedCountry = typeof window !== 'undefined' ? (localStorage.getItem('openmun_last_country') || '') : '';
        if (savedRoom) {
          joinRoom({
            targetRoomId: savedRoom,
            targetRole: 'delegate',
            country: savedCountry
          });
        }
      } else if (mode === 'backroom') {
        const savedRoom = params.get('room') || (typeof window !== 'undefined' ? localStorage.getItem('openmun_last_room_id') : '');
        const pass = typeof window !== 'undefined' ? (localStorage.getItem('openmun_backroom_pass') || '') : '';
        if (savedRoom) {
          joinRoom({
            targetRoomId: savedRoom,
            targetRole: 'backroom',
            password: pass
          });
        }
      }
    }
  }, [joinRoom, setViewMode]);

  // Si la ruta solicitada es Privacidad o Términos, renderizamos su página específica
  if (route === 'privacy') {
    return (
      <Suspense fallback={<PageSkeleton isLight={isLight} />}>
        <PrivacyPolicyPage isLight={isLight} onBack={() => navigateTo('/')} />
      </Suspense>
    );
  }

  if (route === 'terms') {
    return (
      <Suspense fallback={<PageSkeleton isLight={isLight} />}>
        <TermsConditionsPage isLight={isLight} onBack={() => navigateTo('/')} />
      </Suspense>
    );
  }

  if (route === 'create-conference') {
    return (
      <Suspense fallback={<PageSkeleton isLight={isLight} />}>
        <CreateConferenceView isLight={isLight} onBack={() => navigateTo('/')} />
      </Suspense>
    );
  }

  const handleExitStaffOrSecretariat = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      ['mode', 'local'].forEach(p => {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
      }
    }
    const confId = typeof window !== 'undefined' ? localStorage.getItem('openmun_current_conf_id') : null;
    if (confId) {
      setConferenceParams({ confId, mode: 'explore' });
      setViewMode('conference');
    } else {
      setViewMode('chair');
    }
  };

  let currentView;
  let viewFallback;

  if (viewMode === 'conference') {
    currentView = (
      <ConferenceView
        initialConfId={conferenceParams.confId}
        initialMode={conferenceParams.mode}
        isLight={isLight}
        onExit={() => setViewMode('chair')}
      />
    );
    viewFallback = <ConferenceSkeleton isLight={isLight} />;
  } else if (viewMode === 'delegate') {
    currentView = <DelegateView isLight={isLight} onExit={() => setViewMode('chair')} />;
    viewFallback = <DelegateSkeleton isLight={isLight} />;
  } else if (viewMode === 'secretariat') {
    currentView = <SecretariatView isLight={isLight} onExit={handleExitStaffOrSecretariat} />;
    viewFallback = <SecretariatSkeleton isLight={isLight} />;
  } else if (viewMode === 'staff') {
    currentView = <StaffView isLight={isLight} onExit={handleExitStaffOrSecretariat} />;
    viewFallback = <StaffSkeleton isLight={isLight} />;
  } else if (viewMode === 'backroom') {
    currentView = <BackroomView isLight={isLight} onExit={() => setViewMode('chair')} />;
    viewFallback = <BackroomSkeleton isLight={isLight} />;
  } else if (viewMode === 'create-conference') {
    currentView = <CreateConferenceView isLight={isLight} onBack={() => setViewMode('chair')} />;
    viewFallback = <PageSkeleton isLight={isLight} />;
  } else if (viewMode === 'join') {
    currentView = <JoinSessionView isLight={isLight} onBackToChair={() => setViewMode('chair')} />;
    viewFallback = <JoinSessionSkeleton isLight={isLight} />;
  } else {
    currentView = <Dashboard />;
    viewFallback = <DashboardSkeleton isLight={isLight} />;
  }

  return (
    <>
      <NetworkCrashMonitor />
      <Suspense fallback={viewFallback}>
        {currentView}
        <LegalBanner isLight={isLight} />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <RootErrorBoundary>
      <AccessibilityProvider>
        <ToastProvider>
          <SessionProvider>
            <P2PProvider>
              <AppContent />
            </P2PProvider>
          </SessionProvider>
        </ToastProvider>
      </AccessibilityProvider>
    </RootErrorBoundary>
  );
}

export default App;
