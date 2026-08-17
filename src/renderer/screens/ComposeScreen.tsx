import { useState, type FC, type DragEvent, type KeyboardEvent } from 'react';
import { FactoryLogo } from '../components/Logo.js';
import { SectionLabel } from '../components/SectionLabel.js';
import { RepoPicker } from '../components/RepoPicker.js';
import { ModelSelect } from '../components/ModelSelect.js';
import { ReasoningSelect } from '../components/ReasoningSelect.js';
import { Button } from '../components/ui/Button.js';
import { useImprover } from '../store/improver.js';
import styles from './ComposeScreen.module.css';

export const ComposeScreen: FC = () => {
  const {
    draftText,
    setDraftText,
    repoPath,
    chooseRepo,
    setRepoPath,
    models,
    selectedModelId,
    setSelectedModelId,
    reasoningEffort,
    setReasoningEffort,
    startImprove,
  } = useImprover();

  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const canSubmit = Boolean(draftText.trim()) && Boolean(repoPath);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (canSubmit) {
        e.preventDefault();
        startImprove();
      }
    }
  };

  const handleChooseRepo = async () => {
    setDropError(null);
    await chooseRepo();
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDropError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      try {
        const path = window.improver.getPathForFile(file);
        if (path) {
          const res = await setRepoPath(path);
          if (!res.ok) {
            setDropError(res.error || 'Dropped item is not a valid folder.');
          }
        }
      } catch {
        setDropError('Could not read dropped folder path.');
      }
    }
  };

  return (
    <div
      className={styles.container}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.titleBar}>
        <div className={styles.logoWrapper}>
          <FactoryLogo height={16} />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.editorSection}>
          <SectionLabel index="01" text="DRAFT" />
          <div className={styles.editorWrapper}>
            <textarea
              className={styles.textarea}
              placeholder="Describe what you want the AI to do…"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className={styles.editorFooter}>
              <span>{draftText.length} characters</span>
              <span className={styles.shortcutHint}>⌘↩ to improve</span>
            </div>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <RepoPicker repoPath={repoPath} onChoose={handleChooseRepo} />
          {dropError && (
            <div style={{ color: 'var(--danger)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {dropError}
            </div>
          )}

          <div className={styles.selectorsRow}>
            <ModelSelect
              models={models}
              selectedModelId={selectedModelId}
              onChange={setSelectedModelId}
            />
            <ReasoningSelect
              reasoningEffort={reasoningEffort}
              onChange={setReasoningEffort}
            />
          </div>

          <div className={styles.actionRow}>
            <span className={styles.dropHint}>or drop a folder anywhere</span>
            <Button
              variant="primary"
              disabled={!canSubmit}
              onClick={startImprove}
              style={{ padding: '9px 20px', fontSize: '12px' }}
            >
              Improve →
            </Button>
          </div>
        </div>
      </div>

      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayText}>Drop folder to select repository</div>
        </div>
      )}
    </div>
  );
};
