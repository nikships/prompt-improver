import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type { FactoryApiKeyStatus, SetFactoryApiKeyResult } from '@shared/types.js';

const EMPTY_KEY_ERROR = 'Enter a Factory API key.';

let cachedKey: string | null | undefined = undefined;
let customKeyFilePath: string | null = null;

function trimKey(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function getFactoryApiKeyFilePath(): string {
  if (customKeyFilePath) return customKeyFilePath;
  try {
    return join(app.getPath('userData'), 'factory-api-key');
  } catch {
    return join(process.cwd(), '.factory-api-key');
  }
}

export function setFactoryApiKeyFilePathForTest(path: string | null): void {
  customKeyFilePath = path;
  cachedKey = undefined;
}

function readStoredKey(): string | null {
  const filePath = getFactoryApiKeyFilePath();
  if (!existsSync(filePath)) return null;
  try {
    return trimKey(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeStoredKey(key: string): void {
  const filePath = getFactoryApiKeyFilePath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, key, { encoding: 'utf8', mode: 0o600 });
}

export function getFactoryApiKey(): string | null {
  const fromEnv = trimKey(process.env.FACTORY_API_KEY);
  if (fromEnv) return fromEnv;
  if (cachedKey === undefined) {
    cachedKey = readStoredKey();
  }
  return cachedKey;
}

export function getFactoryApiKeyStatus(): FactoryApiKeyStatus {
  return { configured: getFactoryApiKey() !== null };
}

export function setFactoryApiKey(value: unknown): SetFactoryApiKeyResult {
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, error: EMPTY_KEY_ERROR };
  }

  const key = value.trim();
  writeStoredKey(key);
  cachedKey = key;
  return { ok: true, status: getFactoryApiKeyStatus() };
}

export function __resetFactoryApiKeyForTest(): void {
  cachedKey = undefined;
  if (customKeyFilePath && existsSync(customKeyFilePath)) {
    try {
      unlinkSync(customKeyFilePath);
    } catch {
      // ignore
    }
  }
}
