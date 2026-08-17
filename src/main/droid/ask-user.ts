import { randomBytes } from 'node:crypto';
import type { AskQuestion, PendingAsk, AskAnswer } from '@shared/types.js';

export function parseQuestionnaireString(text: string): AskQuestion[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const questions: AskQuestion[] = [];
  let current: Partial<AskQuestion> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const qMatch = line.match(/^(?:\d+\.\s*)?\[question\]\s*(.*)$/i);
    if (qMatch) {
      if (current && current.question) {
        questions.push({
          index: current.index ?? questions.length,
          topic: current.topic || 'PROMPT',
          question: current.question,
          options: current.options || [],
          multiSelect: Boolean(current.multiSelect),
        });
      }

      let qText = qMatch[1].trim();
      let multi = false;
      if (/\(multi\)\s*$/i.test(qText)) {
        multi = true;
        qText = qText.replace(/\(multi\)\s*$/i, '').trim();
      }

      current = {
        index: questions.length,
        topic: 'PROMPT',
        question: qText,
        options: [],
        multiSelect: multi,
      };
      continue;
    }

    const topicMatch = line.match(/^\[topic\]\s*(.*)$/i);
    if (topicMatch && current) {
      current.topic = topicMatch[1].trim().toUpperCase() || 'PROMPT';
      continue;
    }

    const optionMatch = line.match(/^\[option\]\s*(.*)$/i);
    if (optionMatch && current) {
      const opt = optionMatch[1].trim();
      if (opt) {
        current.options = current.options || [];
        current.options.push(opt);
      }
      continue;
    }
  }

  if (current && current.question) {
    questions.push({
      index: current.index ?? questions.length,
      topic: current.topic || 'PROMPT',
      question: current.question,
      options: current.options || [],
      multiSelect: Boolean(current.multiSelect),
    });
  }

  return questions;
}

export function parseAskUserQuestions(
  params?: Record<string, unknown> | null,
): AskQuestion[] {
  if (!params || typeof params !== 'object') {
    return [
      {
        index: 0,
        topic: 'PROMPT',
        question: '',
        options: [],
        multiSelect: false,
      },
    ];
  }

  const raw = Array.isArray(params.questions) ? params.questions : [];
  if (raw.length > 0) {
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

  if (typeof params.questionnaire === 'string' && params.questionnaire.trim().length > 0) {
    const fromQuestionnaire = parseQuestionnaireString(params.questionnaire);
    if (fromQuestionnaire.length > 0) {
      return fromQuestionnaire;
    }
  }

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
