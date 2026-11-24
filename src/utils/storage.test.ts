import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addVocabDeduplicated,
  buildCalibrationExport,
  loadHistory,
  saveHistory,
  type StorageLike,
} from './storage';
import type { GradingHistoryEntry } from '../types/ielts';

test('storage helpers safely survive throwing localStorage', () => {
  const throwingStorage: StorageLike = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };

  assert.deepEqual(loadHistory(throwingStorage), []);
  assert.equal(saveHistory([], throwingStorage), false);
});

test('addVocabDeduplicated prevents case-insensitive duplicates', () => {
  const first = addVocabDeduplicated([], {
    phrase: 'preclude the need for',
    vietnamese_meaning: 'loại bỏ sự cần thiết của',
  });
  assert.equal(first.added, true);
  assert.equal(first.list.length, 1);

  const second = addVocabDeduplicated(first.list, {
    phrase: '  Preclude The Need For ',
    vietnamese_meaning: 'nghĩa khác',
  });
  assert.equal(second.added, false);
  assert.equal(second.list.length, 1);
});

test('buildCalibrationExport outputs structured calibration_examples and vocabulary_bank', () => {
  const entry: GradingHistoryEntry = {
    id: 'h1',
    created_at: '2026-11-24T00:00:00.000Z',
    prompt: 'Prompt A',
    essay: 'Essay A',
    word_count: 300,
    essay_type: 'opinion',
    result: {
      scores: {
        task_response: 7,
        coherence_cohesion: 7,
        lexical_resource: 8,
        grammatical_range_accuracy: 8,
      },
      overall_band: 7.5,
      detected_essay_type: 'opinion',
      confidence_note: 'Note',
      strengths: [],
      criteria_analysis: [],
      idea_critique: [],
      language_notes: [],
      gap_to_next_band: [],
      coach_questions: [],
      edits: [],
    },
    teacher_scores: {
      task_response: 7,
      coherence_cohesion: 7,
      lexical_resource: 8,
      grammatical_range_accuracy: 8,
    },
  };

  const exported = buildCalibrationExport([entry], []);
  assert.equal(exported.app, 'IELTS WITH FELIX');
  assert.equal(exported.calibration_examples.length, 1);
  assert.equal(exported.calibration_examples[0].deltas_ai_minus_teacher.overall, 0);
});
