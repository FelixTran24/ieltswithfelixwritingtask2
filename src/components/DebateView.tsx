import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  ESSAY_TYPES,
  SAMPLE_DEBATE_PROMPT,
  getEssayTypeConfig,
} from '../data/essayTypes';
import {
  apiDebateTurn,
  apiFinalizeDebate,
  apiGenerateThreeStepOutline,
} from '../services/api';
import type {
  DebateMessage,
  EssayTypeId,
  FinalOutline,
  ThreeStepOutlineResult,
  VocabItem,
} from '../types/ielts';
import { OutlineResultCard } from './OutlineResultCard';

interface DebateViewProps {
  savedVocab: VocabItem[];
  onSaveVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
}

type DebateMode = 'debate' | 'ai_outline';

export function DebateView({ savedVocab, onSaveVocab }: DebateViewProps) {
  const [mode, setMode] = useState<DebateMode>('debate');
  const [prompt, setPrompt] = useState('');
  const [outline, setOutline] = useState('');
  const [essayType, setEssayType] = useState<EssayTypeId>('opinion');

  // Debate mode state
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizedOutline, setFinalizedOutline] =
    useState<FinalOutline | null>(null);

  // AI 3-step outline state
  const essayConfig = getEssayTypeConfig(essayType);
  const [selectedStanceId, setSelectedStanceId] = useState<string>(
    essayConfig.stances[0].id
  );
  const [isRunning3Step, setIsRunning3Step] = useState(false);
  const [threeStepResult, setThreeStepResult] =
    useState<ThreeStepOutlineResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const activeStance =
    essayConfig.stances.find((s) => s.id === selectedStanceId) ??
    essayConfig.stances[0];

  const handleSelectEssayType = (id: EssayTypeId) => {
    setEssayType(id);
    const nextConfig = getEssayTypeConfig(id);
    setSelectedStanceId(nextConfig.stances[0].id);
  };

  const handleLoadDemo = () => {
    setPrompt(SAMPLE_DEBATE_PROMPT.prompt);
    setOutline(SAMPLE_DEBATE_PROMPT.outline);
    handleSelectEssayType('opinion');
    setError(null);
  };

  const handleStartDebate = async () => {
    setError(null);
    if (prompt.trim().length < 15) {
      setError('Vui lòng dán nguyên văn đề bài trước khi bắt đầu tranh biện.');
      return;
    }
    if (outline.trim().length < 10) {
      setError(
        'Vui lòng nhập ít nhất 1–2 câu dàn ý hoặc lập trường sơ bộ (tiếng Việt, Anh hoặc trộn) để cựu giám khảo bắt đầu phản biện.'
      );
      return;
    }

    const firstUserMsg: DebateMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: outline.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages([firstUserMsg]);
    setFinalizedOutline(null);
    setIsSendingTurn(true);

    try {
      const reply = await apiDebateTurn({
        prompt: prompt.trim(),
        outline: outline.trim(),
        essayType,
        history: [],
        userMessage: outline.trim(),
      });

      const examinerMsg: DebateMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'examiner',
        content: reply.response,
        focus_flaw: reply.focus_flaw,
        timestamp: new Date().toISOString(),
      };
      setMessages([firstUserMsg, examinerMsg]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể bắt đầu phiên tranh biện.'
      );
      setMessages([]);
    } finally {
      setIsSendingTurn(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const text = replyInput.trim();
    if (!text) return;

    const userMsg: DebateMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setReplyInput('');
    setIsSendingTurn(true);

    try {
      const reply = await apiDebateTurn({
        prompt: prompt.trim(),
        outline: outline.trim(),
        essayType,
        history: messages,
        userMessage: text,
      });

      const examinerMsg: DebateMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'examiner',
        content: reply.response,
        focus_flaw: reply.focus_flaw,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextHistory, examinerMsg]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi khi gửi lượt phản biện.'
      );
    } finally {
      setIsSendingTurn(false);
    }
  };

  const handleFinalizeDebate = async () => {
    setError(null);
    if (prompt.trim().length < 15) {
      setError('Cần có đề bài trước khi chốt dàn ý.');
      return;
    }
    setIsFinalizing(true);
    try {
      const finalResult = await apiFinalizeDebate({
        prompt: prompt.trim(),
        outline: outline.trim(),
        essayType,
        history: messages,
      });
      setFinalizedOutline(finalResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tổng hợp dàn ý cuối.'
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleRunThreeStepOutline = async () => {
    setError(null);
    if (prompt.trim().length < 15) {
      setError('Vui lòng nhập đầy đủ đề bài trước khi chạy quy trình lập dàn ý 3 bước.');
      return;
    }

    setIsRunning3Step(true);
    setThreeStepResult(null);
    try {
      const res = await apiGenerateThreeStepOutline({
        prompt: prompt.trim(),
        outline: outline.trim() || undefined,
        essayType,
        stanceLabel: activeStance.label,
        stanceDescription: activeStance.description,
        riskWarning: activeStance.riskWarning,
      });
      setThreeStepResult(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể chạy quy trình lập dàn ý 3 bước lúc này.'
      );
    } finally {
      setIsRunning3Step(false);
    }
  };

  const handleResetDebate = () => {
    setMessages([]);
    setReplyInput('');
    setFinalizedOutline(null);
    setError(null);
  };

  return (
    <div className="space-y-7">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#24171D] dark:text-[#F6EEF1] sm:text-3xl [text-wrap:balance]">
            Debate Arena
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#614D56] dark:text-[#B8A5AE]">
            Thử lửa ý tưởng với cựu giám khảo khó tính trước khi viết, hoặc chạy quy trình lập dàn ý 3 bước (Nháp &rarr; Phản biện lỗ hổng &rarr; Sửa lại).
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E6C7D2] bg-white px-4 text-xs font-medium text-[#8F0E39] transition-colors hover:bg-[#FDF2F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#49323D] dark:bg-[#1E171B] dark:text-[#F5A3BF] dark:hover:bg-[#2A1F25] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          Nạp ví dụ đề &amp; dàn ý
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div
        role="tablist"
        aria-label="Chọn chế độ Debate Arena"
        className="inline-flex rounded-xl border border-[#EDD8DF] bg-[#FAF0F4] p-1 dark:border-[#3A2B33] dark:bg-[#1B1418]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'debate'}
          onClick={() => {
            setMode('debate');
            setError(null);
          }}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
            mode === 'debate'
              ? 'bg-white text-[#8F0E39] shadow-xs ring-1 ring-[#E8CED7] dark:bg-[#3A2530] dark:text-[#FCE0EA] dark:ring-[#6B4256]'
              : 'text-[#614D56] hover:text-[#24171D] dark:text-[#B5A2AB] dark:hover:text-[#F6EEF1]'
          }`}
        >
          Chế độ Tranh biện
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ai_outline'}
          onClick={() => {
            setMode('ai_outline');
            setError(null);
          }}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
            mode === 'ai_outline'
              ? 'bg-white text-[#8F0E39] shadow-xs ring-1 ring-[#E8CED7] dark:bg-[#3A2530] dark:text-[#FCE0EA] dark:ring-[#6B4256]'
              : 'text-[#614D56] hover:text-[#24171D] dark:text-[#B5A2AB] dark:hover:text-[#F6EEF1]'
          }`}
        >
          AI lập dàn ý (3 bước)
        </button>
      </div>

      {/* Shared Prompt & Outline Input Card */}
      <div className="space-y-4 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
        <div>
          <label
            htmlFor="debate-prompt"
            className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]"
          >
            Đề bài IELTS Writing Task 2
          </label>
          <textarea
            id="debate-prompt"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Dán nguyên văn đề bài..."
            className="mt-2 w-full rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2.5 text-sm leading-relaxed text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1] dark:placeholder:text-[#78656E]"
          />
        </div>

        <div>
          <label
            htmlFor="debate-outline"
            className="block text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]"
          >
            Dàn ý hoặc ý tưởng sơ bộ
          </label>
          <textarea
            id="debate-outline"
            rows={4}
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="Ví dụ: Position + 2 main ideas (mỗi ý 1–2 câu, ý thô cũng được)..."
            className="mt-2 w-full rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2.5 text-sm leading-relaxed text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1] dark:placeholder:text-[#78656E]"
          />
        </div>

        {/* Essay Type Selector */}
        <div>
          <span className="block text-xs font-semibold text-[#614D56] dark:text-[#B8A5AE]">
            Dạng đề áp dụng
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ESSAY_TYPES.map((type) => {
              const active = essayType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleSelectEssayType(type.id)}
                  aria-pressed={active}
                  className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
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

      {/* MODE 1: DEBATE ARENA */}
      {mode === 'debate' && (
        <section aria-label="Phiên tranh biện với cựu giám khảo" className="space-y-6">
          <div className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E2E8] pb-4 dark:border-[#2F2329]">
              <div>
                <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                  Phòng tranh biện với cựu giám khảo
                </h2>
                <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
                  Luật chơi: AI không viết bài mẫu, không đưa dàn ý sẵn; mỗi lượt chỉ xoáy vào 1 lỗ hổng logic với tối đa 2 câu hỏi.
                </p>
              </div>
              {messages.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDebate}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5CFD7] px-3 text-xs font-medium text-[#614D56] hover:bg-[#FCF4F7] dark:border-[#3E2E36] dark:text-[#BBA7B0] dark:hover:bg-[#271E23] whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Làm mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizeDebate}
                    disabled={isFinalizing || isSendingTurn}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#9D0B3A] px-3.5 text-xs font-semibold text-white hover:bg-[#820930] disabled:opacity-60 dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
                  >
                    {isFinalizing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Chốt dàn ý</span>
                  </button>
                </div>
              )}
            </div>

            {messages.length === 0 ? (
              <div className="py-8 text-center space-y-4">
                <p className="mx-auto max-w-md text-sm text-[#614D56] dark:text-[#B8A5AE]">
                  Nhập đề bài và ý tưởng sơ bộ ở trên, sau đó bấm bắt đầu để cựu giám khảo kiểm tra cơ chế lập luận, phạm vi đề và tìm lỗ hổng.
                </p>
                <button
                  type="button"
                  onClick={handleStartDebate}
                  disabled={isSendingTurn}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9D0B3A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820930] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C]"
                >
                  {isSendingTurn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Cựu giám khảo đang đọc dàn ý...</span>
                    </>
                  ) : (
                    <span>Bắt đầu phản biện</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'ml-auto max-w-[90%] border-[#E8CED7] bg-[#FDF5F8] text-[#24171D] dark:border-[#49323D] dark:bg-[#291D23] dark:text-[#F6EEF1]'
                          : 'mr-auto max-w-[94%] border-[#EFE0E6] bg-[#FFFDFD] text-[#24171D] dark:border-[#32242B] dark:bg-[#171115] dark:text-[#EFE4E8]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                          {msg.role === 'user'
                            ? 'Lập luận của bạn'
                            : 'Cựu giám khảo'}
                        </span>
                        {msg.focus_flaw && (
                          <span className="text-[#735D67] dark:text-[#AA96A0]">
                            Trọng tâm: {msg.focus_flaw}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isSendingTurn && (
                    <div className="flex items-center gap-2 text-xs text-[#735D67] dark:text-[#AA96A0] py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true" />
                      <span>Cựu giám khảo đang rà lỗ hổng lập luận...</span>
                    </div>
                  )}
                </div>

                {/* Reply Composer */}
                <form
                  onSubmit={handleSendReply}
                  className="flex flex-col gap-2.5 border-t border-[#F2E2E8] pt-4 sm:flex-row dark:border-[#2F2329]"
                >
                  <label htmlFor="debate-reply" className="sr-only">
                    Trả lời phản biện của cựu giám khảo
                  </label>
                  <input
                    id="debate-reply"
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Bảo vệ luận điểm, bổ sung cơ chế hoặc ví dụ cụ thể..."
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E5CFD7] bg-[#FFFDFD] px-3.5 py-2 text-sm text-[#24171D] placeholder:text-[#9A858F] focus:border-[#9D0B3A] focus:outline-none focus:ring-2 focus:ring-[#9D0B3A]/20 dark:border-[#3B2B33] dark:bg-[#140F12] dark:text-[#F6EEF1]"
                  />
                  <button
                    type="submit"
                    disabled={isSendingTurn || !replyInput.trim()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9D0B3A] px-5 text-sm font-semibold text-white hover:bg-[#820930] disabled:opacity-50 dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Gửi phản hồi</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {finalizedOutline && (
            <OutlineResultCard
              outline={finalizedOutline}
              savedVocab={savedVocab}
              sourceTopic={prompt.slice(0, 70)}
              onSaveVocab={onSaveVocab}
              heading="Dàn ý đã chốt từ các ý trụ vững sau tranh biện"
            />
          )}
        </section>
      )}

      {/* MODE 2: AI 3-STEP OUTLINE */}
      {mode === 'ai_outline' && (
        <section aria-label="AI lập dàn ý 3 bước" className="space-y-6">
          <div className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
            <h2 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
              Chọn lập trường (Stance &amp; Position) cho dạng {essayConfig.name}
            </h2>
            <p className="mt-1 text-xs text-[#6B545E] dark:text-[#AA96A0]">
              Mỗi lựa chọn đi kèm cảnh báo rủi ro riêng về Task Response. Quy trình 3 bước chỉ chạy khi bạn bấm nút bên dưới.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {essayConfig.stances.map((stance) => {
                const selected = activeStance.id === stance.id;
                return (
                  <button
                    key={stance.id}
                    type="button"
                    onClick={() => setSelectedStanceId(stance.id)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                      selected
                        ? 'border-[#9D0B3A] bg-[#FFF5F8] dark:border-[#F5A3BF] dark:bg-[#291C23]'
                        : 'border-[#EDD8DF] bg-[#FFFDFD] hover:bg-[#FCF7F9] dark:border-[#34262D] dark:bg-[#171115] dark:hover:bg-[#221A1E]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                        {stance.label}
                      </span>
                      {selected && (
                        <span className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                          Đang chọn
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5E4A53] dark:text-[#BBA7B0]">
                      {stance.description}
                    </p>
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300"
                        aria-hidden="true"
                      />
                      <span>{stance.riskWarning}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3-Step Pipeline Indicator & Trigger */}
            <div className="mt-5 flex flex-col gap-4 border-t border-[#F2E2E8] pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#2F2329]">
              <div className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
                Quy trình: <strong className="text-[#24171D] dark:text-[#F6EEF1]">1. Nháp</strong> &rarr;{' '}
                <strong className="text-[#24171D] dark:text-[#F6EEF1]">2. Phản biện riêng tìm lỗ hổng</strong> &rarr;{' '}
                <strong className="text-[#24171D] dark:text-[#F6EEF1]">3. Sửa lại dàn ý cuối</strong>
              </div>
              <button
                type="button"
                onClick={handleRunThreeStepOutline}
                disabled={isRunning3Step}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#9D0B3A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820930] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:bg-[#E05C88] dark:text-[#140F12] dark:hover:bg-[#EC749C] whitespace-nowrap"
              >
                {isRunning3Step ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Đang chạy 3 bước lập &amp; phản biện...</span>
                  </>
                ) : (
                  <span>Chạy lập dàn ý 3 bước</span>
                )}
              </button>
            </div>
          </div>

          {threeStepResult && (
            <div className="space-y-6">
              {/* Step 1 + Step 2 Audit Trail */}
              <div className="rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
                <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
                  Lỗ hổng đã bị bắt ở Bước 2 &amp; cách đã khắc phục
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6B545E] dark:text-[#AA96A0]">
                  Tóm tắt nháp Bước 1: {threeStepResult.step1_draft_summary}
                </p>

                <ul className="mt-4 space-y-3">
                  {threeStepResult.step2_flaws_caught.map((flaw, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-[#EFE0E6] bg-[#FCF7F9] p-4 text-sm dark:border-[#32242B] dark:bg-[#231B1F]"
                    >
                      <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                        Lỗ hổng #{idx + 1} · {flaw.flaw_type}
                      </div>
                      <p className="mt-1 text-[#24171D] dark:text-[#EFE4E8]">
                        {flaw.description}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                        <strong className="font-semibold">Cách đã sửa ở Bước 3: </strong>
                        {flaw.how_fixed}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step 3 Final Outline */}
              <OutlineResultCard
                outline={threeStepResult.step3_final_outline}
                savedVocab={savedVocab}
                sourceTopic={prompt.slice(0, 70)}
                onSaveVocab={onSaveVocab}
                heading="Bước 3: Dàn ý cuối sau khi đã sửa toàn bộ lỗ hổng"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
