import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { resolveEnv } from './env.js';
import { registerIpcHandlers } from './ipc.js';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 840,
    height: 880,
    minWidth: 720,
    minHeight: 760,
    title: 'Prompt Improver',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#020202',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/bridge.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  await resolveEnv();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  } else {
    app.quit();
  }
});
