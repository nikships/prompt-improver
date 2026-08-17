import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  commonBinDirs,
  mergePath,
  resolveEnv,
  getResolvedPath,
  __setResolvedPathForTest,
  __setAskLoginShellForTest,
} from '../src/main/env.js';

describe('env', () => {
  beforeEach(() => {
    __setResolvedPathForTest(null);
    __setAskLoginShellForTest(null);
  });

  afterEach(() => {
    __setResolvedPathForTest(null);
    __setAskLoginShellForTest(null);
  });

  it('returns list of common bin dirs', () => {
    const dirs = commonBinDirs();
    expect(dirs.length).toBeGreaterThan(3);
    expect(dirs.some((d) => d.includes('/opt/homebrew/bin'))).toBe(true);
  });

  it('merges paths uniquely preserving order and filters empty strings', () => {
    const merged = mergePath('/usr/bin::/bin: ', ['/opt/homebrew/bin', '/usr/bin', '', '/usr/local/bin']);
    expect(merged).toBe('/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin');
  });

  it('returns cached resolvedPath immediately if already resolved', async () => {
    __setResolvedPathForTest('/cached/path:/usr/bin');
    const path = await resolveEnv();
    expect(path).toBe('/cached/path:/usr/bin');
  });

  it('resolves env from login shell', async () => {
    __setAskLoginShellForTest(async () => '/custom/login/path:/usr/bin');

    const path = await resolveEnv();
    expect(path).toContain('/custom/login/path');
    expect(getResolvedPath()).toBe(path);
  });

  it('falls back to inherited path if shell fails', async () => {
    __setAskLoginShellForTest(async () => null);
    const path = await resolveEnv();
    expect(typeof path).toBe('string');
  });
});
