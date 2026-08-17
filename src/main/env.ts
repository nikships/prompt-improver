import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const BEGIN = '__PROMPT_IMPROVER_PATH_BEGIN__';
const END = '__PROMPT_IMPROVER_PATH_END__';
const SHELL_TIMEOUT_MS = 5_000;

export function commonBinDirs(): string[] {
  const home = homedir();
  return [
    join(home, '.npm-global/bin'),
    join(home, '.local/bin'),
    join(home, '.cargo/bin'),
    join(home, '.bun/bin'),
    join(home, 'go/bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
  ];
}

export function mergePath(primary: string, extras: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of [...primary.split(':'), ...extras]) {
    const trimmed = dir.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.join(':');
}

let resolvedPath: string | null = null;
let askLoginShellOverride: (() => Promise<string | null>) | null = null;

export function __setAskLoginShellForTest(fn: (() => Promise<string | null>) | null): void {
  askLoginShellOverride = fn;
}

async function askLoginShell(): Promise<string | null> {
  if (askLoginShellOverride) return askLoginShellOverride();

  const shell = process.env.SHELL || '/bin/zsh';
  if (!existsSync(shell)) return null;
  try {
    const { stdout } = await exec(shell, ['-ilc', `printf '%s%s%s' '${BEGIN}' "$PATH" '${END}'`], {
      timeout: SHELL_TIMEOUT_MS,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
    const start = stdout.indexOf(BEGIN);
    const end = stdout.indexOf(END);
    if (start < 0 || end <= start) return null;
    const path = stdout.slice(start + BEGIN.length, end).trim();
    return path || null;
  } catch {
    return null;
  }
}

export async function resolveEnv(): Promise<string> {
  if (resolvedPath) return resolvedPath;

  const fromShell = await askLoginShell();
  const inherited = process.env.PATH ?? '';
  const missing = commonBinDirs().filter((dir) => existsSync(dir));

  if (fromShell) {
    resolvedPath = mergePath(fromShell, missing);
  } else {
    resolvedPath = mergePath(inherited, missing);
  }

  process.env.PATH = resolvedPath;
  return resolvedPath;
}

export function getResolvedPath(): string {
  return resolvedPath ?? process.env.PATH ?? '';
}

export function __setResolvedPathForTest(value: string | null): void {
  resolvedPath = value;
}
