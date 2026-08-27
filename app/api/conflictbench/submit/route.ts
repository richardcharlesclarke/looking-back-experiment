import { NextResponse } from "next/server";
import {
  BRUFEST_TOPICS,
  PROFILE_DIMENSIONS,
  type ConflictBenchResponses
} from "@/lib/conflictbench";
import { createConflictBenchSubmission } from "@/lib/conflictbench-store";

const REQUIRED_SCORES: Array<keyof ConflictBenchResponses> = [
  "position",
  "confidence",
  "issueComplexity",
  "legitimateConsiderations",
  "reasonableDisagreement",
  "opposingUnderstanding",
  "selfOtherCloseness",
  "willingnessConversation",
  "interestInDisagreement",
  "opennessToInfluence",
  "willingnessToChange",
  "changingMindSkill",
  "changingMindIdentity",
  "recallChangedMind",
  "influenceConversation",
  "remainCurious",
  "productiveWayForward"
];

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isRequiredText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isProfile(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return PROFILE_DIMENSIONS.every(({ key }) => isScore((value as Record<string, unknown>)[key]));
}

function isClosenessPosition(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const position = value as Record<string, unknown>;
  return isScore(position.x) && isScore(position.y);
}

export async function POST(request: Request) {
  let body: ConflictBenchResponses;
  try {
    body = (await request.json()) as ConflictBenchResponses;
  } catch {
    return NextResponse.json({ error: "The questionnaire response could not be read." }, { status: 400 });
  }

  if (!BRUFEST_TOPICS.some(({ slug }) => slug === body.topic)) {
    return NextResponse.json({ error: "Please select a Brufest topic." }, { status: 400 });
  }

  if (!isRequiredText(body.currentView, 3000) || !isRequiredText(body.opposingArgument, 3000)) {
    return NextResponse.json({ error: "Please complete both written reflections." }, { status: 400 });
  }

  if (body.changedMindAbout != null && typeof body.changedMindAbout !== "string") {
    return NextResponse.json({ error: "The optional reflection could not be read." }, { status: 400 });
  }

  if (body.changedMindAbout && body.changedMindAbout.trim().length > 1000) {
    return NextResponse.json({ error: "The optional reflection is too long." }, { status: 400 });
  }

  for (const key of REQUIRED_SCORES) {
    if (!isScore(body[key])) {
      return NextResponse.json({ error: `Missing or invalid score: ${key}.` }, { status: 400 });
    }
  }

  if (!isProfile(body.opponentProfile) || !isProfile(body.selfProfile)) {
    return NextResponse.json({ error: "Please complete every profile scale." }, { status: 400 });
  }

  if (!isClosenessPosition(body.selfOtherClosenessPosition)) {
    return NextResponse.json({ error: "Please position the opposing-view circle." }, { status: 400 });
  }

  const submission = await createConflictBenchSubmission(body);
  return NextResponse.json({
    id: submission.id,
    createdAt: submission.createdAt,
    questionnaireVersion: submission.questionnaireVersion
  });
}
