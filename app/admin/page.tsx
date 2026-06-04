"use client";

import Link from "next/link";
import { useState } from "react";
import type { Submission } from "@/lib/types";

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
      <section className="stage">
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
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Choice</th>
                      <th>Word</th>
                      <th>Value</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Cohort</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td>{new Date(submission.createdAt).toLocaleString()}</td>
                        <td>{submission.lifeChoice}</td>
                        <td>{submission.idealWord}</td>
                        <td>{submission.guidingValue}</td>
                        <td>{submission.ageBand}</td>
                        <td>{submission.gender}</td>
                        <td>{submission.cohortLabel || submission.cohortSlug || "Population"}</td>
                        <td>
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
