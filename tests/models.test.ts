import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  listModels,
  loadCustomModels,
  SYSTEM_DEFAULT_MODEL,
  BUILTIN_MODELS,
} from '../src/main/models.js';

describe('models', () => {
  const testDir = join(tmpdir(), `prompt-improver-models-test-${Date.now()}`);
  const testSettingsPath = join(testDir, 'settings.json');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('lists default model and builtins when no settings file exists', () => {
    const models = listModels(join(testDir, 'nonexistent.json'));
    expect(models[0]).toEqual(SYSTEM_DEFAULT_MODEL);
    expect(models.slice(1, 4)).toEqual(BUILTIN_MODELS);
    expect(models).toHaveLength(4);
  });

  it('loads and sorts custom models from settings.json', () => {
    const settings = {
      customModels: [
        { id: 'custom-b', displayName: 'Zeta Model' },
        { id: 'custom-a', displayName: 'Alpha Model' },
        { id: 'custom-c', model: 'Beta Model' },
        { id: 'custom-d' }, // fallback to id
        { id: '' }, // empty id should be ignored
      ],
    };
    writeFileSync(testSettingsPath, JSON.stringify(settings));

    const custom = loadCustomModels(testSettingsPath);
    expect(custom).toHaveLength(4);
    expect(custom[0]).toEqual({ id: 'custom-a', displayName: 'Alpha Model' });
    expect(custom[1]).toEqual({ id: 'custom-c', displayName: 'Beta Model' });
    expect(custom[2]).toEqual({ id: 'custom-d', displayName: 'custom-d' });
    expect(custom[3]).toEqual({ id: 'custom-b', displayName: 'Zeta Model' });

    const allModels = listModels(testSettingsPath);
    expect(allModels).toHaveLength(8);
    expect(allModels[0].displayName).toBe('Default');
  });

  it('handles malformed settings file gracefully', () => {
    writeFileSync(testSettingsPath, 'invalid json {');
    const custom = loadCustomModels(testSettingsPath);
    expect(custom).toEqual([]);

    const allModels = listModels(testSettingsPath);
    expect(allModels).toHaveLength(4);
  });
});
