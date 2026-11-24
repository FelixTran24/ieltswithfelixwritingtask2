import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildDebateSystemInstruction,
  buildGradingSystemInstruction,
  buildOutlineCoachSystemInstruction,
  buildSampleEssaySystemInstruction,
} from './prompts.ts';
import {
  computeOverallBand,
  countWords,
  normalizeCriterionScore,
} from '../src/utils/scoring.ts';
import type {
  DebateMessage,
  DetectedTypeResult,
  EssayTypeId,
  FinalOutline,
  GradingResult,
  SampleEssayResult,
  ThreeStepOutlineResult,
} from '../src/types/ielts';

const MODEL_CANDIDATES = [
  'gemini-4-hydrogen',
  'gemini-4-neon',
  'gemini-3.1-flash-lite',
  'gemini-4-carbon',
];

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra mục Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callModelWithFallback(
  ai: GoogleGenAI,
  requestParams: Omit<
    Parameters<GoogleGenAI['models']['generateContent']>[0],
    'model'
  >
) {
  let lastError: unknown;
  for (const model of MODEL_CANDIDATES) {
    let attempt = 0;
    const maxAttempts = 2;
    while (attempt <= maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          ...requestParams,
          model,
        });
        return response;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isUnavailable =
          /429|500|502|503|504|UNAVAILABLE|high demand|overloaded|DEADLINE_EXCEEDED|network/i.test(
            message
          );
        if (!isUnavailable) {
          throw error;
        }
        attempt++;
        if (attempt <= maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, 600 * Math.pow(2, attempt))
          );
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
}

function parseJsonResponse<T>(text: string | undefined, context: string): T {
  const raw = (text ?? '').trim();
  if (!raw) {
    throw new Error(`Gemini không trả về nội dung JSON cho tác vụ ${context}.`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned) as T;
  }
}

const ESSAY_TYPE_ENUM = [
  'opinion',
  'discuss_both',
  'advantages_disadvantages',
  'problem_solution',
  'two_part',
];

const VOCAB_ARRAY_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      phrase: { type: Type.STRING },
      vietnamese_meaning: { type: Type.STRING },
      part_of_speech: { type: Type.STRING },
      example_sentence: { type: Type.STRING },
    },
    required: [
      'phrase',
      'vietnamese_meaning',
      'part_of_speech',
      'example_sentence',
    ],
  },
};

const FINAL_OUTLINE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tr_scope_audit: { type: Type.STRING },
    introduction: { type: Type.STRING },
    body_1_heading: { type: Type.STRING },
    body_1_chains: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point_label: { type: Type.STRING },
          cause: { type: Type.STRING },
          mechanism: { type: Type.STRING },
          effect: { type: Type.STRING },
          limit: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: [
          'point_label',
          'cause',
          'mechanism',
          'effect',
          'limit',
          'example',
        ],
      },
    },
    body_2_heading: { type: Type.STRING },
    body_2_chains: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point_label: { type: Type.STRING },
          cause: { type: Type.STRING },
          mechanism: { type: Type.STRING },
          effect: { type: Type.STRING },
          limit: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: [
          'point_label',
          'cause',
          'mechanism',
          'effect',
          'limit',
          'example',
        ],
      },
    },
    conclusion: { type: Type.STRING },
    examiner_warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
    vocabulary: VOCAB_ARRAY_SCHEMA,
  },
  required: [
    'tr_scope_audit',
    'introduction',
    'body_1_heading',
    'body_1_chains',
    'body_2_heading',
    'body_2_chains',
    'conclusion',
    'examiner_warnings',
    'vocabulary',
  ],
};

export async function detectEssayType(
  prompt: string
): Promise<DetectedTypeResult> {
  const ai = getAiClient();
  const response = await callModelWithFallback(ai, {
    contents: `Hãy nhận diện chính xác dạng đề IELTS Writing Task 2 cho đề bài sau và giải thích ngắn gọn bằng tiếng Việt (không dùng emoji):

Đề bài:
${prompt}`,
    config: {
      systemInstruction:
        'Bạn là chuyên gia phân loại đề IELTS Writing Task 2. Trả lời bằng tiếng Việt, không dùng emoji. Chọn đúng 1 trong 5 mã dạng đề: opinion, discuss_both, advantages_disadvantages, problem_solution, two_part.',
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          essay_type: { type: Type.STRING, enum: ESSAY_TYPE_ENUM },
          reason: { type: Type.STRING },
          key_requirements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['essay_type', 'reason', 'key_requirements'],
      },
    },
  });
  return parseJsonResponse<DetectedTypeResult>(response.text, 'nhận diện dạng đề');
}

export async function gradeEssay(params: {
  prompt: string;
  essay: string;
  essayType?: EssayTypeId | 'auto';
}): Promise<GradingResult> {
  const ai = getAiClient();
  const typeInstruction =
    params.essayType && params.essayType !== 'auto'
      ? `Người học đã xác nhận dạng đề là: "${params.essayType}". Hãy chấm Task Response đúng theo chuẩn của dạng đề này.`
      : 'Hãy tự nhận diện chính xác dạng đề (1 trong 5 mã: opinion, discuss_both, advantages_disadvantages, problem_solution, two_part) và ghi vào trường detected_essay_type.';

  const userContent = `${typeInstruction}

=== ĐỀ BÀI ===
${params.prompt}

=== BÀI VIẾT CỦA NGƯỜI HỌC ===
${params.essay}

Hãy chấm bài thật công tâm theo đúng band descriptors, dữ liệu calibration và 6 bài mẫu Band 9 tham chiếu. Trả về JSON đúng schema, tuyệt đối không dùng emoji.`;

  const response = await callModelWithFallback(ai, {
    contents: userContent,
    config: {
      systemInstruction: buildGradingSystemInstruction(),
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores: {
            type: Type.OBJECT,
            properties: {
              task_response: { type: Type.INTEGER },
              coherence_cohesion: { type: Type.INTEGER },
              lexical_resource: { type: Type.INTEGER },
              grammatical_range_accuracy: { type: Type.INTEGER },
            },
            required: [
              'task_response',
              'coherence_cohesion',
              'lexical_resource',
              'grammatical_range_accuracy',
            ],
          },
          overall_band: { type: Type.NUMBER },
          detected_essay_type: { type: Type.STRING, enum: ESSAY_TYPE_ENUM },
          confidence_note: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          criteria_analysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterion: {
                  type: Type.STRING,
                  enum: ['TR', 'CC', 'LR', 'GRA'],
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                weaknesses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                fixes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['criterion', 'strengths', 'weaknesses', 'fixes'],
            },
          },
          idea_critique: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterion: { type: Type.STRING, enum: ['TR', 'CC'] },
                point: { type: Type.STRING },
                maps_to_band: { type: Type.INTEGER },
                deducted: { type: Type.BOOLEAN },
              },
              required: ['criterion', 'point', 'maps_to_band', 'deducted'],
            },
          },
          language_notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterion: { type: Type.STRING, enum: ['LR', 'GRA'] },
                note: { type: Type.STRING },
                systematic: { type: Type.BOOLEAN },
                deducted: { type: Type.BOOLEAN },
              },
              required: ['criterion', 'note', 'systematic', 'deducted'],
            },
          },
          gap_to_next_band: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          coach_questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          edits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original_text: { type: Type.STRING },
                action: {
                  type: Type.STRING,
                  enum: ['delete', 'replace', 'insert', 'comment'],
                },
                suggested_text: { type: Type.STRING },
                comment: { type: Type.STRING },
                criterion: {
                  type: Type.STRING,
                  enum: ['TR', 'CC', 'LR', 'GRA'],
                },
              },
              required: [
                'original_text',
                'action',
                'suggested_text',
                'comment',
                'criterion',
              ],
            },
          },
        },
        required: [
          'scores',
          'overall_band',
          'detected_essay_type',
          'confidence_note',
          'strengths',
          'criteria_analysis',
          'idea_critique',
          'language_notes',
          'gap_to_next_band',
          'coach_questions',
          'edits',
        ],
      },
    },
  });

  const parsed = parseJsonResponse<GradingResult>(response.text, 'chấm bài');

  const cleanScores = {
    task_response: normalizeCriterionScore(parsed.scores.task_response),
    coherence_cohesion: normalizeCriterionScore(
      parsed.scores.coherence_cohesion
    ),
    lexical_resource: normalizeCriterionScore(parsed.scores.lexical_resource),
    grammatical_range_accuracy: normalizeCriterionScore(
      parsed.scores.grammatical_range_accuracy
    ),
  };

  return {
    ...parsed,
    scores: cleanScores,
    overall_band: computeOverallBand(cleanScores),
    coach_questions: (parsed.coach_questions ?? []).slice(0, 2),
    edits: Array.isArray(parsed.edits) ? parsed.edits : [],
    criteria_analysis: Array.isArray(parsed.criteria_analysis)
      ? parsed.criteria_analysis
      : [],
  };
}

export async function generateBand9SampleEssay(params: {
  prompt: string;
  essayType: EssayTypeId;
  stanceLabel?: string;
  stanceNote?: string;
}): Promise<SampleEssayResult> {
  const ai = getAiClient();
  const stanceText = params.stanceLabel
    ? `Lập trường / hướng triển khai yêu cầu: ${params.stanceLabel}${params.stanceNote ? ` (${params.stanceNote})` : ''}`
    : 'Chọn lập trường rõ ràng, sắc nét, phù hợp nhất với dạng đề.';

  const userContent = `Hãy viết một bài mẫu IELTS Writing Task 2 theo phong cách các bài Band 9 tham chiếu.
- Đề bài: ${params.prompt}
- Dạng đề: ${params.essayType}
- ${stanceText}
- Yêu cầu nghiêm ngặt: Đúng 4 đoạn văn (essay_paragraphs gồm đúng 4 chuỗi: Introduction, Body 1, Body 2, Conclusion), tổng độ dài khoảng 290-340 từ tiếng Anh.
- Ý tưởng gãy gọn, cơ chế rõ, không bịa số liệu hay nghiên cứu, chỉ học hành văn từ 6 bài Band 9 tham chiếu.
- Kèm danh sách 8-12 cụm collocation/từ vựng nổi bật có nghĩa tiếng Việt và câu ví dụ từ bài. Không dùng emoji.`;

  const response = await callModelWithFallback(ai, {
    contents: userContent,
    config: {
      systemInstruction: buildSampleEssaySystemInstruction(),
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          essay_paragraphs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          word_count: { type: Type.INTEGER },
          style_notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          vocabulary: VOCAB_ARRAY_SCHEMA,
        },
        required: [
          'essay_paragraphs',
          'word_count',
          'style_notes',
          'vocabulary',
        ],
      },
    },
  });

  const parsed = parseJsonResponse<SampleEssayResult>(
    response.text,
    'tạo bài mẫu Band 9'
  );
  const fullText = (parsed.essay_paragraphs ?? []).join('\n\n');
  return {
    ...parsed,
    word_count: countWords(fullText),
  };
}

export async function runDebateTurn(params: {
  prompt: string;
  outline: string;
  essayType?: EssayTypeId | 'auto';
  history: DebateMessage[];
  userMessage: string;
}): Promise<{ response: string; focus_flaw: string }> {
  const ai = getAiClient();
  const transcript = params.history
    .map(
      (msg) =>
        `${msg.role === 'user' ? 'Người học' : 'Cựu giám khảo'}: ${msg.content}`
    )
    .join('\n\n');

  const content = `Đề bài IELTS Writing Task 2:
${params.prompt}

Dạng đề người học chọn: ${params.essayType ?? 'auto'}

Dàn ý ban đầu của người học:
${params.outline || '(Chưa nhập dàn ý chi tiết)'}

${transcript ? `=== LỊCH SỬ TRANH BIỆN ===\n${transcript}\n` : ''}
=== LƯỢT MỚI NHẤT CỦA NGƯỜI HỌC ===
${params.userMessage}

Hãy phản biện theo đúng luật chế độ Tranh biện:
- Chỉ nhắm vào 1 lỗ hổng hoặc khía cạnh yếu nhất.
- Hỏi tối đa 2 câu hỏi ngắn, trực diện.
- Không viết bài mẫu, không đưa dàn ý có sẵn, không dùng emoji.
- Trường focus_flaw ghi ngắn tên lỗ hổng đang chất vấn (ví dụ: "Thiếu cơ chế", "Overgeneralization", "Lạc phạm vi đề", "Mâu thuẫn giữa hai body", "Ví dụ mờ", "Net effect").`;

  const response = await callModelWithFallback(ai, {
    contents: content,
    config: {
      systemInstruction: buildDebateSystemInstruction(),
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          response: { type: Type.STRING },
          focus_flaw: { type: Type.STRING },
        },
        required: ['response', 'focus_flaw'],
      },
    },
  });
  return parseJsonResponse<{ response: string; focus_flaw: string }>(
    response.text,
    'lượt tranh biện'
  );
}

export async function finalizeDebateOutline(params: {
  prompt: string;
  outline: string;
  essayType?: EssayTypeId | 'auto';
  history: DebateMessage[];
}): Promise<FinalOutline> {
  const ai = getAiClient();
  const transcript = params.history
    .map(
      (msg) =>
        `${msg.role === 'user' ? 'Người học' : 'Cựu giám khảo'}: ${msg.content}`
    )
    .join('\n\n');

  const content = `Người học bấm CHỐT DÀN Ý sau phiên tranh biện.
Đề bài:
${params.prompt}

Dạng đề: ${params.essayType ?? 'auto'}

Dàn ý ban đầu:
${params.outline}

Toàn bộ lịch sử tranh biện:
${transcript || '(Chưa có lượt tranh biện nào — hãy tổng hợp từ dàn ý ban đầu và chỉ rõ những chỗ còn thiếu cơ chế).'}

Hãy tổng hợp dàn ý cuối 4 đoạn TỪ CÁC Ý ĐÃ QUA PHẢN BIỆN. Nếu có chỗ người học chưa chốt, nêu rõ trong phần examiner_warnings.
Mỗi ý chính trong body_1_chains và body_2_chains PHẢI có đủ chuỗi: Nguyên nhân (cause) -> Cơ chế (mechanism) -> Kết quả (effect) -> Giới hạn (limit) + 1 ví dụ cụ thể (example, không bịa số liệu).
Kèm 6-10 cụm từ vựng/collocation C1-C2 có nghĩa tiếng Việt. Không dùng emoji.`;

  const response = await callModelWithFallback(ai, {
    contents: content,
    config: {
      systemInstruction: buildOutlineCoachSystemInstruction(),
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseSchema: FINAL_OUTLINE_SCHEMA,
    },
  });
  return parseJsonResponse<FinalOutline>(response.text, 'chốt dàn ý');
}

export async function generateThreeStepOutline(params: {
  prompt: string;
  outline?: string;
  essayType: EssayTypeId;
  stanceLabel: string;
  stanceDescription: string;
  riskWarning: string;
}): Promise<ThreeStepOutlineResult> {
  const ai = getAiClient();
  const sys = buildOutlineCoachSystemInstruction();

  // STEP 1: Initial draft outline
  const step1Resp = await callModelWithFallback(ai, {
    contents: `BƯỚC 1 (NHÁP DÀN Ý):
Đề bài: ${params.prompt}
Dạng đề: ${params.essayType}
Lập trường người học chọn: ${params.stanceLabel} — ${params.stanceDescription}
Ghi chú / ý thô của người học (nếu có): ${params.outline || '(Không có)'}

Hãy lập một bản nháp dàn ý 4 đoạn (Introduction, Body 1, Body 2, Conclusion) với các luận điểm sơ bộ, cơ chế ban đầu và ví dụ dự kiến. Viết bằng tiếng Việt (giữ thuật ngữ tiếng Anh), không dùng emoji.`,
    config: {
      systemInstruction: sys,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  const step1Draft = (step1Resp.text ?? '').trim();

  // STEP 2: Independent critique
  const step2Resp = await callModelWithFallback(ai, {
    contents: `BƯỚC 2 (PHẢN BIỆN RIÊNG TÌM LỖ HỔNG):
Bạn đóng vai cựu giám khảo cực kỳ khó tính, độc lập kiểm tra bản nháp dàn ý dưới đây.
Đề bài: ${params.prompt}
Dạng đề: ${params.essayType}
Lập trường đã chọn: ${params.stanceLabel}
Cảnh báo rủi ro của lựa chọn này: ${params.riskWarning}

=== BẢN NHÁP TỪ BƯỚC 1 ===
${step1Draft}

Hãy bắt ra 3 đến 5 lỗ hổng logic cụ thể trong bản nháp trên và chỉ rõ hướng khắc phục cụ thể cho từng lỗ hổng. Không dùng emoji.`,
    config: {
      systemInstruction: sys,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          draft_summary: { type: Type.STRING },
          flaws: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                flaw_type: { type: Type.STRING },
                description: { type: Type.STRING },
                how_fixed: { type: Type.STRING },
              },
              required: ['flaw_type', 'description', 'how_fixed'],
            },
          },
        },
        required: ['draft_summary', 'flaws'],
      },
    },
  });

  const step2Critique = parseJsonResponse<{
    draft_summary: string;
    flaws: Array<{
      flaw_type: string;
      description: string;
      how_fixed: string;
    }>;
  }>(step2Resp.text, 'bước 2 phản biện dàn ý');

  // STEP 3: Revised final outline
  const flawsText = step2Critique.flaws
    .map(
      (f, i) =>
        `${i + 1}. [${f.flaw_type}] ${f.description} -> Hướng sửa: ${f.how_fixed}`
    )
    .join('\n');

  const step3Resp = await callModelWithFallback(ai, {
    contents: `BƯỚC 3 (SỬA LẠI DÀN Ý HOÀN CHỈNH):
Đề bài: ${params.prompt}
Dạng đề: ${params.essayType}
Lập trường đã chọn: ${params.stanceLabel}

=== BẢN NHÁP BƯỚC 1 ===
${step1Draft}

=== CÁC LỖ HỔNG ĐÃ BỊ BẮT Ở BƯỚC 2 ===
${flawsText}

Hãy viết lại DÀN Ý CUỐI 4 ĐOẠN khắc phục triệt để toàn bộ các lỗ hổng trên.
Yêu cầu bắt buộc:
- Mỗi luận điểm ở Body 1 và Body 2 PHẢI trình bày đầy đủ chuỗi: Nguyên nhân (cause) -> Cơ chế (mechanism) -> Kết quả (effect) -> Giới hạn (limit) + đúng 1 ví dụ cụ thể (example), TUYỆT ĐỐI KHÔNG bịa số liệu hay tên nghiên cứu.
- Kèm 8-10 từ vựng/collocation C1-C2 có nghĩa tiếng Việt và câu ví dụ.
- Không hứa Band 9, nêu thẳng các điểm giám khảo vẫn có thể bắt trong examiner_warnings. Không dùng emoji.`,
    config: {
      systemInstruction: sys,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseSchema: FINAL_OUTLINE_SCHEMA,
    },
  });

  const step3Final = parseJsonResponse<FinalOutline>(
    step3Resp.text,
    'bước 3 hoàn thiện dàn ý'
  );

  return {
    step1_draft_summary: step2Critique.draft_summary,
    step2_flaws_caught: step2Critique.flaws,
    step3_final_outline: step3Final,
  };
}
