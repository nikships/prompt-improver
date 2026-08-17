import { describe, it, expect, vi } from 'vitest';
import { DroidMessageType, ReasoningEffort as SdkReasoningEffort } from '@factory/droid-sdk';
import {
  ImproverSessionManager,
  mapReasoningEffort,
  formatToolActivity,
} from '../src/main/droid/session.js';
import * as findDroidModule from '../src/main/droid/find-droid.js';

describe('session', () => {
  it('maps reasoning effort values correctly', () => {
    expect(mapReasoningEffort('off')).toBe(SdkReasoningEffort.Off);
    expect(mapReasoningEffort('low')).toBe(SdkReasoningEffort.Low);
    expect(mapReasoningEffort('medium')).toBe(SdkReasoningEffort.Medium);
    expect(mapReasoningEffort('high')).toBe(SdkReasoningEffort.High);
    expect(mapReasoningEffort('xhigh')).toBe(SdkReasoningEffort.ExtraHigh);
    expect(mapReasoningEffort('max')).toBe(SdkReasoningEffort.Max);
    expect(mapReasoningEffort('unknown' as any)).toBe(SdkReasoningEffort.Medium);
  });

  it('formats tool activities nicely', () => {
    expect(formatToolActivity('')).toBe('Scanning repository...');
    expect(formatToolActivity('Read', { file_path: '/path/to/README.md' })).toBe('Read README.md');
    expect(formatToolActivity('Glob', { patterns: '*.ts' })).toBe('Glob *.ts');
    expect(formatToolActivity('Glob', { patterns: ['*.ts', '*.tsx'] })).toBe('Glob *.ts, *.tsx');
    expect(formatToolActivity('Glob', {})).toBe('Glob files');
    expect(formatToolActivity('Grep', { pattern: 'createSession' })).toBe('Grep "createSession"');
    expect(formatToolActivity('LS', { directory_path: '/src/main' })).toBe('List main');
    expect(formatToolActivity('LS', {})).toBe('List repository');
    expect(formatToolActivity('TodoWrite')).toBe('Planning scan...');
    expect(formatToolActivity('AskUser')).toBe('Clarifying questions...');
    expect(formatToolActivity('UnknownTool')).toBe('Scanning with UnknownTool...');
  });

  it('ignores start when draft is empty or repoPath is missing', async () => {
    const manager = new ImproverSessionManager();
    const state1 = await manager.start({
      draft: '',
      repoPath: '/path/to/repo',
      modelId: '',
      reasoningEffort: 'medium',
    });
    expect(state1.phase).toBe('idle');

    const state2 = await manager.start({
      draft: 'Write a feature',
      repoPath: '',
      modelId: '',
      reasoningEffort: 'medium',
    });
    expect(state2.phase).toBe('idle');
  });

  it('fails with helpful message when droid is not found', async () => {
    vi.spyOn(findDroidModule, 'findDroid').mockResolvedValue(null);

    const manager = new ImproverSessionManager();
    const state = await manager.start({
      draft: 'Prompt text',
      repoPath: '/path/to/repo',
      modelId: '',
      reasoningEffort: 'medium',
    });

    expect(state.phase).toBe('failed');
    expect(state.error).toContain('Could not find the droid CLI');
    vi.restoreAllMocks();
  });

  it('limits activity stack to 4 latest items', () => {
    const manager = new ImproverSessionManager();
    manager.addActivity('Act 1');
    manager.addActivity('Act 2');
    manager.addActivity('Act 3');
    manager.addActivity('Act 4');
    manager.addActivity('Act 5');

    const state = manager.getState();
    expect(state.activity).toHaveLength(4);
    expect(state.activity[0].text).toBe('Act 2');
    expect(state.activity[3].text).toBe('Act 5');
  });

  it('returns false for answerAsk when not asking or answers incomplete', () => {
    const manager = new ImproverSessionManager();
    expect(manager.answerAsk([])).toBe(false);
  });

  it('runs complete multi-turn flow with AskUser question and answer', async () => {
    vi.spyOn(findDroidModule, 'findDroid').mockResolvedValue('/mock/bin/droid');
    let askUserHandlerRef: any = null;

    const mockSession = {
      id: 'test-session-id',
      settings: {} as any,
      stream: async function* (_prompt: string, _opts: any) {
        yield {
          type: DroidMessageType.ToolCallDelta,
          toolUse: { name: 'Read', input: { file_path: 'README.md' } },
        };
        yield {
          type: DroidMessageType.ToolProgress,
          content: 'Reading 120 lines...',
        };

        // Invoke ask user
        const askResult = await askUserHandlerRef({
          toolCallId: 'call_1',
          questions: [
            {
              index: 0,
              topic: 'SCOPE',
              question: 'Target platform?',
              options: ['macOS', 'Web'],
              multiSelect: false,
            },
          ],
        });

        expect(askResult.answers).toHaveLength(1);
        expect(askResult.answers[0].answer).toBe('macOS');

        yield {
          type: DroidMessageType.Assistant,
          text: 'This is the final improved prompt for macOS.',
        };

        yield {
          type: DroidMessageType.Result,
          success: true,
          text: 'This is the final improved prompt for macOS.',
        };
      },
      interrupt: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockFactory = vi.fn().mockImplementation(async (options) => {
      askUserHandlerRef = options.askUserHandler;
      return mockSession;
    });

    const manager = new ImproverSessionManager(mockFactory);

    // Start session in background
    const startPromise = manager.start({
      draft: 'Build a menu bar app',
      repoPath: '/mock/repo',
      modelId: 'claude-sonnet-5',
      reasoningEffort: 'high',
    });

    // Concurrent start while active is ignored
    const duplicateStart = await manager.start({
      draft: 'Another prompt',
      repoPath: '/mock/repo',
      modelId: '',
      reasoningEffort: 'medium',
    });
    expect(duplicateStart.phase).toBe('starting');

    // Wait until manager reaches asking state
    await new Promise((resolve) => {
      const unsub = manager.subscribe((st) => {
        if (st.phase === 'asking') {
          unsub();
          resolve(null);
        }
      });
    });

    const askingState = manager.getState();
    expect(askingState.phase).toBe('asking');
    expect(askingState.pendingAsk).not.toBeNull();
    expect(askingState.pendingAsk?.questions[0].topic).toBe('SCOPE');

    // User submits answers
    const answered = manager.answerAsk([{ index: 0, answer: 'macOS' }]);
    expect(answered).toBe(true);

    const finalState = await startPromise;
    expect(finalState.phase).toBe('complete');
    expect(finalState.result).toBe('This is the final improved prompt for macOS.');
    expect(finalState.answered).toHaveLength(1);
    expect(finalState.answered[0]).toEqual({
      topic: 'SCOPE',
      question: 'Target platform?',
      answer: 'macOS',
    });
    vi.restoreAllMocks();
  });

  it('handles stream error failure properly', async () => {
    vi.spyOn(findDroidModule, 'findDroid').mockResolvedValue('/mock/bin/droid');

    const mockSession = {
      id: 'error-session-id',
      settings: {} as any,
      stream: async function* () {
        throw new Error('Connection lost to agent backend');
      },
      interrupt: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockFactory = vi.fn().mockResolvedValue(mockSession);
    const manager = new ImproverSessionManager(mockFactory);

    const finalState = await manager.start({
      draft: 'Build something',
      repoPath: '/mock/repo',
      modelId: '',
      reasoningEffort: 'medium',
    });

    expect(finalState.phase).toBe('failed');
    expect(finalState.error).toContain('Connection lost to agent backend');
    vi.restoreAllMocks();
  });

  it('handles cancellation cleanly during parked ask without hanging', async () => {
    vi.spyOn(findDroidModule, 'findDroid').mockResolvedValue('/mock/bin/droid');
    let askUserHandlerRef: any = null;

    const mockSession = {
      id: 'cancel-session-id',
      settings: {} as any,
      stream: async function* (_prompt: string, opts: any) {
        yield {
          type: DroidMessageType.ToolCallDelta,
          toolUse: { name: 'Glob', input: { patterns: '*.json' } },
        };

        const askResult = await askUserHandlerRef({
          toolCallId: 'call_cancel',
          questions: [{ index: 0, question: 'Awaiting answer...' }],
        });

        // askUserHandler should resolve with cancelled: true
        expect(askResult.cancelled).toBe(true);

        if (opts.abortSignal?.aborted) {
          yield {
            type: DroidMessageType.Result,
            interrupted: true,
            success: false,
          };
        }
      },
      interrupt: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockFactory = vi.fn().mockImplementation(async (options) => {
      askUserHandlerRef = options.askUserHandler;
      return mockSession;
    });

    const manager = new ImproverSessionManager(mockFactory);

    const startPromise = manager.start({
      draft: 'Some prompt to cancel',
      repoPath: '/mock/repo',
      modelId: '',
      reasoningEffort: 'medium',
    });

    // Wait until asking
    await new Promise((resolve) => {
      const unsub = manager.subscribe((st) => {
        if (st.phase === 'asking') {
          unsub();
          resolve(null);
        }
      });
    });

    // Cancel while parked in asking
    await manager.cancel();
    await startPromise;

    expect(mockSession.interrupt).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalled();

    const state = manager.getState();
    expect(state.phase).toBe('idle');
    expect(state.pendingAsk).toBeNull();
    vi.restoreAllMocks();
  });
});
