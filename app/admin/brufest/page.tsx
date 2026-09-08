"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Download, Plus } from "lucide-react";
import type { Session, State } from "@/lib/brufest/types";
import briefings from "@/lib/brufest/briefings.json";
import "../../brufest/brufest.css";
import "./facilitator.css";
const stages = ["pre", "briefing", "conversation", "post", "closed"] as const;
const stageLabels = {
  pre: "Before questions",
  briefing: "Briefing",
  conversation: "Conversation",
  post: "After questions",
  closed: "Closed",
};
export default function Facilitator() {
  const [data, setData] = useState<State | null>(null),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState("");
  const [study, setStudy] = useState<"panels" | "pairs">("panels"),
    [title, setTitle] = useState(""),
    [proposition, setProposition] = useState(""),
    [speakers, setSpeakers] = useState(""),
    [note, setNote] = useState(""),
    [origin, setOrigin] = useState(""),
    [copied, setCopied] = useState("");
  async function load() {
    const r = await fetch("/api/brufest/admin");
    if (r.status === 401) {
      setData(null);
      return;
    }
    if (!r.ok) throw new Error("Could not load sessions.");
    setData(await r.json());
  }
  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((e) => setError(e.message));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) throw new Error("Check your password.");
      setPassword("");
      setError("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/brufest/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await load();
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const session = data?.sessions.find((s) => s.id === selected);
  const records =
    data?.submissions.filter((s) => s.context.session?.id === selected) ?? [];
  function url(s: Session, wave: string, member?: number, role?: string) {
    const p = new URLSearchParams({
      session: s.id,
      wave,
      role: role ?? (s.study === "panels" ? "speaker" : "participant"),
    });
    if (member !== undefined) p.set("member", s.memberCodes[member]);
    return `${origin}/brufest/${s.study}?${p}`;
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setError("Select and copy the link manually.");
    }
  }
  return (
    <main className="bf-main">
      <header className="topbar">
        <Link className="mark" href="/">
          Initiatives at evolvable.me
        </Link>
        <Link href="/admin">Existing admin</Link>
      </header>
      <section className="bf-admin">
        <p className="eyebrow">Brufest / Facilitator</p>
        <h1>Make room for a conversation.</h1>
        {!data ? (
          <form className="bf-start" onSubmit={login}>
            <h2>Facilitator sign-in</h2>
            <label className="bf-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="primary" disabled={busy}>
              Sign in <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <>
            <div className="bf-admin-stats">
              <div>
                <strong>{data.sessions.length}</strong> sessions
              </div>
              <div>
                <strong>{data.submissions.length}</strong> saved questionnaires
              </div>
              <div>
                <strong>
                  {
                    new Set(data.submissions.map((s) => s.participantToken))
                      .size
                  }
                </strong>{" "}
                participants
              </div>
              <a href="/api/brufest/admin?format=csv">
                <Download size={16} /> Response CSV
              </a>
              <a href="/api/brufest/admin?format=json">
                <Download size={16} /> Full JSON
              </a>
            </div>
            <div className="bf-admin-grid">
              <aside>
                <h2>Sessions</h2>
                {data.sessions.map((s) => (
                  <button
                    className={`bf-session-button ${s.id === selected ? "selected" : ""}`}
                    key={s.id}
                    onClick={() => {
                      setSelected(s.id);
                      setNote(s.fidelity ?? "");
                    }}
                  >
                    <span>
                      {s.study === "panels" ? "Panel" : "Pair"}{" "}
                      {s.isTest ? "· Sample / test" : ""}
                    </span>
                    <strong>{s.title}</strong>
                    <small>{stageLabels[s.stage]}</small>
                  </button>
                ))}
                <details className="bf-create">
                  <summary>
                    <Plus size={16} /> Add a session
                  </summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const result = await mutate({
                        action: "create",
                        study,
                        title,
                        proposition,
                        speakers: speakers
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      });
                      if (result) {
                        setSelected(result.id);
                        setTitle("");
                        setSpeakers("");
                      }
                    }}
                  >
                    <label className="bf-label">
                      Type
                      <select
                        value={study}
                        onChange={(e) =>
                          setStudy(e.target.value as "panels" | "pairs")
                        }
                      >
                        <option value="panels">Panel</option>
                        <option value="pairs">Pair</option>
                      </select>
                    </label>
                    <label className="bf-label">
                      Session name
                      <input
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="A working name is fine"
                      />
                    </label>
                    <label className="bf-label">
                      Central proposition
                      <input
                        required
                        value={proposition}
                        onChange={(e) => setProposition(e.target.value)}
                        placeholder="The claim people will discuss"
                      />
                    </label>
                    <label className="bf-label">
                      {study === "panels"
                        ? "Speakers"
                        : "Two participant labels"}{" "}
                      — one per line
                      <textarea
                        required
                        rows={3}
                        value={speakers}
                        onChange={(e) => setSpeakers(e.target.value)}
                      />
                    </label>
                    <p className="bf-small">
                      Allocated automatically to the disagreement or neutral
                      briefing. Shared speakers stay in the same condition. Use
                      consistent speaker labels.
                    </p>
                    <button className="primary" disabled={busy}>
                      Create & allocate
                    </button>
                  </form>
                </details>
              </aside>
              <div>
                {session ? (
                  <>
                    <div className="bf-session-head">
                      <p className="eyebrow">
                        {session.study === "panels" ? "Panel" : "Pair"} /{" "}
                        {stageLabels[session.stage]}
                      </p>
                      <h2>{session.title}</h2>
                      <p>{session.proposition}</p>
                      <p className="bf-condition">
                        {session.condition === "treatment"
                          ? "Disagreement briefing"
                          : "Neutral briefing"}{" "}
                        · {session.briefingVersion}
                      </p>
                    </div>
                    <div className="bf-stage-steps">
                      {stages.map((s, i) => (
                        <span
                          key={s}
                          className={session.stage === s ? "active" : ""}
                        >
                          {i + 1}. {stageLabels[s]}
                        </span>
                      ))}
                    </div>
                    {session.stage !== "closed" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          mutate({
                            action: "stage",
                            id: session.id,
                            stage: stages[stages.indexOf(session.stage) + 1],
                          })
                        }
                      >
                        Open{" "}
                        {stageLabels[stages[stages.indexOf(session.stage) + 1]]}{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <p className="bf-small">
                      Only before answers are accepted during the first stage.
                      Open after questions when the conversation finishes.
                      Refresh this page to see newly completed forms.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => load().catch((e) => setError(e.message))}
                    >
                      Refresh completions
                    </button>
                    <h3>Participant links</h3>
                    {session.speakers.map((speaker, i) => (
                      <div key={i} className="bf-invite">
                        <strong>{speaker}</strong>
                        <span>
                          {session.participantTokens[i] || "Not joined yet"}
                        </span>
                        <div>
                          {[
                            "pre",
                            "post",
                            ...(session.study === "pairs"
                              ? ["joint", "partner"]
                              : []),
                          ].map((w) => (
                            <a
                              key={w}
                              href={url(session, w, i)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {w === "pre"
                                ? "Before"
                                : w === "post"
                                  ? "After"
                                  : w === "joint"
                                    ? "Joint record"
                                    : "Partner rating"}{" "}
                              ↗
                            </a>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(url(session, "pre", i))}
                        >
                          <Copy size={14} />
                          {copied === url(session, "pre", i)
                            ? "Copied"
                            : "Copy private link"}
                        </button>
                      </div>
                    ))}
                    {session.study === "panels" && (
                      <div className="bf-invite">
                        <strong>Audience links</strong>
                        <a
                          href={url(session, "pre", undefined, "audience")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Before ↗
                        </a>
                        <a
                          href={url(session, "post", undefined, "audience")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          After ↗
                        </a>
                        <button
                          onClick={() =>
                            copy(url(session, "pre", undefined, "audience"))
                          }
                        >
                          <Copy size={14} />
                          Copy audience link
                        </button>
                      </div>
                    )}
                    <details className="bf-script">
                      <summary>Read the assigned briefing</summary>
                      {briefings[session.condition].split("\n").map((s, i) => (
                        <p key={i}>{s}</p>
                      ))}
                    </details>
                    {session.study === "pairs" && (
                      <details className="bf-script">
                        <summary>
                          Conversation instructions & joint record
                        </summary>
                        <p>
                          {session.speakers[session.firstSpeaker]} opens first.
                          Each person gets two uninterrupted minutes, then eight
                          minutes of discussion. Give both conditions identical
                          instructions.
                        </p>
                        <p>
                          Afterwards, allow three minutes for the joint record:
                          the main disagreement, each person’s concern, a new
                          uncertainty, and a new question or proposal. “None
                          identified” is fine. Then complete private after
                          questions and partner ratings.
                        </p>
                      </details>
                    )}
                    <details className="bf-script">
                      <summary>Delivery note</summary>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        placeholder="Actual briefing duration, recording reference, or anything that changed…"
                      />
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          mutate({ action: "fidelity", id: session.id, note })
                        }
                      >
                        Save note
                      </button>
                    </details>
                    <h3>Completed forms</h3>
                    <div className="bf-records">
                      {records.length ? (
                        records.map((r) => (
                          <p key={r.id}>
                            <code>{r.participantToken}</code>
                            <span>
                              {r.context.role} / {r.context.wave}
                            </span>
                            <time>
                              {new Date(r.createdAt).toLocaleTimeString()}
                            </time>
                          </p>
                        ))
                      ) : (
                        <p>No completed forms yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bf-empty">
                    <h2>Choose a conversation.</h2>
                    <p>
                      Open a sample session to try the full flow, or create your
                      own. The original Looking Back and ConflictBench
                      experiments are separate.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <details className="bf-script">
              <summary>Screening responses — find people who disagree</summary>
              {data.submissions
                .filter((r) => r.context.wave === "screen")
                .map((r) => (
                  <p key={r.id}>
                    <code>{r.participantToken}</code> ·{" "}
                    {r.context.session?.proposition} · Position:{" "}
                    {String(r.answers.E3_SCREEN_POSITION ?? "—")} ·{" "}
                    {String(r.answers.E3_SCREEN_REASON ?? "")} · Willing:{" "}
                    {String(r.answers.E3_SCREEN_WILLING ?? "—")}
                  </p>
                ))}
              <p>
                Use the positions and reasons to pair willing participants with
                a real difference. Create a pair session and give each person
                their own link; they should retain the same return code.
              </p>
            </details>
          </>
        )}
        {error && (
          <p className="bf-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
