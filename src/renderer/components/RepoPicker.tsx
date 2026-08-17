import type { FC } from 'react';
import { Folder } from 'lucide-react';
import { Button } from './ui/Button.js';

interface RepoPickerProps {
  repoPath: string;
  onChoose: () => void;
}

export const RepoPicker: FC<RepoPickerProps> = ({ repoPath, onChoose }) => {
  const folderName = repoPath ? repoPath.split('/').filter(Boolean).pop() || repoPath : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '4px 8px',
      }}
    >
      <Folder size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
      <div
        title={repoPath || 'No repository selected'}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: repoPath ? 'var(--text)' : 'var(--text-3)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {repoPath ? folderName : 'Choose repository…'}
      </div>
      <Button variant="ghost" onClick={onChoose} style={{ padding: '3px 8px', fontSize: '10px' }}>
        Choose
      </Button>
    </div>
  );
};
