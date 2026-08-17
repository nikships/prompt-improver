import type { FC } from 'react';

interface SectionLabelProps {
  index: string;
  text: string;
  className?: string;
}

export const SectionLabel: FC<SectionLabelProps> = ({ index, text, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '1.6px',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ color: 'var(--accent)' }}>{index}</span>
      <span style={{ color: 'var(--text-2)' }}>{text}</span>
    </div>
  );
};
