import type {
  ImproverState,
  StartSessionInput,
  AskAnswer,
  ModelOption,
  Prefs,
  FactoryApiKeyStatus,
  SetFactoryApiKeyResult,
  StartSessionResult,
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
  GET_FACTORY_API_KEY_STATUS: 'improver:getFactoryApiKeyStatus',
  SET_FACTORY_API_KEY: 'improver:setFactoryApiKey',
} as const;

export interface ImproverApi {
  getState(): Promise<ImproverState>;
  start(input: StartSessionInput): Promise<StartSessionResult>;
  answerAsk(answers: AskAnswer[]): Promise<boolean>;
  cancel(): Promise<void>;
  chooseRepo(): Promise<string | null>;
  setRepo(path: string): Promise<{ ok: true } | { ok: false; error: string }>;
  listModels(): Promise<ModelOption[]>;
  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<Prefs>;
  copy(text: string): Promise<void>;
  getFactoryApiKeyStatus(): Promise<FactoryApiKeyStatus>;
  setFactoryApiKey(apiKey: string): Promise<SetFactoryApiKeyResult>;
  onStateChange(callback: (state: ImproverState) => void): () => void;
  getPathForFile(file: File): string;
}
