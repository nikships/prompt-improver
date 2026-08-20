import type { FC, ReactNode } from 'react';
import { useImprover, ImproverProvider } from './store/improver.js';
import { ComposeScreen } from './screens/ComposeScreen.js';
import { SessionScreen } from './screens/SessionScreen.js';
import { ResultScreen } from './screens/ResultScreen.js';
import { ApiKeyDialog } from './components/ApiKeyDialog.js';

const AppContent: FC = () => {
  const { state, apiKeyPromptOpen, submitFactoryApiKey, dismissFactoryApiKeyPrompt } = useImprover();

  let screen: ReactNode;
  switch (state.phase) {
    case 'starting':
    case 'scanning':
    case 'asking':
    case 'resuming':
      screen = <SessionScreen />;
      break;
    case 'complete':
    case 'failed':
      screen = <ResultScreen />;
      break;
    case 'idle':
    case 'cancelled':
    default:
      screen = <ComposeScreen />;
      break;
  }

  return (
    <>
      {screen}
      <ApiKeyDialog
        open={apiKeyPromptOpen}
        onSubmit={submitFactoryApiKey}
        onDismiss={dismissFactoryApiKeyPrompt}
      />
    </>
  );
};

export const App: FC = () => {
  return (
    <ImproverProvider>
      <AppContent />
    </ImproverProvider>
  );
};
