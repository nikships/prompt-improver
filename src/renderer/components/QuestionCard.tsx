import { type FC, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { AskQuestion } from '@shared/types.js';
import { SectionLabel } from './SectionLabel.js';
import styles from './Questionnaire.module.css';

interface QuestionCardProps {
  question: AskQuestion;
  cardIndex: number;
  selectedOptions: string[];
  customText: string;
  showCustomInput: boolean;
  onToggleOption: (option: string) => void;
  onChangeCustomText: (text: string) => void;
  onToggleShowCustom: () => void;
  onAdvance?: () => void;
}

export const QuestionCard: FC<QuestionCardProps> = ({
  question,
  cardIndex,
  selectedOptions,
  customText,
  showCustomInput,
  onToggleOption,
  onChangeCustomText,
  onToggleShowCustom,
  onAdvance,
}) => {
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Keyboard shortcut listener for 1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in custom input, don't intercept number keys
      if (document.activeElement === customInputRef.current) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= question.options.length) {
        e.preventDefault();
        const opt = question.options[num - 1];
        if (opt) {
          onToggleOption(opt);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question.options, onToggleOption]);

  const indexStr = String(cardIndex).padStart(2, '0');
  const isMulti = question.multiSelect;

  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionLabel index={indexStr} text={question.topic || 'PROMPT'} />
        {isMulti && <span className={styles.hint}>Select all that apply</span>}
      </div>

      <div className={styles.questionText}>{question.question}</div>

      {question.options.length > 0 && (
        <div className={styles.optionsList}>
          {question.options.map((option, idx) => {
            const isSelected = selectedOptions.includes(option);
            const keyNum = idx + 1 <= 9 ? String(idx + 1) : '';

            return (
              <button
                key={option}
                type="button"
                className={`${styles.optionRow} ${isSelected ? styles.selected : ''}`}
                onClick={() => onToggleOption(option)}
              >
                <span className={styles.optionKey}>
                  {isSelected && isMulti ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    keyNum || (isSelected ? <Check size={12} strokeWidth={3} /> : '')
                  )}
                </span>
                <span className={styles.optionLabel}>{option}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.customSection}>
        <button
          type="button"
          className={styles.customToggle}
          onClick={onToggleShowCustom}
        >
          {showCustomInput ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{customText ? 'Custom answer' : 'Or write your own…'}</span>
        </button>

        {showCustomInput && (
          <input
            ref={customInputRef}
            type="text"
            className={styles.customInput}
            placeholder="Type your own answer…"
            value={customText}
            onChange={(e) => onChangeCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onAdvance) {
                e.preventDefault();
                onAdvance();
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
