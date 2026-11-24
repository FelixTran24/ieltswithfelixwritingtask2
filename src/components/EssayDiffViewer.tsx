import { useMemo, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { EssayEditItem } from '../types/ielts';
import { matchEditsToEssay, type LocatedEdit } from '../utils/editMatcher';

interface EssayDiffViewerProps {
  essay: string;
  edits: EssayEditItem[];
}

const ACTION_LABEL: Record<EssayEditItem['action'], string> = {
  delete: 'Đề nghị xóa',
  replace: 'Thay thế',
  insert: 'Bổ sung',
  comment: 'Bình luận',
};

export function EssayDiffViewer({ essay, edits }: EssayDiffViewerProps) {
  const diff = useMemo(() => matchEditsToEssay(essay, edits), [essay, edits]);
  const [selectedId, setSelectedId] = useState<string | null>(
    diff.matchedEdits[0]?.id ?? null
  );
  const [mobileOpenEdit, setMobileOpenEdit] = useState<LocatedEdit | null>(null);

  const handleSelectEdit = (located: LocatedEdit) => {
    setSelectedId(located.id);
    setMobileOpenEdit(located);
  };

  return (
    <section
      aria-label="Bài viết đã chỉnh sửa trực quan"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            Bài viết chỉnh sửa trực quan và bình luận theo đoạn
          </h3>
          <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Chạm hoặc bấm vào cụm được đánh dấu để xem lý do chỉnh sửa từ giám khảo.
          </p>
        </div>

        {/* Clean visual legend (text + color, never hue-only) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#5E4A53] dark:text-[#B8A5AE]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded bg-rose-100 px-1.5 py-0.5 line-through text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              xóa
            </span>
            <span>Đề nghị bỏ</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              thay / thêm
            </span>
            <span>Đề nghị sửa</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
              highlight
            </span>
            <span>Có bình luận</span>
          </span>
        </div>
      </div>

      {/* Main split layout: Essay text on left, synced side comments on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="rounded-xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
          <div className="space-y-4 text-[15px] leading-[1.85] text-[#24171D] dark:text-[#F0E6EA]">
            {diff.paragraphs.map((para) => (
              <p key={para.paragraphIndex}>
                {para.segments.map((seg, sIdx) => {
                  if (seg.type === 'plain' || !seg.locatedEdit) {
                    return <span key={sIdx}>{seg.text}</span>;
                  }

                  const loc = seg.locatedEdit;
                  const { action, suggested_text } = loc.edit;
                  const isActive = selectedId === loc.id;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectEdit(loc)}
                      aria-label={`Chỉnh sửa số ${loc.index} (${loc.edit.criterion}): ${ACTION_LABEL[action]}`}
                      className={`inline text-left rounded px-1 py-0.5 mx-0.5 align-baseline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                        isActive
                          ? 'ring-2 ring-[#9D0B3A]/60 dark:ring-[#F5A3BF]/70'
                          : ''
                      } ${
                        action === 'comment'
                          ? 'bg-amber-100/90 text-[#2B2110] hover:bg-amber-200/80 dark:bg-amber-900/40 dark:text-[#FCEAC0] dark:hover:bg-amber-900/60'
                          : 'bg-[#FFF7FA] hover:bg-[#FCECF2] dark:bg-[#271C22] dark:hover:bg-[#31232A]'
                      }`}
                    >
                      {action === 'delete' && (
                        <span className="line-through decoration-rose-600 text-rose-800 bg-rose-100/90 px-1 rounded dark:text-rose-300 dark:bg-rose-950/60">
                          {seg.text}
                        </span>
                      )}

                      {action === 'replace' && (
                        <>
                          <span className="line-through decoration-rose-600 text-rose-800 bg-rose-100/80 px-1 rounded dark:text-rose-300 dark:bg-rose-950/60">
                            {seg.text}
                          </span>
                          {suggested_text && (
                            <span className="ml-1 font-medium text-emerald-800 bg-emerald-100/90 px-1 rounded dark:text-emerald-300 dark:bg-emerald-950/60">
                              {suggested_text}
                            </span>
                          )}
                        </>
                      )}

                      {action === 'insert' && (
                        <>
                          <span>{seg.text}</span>
                          {suggested_text && (
                            <span className="ml-1 font-medium text-emerald-800 bg-emerald-100/90 px-1 rounded dark:text-emerald-300 dark:bg-emerald-950/60">
                              + {suggested_text}
                            </span>
                          )}
                        </>
                      )}

                      {action === 'comment' && <span>{seg.text}</span>}

                      <sup className="ml-1 font-mono text-[10px] font-semibold text-[#9D0B3A] dark:text-[#F5A3BF] tabular-nums">
                        [{loc.index}]
                      </sup>
                    </button>
                  );
                })}
              </p>
            ))}
          </div>
        </div>

        {/* Desktop side comment column */}
        <aside
          aria-label="Khung bình luận bên lề"
          className="hidden lg:block space-y-2.5 max-h-[640px] overflow-y-auto pr-1"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#6B545E] dark:text-[#AA96A0] pb-1">
            <span>Bình luận theo đoạn</span>
            <span className="tabular-nums">{diff.matchedEdits.length} mục</span>
          </div>

          {diff.matchedEdits.length === 0 ? (
            <div className="rounded-xl border border-[#EDD8DF] bg-[#FCF7F9] p-4 text-xs text-[#6B545E] dark:border-[#34262D] dark:bg-[#1C1519] dark:text-[#AA96A0]">
              Không có mục chỉnh sửa khớp trực tiếp trong thân bài. Xem phần bình luận bổ sung bên dưới nếu có.
            </div>
          ) : (
            diff.matchedEdits.map((loc) => {
              const isSelected = selectedId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedId(loc.id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                    isSelected
                      ? 'border-[#C96B8C] bg-[#FFF5F8] dark:border-[#C56E8D] dark:bg-[#281C22]'
                      : 'border-[#EDD8DF] bg-white hover:bg-[#FEF9FB] dark:border-[#34262D] dark:bg-[#1C1519] dark:hover:bg-[#221A1E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#735D67] dark:text-[#AA96A0]">
                    <span className="font-mono font-semibold text-[#9D0B3A] dark:text-[#F5A3BF] tabular-nums">
                      #{loc.index} · {loc.edit.criterion}
                    </span>
                    <span>{ACTION_LABEL[loc.edit.action]}</span>
                  </div>
                  <p className="mt-1.5 text-xs italic text-[#6B545E] dark:text-[#B5A2AB] line-clamp-2">
                    &ldquo;{loc.edit.original_text}&rdquo;
                  </p>
                  {loc.edit.suggested_text && (
                    <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      Đề xuất: {loc.edit.suggested_text}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs leading-relaxed text-[#24171D] dark:text-[#EAE0E4]">
                    {loc.edit.comment}
                  </p>
                </button>
              );
            })
          )}
        </aside>
      </div>

      {/* Mobile tap-to-open comment bar & expandable card */}
      {diff.matchedEdits.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {mobileOpenEdit ? (
            <div
              role="region"
              aria-label="Chi tiết bình luận đã chọn"
              className="rounded-xl border border-[#C96B8C] bg-[#FFF5F8] p-4 dark:border-[#B86382] dark:bg-[#261B21]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#9D0B3A] dark:text-[#F5A3BF]">
                  Mục #{mobileOpenEdit.index} · {mobileOpenEdit.edit.criterion} ·{' '}
                  {ACTION_LABEL[mobileOpenEdit.edit.action]}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpenEdit(null)}
                  aria-label="Đóng khung bình luận"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B545E] hover:bg-[#F7E4EB] dark:text-[#B5A2AB] dark:hover:bg-[#35262E]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1.5 text-xs italic text-[#6B545E] dark:text-[#B5A2AB]">
                Gốc: &ldquo;{mobileOpenEdit.edit.original_text}&rdquo;
              </p>
              {mobileOpenEdit.edit.suggested_text && (
                <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Đề xuất: {mobileOpenEdit.edit.suggested_text}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-[#24171D] dark:text-[#F0E6EA]">
                {mobileOpenEdit.edit.comment}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-[#EDD8DF] bg-[#FCF7F9] px-4 py-3 text-xs text-[#6B545E] dark:border-[#34262D] dark:bg-[#1C1519] dark:text-[#AA96A0]">
              <MessageSquare className="h-4 w-4 shrink-0 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true" />
              <span>
                Bấm vào bất kỳ cụm từ được gạch hoặc highlight ở trên để mở bình luận ({diff.matchedEdits.length} mục).
              </span>
            </div>
          )}
        </div>
      )}

      {/* Unmatched edits fallback list at the end of the essay */}
      {diff.unmatchedEdits.length > 0 && (
        <div className="rounded-xl border border-[#EDD8DF] bg-[#FCF7F9] p-4 sm:p-5 dark:border-[#34262D] dark:bg-[#1C1519]">
          <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            Bình luận bổ sung cuối bài ({diff.unmatchedEdits.length})
          </h4>
          <p className="mt-0.5 text-xs text-[#6B545E] dark:text-[#AA96A0]">
            Các nhận xét dưới đây không khớp nguyên văn một đoạn ngắn cụ thể nên được tổng hợp tại đây.
          </p>
          <ul className="mt-3 space-y-3">
            {diff.unmatchedEdits.map(({ id, edit }) => (
              <li
                key={id}
                className="rounded-lg border border-[#EFE0E6] bg-white p-3.5 text-sm dark:border-[#2F2329] dark:bg-[#231B1F]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#735D67] dark:text-[#AA96A0]">
                  <span className="font-semibold text-[#9D0B3A] dark:text-[#F5A3BF]">
                    {edit.criterion}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{ACTION_LABEL[edit.action]}</span>
                </div>
                {edit.original_text && (
                  <p className="mt-1 text-xs italic text-[#6B545E] dark:text-[#B5A2AB]">
                    Đoạn liên quan: &ldquo;{edit.original_text}&rdquo;
                  </p>
                )}
                {edit.suggested_text && (
                  <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    Đề xuất: {edit.suggested_text}
                  </p>
                )}
                <p className="mt-1.5 text-sm leading-relaxed text-[#24171D] dark:text-[#EFE4E8]">
                  {edit.comment}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
