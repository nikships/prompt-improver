import {
  ToolConfirmationOutcome,
  type RequestPermissionRequestParams,
  type RequestPermissionHandlerResult,
} from '@factory/droid-sdk';

export const ALLOWED_TOOLS = new Set([
  'Read',
  'Grep',
  'Glob',
  'LS',
  'AskUser',
  'TodoWrite',
]);

export type ProceedOutcome = Exclude<
  ToolConfirmationOutcome,
  ToolConfirmationOutcome.ProceedEdit
>;

export function flattenToolUse(
  params: RequestPermissionRequestParams,
): { toolName: string; [key: string]: unknown } {
  const first = params.toolUses?.[0];
  if (!first) {
    return { toolName: '' };
  }
  const details = (first.details ?? {}) as Record<string, unknown>;
  const input = (first.toolUse.input ?? {}) as Record<string, unknown>;
  return {
    toolName: first.toolUse.name,
    ...input,
    ...(typeof details.command === 'string' ? { command: details.command } : {}),
    ...(typeof details.filePath === 'string' ? { file_path: details.filePath } : {}),
  };
}

export function proceedOption(
  params: RequestPermissionRequestParams,
): ProceedOutcome {
  const offered = params.options?.map((option) => option.value) ?? [];
  if (offered.includes(ToolConfirmationOutcome.ProceedOnce)) {
    return ToolConfirmationOutcome.ProceedOnce;
  }
  const proceed = offered.filter(
    (value): value is ProceedOutcome =>
      value !== ToolConfirmationOutcome.Cancel &&
      value !== ToolConfirmationOutcome.ProceedEdit,
  );
  return proceed[0] ?? ToolConfirmationOutcome.ProceedOnce;
}

export function isToolAllowed(toolName: string): boolean {
  return ALLOWED_TOOLS.has(toolName);
}

export function handlePermissionRequest(
  params: RequestPermissionRequestParams,
): RequestPermissionHandlerResult {
  const flattened = flattenToolUse(params);
  const toolName = flattened.toolName;

  if (isToolAllowed(toolName)) {
    return proceedOption(params);
  }

  return {
    selectedOption: ToolConfirmationOutcome.Cancel,
    comment: 'Prompt Improver is read-only',
  };
}
