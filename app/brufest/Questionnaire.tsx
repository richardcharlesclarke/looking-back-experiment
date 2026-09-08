"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  STUDIES,
  questions,
  answerError,
  VERSION,
} from "@/lib/brufest/instruments";
import type {
  Answers,
  Context,
  PublicSession,
  Question as Item,
  Role,
  Study,
  Wave,
} from "@/lib/brufest/types";
import Question from "./Question";
const WAVE_LABEL: Record<Wave, string> = {
  pre: "Before",
  post: "After",
  followup: "A little later",
  screen: "Participant screening questionnaire",
  joint: "Joint discussion record",
  partner: "Check your partner’s description",
};
function groups(items: Item[]) {
  const pages: { title: string; items: Item[] }[] = [];
  for (const item of items) {
    const p = pages[pages.length - 1];
    if (!p || p.title !== item.section || p.items.length === 4)
      pages.push({ title: item.section, items: [item] });
    else p.items.push(item);
  }
  return pages;
}
export default function Questionnaire({ study }: { study: Study }) {
  const info = STUDIES[study];
  const [sessions, setSessions] = useState<PublicSession[]>([]),
    [preview, setPreview] = useState(false),
    [sampleCodes, setSampleCodes] = useState<Record<string, string[]>>({});
  const [role, setRole] = useState<Role>(
    study === "festival"
      ? "attendee"
      : study === "panels"
        ? "audience"
        : "participant",
  );
  const [wave, setWave] = useState<Wave>("pre"),
    [sessionId, setSessionId] = useState(""),
    [memberCode, setMemberCode] = useState(""),
    [token, setToken] = useState("");
  const [ctx, setCtx] = useState<Context | null>(null),
    [answers, setAnswers] = useState<Answers>({}),
    [page, setPage] = useState(0),
    [startedAt, setStartedAt] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false),
    [storageNote, setStorageNote] = useState(""),
    [copied, setCopied] = useState(false),
    [extended, setExtended] = useState(false);
  const session = sessions.find((s) => s.id === sessionId);
  const items = ctx ? questions(ctx, answers) : [],
    pages = groups(items),
    current = pages[Math.min(page, pages.length - 1)];
  const draftKey = ctx
    ? `brufest:${VERSION}:${token}:${study}:${ctx.role}:${ctx.wave}:${ctx.session?.id ?? ""}:${ctx.member ?? ""}`
    : "";
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const w = p.get("wave") as Wave,
      r = p.get("role") as Role;
    if (w && Object.keys(WAVE_LABEL).includes(w)) setWave(w);
    if (r && ["attendee", "speaker", "audience", "participant"].includes(r))
      setRole(r);
    setSessionId(p.get("session") ?? "");
    setMemberCode(p.get("member") ?? "");
    let saved = "";
    try {
      saved = localStorage.getItem("brufest-participant") ?? "";
    } catch {
      setStorageNote("This browser cannot keep a return code. Please copy it.");
    }
    setToken(
      saved ||
        `BF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
    );
    fetch("/api/brufest/context")
      .then(async (r) => {
        if (!r.ok) throw new Error("Sessions could not be loaded.");
        return r.json();
      })
      .then((data) => {
        setSessions(data.sessions);
        setPreview(data.preview);
        setSampleCodes(data.sampleCodes ?? {});
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!ctx || complete) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ answers, page, startedAt }),
      );
    } catch {
      setStorageNote(
        "Answers cannot be saved on this device. Keep this page open until you submit.",
      );
    }
  }, [ctx, answers, page, startedAt, draftKey, complete]);
  async function begin() {
    setError("");
    setBusy(true);
    try {
      const normalized = token.toUpperCase().trim();
      if (!/^BF-[A-Z0-9]{12}$/.test(normalized))
        throw new Error("Use the full return code, starting BF-.");
      if (study !== "festival" && !session)
        throw new Error("Choose a session first.");
      const c: Context = { study, role, wave, session, extended };
      if (
        study !== "festival" &&
        (role === "speaker" || (study === "pairs" && wave !== "screen"))
      ) {
        const r = await fetch("/api/brufest/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, memberCode }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        c.member = data.member;
      }
      if (wave === "partner") {
        const r = await fetch("/api/brufest/partner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            memberCode,
            participantToken: normalized,
          }),
        });
        const data = await r.json();
        if (!data.summary)
          throw new Error(
            "Both people need to finish their private after questions first. Try again when you are both done.",
          );
        c.partnerSummary = data.summary;
      }
      questions(c);
      setToken(normalized);
      let restored: {
        answers?: Answers;
        page?: number;
        startedAt?: string;
      } | null = null;
      try {
        localStorage.setItem("brufest-participant", normalized);
        restored = JSON.parse(
          localStorage.getItem(
            `brufest:${VERSION}:${normalized}:${study}:${role}:${wave}:${sessionId}:${c.member ?? ""}`,
          ) || "null",
        );
      } catch {
        setStorageNote("Keep a copy of your return code.");
      }
      setAnswers(restored?.answers ?? {});
      setPage(restored?.page ?? 0);
      setStartedAt(restored?.startedAt ?? new Date().toISOString());
      setCtx(c);
      setComplete(false);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not open questionnaire.",
      );
    } finally {
      setBusy(false);
    }
  }
  function missingItem(list: Item[]) {
    return list.find((q) => answerError(q, answers[q.id]));
  }
  function showError(item: Item) {
    setError(
      answerError(item, answers[item.id]) ?? "Please answer this question.",
    );
    setTimeout(() => {
      const el = document.getElementById(`question-${item.id}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.querySelector<HTMLElement>("button,textarea")?.focus({
        preventScroll: true,
      });
    }, 0);
  }
  async function next() {
    const missing = missingItem(current.items);
    if (missing) return showError(missing);
    setError("");
    if (page < pages.length - 1) {
      setPage(page + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const anyMissing = missingItem(items);
    if (anyMissing) {
      setPage(
        pages.findIndex((p) => p.items.some((q) => q.id === anyMissing.id)),
      );
      showError(anyMissing);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/brufest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantToken: token,
          context: ctx,
          memberCode,
          answers,
          startedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setComplete(true);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Unable to save.") +
          " Your answers are still here; you can try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setStorageNote("Select and copy the code shown here.");
    }
  }
  const needsMember =
    study !== "festival" &&
    (role === "speaker" || (study === "pairs" && wave !== "screen"));
  return (
    <main className={`bf-main bf-${study}`}>
      <header className="topbar">
        <Link className="mark" href="/">
          Initiatives at evolvable.me
        </Link>
        <Link href="/">
          All initiatives <ArrowLeft size={14} />
        </Link>
      </header>
      {!ctx && (
        <section className="bf-intro">
          <div className="bf-intro-copy">
            <p className="eyebrow">Brufest / {info.label}</p>
            <h1>{info.title}</h1>
            <p className="bf-lead">{info.intro}</p>
            <div className={`bf-art ${info.art}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <span>
                {study === "festival" ? "BEFORE / AFTER" : "YOU / ANOTHER VIEW"}
              </span>
            </div>
            <p className="bf-note">{info.note}</p>
          </div>
          <div className="bf-start">
            <span className="eyebrow">
              {preview ? "Try the pilot" : "Take part"}
            </span>
            <h2>Where are you in the story?</h2>
            {study === "panels" && (
              <label className="bf-label">
                I’m taking part as
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    setError("");
                  }}
                >
                  <option value="audience">An audience member</option>
                  <option value="speaker">A panellist</option>
                </select>
              </label>
            )}
            <label className="bf-label">
              Your questionnaire
              <select
                value={wave}
                onChange={(e) => {
                  setWave(e.target.value as Wave);
                  setError("");
                }}
              >
                {(study === "festival"
                  ? ["pre", "post", "followup"]
                  : study === "panels"
                    ? ["pre", "post"]
                    : ["screen", "pre", "post", "joint", "partner"]
                ).map((w) => (
                  <option key={w} value={w}>
                    {WAVE_LABEL[w as Wave]}
                  </option>
                ))}
              </select>
            </label>
            {study !== "festival" && (
              <label className="bf-label">
                {study === "panels" ? "Your panel" : "Your conversation"}
                <select
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value);
                    setMemberCode("");
                  }}
                >
                  <option value="">Choose a session</option>
                  {sessions
                    .filter((s) => s.study === study)
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {session && <p className="bf-topic">{session.proposition}</p>}
            {needsMember && (
              <label className="bf-label">
                Private participant key
                <input
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.trim())}
                  autoComplete="off"
                  placeholder="From your facilitator’s link"
                />
              </label>
            )}
            {needsMember && sampleCodes[sessionId] && (
              <div className="bf-demo-buttons">
                {sampleCodes[sessionId].map((code, i) => (
                  <button
                    type="button"
                    key={code}
                    onClick={() => setMemberCode(code)}
                    aria-pressed={memberCode === code}
                  >
                    Try as {session?.speakers[i]}
                  </button>
                ))}
              </div>
            )}
            <details className="bf-return">
              <summary>
                Your return code <strong>{token}</strong>
              </summary>
              <p>
                Use the same code before and after, even on another device. Keep
                it private.
              </p>
              <input
                aria-label="Your return code"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                maxLength={15}
              />
              <button
                type="button"
                onClick={() => {
                  setToken(
                    `BF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
                  );
                  setCopied(false);
                }}
              >
                Start for another person
              </button>
              <button type="button" onClick={copy}>
                <Copy size={14} /> {copied ? "Copied" : "Copy code"}
              </button>
            </details>
            <details className="bf-extension">
              <summary>Questionnaire options</summary>
              <label>
                <input
                  type="checkbox"
                  checked={extended}
                  onChange={(e) => setExtended(e.target.checked)}
                />{" "}
                Include optional extra questions
              </label>
            </details>
            <p className="bf-small">
              There are no right answers. You can skip a question. Your place is
              saved on this device as you go.
            </p>
            <button
              className="primary"
              disabled={busy || !token || (study !== "festival" && !session)}
              onClick={begin}
            >
              {busy ? "Opening…" : "Begin"} <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}
      {ctx && !complete && current && (
        <section className="bf-form">
          <div className="bf-form-top">
            <Link href={`/brufest/${study}`}>{info.label}</Link>
            <span>
              {WAVE_LABEL[ctx.wave]} / {Math.min(page + 1, pages.length)} of{" "}
              {pages.length}
            </span>
          </div>
          <div className="bf-progress">
            <i style={{ width: `${((page + 1) / pages.length) * 100}%` }} />
          </div>
          <div className="bf-section-heading">
            <span className="eyebrow">
              {ctx.session?.title ?? "Your festival"}
            </span>
            <h1 tabIndex={-1}>{current.title}</h1>
            <p>
              {ctx.wave === "joint"
                ? "Complete this together. You can record different answers if you don’t agree."
                : ctx.wave === "partner"
                  ? "Your partner’s account of your reason. Rate its accuracy, not whether you agree with their own view."
                  : "Answer for yourself, as you see things now."}
            </p>
          </div>
          {ctx.partnerSummary && (
            <blockquote className="bf-partner">
              “{ctx.partnerSummary}”
            </blockquote>
          )}
          {current.items.map((item) => (
            <Question
              key={item.id}
              item={item}
              index={items.findIndex((q) => q.id === item.id)}
              value={answers[item.id]}
              onChange={(value) => {
                setAnswers((a) => ({ ...a, [item.id]: value }));
                setError("");
              }}
            />
          ))}
          <div className="bf-nav">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (page === 0) setCtx(null);
                else setPage(page - 1);
                setError("");
                window.scrollTo({ top: 0 });
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <span>Saved on this device</span>
            <button className="primary" disabled={busy} onClick={next}>
              {busy
                ? "Saving…"
                : page === pages.length - 1
                  ? "Finish"
                  : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}
      {complete && (
        <section className="bf-complete">
          <Check size={38} />
          <p className="eyebrow">
            {info.label} / {WAVE_LABEL[wave]}
          </p>
          <h1>A little more perspective.</h1>
          <p>Your answers have been saved. Thank you for adding your view.</p>
          <div className="bf-code">
            <span>Your return code</span>
            <strong>{token}</strong>
            <button onClick={copy}>
              <Copy size={16} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="bf-note">
            {wave === "pre"
              ? "Keep this code for the after questions. There’s nothing else to do until the session is over."
              : study === "pairs" && wave === "post"
                ? "When both participants have finished, complete the joint discussion record and check your partner’s description."
                : "You don’t have to end up agreeing. Thank you for taking part."}
          </p>
          <div className="bf-complete-actions">
            <button
              className="primary"
              onClick={() => {
                setCtx(null);
                setComplete(false);
                if (wave === "pre") setWave("post");
                else if (study === "pairs" && wave === "post") setWave("joint");
                else if (wave === "joint") setWave("partner");
              }}
            >
              Back to this study <ArrowRight size={18} />
            </button>
            <Link className="secondary" href="/">
              All initiatives
            </Link>
          </div>
        </section>
      )}
      {error && (
        <div className="bf-error" role="alert">
          {error}
        </div>
      )}
      {storageNote && (
        <p className="bf-storage" role="status">
          {storageNote}
        </p>
      )}
      <footer className="bf-footer">
        <span>Different views. A shared curiosity.</span>
        <Link href="/admin/brufest">Facilitator</Link>
      </footer>
    </main>
  );
}
