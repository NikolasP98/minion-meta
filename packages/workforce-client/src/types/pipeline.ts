// Pipeline types — mirrors paperclip-minion/packages/shared/src/types/pipeline.ts (WP1/WP2/WP4).
// See specs/2026-07-11-universal-projects-module.md §2.2, §2.3.

export type PipelineStepKind = 'work' | 'review' | 'approval' | 'eval';

export type PipelineParticipant =
  | { type: 'agent'; agentId: string }
  | { type: 'user'; userId: string }
  | { type: 'role'; roleKeys: string[] };

export interface PipelineStep {
  key: string;
  kind: PipelineStepKind;
  label: string;
  participant: PipelineParticipant;
  adapterOverrides?: Record<string, unknown> | null;
  rubric?: string | null;
  minScore?: number | null;
  maxScore?: number | null;
}

export interface PipelineTrigger {
  originKinds?: string[];
  labels?: string[];
  priorities?: string[];
}

export interface Pipeline {
  id: string;
  companyId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  trigger: PipelineTrigger | null;
  steps: PipelineStep[];
  sortOrder: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
