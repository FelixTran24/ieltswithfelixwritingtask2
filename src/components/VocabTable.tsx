import { Bookmark, Check } from 'lucide-react';
import type { VocabItem } from '../types/ielts';

export interface VocabCandidate {
  phrase: string;
  vietnamese_meaning: string;
  part_of_speech?: string;
  example_sentence?: string;
}

interface VocabTableProps {
  items: VocabCandidate[];
  savedVocab: VocabItem[];
  sourceTopic?: string;
  onSaveVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
  title?: string;
}

export function VocabTable({
  items,
  savedVocab,
  sourceTopic,
  onSaveVocab,
  title = 'Bảng từ vựng và collocation nổi bật',
}: VocabTableProps) {
  if (!items || items.length === 0) return null;

  const isSaved = (phrase: string) =>
    savedVocab.some(
      (v) => v.phrase.trim().toLowerCase() === phrase.trim().toLowerCase()
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
          {title}
        </h4>
        <span className="text-xs text-[#735D67] dark:text-[#AA96A0] tabular-nums">
          {items.length} mục từ vựng
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#EDD8DF] bg-white dark:border-[#34262D] dark:bg-[#1C1519]">
        <table className="w-full min-w-[540px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#EDD8DF] bg-[#FCF4F7] text-xs font-medium text-[#6B545E] dark:border-[#34262D] dark:bg-[#231B1F] dark:text-[#BBA7B0]">
              <th className="px-4 py-3">Cụm từ / Collocation</th>
              <th className="px-4 py-3">Nghĩa tiếng Việt</th>
              <th className="px-4 py-3">Ngữ cảnh trong bài</th>
              <th className="px-4 py-3 text-right">Sổ từ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2E2E8] dark:divide-[#2D2127]">
            {items.map((item, idx) => {
              const saved = isSaved(item.phrase);
              return (
                <tr
                  key={`${item.phrase}-${idx}`}
                  className="align-top transition-colors hover:bg-[#FEF8FA] dark:hover:bg-[#221A1E]"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
                      {item.phrase}
                    </div>
                    {item.part_of_speech && (
                      <div className="mt-0.5 text-xs text-[#7A636D] dark:text-[#9E8B94]">
                        {item.part_of_speech}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#2E1E25] dark:text-[#E9DDE2]">
                    {item.vietnamese_meaning}
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-[#5E4A53] dark:text-[#B5A2AB]">
                    {item.example_sentence || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={saved}
                      onClick={() =>
                        onSaveVocab({
                          phrase: item.phrase,
                          vietnamese_meaning: item.vietnamese_meaning,
                          part_of_speech: item.part_of_speech,
                          example_sentence: item.example_sentence,
                          source_topic: sourceTopic,
                        })
                      }
                      aria-label={
                        saved
                          ? `Đã lưu cụm từ ${item.phrase}`
                          : `Lưu cụm từ ${item.phrase} vào sổ từ`
                      }
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] ${
                        saved
                          ? 'border-[#D7E8DE] bg-[#F2FBF6] text-[#1D6B44] dark:border-[#234835] dark:bg-[#13261C] dark:text-[#7AD7A5]'
                          : 'border-[#E9C9D5] bg-[#FDF2F6] text-[#8F0E39] hover:bg-[#F9E3EC] dark:border-[#4F323F] dark:bg-[#2B1D24] dark:text-[#F5A3BF] dark:hover:bg-[#38252E]'
                      }`}
                    >
                      {saved ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Đã lưu</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Lưu sổ từ</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
