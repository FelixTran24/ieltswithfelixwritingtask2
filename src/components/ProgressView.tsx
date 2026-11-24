import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { getEssayTypeConfig } from '../data/essayTypes';
import type { GradingHistoryEntry, VocabItem } from '../types/ielts';
import {
  aggregateRecurringErrors,
  computeScoreDeltas,
  computeTeacherOverallBand,
  formatBand,
  formatDelta,
} from '../utils/scoring';
import { buildCalibrationExport } from '../utils/storage';

interface ProgressViewProps {
  history: GradingHistoryEntry[];
  vocab: VocabItem[];
  onOpenHistoryEntry: (entry: GradingHistoryEntry) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onAddVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
  onToggleVocabMastered: (id: string) => void;
  onDeleteVocab: (id: string) => void;
}

type ChartSeries = 'overall' | 'TR' | 'CC' | 'LR' | 'GRA';
type VocabFilter = 'all' | 'learning' | 'mastered';

const SERIES_LABELS: Record<ChartSeries, string> = {
  overall: 'Tổng Band',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar',
};

function getSeriesValue(entry: GradingHistoryEntry, series: ChartSeries): number {
  if (series === 'overall') return entry.result.overall_band;
  if (series === 'TR') return entry.result.scores.task_response;
  if (series === 'CC') return entry.result.scores.coherence_cohesion;
  if (series === 'LR') return entry.result.scores.lexical_resource;
  return entry.result.scores.grammatical_range_accuracy;
}

function getTeacherSeriesValue(
  entry: GradingHistoryEntry,
  series: ChartSeries
): number | null {
  if (!entry.teacher_scores) return null;
  if (series === 'overall') return computeTeacherOverallBand(entry.teacher_scores);
  if (series === 'TR') return entry.teacher_scores.task_response;
  if (series === 'CC') return entry.teacher_scores.coherence_cohesion;
  if (series === 'LR') return entry.teacher_scores.lexical_resource;
  return entry.teacher_scores.grammatical_range_accuracy;
}

export function ProgressView({
  history,
  vocab,
  onOpenHistoryEntry,
  onDeleteHistoryEntry,
  onAddVocab,
  onToggleVocabMastered,
  onDeleteVocab,
}: ProgressViewProps) {
  const [chartSeries, setChartSeries] = useState<ChartSeries>('overall');
  const [vocabQuery, setVocabQuery] = useState('');
  const [vocabFilter, setVocabFilter] = useState<VocabFilter>('all');

  // Manual vocab add form
  const [newPhrase, setNewPhrase] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [vocabError, setVocabError] = useState<string | null>(null);

  const chronologicalHistory = useMemo(
    () => [...history].reverse(),
    [history]
  );

  const recurringErrors = useMemo(
    () => aggregateRecurringErrors(history),
    [history]
  );

  const avgOverall = useMemo(() => {
    if (history.length === 0) return null;
    const sum = history.reduce((acc, item) => acc + item.result.overall_band, 0);
    return Math.round((sum / history.length) * 10) / 10;
  }, [history]);

  const filteredVocab = useMemo(() => {
    const q = vocabQuery.trim().toLowerCase();
    return vocab.filter((item) => {
      if (vocabFilter === 'learning' && item.mastered) return false;
      if (vocabFilter === 'mastered' && !item.mastered) return false;
      if (!q) return true;
      return (
        item.phrase.toLowerCase().includes(q) ||
        item.vietnamese_meaning.toLowerCase().includes(q) ||
        (item.example_sentence ?? '').toLowerCase().includes(q)
      );
    });
  }, [vocab, vocabFilter, vocabQuery]);

  const handleExportJson = () => {
    const payload = buildCalibrationExport(history, vocab);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ielts-with-felix-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreateVocab = (e: React.FormEvent) => {
    e.preventDefault();
    setVocabError(null);
    if (!newPhrase.trim() || !newMeaning.trim()) {
      setVocabError('Vui lòng nhập cụm từ tiếng Anh và nghĩa tiếng Việt.');
      return;
    }
    onAddVocab({
      phrase: newPhrase.trim(),
      vietnamese_meaning: newMeaning.trim(),
      example_sentence: newExample.trim() || undefined,
      source_topic: 'Tự thêm thủ công',
    });
    setNewPhrase('');
    setNewMeaning('');
    setNewExample('');
  };

  // SVG chart layout
  const chartW = 680;
  const chartH = 230;
  const padL = 48;
  const padR = 46;
  const padT = 20;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const minBand = 4;
  const maxBand = 9;

  const yForBand = (band: number) => {
    const clamped = Math.max(minBand, Math.min(maxBand, band));
    return padT + ((maxBand - clamped) / (maxBand - minBand)) * plotH;
  };

  const xForIndex = (idx: number, total: number) => {
    if (total <= 1) return padL + plotW / 2;
    return padL + (idx / (total - 1)) * plotW;
  };

  const linePoints = chronologicalHistory
    .map(
      (entry, idx) =>
        `${xForIndex(idx, chronologicalHistory.length)},${yForBand(
          getSeriesValue(entry, chartSeries)
        )}`
    )
    .join(' ');

  return (
    <div className="space-y-8">
      {/* Header + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#24171D] dark:text-[#F6EEF1] sm:text-3xl [text-wrap:balance]">
            Tiến bộ &amp; Sổ từ vựng cá nhân
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#614D56] dark:text-[#B8A5AE]">
            Dữ liệu lưu cục bộ trên trình duyệt của bạn. Theo dõi xu hướng band điểm, độ lệch với giáo viên, lỗi lặp lại nhiều nhất và xuất JSON để hiệu chỉnh.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#9D0B3A] bg-[#FDF2F6] px-4 text-xs font-semibold text-[#8F0E39] transition-colors hover:bg-[#F9E3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#F5A3BF] dark:bg-[#2B1D24] dark:text-[#F5A3BF] dark:hover:bg-[#38252E] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Xuất JSON (Lịch sử &amp; Sổ từ)</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EDD8DF] bg-white p-4 dark:border-[#34262D] dark:bg-[#1C1519]">
          <div className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Tổng bài đã chấm
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#24171D] dark:text-[#F6EEF1] tabular-nums">
            {history.length}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EDD8DF] bg-white p-4 dark:border-[#34262D] dark:bg-[#1C1519]">
          <div className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Điểm ước lượng TB
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#8F0E39] dark:text-[#F5A3BF] tabular-nums">
            {avgOverall !== null ? avgOverall.toFixed(1) : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EDD8DF] bg-white p-4 dark:border-[#34262D] dark:bg-[#1C1519]">
          <div className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Từ vựng đã lưu
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#24171D] dark:text-[#F6EEF1] tabular-nums">
            {vocab.length}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EDD8DF] bg-white p-4 dark:border-[#34262D] dark:bg-[#1C1519]">
          <div className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Từ đã thuộc
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {vocab.filter((v) => v.mastered).length}
          </div>
        </div>
      </div>

      {/* Score Progression Chart & Recurring Errors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Band Trend Chart */}
        <section
          aria-label="Biểu đồ điểm theo thời gian"
          className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Biểu đồ điểm theo thời gian
              </h2>
              <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                Đường hồng: điểm AI ước lượng · Chấm xanh: điểm giáo viên (nếu có nhập).
              </p>
            </div>
            <div className="flex flex-nowrap shrink-0 gap-1 rounded-lg bg-[#FAF0F4] p-1 dark:bg-[#251C21]">
              {(Object.keys(SERIES_LABELS) as ChartSeries[]).map((key) => {
                const active = chartSeries === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setChartSeries(key)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#8F0E39] shadow-xs dark:bg-[#1C1519] dark:text-[#F5A3BF]'
                        : 'text-[#614D56] hover:text-[#24171D] dark:text-[#B5A2AB]'
                    }`}
                  >
                    {key === 'overall' ? 'Tổng' : key}
                  </button>
                );
              })}
            </div>
          </div>

          {chronologicalHistory.length === 0 ? (
            <div className="mt-6 flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[#E6CFD7] bg-[#FCF8FA] px-4 text-center text-sm text-[#735D67] dark:border-[#3A2B33] dark:bg-[#171115] dark:text-[#AA96A0]">
              Chưa có bài chấm nào. Hãy chấm bài đầu tiên ở mục &ldquo;Chấm bài&rdquo; để bắt đầu vẽ biểu đồ tiến bộ.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                role="img"
                aria-label={`Biểu đồ ${SERIES_LABELS[chartSeries]} qua ${chronologicalHistory.length} bài`}
                className="w-full min-w-[420px] h-auto"
              >
                {/* Horizontal gridlines for bands 4..9 */}
                {[4, 5, 6, 7, 8, 9].map((band) => {
                  const y = yForBand(band);
                  return (
                    <g key={band}>
                      <line
                        x1={padL}
                        x2={chartW - padR}
                        y1={y}
                        y2={y}
                        className="stroke-[#F0DCE3] dark:stroke-[#2E2228]"
                        strokeWidth={1}
                      />
                      <text
                        x={padL - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#7A636D] dark:fill-[#9E8B94] text-[11px] font-mono"
                      >
                        {band}.0
                      </text>
                    </g>
                  );
                })}

                {/* AI score polyline */}
                {chronologicalHistory.length > 1 && (
                  <polyline
                    fill="none"
                    points={linePoints}
                    className="stroke-[#9D0B3A] dark:stroke-[#F497B6]"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points + Date Labels + Teacher Overlay Dots */}
                {chronologicalHistory.map((entry, idx) => {
                  const x = xForIndex(idx, chronologicalHistory.length);
                  const aiVal = getSeriesValue(entry, chartSeries);
                  const yAi = yForBand(aiVal);
                  const teacherVal = getTeacherSeriesValue(entry, chartSeries);
                  const dateLabel = new Date(entry.created_at).toLocaleDateString(
                    'vi-VN',
                    { day: '2-digit', month: '2-digit' }
                  );

                  return (
                    <g key={entry.id}>
                      <circle
                        cx={x}
                        cy={yAi}
                        r={5}
                        className="fill-[#9D0B3A] stroke-white dark:fill-[#F497B6] dark:stroke-[#1C1519]"
                        strokeWidth={2}
                      />
                      <text
                        x={x}
                        y={yAi - 10}
                        textAnchor="middle"
                        className="fill-[#8F0E39] dark:fill-[#FAD0DF] text-[10px] font-mono font-semibold"
                      >
                        {formatBand(aiVal)}
                      </text>

                      {teacherVal !== null && (
                        <circle
                          cx={x}
                          cy={yForBand(teacherVal)}
                          r={4.5}
                          className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-[#1C1519]"
                          strokeWidth={1.5}
                        />
                      )}

                      <text
                        x={x}
                        y={chartH - 10}
                        textAnchor="middle"
                        className="fill-[#7A636D] dark:fill-[#9E8B94] text-[10px] font-mono"
                      >
                        #{idx + 1} ({dateLabel})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </section>

        {/* Top Recurring Errors */}
        <section
          aria-label="Lỗi lặp lại nhiều nhất"
          className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
        >
          <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            Lỗi lặp lại nhiều nhất
          </h2>
          <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Tổng hợp các nhóm lỗi ý tưởng (TR/CC) và lỗi hệ thống (LR/GRA) xuất hiện qua các bài đã chấm.
          </p>

          {recurringErrors.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#E6CFD7] bg-[#FCF8FA] p-5 text-center text-xs text-[#735D67] dark:border-[#3A2B33] dark:bg-[#171115] dark:text-[#AA96A0]">
              Chưa đủ dữ liệu lỗi lặp lại. Các lỗi nổi bật sẽ tự động tổng hợp sau khi bạn chấm bài.
            </div>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {recurringErrors.slice(0, 5).map((err) => {
                const maxCount = recurringErrors[0]?.count || 1;
                const widthPct = Math.max(
                  14,
                  Math.round((err.count / maxCount) * 100)
                );
                return (
                  <li key={err.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-[#24171D] dark:text-[#F0E6EA]">
                        <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                          {err.criterion}
                        </span>{' '}
                        · {err.label}
                      </span>
                      <span className="font-mono font-semibold text-[#6B545E] dark:text-[#BBA7B0] tabular-nums shrink-0">
                        {err.count} lần
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F6E6EC] dark:bg-[#2A2025]">
                      <div
                        className="h-full rounded-full bg-[#B5174B] dark:bg-[#E7779E]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Grading History List */}
      <section
        aria-label="Lịch sử bài chấm"
        className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            Lịch sử bài đã chấm ({history.length})
          </h2>
          <span className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Lưu trữ trong localStorage của trình duyệt
          </span>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-[#735D67] dark:text-[#AA96A0]">
            Chưa có bài viết nào được lưu trong lịch sử.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#F2E2E8] dark:divide-[#2D2127]">
            {history.map((entry) => {
              const teacherOverall = computeTeacherOverallBand(
                entry.teacher_scores
              );
              const deltas = computeScoreDeltas(
                entry.result.scores,
                entry.teacher_scores
              );
              const dateStr = new Date(entry.created_at).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#735D67] dark:text-[#AA96A0]">
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getEssayTypeConfig(entry.essay_type).shortName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{entry.word_count} từ</span>
                    </div>
                    <p className="text-sm font-medium text-[#24171D] dark:text-[#F6EEF1] line-clamp-2">
                      {entry.prompt}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#5E4A53] dark:text-[#C2B0B9] tabular-nums">
                      <span>
                        AI: <strong className="text-[#8F0E39] dark:text-[#F5A3BF]">{formatBand(entry.result.overall_band)}</strong> (TR {entry.result.scores.task_response} / CC {entry.result.scores.coherence_cohesion} / LR {entry.result.scores.lexical_resource} / GRA {entry.result.scores.grammatical_range_accuracy})
                      </span>
                      {teacherOverall !== null && (
                        <span>
                          · GV: <strong className="text-emerald-700 dark:text-emerald-300">{formatBand(teacherOverall)}</strong> (Lệch {formatDelta(deltas.overall)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenHistoryEntry(entry)}
                      aria-label={`Mở lại bài chấm ngày ${dateStr}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6C7D2] bg-[#FDF5F8] px-3 text-xs font-medium text-[#8F0E39] hover:bg-[#F9E3EC] dark:border-[#49323D] dark:bg-[#2A1D24] dark:text-[#F5A3BF]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Xem lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryEntry(entry.id)}
                      aria-label={`Xóa bài chấm ngày ${dateStr}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#EDD8DF] text-[#7A636D] hover:bg-rose-50 hover:text-rose-700 dark:border-[#34262D] dark:text-[#9E8B94] dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Personal Vocabulary Bank */}
      <section
        aria-label="Sổ từ vựng cá nhân"
        className="space-y-5 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
              Sổ từ vựng cá nhân ({vocab.length})
            </h2>
            <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
              Tổng hợp các collocation đã lưu từ bài mẫu Band 9, Debate Arena hoặc tự thêm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E7681]"
                aria-hidden="true"
              />
              <label htmlFor="vocab-search" className="sr-only">
                Tìm kiếm trong sổ từ vựng
              </label>
              <input
                id="vocab-search"
                type="text"
                value={vocabQuery}
                onChange={(e) => setVocabQuery(e.target.value)}
                placeholder="Tìm từ hoặc nghĩa..."
                className="h-9 w-48 rounded-lg border border-[#E5CFD7] bg-[#FFFDFD] pl-8 pr-3 text-xs text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
              />
            </div>

            <div className="flex rounded-lg bg-[#FAF0F4] p-0.5 dark:bg-[#251C21]">
              {(
                [
                  ['all', 'Tất cả'],
                  ['learning', 'Đang học'],
                  ['mastered', 'Đã thuộc'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVocabFilter(id)}
                  aria-pressed={vocabFilter === id}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    vocabFilter === id
                      ? 'bg-white text-[#8F0E39] shadow-xs dark:bg-[#1C1519] dark:text-[#F5A3BF]'
                      : 'text-[#614D56] dark:text-[#B5A2AB]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Add Vocabulary Form */}
        <form
          onSubmit={handleCreateVocab}
          className="grid grid-cols-1 gap-2.5 rounded-xl border border-[#EFE0E6] bg-[#FCF7F9] p-3.5 sm:grid-cols-[1fr_1fr_1.2fr_auto] dark:border-[#32242B] dark:bg-[#231B1F]"
        >
          <div>
            <label htmlFor="new-vocab-phrase" className="sr-only">
              Cụm từ tiếng Anh
            </label>
            <input
              id="new-vocab-phrase"
              type="text"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              placeholder="Cụm từ / Collocation tiếng Anh..."
              className="h-10 w-full rounded-lg border border-[#E5CFD7] bg-white px-3 text-xs text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
            />
          </div>
          <div>
            <label htmlFor="new-vocab-meaning" className="sr-only">
              Nghĩa tiếng Việt
            </label>
            <input
              id="new-vocab-meaning"
              type="text"
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              placeholder="Nghĩa tiếng Việt..."
              className="h-10 w-full rounded-lg border border-[#E5CFD7] bg-white px-3 text-xs text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
            />
          </div>
          <div>
            <label htmlFor="new-vocab-example" className="sr-only">
              Câu ví dụ (không bắt buộc)
            </label>
            <input
              id="new-vocab-example"
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Câu ví dụ (không bắt buộc)..."
              className="h-10 w-full rounded-lg border border-[#E5CFD7] bg-white px-3 text-xs text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#9D0B3A] px-4 text-xs font-semibold text-white hover:bg-[#820930] dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Thêm từ</span>
          </button>
          {vocabError && (
            <p className="sm:col-span-4 text-xs text-rose-700 dark:text-rose-300">
              {vocabError}
            </p>
          )}
        </form>

        {/* Vocab List */}
        {filteredVocab.length === 0 ? (
          <p className="text-sm text-[#735D67] dark:text-[#AA96A0]">
            {vocab.length === 0
              ? 'Sổ từ vựng đang trống. Hãy lưu collocation từ Bài mẫu Band 9, Debate Arena hoặc thêm thủ công ở trên.'
              : 'Không tìm thấy cụm từ nào khớp bộ lọc hiện tại.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#F2E2E8] dark:divide-[#2D2127]">
            {filteredVocab.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                      {item.phrase}
                    </span>
                    <span aria-hidden="true" className="text-[#C8B2BC]">
                      —
                    </span>
                    <span className="text-sm text-[#24171D] dark:text-[#F0E6EA]">
                      {item.vietnamese_meaning}
                    </span>
                  </div>
                  {item.example_sentence && (
                    <p className="text-xs leading-relaxed text-[#614D56] dark:text-[#B5A2AB]">
                      {item.example_sentence}
                    </p>
                  )}
                  <div className="text-[11px] text-[#8A737D] dark:text-[#8E7C85]">
                    {item.source_topic ? `Nguồn: ${item.source_topic}` : 'Sổ từ cá nhân'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleVocabMastered(item.id)}
                    aria-label={
                      item.mastered
                        ? `Đánh dấu chưa thuộc cụm từ ${item.phrase}`
                        : `Đánh dấu đã thuộc cụm từ ${item.phrase}`
                    }
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap ${
                      item.mastered
                        ? 'border-[#CBE4D5] bg-[#F2FBF6] text-emerald-800 dark:border-[#244A36] dark:bg-[#14271D] dark:text-emerald-300'
                        : 'border-[#E7D2DA] bg-white text-[#614D56] hover:bg-[#FCF4F7] dark:border-[#3A2B33] dark:bg-[#231B1F] dark:text-[#BBA7B0]'
                    }`}
                  >
                    {item.mastered ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Đã thuộc</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Đang học</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVocab(item.id)}
                    aria-label={`Xóa cụm từ ${item.phrase}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDD8DF] text-[#7A636D] hover:bg-rose-50 hover:text-rose-700 dark:border-[#34262D] dark:text-[#9E8B94] dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
