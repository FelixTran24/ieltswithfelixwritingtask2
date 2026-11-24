import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  CheckSquare,
  ChevronRight,
  Info,
  Loader2,
  ScanSearch,
  Square,
} from 'lucide-react';
import {
  ESSAY_TYPES,
  SAMPLE_DEMO_ESSAY,
  getEssayTypeConfig,
} from '../data/essayTypes';
import {
  apiDetectEssayType,
  apiGenerateSampleEssay,
  apiGradeEssay,
} from '../services/api';
import type {
  CriterionCode,
  DetectedTypeResult,
  EssayTypeId,
  EssayTypeSelection,
  GradingHistoryEntry,
  GradingResult,
  SampleEssayResult,
  TeacherScores,
  VocabItem,
} from '../types/ielts';
import {
  computeScoreDeltas,
  computeTeacherOverallBand,
  countWords,
  formatBand,
  formatDelta,
} from '../utils/scoring';
import { EssayDiffViewer } from './EssayDiffViewer';
import { VocabTable } from './VocabTable';

interface GradeViewProps {
  activeEntry: GradingHistoryEntry | null;
  savedVocab: VocabItem[];
  onSaveGradingEntry: (entry: GradingHistoryEntry) => void;
  onUpdateTeacherScores: (id: string, scores: TeacherScores) => void;
  onAttachSampleEssay: (id: string, sample: SampleEssayResult) => void;
  onSaveVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
}

const CRITERION_META: Record<
  CriterionCode,
  { name: string; scoreKey: keyof GradingResult['scores'] }
> = {
  TR: { name: 'Task Response', scoreKey: 'task_response' },
  CC: { name: 'Coherence & Cohesion', scoreKey: 'coherence_cohesion' },
  LR: { name: 'Lexical Resource', scoreKey: 'lexical_resource' },
  GRA: {
    name: 'Grammatical Range & Accuracy',
    scoreKey: 'grammatical_range_accuracy',
  },
};

const EMPTY_TEACHER_SCORES: TeacherScores = {
  task_response: null,
  coherence_cohesion: null,
  lexical_resource: null,
  grammatical_range_accuracy: null,
};

export function GradeView({
  activeEntry,
  savedVocab,
  onSaveGradingEntry,
  onUpdateTeacherScores,
  onAttachSampleEssay,
  onSaveVocab,
}: GradeViewProps) {
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [selectedType, setSelectedType] = useState<EssayTypeSelection>('auto');
  const [detectedType, setDetectedType] = useState<DetectedTypeResult | null>(
    null
  );
  const [checkedChecklist, setCheckedChecklist] = useState<
    Record<string, boolean>
  >({});

  const [isDetecting, setIsDetecting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [gradedEssayText, setGradedEssayText] = useState('');
  const [gradedPromptText, setGradedPromptText] = useState('');
  const [gradedEssayType, setGradedEssayType] =
    useState<EssayTypeId>('opinion');

  const [activeCriterionTab, setActiveCriterionTab] =
    useState<CriterionCode>('TR');
  const [teacherScores, setTeacherScores] =
    useState<TeacherScores>(EMPTY_TEACHER_SCORES);
  const [teacherSavedNotice, setTeacherSavedNotice] = useState(false);
  const [sampleEssay, setSampleEssay] = useState<SampleEssayResult | null>(
    null
  );

  // Hydrate when user opens an entry from History
  useEffect(() => {
    if (!activeEntry) return;
    setPrompt(activeEntry.prompt);
    setEssay(activeEntry.essay);
    setSelectedType(activeEntry.essay_type);
    setCurrentEntryId(activeEntry.id);
    setResult(activeEntry.result);
    setGradedEssayText(activeEntry.essay);
    setGradedPromptText(activeEntry.prompt);
    setGradedEssayType(activeEntry.essay_type);
    setTeacherScores(activeEntry.teacher_scores ?? EMPTY_TEACHER_SCORES);
    setSampleEssay(activeEntry.sample_essay ?? null);
    setError(null);
  }, [activeEntry]);

  const wordCount = countWords(essay);

  const effectiveChecklistType: EssayTypeId =
    selectedType !== 'auto'
      ? selectedType
      : detectedType?.essay_type ?? result?.detected_essay_type ?? 'opinion';
  const checklistConfig = getEssayTypeConfig(effectiveChecklistType);

  const handleLoadDemo = () => {
    setPrompt(SAMPLE_DEMO_ESSAY.prompt);
    setEssay(SAMPLE_DEMO_ESSAY.essay);
    setSelectedType(SAMPLE_DEMO_ESSAY.essay_type);
    setDetectedType(null);
    setError(null);
  };

  const handleDetectType = async () => {
    setError(null);
    if (prompt.trim().length < 15) {
      setError('Vui lòng nhập đầy đủ đề bài trước khi để AI nhận diện dạng đề.');
      return;
    }
    setIsDetecting(true);
    try {
      const detected = await apiDetectEssayType(prompt.trim());
      setDetectedType(detected);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể nhận diện dạng đề lúc này.'
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConfirmDetectedType = (typeId: EssayTypeId) => {
    setSelectedType(typeId);
    setDetectedType(null);
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPrompt = prompt.trim();
    const cleanEssay = essay.trim();

    if (cleanPrompt.length < 15) {
      setError('Vui lòng dán nguyên văn đề bài (ít nhất 15 ký tự).');
      return;
    }
    if (countWords(cleanEssay) < 25) {
      setError(
        'Bài viết cần ít nhất 25 từ để chấm theo band descriptors IELTS Writing Task 2.'
      );
      return;
    }

    setIsGrading(true);
    setSampleEssay(null);
    setTeacherScores(EMPTY_TEACHER_SCORES);
    setTeacherSavedNotice(false);

    try {
      const graded = await apiGradeEssay({
        prompt: cleanPrompt,
        essay: cleanEssay,
        essayType: selectedType,
      });

      const resolvedType: EssayTypeId =
        selectedType !== 'auto' ? selectedType : graded.detected_essay_type;

      const entryId = `grade-${Date.now()}`;
      const newEntry: GradingHistoryEntry = {
        id: entryId,
        created_at: new Date().toISOString(),
        prompt: cleanPrompt,
        essay: cleanEssay,
        word_count: countWords(cleanEssay),
        essay_type: resolvedType,
        result: graded,
      };

      setCurrentEntryId(entryId);
      setResult(graded);
      setGradedEssayText(cleanEssay);
      setGradedPromptText(cleanPrompt);
      setGradedEssayType(resolvedType);
      setActiveCriterionTab('TR');
      onSaveGradingEntry(newEntry);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi chấm bài. Vui lòng thử lại.'
      );
    } finally {
      setIsGrading(false);
    }
  };

  const handleTeacherScoreChange = (
    key: keyof TeacherScores,
    rawValue: string
  ) => {
    setTeacherSavedNotice(false);
    const trimmed = rawValue.trim();
    if (trimmed === '') {
      const next = { ...teacherScores, [key]: null };
      setTeacherScores(next);
      if (currentEntryId) onUpdateTeacherScores(currentEntryId, next);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(9, parsed));
    const next = { ...teacherScores, [key]: clamped };
    setTeacherScores(next);
    if (currentEntryId) {
      onUpdateTeacherScores(currentEntryId, next);
      setTeacherSavedNotice(true);
    }
  };

  const handleGenerateSample = async () => {
    if (!gradedPromptText) return;
    setError(null);
    setIsGeneratingSample(true);
    try {
      const generated = await apiGenerateSampleEssay({
        prompt: gradedPromptText,
        essayType: gradedEssayType,
      });
      setSampleEssay(generated);
      if (currentEntryId) {
        onAttachSampleEssay(currentEntryId, generated);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo bài mẫu Band 9 lúc này.'
      );
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const teacherOverall = computeTeacherOverallBand(teacherScores);
  const deltas = result
    ? computeScoreDeltas(result.scores, teacherScores)
    : null;

  const activeCriterionDetail = result?.criteria_analysis.find(
    (c) => c.criterion === activeCriterionTab
  );

  return (
    <div className="space-y-8">
      {/* Page Intro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#24171D] dark:text-[#F6EEF1] sm:text-3xl [text-wrap:balance]">
            Chấm bài IELTS Writing Task 2
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#614D56] dark:text-[#B8A5AE]">
            Chấm theo band descriptors đã hiệu chỉnh cùng dữ liệu thực tế và bài mẫu Band 9. Điểm số là ước lượng tham khảo, không phải điểm thi chính thức.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E6C7D2] bg-white px-4 text-xs font-medium text-[#8F0E39] transition-colors hover:bg-[#FDF2F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#49323D] dark:bg-[#1E171B] dark:text-[#F5A3BF] dark:hover:bg-[#2A1F25] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          Nạp bài mẫu thử nghiệm
        </button>
      </div>


      {/* Main Input Grid */}
      <form onSubmit={handleGrade} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-5 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
          {/* Prompt Field */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="grade-prompt"
                className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1] whitespace-nowrap"
              >
                Đề bài Task 2
              </label>
              <button
                type="button"
                onClick={handleDetectType}
                disabled={isDetecting || prompt.trim().length < 15}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E9C9D5] bg-[#FDF2F6] px-3 text-xs font-medium text-[#8F0E39] transition-colors hover:bg-[#F9E3EC] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#4F323F] dark:bg-[#2B1D24] dark:text-[#F5A3BF] whitespace-nowrap"
              >
                {isDetecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>AI nhận diện dạng đề</span>
              </button>
            </div>
            <textarea
              id="grade-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Dán nguyên văn đề bài IELTS Writing Task 2 bằng tiếng Anh..."
              className="mt-2 w-full rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2.5 text-sm leading-relaxed text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1] dark:placeholder:text-[#78656E] dark:focus:border-[#F5A3BF]"
            />

            {/* Inline AI Type Confirmation Box */}
            {detectedType && (
              <div className="mt-3 rounded-xl border border-[#E5B8C8] bg-[#FFF5F8] p-3.5 text-xs dark:border-[#5D3949] dark:bg-[#281C22]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                    AI nhận diện: {getEssayTypeConfig(detectedType.essay_type).name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleConfirmDetectedType(detectedType.essay_type)
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#9D0B3A] px-3 font-medium text-white hover:bg-[#820930] dark:bg-[#D95B86] dark:text-[#140F12] dark:hover:bg-[#E7739B]"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Xác nhận dạng này</span>
                  </button>
                </div>
                <p className="mt-1.5 leading-relaxed text-[#4E3B44] dark:text-[#D5C3CB]">
                  {detectedType.reason}
                </p>
              </div>
            )}
          </div>

          {/* Essay Type Selector */}
          <div>
            <span className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
              Dạng đề
            </span>
            <div
              role="group"
              aria-label="Chọn dạng đề IELTS Task 2"
              className="mt-2 flex flex-wrap gap-2"
            >
              <button
                type="button"
                onClick={() => setSelectedType('auto')}
                aria-pressed={selectedType === 'auto'}
                className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                  selectedType === 'auto'
                    ? 'border-[#9D0B3A] bg-[#9D0B3A] text-white dark:border-[#F5A3BF] dark:bg-[#F5A3BF] dark:text-[#1A1014]'
                    : 'border-[#E7D2DA] bg-[#FCF7F9] text-[#523E47] hover:bg-[#F8EAEF] dark:border-[#3A2B33] dark:bg-[#231B1F] dark:text-[#CBB8C1] dark:hover:bg-[#2E2329]'
                }`}
              >
                Để AI nhận diện
              </button>
              {ESSAY_TYPES.map((type) => {
                const active = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(type.id);
                      setDetectedType(null);
                    }}
                    aria-pressed={active}
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                      active
                        ? 'border-[#9D0B3A] bg-[#9D0B3A] text-white dark:border-[#F5A3BF] dark:bg-[#F5A3BF] dark:text-[#1A1014]'
                        : 'border-[#E7D2DA] bg-[#FCF7F9] text-[#523E47] hover:bg-[#F8EAEF] dark:border-[#3A2B33] dark:bg-[#231B1F] dark:text-[#CBB8C1] dark:hover:bg-[#2E2329]'
                    }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Essay Field */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="grade-essay"
                className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]"
              >
                Bài viết của bạn
              </label>
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span
                  data-testid="essay-word-count"
                  className={`font-mono font-semibold ${
                    wordCount > 0 && wordCount < 250
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-[#6B545E] dark:text-[#BBA7B0]'
                  }`}
                >
                  {wordCount} từ
                </span>
                <span aria-hidden="true" className="text-[#C8B2BC]">
                  ·
                </span>
                <span className="text-[#7A636D] dark:text-[#9E8B94]">
                  {wordCount === 0
                    ? 'Khuyến nghị tối thiểu 250 từ'
                    : wordCount < 250
                      ? 'Dưới 250 từ (có thể bị hạn chế TR)'
                      : 'Đạt độ dài tiêu chuẩn'}
                </span>
              </div>
            </div>

            <textarea
              id="grade-essay"
              rows={11}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Nhập hoặc dán bài viết IELTS Writing Task 2 của bạn tại đây..."
              className="mt-2 w-full rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-3 text-[15px] leading-relaxed text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1] dark:placeholder:text-[#78656E] dark:focus:border-[#F5A3BF]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-[#735D67] dark:text-[#AA96A0]">
              Kết quả gồm 4 điểm nguyên, phân tích 4 tiêu chí và chỉnh sửa trực quan.
            </span>
            <button
              type="submit"
              disabled={isGrading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9D0B3A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820930] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] focus-visible:ring-offset-2 dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
            >
              {isGrading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Đang chấm bài theo chuẩn giám khảo...</span>
                </>
              ) : (
                <span>Chấm bài ngay</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Task Response Checklist for Selected Essay Type */}
        <aside
          aria-label="Checklist Task Response theo dạng đề"
          className="rounded-2xl border border-[#EDD8DF] bg-white p-5 dark:border-[#34262D] dark:bg-[#1C1519]"
        >
          <div className="text-xs font-medium text-[#8F0E39] dark:text-[#F5A3BF]">
            Checklist Task Response
          </div>
          <h2 className="mt-1 text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            {checklistConfig.name}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#6B545E] dark:text-[#AA96A0]">
            Dấu hiệu nhận biết: {checklistConfig.signals}
          </p>

          <ul className="mt-4 space-y-2.5">
            {checklistConfig.checklist.map((item, idx) => {
              const key = `${checklistConfig.id}-${idx}`;
              const checked = Boolean(checkedChecklist[key]);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedChecklist((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    aria-pressed={checked}
                    className="flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left text-xs leading-relaxed transition-colors hover:bg-[#FCF4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:hover:bg-[#251D22]"
                  >
                    {checked ? (
                      <CheckSquare
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#9D0B3A] dark:text-[#F5A3BF]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Square
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#B39AA5] dark:text-[#7A6770]"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={
                        checked
                          ? 'line-through text-[#8D7680] dark:text-[#86737C]'
                          : 'text-[#35242C] dark:text-[#E2D5DA]'
                      }
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </form>

      {/* GRADING RESULTS */}
      {result && (
        <div className="space-y-8 border-t border-[#EDD8DF] pt-8 dark:border-[#34262D]">
          {/* Scores Header + 4 Integer Cards + Overall Card */}
          <section aria-label="Bảng điểm ước lượng" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Kết quả đánh giá ước lượng
              </h2>
              <span className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
                Dạng đề áp dụng: {getEssayTypeConfig(gradedEssayType).name} · Không phải điểm thi chính thức
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {/* Overall Card */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-1 rounded-2xl border border-[#DFB0C0] bg-[#FDF2F6] p-5 dark:border-[#5D3949] dark:bg-[#2A1C23]">
                <div className="text-xs font-medium text-[#8F0E39] dark:text-[#F5A3BF]">
                  Điểm tổng ước lượng
                </div>
                <div
                  data-testid="overall-band-score"
                  className="mt-2 font-mono text-4xl font-bold tracking-tight text-[#8F0E39] dark:text-[#FAD0DF] tabular-nums"
                >
                  {formatBand(result.overall_band)}
                </div>
                <div className="mt-1 text-xs text-[#6B545E] dark:text-[#C5B1BA]">
                  Làm tròn nửa band gần nhất
                </div>
              </div>

              {(Object.keys(CRITERION_META) as CriterionCode[]).map((code) => {
                const meta = CRITERION_META[code];
                const scoreVal = result.scores[meta.scoreKey];
                return (
                  <div
                    key={code}
                    className="rounded-2xl border border-[#EDD8DF] bg-white p-5 dark:border-[#34262D] dark:bg-[#1C1519]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#735D67] dark:text-[#AA96A0]">
                      <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                        {code}
                      </span>
                      <span>Số nguyên</span>
                    </div>
                    <div className="mt-2 font-mono text-3xl font-bold text-[#24171D] dark:text-[#F6EEF1] tabular-nums">
                      {scoreVal}
                    </div>
                    <div className="mt-1 text-xs text-[#614D56] dark:text-[#B5A2AB] truncate">
                      {meta.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confidence Note + Mandatory 1-Band Variance Reminder */}
            <div className="rounded-xl border border-[#EDD8DF] bg-[#FCF7F9] p-4 text-sm dark:border-[#34262D] dark:bg-[#1C1519]">
              <div className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                Độ chắc chắn của điểm số
              </div>
              <p className="mt-1 leading-relaxed text-[#2E1E25] dark:text-[#EAE0E4]">
                {result.confidence_note}
              </p>
              <p className="mt-1.5 text-xs text-[#735D67] dark:text-[#AA96A0]">
                Lưu ý: Điểm AI chỉ mang tính ước lượng theo band descriptors, có thể lệch 1 band so với giám khảo thật và không phải điểm chính thức.
              </p>
            </div>
          </section>

          {/* Per-Criterion Breakdown (Strengths / Weaknesses / Fixes) */}
          {result.criteria_analysis.length > 0 && (
            <section
              aria-label="Phân tích chi tiết từng tiêu chí"
              className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                  Phân tích chi tiết 4 tiêu chí
                </h3>
                <div
                  role="tablist"
                  aria-label="Chọn tiêu chí phân tích"
                  className="flex flex-wrap gap-1.5 rounded-xl bg-[#F9EEF2] p-1 dark:bg-[#251C21]"
                >
                  {(['TR', 'CC', 'LR', 'GRA'] as CriterionCode[]).map((code) => {
                    const active = activeCriterionTab === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveCriterionTab(code)}
                        className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                          active
                            ? 'bg-white text-[#8F0E39] shadow-xs dark:bg-[#1C1519] dark:text-[#F5A3BF]'
                            : 'text-[#614D56] hover:text-[#24171D] dark:text-[#B5A2AB] dark:hover:text-[#F6EEF1]'
                        }`}
                      >
                        {code} ({result.scores[CRITERION_META[code].scoreKey]})
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeCriterionDetail && (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Điểm mạnh ({activeCriterionTab})
                    </h4>
                    <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-[#2E1E25] dark:text-[#E9DDE2]">
                      {activeCriterionDetail.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      Điểm yếu ({activeCriterionTab})
                    </h4>
                    <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-[#2E1E25] dark:text-[#E9DDE2]">
                      {activeCriterionDetail.weaknesses.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                      Điều cần sửa ({activeCriterionTab})
                    </h4>
                    <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-[#2E1E25] dark:text-[#E9DDE2]">
                      {activeCriterionDetail.fixes.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Idea Critique (TR, CC) & Language Notes (LR, GRA) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Idea Critique */}
            <section
              aria-label="Phản biện ý tưởng TR và CC"
              className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
            >
              <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Phản biện ý tưởng (TR &amp; CC)
              </h3>
              <p className="mt-1 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                Gắn đúng mức descriptor của từng lỗi và tách rõ lỗi trừ điểm với ghi chú coaching.
              </p>

              <ul className="mt-4 divide-y divide-[#F2E2E8] dark:divide-[#2D2127]">
                {result.idea_critique.map((item, idx) => (
                  <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                        {item.criterion}
                      </span>
                      <span aria-hidden="true" className="text-[#C8B2BC]">
                        ·
                      </span>
                      <span className="font-mono font-medium text-[#35242C] dark:text-[#E2D5DA] tabular-nums">
                        Mức Band {item.maps_to_band}
                      </span>
                      <span aria-hidden="true" className="text-[#C8B2BC]">
                        ·
                      </span>
                      <span
                        className={
                          item.deducted
                            ? 'font-semibold text-rose-700 dark:text-rose-300'
                            : 'font-medium text-[#6B545E] dark:text-[#BBA7B0]'
                        }
                      >
                        {item.deducted ? 'Có trừ điểm' : 'Chỉ ghi chú'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#24171D] dark:text-[#EFE4E8]">
                      {item.point}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Language Notes */}
            <section
              aria-label="Ghi chú ngôn ngữ LR và GRA"
              className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
            >
              <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Ghi chú ngôn ngữ (LR &amp; GRA)
              </h3>
              <p className="mt-1 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                Chỉ trừ điểm lỗi hệ thống (cùng một loại lỗi lặp lại) hoặc lỗi cản trở hiểu nghĩa.
              </p>

              <ul className="mt-4 divide-y divide-[#F2E2E8] dark:divide-[#2D2127]">
                {result.language_notes.map((item, idx) => (
                  <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                        {item.criterion}
                      </span>
                      <span aria-hidden="true" className="text-[#C8B2BC]">
                        ·
                      </span>
                      <span
                        className={
                          item.systematic
                            ? 'font-semibold text-rose-700 dark:text-rose-300'
                            : 'font-medium text-[#6B545E] dark:text-[#BBA7B0]'
                        }
                      >
                        {item.systematic ? 'Lỗi hệ thống' : 'Minor'}
                      </span>
                      <span aria-hidden="true" className="text-[#C8B2BC]">
                        ·
                      </span>
                      <span
                        className={
                          item.deducted
                            ? 'font-semibold text-rose-700 dark:text-rose-300'
                            : 'text-[#6B545E] dark:text-[#AA96A0]'
                        }
                      >
                        {item.deducted ? 'Có trừ điểm' : 'Không trừ điểm'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#24171D] dark:text-[#EFE4E8]">
                      {item.note}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Strengths + Gap to Next Band + Coach Questions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-[#EDD8DF] bg-white p-5 dark:border-[#34262D] dark:bg-[#1C1519]">
              <h3 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Điểm mạnh nổi bật
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#2E1E25] dark:text-[#E9DDE2]">
                {result.strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[#EDD8DF] bg-white p-5 dark:border-[#34262D] dark:bg-[#1C1519]">
              <h3 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Khoảng cách tới band kế tiếp
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#2E1E25] dark:text-[#E9DDE2]">
                {result.gap_to_next_band.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[#E5B8C8] bg-[#FFF5F8] p-5 dark:border-[#533342] dark:bg-[#251A20]">
              <h3 className="text-sm font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                Câu hỏi của Coach (tối đa 2 câu)
              </h3>
              <ol className="mt-3 list-decimal space-y-2.5 pl-4 text-sm leading-relaxed text-[#24171D] dark:text-[#F0E6EA]">
                {result.coach_questions.slice(0, 2).map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ol>
            </section>
          </div>

          {/* Interactive Visual Essay Diff & Inline Comments */}
          <EssayDiffViewer essay={gradedEssayText} edits={result.edits} />

          {/* Teacher Score Calibration Input */}
          <section
            aria-label="Nhập điểm giáo viên để so lệch"
            className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                  Đối chiếu điểm giáo viên (không bắt buộc)
                </h3>
                <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                  Nhập số nguyên 0–9 từ giáo viên hoặc giám khảo để tính độ lệch (AI − Giáo viên) và lưu tự động vào lịch sử.
                </p>
              </div>
              {teacherSavedNotice && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Đã lưu đối chiếu vào lịch sử
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(Object.keys(CRITERION_META) as CriterionCode[]).map((code) => {
                const key = CRITERION_META[code].scoreKey;
                const val = teacherScores[key];
                const delta = deltas ? deltas[key] : null;
                return (
                  <div
                    key={code}
                    className="rounded-xl border border-[#EFE0E6] bg-[#FCF7F9] p-3.5 dark:border-[#32242B] dark:bg-[#231B1F]"
                  >
                    <label
                      htmlFor={`teacher-${code}`}
                      className="block text-xs font-semibold text-[#614D56] dark:text-[#C5B1BA]"
                    >
                      Giáo viên {code}
                    </label>
                    <input
                      id={`teacher-${code}`}
                      type="number"
                      min={0}
                      max={9}
                      step={1}
                      value={val ?? ''}
                      onChange={(e) =>
                        handleTeacherScoreChange(key, e.target.value)
                      }
                      placeholder="0-9"
                      className="mt-1.5 w-full rounded-lg border border-[#E5CFD7] bg-white px-2.5 py-1.5 font-mono text-base font-semibold text-[#24171D] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3E2E36] dark:bg-[#140F12] dark:text-[#F6EEF1] tabular-nums"
                    />
                    <div className="mt-1.5 text-xs text-[#6B545E] dark:text-[#AA96A0] tabular-nums">
                      Lệch:{' '}
                      <span
                        className={`font-mono font-semibold ${
                          delta === null
                            ? ''
                            : delta === 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-[#8F0E39] dark:text-[#F5A3BF]'
                        }`}
                      >
                        {formatDelta(delta)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Teacher Overall Summary */}
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#DFB0C0] bg-[#FDF2F6] p-3.5 dark:border-[#533342] dark:bg-[#291C23]">
                <div className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                  Tổng giáo viên
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-[#8F0E39] dark:text-[#FAD0DF] tabular-nums">
                  {teacherOverall !== null ? formatBand(teacherOverall) : '—'}
                </div>
                <div className="mt-1 text-xs text-[#6B545E] dark:text-[#C5B1BA] tabular-nums">
                  Lệch tổng:{' '}
                  <span className="font-mono font-semibold">
                    {formatDelta(deltas?.overall ?? null)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* On-Demand Band 9 Sample Essay Section */}
          <section
            aria-label="Tạo bài mẫu Band 9"
            className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                  Bài mẫu tham khảo phong cách Band 9
                </h3>
                <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                  Chỉ khởi chạy khi bạn bấm nút. 4 đoạn (~290–340 từ), học hành văn từ bộ bài mẫu Band 9 chuẩn kèm bảng từ vựng.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateSample}
                disabled={isGeneratingSample}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[#9D0B3A] bg-[#FDF2F6] px-4 py-2 text-xs font-semibold text-[#8F0E39] transition-colors hover:bg-[#F9E3EC] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#F5A3BF] dark:bg-[#2B1D24] dark:text-[#F5A3BF] dark:hover:bg-[#38252E] whitespace-nowrap shrink-0"
              >
                {isGeneratingSample ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Đang viết bài mẫu Band 9...</span>
                  </>
                ) : (
                  <>
                    <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {sampleEssay
                        ? 'Tạo lại bài mẫu band 9'
                        : 'Tạo bài mẫu band 9'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {sampleEssay && (
              <div className="mt-6 space-y-6 border-t border-[#F2E2E8] pt-5 dark:border-[#2F2329]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                  <span>Cấu trúc 4 đoạn chuẩn Band 9</span>
                  <span className="font-mono font-semibold text-[#8F0E39] dark:text-[#F5A3BF] tabular-nums">
                    {sampleEssay.word_count} từ
                  </span>
                </div>

                <div className="space-y-4 text-[15px] leading-[1.85] text-[#24171D] dark:text-[#F0E6EA]">
                  {sampleEssay.essay_paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                {sampleEssay.style_notes.length > 0 && (
                  <div className="rounded-xl border border-[#EFE0E6] bg-[#FCF7F9] p-4 dark:border-[#32242B] dark:bg-[#231B1F]">
                    <div className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                      Ghi chú hành văn &amp; liên kết đã áp dụng
                    </div>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#4E3B44] dark:text-[#D4C2CA]">
                      {sampleEssay.style_notes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <VocabTable
                  items={sampleEssay.vocabulary}
                  savedVocab={savedVocab}
                  sourceTopic={gradedPromptText.slice(0, 70)}
                  onSaveVocab={onSaveVocab}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
