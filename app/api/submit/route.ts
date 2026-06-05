import { NextResponse } from "next/server";
import {
  AGE_BANDS,
  ALIGNMENT_OPTIONS,
  CONFIGURED_COHORT_LABEL,
  CONFIGURED_COHORT_SLUG,
  GENDERS,
  LIFE_CHOICES,
  RATING_DIMENSIONS
} from "@/lib/constants";
import { createSubmission, getStats } from "@/lib/store";
import type { SubmissionInput } from "@/lib/types";

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeCohortSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,63}$/i.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as SubmissionInput;
  const cohortSlug = body.cohortSlug?.trim() || CONFIGURED_COHORT_SLUG;
  const cohortLabel = body.cohortLabel?.trim() || CONFIGURED_COHORT_LABEL;

  if (
    !isString(body.idealWord) ||
    !isString(body.guidingValue) ||
    !isString(body.alignment) ||
    !isString(body.blocker) ||
    !isString(body.enabler) ||
    !isString(body.lifeChoice)
  ) {
    return NextResponse.json({ error: "Missing required reflection fields." }, { status: 400 });
  }

  if (![...ALIGNMENT_OPTIONS].includes(body.alignment as never)) {
    return NextResponse.json({ error: "Unknown alignment answer." }, { status: 400 });
  }

  if (![...LIFE_CHOICES].includes(body.lifeChoice as never)) {
    return NextResponse.json({ error: "Unknown life choice." }, { status: 400 });
  }

  if (body.lifeChoice === "Other" && !isString(body.otherChoice)) {
    return NextResponse.json({ error: "Please name your other choice." }, { status: 400 });
  }

  const ratings = body.ratings ?? {};
  for (const dimension of RATING_DIMENSIONS) {
    const value = ratings[dimension];
    if (typeof value !== "number" || value < -2 || value > 2) {
      return NextResponse.json({ error: `Missing rating for ${dimension}.` }, { status: 400 });
    }
  }

  if (body.ageBand && ![...AGE_BANDS].includes(body.ageBand as never)) {
    return NextResponse.json({ error: "Unknown age band." }, { status: 400 });
  }

  if (body.gender && ![...GENDERS].includes(body.gender as never)) {
    return NextResponse.json({ error: "Unknown gender." }, { status: 400 });
  }

  if (cohortSlug && !isSafeCohortSlug(cohortSlug)) {
    return NextResponse.json({ error: "Unknown event cohort." }, { status: 400 });
  }

  const submission = await createSubmission({
    ...body,
    cohortSlug,
    cohortLabel: cohortSlug ? cohortLabel : undefined
  });
  const stats = await getStats({
    cohortSlug,
    cohortLabel
  });
  return NextResponse.json({ submission, stats });
}
