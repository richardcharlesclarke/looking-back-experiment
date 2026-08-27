"use client";

import { ArrowLeft, ArrowRight, Check, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BREWFEST_TOPICS,
  PROFILE_DIMENSIONS,
  type ConflictBenchResponses,
  type ProfileKey,
  type ProfileRatings
} from "@/lib/conflictbench";
import { VectorDecoration } from "../looking-back/VectorDecoration";

const LAST_QUESTION_STEP = 9;
const SCALE_ANCHORS = [0, 25, 50, 75, 100];

function freshProfile(): ProfileRatings {
  return Object.fromEntries(PROFILE_DIMENSIONS.map(({ key }) => [key, 50])) as ProfileRatings;
}

const INITIAL_RESPONSES: ConflictBenchResponses = {
  topic: "",
  position: 50,
  currentView: "",
  confidence: 50,
  issueComplexity: 50,
  legitimateConsiderations: 50,
  reasonableDisagreement: 50,
  opposingUnderstanding: 50,
  opposingArgument: "",
  opponentProfile: freshProfile(),
  selfProfile: freshProfile(),
  selfOtherCloseness: 50,
  willingnessConversation: 50,
  interestInDisagreement: 50,
  opennessToInfluence: 50,
  willingnessToChange: 50,
  changingMindSkill: 50,
  changingMindIdentity: 50,
  recallChangedMind: 50,
  changedMindAbout: "",
  influenceConversation: 50,
  remainCurious: 50,
  productiveWayForward: 50
};

export default function ConflictBenchQuestionnaire() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<ConflictBenchResponses>(INITIAL_RESPONSES);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedTopic = BREWFEST_TOPICS.find(({ slug }) => slug === responses.topic);

  function update<K extends keyof ConflictBenchResponses>(key: K, value: ConflictBenchResponses[K]) {
    setResponses((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateProfile(profile: "opponentProfile" | "selfProfile", key: ProfileKey, value: number) {
    setResponses((current) => ({
      ...current,
      [profile]: { ...current[profile], [key]: value }
    }));
  }

  function continueFromStep() {
    if (step === 1 && (!responses.topic || !responses.currentView.trim())) {
      setError("Choose a topic and briefly describe your current view before continuing.");
      return;
    }
    if (step === 3 && !responses.opposingArgument.trim()) {
      setError("Briefly describe the strongest argument for the opposing position before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, LAST_QUESTION_STEP));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/conflictbench/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responses)
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Your response could not be saved.");
      setStep(10);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Your response could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="conflictbench-main">
      <header className="topbar">
        <Link className="mark" href="/">Initiatives at evolvable.me</Link>
        <a href="https://evolvable.me">Explore evolvable.me</a>
      </header>

      {step === 0 && (
        <section className="conflictbench-hero">
          <div className="hero-deco conflictbench-hero-deco" aria-hidden="true">
            <VectorDecoration className="v1" src="/vector-decoration/profile-vector-new-1.svg" delay="0s" drawDuration="22s" stroke="#F4F3F4" activateImmediately />
            <VectorDecoration className="v2" src="/vector-decoration/profile-vector-new-2-open.svg" delay="0s" stroke="#F4F3F4" variant="profile-2-hero" />
          </div>
          <div className="conflictbench-hero-copy">
            <p className="eyebrow">Brewfest / Pre-festival</p>
            <h1>How do you meet disagreement?</h1>
            <p>
              A short baseline questionnaire about how you see an issue, the people who disagree with you,
              and your own capacity to stay curious.
            </p>
            <button className="primary" type="button" onClick={() => setStep(1)}>
              Begin <ArrowRight size={18} />
            </button>
          </div>
          <div className="conflictbench-intro-mark" aria-hidden="true">
            <span>YOU</span>
            <i />
            <span>OTHER</span>
          </div>
          <div className="conflictbench-intro-note">
            <FlaskConical size={18} />
            <p>
              There is no single ConflictBench score. Each response is kept separately so change can be
              understood without flattening it.
            </p>
          </div>
        </section>
      )}

      {step > 0 && step < 10 && (
        <section className="stage ratings-stage conflictbench-stage">
          <div className="ratings-stage-deco" aria-hidden="true">
            <VectorDecoration className="ratings-v1" src="/vector-decoration/profile-vector-new-1.svg" delay="0s" drawDuration="22s" stroke="#F4F3F4" activateImmediately />
            <VectorDecoration className="ratings-v2" src="/vector-decoration/profile-vector-new-2-open.svg" delay="0s" stroke="#F4F3F4" variant="profile-2-hero" />
          </div>
          <Progress step={step} />

          {step === 1 && (
            <>
              <SectionHeader index="01" title="Choose the issue" text="Start with the Brewfest topic you are responding to, then place your current view." />
              <div className="conflictbench-question-card conflictbench-topic-card">
                <label className="field wide">
                  <span><b className="question-number">Q1</b> Which issue are you responding to?</span>
                  <select value={responses.topic} onChange={(event) => update("topic", event.target.value)}>
                    <option value="">Select a Brewfest topic</option>
                    {BREWFEST_TOPICS.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.label}</option>)}
                  </select>
                </label>
                <p className="placeholder-note">Placeholder: replace this topic list and the position endpoints when Brewfest confirms them.</p>
              </div>
              <OrbScale
                number="Q2"
                question={selectedTopic ? `Where do you currently stand on ${selectedTopic.label}?` : "Where do you currently stand on this issue?"}
                value={responses.position}
                low={selectedTopic?.positionLow ?? "Strongly favour position A"}
                high={selectedTopic?.positionHigh ?? "Strongly favour position B"}
                onChange={(value) => update("position", value)}
              />
              <label className="field wide conflictbench-text-question">
                <span><b className="question-number">Q3</b> In your own words, what is your current view?</span>
                <textarea value={responses.currentView} onChange={(event) => update("currentView", event.target.value)} rows={4} maxLength={3000} placeholder="Ideally 1–3 sentences" />
              </label>
              <OrbScale number="Q4" question="How confident are you that your current view is broadly correct?" value={responses.confidence} low="Not at all confident" high="Completely confident" onChange={(value) => update("confidence", value)} />
            </>
          )}

          {step === 2 && (
            <>
              <SectionHeader index="02" title="How complex is it?" text="Consider the issue itself, including the trade-offs and different conclusions it may support." />
              <OrbScale number="Q5" question="How simple or complicated do you think this issue actually is?" value={responses.issueComplexity} low="Fundamentally simple" high="Extremely complex" onChange={(value) => update("issueComplexity", value)} />
              <OrbScale number="Q6" question="How many legitimate considerations do you think there are on this issue?" value={responses.legitimateConsiderations} low="Essentially one" high="Many competing considerations" onChange={(value) => update("legitimateConsiderations", value)} />
              <OrbScale number="Q7" question="To what extent do you think reasonable people could reach different conclusions about this issue?" value={responses.reasonableDisagreement} low="Hardly at all" high="Very easily" onChange={(value) => update("reasonableDisagreement", value)} />
            </>
          )}

          {step === 3 && (
            <>
              <SectionHeader index="03" title="See the opposing view" text="Think about the strongest version of the view that differs from yours." />
              <OrbScale number="Q8" question="How well do you think you understand why an intelligent person might hold the opposing view?" value={responses.opposingUnderstanding} low="I don't understand it at all" high="I understand it extremely well" onChange={(value) => update("opposingUnderstanding", value)} />
              <label className="field wide conflictbench-text-question">
                <span><b className="question-number">Q9</b> Briefly describe what you think is the strongest argument for the opposing position.</span>
                <textarea value={responses.opposingArgument} onChange={(event) => update("opposingArgument", event.target.value)} rows={5} maxLength={3000} placeholder="Describe their strongest argument in your own words" />
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <SectionHeader index="04" title="Imagine the other person" text="Think about a person who sincerely holds the opposing view. This is your perception of them, not a claim about their actual personality." />
              <ProfileScales number="Q10" profile={responses.opponentProfile} onChange={(key, value) => updateProfile("opponentProfile", key, value)} />
            </>
          )}

          {step === 5 && (
            <>
              <SectionHeader index="05" title="Now describe yourself" text="Use the same dimensions to consider how you are when discussing this issue." />
              <ProfileScales number="Q11" profile={responses.selfProfile} onChange={(key, value) => updateProfile("selfProfile", key, value)} />
            </>
          )}

          {step === 6 && (
            <>
              <SectionHeader index="06" title="How close do they feel?" text="Move the circles from completely separate to increasingly overlapping." />
              <ClosenessControl value={responses.selfOtherCloseness} onChange={(value) => update("selfOtherCloseness", value)} />
            </>
          )}

          {step === 7 && (
            <>
              <SectionHeader index="07" title="Would you engage?" text="Imagine a serious conversation with someone who strongly disagrees with you." />
              <OrbScale number="Q13" question="How willing would you be to have that conversation?" value={responses.willingnessConversation} low="Not at all willing" high="Extremely willing" onChange={(value) => update("willingnessConversation", value)} />
              <OrbScale number="Q14" question="How interested are you in discovering why someone might disagree with you?" value={responses.interestInDisagreement} low="Not at all interested" high="Extremely interested" onChange={(value) => update("interestInDisagreement", value)} />
              <OrbScale number="Q15" question="How willing are you to let something they say influence your own view?" value={responses.opennessToInfluence} low="Not at all willing" high="Completely willing" onChange={(value) => update("opennessToInfluence", value)} />
              <OrbScale number="Q16" question="If they made a sufficiently good argument, how willing would you be to change your position?" value={responses.willingnessToChange} low="I would not change it" high="Completely willing" onChange={(value) => update("willingnessToChange", value)} />
            </>
          )}

          {step === 8 && (
            <>
              <SectionHeader index="08" title="Are you someone who can change?" text="Think about your relationship with better evidence and arguments." />
              <OrbScale number="Q17" question="How good are you at changing your mind when you encounter better evidence or arguments?" value={responses.changingMindSkill} low="Very bad at it" high="Very good at it" onChange={(value) => update("changingMindSkill", value)} />
              <OrbScale number="Q18" question="How much is being able to change your mind part of how you see yourself?" value={responses.changingMindIdentity} low="Not part of my identity" high="Very much part of my identity" onChange={(value) => update("changingMindIdentity", value)} />
              <OrbScale number="Q19" question="How easily can you bring to mind the last time you genuinely changed your mind about something important?" value={responses.recallChangedMind} low="I can't think of one" high="One comes immediately to mind" onChange={(value) => update("recallChangedMind", value)} />
              <label className="field wide conflictbench-text-question">
                <span><b className="question-number">Q20</b> What did you change your mind about? <em>Optional</em></span>
                <textarea value={responses.changedMindAbout} onChange={(event) => update("changedMindAbout", event.target.value)} rows={3} maxLength={1000} placeholder="A short reflection" />
              </label>
            </>
          )}

          {step === 9 && (
            <>
              <SectionHeader index="09" title="Agency in conflict" text="Finally, consider what you feel capable of when disagreement becomes difficult." />
              <OrbScale number="Q21" question="How capable do you feel of influencing how the conversation unfolds?" value={responses.influenceConversation} low="Not capable at all" high="Extremely capable" onChange={(value) => update("influenceConversation", value)} />
              <OrbScale number="Q22" question="How capable do you feel of remaining curious when the conversation becomes difficult?" value={responses.remainCurious} low="Not capable at all" high="Extremely capable" onChange={(value) => update("remainCurious", value)} />
              <OrbScale number="Q23" question="How capable do you feel of finding a productive way forward when disagreement becomes intense?" value={responses.productiveWayForward} low="Not capable at all" high="Extremely capable" onChange={(value) => update("productiveWayForward", value)} />
            </>
          )}

          {error && <p className="error conflictbench-error">{error}</p>}
          <div className="actions conflictbench-actions">
            <button className="primary nav-back" type="button" onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="primary" type="button" disabled={submitting} onClick={step === LAST_QUESTION_STEP ? submit : continueFromStep}>
              {step === LAST_QUESTION_STEP ? (submitting ? "Saving…" : "Submit") : "Continue"} <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {step === 10 && (
        <section className="conflictbench-complete">
          <div className="conflictbench-complete-mark"><Check size={34} /></div>
          <p className="eyebrow">Response saved</p>
          <h1>Thank you for looking closely.</h1>
          <p>Your individual responses have been stored as a pre-festival baseline. They have not been collapsed into a single score.</p>
          <Link className="primary" href="/">Return to initiatives <ArrowRight size={18} /></Link>
        </section>
      )}
    </main>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="conflictbench-progress" aria-label={`Questionnaire section ${step} of ${LAST_QUESTION_STEP}`}>
      <span>{String(step).padStart(2, "0")} / {String(LAST_QUESTION_STEP).padStart(2, "0")}</span>
      <i><b style={{ width: `${(step / LAST_QUESTION_STEP) * 100}%` }} /></i>
    </div>
  );
}

function SectionHeader({ index, title, text }: { index: string; title: string; text: string }) {
  return <div className="step-header"><span>{index}</span><h2>{title}</h2><p>{text}</p></div>;
}

function OrbScale({ number, question, value, low, high, onChange }: { number: string; question: string; value: number; low: string; high: string; onChange: (value: number) => void }) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [visualValue, setVisualValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => { if (!isDragging) setVisualValue(value); }, [value, isDragging]);

  const visibleValue = isDragging ? Math.round(visualValue) : value;
  const thumbSize = 26 + (visualValue / 100) * 54;

  function valueFromPointer(clientX: number) {
    const lane = laneRef.current;
    if (!lane) return visualValue;
    const rect = lane.getBoundingClientRect();
    return Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
  }

  function commit(raw: number) {
    const next = Math.min(Math.max(Math.round(raw), 0), 100);
    setVisualValue(next);
    onChange(next);
  }

  return (
    <div className="conflictbench-orb-question">
      <div className="conflictbench-orb-copy">
        <span className="question-number">{number}</span>
        <h3>{question}</h3>
        <strong>{visibleValue}</strong>
      </div>
      <div className="alignment-orb-control">
        <div className="rating-orb-field" onPointerMove={(event) => { if (isDragging) setVisualValue(valueFromPointer(event.clientX)); }} onPointerUp={(event) => { if (!isDragging) return; event.currentTarget.releasePointerCapture(event.pointerId); setIsDragging(false); commit(valueFromPointer(event.clientX)); }} onPointerCancel={(event) => { if (!isDragging) return; event.currentTarget.releasePointerCapture(event.pointerId); setIsDragging(false); commit(visualValue); }}>
          <div className="rating-orb-hit-grid" aria-hidden="true">
            {SCALE_ANCHORS.map((anchor) => <button key={anchor} type="button" tabIndex={-1} onClick={() => commit(anchor)} />)}
          </div>
          <div ref={laneRef} className="rating-orb-lane">
            <button
              className={isDragging ? "rating-orb-thumb dragging" : "rating-orb-thumb"}
              type="button"
              aria-label={`${question}: ${visibleValue} out of 100`}
              style={{ "--rating-thumb-size": `${thumbSize}px`, "--rating-orb-position": `${visualValue}%` } as React.CSSProperties}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setIsDragging(true); setVisualValue(valueFromPointer(event.clientX)); }}
              onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); commit(value + (event.key === "ArrowRight" ? 1 : -1)); }}
            />
          </div>
        </div>
        <div className="rating-scale conflictbench-scale" role="group" aria-label={`${question} response anchors`}>
          {SCALE_ANCHORS.map((anchor, index) => (
            <button key={anchor} type="button" className={value === anchor ? "rating-scale-option active" : "rating-scale-option"} onClick={() => commit(anchor)}>
              {index === 0 ? low : index === SCALE_ANCHORS.length - 1 ? high : anchor}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileScales({ number, profile, onChange }: { number: string; profile: ProfileRatings; onChange: (key: ProfileKey, value: number) => void }) {
  return (
    <div className="conflictbench-profile-list">
      {PROFILE_DIMENSIONS.map((dimension, index) => (
        <OrbScale key={dimension.key} number={index === 0 ? number : `${number}.${index + 1}`} question={`${dimension.low} — ${dimension.high}`} value={profile[dimension.key]} low={dimension.low} high={dimension.high} onChange={(value) => onChange(dimension.key, value)} />
      ))}
    </div>
  );
}

function ClosenessControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const separation = (100 - value) * 1.7;
  return (
    <div className="closeness-card">
      <div className="conflictbench-orb-copy">
        <span className="question-number">Q12</span>
        <h3>How psychologically close or distant do people who hold the opposing view feel to you?</h3>
        <strong>{value}</strong>
      </div>
      <div className="closeness-circles" aria-hidden="true">
        <i className="closeness-you">YOU</i>
        <i className="closeness-other" style={{ "--circle-separation": `${separation}px` } as React.CSSProperties}>OPPOSING VIEW</i>
      </div>
      <label className="closeness-range">
        <span>Completely separate</span>
        <input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label="Psychological closeness" />
        <span>Completely overlapping</span>
      </label>
    </div>
  );
}
