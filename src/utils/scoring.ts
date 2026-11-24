import type {
  BandScores,
  CriterionCode,
  GradingHistoryEntry,
  TeacherScores,
} from '../types/ielts';

/**
 * Count words accurately across English and Vietnamese essays.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Clamp and enforce integer band score (0-9).
 */
export function normalizeCriterionScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9, Math.round(value)));
}

/**
 * Official IELTS half-band rounding rule:
 * x.25 rounds UP to x.5; x.75 rounds UP to x + 1.0.
 */
export function roundIeltsBand(average: number): number {
  if (!Number.isFinite(average)) return 0;
  const clamped = Math.max(0, Math.min(9, average));
  return Math.floor(clamped * 2 + 0.5) / 2;
}

export function computeOverallBand(scores: BandScores): number {
  const tr = normalizeCriterionScore(scores.task_response);
  const cc = normalizeCriterionScore(scores.coherence_cohesion);
  const lr = normalizeCriterionScore(scores.lexical_resource);
  const gra = normalizeCriterionScore(scores.grammatical_range_accuracy);
  return roundIeltsBand((tr + cc + lr + gra) / 4);
}

export function computeTeacherOverallBand(
  teacherScores?: TeacherScores
): number | null {
  if (!teacherScores) return null;
  const {
    task_response,
    coherence_cohesion,
    lexical_resource,
    grammatical_range_accuracy,
  } = teacherScores;
  if (
    task_response === null ||
    coherence_cohesion === null ||
    lexical_resource === null ||
    grammatical_range_accuracy === null
  ) {
    return null;
  }
  return computeOverallBand({
    task_response,
    coherence_cohesion,
    lexical_resource,
    grammatical_range_accuracy,
  });
}

export interface ScoreDeltaSummary {
  task_response: number | null;
  coherence_cohesion: number | null;
  lexical_resource: number | null;
  grammatical_range_accuracy: number | null;
  overall: number | null;
}

/**
 * Delta = AI score - Teacher score.
 * Positive means AI scored higher; negative means AI scored lower.
 */
export function computeScoreDeltas(
  aiScores: BandScores,
  teacherScores?: TeacherScores
): ScoreDeltaSummary {
  if (!teacherScores) {
    return {
      task_response: null,
      coherence_cohesion: null,
      lexical_resource: null,
      grammatical_range_accuracy: null,
      overall: null,
    };
  }
  const aiOverall = computeOverallBand(aiScores);
  const teacherOverall = computeTeacherOverallBand(teacherScores);

  return {
    task_response:
      teacherScores.task_response !== null
        ? aiScores.task_response - teacherScores.task_response
        : null,
    coherence_cohesion:
      teacherScores.coherence_cohesion !== null
        ? aiScores.coherence_cohesion - teacherScores.coherence_cohesion
        : null,
    lexical_resource:
      teacherScores.lexical_resource !== null
        ? aiScores.lexical_resource - teacherScores.lexical_resource
        : null,
    grammatical_range_accuracy:
      teacherScores.grammatical_range_accuracy !== null
        ? aiScores.grammatical_range_accuracy -
          teacherScores.grammatical_range_accuracy
        : null,
    overall:
      teacherOverall !== null
        ? Math.round((aiOverall - teacherOverall) * 10) / 10
        : null,
  };
}

export function formatBand(score: number): string {
  return Number.isInteger(score) ? `${score}.0` : score.toFixed(1);
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export interface RecurringErrorCategory {
  id: string;
  label: string;
  criterion: CriterionCode;
  count: number;
  deductedCount: number;
  latestExample: string;
}

const ERROR_PATTERNS: Array<{
  id: string;
  label: string;
  criterion: CriterionCode;
  keywords: RegExp;
}> = [
  {
    id: 'overgeneralization',
    label: 'Khái quát hóa quá mức (Overgeneralization)',
    criterion: 'TR',
    keywords: /khái quát|overgenerali|quá mức|tuyệt đối|mọi người|tất cả/i,
  },
  {
    id: 'missing_mechanism',
    label: 'Thiếu cơ chế giải thích / lập luận đứt đoạn',
    criterion: 'TR',
    keywords: /cơ chế|mechanism|chưa giải thích|thiếu phát triển|đứt đoạn|chưa rõ vì sao/i,
  },
  {
    id: 'example_precision',
    label: 'Ví dụ mờ hoặc chưa khớp luận điểm',
    criterion: 'TR',
    keywords: /ví dụ|example|chưa khớp|minh họa|thiếu chính xác/i,
  },
  {
    id: 'position_scope',
    label: 'Lập trường / phạm vi đề chưa chặt',
    criterion: 'TR',
    keywords: /lập trường|position|lạc đề|bỏ sót|phạm vi|kết luận/i,
  },
  {
    id: 'cohesion_mechanical',
    label: 'Từ nối cơ học / liên kết hoặc tham chiếu yếu',
    criterion: 'CC',
    keywords: /từ nối|cơ học|cohesi|mâu thuẫn|lặp từ|reference|phân đoạn|mạch lạc/i,
  },
  {
    id: 'collocation_word_choice',
    label: 'Collocation hoặc chọn từ chưa tự nhiên',
    criterion: 'LR',
    keywords: /collocation|chọn từ|word choice|danh hóa|văn phong|lặp từ vựng|diễn đạt/i,
  },
  {
    id: 'grammar_systematic',
    label: 'Lỗi ngữ pháp lặp lại (chia động từ, mệnh đề, dấu câu)',
    criterion: 'GRA',
    keywords: /ngữ pháp|động từ|mệnh đề|dấu câu|câu phức|mạo từ|số ít|số nhiều|thì|grammar/i,
  },
];

export function aggregateRecurringErrors(
  history: GradingHistoryEntry[]
): RecurringErrorCategory[] {
  const map = new Map<string, RecurringErrorCategory>();

  const register = (
    criterion: CriterionCode,
    text: string,
    deducted: boolean
  ) => {
    const matched = ERROR_PATTERNS.find(
      (p) => p.criterion === criterion && p.keywords.test(text)
    );
    const id = matched ? matched.id : `other_${criterion}`;
    const label = matched
      ? matched.label
      : criterion === 'TR'
        ? 'Lỗi Task Response khác'
        : criterion === 'CC'
          ? 'Lỗi Coherence & Cohesion khác'
          : criterion === 'LR'
            ? 'Lỗi Lexical Resource khác'
            : 'Lỗi Grammatical Range & Accuracy khác';

    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
      if (deducted) existing.deductedCount += 1;
      existing.latestExample = text;
    } else {
      map.set(id, {
        id,
        label,
        criterion,
        count: 1,
        deductedCount: deducted ? 1 : 0,
        latestExample: text,
      });
    }
  };

  for (const entry of history) {
    for (const item of entry.result.idea_critique) {
      register(item.criterion, item.point, item.deducted);
    }
    for (const note of entry.result.language_notes) {
      if (note.systematic || note.deducted) {
        register(note.criterion, note.note, note.deducted);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || b.deductedCount - a.deductedCount
  );
}
