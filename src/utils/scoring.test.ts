import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateRecurringErrors,
  computeOverallBand,
  computeScoreDeltas,
  computeTeacherOverallBand,
  countWords,
  roundIeltsBand,
} from './scoring';
import type { GradingHistoryEntry } from '../types/ielts';

test('countWords handles empty, multi-space, and bilingual text', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   \n\t  '), 0);
  assert.equal(countWords('One two   three\nfour'), 4);
  assert.equal(countWords('Bài viết IELTS Task 2 chuẩn'), 6);
});

test('roundIeltsBand applies exact IELTS .25 -> .5 and .75 -> next integer rules', () => {
  assert.equal(roundIeltsBand(6.0), 6.0);
  assert.equal(roundIeltsBand(6.25), 6.5);
  assert.equal(roundIeltsBand(6.5), 6.5);
  assert.equal(roundIeltsBand(6.75), 7.0);
  assert.equal(roundIeltsBand(7.125), 7.0);
  assert.equal(roundIeltsBand(8.75), 9.0);
  assert.equal(roundIeltsBand(9.5), 9.0);
});

test('computeOverallBand computes average of 4 integer scores', () => {
  assert.equal(
    computeOverallBand({
      task_response: 7,
      coherence_cohesion: 7,
      lexical_resource: 8,
      grammatical_range_accuracy: 8,
    }),
    7.5
  );
  assert.equal(
    computeOverallBand({
      task_response: 6,
      coherence_cohesion: 7,
      lexical_resource: 7,
      grammatical_range_accuracy: 7,
    }),
    7.0
  );
  assert.equal(
    computeOverallBand({
      task_response: 6,
      coherence_cohesion: 6,
      lexical_resource: 7,
      grammatical_range_accuracy: 6,
    }),
    6.5
  );
});

test('computeScoreDeltas handles partial and complete teacher scores', () => {
  const ai = {
    task_response: 7,
    coherence_cohesion: 7,
    lexical_resource: 7,
    grammatical_range_accuracy: 8,
  };
  const partialTeacher = {
    task_response: null,
    coherence_cohesion: null,
    lexical_resource: 8,
    grammatical_range_accuracy: null,
  };
  assert.equal(computeTeacherOverallBand(partialTeacher), null);
  const partialDelta = computeScoreDeltas(ai, partialTeacher);
  assert.equal(partialDelta.lexical_resource, -1);
  assert.equal(partialDelta.task_response, null);
  assert.equal(partialDelta.overall, null);

  const fullTeacher = {
    task_response: 7,
    coherence_cohesion: 7,
    lexical_resource: 8,
    grammatical_range_accuracy: 8,
  };
  const fullDelta = computeScoreDeltas(ai, fullTeacher);
  assert.equal(fullDelta.overall, 0);
  assert.equal(fullDelta.lexical_resource, -1);
});

test('aggregateRecurringErrors counts and sorts recurring TR/CC/LR/GRA patterns', () => {
  const mockEntry: GradingHistoryEntry = {
    id: '1',
    created_at: '2026-11-24T00:00:00.000Z',
    prompt: 'Test prompt',
    essay: 'Test essay',
    word_count: 280,
    essay_type: 'opinion',
    result: {
      scores: {
        task_response: 7,
        coherence_cohesion: 7,
        lexical_resource: 7,
        grammatical_range_accuracy: 7,
      },
      overall_band: 7,
      detected_essay_type: 'opinion',
      confidence_note: 'Có thể lệch 1 band.',
      strengths: ['Ý rõ'],
      criteria_analysis: [],
      idea_critique: [
        {
          criterion: 'TR',
          point: 'Có xu hướng khái quát hóa theo giới ở đoạn 2.',
          maps_to_band: 7,
          deducted: true,
        },
        {
          criterion: 'TR',
          point: 'Overgeneralization khi dùng từ everyone.',
          maps_to_band: 7,
          deducted: true,
        },
      ],
      language_notes: [
        {
          criterion: 'LR',
          note: 'Một lỗi collocation đơn lẻ.',
          systematic: false,
          deducted: false,
        },
        {
          criterion: 'GRA',
          note: 'Lỗi chia động từ lặp lại trong câu phức.',
          systematic: true,
          deducted: true,
        },
      ],
      gap_to_next_band: [],
      coach_questions: [],
      edits: [],
    },
  };

  const summary = aggregateRecurringErrors([mockEntry]);
  assert.equal(summary[0].id, 'overgeneralization');
  assert.equal(summary[0].count, 2);
  assert.equal(summary.length, 2); // minor non-deducted LR note is excluded
});
