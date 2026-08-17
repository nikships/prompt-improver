import { describe, it, expect } from 'vitest';
import {
  parseAskUserQuestions,
  parseQuestionnaireString,
  parkAskUser,
  answersFromUser,
  answersComplete,
} from '../src/main/droid/ask-user.js';

describe('ask-user', () => {
  it('parses full SDK payload with topic, multiSelect, and options', () => {
    const params = {
      toolCallId: 'call_123',
      questions: [
        {
          index: 0,
          topic: 'SCOPE',
          question: 'What is the scope?',
          options: ['Frontend only', 'Full stack'],
          multiSelect: false,
        },
        {
          index: 1,
          topic: 'STACK',
          question: 'Which packages to use?',
          options: ['React', 'TypeScript', 'Tailwind'],
          multiSelect: true,
        },
      ],
    };

    const parsed = parseAskUserQuestions(params);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      index: 0,
      topic: 'SCOPE',
      question: 'What is the scope?',
      options: ['Frontend only', 'Full stack'],
      multiSelect: false,
    });
    expect(parsed[1]).toEqual({
      index: 1,
      topic: 'STACK',
      question: 'Which packages to use?',
      options: ['React', 'TypeScript', 'Tailwind'],
      multiSelect: true,
    });
  });

  it('parses questionnaire string format with topics and multi-select', () => {
    const text = `
1. [question] Which frontend libraries should we use? (multi)
[topic] UI-Libraries
[option] Lucide Icons
[option] Radix Primitives

2. [question] What database target?
[topic] Database
[option] SQLite
[option] Postgres
    `;

    const parsed = parseQuestionnaireString(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      index: 0,
      topic: 'UI-LIBRARIES',
      question: 'Which frontend libraries should we use?',
      options: ['Lucide Icons', 'Radix Primitives'],
      multiSelect: true,
    });
    expect(parsed[1]).toEqual({
      index: 1,
      topic: 'DATABASE',
      question: 'What database target?',
      options: ['SQLite', 'Postgres'],
      multiSelect: false,
    });

    // Integrated via parseAskUserQuestions
    const fromParams = parseAskUserQuestions({ questionnaire: text });
    expect(fromParams).toEqual(parsed);
  });

  it('tolerates missing topic, options, or questions list', () => {
    const nullParams = null;
    const parsedNull = parseAskUserQuestions(nullParams);
    expect(parsedNull).toEqual([
      {
        index: 0,
        topic: 'PROMPT',
        question: '',
        options: [],
        multiSelect: false,
      },
    ]);

    const emptyParams = {};
    const parsedEmpty = parseAskUserQuestions(emptyParams);
    expect(parsedEmpty).toEqual([
      {
        index: 0,
        topic: 'PROMPT',
        question: '',
        options: [],
        multiSelect: false,
      },
    ]);

    const fallbackParams = {
      question: 'Do you want dark mode?',
    };
    const parsedFallback = parseAskUserQuestions(fallbackParams);
    expect(parsedFallback).toEqual([
      {
        index: 0,
        topic: 'PROMPT',
        question: 'Do you want dark mode?',
        options: [],
        multiSelect: false,
      },
    ]);

    const missingTopicParams = {
      questions: [
        {
          question: 'Are tests needed?',
          options: ['Yes', 'No'],
        },
      ],
    };
    const parsedMissing = parseAskUserQuestions(missingTopicParams);
    expect(parsedMissing[0].topic).toBe('PROMPT');
    expect(parsedMissing[0].index).toBe(0);
    expect(parsedMissing[0].multiSelect).toBe(false);
  });

  it('parks ask user with unique askId', () => {
    const parked = parkAskUser({
      questions: [{ question: 'Q1' }],
    });
    expect(parked.askId).toMatch(/^ask_[0-9a-f]+$/);
    expect(parked.questions).toHaveLength(1);
  });

  it('maps answers from user correctly', () => {
    const questions = [
      {
        index: 0,
        topic: 'SCOPE',
        question: 'Scope?',
        options: ['A', 'B'],
        multiSelect: false,
      },
      {
        index: 1,
        topic: 'UX',
        question: 'UX style?',
        options: ['Dark', 'Light'],
        multiSelect: false,
      },
    ];

    const answers = [
      { index: 0, answer: '  A  ' },
      { index: 1, answer: 'Dark' },
    ];

    const mapped = answersFromUser(questions, answers);
    expect(mapped).toEqual([
      { index: 0, question: 'Scope?', answer: 'A' },
      { index: 1, question: 'UX style?', answer: 'Dark' },
    ]);
  });

  it('validates complete vs incomplete answers', () => {
    const questions = [
      {
        index: 0,
        topic: 'SCOPE',
        question: 'Scope?',
        options: ['A', 'B'],
        multiSelect: false,
      },
      {
        index: 1,
        topic: 'UX',
        question: 'UX style?',
        options: ['Dark', 'Light'],
        multiSelect: false,
      },
    ];

    expect(answersComplete(questions, [])).toBe(false);
    expect(answersComplete(questions, [{ index: 0, answer: 'A' }])).toBe(false);
    expect(
      answersComplete(questions, [
        { index: 0, answer: 'A' },
        { index: 1, answer: '   ' },
      ]),
    ).toBe(false);
    expect(
      answersComplete(questions, [
        { index: 0, answer: 'A' },
        { index: 1, answer: 'Dark' },
      ]),
    ).toBe(true);
  });
});
