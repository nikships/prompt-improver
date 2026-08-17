import type { FC } from 'react';
import { Folder } from 'lucide-react';
import { DroidGlyph } from '../components/Logo.js';
import { Button } from '../components/ui/Button.js';
import { ActivityStack } from '../components/ActivityStack.js';
import { Questionnaire } from '../components/Questionnaire.js';
import { useImprover } from '../store/improver.js';
import styles from './SessionScreen.module.css';

export const SessionScreen: FC = () => {
  const { state, models, cancelSession, answerAsk } = useImprover();

  const repoFolder = state.repoPath
    ? state.repoPath.split('/').filter(Boolean).pop() || state.repoPath
    : 'Repository';

  const modelObj = models.find((m) => m.id === state.modelId);
  const modelName = modelObj ? modelObj.displayName : state.modelId || 'Default';

  const isAsking = state.phase === 'asking' && state.pendingAsk !== null;

  const getTitle = () => {
    switch (state.phase) {
      case 'starting':
        return 'INITIALIZING SESSION';
      case 'resuming':
        return 'APPLYING ANSWERS';
      case 'scanning':
      default:
        return 'SCANNING REPOSITORY';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contextBar}>
        <div className={styles.contextInfo}>
          <div className={styles.repoName} title={state.repoPath || ''}>
            <Folder size={13} color="var(--accent)" />
            <span>{repoFolder}</span>
          </div>
          <div className={styles.metaBadge}>
            {modelName} • {state.reasoningEffort}
          </div>
        </div>

        <div className={styles.controls}>
          <span className={styles.timer}>{state.elapsedSeconds}s</span>
          <Button variant="ghost" onClick={cancelSession} style={{ padding: '4px 10px', fontSize: '10px' }}>
            Cancel
          </Button>
        </div>
      </div>

      {isAsking ? (
        <>
          <div className={styles.scanningStrip}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
              }}
            />
            <span>Awaiting your input to refine prompt</span>
          </div>
          <div className={styles.askingBody}>
            <Questionnaire
              pendingAsk={state.pendingAsk!}
              earlierAnswered={state.answered}
              onSubmit={answerAsk}
            />
          </div>
        </>
      ) : (
        <div className={styles.scanningBody}>
          <div className={styles.glyphContainer}>
            <DroidGlyph size={32} />
          </div>
          <div className={styles.scanningTitle}>{getTitle()}</div>
          <ActivityStack activity={state.activity} />
        </div>
      )}
    </div>
  );
};
