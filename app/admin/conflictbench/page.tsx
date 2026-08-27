"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BRUFEST_TOPICS, PROFILE_DIMENSIONS, type ConflictBenchResponses } from "@/lib/conflictbench";
import type { StoredConflictBenchSubmission } from "@/lib/conflictbench-store";

const DERIVED_FIELDS = [
  ["perceivedIssueComplexity", "Issue complexity"],
  ["perceivedOpponentProfile", "Opposing profile"],
  ["selfProfile", "Self profile"],
  ["selfOtherProfileDistance", "Profile distance"],
  ["perceivedChangeability", "Changeability"],
  ["conflictAgency", "Conflict agency"]
] as const;

const SCORE_FIELDS = [
  ["position", "Position"],
  ["confidence", "Confidence"],
  ["issueComplexity", "Issue complexity"],
  ["legitimateConsiderations", "Legitimate considerations"],
  ["reasonableDisagreement", "Reasonable disagreement"],
  ["opposingUnderstanding", "Opposing understanding"],
  ["selfOtherCloseness", "View closeness"],
  ["willingnessConversation", "Willingness to converse"],
  ["interestInDisagreement", "Interest in disagreement"],
  ["opennessToInfluence", "Openness to influence"],
  ["willingnessToChange", "Willingness to change"],
  ["changingMindSkill", "Changing-mind skill"],
  ["changingMindIdentity", "Changing-mind identity"],
  ["recallChangedMind", "Recall of change"],
  ["influenceConversation", "Influence conversation"],
  ["remainCurious", "Remain curious"],
  ["productiveWayForward", "Productive way forward"]
] as const satisfies ReadonlyArray<readonly [keyof ConflictBenchResponses, string]>;

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function topicLabel(slug: string) {
  return BRUFEST_TOPICS.find((topic) => topic.slug === slug)?.label ?? slug;
}

export default function ConflictBenchAdminPage() {
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<StoredConflictBenchSubmission[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/conflictbench-submissions", { cache: "no-store" });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }
      if (!response.ok) throw new Error("The ConflictBench responses could not be loaded.");
      const data = (await response.json()) as { submissions: StoredConflictBenchSubmission[] };
      setSubmissions(data.submissions);
      setIsAuthenticated(true);
      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The ConflictBench responses could not be loaded.");
      return false;
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function login() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        setError("Wrong password.");
        return;
      }
      setPassword("");
      await load(true);
    } finally {
      setLoading(false);
    }
  }

  const topicCount = useMemo(
    () => new Set(submissions.map((submission) => submission.responses.topic)).size,
    [submissions]
  );

  const averages = useMemo(() => DERIVED_FIELDS.map(([key, label]) => {
    const values = submissions.map((submission) => submission.derivedMeasures[key]);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { key, label, value: average };
  }), [submissions]);

  return (
    <main>
      <header className="topbar">
        <div className="mark">Evolvable data</div>
        <nav className="admin-nav" aria-label="Admin views">
          <Link href="/admin">Looking Back</Link>
          <Link className="active" href="/admin/conflictbench">ConflictBench</Link>
          <Link href="/conflictbench">Questionnaire</Link>
        </nav>
      </header>

      <section className="stage admin-stage conflictbench-admin-stage">
        <div className="step-header">
          <span>Protected data</span>
          <h2>ConflictBench responses</h2>
          <p>Brufest pre-festival submissions, individual measures, and written reflections.</p>
        </div>

        {!checkingSession && !isAuthenticated && (
          <div className="admin-login-panel">
            <label className="field">
              <span>Admin password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void login(); }}
              />
            </label>
            <button className="primary admin-button" disabled={loading} onClick={login}>
              {loading ? "Opening…" : "Open dashboard"}
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {isAuthenticated && (
          <>
            <div className="conflictbench-admin-actions">
              <button className="secondary" disabled={loading} onClick={() => void load()}>
                <RefreshCw size={16} /> {loading ? "Refreshing…" : "Refresh"}
              </button>
              <a
                className={`secondary${submissions.length ? "" : " disabled"}`}
                href="/api/admin/conflictbench-submissions?format=csv"
                download
                aria-disabled={!submissions.length}
                onClick={(event) => { if (!submissions.length) event.preventDefault(); }}
              >
                <Download size={16} /> Download CSV
              </a>
            </div>

            <div className="conflictbench-admin-summary">
              <article><span>Responses</span><strong>{submissions.length}</strong></article>
              <article><span>Topics represented</span><strong>{topicCount}</strong></article>
              <article><span>Latest response</span><strong>{submissions[0] ? new Date(submissions[0].createdAt).toLocaleDateString() : "—"}</strong></article>
            </div>

            {submissions.length ? (
              <>
                <div className="conflictbench-admin-averages" aria-label="Average derived measures">
                  {averages.map((measure) => (
                    <article key={measure.key}>
                      <span>{measure.label}</span>
                      <strong>{formatScore(measure.value)}</strong>
                      <i><b style={{ width: `${Math.min(100, Math.max(0, measure.value))}%` }} /></i>
                    </article>
                  ))}
                </div>

                <div className="conflictbench-admin-list">
                  {submissions.map((submission) => (
                    <details className="conflictbench-admin-response" key={submission.id}>
                      <summary>
                        <span className="conflictbench-admin-time">
                          {new Date(submission.createdAt).toLocaleString()}
                        </span>
                        <strong>{topicLabel(submission.responses.topic)}</strong>
                        <span>Position {formatScore(submission.responses.position)}</span>
                        <span>Confidence {formatScore(submission.responses.confidence)}</span>
                        <span>Agency {formatScore(submission.derivedMeasures.conflictAgency)}</span>
                        <b>
                          <span className="conflictbench-admin-open-label">Open response</span>
                          <span className="conflictbench-admin-close-label">Close response</span>
                        </b>
                      </summary>

                      <div className="conflictbench-admin-response-body">
                        <section className="conflictbench-admin-writing">
                          <div><span>Current view</span><p>{submission.responses.currentView}</p></div>
                          <div><span>Strongest opposing argument</span><p>{submission.responses.opposingArgument}</p></div>
                          {submission.responses.changedMindAbout && (
                            <div><span>Changed their mind about</span><p>{submission.responses.changedMindAbout}</p></div>
                          )}
                        </section>

                        <section>
                          <h3>Derived measures</h3>
                          <div className="conflictbench-admin-score-grid">
                            {DERIVED_FIELDS.map(([key, label]) => (
                              <div key={key}><span>{label}</span><strong>{formatScore(submission.derivedMeasures[key])}</strong></div>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3>Question scores</h3>
                          <div className="conflictbench-admin-score-grid">
                            {SCORE_FIELDS.map(([key, label]) => (
                              <div key={key}><span>{label}</span><strong>{formatScore(submission.responses[key] as number)}</strong></div>
                            ))}
                          </div>
                        </section>

                        <section className="conflictbench-admin-profiles">
                          <h3>Profile ratings</h3>
                          <div className="conflictbench-admin-profile-grid">
                            <div>
                              <h4>Opposing view holder</h4>
                              {PROFILE_DIMENSIONS.map(({ key, high }) => (
                                <p key={key}><span>{high}</span><strong>{formatScore(submission.responses.opponentProfile[key])}</strong></p>
                              ))}
                            </div>
                            <div>
                              <h4>Self</h4>
                              {PROFILE_DIMENSIONS.map(({ key, high }) => (
                                <p key={key}><span>{high}</span><strong>{formatScore(submission.responses.selfProfile[key])}</strong></p>
                              ))}
                            </div>
                          </div>
                        </section>

                        <footer>
                          <span>Version {submission.questionnaireVersion}</span>
                          <span>Record {submission.id}</span>
                        </footer>
                      </div>
                    </details>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted conflictbench-admin-empty">No ConflictBench submissions yet.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
