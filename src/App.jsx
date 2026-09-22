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
const PrivacyPolicyPage = lazyWithRetry(() => import('./components/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsConditionsPage = lazyWithRetry(() => import('./components/pages/TermsConditionsPage'), 'TermsConditionsPage');


function AppContent() {
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
      }
    };
    window.addEventListener('openmun_navigate_view', handleNavigateView);
    return () => window.removeEventListener('openmun_navigate_view', handleNavigateView);
  }, [setViewMode]);

  useEffect(() => {
    if (route === 'privacy') return;
    if (route === 'terms') return;

    switch (viewMode) {
      case 'conference':
        document.title = 'OpenMUN - Conferencia';
        break;
      case 'backroom':
        document.title = 'OpenMUN - Backroom';
        break;
      case 'staff':
        document.title = 'OpenMUN - Staff';
        break;
      case 'secretariat':
        document.title = 'OpenMUN - Secretaría';
        break;
      case 'delegate':
        document.title = 'OpenMUN - Delegación';
        break;
      case 'join':
        document.title = 'OpenMUN - Unirse a Sala';
        break;
      case 'chair':
      default:
        document.title = 'OpenMUN';
        break;
    }
  }, [viewMode, route]);

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
    currentView = <SecretariatView isLight={isLight} onExit={() => setViewMode('chair')} />;
    viewFallback = <SecretariatSkeleton isLight={isLight} />;
  } else if (viewMode === 'staff') {
    currentView = <StaffView isLight={isLight} onExit={() => setViewMode('chair')} />;
    viewFallback = <StaffSkeleton isLight={isLight} />;
  } else if (viewMode === 'backroom') {
    currentView = <BackroomView isLight={isLight} onExit={() => setViewMode('chair')} />;
    viewFallback = <BackroomSkeleton isLight={isLight} />;
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
