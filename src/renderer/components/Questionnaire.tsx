import { useState, useEffect, useCallback, type FC } from 'react';
import type { PendingAsk, AskAnswer, AnsweredItem, AskQuestion } from '@shared/types.js';
import { QuestionCard } from './QuestionCard.js';
import { Button } from './ui/Button.js';
import styles from './Questionnaire.module.css';

interface QuestionnaireProps {
  pendingAsk: PendingAsk;
  earlierAnswered: AnsweredItem[];
  onSubmit: (answers: AskAnswer[]) => void;
}

export const Questionnaire: FC<QuestionnaireProps> = ({
  pendingAsk,
  earlierAnswered,
  onSubmit,
}) => {
  const questions = pendingAsk.questions;
  const [activeIdx, setActiveIdx] = useState(0);

  const [selectedMap, setSelectedMap] = useState<Record<number, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<number, string>>({});
  const [showCustomMap, setShowCustomMap] = useState<Record<number, boolean>>({});

  // Reset active index when a new ask arrives
  useEffect(() => {
    setActiveIdx(0);
    setSelectedMap({});
    setCustomTextMap({});
    setShowCustomMap({});
  }, [pendingAsk.askId]);

  const currentQuestion: AskQuestion | undefined = questions[activeIdx];

  const getResolvedAnswer = useCallback(
    (q: AskQuestion): string => {
      const selected = selectedMap[q.index] ?? [];
      const custom = (customTextMap[q.index] ?? '').trim();

      if (q.multiSelect) {
        const parts = [...selected];
        if (custom) {
          parts.push(custom);
        }
        return parts.join(', ');
      }

      // Single-select: custom answer takes priority if non-empty, otherwise selected option
      if (custom) return custom;
      return selected[0] ?? '';
    },
    [selectedMap, customTextMap],
  );

  const isCurrentAnswered = currentQuestion ? getResolvedAnswer(currentQuestion).length > 0 : false;
  const allAnswered = questions.every((q) => getResolvedAnswer(q).length > 0);

  const handleToggleOption = (option: string) => {
    if (!currentQuestion) return;
    const qIndex = currentQuestion.index;
    const currentSelected = selectedMap[qIndex] ?? [];

    if (currentQuestion.multiSelect) {
      const exists = currentSelected.includes(option);
      const next = exists
        ? currentSelected.filter((o) => o !== option)
        : [...currentSelected, option];
      setSelectedMap((prev) => ({ ...prev, [qIndex]: next }));
    } else {
      // Single-select: toggle selection and clear custom text
      const next = currentSelected.includes(option) ? [] : [option];
      setSelectedMap((prev) => ({ ...prev, [qIndex]: next }));
      if (next.length > 0) {
        setCustomTextMap((prev) => ({ ...prev, [qIndex]: '' }));
      }
    }
  };

  const handleChangeCustomText = (text: string) => {
    if (!currentQuestion) return;
    const qIndex = currentQuestion.index;
    setCustomTextMap((prev) => ({ ...prev, [qIndex]: text }));

    // In single-select mode, if user enters custom text, deselect options
    if (!currentQuestion.multiSelect && text.trim().length > 0) {
      setSelectedMap((prev) => ({ ...prev, [qIndex]: [] }));
    }
  };

  const handleToggleShowCustom = () => {
    if (!currentQuestion) return;
    const qIndex = currentQuestion.index;
    setShowCustomMap((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleSubmit = useCallback(() => {
    if (!allAnswered) return;
    const answers: AskAnswer[] = questions.map((q) => ({
      index: q.index,
      answer: getResolvedAnswer(q),
    }));
    onSubmit(answers);
  }, [allAnswered, questions, getResolvedAnswer, onSubmit]);

  const handleAdvance = useCallback(() => {
    if (!isCurrentAnswered) return;

    if (activeIdx < questions.length - 1) {
      setActiveIdx((prev) => prev + 1);
    } else if (allAnswered) {
      handleSubmit();
    }
  }, [isCurrentAnswered, activeIdx, questions.length, allAnswered, handleSubmit]);

  // Keyboard navigation for Enter and arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // If inside an input element, let the input's own onKeyDown handle it
        if ((e.target as HTMLElement)?.tagName === 'INPUT') {
          return;
        }
        if (isCurrentAnswered) {
          e.preventDefault();
          handleAdvance();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAdvance, isCurrentAnswered]);

  if (!currentQuestion) return null;

  const currentSelected = selectedMap[currentQuestion.index] ?? [];
  const currentCustom = customTextMap[currentQuestion.index] ?? '';
  const currentShowCustom = Boolean(showCustomMap[currentQuestion.index] || currentCustom);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>A few questions to ground this prompt</span>
        <span className={styles.counter}>
          {activeIdx + 1} / {questions.length}
        </span>
      </div>

      <QuestionCard
        question={currentQuestion}
        cardIndex={activeIdx + 1}
        selectedOptions={currentSelected}
        customText={currentCustom}
        showCustomInput={currentShowCustom}
        onToggleOption={handleToggleOption}
        onChangeCustomText={handleChangeCustomText}
        onToggleShowCustom={handleToggleShowCustom}
        onAdvance={handleAdvance}
      />

      <div className={styles.footer}>
        <Button
          variant="ghost"
          onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
          disabled={activeIdx === 0}
        >
          Back
        </Button>

        {activeIdx < questions.length - 1 ? (
          <Button
            variant="primary"
            onClick={handleAdvance}
            disabled={!isCurrentAnswered}
          >
            Next →
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            Submit answers →
          </Button>
        )}
      </div>

      {earlierAnswered.length > 0 && (
        <div className={styles.earlierSection}>
          <span className={styles.earlierHeader}>Earlier answers</span>
          <div className={styles.earlierChips}>
            {earlierAnswered.map((item, i) => (
              <div key={i} className={styles.earlierChip}>
                <span className={styles.earlierChipTopic}>{item.topic}</span>
                <span className={styles.earlierChipAnswer}>{item.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
