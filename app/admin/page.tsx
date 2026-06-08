"use client";

import Link from "next/link";
import { useState } from "react";
import { RATING_DIMENSIONS } from "@/lib/constants";
import type { Submission } from "@/lib/types";

function formatRating(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }
  return value > 0 ? `+${value}` : `${value}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      setError("Wrong password.");
      return;
    }
    setIsAuthenticated(true);
    await load();
  }

  async function load() {
    const response = await fetch("/api/admin/submissions");
    if (!response.ok) {
      setError("Admin session required.");
      return;
    }
    const data = await response.json();
    setSubmissions(data.submissions);
  }

  return (
    <main>
      <header className="topbar">
        <div className="mark">Looking Back Admin</div>
        <Link href="/">Experiment</Link>
      </header>
      <section className="stage admin-stage">
        <div className="step-header">
          <span>Admin</span>
          <h2>Responses</h2>
          <p>Simple protected view for checking incoming data.</p>
        </div>
        {!isAuthenticated && (
          <div className="form-grid">
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="primary admin-button" onClick={login}>
              Open dashboard
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {isAuthenticated && (
          <>
            <button className="secondary" onClick={load}>
              Refresh
            </button>
            {submissions.length ? (
              <div className="admin-table">
                <table>
                  <colgroup>
                    <col className="admin-col-time" />
                    <col className="admin-col-choice" />
                    <col className="admin-col-short" />
                    <col className="admin-col-short" />
                    <col className="admin-col-alignment" />
                    <col className="admin-col-text" />
                    <col className="admin-col-text" />
                    <col className="admin-col-age" />
                    <col className="admin-col-gender" />
                    <col className="admin-col-cohort" />
                    <col className="admin-col-ratings" />
                    <col className="admin-col-location" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Choice</th>
                      <th>Word</th>
                      <th>Value</th>
                      <th>Alignment</th>
                      <th>Blocker</th>
                      <th>Enabler</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Cohort</th>
                      <th>Ratings</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="admin-time">{new Date(submission.createdAt).toLocaleString()}</td>
                        <td className="admin-choice">{submission.lifeChoice}</td>
                        <td>{submission.idealWord}</td>
                        <td>{submission.guidingValue}</td>
                        <td>{submission.alignment}</td>
                        <td className="admin-long-text">{submission.blocker}</td>
                        <td className="admin-long-text">{submission.enabler}</td>
                        <td className="admin-meta">{submission.ageBand || "-"}</td>
                        <td className="admin-meta">{submission.gender || "-"}</td>
                        <td className="admin-meta">{submission.cohortLabel || submission.cohortSlug || "Population"}</td>
                        <td className="admin-ratings">
                          {RATING_DIMENSIONS.map((dimension) => (
                            <span className="admin-rating" key={dimension}>
                              <span>{dimension}</span>
                              <strong>{formatRating(submission.ratings[dimension])}</strong>
                            </span>
                          ))}
                        </td>
                        <td className="admin-meta">
                          {[submission.location.city, submission.location.country].filter(Boolean).join(", ") || "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No submissions yet.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
