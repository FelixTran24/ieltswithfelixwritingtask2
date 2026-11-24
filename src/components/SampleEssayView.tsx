import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpenCheck,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  BAND_9_STYLE_PRINCIPLES,
  ESSAY_TYPES,
  getEssayTypeConfig,
} from '../data/essayTypes';
import { apiGenerateSampleEssay } from '../services/api';
import type {
  EssayTypeId,
  SampleEssayResult,
  VocabItem,
} from '../types/ielts';
import { VocabTable } from './VocabTable';

interface SampleEssayViewProps {
  savedVocab: VocabItem[];
  onSaveVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
}

const PARAGRAPH_LABELS = ['Introduction', 'Body 1', 'Body 2', 'Conclusion'];

export function SampleEssayView({
  savedVocab,
  onSaveVocab,
}: SampleEssayViewProps) {
  const [prompt, setPrompt] = useState('');
  const [essayType, setEssayType] = useState<EssayTypeId>('opinion');
  const essayConfig = getEssayTypeConfig(essayType);
  const [selectedStanceId, setSelectedStanceId] = useState<string>(
    essayConfig.stances[0].id
  );
  const [stanceNote, setStanceNote] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<SampleEssayResult | null>(null);
  const [copied, setCopied] = useState(false);

  const activeStance =
    essayConfig.stances.find((s) => s.id === selectedStanceId) ??
    essayConfig.stances[0];

  const handleSelectType = (id: EssayTypeId) => {
    setEssayType(id);
    const nextConfig = getEssayTypeConfig(id);
    setSelectedStanceId(nextConfig.stances[0].id);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (prompt.trim().length < 15) {
      setError('Vui lòng nhập đầy đủ đề bài IELTS Writing Task 2.');
      return;
    }

    setIsGenerating(true);
    setCopied(false);
    try {
      const res = await apiGenerateSampleEssay({
        prompt: prompt.trim(),
        essayType,
        stanceLabel: activeStance.label,
        stanceNote: stanceNote.trim() || undefined,
      });
      setSample(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo bài mẫu Band 9 lúc này.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyEssay = async () => {
    if (!sample) return;
    try {
      await navigator.clipboard.writeText(sample.essay_paragraphs.join('\n\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#24171D] dark:text-[#F6EEF1] sm:text-3xl [text-wrap:balance]">
          Bài mẫu phong cách Band 9
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[#614D56] dark:text-[#B8A5AE]">
          Tạo bài viết 4 đoạn (290–340 từ) học hành văn từ bộ 6 bài mẫu Band 9 tham chiếu, giữ lập luận gãy gọn, cơ chế rõ và không bịa số liệu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Form */}
        <form
          onSubmit={handleGenerate}
          className="space-y-5 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]"
        >
          <div>
            <label
              htmlFor="sample-prompt"
              className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]"
            >
              Đề bài (Task 2 Prompt)
            </label>
            <textarea
              id="sample-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập đề bài bạn muốn tạo bài mẫu tham khảo..."
              className="mt-2 w-full rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2.5 text-sm leading-relaxed text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
            />
          </div>

          {/* Essay Type */}
          <div>
            <span className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
              Chọn dạng đề
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ESSAY_TYPES.map((type) => {
                const active = essayType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleSelectType(type.id)}
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

          {/* Stance */}
          <div>
            <span className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
              Chọn lập trường (Stance)
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {essayConfig.stances.map((stance) => {
                const selected = activeStance.id === stance.id;
                return (
                  <button
                    key={stance.id}
                    type="button"
                    onClick={() => setSelectedStanceId(stance.id)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                      selected
                        ? 'border-[#9D0B3A] bg-[#FFF5F8] dark:border-[#F5A3BF] dark:bg-[#291C23]'
                        : 'border-[#EDD8DF] bg-[#FFFDFD] hover:bg-[#FCF7F9] dark:border-[#34262D] dark:bg-[#171115]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                      {stance.label}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#614D56] dark:text-[#B5A2AB]">
                      {stance.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300"
                aria-hidden="true"
              />
              <span>{activeStance.riskWarning}</span>
            </div>
          </div>

          {/* Optional custom stance note */}
          <div>
            <label
              htmlFor="sample-stance-note"
              className="block text-xs font-semibold text-[#614D56] dark:text-[#B8A5AE]"
            >
              Ghi chú ý tưởng riêng muốn đưa vào (không bắt buộc)
            </label>
            <input
              id="sample-stance-note"
              type="text"
              value={stanceNote}
              onChange={(e) => setStanceNote(e.target.value)}
              placeholder="Ví dụ: Tập trung vào chi phí sinh hoạt và tác động dài hạn tới thị trường lao động..."
              className="mt-1.5 w-full min-h-[40px] rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2 text-sm text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
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
              Chỉ học ngôn ngữ từ file mẫu Band 9, không lấy văn phong từ bài người dùng.
            </span>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9D0B3A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820930] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Đang viết bài mẫu Band 9...</span>
                </>
              ) : (
                <>
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Tạo bài mẫu Band 9</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Sample Essay Result */}
      {sample && (
        <section
          aria-label="Kết quả bài mẫu Band 9"
          className="space-y-6 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-7 dark:border-[#34262D] dark:bg-[#1C1519]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E2E8] pb-4 dark:border-[#2F2329]">
            <div>
              <h2 className="text-lg font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                Bài mẫu tham khảo (4 đoạn)
              </h2>
              <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0] tabular-nums">
                Độ dài: <strong className="font-mono text-[#8F0E39] dark:text-[#F5A3BF]">{sample.word_count} từ</strong> · Dạng {essayConfig.name} · Lập trường: {activeStance.label}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyEssay}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6C7D2] bg-[#FDF5F8] px-3.5 text-xs font-medium text-[#8F0E39] hover:bg-[#F9E3EC] dark:border-[#49323D] dark:bg-[#2A1D24] dark:text-[#F5A3BF]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sao chép bài</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-5">
            {sample.essay_paragraphs.map((para, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[11px] font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                  {PARAGRAPH_LABELS[idx] ?? `Đoạn ${idx + 1}`}
                </div>
                <p className="text-[15px] leading-[1.85] text-[#24171D] dark:text-[#F0E6EA]">
                  {para}
                </p>
              </div>
            ))}
          </div>

          {sample.style_notes.length > 0 && (
            <div className="rounded-xl border border-[#EFE0E6] bg-[#FCF7F9] p-4 dark:border-[#32242B] dark:bg-[#231B1F]">
              <h3 className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                Phân tích kỹ thuật hành văn &amp; liên kết trong bài
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#4E3B44] dark:text-[#D4C2CA]">
                {sample.style_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <VocabTable
            items={sample.vocabulary}
            savedVocab={savedVocab}
            sourceTopic={prompt.slice(0, 70)}
            onSaveVocab={onSaveVocab}
          />
        </section>
      )}
    </div>
  );
}
