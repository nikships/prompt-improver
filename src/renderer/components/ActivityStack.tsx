import type { FC } from 'react';
import type { ActivityItem } from '@shared/types.js';

interface ActivityStackProps {
  activity: ActivityItem[];
}

export const ActivityStack: FC<ActivityStackProps> = ({ activity }) => {
  if (activity.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: 'center',
        maxWidth: '480px',
        width: '100%',
      }}
    >
      {activity.map((item, index) => {
        const isLatest = index === activity.length - 1;
        const opacity = isLatest ? 1 : 0.35 + index * 0.15;

        return (
          <div
            key={item.id}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: isLatest ? 'var(--text)' : 'var(--text-2)',
              opacity,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s ease-out',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: isLatest ? 'var(--accent)' : 'var(--border-strong)',
              }}
            />
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
};
