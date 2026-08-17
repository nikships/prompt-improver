import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS, type ImproverApi } from '@shared/ipc-contract.js';
import type {
  ImproverState,
  StartSessionInput,
  AskAnswer,
  Prefs,
  ModelOption,
} from '@shared/types.js';

const api: ImproverApi = {
  getState(): Promise<ImproverState> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_STATE);
  },
  start(input: StartSessionInput): Promise<ImproverState> {
    return ipcRenderer.invoke(IPC_CHANNELS.START, input);
  },
  answerAsk(answers: AskAnswer[]): Promise<boolean> {
    return ipcRenderer.invoke(IPC_CHANNELS.ANSWER_ASK, answers);
  },
  cancel(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL);
  },
  chooseRepo(): Promise<string | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.CHOOSE_REPO);
  },
  setRepo(path: string): Promise<{ ok: true } | { ok: false; error: string }> {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_REPO, path);
  },
  listModels(): Promise<ModelOption[]> {
    return ipcRenderer.invoke(IPC_CHANNELS.LIST_MODELS);
  },
  getPrefs(): Promise<Prefs> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PREFS);
  },
  setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_PREFS, patch);
  },
  copy(text: string): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.COPY, text);
  },
  onStateChange(callback: (state: ImproverState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: ImproverState) => {
      callback(state);
    };
    ipcRenderer.on(IPC_CHANNELS.STATE_CHANGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STATE_CHANGE, handler);
    };
  },
  getPathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },
};

contextBridge.exposeInMainWorld('improver', api);
