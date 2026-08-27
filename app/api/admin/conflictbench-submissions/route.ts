import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminCookie } from "@/lib/admin";
import { listConflictBenchSubmissions } from "@/lib/conflictbench-store";

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

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminCookie(cookieStore.get(COOKIE_NAME)?.value)) {
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
