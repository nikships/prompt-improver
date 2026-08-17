import type {
  ImproverState,
  StartSessionInput,
  AskAnswer,
  ModelOption,
  Prefs,
} from './types.js';

export const IPC_CHANNELS = {
  GET_STATE: 'improver:getState',
  START: 'improver:start',
  ANSWER_ASK: 'improver:answerAsk',
  CANCEL: 'improver:cancel',
  CHOOSE_REPO: 'improver:chooseRepo',
  SET_REPO: 'improver:setRepo',
  LIST_MODELS: 'improver:listModels',
  GET_PREFS: 'improver:getPrefs',
  SET_PREFS: 'improver:setPrefs',
  COPY: 'improver:copy',
  STATE_CHANGE: 'improver:state',
} as const;

export interface ImproverApi {
  getState(): Promise<ImproverState>;
  start(input: StartSessionInput): Promise<ImproverState>;
  answerAsk(answers: AskAnswer[]): Promise<boolean>;
  cancel(): Promise<void>;
  chooseRepo(): Promise<string | null>;
  setRepo(path: string): Promise<{ ok: true } | { ok: false; error: string }>;
  listModels(): Promise<ModelOption[]>;
  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<Prefs>;
  copy(text: string): Promise<void>;
  onStateChange(callback: (state: ImproverState) => void): () => void;
  getPathForFile(file: File): string;
}
