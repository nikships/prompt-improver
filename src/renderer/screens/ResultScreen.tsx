import { useState, type FC } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, RotateCcw, ArrowLeft } from 'lucide-react';
import { FactoryLogo } from '../components/Logo.js';
import { SectionLabel } from '../components/SectionLabel.js';
import { Button } from '../components/ui/Button.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { useImprover } from '../store/improver.js';
import styles from './ResultScreen.module.css';

export const ResultScreen: FC = () => {
  const { state, copyText, useAsDraft, newPrompt, retry, cancelSession } = useImprover();
  const [copied, setCopied] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  const handleCopy = async () => {
    if (!state.result) return;
    await copyText(state.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFailed = state.phase === 'failed';

  return (
    <div className={styles.container}>
      <div className={styles.titleBar}>
        <div className={styles.logoWrapper}>
          <FactoryLogo height={16} />
        </div>
      </div>

      <div className={styles.content}>
        {isFailed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <SectionLabel index="!" text="IMPROVEMENT FAILED" />
            <ErrorBanner
              message={state.error || 'An unexpected error occurred during prompt improvement.'}
              onRetry={retry}
              onEditDraft={cancelSession}
            />
          </div>
        ) : (
          <>
            <div className={styles.headerRow}>
              <SectionLabel index="02" text="IMPROVED PROMPT" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-bright)',
                }}
              >
                Ready to use
              </span>
            </div>

            <div className={styles.resultWrapper}>
              <div className={styles.promptBody}>{state.result}</div>
              <div className={styles.actionsBar}>
                <div className={styles.actionGroup}>
                  <Button variant="primary" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy prompt'}</span>
                  </Button>
                  <Button variant="ghost" onClick={useAsDraft}>
                    <ArrowLeft size={14} />
                    <span>Use as draft</span>
                  </Button>
                </div>

                <div className={styles.actionGroup}>
                  <Button variant="ghost" onClick={newPrompt}>
                    <RotateCcw size={13} />
                    <span>New prompt</span>
                  </Button>
                </div>
              </div>
            </div>

            {state.answered.length > 0 && (
              <div className={styles.recapSection}>
                <button
                  type="button"
                  className={styles.recapToggle}
                  onClick={() => setShowRecap(!showRecap)}
                >
                  {showRecap ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>How we got here ({state.answered.length} questions answered)</span>
                </button>

                {showRecap && (
                  <div className={styles.recapBody}>
                    {state.answered.map((item, idx) => (
                      <div key={idx} className={styles.recapItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--accent)',
                            }}
                          >
                            {item.topic}
                          </span>
                          <span className={styles.recapQuestion}>{item.question}</span>
                        </div>
                        <div className={styles.recapAnswer}>
                          <span>→</span>
                          <span>{item.answer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
