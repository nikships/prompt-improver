import { describe, it, expect } from 'vitest';
import { ToolConfirmationOutcome } from '@factory/droid-sdk';
import {
  handlePermissionRequest,
  flattenToolUse,
  proceedOption,
  isToolAllowed,
} from '../src/main/droid/permissions.js';

describe('permissions', () => {
  it('allows read-only tools and denies modifying tools', () => {
    expect(isToolAllowed('Read')).toBe(true);
    expect(isToolAllowed('Grep')).toBe(true);
    expect(isToolAllowed('Glob')).toBe(true);
    expect(isToolAllowed('LS')).toBe(true);
    expect(isToolAllowed('AskUser')).toBe(true);
    expect(isToolAllowed('TodoWrite')).toBe(true);

    expect(isToolAllowed('Execute')).toBe(false);
    expect(isToolAllowed('Create')).toBe(false);
    expect(isToolAllowed('Edit')).toBe(false);
    expect(isToolAllowed('ApplyPatch')).toBe(false);
    expect(isToolAllowed('UnknownTool')).toBe(false);
  });

  it('flattens tool use request params correctly', () => {
    const params = {
      toolUses: [
        {
          toolUse: {
            name: 'Read',
            input: { file_path: 'README.md' },
          },
          details: {
            filePath: '/path/to/README.md',
          },
        },
      ],
      options: [{ value: ToolConfirmationOutcome.ProceedOnce }],
    } as any;

    const flattened = flattenToolUse(params);
    expect(flattened.toolName).toBe('Read');
    expect(flattened.file_path).toBe('/path/to/README.md');
  });

  it('handles permission request for allowed tool', () => {
    const params = {
      toolUses: [
        {
          toolUse: {
            name: 'Read',
            input: { file_path: 'README.md' },
          },
          details: {},
        },
      ],
      options: [{ value: ToolConfirmationOutcome.ProceedOnce }],
    } as any;

    const result = handlePermissionRequest(params);
    expect(result).toBe(ToolConfirmationOutcome.ProceedOnce);
  });

  it('handles permission request for denied tool', () => {
    const params = {
      toolUses: [
        {
          toolUse: {
            name: 'Execute',
            input: { command: 'rm -rf /' },
          },
          details: {},
        },
      ],
      options: [{ value: ToolConfirmationOutcome.ProceedOnce }],
    } as any;

    const result = handlePermissionRequest(params);
    expect(result).toEqual({
      selectedOption: ToolConfirmationOutcome.Cancel,
      comment: 'Prompt Improver is read-only',
    });
  });

  it('uses offered proceed option from request params', () => {
    const paramsWithProceedAlways = {
      toolUses: [
        {
          toolUse: {
            name: 'Read',
            input: { file_path: 'README.md' },
          },
          details: {},
        },
      ],
      options: [
        { value: ToolConfirmationOutcome.ProceedAlways },
        { value: ToolConfirmationOutcome.Cancel },
      ],
    } as any;

    const option = proceedOption(paramsWithProceedAlways);
    expect(option).toBe(ToolConfirmationOutcome.ProceedAlways);
  });
});
