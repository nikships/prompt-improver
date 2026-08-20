import { useEffect, useId, useRef, useState, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from './ui/Button.js';
import styles from './ApiKeyDialog.module.css';

interface ApiKeyDialogProps {
  open: boolean;
  onSubmit: (apiKey: string) => Promise<string | null>;
  onDismiss: () => void;
}

export const ApiKeyDialog: FC<ApiKeyDialogProps> = ({ open, onSubmit, onDismiss }) => {
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue('');
      setError(null);
      setSubmitting(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const canSubmit = Boolean(value.trim()) && !submitting;

  const handleDismiss = () => {
    setValue('');
    setError(null);
    setSubmitting(false);
    onDismiss();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleDismiss();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    const result = await onSubmit(value);
    if (result) {
      setError(result);
      setSubmitting(false);
      inputRef.current?.focus();
      return;
    }

    setValue('');
    setError(null);
    setSubmitting(false);
  };

  return (
    <div className={styles.backdrop} onKeyDown={handleKeyDown}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className={styles.title}>
          Factory API key required
        </h2>
        <p id={descriptionId} className={styles.description}>
          Enter a Factory API key to start an improvement session. It is saved on this Mac and reused
          on later launches. You can also launch Prompt Improver with FACTORY_API_KEY set.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="factory-api-key" className={styles.label}>
              API key
            </label>
            <input
              ref={inputRef}
              id="factory-api-key"
              className={styles.input}
              type="password"
              autoFocus
              autoComplete="off"
              placeholder="Enter your Factory API key"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <p className={styles.support}>
              The key is stored locally on this Mac and is never added to your prompt or preferences.
            </p>
            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={!canSubmit}>
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
