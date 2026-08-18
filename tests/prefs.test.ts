import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadPrefs,
  savePrefs,
  updatePrefs,
  setPrefsFilePathForTest,
  validateRepoPath,
} from '../src/main/prefs.js';

describe('prefs', () => {
  const testDir = join(tmpdir(), `prompt-improver-prefs-test-${Date.now()}`);
  const testPrefsPath = join(testDir, 'prefs.json');
  const validRepoDir = join(testDir, 'valid-repo');

  beforeEach(() => {
    mkdirSync(validRepoDir, { recursive: true });
    setPrefsFilePathForTest(testPrefsPath);
  });

  afterEach(() => {
    setPrefsFilePathForTest(null);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('loads default prefs when file does not exist', () => {
    const prefs = loadPrefs();
    expect(prefs).toEqual({
      lastRepositoryPath: '',
      selectedModelId: '',
      reasoningEffort: 'medium',
    });
  });

  it('validates repository directory existence', () => {
    expect(validateRepoPath(validRepoDir)).toBe(validRepoDir);
    expect(validateRepoPath(join(testDir, 'nonexistent'))).toBe('');
    expect(validateRepoPath('')).toBe('');
  });

  it('saves and loads round-tripped prefs', () => {
    savePrefs({
      lastRepositoryPath: validRepoDir,
      selectedModelId: 'claude-opus-5',
      reasoningEffort: 'high',
    });

    const loaded = loadPrefs();
    expect(loaded).toEqual({
      lastRepositoryPath: validRepoDir,
      selectedModelId: 'claude-opus-5',
      reasoningEffort: 'high',
    });
  });

  it('drops invalid repository path on load', () => {
    savePrefs({
      lastRepositoryPath: join(testDir, 'nonexistent-path'),
      selectedModelId: 'gpt-5.3-codex',
      reasoningEffort: 'low',
    });

    const loaded = loadPrefs();
    expect(loaded.lastRepositoryPath).toBe('');
    expect(loaded.selectedModelId).toBe('gpt-5.3-codex');
    expect(loaded.reasoningEffort).toBe('low');
  });

  it('updates partial prefs', () => {
    updatePrefs({ selectedModelId: 'custom-model-1' });
    let loaded = loadPrefs();
    expect(loaded.selectedModelId).toBe('custom-model-1');
    expect(loaded.reasoningEffort).toBe('medium');

    updatePrefs({ reasoningEffort: 'max', lastRepositoryPath: validRepoDir });
    loaded = loadPrefs();
    expect(loaded.selectedModelId).toBe('custom-model-1');
    expect(loaded.reasoningEffort).toBe('max');
    expect(loaded.lastRepositoryPath).toBe(validRepoDir);
  });

  it('recovers gracefully from corrupted JSON', () => {
    writeFileSync(testPrefsPath, '{ corrupted json ...');
    const loaded = loadPrefs();
    expect(loaded).toEqual({
      lastRepositoryPath: '',
      selectedModelId: '',
      reasoningEffort: 'medium',
    });
  });
});
