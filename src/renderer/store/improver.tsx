import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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

  // Load initial state, models, prefs
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

  const startImprove = useCallback(async () => {
    if (!draftText.trim() || !repoPath) return;

    await window.improver.start({
      draft: draftText,
      repoPath,
      modelId: selectedModelId,
      reasoningEffort,
    });
  }, [draftText, repoPath, selectedModelId, reasoningEffort]);

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
