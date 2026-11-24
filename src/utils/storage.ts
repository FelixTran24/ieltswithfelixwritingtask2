import type {
  GradingHistoryEntry,
  SampleEssayResult,
  TeacherScores,
  VocabItem,
} from '../types/ielts';
import { computeScoreDeltas } from './scoring';

export const HISTORY_STORAGE_KEY = 'ielts_with_felix_history_v1';
export const VOCAB_STORAGE_KEY = 'ielts_with_felix_vocab_v1';
export const THEME_STORAGE_KEY = 'ielts_with_felix_theme_v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function safeReadJson<T>(
  key: string,
  fallback: T,
  storage: StorageLike | null = getDefaultStorage()
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeWriteJson<T>(
  key: string,
  value: T,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadHistory(
  storage: StorageLike | null = getDefaultStorage()
): GradingHistoryEntry[] {
  const data = safeReadJson<GradingHistoryEntry[]>(
    HISTORY_STORAGE_KEY,
    [],
    storage
  );
  return Array.isArray(data) ? data : [];
}

export function saveHistory(
  history: GradingHistoryEntry[],
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  return safeWriteJson(HISTORY_STORAGE_KEY, history, storage);
}

export function upsertHistoryEntry(
  history: GradingHistoryEntry[],
  entry: GradingHistoryEntry
): GradingHistoryEntry[] {
  const filtered = history.filter((item) => item.id !== entry.id);
  return [entry, ...filtered];
}

export function updateHistoryTeacherScores(
  history: GradingHistoryEntry[],
  id: string,
  teacherScores: TeacherScores
): GradingHistoryEntry[] {
  return history.map((item) =>
    item.id === id ? { ...item, teacher_scores: teacherScores } : item
  );
}

export function attachSampleToHistory(
  history: GradingHistoryEntry[],
  id: string,
  sampleEssay: SampleEssayResult
): GradingHistoryEntry[] {
  return history.map((item) =>
    item.id === id ? { ...item, sample_essay: sampleEssay } : item
  );
}

export function loadVocab(
  storage: StorageLike | null = getDefaultStorage()
): VocabItem[] {
  const data = safeReadJson<VocabItem[]>(VOCAB_STORAGE_KEY, [], storage);
  return Array.isArray(data) ? data : [];
}

export function saveVocab(
  vocab: VocabItem[],
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  return safeWriteJson(VOCAB_STORAGE_KEY, vocab, storage);
}

export function addVocabDeduplicated(
  existing: VocabItem[],
  item: Omit<VocabItem, 'id' | 'saved_at'>
): { list: VocabItem[]; added: boolean } {
  const normalizedPhrase = item.phrase.trim().toLowerCase();
  if (!normalizedPhrase) return { list: existing, added: false };

  const duplicate = existing.some(
    (v) => v.phrase.trim().toLowerCase() === normalizedPhrase
  );
  if (duplicate) {
    return { list: existing, added: false };
  }

  const created: VocabItem = {
    ...item,
    phrase: item.phrase.trim(),
    vietnamese_meaning: item.vietnamese_meaning.trim(),
    id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    saved_at: new Date().toISOString(),
    mastered: false,
  };
  return { list: [created, ...existing], added: true };
}

export function loadTheme(
  storage: StorageLike | null = getDefaultStorage()
): 'light' | 'dark' {
  const saved = safeReadJson<string | null>(THEME_STORAGE_KEY, null, storage);
  if (saved === 'dark' || saved === 'light') return saved;
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // ignore matchMedia failures
  }
  return 'light';
}

export function saveTheme(
  theme: 'light' | 'dark',
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  return safeWriteJson(THEME_STORAGE_KEY, theme, storage);
}

/**
 * Formats grading history into a calibration-ready JSON structure compatible with calibration.json.
 */
export function buildCalibrationExport(
  history: GradingHistoryEntry[],
  vocab: VocabItem[]
) {
  return {
    exported_at: new Date().toISOString(),
    app: 'IELTS WITH FELIX',
    note: 'Lịch sử chấm bài và đối chiếu điểm giáo viên dùng để theo dõi tiến bộ hoặc bổ sung vào bộ calibration.',
    calibration_examples: history.map((item) => ({
      id: item.id,
      created_at: item.created_at,
      essay_type: item.essay_type,
      word_count: item.word_count,
      prompt: item.prompt,
      essay: item.essay,
      ai_scores: item.result.scores,
      ai_overall_band: item.result.overall_band,
      teacher_scores: item.teacher_scores ?? {
        task_response: null,
        coherence_cohesion: null,
        lexical_resource: null,
        grammatical_range_accuracy: null,
      },
      deltas_ai_minus_teacher: computeScoreDeltas(
        item.result.scores,
        item.teacher_scores
      ),
    })),
    vocabulary_bank: vocab,
  };
}
