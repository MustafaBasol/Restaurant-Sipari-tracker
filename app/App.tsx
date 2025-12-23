import React from 'react';
import Providers from './Providers';
import Router from './Router';
import { useAuth } from '../features/auth/hooks/useAuth';
import MfaSetupModal from '../features/auth/components/MfaSetupModal';

const MfaSetupEnforcer: React.FC = () => {
  const { authState, updateUserInState } = useAuth();
  const [dismissedSessionId, setDismissedSessionId] = React.useState<string | null>(null);
  const [hash, setHash] = React.useState(() => window.location.hash);

  const sessionId = authState?.sessionId ?? null;

  React.useEffect(() => {
    setDismissedSessionId(null);
  }, [sessionId]);

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isInApp = hash.startsWith('#/app');
  const needsSetup = Boolean(authState && authState.user && !authState.user.mfaEnabledAt);
  const isDismissedForThisSession = Boolean(sessionId && dismissedSessionId === sessionId);

  const isOpen = Boolean(isInApp && needsSetup && !isDismissedForThisSession);

  if (!authState) return null;

  return (
    <MfaSetupModal
      isOpen={isOpen}
      onClose={() => {
        if (sessionId) setDismissedSessionId(sessionId);
      }}
      onEnabled={(mfaEnabledAt) => {
        updateUserInState({ mfaEnabledAt });
      }}
    />
  );
};

const App: React.FC = () => {
  return (
    <Providers>
      <div className="min-h-screen text-text-primary font-sans">
        <Router />
        <MfaSetupEnforcer />
      </div>
    </Providers>
  );
};

export default App;
