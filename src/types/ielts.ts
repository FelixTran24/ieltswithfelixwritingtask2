export type EssayTypeId =
  | 'opinion'
  | 'discuss_both'
  | 'advantages_disadvantages'
  | 'problem_solution'
  | 'two_part';

export type EssayTypeSelection = EssayTypeId | 'auto';

export type CriterionCode = 'TR' | 'CC' | 'LR' | 'GRA';

export interface BandScores {
  task_response: number;
  coherence_cohesion: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
}

export interface TeacherScores {
  task_response: number | null;
  coherence_cohesion: number | null;
  lexical_resource: number | null;
  grammatical_range_accuracy: number | null;
}

export interface CriterionBreakdown {
  criterion: CriterionCode;
  strengths: string[];
  weaknesses: string[];
  fixes: string[];
}

export interface IdeaCritiqueItem {
  criterion: 'TR' | 'CC';
  point: string;
  maps_to_band: number;
  deducted: boolean;
}

export interface LanguageNoteItem {
  criterion: 'LR' | 'GRA';
  note: string;
  systematic: boolean;
  deducted: boolean;
}

export type EditAction = 'delete' | 'replace' | 'insert' | 'comment';

export interface EssayEditItem {
  original_text: string;
  action: EditAction;
  suggested_text?: string;
  comment: string;
  criterion: CriterionCode;
}

export interface GradingResult {
  scores: BandScores;
  overall_band: number;
  detected_essay_type: EssayTypeId;
  confidence_note: string;
  strengths: string[];
  criteria_analysis: CriterionBreakdown[];
  idea_critique: IdeaCritiqueItem[];
  language_notes: LanguageNoteItem[];
  gap_to_next_band: string[];
  coach_questions: string[];
  edits: EssayEditItem[];
}

export interface DetectedTypeResult {
  essay_type: EssayTypeId;
  reason: string;
  key_requirements: string[];
}

export interface VocabItem {
  id: string;
  phrase: string;
  vietnamese_meaning: string;
  part_of_speech?: string;
  example_sentence?: string;
  source_topic?: string;
  saved_at: string;
  mastered?: boolean;
}

export interface SampleEssayResult {
  essay_paragraphs: string[];
  word_count: number;
  style_notes: string[];
  vocabulary: Array<{
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech: string;
    example_sentence: string;
  }>;
}

export interface GradingHistoryEntry {
  id: string;
  created_at: string;
  prompt: string;
  essay: string;
  word_count: number;
  essay_type: EssayTypeId;
  result: GradingResult;
  teacher_scores?: TeacherScores;
  sample_essay?: SampleEssayResult;
}

export interface DebateMessage {
  id: string;
  role: 'user' | 'examiner';
  content: string;
  focus_flaw?: string;
  timestamp: string;
}

export interface OutlineChainItem {
  point_label: string;
  cause: string;
  mechanism: string;
  effect: string;
  limit: string;
  example: string;
}

export interface FinalOutline {
  tr_scope_audit: string;
  introduction: string;
  body_1_heading: string;
  body_1_chains: OutlineChainItem[];
  body_2_heading: string;
  body_2_chains: OutlineChainItem[];
  conclusion: string;
  examiner_warnings: string[];
  vocabulary: Array<{
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech: string;
    example_sentence: string;
  }>;
}

export interface ThreeStepOutlineResult {
  step1_draft_summary: string;
  step2_flaws_caught: Array<{
    flaw_type: string;
    description: string;
    how_fixed: string;
  }>;
  step3_final_outline: FinalOutline;
}

export type ActiveTab = 'grade' | 'debate' | 'samples' | 'progress';
