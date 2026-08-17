import type { FC } from 'react';
import type { ModelOption } from '@shared/types.js';

interface ModelSelectProps {
  models: ModelOption[];
  selectedModelId: string;
  onChange: (modelId: string) => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ models, selectedModelId, onChange }) => {
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
        value={selectedModelId}
        onChange={(e) => onChange(e.target.value)}
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
        {models.map((model) => (
          <option
            key={model.id || '__default__'}
            value={model.id}
            style={{ background: '#101010', color: '#eeeeee' }}
          >
            {model.displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
