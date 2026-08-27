import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminCookie } from "@/lib/admin";
import {
  deleteConflictBenchSubmissions,
  listConflictBenchSubmissions
} from "@/lib/conflictbench-store";

type CsvValue = string | number | boolean | null | undefined;

function flattenForCsv(value: unknown, prefix = "", output: Record<string, CsvValue> = {}) {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      flattenForCsv(nestedValue, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output[prefix] = Array.isArray(value) ? JSON.stringify(value) : value as CsvValue;
  return output;
}

function csvCell(value: CsvValue) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function submissionsToCsv(submissions: Awaited<ReturnType<typeof listConflictBenchSubmissions>>) {
  const rows = submissions.map((submission) => flattenForCsv({
    id: submission.id,
    createdAt: submission.createdAt,
    questionnaireVersion: submission.questionnaireVersion,
    responses: submission.responses,
    derivedMeasures: submission.derivedMeasures
  }));
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\n");
}

function hasAdminSession(value?: string) {
  return verifyAdminCookie(value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const submissions = await listConflictBenchSubmissions();
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const date = new Date().toISOString().slice(0, 10);
    return new Response(submissionsToCsv(submissions), {
      headers: {
        "Content-Disposition": `attachment; filename="brufest-conflictbench-responses-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store"
      }
    });
  }

  return NextResponse.json({ submissions });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "The selected responses could not be read." }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || !body.ids.length) {
    return NextResponse.json({ error: "Select at least one response to delete." }, { status: 400 });
  }

  if (body.ids.length > 5000 || !body.ids.every((id) => typeof id === "string" && UUID_PATTERN.test(id))) {
    return NextResponse.json({ error: "One or more selected responses were invalid." }, { status: 400 });
  }

  const deletedIds = await deleteConflictBenchSubmissions(body.ids);
  const submissions = await listConflictBenchSubmissions();
  return NextResponse.json({ deletedIds, submissions });
}
