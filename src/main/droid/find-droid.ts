import { execFile, execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function defaultIsExecutable(path: string): boolean {
  try {
    if (!existsSync(path)) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

let customIsExecutable: ((path: string) => boolean) | null = null;
let customShellLookup: (() => Promise<string | null>) | null = null;
let customShellLookupSync: (() => string | null) | null = null;

export function __setFindDroidTestOverrides(overrides: {
  isExecutable?: (path: string) => boolean;
  shellLookup?: () => Promise<string | null>;
  shellLookupSync?: () => string | null;
} | null): void {
  if (!overrides) {
    customIsExecutable = null;
    customShellLookup = null;
    customShellLookupSync = null;
  } else {
    if (overrides.isExecutable) customIsExecutable = overrides.isExecutable;
    if (overrides.shellLookup) customShellLookup = overrides.shellLookup;
    if (overrides.shellLookupSync) customShellLookupSync = overrides.shellLookupSync;
  }
}

function checkExecutable(path: string): boolean {
  if (customIsExecutable) return customIsExecutable(path);
  return defaultIsExecutable(path);
}

export function candidateDroidPaths(): string[] {
  const home = homedir();
  return [
    join(home, '.npm-global', 'bin', 'droid'),
    join(home, '.local', 'bin', 'droid'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ].map((p) => (p.endsWith('droid') ? p : join(p, 'droid')));
}

const BEGIN = '__FIND_DROID_BEGIN__';
const END = '__FIND_DROID_END__';

export async function findDroidInShell(): Promise<string | null> {
  if (customShellLookup) return customShellLookup();

  const shell = process.env.SHELL || '/bin/zsh';
  if (!existsSync(shell)) return null;

  return new Promise<string | null>((resolve) => {
    execFile(
      shell,
      ['-lc', `printf '%s%s%s' '${BEGIN}' "$(command -v droid 2>/dev/null)" '${END}'`],
      { timeout: 4000, encoding: 'utf8' },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        const start = stdout.indexOf(BEGIN);
        const end = stdout.indexOf(END);
        if (start < 0 || end <= start) {
          resolve(null);
          return;
        }
        const path = stdout.slice(start + BEGIN.length, end).trim();
        if (path && checkExecutable(path)) {
          resolve(path);
        } else {
          resolve(null);
        }
      },
    );
  });
}

export async function findDroid(): Promise<string | null> {
  // Check candidate paths first
  for (const path of candidateDroidPaths()) {
    if (checkExecutable(path)) {
      return path;
    }
  }

  // Check process.env.PATH directly
  const envPath = process.env.PATH || '';
  for (const dir of envPath.split(':')) {
    const trimmed = dir.trim();
    if (!trimmed) continue;
    const candidate = join(trimmed, 'droid');
    if (checkExecutable(candidate)) {
      return candidate;
    }
  }

  // Check login shell
  const shellFound = await findDroidInShell();
  if (shellFound) {
    return shellFound;
  }

  return null;
}

export function findDroidSync(): string | null {
  for (const path of candidateDroidPaths()) {
    if (checkExecutable(path)) {
      return path;
    }
  }

  const envPath = process.env.PATH || '';
  for (const dir of envPath.split(':')) {
    const trimmed = dir.trim();
    if (!trimmed) continue;
    const candidate = join(trimmed, 'droid');
    if (checkExecutable(candidate)) {
      return candidate;
    }
  }

  if (customShellLookupSync) return customShellLookupSync();

  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const output = execFileSync(
      shell,
      ['-lc', `printf '%s%s%s' '${BEGIN}' "$(command -v droid 2>/dev/null)" '${END}'`],
      { timeout: 4000, encoding: 'utf8' },
    );
    const start = output.indexOf(BEGIN);
    const end = output.indexOf(END);
    if (start >= 0 && end > start) {
      const path = output.slice(start + BEGIN.length, end).trim();
      if (path && checkExecutable(path)) {
        return path;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
