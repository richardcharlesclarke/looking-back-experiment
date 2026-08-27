"use client";

import { Download, RefreshCw, Trash2, X } from "lucide-react";
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
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
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
      const availableIds = new Set(data.submissions.map((submission) => submission.id));
      setSelectedIds((current) => new Set(Array.from(current).filter((id) => availableIds.has(id))));
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

  useEffect(() => {
    if (!showDeleteConfirmation) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) setShowDeleteConfirmation(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleting, showDeleteConfirmation]);

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

  const allSelected = submissions.length > 0 && selectedIds.size === submissions.length;

  function toggleResponseSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllResponses() {
    setSelectedIds(allSelected ? new Set() : new Set(submissions.map((submission) => submission.id)));
  }

  async function deleteSelectedResponses() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/conflictbench-submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const payload = (await response.json()) as {
        error?: string;
        deletedIds?: string[];
        submissions?: StoredConflictBenchSubmission[];
      };
      if (response.status === 401) {
        setIsAuthenticated(false);
        setSelectedIds(new Set());
        setShowDeleteConfirmation(false);
        throw new Error("Your admin session has expired. Sign in again before deleting responses.");
      }
      if (!response.ok || !payload.submissions) {
        throw new Error(payload.error || "The selected responses could not be deleted.");
      }

      setSubmissions(payload.submissions);
      setSelectedIds(new Set());
      setShowDeleteConfirmation(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The selected responses could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

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
              <label className="conflictbench-admin-select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllResponses}
                  aria-label={allSelected ? "Clear response selection" : "Select all responses"}
                />
                <span>{allSelected ? "Clear selection" : "Select all"}</span>
              </label>
              <span className="conflictbench-admin-selected-count" aria-live="polite">
                {selectedIds.size} selected
              </span>
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
              <button
                className="secondary conflictbench-admin-delete-button"
                disabled={!selectedIds.size || deleting}
                onClick={() => setShowDeleteConfirmation(true)}
              >
                <Trash2 size={16} /> Delete selected
              </button>
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
                    <div
                      className={`conflictbench-admin-response-row${selectedIds.has(submission.id) ? " selected" : ""}`}
                      key={submission.id}
                    >
                      <label className="conflictbench-admin-response-select">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(submission.id)}
                          onChange={() => toggleResponseSelection(submission.id)}
                          aria-label={`Select response from ${new Date(submission.createdAt).toLocaleString()}`}
                        />
                      </label>
                      <details className="conflictbench-admin-response">
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
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted conflictbench-admin-empty">No ConflictBench submissions yet.</p>
            )}
          </>
        )}
      </section>

      {showDeleteConfirmation && (
        <div
          className="conflictbench-admin-confirmation-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setShowDeleteConfirmation(false);
          }}
        >
          <section
            className="conflictbench-admin-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflictbench-delete-title"
            aria-describedby="conflictbench-delete-description"
          >
            <button
              className="conflictbench-admin-confirmation-close"
              type="button"
              aria-label="Close delete confirmation"
              disabled={deleting}
              onClick={() => setShowDeleteConfirmation(false)}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Permanent action</p>
            <h2 id="conflictbench-delete-title">
              Delete {selectedIds.size} selected {selectedIds.size === 1 ? "response" : "responses"}?
            </h2>
            <p id="conflictbench-delete-description">
              This cannot be undone. The dashboard totals, topic count, and every average will immediately
              recalculate from the responses that remain.
            </p>
            <div className="conflictbench-admin-confirmation-actions">
              <button
                className="secondary"
                type="button"
                autoFocus
                disabled={deleting}
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="primary conflictbench-admin-confirm-delete"
                type="button"
                disabled={deleting}
                onClick={() => void deleteSelectedResponses()}
              >
                <Trash2 size={17} /> {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
