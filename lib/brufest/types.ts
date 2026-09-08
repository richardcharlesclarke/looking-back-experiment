export type Study = "festival" | "panels" | "pairs";
export type Wave = "pre" | "post" | "followup" | "screen" | "joint" | "partner";
export type Role = "attendee" | "speaker" | "audience" | "participant";
export type Answer =
  | number
  | string
  | string[]
  | { missing: "prefer_not" | "cannot_assess" | "not_applicable" };
export type Answers = Record<string, Answer>;
export type Question = {
  id: string;
  prompt: string;
  type: "likert" | "continuous" | "scale" | "single" | "multi" | "text";
  bands?: string[];
  options?: string[];
  min?: number;
  max?: number;
  low?: string;
  high?: string;
  required?: boolean;
  limit?: number;
  exclusive?: string[];
  reverse?: boolean;
  construct?: string;
  section: string;
  target?: string;
};
export type Session = {
  id: string;
  study: "panels" | "pairs";
  title: string;
  proposition: string;
  speakers: string[];
  memberCodes: string[];
  participantTokens: string[];
  condition: "treatment" | "active_control";
  stage: "pre" | "briefing" | "conversation" | "post" | "closed";
  createdAt: string;
  isTest: boolean;
  allocationDraw: number;
  contaminationGroupId?: string;
  briefingVersion: string;
  fidelity?: string;
  firstSpeaker: number;
};
export type PublicSession = Pick<
  Session,
  "id" | "study" | "title" | "proposition" | "speakers" | "stage" | "isTest"
>;
export type Context = {
  festivalVersion?: string;
  responseInstrument?: string;
  screeningBank?: string;
  study: Study;
  role: Role;
  wave: Wave;
  session?: PublicSession;
  member?: number;
  extended?: boolean;
  partnerSummary?: string;
};
export type Submission = {
  id: string;
  participantToken: string;
  context: Context;
  answers: Answers;
  instrumentVersion: string;
  createdAt: string;
  startedAt: string;
  displayOrder: string[];
  isTest: boolean;
  condition?: Session["condition"];
  briefingVersion?: string;
};
export type State = { sessions: Session[]; submissions: Submission[]; volunteers?: import('./pair-types').Volunteer[]; pairs?: import('./pair-types').PairRun[] };
