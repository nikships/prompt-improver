import {
  createSession as sdkCreateSession,
  AutonomyLevel,
  ReasoningEffort as SdkReasoningEffort,
  DroidMessageType,
  type AskUserRequestParams,
  type AskUserResult,
  type CreateSessionOptions,
  type DroidSession,
} from '@factory/droid-sdk/node';
import type {
  ImproverState,
  StartSessionInput,
  AskAnswer,
  ReasoningEffort,
  ActivityItem,
} from '@shared/types.js';
import { findDroid } from './find-droid.js';
import { handlePermissionRequest } from './permissions.js';
import {
  parkAskUser,
  answersFromUser,
  answersComplete,
} from './ask-user.js';
import { buildImprovementPrompt } from './prompt.js';
import { getFactoryApiKey } from '../factory-api-key.js';

export function mapReasoningEffort(effort: ReasoningEffort): SdkReasoningEffort {
  switch (effort) {
    case 'off':
      return SdkReasoningEffort.Off;
    case 'low':
      return SdkReasoningEffort.Low;
    case 'medium':
      return SdkReasoningEffort.Medium;
    case 'high':
      return SdkReasoningEffort.High;
    case 'xhigh':
      return SdkReasoningEffort.ExtraHigh;
    case 'max':
      return SdkReasoningEffort.Max;
    default:
      return SdkReasoningEffort.Medium;
  }
}

export function formatToolActivity(
  toolName: string,
  input?: Record<string, unknown>,
): string {
  if (!toolName) return 'Scanning repository...';
  if (toolName === 'Read' && typeof input?.file_path === 'string') {
    const filename = input.file_path.split('/').pop() || input.file_path;
    return `Read ${filename}`;
  }
  if (toolName === 'Glob') {
    if (typeof input?.patterns === 'string') {
      return `Glob ${input.patterns}`;
    }
    if (Array.isArray(input?.patterns)) {
      return `Glob ${input.patterns.slice(0, 2).join(', ')}`;
    }
    return 'Glob files';
  }
  if (toolName === 'Grep' && typeof input?.pattern === 'string') {
    return `Grep "${input.pattern.slice(0, 30)}"`;
  }
  if (toolName === 'LS') {
    const dir = typeof input?.directory_path === 'string'
      ? input.directory_path.split('/').pop() || 'repository'
      : 'repository';
    return `List ${dir}`;
  }
  if (toolName === 'TodoWrite') {
    return 'Planning scan...';
  }
  if (toolName === 'AskUser') {
    return 'Clarifying questions...';
  }
  return `Scanning with ${toolName}...`;
}

export type SessionFactory = (options: CreateSessionOptions) => Promise<DroidSession>;
export type ApiKeyProvider = () => string | null;

interface PendingAskDeferred {
  resolve: (result: AskUserResult) => void;
  askId: string;
}

export class ImproverSessionManager {
  private state: ImproverState = {
    phase: 'idle',
    draft: '',
    repoPath: null,
    modelId: '',
    reasoningEffort: 'medium',
    elapsedSeconds: 0,
    activity: [],
    pendingAsk: null,
    answered: [],
    result: '',
    error: null,
  };

  private listeners: Set<(state: ImproverState) => void> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private currentSession: DroidSession | null = null;
  private abortController: AbortController | null = null;
  private pendingAskDeferred: PendingAskDeferred | null = null;
  private sessionFactory: SessionFactory;
  private apiKeyProvider: ApiKeyProvider;

  constructor(sessionFactory?: SessionFactory, apiKeyProvider?: ApiKeyProvider) {
    this.sessionFactory = sessionFactory ?? sdkCreateSession;
    this.apiKeyProvider = apiKeyProvider ?? getFactoryApiKey;
  }

  public getState(): ImproverState {
    return { ...this.state, activity: [...this.state.activity], answered: [...this.state.answered] };
  }

  public subscribe(listener: (state: ImproverState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitState(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.state.elapsedSeconds = 0;
    this.timer = setInterval(() => {
      this.state.elapsedSeconds += 1;
      this.emitState();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public addActivity(text: string): void {
    const item: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      at: Date.now(),
    };
    // Keep at most 4 latest activity lines
    const nextActivity = [...this.state.activity, item].slice(-4);
    this.state.activity = nextActivity;
    this.emitState();
  }

  public async start(input: StartSessionInput): Promise<ImproverState> {
    const trimmedDraft = (input.draft ?? '').trim();
    if (!trimmedDraft || !input.repoPath) {
      return this.getState();
    }

    // Single session at a time
    if (
      this.state.phase === 'starting' ||
      this.state.phase === 'scanning' ||
      this.state.phase === 'asking' ||
      this.state.phase === 'resuming'
    ) {
      return this.getState();
    }

    const apiKey = (this.apiKeyProvider() ?? '').trim();
    if (!apiKey) {
      return this.getState();
    }

    this.state = {
      phase: 'starting',
      draft: input.draft,
      repoPath: input.repoPath,
      modelId: input.modelId,
      reasoningEffort: input.reasoningEffort,
      elapsedSeconds: 0,
      activity: [],
      pendingAsk: null,
      answered: [],
      result: '',
      error: null,
    };
    this.emitState();
    this.startTimer();

    const droidPath = await findDroid();
    if (!droidPath) {
      this.stopTimer();
      this.state.phase = 'failed';
      this.state.error =
        'Could not find the droid CLI. Install it and make sure it is on your PATH.';
      this.emitState();
      return this.getState();
    }

    const abortController = new AbortController();
    this.abortController = abortController;

    const askUserHandler = async (params: AskUserRequestParams): Promise<AskUserResult> => {
      if (abortController.signal.aborted) {
        return { cancelled: true, answers: [] };
      }

      const pending = parkAskUser(params as unknown as Record<string, unknown>);
      this.state.pendingAsk = pending;
      this.state.phase = 'asking';
      this.addActivity('Waiting for user input...');
      this.emitState();

      return new Promise<AskUserResult>((resolve) => {
        this.pendingAskDeferred = {
          resolve,
          askId: pending.askId,
        };
      });
    };

    try {
      const session = await this.sessionFactory({
        cwd: input.repoPath,
        execPath: droidPath,
        apiKey,
        modelId: input.modelId ? input.modelId : undefined,
        reasoningEffort: mapReasoningEffort(input.reasoningEffort),
        autonomyLevel: AutonomyLevel.Low,
        disabledToolIds: ['Execute', 'Create', 'Edit', 'ApplyPatch'],
        permissionHandler: handlePermissionRequest,
        askUserHandler,
        abortSignal: abortController.signal,
      });

      this.currentSession = session;
      this.state.phase = 'scanning';
      this.addActivity('Scanning repository structure...');
      this.emitState();

      const fullPrompt = buildImprovementPrompt(input.draft);
      const stream = session.stream(fullPrompt, {
        abortSignal: abortController.signal,
      });

      let finalAssistantText = '';

      for await (const message of stream) {
        if (abortController.signal.aborted) break;

        const msg = message as unknown as Record<string, unknown>;
        const type = msg.type;

        if (type === DroidMessageType.ToolCallDelta || type === 'tool_call') {
          const toolUse = (msg.toolUse ?? {}) as { name?: string; input?: Record<string, unknown> };
          const toolName = toolUse.name || '';
          if (toolName && toolName !== 'AskUser') {
            this.addActivity(formatToolActivity(toolName, toolUse.input));
          }
        } else if (type === DroidMessageType.ToolProgress || type === 'tool_progress') {
          const content = typeof msg.content === 'string' ? msg.content : '';
          const toolName = typeof msg.toolName === 'string' ? msg.toolName : '';
          if (content) {
            this.addActivity(content);
          } else if (toolName) {
            this.addActivity(`Running ${toolName}...`);
          }
        } else if (type === DroidMessageType.AssistantTextDelta || type === 'assistant_text_delta') {
          // Keep internal text if needed, but do not clutter activity stack
        } else if (type === DroidMessageType.Assistant || type === 'assistant') {
          if (typeof msg.text === 'string') {
            finalAssistantText = msg.text;
          }
        } else if (type === DroidMessageType.Result || type === 'result') {
          const resultMsg = msg as unknown as {
            success?: boolean;
            interrupted?: boolean;
            text?: string;
            error?: { message?: string } | null;
          };

          if (resultMsg.interrupted || abortController.signal.aborted) {
            this.state.phase = 'cancelled';
          } else if (resultMsg.success) {
            this.state.phase = 'complete';
            const text = (resultMsg.text || finalAssistantText).trim();
            this.state.result = text;
          } else {
            this.state.phase = 'failed';
            this.state.error =
              resultMsg.error?.message ||
              'Improvement failed. Please check the repository and try again.';
          }
        }
      }

      // If stream ended without explicit result message but succeeded
      if (this.state.phase !== 'complete' && this.state.phase !== 'failed' && this.state.phase !== 'cancelled') {
        if (abortController.signal.aborted) {
          this.state.phase = 'idle';
        } else if (finalAssistantText.trim()) {
          this.state.phase = 'complete';
          this.state.result = finalAssistantText.trim();
        } else {
          this.state.phase = 'failed';
          this.state.error = 'Session finished without producing an improved prompt.';
        }
      }
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        this.state.phase = 'idle';
      } else {
        this.state.phase = 'failed';
        const msg = err instanceof Error ? err.message : String(err);
        this.state.error = msg || 'An unexpected error occurred during improvement.';
      }
    } finally {
      this.stopTimer();
      this.currentSession = null;
      this.abortController = null;
      if (this.pendingAskDeferred) {
        this.pendingAskDeferred.resolve({ cancelled: true, answers: [] });
        this.pendingAskDeferred = null;
      }
      this.emitState();
    }

    return this.getState();
  }

  public answerAsk(answers: AskAnswer[]): boolean {
    if (!this.state.pendingAsk || !this.pendingAskDeferred) {
      return false;
    }

    if (!answersComplete(this.state.pendingAsk.questions, answers)) {
      return false;
    }

    const mappedAnswers = answersFromUser(this.state.pendingAsk.questions, answers);

    // Record Q&A in answered list
    for (const q of this.state.pendingAsk.questions) {
      const ans = mappedAnswers.find((a) => a.index === q.index)?.answer ?? '';
      this.state.answered.push({
        topic: q.topic,
        question: q.question,
        answer: ans,
      });
    }

    const deferred = this.pendingAskDeferred;
    this.pendingAskDeferred = null;
    this.state.pendingAsk = null;
    this.state.phase = 'resuming';
    this.addActivity('Applying answers and generating prompt...');
    this.emitState();

    deferred.resolve({ answers: mappedAnswers });
    return true;
  }

  public async cancel(): Promise<void> {
    if (this.pendingAskDeferred) {
      this.pendingAskDeferred.resolve({ cancelled: true, answers: [] });
      this.pendingAskDeferred = null;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.currentSession) {
      try {
        await this.currentSession.interrupt();
      } catch {
        // ignore
      }
      try {
        await this.currentSession.close();
      } catch {
        // ignore
      }
      this.currentSession = null;
    }

    this.stopTimer();
    this.state.phase = 'cancelled';
    this.state.pendingAsk = null;
    this.emitState();

    // After brief transition, reset to idle with draft preserved
    this.state.phase = 'idle';
    this.state.error = null;
    this.emitState();
  }
}

export const improverSession = new ImproverSessionManager();
