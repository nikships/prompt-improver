import type { FC } from 'react';
import { useImprover, ImproverProvider } from './store/improver.js';
import { ComposeScreen } from './screens/ComposeScreen.js';
import { SessionScreen } from './screens/SessionScreen.js';
import { ResultScreen } from './screens/ResultScreen.js';

const AppContent: FC = () => {
  const { state } = useImprover();

  switch (state.phase) {
    case 'starting':
    case 'scanning':
    case 'asking':
    case 'resuming':
      return <SessionScreen />;
    case 'complete':
    case 'failed':
      return <ResultScreen />;
    case 'idle':
    case 'cancelled':
    default:
      return <ComposeScreen />;
  }
};

export const App: FC = () => {
  return (
    <ImproverProvider>
      <AppContent />
    </ImproverProvider>
  );
};
