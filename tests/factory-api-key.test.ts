import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getFactoryApiKey,
  getFactoryApiKeyStatus,
  setFactoryApiKey,
  __resetFactoryApiKeyForTest,
} from '../src/main/factory-api-key.js';

describe('factory-api-key', () => {
  const originalEnv = process.env.FACTORY_API_KEY;

  beforeEach(() => {
    delete process.env.FACTORY_API_KEY;
    __resetFactoryApiKeyForTest();
  });

  afterEach(() => {
    __resetFactoryApiKeyForTest();
    if (originalEnv === undefined) {
      delete process.env.FACTORY_API_KEY;
    } else {
      process.env.FACTORY_API_KEY = originalEnv;
    }
  });

  it('reports unconfigured when env and memory are missing or blank', () => {
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

  it('stores a trimmed in-memory key when the environment is absent', () => {
    const result = setFactoryApiKey('  test-memory-api-key  ');

    expect(result).toEqual({ ok: true, status: { configured: true } });
    expect(getFactoryApiKey()).toBe('test-memory-api-key');
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
  });

  it('prefers a non-empty environment value over an in-memory key', () => {
    setFactoryApiKey('test-memory-api-key');
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
