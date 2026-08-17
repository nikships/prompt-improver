import { ipcMain, dialog, clipboard, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-contract.js';
import type { StartSessionInput, AskAnswer, Prefs } from '@shared/types.js';
import { improverSession } from './droid/session.js';
import { listModels } from './models.js';
import { loadPrefs, updatePrefs, validateRepoPath } from './prefs.js';

export function registerIpcHandlers(): void {
  // Push state changes to all renderer windows
  improverSession.subscribe((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.STATE_CHANGE, state);
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
    return improverSession.getState();
  });

  ipcMain.handle(IPC_CHANNELS.START, async (_event, input: StartSessionInput) => {
    return await improverSession.start(input);
  });

  ipcMain.handle(IPC_CHANNELS.ANSWER_ASK, (_event, answers: AskAnswer[]) => {
    return improverSession.answerAsk(answers);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL, async () => {
    await improverSession.cancel();
  });

  ipcMain.handle(IPC_CHANNELS.CHOOSE_REPO, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const prefs = loadPrefs();
    const result = await dialog.showOpenDialog(win ?? undefined as unknown as BrowserWindow, {
      title: 'Select Repository',
      message: 'Choose the local repository the prompt is about.',
      properties: ['openDirectory'],
      defaultPath: prefs.lastRepositoryPath || undefined,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selected = result.filePaths[0];
      updatePrefs({ lastRepositoryPath: selected });
      return selected;
    }
    return null;
  });

  ipcMain.handle(IPC_CHANNELS.SET_REPO, (_event, path: string) => {
    const valid = validateRepoPath(path);
    if (valid) {
      updatePrefs({ lastRepositoryPath: valid });
      return { ok: true as const };
    }
    return { ok: false as const, error: 'Selected path is not a valid directory.' };
  });

  ipcMain.handle(IPC_CHANNELS.LIST_MODELS, () => {
    return listModels();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PREFS, () => {
    return loadPrefs();
  });

  ipcMain.handle(IPC_CHANNELS.SET_PREFS, (_event, patch: Partial<Prefs>) => {
    return updatePrefs(patch);
  });

  ipcMain.handle(IPC_CHANNELS.COPY, (_event, text: string) => {
    clipboard.writeText(text);
  });
}
