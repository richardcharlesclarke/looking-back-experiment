import { NextRequest, NextResponse } from "next/server";
import {
  CONFLICTBENCH_TRANSCRIPTION_SESSION_LIMIT,
  CONFLICTBENCH_TRANSCRIPTION_SESSION_WINDOW_MS
} from "@/lib/conflictbench-transcription";
import {
  ConflictBenchTranscriptionConfigurationError,
  createConflictBenchTranscriptionClientSecret
} from "@/lib/conflictbench-transcription-server";

export const runtime = "nodejs";

type RateLimitStore = Map<string, number[]>;
const MAX_RATE_LIMIT_CLIENTS = 5_000;

const globalForTranscriptionRateLimit = globalThis as typeof globalThis & {
  conflictBenchTranscriptionRateLimit?: RateLimitStore;
};

const rateLimitStore = globalForTranscriptionRateLimit.conflictBenchTranscriptionRateLimit
  ?? new Map<string, number[]>();
globalForTranscriptionRateLimit.conflictBenchTranscriptionRateLimit = rateLimitStore;

function json(body: unknown, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function parseClientId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clientId = value.trim();
  return /^[A-Za-z0-9_-]{16,128}$/.test(clientId) ? clientId : null;
}

function reserveSession(clientId: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  release: () => void;
} {
  const now = Date.now();
  const windowStart = now - CONFLICTBENCH_TRANSCRIPTION_SESSION_WINDOW_MS;

  for (const [key, timestamps] of rateLimitStore) {
    const recent = timestamps.filter((timestamp) => timestamp > windowStart);
    if (recent.length === 0) rateLimitStore.delete(key);
    else if (recent.length !== timestamps.length) rateLimitStore.set(key, recent);
  }

  if (!rateLimitStore.has(clientId) && rateLimitStore.size >= MAX_RATE_LIMIT_CLIENTS) {
    const oldestClientId = rateLimitStore.keys().next().value;
    if (typeof oldestClientId === "string") rateLimitStore.delete(oldestClientId);
  }

  const recent = (rateLimitStore.get(clientId) ?? []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= CONFLICTBENCH_TRANSCRIPTION_SESSION_LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + CONFLICTBENCH_TRANSCRIPTION_SESSION_WINDOW_MS - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds, release: () => undefined };
  }

  const reservationTimestamp = now;
  rateLimitStore.set(clientId, [...recent, reservationTimestamp]);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    release: () => {
      const current = rateLimitStore.get(clientId) ?? [];
      const next = current.filter((timestamp) => timestamp !== reservationTimestamp);
      if (next.length === 0) rateLimitStore.delete(clientId);
      else rateLimitStore.set(clientId, next);
    }
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { clientId?: unknown } | null;
  const clientId = parseClientId(body?.clientId);
  if (!clientId) {
    return json({ error: "Invalid live transcription request." }, 400);
  }

  const reservation = reserveSession(clientId);
  if (!reservation.allowed) {
    return json(
      { error: "Voice transcription limit reached. Please try again later." },
      429,
      { "Retry-After": String(reservation.retryAfterSeconds) }
    );
  }

  try {
    const credential = await createConflictBenchTranscriptionClientSecret({ clientId });
    return json(credential);
  } catch (error) {
    reservation.release();
    if (error instanceof ConflictBenchTranscriptionConfigurationError) {
      console.error("[conflictbench-transcription] Missing server configuration");
      return json({ error: "Voice transcription is not configured." }, 503);
    }
    console.error("[conflictbench-transcription] Client-secret creation failed", {
      error: error instanceof Error ? error.message : "unknown error"
    });
    return json({ error: "Could not start voice transcription." }, 502);
  }
}
