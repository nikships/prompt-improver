import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getFactoryApiKey,
  getFactoryApiKeyStatus,
  setFactoryApiKey,
  setFactoryApiKeyFilePathForTest,
  __resetFactoryApiKeyForTest,
} from '../src/main/factory-api-key.js';

describe('factory-api-key', () => {
  const originalEnv = process.env.FACTORY_API_KEY;
  const testDir = join(tmpdir(), `prompt-improver-api-key-test-${Date.now()}`);
  const testKeyPath = join(testDir, 'factory-api-key');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    delete process.env.FACTORY_API_KEY;
    setFactoryApiKeyFilePathForTest(testKeyPath);
    __resetFactoryApiKeyForTest();
  });

  afterEach(() => {
    __resetFactoryApiKeyForTest();
    setFactoryApiKeyFilePathForTest(null);
    if (originalEnv === undefined) {
      delete process.env.FACTORY_API_KEY;
    } else {
      process.env.FACTORY_API_KEY = originalEnv;
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('reports unconfigured when env and stored key are missing or blank', () => {
    expect(getFactoryApiKey()).toBeNull();
    expect(getFactoryApiKeyStatus()).toEqual({ configured: false });

    process.env.FACTORY_API_KEY = '   ';
    expect(getFactoryApiKey()).toBeNull();
    expect(getFactoryApiKeyStatus()).toEqual({ configured: false });
  });

  it('trims a padded environment key and reports configured', () => {
    process.env.FACTORY_API_KEY = '  test-env-api-key  ';

    expect(getFactoryApiKey()).toBe('test-env-api-key');
    expect(getFactoryApiKeyStatus()).toEqual({ configured: true });
  });

  it('stores a trimmed key on disk when the environment is absent', () => {
    const result = setFactoryApiKey('  test-stored-api-key  ');

    expect(result).toEqual({ ok: true, status: { configured: true } });
    expect(getFactoryApiKey()).toBe('test-stored-api-key');
    expect(getFactoryApiKeyStatus()).toEqual({ configured: true });
    expect(readFileSync(testKeyPath, 'utf8')).toBe('test-stored-api-key');
    expect(statSync(testKeyPath).mode & 0o777).toBe(0o600);
  });

  it('reloads a previously stored key after a simulated app restart', () => {
    setFactoryApiKey('persistent-api-key');
    setFactoryApiKeyFilePathForTest(testKeyPath);

    expect(getFactoryApiKey()).toBe('persistent-api-key');
    expect(getFactoryApiKeyStatus()).toEqual({ configured: true });
  });

  it('rejects blank and non-string submissions without configuring auth', () => {
    expect(setFactoryApiKey('')).toEqual({
      ok: false,
      error: 'Enter a Factory API key.',
    });
    expect(setFactoryApiKey('   ')).toEqual({
      ok: false,
      error: 'Enter a Factory API key.',
    });
    expect(setFactoryApiKey(null)).toEqual({
      ok: false,
      error: 'Enter a Factory API key.',
    });
    expect(setFactoryApiKey(42)).toEqual({
      ok: false,
      error: 'Enter a Factory API key.',
    });

    expect(getFactoryApiKey()).toBeNull();
    expect(getFactoryApiKeyStatus()).toEqual({ configured: false });
    expect(existsSync(testKeyPath)).toBe(false);
  });

  it('prefers a non-empty environment value over a stored key', () => {
    setFactoryApiKey('test-stored-api-key');
    process.env.FACTORY_API_KEY = 'test-env-api-key';

    expect(getFactoryApiKey()).toBe('test-env-api-key');
    expect(getFactoryApiKeyStatus()).toEqual({ configured: true });
  });

  it('does not include an apiKey field or the supplied key in status/set results', () => {
    const submitted = 'unique-submitted-key-value';
    const result = setFactoryApiKey(submitted);
    const status = getFactoryApiKeyStatus();

    expect(result).toEqual({ ok: true, status: { configured: true } });
    expect(status).toEqual({ configured: true });
    expect(result).not.toHaveProperty('apiKey');
    expect(status).not.toHaveProperty('apiKey');
    expect(JSON.stringify(result)).not.toContain(submitted);
    expect(JSON.stringify(status)).not.toContain(submitted);

    const rejected = setFactoryApiKey('');
    expect(rejected).not.toHaveProperty('apiKey');
    expect(JSON.stringify(rejected)).not.toContain(submitted);
  });
});
