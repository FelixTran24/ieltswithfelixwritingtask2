import test from 'node:test';
import assert from 'node:assert/strict';
import { matchEditsToEssay } from './editMatcher';
import type { EssayEditItem } from '../types/ielts';

test('matchEditsToEssay matches exact, whitespace-normalized, and routes unmatched to bottom', () => {
  const essay = `First paragraph has  multiple   spaces and “smart quotes”.\n\nSecond paragraph has a weak claim that everyone agrees with.`;

  const edits: EssayEditItem[] = [
    {
      original_text: 'multiple spaces and "smart quotes"',
      action: 'replace',
      suggested_text: 'clean phrasing',
      comment: 'Diễn đạt gọn hơn.',
      criterion: 'LR',
    },
    {
      original_text: 'everyone agrees',
      action: 'comment',
      comment: 'Tránh overgeneralization.',
      criterion: 'TR',
    },
    {
      original_text: 'this phrase does not exist in the essay',
      action: 'comment',
      comment: 'Bình luận tổng quát cuối bài.',
      criterion: 'CC',
    },
  ];

  const diff = matchEditsToEssay(essay, edits);

  assert.equal(diff.matchedEdits.length, 2);
  assert.equal(diff.unmatchedEdits.length, 1);
  assert.equal(
    diff.unmatchedEdits[0].edit.comment,
    'Bình luận tổng quát cuối bài.'
  );
  assert.equal(diff.paragraphs.length, 2);
  assert.equal(
    diff.paragraphs[0].segments.some((s) => s.type === 'edit'),
    true
  );
  assert.equal(
    diff.paragraphs[1].segments.some(
      (s) => s.type === 'edit' && s.text === 'everyone agrees'
    ),
    true
  );
});

test('matchEditsToEssay prevents overlapping spans by moving conflicting edit to unmatched', () => {
  const essay = 'The policy yields potential environmental benefits.';
  const edits: EssayEditItem[] = [
    {
      original_text: 'yields potential environmental benefits',
      action: 'replace',
      suggested_text: 'confers environmental benefits',
      comment: 'Collocation tốt hơn.',
      criterion: 'LR',
    },
    {
      original_text: 'potential environmental',
      action: 'delete',
      comment: 'Trùng vùng đã sửa.',
      criterion: 'LR',
    },
  ];

  const diff = matchEditsToEssay(essay, edits);
  assert.equal(diff.matchedEdits.length, 1);
  assert.equal(diff.unmatchedEdits.length, 1);
});
