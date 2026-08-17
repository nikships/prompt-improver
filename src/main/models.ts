import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ModelOption } from '@shared/types.js';

export const SYSTEM_DEFAULT_MODEL: ModelOption = {
  id: '',
  displayName: 'Default',
};

export const BUILTIN_MODELS: ModelOption[] = [
  { id: 'claude-opus-5', displayName: 'Claude Opus 5' },
  { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5' },
  { id: 'gpt-5.3-codex', displayName: 'GPT-5.3 Codex' },
];

export function getSettingsFilePath(): string {
  return join(homedir(), '.factory', 'settings.json');
}

export function loadCustomModels(settingsPath?: string): ModelOption[] {
  const filePath = settingsPath ?? getSettingsFilePath();
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const custom = Array.isArray(parsed.customModels) ? parsed.customModels : [];

    const models: ModelOption[] = [];
    for (const entry of custom) {
      if (!entry || typeof entry !== 'object') continue;
      const raw = entry as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      if (!id) continue;

      const displayName =
        typeof raw.displayName === 'string' && raw.displayName.trim()
          ? raw.displayName.trim()
          : typeof raw.model === 'string' && raw.model.trim()
            ? raw.model.trim()
            : id;

      models.push({ id, displayName });
    }

    return models.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
    );
  } catch {
    return [];
  }
}

export function listModels(settingsPath?: string): ModelOption[] {
  const custom = loadCustomModels(settingsPath);
  return [SYSTEM_DEFAULT_MODEL, ...BUILTIN_MODELS, ...custom];
}
