import { randomBytes } from 'node:crypto';
import type { AskQuestion, PendingAsk, AskAnswer } from '@shared/types.js';

export function parseAskUserQuestions(params: Record<string, unknown>): AskQuestion[] {
  const raw = Array.isArray(params.questions) ? params.questions : [];
  if (!raw.length) {
    const fallback =
      typeof params.question === 'string' && params.question.trim() ? params.question.trim() : '';
    return [
      {
        index: 0,
        topic: 'PROMPT',
        question: fallback,
        options: [],
        multiSelect: false,
      },
    ];
  }

  return raw.map((item, i) => {
    const q = (item ?? {}) as Record<string, unknown>;
    const options = Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      : [];

    const topic =
      typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim().toUpperCase() : 'PROMPT';

    return {
      index: typeof q.index === 'number' ? q.index : i,
      topic,
      question: typeof q.question === 'string' ? q.question : '',
      options,
      multiSelect: Boolean(q.multiSelect),
    };
  });
}

export function parkAskUser(
  params: Record<string, unknown>,
  askId?: string,
): PendingAsk {
  return {
    askId: askId ?? `ask_${randomBytes(6).toString('hex')}`,
    questions: parseAskUserQuestions(params),
  };
}

export function answersFromUser(
  questions: AskQuestion[],
  answers: AskAnswer[],
): { index: number; question: string; answer: string }[] {
  const byIndex = new Map(answers.map((a) => [a.index, a.answer]));
  return questions.map((q) => ({
    index: q.index,
    question: q.question,
    answer: (byIndex.get(q.index) ?? '').trim(),
  }));
}

export function answersComplete(
  questions: AskQuestion[],
  answers: AskAnswer[],
): boolean {
  const mapped = answersFromUser(questions, answers);
  return mapped.length > 0 && mapped.every((a) => a.answer.length > 0);
}
