import { createHash } from "node:crypto";
import {
  CONFLICTBENCH_TRANSCRIPTION_CREDENTIAL_TTL_SECONDS,
  CONFLICTBENCH_TRANSCRIPTION_MODEL
} from "@/lib/conflictbench-transcription";

type OpenAIClientSecretResponse = {
  value?: unknown;
  expires_at?: unknown;
};

export class ConflictBenchTranscriptionConfigurationError extends Error {}

export function buildConflictBenchSafetyIdentifier(clientId: string): string {
  return createHash("sha256")
    .update(`evolvable:conflictbench-transcription:${clientId}`)
    .digest("hex");
}
function getTranscriptionApiKey(): string {
  const dedicatedKey = process.env.OPENAI_TRANSCRIPTION_API_KEY?.trim();
  if (dedicatedKey) return dedicatedKey;

  const projectKey = process.env.OPENAI_API_KEY?.trim();
  if (projectKey) return projectKey;

  throw new ConflictBenchTranscriptionConfigurationError("ConflictBench transcription is not configured.");
}

export async function createConflictBenchTranscriptionClientSecret({
  clientId
}: {
  clientId: string;
}): Promise<{
  clientSecret: string;
  expiresAt: number;
  model: typeof CONFLICTBENCH_TRANSCRIPTION_MODEL;
}> {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTranscriptionApiKey()}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": buildConflictBenchSafetyIdentifier(clientId)
    },
    body: JSON.stringify({
      expires_after: {
        anchor: "created_at",
        seconds: CONFLICTBENCH_TRANSCRIPTION_CREDENTIAL_TTL_SECONDS
      },
      session: {
        type: "transcription",
        audio: {
          input: {
            transcription: {
              model: CONFLICTBENCH_TRANSCRIPTION_MODEL,
              prompt: "A concise first-person response to a pre-festival questionnaire about disagreement, perspective-taking, and changing one's mind.",
              keywords: ["Evolvable", "ConflictBench", "Brewfest"],
              delay: "low"
            },
            turn_detection: null
          }
        }
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as {
      error?: { code?: unknown; message?: unknown; param?: unknown };
    } | null;
    const code = typeof errorBody?.error?.code === "string" ? errorBody.error.code : "unknown";
    const param = typeof errorBody?.error?.param === "string" ? errorBody.error.param : "unknown";
    const message = typeof errorBody?.error?.message === "string"
      ? errorBody.error.message
      : "No error detail returned.";
    throw new Error(
      `OpenAI client-secret request failed with status ${response.status} (${code}, ${param}): ${message}`
    );
  }

  const body = await response.json().catch(() => null) as OpenAIClientSecretResponse | null;
  if (
    !body
    || typeof body.value !== "string"
    || !body.value
    || typeof body.expires_at !== "number"
    || !Number.isInteger(body.expires_at)
    || body.expires_at <= 0
  ) {
    throw new Error("OpenAI returned an invalid client-secret response.");
  }

  return {
    clientSecret: body.value,
    expiresAt: body.expires_at,
    model: CONFLICTBENCH_TRANSCRIPTION_MODEL
  };
}
