import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const includeLegacy = searchParams.get("legacy") === "1";
  const cohortSlug = searchParams.get("cohort") || undefined;
  const cohortLabel = searchParams.get("cohortLabel") || undefined;
  return NextResponse.json(await getStats({ includeLegacy, cohortSlug, cohortLabel }));
}
