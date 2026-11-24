import { AlertTriangle } from 'lucide-react';
import type { FinalOutline, OutlineChainItem, VocabItem } from '../types/ielts';
import { VocabTable } from './VocabTable';

interface OutlineResultCardProps {
  outline: FinalOutline;
  savedVocab: VocabItem[];
  sourceTopic?: string;
  onSaveVocab: (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => void;
  heading?: string;
}

function ChainBlock({ chain }: { chain: OutlineChainItem }) {
  return (
    <div className="rounded-xl border border-[#EFE0E6] bg-[#FFFBFD] p-4 dark:border-[#32242B] dark:bg-[#231B1F]">
      <div className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
        {chain.point_label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#24171D] dark:text-[#F0E6EA]">
        <span className="font-medium">{chain.cause}</span>
        <span className="mx-1.5 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true">
          &rarr;
        </span>
        <span>{chain.mechanism}</span>
        <span className="mx-1.5 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true">
          &rarr;
        </span>
        <span>{chain.effect}</span>
        <span className="mx-1.5 text-[#9D0B3A] dark:text-[#F5A3BF]" aria-hidden="true">
          &rarr;
        </span>
        <em className="text-[#6B545E] dark:text-[#C5B2BB]">
          Giới hạn: {chain.limit}
        </em>
      </p>
      <p className="mt-2.5 border-t border-[#F2E2E8] pt-2.5 text-xs leading-relaxed text-[#544049] dark:border-[#32242B] dark:text-[#C2B0B9]">
        <span className="font-semibold text-[#24171D] dark:text-[#F6EEF1]">
          Ví dụ cụ thể:{' '}
        </span>
        {chain.example}
      </p>
    </div>
  );
}

export function OutlineResultCard({
  outline,
  savedVocab,
  sourceTopic,
  onSaveVocab,
  heading = 'Dàn ý 4 đoạn hoàn chỉnh',
}: OutlineResultCardProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-[#EDD8DF] bg-white p-5 sm:p-6 dark:border-[#34262D] dark:bg-[#1C1519]">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[#24171D] dark:text-[#F6EEF1]">
          {heading}
        </h3>
        <p className="text-xs text-[#6B545E] dark:text-[#AA96A0]">
          Mỗi luận điểm theo chuỗi Nguyên nhân &rarr; Cơ chế &rarr; Kết quả &rarr; Giới hạn, kèm 1 ví dụ cụ thể và không bịa số liệu.
        </p>
      </div>

      {/* TR Scope Audit */}
      <div className="rounded-xl border border-[#F0D6DF] bg-[#FDF5F8] p-4 dark:border-[#442D38] dark:bg-[#251A20]">
        <div className="text-xs font-semibold text-[#8F0E39] dark:text-[#F5A3BF]">
          Kiểm tra phạm vi đề (Task Response Audit)
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[#2E1E25] dark:text-[#EAE0E4]">
          {outline.tr_scope_audit}
        </p>
      </div>

      {/* 4 Paragraphs */}
      <div className="space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            01. Introduction
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-[#38272F] dark:text-[#DFD2D7]">
            {outline.introduction}
          </p>
        </div>

        <div className="space-y-3 border-t border-[#F2E2E8] pt-4 dark:border-[#2F2329]">
          <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            02. Body 1 — {outline.body_1_heading}
          </h4>
          <div className="space-y-3">
            {outline.body_1_chains.map((chain, idx) => (
              <ChainBlock key={idx} chain={chain} />
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#F2E2E8] pt-4 dark:border-[#2F2329]">
          <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            03. Body 2 — {outline.body_2_heading}
          </h4>
          <div className="space-y-3">
            {outline.body_2_chains.map((chain, idx) => (
              <ChainBlock key={idx} chain={chain} />
            ))}
          </div>
        </div>

        <div className="border-t border-[#F2E2E8] pt-4 dark:border-[#2F2329]">
          <h4 className="text-sm font-semibold text-[#24171D] dark:text-[#F6EEF1]">
            04. Conclusion
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-[#38272F] dark:text-[#DFD2D7]">
            {outline.conclusion}
          </p>
        </div>
      </div>

      {/* Examiner Warnings */}
      {outline.examiner_warnings && outline.examiner_warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Điểm giám khảo vẫn có thể bắt lỗi khi viết thành bài</span>
          </div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-amber-950/90 dark:text-amber-100/90">
            {outline.examiner_warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Vocab Table */}
      <VocabTable
        items={outline.vocabulary}
        savedVocab={savedVocab}
        sourceTopic={sourceTopic}
        onSaveVocab={onSaveVocab}
        title="Từ vựng và collocation C1-C2 gợi ý cho dàn ý"
      />
    </div>
  );
}
