import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type { Prefs } from '@shared/types.js';

const DEFAULT_PREFS: Prefs = {
  lastRepositoryPath: '',
  selectedModelId: '',
  reasoningEffort: 'medium',
};

let customPrefsPath: string | null = null;

export function getPrefsFilePath(): string {
  if (customPrefsPath) return customPrefsPath;
  try {
    return join(app.getPath('userData'), 'prefs.json');
  } catch {
    return join(process.cwd(), '.prefs.json');
  }
}

export function setPrefsFilePathForTest(path: string | null): void {
  customPrefsPath = path;
}

export function validateRepoPath(path: string): string {
  if (!path || typeof path !== 'string') return '';
  try {
    if (existsSync(path) && statSync(path).isDirectory()) {
      return path;
    }
  } catch {
    return '';
  }
  return '';
}

export function loadPrefs(): Prefs {
  const filePath = getPrefsFilePath();
  if (!existsSync(filePath)) {
    return { ...DEFAULT_PREFS };
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<Prefs>;
    const reasoning = data.reasoningEffort;
    const validReasoning =
      reasoning === 'off' ||
      reasoning === 'low' ||
      reasoning === 'medium' ||
      reasoning === 'high' ||
      reasoning === 'xhigh' ||
      reasoning === 'max'
        ? reasoning
        : DEFAULT_PREFS.reasoningEffort;

    return {
      lastRepositoryPath: validateRepoPath(data.lastRepositoryPath ?? ''),
      selectedModelId: typeof data.selectedModelId === 'string' ? data.selectedModelId : '',
      reasoningEffort: validReasoning,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  const filePath = getPrefsFilePath();
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(prefs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save prefs:', err);
  }
}

export function updatePrefs(patch: Partial<Prefs>): Prefs {
  const current = loadPrefs();
  const next: Prefs = {
    lastRepositoryPath:
      patch.lastRepositoryPath !== undefined
        ? validateRepoPath(patch.lastRepositoryPath)
        : current.lastRepositoryPath,
    selectedModelId:
      patch.selectedModelId !== undefined ? patch.selectedModelId : current.selectedModelId,
    reasoningEffort:
      patch.reasoningEffort !== undefined ? patch.reasoningEffort : current.reasoningEffort,
  };
  savePrefs(next);
  return next;
}
