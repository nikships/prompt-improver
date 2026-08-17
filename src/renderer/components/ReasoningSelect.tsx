import type { FC } from 'react';
import type { ReasoningEffort } from '@shared/types.js';

interface ReasoningSelectProps {
  reasoningEffort: ReasoningEffort;
  onChange: (effort: ReasoningEffort) => void;
}

const REASONING_OPTIONS: Array<{ value: ReasoningEffort; label: string }> = [
  { value: 'off', label: 'Reasoning: Off' },
  { value: 'low', label: 'Reasoning: Low' },
  { value: 'medium', label: 'Reasoning: Medium' },
  { value: 'high', label: 'Reasoning: High' },
  { value: 'xhigh', label: 'Reasoning: Extra high' },
  { value: 'max', label: 'Reasoning: Max' },
];

export const ReasoningSelect: FC<ReasoningSelectProps> = ({ reasoningEffort, onChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '0 8px',
        height: '28px',
      }}
    >
      <select
        value={reasoningEffort}
        onChange={(e) => onChange(e.target.value as ReasoningEffort)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {REASONING_OPTIONS.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: '#101010', color: '#eeeeee' }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
