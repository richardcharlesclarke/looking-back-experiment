import type { Answers, Context } from './types';
export type Volunteer = {
  id: string; token: string; access: string; label: string; createdAt: string;
  screenedAt?: string; isTest: boolean;
};
export type PairRun = {
  id: string; volunteers: [string, string]; topicId: string; proposition: string;
  topicSource: string; version: string; pairingReason: string; createdAt: string;
  stage: 'pre' | 'briefing' | 'opening-a' | 'opening-b' | 'discussion' | 'joint' | 'post' | 'closed';
  condition?: 'treatment' | 'active_control'; allocationSeed?: string; allocationDraw?: number;
  allocatedAt?: string; allocationMethod?: string; firstSpeaker?: number; briefingVersion?: string; briefingText?: string;
  stageStartedAt: string; history: { stage: string; at: string; elapsedSeconds: number; note: string }[];
  notes: string; isTest: boolean; stoppedReason?: string;
};
export type ParticipantView = {
  label: string; screenDone: boolean; wave: Context['wave'] | null;
  message: string; context?: Context; completed: string[];
  pair?: { proposition: string; stage: PairRun['stage']; member: number; title: string };
};
export type PairAdminView = {
  volunteers: (Volunteer & { answers: Answers; paired: boolean })[];
  pairs: (PairRun & { labels: string[]; completions: Record<string, number> })[];
};
