import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type FC,
} from 'react';
import type {
  ImproverState,
  ModelOption,
  Prefs,
  ReasoningEffort,
  AskAnswer,
} from '@shared/types.js';

interface ImproverContextType {
  state: ImproverState;
  models: ModelOption[];
  prefs: Prefs | null;
  draftText: string;
  repoPath: string;
  selectedModelId: string;
  reasoningEffort: ReasoningEffort;
  apiKeyPromptOpen: boolean;
  setDraftText: (text: string) => void;
  chooseRepo: () => Promise<void>;
  setRepoPath: (path: string) => Promise<{ ok: boolean; error?: string }>;
  setSelectedModelId: (id: string) => void;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  startImprove: () => Promise<void>;
  answerAsk: (answers: AskAnswer[]) => Promise<void>;
  cancelSession: () => Promise<void>;
  copyText: (text: string) => Promise<void>;
  useAsDraft: () => void;
  newPrompt: () => void;
  retry: () => Promise<void>;
  submitFactoryApiKey: (apiKey: string) => Promise<string | null>;
  dismissFactoryApiKeyPrompt: () => void;
}

const DEFAULT_STATE: ImproverState = {
  phase: 'idle',
  draft: '',
  repoPath: null,
  modelId: '',
  reasoningEffort: 'medium',
  elapsedSeconds: 0,
  activity: [],
  pendingAsk: null,
  answered: [],
  result: '',
  error: null,
};

const ImproverContext = createContext<ImproverContextType | null>(null);

export const ImproverProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ImproverState>(DEFAULT_STATE);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  const [draftText, setDraftText] = useState('');
  const [repoPath, setRepoPathState] = useState('');
  const [selectedModelId, setSelectedModelIdState] = useState('');
  const [reasoningEffort, setReasoningEffortState] = useState<ReasoningEffort>('medium');
  const [apiKeyPromptOpen, setApiKeyPromptOpen] = useState(false);
  const pendingStartAfterApiKey = useRef(false);

  // Load initial state, models, prefs, and API-key status
  useEffect(() => {
    window.improver.getState().then((initialState) => {
      setState(initialState);
      if (initialState.draft) {
        setDraftText((prev) => prev || initialState.draft);
      }
      if (initialState.repoPath) {
        setRepoPathState((prev) => prev || (initialState.repoPath ?? ''));
      }
    });

    window.improver.listModels().then((loadedModels) => {
      setModels(loadedModels);
    });

    window.improver.getPrefs().then((loadedPrefs) => {
      setPrefs(loadedPrefs);
      if (loadedPrefs.lastRepositoryPath) {
        setRepoPathState(loadedPrefs.lastRepositoryPath);
      }
      if (loadedPrefs.selectedModelId !== undefined) {
        setSelectedModelIdState(loadedPrefs.selectedModelId);
      }
      if (loadedPrefs.reasoningEffort) {
        setReasoningEffortState(loadedPrefs.reasoningEffort);
      }
    });

    window.improver.getFactoryApiKeyStatus().then((status) => {
      if (!status.configured) {
        pendingStartAfterApiKey.current = false;
        setApiKeyPromptOpen(true);
      }
    });

    const unsubscribe = window.improver.onStateChange((nextState) => {
      setState(nextState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const chooseRepo = useCallback(async () => {
    const chosen = await window.improver.chooseRepo();
    if (chosen) {
      setRepoPathState(chosen);
    }
  }, []);

  const setRepoPath = useCallback(async (path: string) => {
    const res = await window.improver.setRepo(path);
    if (res.ok) {
      setRepoPathState(path);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id);
    window.improver.setPrefs({ selectedModelId: id });
  }, []);

  const setReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setReasoningEffortState(effort);
    window.improver.setPrefs({ reasoningEffort: effort });
  }, []);

  const runStart = useCallback(async () => {
    const result = await window.improver.start({
      draft: draftText,
      repoPath,
      modelId: selectedModelId,
      reasoningEffort,
    });

    if (!result.ok && result.reason === 'api-key-required') {
      pendingStartAfterApiKey.current = true;
      setApiKeyPromptOpen(true);
    }
  }, [draftText, repoPath, selectedModelId, reasoningEffort]);

  const startImprove = useCallback(async () => {
    if (!draftText.trim() || !repoPath) return;

    const status = await window.improver.getFactoryApiKeyStatus();
    if (!status.configured) {
      pendingStartAfterApiKey.current = true;
      setApiKeyPromptOpen(true);
      return;
    }

    await runStart();
  }, [draftText, repoPath, runStart]);

  const answerAsk = useCallback(async (answers: AskAnswer[]) => {
    await window.improver.answerAsk(answers);
  }, []);

  const cancelSession = useCallback(async () => {
    await window.improver.cancel();
  }, []);

  const copyText = useCallback(async (text: string) => {
    await window.improver.copy(text);
  }, []);

  const useAsDraft = useCallback(() => {
    if (state.result) {
      setDraftText(state.result);
    }
    cancelSession();
  }, [state.result, cancelSession]);

  const newPrompt = useCallback(() => {
    setDraftText('');
    cancelSession();
  }, [cancelSession]);

  const retry = useCallback(async () => {
    if (!draftText.trim() || !repoPath) return;
    await startImprove();
  }, [draftText, repoPath, startImprove]);

  const submitFactoryApiKey = useCallback(
    async (apiKey: string): Promise<string | null> => {
      const result = await window.improver.setFactoryApiKey(apiKey);
      if (!result.ok) {
        return result.error;
      }

      const shouldStart = pendingStartAfterApiKey.current;
      pendingStartAfterApiKey.current = false;
      setApiKeyPromptOpen(false);
      if (shouldStart) {
        await runStart();
      }
      return null;
    },
    [runStart],
  );

  const dismissFactoryApiKeyPrompt = useCallback(() => {
    setApiKeyPromptOpen(false);
    pendingStartAfterApiKey.current = false;
  }, []);

  return (
    <ImproverContext.Provider
      value={{
        state,
        models,
        prefs,
        draftText,
        repoPath,
        selectedModelId,
        reasoningEffort,
        apiKeyPromptOpen,
        setDraftText,
        chooseRepo,
        setRepoPath,
        setSelectedModelId,
        setReasoningEffort,
        startImprove,
        answerAsk,
        cancelSession,
        copyText,
        useAsDraft,
        newPrompt,
        retry,
        submitFactoryApiKey,
        dismissFactoryApiKeyPrompt,
      }}
    >
      {children}
    </ImproverContext.Provider>
  );
};

export function useImprover(): ImproverContextType {
  const context = useContext(ImproverContext);
  if (!context) {
    throw new Error('useImprover must be used within an ImproverProvider');
  }
  return context;
}
