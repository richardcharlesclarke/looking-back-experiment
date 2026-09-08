import { Pool } from "pg";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type {
  Context,
  PublicSession,
  Session,
  State,
  Submission,
} from "./types";
import { VERSION, validateAnswers, validFlow } from "./instruments";

type Runtime = { queue: Promise<unknown>; pool?: Pool };
const root = globalThis as typeof globalThis & { brufestRuntime?: Runtime };
const runtime = (root.brufestRuntime ??= { queue: Promise.resolve() });
root.brufestRuntime = runtime;
const localFile = path.resolve(
  process.env.BRUFEST_STORE_PATH || ".local/brufest-pilot.json",
);
export function ready() {
  return (
    process.env.NODE_ENV !== "production" ||
    (process.env.BRUFEST_READY === "true" && !!process.env.DATABASE_URL)
  );
}
export function preview() {
  return process.env.BRUFEST_READY !== "true";
}
const empty = (): State => ({ sessions: [], submissions: [] });
export async function transact<T>(
  fn: (state: State) => T | Promise<T>,
): Promise<T> {
  const work = async () => {
    if (process.env.DATABASE_URL) {
      runtime.pool ??= new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
      });
      const db = await runtime.pool.connect();
      try {
        await db.query(
          "CREATE TABLE IF NOT EXISTS brufest_pilot_state (id integer PRIMARY KEY, data jsonb NOT NULL)",
        );
        await db.query("BEGIN");
        await db.query(
          "INSERT INTO brufest_pilot_state (id,data) VALUES (1,$1) ON CONFLICT DO NOTHING",
          [JSON.stringify(empty())],
        );
        const r = await db.query(
          "SELECT data FROM brufest_pilot_state WHERE id=1 FOR UPDATE",
        );
        const state = r.rows[0].data as State;
        const result = await fn(state);
        await db.query("UPDATE brufest_pilot_state SET data=$1 WHERE id=1", [
          JSON.stringify(state),
        ]);
        await db.query("COMMIT");
        return result;
      } catch (e) {
        await db.query("ROLLBACK");
        throw e;
      } finally {
        db.release();
      }
    }
    if (process.env.NODE_ENV === "production")
      throw new Error("The new studies are not open for responses yet.");
    let state: State;
    try {
      state = JSON.parse(await readFile(localFile, "utf8")) as State;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      state = empty();
    }
    const result = await fn(state);
    await mkdir(path.dirname(localFile), { recursive: true });
    const temporary = `${localFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(temporary, localFile);
    return result;
  };
  const promise = runtime.queue.then(work, work);
  runtime.queue = promise.catch(() => undefined);
  return promise;
}
export const publicSession = (s: Session): PublicSession => ({
  id: s.id,
  study: s.study,
  title: s.title,
  proposition: s.proposition,
  speakers: s.speakers,
  stage: s.stage,
  isTest: s.isTest,
});
export function makeSession(input: unknown, state: State): Session {
  if (!input || typeof input !== "object") throw new Error("Enter a session.");
  const b = input as Record<string, unknown>;
  if (!["panels", "pairs"].includes(String(b.study)))
    throw new Error("Choose panel or pair.");
  if (
    typeof b.title !== "string" ||
    !b.title.trim() ||
    b.title.length > 160 ||
    typeof b.proposition !== "string" ||
    !b.proposition.trim() ||
    b.proposition.length > 500
  )
    throw new Error("Add a title and a central proposition.");
  if (
    !Array.isArray(b.speakers) ||
    b.speakers.length < 2 ||
    b.speakers.length > 8 ||
    b.speakers.some(
      (s) => typeof s !== "string" || !s.trim() || s.length > 80,
    ) ||
    new Set(b.speakers.map((s) => String(s).trim().toLowerCase())).size !==
      b.speakers.length
  )
    throw new Error("Use 2–8 distinct participant labels.");
  if (b.study === "pairs" && b.speakers.length !== 2)
    throw new Error("This pilot uses pairs: enter exactly two labels.");
  const speakers = (b.speakers as string[]).map((s) => s.trim());
  const linked = state.sessions.filter(
    (s) =>
      b.study === "panels" &&
      s.study === "panels" &&
      s.speakers.some((x) =>
        speakers.some((y) => x.toLowerCase() === y.toLowerCase()),
      ),
  );
  const conditions = new Set(linked.map((s) => s.condition));
  if (conditions.size > 1)
    throw new Error(
      "These speakers connect panels in different conditions. Use a different panel selection to avoid contamination.",
    );
  const draw = randomInt(0, 2);
  const id = randomUUID();
  const contaminationGroupId = linked[0]?.contaminationGroupId ?? linked[0]?.id ?? id;
  const merging = new Set(linked.map(s => s.contaminationGroupId ?? s.id));
  for (const existing of state.sessions) {
    if (merging.has(existing.contaminationGroupId ?? existing.id)) existing.contaminationGroupId = contaminationGroupId;
  }
  return {
    id,
    contaminationGroupId,
    study: b.study as Session["study"],
    title: b.title.trim(),
    proposition: b.proposition.trim(),
    speakers,
    memberCodes: speakers.map(() => randomBytes(12).toString("hex")),
    participantTokens: speakers.map(() => ""),
    condition: linked[0]?.condition ?? (draw ? "treatment" : "active_control"),
    stage: "pre",
    createdAt: new Date().toISOString(),
    isTest: b.isTest === true || preview(),
    allocationDraw: linked.length ? -1 : draw,
    briefingVersion: "brufest-briefing-v0.1",
    firstSpeaker: randomInt(0, speakers.length),
  };
}
export function seedDemo(state: State) {
  if (!preview() || state.sessions.length) return;
  for (const study of ["panels", "pairs"] as const) {
    const s = makeSession(
      {
        study,
        title:
          study === "panels"
            ? "Sample panel — a different point of view"
            : "Sample pair conversation",
        proposition:
          "Public spaces should prioritise quiet over organised events.",
        speakers:
          study === "panels"
            ? ["Sample speaker A", "Sample speaker B", "Sample speaker C"]
            : ["Participant A", "Participant B"],
        isTest: true,
      },
      state,
    );
    s.id = study === "panels" ? "sample-panel" : "sample-pair";
    state.sessions.push(s);
  }
}
export async function listPublic() {
  return transact((state) => {
    seedDemo(state);
    return state.sessions.map(publicSession);
  });
}
function canonicalContext(
  raw: unknown,
  state: State,
  memberCode: unknown,
): { ctx: Context; session?: Session } {
  if (!raw || typeof raw !== "object") throw new Error("Choose a study.");
  const b = raw as Context;
  if (
    !["festival", "panels", "pairs"].includes(b.study) ||
    !validFlow(b.study, b.role, b.wave)
  )
    throw new Error("Choose a valid questionnaire.");
  if (b.study === "festival")
    return { ctx: { study: b.study, role: b.role, wave: b.wave } };
  const session = state.sessions.find(
    (s) => s.id === b.session?.id && s.study === b.study,
  );
  if (!session) throw new Error("This session could not be found.");
  let member: number | undefined;
  if (b.role === "speaker" || (b.study === "pairs" && b.wave !== "screen")) {
    member = session.memberCodes.indexOf(
      typeof memberCode === "string" ? memberCode : "",
    );
    if (member < 0)
      throw new Error(
        "Use the private participant link supplied by your facilitator.",
      );
  }
  return {
    ctx: {
      study: b.study,
      role: b.role,
      wave: b.wave,
      session: publicSession(session),
      member,
      extended: b.extended === true,
    },
    session,
  };
}
export function saveResponse(
  state: State,
  raw: unknown,
): { id: string; duplicate: boolean } {
  if (!raw || typeof raw !== "object")
    throw new Error("Response could not be read.");
  const b = raw as Record<string, unknown>;
  if (
    typeof b.participantToken !== "string" ||
    !/^BF-[A-Z0-9]{12}$/.test(b.participantToken)
  )
    throw new Error("Use your participant code.");
  const { ctx, session } = canonicalContext(b.context, state, b.memberCode);
  const token = b.participantToken;
  const previous = state.submissions.find(
    (s) =>
      s.participantToken === token &&
      s.context.study === ctx.study &&
      s.context.role === ctx.role &&
      s.context.wave === ctx.wave &&
      s.context.session?.id === ctx.session?.id &&
      s.context.member === ctx.member,
  );
  if (previous) return { id: previous.id, duplicate: true };
  if (session) {
    if (session.stage === "closed") throw new Error("This session is closed.");
    if (ctx.wave === "pre" && session.stage !== "pre")
      throw new Error("The before questionnaire is now closed.");
    if (
      ["post", "joint", "partner"].includes(ctx.wave) &&
      session.stage !== "post"
    )
      throw new Error(
        "The after questionnaire opens when the conversation finishes.",
      );
    if (ctx.member !== undefined) {
      const bound = session.participantTokens[ctx.member];
      if (bound && bound !== token)
        throw new Error(
          "This participant link is already linked to a different participant code.",
        );
      if (!bound && ctx.wave !== "pre")
        throw new Error(
          "Complete the before questionnaire using this participant link first.",
        );
      if (
        ctx.wave === "pre" &&
        session.participantTokens.some(
          (t, i) => t === token && i !== ctx.member,
        )
      )
        throw new Error("Each participant needs their own code.");
      if (
        ctx.wave === "pre" &&
        ctx.study === "pairs" &&
        state.submissions.some(
          (s) =>
            s.context.study === "pairs" &&
            s.context.wave === "pre" &&
            s.participantToken === token &&
            s.context.session?.id !== session.id,
        )
      )
        throw new Error("You have already joined a pair conversation.");
    }
    if (
      ctx.wave === "joint" &&
      state.submissions.some(
        (s) =>
          s.context.wave === "joint" && s.context.session?.id === session.id,
      )
    )
      throw new Error("Your pair’s joint record has already been saved.");
    if (ctx.wave === "partner") {
      const partner = partnerText(state, session, ctx.member!, token);
      if (!partner)
        throw new Error(
          "Both people need to finish their private after questions first.",
        );
      ctx.partnerSummary = partner;
    }
  }
  const { answers, questions } = validateAnswers(ctx, b.answers);
  if (
    typeof b.startedAt !== "string" ||
    !Number.isFinite(Date.parse(b.startedAt)) ||
    Date.parse(b.startedAt) > Date.now() + 60000
  )
    throw new Error("The start time could not be read.");
  const id = randomUUID();
  const submission: Submission = {
    id,
    participantToken: token,
    context: ctx,
    answers,
    instrumentVersion: VERSION,
    createdAt: new Date().toISOString(),
    startedAt: b.startedAt,
    displayOrder: questions.map((q) => q.id),
    isTest: preview() || session?.isTest === true,
    condition: session?.condition,
    briefingVersion: session?.briefingVersion,
  };
  state.submissions.push(submission);
  if (
    session &&
    ctx.member !== undefined &&
    !session.participantTokens[ctx.member]
  )
    session.participantTokens[ctx.member] = token;
  return { id, duplicate: false };
}
export function partnerText(
  state: State,
  session: Session,
  member: number,
  token: string,
): string | null {
  if (member < 0 || session.participantTokens[member] !== token) return null;
  const own = state.submissions.find(
    (s) =>
      s.context.session?.id === session.id &&
      s.context.wave === "post" &&
      s.participantToken === token,
  );
  const other = state.submissions.find(
    (s) =>
      s.context.session?.id === session.id &&
      s.context.wave === "post" &&
      s.participantToken === session.participantTokens[member === 0 ? 1 : 0],
  );
  if (!own || !other) return null;
  const value = other.answers.E3_OTHER_REASON;
  return typeof value === "string" && value.trim()
    ? value
    : "Your partner chose not to provide a written summary. You can select “Cannot assess”.";
}
export function changeStage(state: State, id: unknown, stage: unknown) {
  const s = state.sessions.find((s) => s.id === id);
  if (!s) throw new Error("Session not found.");
  const stages = ["pre", "briefing", "conversation", "post", "closed"] as const;
  const current = stages.indexOf(s.stage),
    next = stages.indexOf(stage as Session["stage"]);
  if (next !== current + 1)
    throw new Error(
      "Advance one stage at a time; completed stages cannot be reopened.",
    );
  if (
    s.study === "pairs" &&
    stage === "briefing" &&
    s.participantTokens.some((t) => !t)
  )
    throw new Error(
      "Both participants must finish their before questions first.",
    );
  s.stage = stage as Session["stage"];
  return s;
}
