export type SessionPhase =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'asking'
  | 'resuming'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelOption {
  id: string;
  displayName: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  at: number;
}

export interface AskQuestion {
  index: number;
  topic: string;
  question: string;
  options: string[];
  multiSelect: boolean;
}

export interface PendingAsk {
  askId: string;
  questions: AskQuestion[];
}

export interface AnsweredItem {
  topic: string;
  question: string;
  answer: string;
}

export interface ImproverState {
  phase: SessionPhase;
  draft: string;
  repoPath: string | null;
  modelId: string;
  reasoningEffort: ReasoningEffort;
  elapsedSeconds: number;
  activity: ActivityItem[];
  pendingAsk: PendingAsk | null;
  answered: AnsweredItem[];
  result: string;
  error: string | null;
}

export interface AskAnswer {
  index: number;
  answer: string;
}

export interface Prefs {
  lastRepositoryPath: string;
  selectedModelId: string;
  reasoningEffort: ReasoningEffort;
}

export interface StartSessionInput {
  draft: string;
  repoPath: string;
  modelId: string;
  reasoningEffort: ReasoningEffort;
}
