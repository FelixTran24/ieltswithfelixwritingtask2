import type {
  DebateMessage,
  DetectedTypeResult,
  EssayTypeId,
  EssayTypeSelection,
  FinalOutline,
  GradingResult,
  SampleEssayResult,
  ThreeStepOutlineResult,
} from '../types/ielts';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Yêu cầu thất bại (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export function apiDetectEssayType(prompt: string): Promise<DetectedTypeResult> {
  return postJson<DetectedTypeResult>('/api/detect-type', { prompt });
}

export function apiGradeEssay(params: {
  prompt: string;
  essay: string;
  essayType: EssayTypeSelection;
}): Promise<GradingResult> {
  return postJson<GradingResult>('/api/grade', params);
}

export function apiGenerateSampleEssay(params: {
  prompt: string;
  essayType: EssayTypeId;
  stanceLabel?: string;
  stanceNote?: string;
}): Promise<SampleEssayResult> {
  return postJson<SampleEssayResult>('/api/sample-essay', params);
}

export function apiDebateTurn(params: {
  prompt: string;
  outline: string;
  essayType: EssayTypeSelection;
  history: DebateMessage[];
  userMessage: string;
}): Promise<{ response: string; focus_flaw: string }> {
  return postJson<{ response: string; focus_flaw: string }>(
    '/api/debate/turn',
    params
  );
}

export function apiFinalizeDebate(params: {
  prompt: string;
  outline: string;
  essayType: EssayTypeSelection;
  history: DebateMessage[];
}): Promise<FinalOutline> {
  return postJson<FinalOutline>('/api/debate/finalize', params);
}

export function apiGenerateThreeStepOutline(params: {
  prompt: string;
  outline?: string;
  essayType: EssayTypeId;
  stanceLabel: string;
  stanceDescription: string;
  riskWarning: string;
}): Promise<ThreeStepOutlineResult> {
  return postJson<ThreeStepOutlineResult>('/api/debate/outline-3step', params);
}
