/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS HTTP test harness. */
const assert = require("node:assert/strict");
const {
  questions,
} = require("../.local/brufest-tests/lib/brufest/instruments.js");
const base = process.env.BRUFEST_TEST_URL || "http://127.0.0.1:3118";
let cookie = "";
async function request(route, body, admin = false) {
  const r = await fetch(base + route, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(admin ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
}
function filled(c) {
  const answers = {};
  for (let pass = 0; pass < 3; pass++)
    for (const q of questions(c, answers))
      if (answers[q.id] === undefined)
        answers[q.id] =
          q.type === "text"
            ? "Test: a clear account of the other person’s reason."
            : q.type === "multi"
              ? [q.options[0]]
              : q.type === "single"
                ? q.options[0]
                : 4;
  return answers;
}
(async () => {
  assert.equal((await request("/api/brufest/admin")).status, 401);
  const login = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "admin" }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  const created = await request(
    "/api/brufest/admin",
    {
      action: "create",
      study: "pairs",
      title: "Test: HTTP pair flow",
      proposition: "Local test proposition",
      speakers: ["Test A", "Test B"],
      isTest: true,
    },
    true,
  );
  assert.equal(created.status, 200);
  const s = created.body;
  const tokens = ["BF-HTTPAAAAAA01", "BF-HTTPBBBBBB01"];
  // Distinct run-specific codes avoid binding a prior test run.
  tokens[0] =
    "BF-" + require("crypto").randomBytes(6).toString("hex").toUpperCase();
  tokens[1] =
    "BF-" + require("crypto").randomBytes(6).toString("hex").toUpperCase();
  function body(i, wave) {
    const c = {
      study: "pairs",
      role: "participant",
      wave,
      session: s,
      member: i,
    };
    return {
      context: c,
      memberCode: s.memberCodes[i],
      participantToken: tokens[i],
      answers: filled(c),
      startedAt: new Date().toISOString(),
    };
  }
  assert.equal(
    (await request("/api/brufest/submit", body(0, "post"))).status,
    400,
  );
  for (let i = 0; i < 2; i++) {
    const b = body(i, "pre");
    const a = await request("/api/brufest/submit", b);
    assert.equal(a.status, 200, JSON.stringify(a));
    const again = await request("/api/brufest/submit", b);
    assert.equal(a.body.id, again.body.id);
  }
  for (const stage of ["briefing", "conversation", "post"])
    assert.equal(
      (
        await request(
          "/api/brufest/admin",
          { action: "stage", id: s.id, stage },
          true,
        )
      ).status,
      200,
    );
  assert.equal(
    (
      await request("/api/brufest/partner", {
        sessionId: s.id,
        memberCode: s.memberCodes[0],
        participantToken: tokens[0],
      })
    ).body.summary,
    null,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request("/api/brufest/submit", body(i, "post"))).status,
      200,
    );
  const partner = await request("/api/brufest/partner", {
    sessionId: s.id,
    memberCode: s.memberCodes[0],
    participantToken: tokens[0],
  });
  assert.match(partner.body.summary, /other person/);
  assert.equal(
    (
      await request("/api/brufest/partner", {
        sessionId: s.id,
        memberCode: "wrong",
        participantToken: tokens[0],
      })
    ).body.summary,
    null,
  );
  assert.equal(
    (await request("/api/brufest/submit", body(0, "joint"))).status,
    200,
  );
  assert.equal(
    (await request("/api/brufest/submit", body(1, "joint"))).status,
    400,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request("/api/brufest/submit", body(i, "partner"))).status,
      200,
    );
  const result = await request("/api/brufest/admin", undefined, true);
  assert.equal(
    result.body.submissions.filter((r) => r.context.session?.id === s.id)
      .length,
    7,
  );
  const csv = await fetch(base + "/api/brufest/admin?format=csv", {
    headers: { Cookie: cookie },
  });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /conflict_bench_v0.1/);
  const json = await fetch(base + "/api/brufest/admin?format=json", {
    headers: { Cookie: cookie },
  });
  const data = await json.json();
  assert.ok(!JSON.stringify(data).includes("memberCodes"));
  console.log(
    "HTTP checks passed: protected admin, allocation, matching, stage gates, retries, private summaries, pair records, CSV and JSON.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
