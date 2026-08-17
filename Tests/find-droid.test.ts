import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findDroid,
  findDroidSync,
  candidateDroidPaths,
  findDroidInShell,
  __setFindDroidTestOverrides,
} from '../src/main/droid/find-droid.js';

describe('find-droid', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    __setFindDroidTestOverrides(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    __setFindDroidTestOverrides(null);
  });

  it('returns list of candidate droid paths', () => {
    const candidates = candidateDroidPaths();
    expect(candidates).toHaveLength(4);
    expect(candidates.some((p) => p.includes('.npm-global'))).toBe(true);
    expect(candidates.some((p) => p.includes('/opt/homebrew/bin/droid'))).toBe(true);
  });

  it('finds droid from candidates if executable', async () => {
    const candidate = candidateDroidPaths()[0];
    __setFindDroidTestOverrides({
      isExecutable: (p) => p === candidate,
    });

    const found = await findDroid();
    expect(found).toBe(candidate);

    const foundSync = findDroidSync();
    expect(foundSync).toBe(candidate);
  });

  it('finds droid in process.env.PATH', async () => {
    process.env.PATH = '/custom/bin:/another/bin';
    __setFindDroidTestOverrides({
      isExecutable: (p) => p === '/custom/bin/droid',
    });

    const found = await findDroid();
    expect(found).toBe('/custom/bin/droid');

    const foundSync = findDroidSync();
    expect(foundSync).toBe('/custom/bin/droid');
  });

  it('finds droid via shell execution', async () => {
    process.env.PATH = '';
    __setFindDroidTestOverrides({
      isExecutable: (p) => p === '/usr/local/bin/droid',
      shellLookup: async () => '/usr/local/bin/droid',
      shellLookupSync: () => '/usr/local/bin/droid',
    });

    const shellResult = await findDroidInShell();
    expect(shellResult).toBe('/usr/local/bin/droid');

    const found = await findDroid();
    expect(found).toBe('/usr/local/bin/droid');

    const foundSync = findDroidSync();
    expect(foundSync).toBe('/usr/local/bin/droid');
  });

  it('handles default shell lookup when shell exists', async () => {
    // Tests real findDroidInShell call without mock
    const res = await findDroidInShell();
    expect(res === null || typeof res === 'string').toBe(true);
  });

  it('handles default sync shell lookup when shell exists', () => {
    process.env.PATH = '';
    const res = findDroidSync();
    expect(res === null || typeof res === 'string').toBe(true);
  });

  it('returns null when droid is nowhere to be found', async () => {
    process.env.PATH = '';
    __setFindDroidTestOverrides({
      isExecutable: () => false,
      shellLookup: async () => null,
      shellLookupSync: () => null,
    });

    const found = await findDroid();
    expect(found).toBeNull();

    const foundSync = findDroidSync();
    expect(foundSync).toBeNull();
  });
});
