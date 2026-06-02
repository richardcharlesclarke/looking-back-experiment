import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export async function GET(request: Request) {
  const includeLegacy = new URL(request.url).searchParams.get("legacy") === "1";
  return NextResponse.json(await getStats({ includeLegacy }));
}
