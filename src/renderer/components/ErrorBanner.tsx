import type { FC } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button.js';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onEditDraft?: () => void;
}

export const ErrorBanner: FC<ErrorBannerProps> = ({ message, onRetry, onEditDraft }) => {
  return (
    <div
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div
          className="selectable"
          style={{
            color: 'var(--text)',
            fontSize: '12px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </div>
      </div>
      {(onRetry || onEditDraft) && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {onEditDraft && (
            <Button variant="ghost" onClick={onEditDraft}>
              Edit draft
            </Button>
          )}
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
