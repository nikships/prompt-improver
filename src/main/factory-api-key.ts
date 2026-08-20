import type { FactoryApiKeyStatus, SetFactoryApiKeyResult } from '@shared/types.js';

const EMPTY_KEY_ERROR = 'Enter a Factory API key.';

let enteredKey: string | null = null;

function trimKey(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function getFactoryApiKey(): string | null {
  const fromEnv = trimKey(process.env.FACTORY_API_KEY);
  if (fromEnv) return fromEnv;
  return enteredKey;
}

export function getFactoryApiKeyStatus(): FactoryApiKeyStatus {
  return { configured: getFactoryApiKey() !== null };
}

export function setFactoryApiKey(value: unknown): SetFactoryApiKeyResult {
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, error: EMPTY_KEY_ERROR };
  }

  enteredKey = value.trim();
  return { ok: true, status: getFactoryApiKeyStatus() };
}

export function __resetFactoryApiKeyForTest(): void {
  enteredKey = null;
}
