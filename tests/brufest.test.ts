import test from "node:test";
import assert from "node:assert/strict";
import {
  questions,
  validateAnswers,
  answerError,
  VERSION,
} from "../lib/brufest/instruments";
import {
  makeSession,
  saveResponse,
  changeStage,
  partnerText,
  publicSession,
} from "../lib/brufest/store";
import { csv, exportRows } from "../lib/brufest/export";
import type { Answers, Context, Session, State } from "../lib/brufest/types";
const fresh = (): State => ({ sessions: [], submissions: [] });
function setup(study: "panels" | "pairs" = "pairs") {
  const state = fresh();
  const session = makeSession(
    {
      study,
      title: "Test",
      proposition: "A neutral test proposition",
      speakers: ["A", "B"],
      isTest: true,
    },
    state,
  );
  state.sessions.push(session);
  return { state, session };
}
function fill(ctx: Context): Answers {
  const answers: Answers = {};
  for (let pass = 0; pass < 3; pass++)
    for (const q of questions(ctx, answers))
      if (answers[q.id] === undefined)
        answers[q.id] =
          q.type === "text"
            ? "A considered reason"
            : q.type === "multi"
              ? [q.options![0]]
              : q.type === "single"
                ? q.options![0]
                : 4;
  return answers;
}
function body(
  session: Session,
  member: number,
  wave: Context["wave"] = "pre",
  token = member ? "BF-BBBBBBBBBBBB" : "BF-AAAAAAAAAAAA",
) {
  const ctx: Context = {
    study: session.study,
    role: session.study === "panels" ? "speaker" : "participant",
    wave,
    session: publicSession(session),
    member,
  };
  return {
    participantToken: token,
    context: ctx,
    memberCode: session.memberCodes[member],
    answers: fill(ctx),
    startedAt: new Date().toISOString(),
  };
}
test("every role and wave renders a complete, unique question set, including extended forms", () => {
  const { session } = setup();
  const contexts: Context[] = [
    ...(["pre", "post", "followup"] as const).map((wave) => ({
      study: "festival" as const,
      role: "attendee" as const,
      wave,
    })),
    ...(["pre", "post"] as const).flatMap((wave) =>
      (["speaker", "audience"] as const).map((role) => ({
        study: "panels" as const,
        role,
        wave,
        session: publicSession({ ...session, study: "panels" }),
        member: 0,
      })),
    ),
    ...(["screen", "pre", "post", "joint", "partner"] as const).map((wave) => ({
      study: "pairs" as const,
      role: "participant" as const,
      wave,
      session: publicSession(session),
      member: 0,
    })),
  ];
  for (const c of contexts)
    for (const extended of [false, true]) {
      const ctx = { ...c, extended };
      const q = questions(ctx);
      assert.ok(q.length);
      assert.equal(new Set(q.map((x) => x.id)).size, q.length);
      for (const item of q) assert.ok(item.prompt?.length);
      validateAnswers(ctx, fill(ctx));
    }
});
test("repeated questions preserve exact wording, types and anchors across waves", () => {
  for (const study of ["festival", "panels", "pairs"] as const) {
    const { session } = setup(study === "panels" ? "panels" : "pairs");
    const c: Context = {
      study,
      role:
        study === "festival"
          ? "attendee"
          : study === "panels"
            ? "speaker"
            : "participant",
      wave: "pre",
      session: study === "festival" ? undefined : publicSession(session),
      member: 0,
    };
    const a = questions(c),
      b = questions({ ...c, wave: "post" });
    let matches = 0;
    for (const q of a) {
      const other = b.find((x) => x.id === q.id);
      if (other) {
        assert.deepEqual(other, q);
        matches++;
      }
    }
    assert.ok(matches >= 6);
  }
});
test("zero and continuous values survive; missing and invalid values are distinct", () => {
  const q = questions({ study: "festival", role: "attendee", wave: "pre" });
  assert.ok(answerError(q[0], undefined));
  assert.ok(answerError(q[0], 4.5));
  assert.equal(answerError(q[0], { missing: "prefer_not" }), null);
  const { session } = setup();
  const c: Context = {
    study: "pairs",
    role: "participant",
    wave: "pre",
    session: publicSession(session),
    member: 0,
  };
  const a = fill(c);
  a.E3_POSITION = 7.1;
  a.E3_CONFIDENCE = 0;
  const result = validateAnswers(c, a);
  assert.equal(result.answers.E3_POSITION, 7.1);
  assert.equal(result.answers.E3_CONFIDENCE, 0);
  a.E3_POSITION = Infinity;
  assert.throws(() => validateAnswers(c, a));
});
test("branching exposure rows and exclusive answers are validated server-side", () => {
  const c: Context = { study: "festival", role: "attendee", wave: "post" };
  const a = fill(c);
  a.E1_POST_SESSIONS = ["Sample: Panel A"];
  assert.throws(() => validateAnswers(c, a));
  a.EXPOSURE_1_portion = "All";
  a.EXPOSURE_1_role = "Listen/watch";
  a.E1_POST_KEYNOTE = "No";
  validateAnswers(c, a);
  a.E1_POST_CHANGE = ["No meaningful change", "Something else"];
  assert.throws(() => validateAnswers(c, a));
});
test("pair allocation, identity, private summaries, retries and stage changes work end to end", () => {
  const { state, session } = setup();
  const a = body(session, 0),
    b = body(session, 1);
  assert.throws(() => changeStage(state, session.id, "post"));
  assert.throws(() => changeStage(state, session.id, "briefing"));
  assert.throws(() => saveResponse(state, { ...a, memberCode: "invalid" }));
  const saved = saveResponse(state, a);
  assert.equal(saveResponse(state, a).id, saved.id);
  assert.equal(state.submissions.length, 1);
  assert.throws(() =>
    saveResponse(state, { ...b, participantToken: a.participantToken }),
  );
  saveResponse(state, b);
  changeStage(state, session.id, "briefing");
  assert.equal(saveResponse(state, a).duplicate, true);
  changeStage(state, session.id, "conversation");
  changeStage(state, session.id, "post");
  assert.equal(partnerText(state, session, 0, a.participantToken), null);
  const postA = body(session, 0, "post"),
    postB = body(session, 1, "post");
  postB.answers.E3_OTHER_REASON = "A values access more than quiet.";
  saveResponse(state, postA);
  assert.equal(partnerText(state, session, 0, a.participantToken), null);
  saveResponse(state, postB);
  assert.equal(
    partnerText(state, session, 0, a.participantToken),
    "A values access more than quiet.",
  );
  assert.equal(partnerText(state, session, 0, b.participantToken), null);
  saveResponse(state, body(session, 0, "partner"));
  saveResponse(state, body(session, 0, "joint"));
  assert.throws(() => saveResponse(state, body(session, 1, "joint")));
  assert.equal(state.submissions[0].condition, session.condition);
  assert.equal(state.submissions[0].instrumentVersion, VERSION);
  changeStage(state, session.id, "closed");
  assert.throws(() => changeStage(state, session.id, "pre"));
});
test("public session data never contains allocation, private keys or participant identifiers", () => {
  const { session } = setup();
  const p = JSON.stringify(publicSession(session));
  assert.ok(!p.includes("condition"));
  assert.ok(!p.includes(session.memberCodes[0]));
  assert.ok(!p.includes("participantTokens"));
});
test("shared speakers retain assignment; bridging conflicting panels is rejected", () => {
  const { state, session } = setup("panels");
  const other = makeSession(
    {
      study: "panels",
      title: "Another",
      proposition: "Claim",
      speakers: ["B", "C"],
    },
    state,
  );
  assert.equal(other.condition, session.condition);
  state.sessions.push(other);
  const third = makeSession(
    {
      study: "panels",
      title: "Third",
      proposition: "Claim",
      speakers: ["C", "D"],
    },
    state,
  );
  assert.equal(third.condition, session.condition);
  const opposite = {
    ...third,
    id: "opposite",
    speakers: ["X", "Y"],
    condition:
      session.condition === "treatment"
        ? ("active_control" as const)
        : ("treatment" as const),
  };
  state.sessions.push(opposite);
  assert.throws(() =>
    makeSession(
      {
        study: "panels",
        title: "Bridge",
        proposition: "Claim",
        speakers: ["A", "X"],
      },
      state,
    ),
  );
});
test("export retains version, zero, missing, question text and neutralises spreadsheet formulas", () => {
  const { state, session } = setup();
  const b = body(session, 0);
  b.answers.E3_CONFIDENCE = 0;
  b.answers.E3_POSITION = { missing: "cannot_assess" };
  b.answers.E3_OWN_REASON = '=HYPERLINK("bad")';
  saveResponse(state, b);
  const rows = exportRows(state);
  assert.equal(rows.find((r) => r.itemId === "E3_CONFIDENCE")?.numeric, 0);
  assert.equal(
    rows.find((r) => r.itemId === "E3_POSITION")?.missingReason,
    "cannot_assess",
  );
  assert.ok(csv(rows).includes("'=HYPERLINK"));
  assert.ok(rows.every((r) => r.instrumentVersion === VERSION));
});
