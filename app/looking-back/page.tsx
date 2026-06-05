"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Compass, Globe2, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AGE_BANDS,
  ALIGNMENT_OPTIONS,
  CONFIGURED_COHORT_LABEL,
  CONFIGURED_COHORT_SLUG,
  EVOLVABLE_URL,
  GENDERS,
  LIFE_CHOICES,
  RATING_DIMENSIONS,
  RATING_OPTIONS
} from "@/lib/constants";
import type { Stats, Submission, SubmissionInput } from "@/lib/types";
import { VectorDecoration } from "./VectorDecoration";

const COLORS = ["#e75117", "#2f7d72", "#3b6b8f", "#bca35e", "#8d6f9f", "#6e7f61", "#232322", "#7a6f58"];
const CHOICE_COLORS = new Map<string, string>(
  LIFE_CHOICES.map((choice, index) => [choice, COLORS[index % COLORS.length]])
);
const SHOW_SCREEN_TEST_NAV = false;
const SCREEN_TEST_STEPS: Step[] = ["intro", "reflect", "ratings", "context", "results"];
const FORCED_CHOICE_SET = new Set<string>(LIFE_CHOICES);

type Step = "intro" | "reflect" | "ratings" | "context" | "results";
type LocationStatus = "idle" | "locating" | "captured" | "unavailable";

const PREVIEW_SUBMISSION: Submission = {
  id: "screen-preview",
  createdAt: new Date(0).toISOString(),
  idealWord: "Courage",
  guidingValue: "To keep choosing what matters when the path is unclear.",
  alignment: "Mostly",
  blocker: "Fear",
  enabler: "Curiosity",
  lifeChoice: "Courage",
  ratings: {
    Joy: 1,
    Purpose: 2,
    Connection: 1,
    Freedom: 0,
    Growth: 2
  },
  ageBand: "35-44",
  gender: "Prefer not to say",
  cohortSlug: "conference-preview",
  cohortLabel: "WMC2026 Conference",
  location: { consent: true, latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London", locale: "en-GB" }
};

const PREVIEW_STATS: Stats = {
  total: 24,
  choices: [
    { choice: "Courage", count: 7, percent: 0.292 },
    { choice: "Kindness", count: 5, percent: 0.208 },
    { choice: "Freedom", count: 4, percent: 0.167 },
    { choice: "Love", count: 3, percent: 0.125 },
    { choice: "Growth", count: 3, percent: 0.125 },
    { choice: "Peace", count: 2, percent: 0.083 }
  ],
  byGender: {
    "Prefer not to say": [
      { choice: "Courage", count: 7, percent: 0.292 },
      { choice: "Kindness", count: 5, percent: 0.208 },
      { choice: "Freedom", count: 4, percent: 0.167 }
    ]
  },
  cohortComparison: {
    populationLabel: "Historic Data",
    cohortLabel: "WMC2026 Conference",
    populationTotal: 720,
    cohortTotal: 24,
    population: [
      { choice: "Meaningful", count: 145, percent: 0.201 },
      { choice: "Happy", count: 137, percent: 0.19 },
      { choice: "Without Fear", count: 72, percent: 0.1 },
      { choice: "Authentic", count: 65, percent: 0.09 }
    ],
    cohort: [
      { choice: "Courage", count: 7, percent: 0.292 },
      { choice: "Kindness", count: 5, percent: 0.208 },
      { choice: "Freedom", count: 4, percent: 0.167 },
      { choice: "Love", count: 3, percent: 0.125 }
    ],
    populationRatings: [
      { dimension: "Joy", average: 0.4 },
      { dimension: "Purpose", average: 0.8 },
      { dimension: "Connection", average: 0.3 },
      { dimension: "Freedom", average: 0.1 },
      { dimension: "Growth", average: 1.1 }
    ],
    cohortRatings: [
      { dimension: "Joy", average: 1.1 },
      { dimension: "Purpose", average: 1.4 },
      { dimension: "Connection", average: 0.8 },
      { dimension: "Freedom", average: 0.6 },
      { dimension: "Growth", average: 1.7 }
    ]
  },
  byAge: {},
  ratings: [
    { dimension: "Joy", average: 0.8 },
    { dimension: "Purpose", average: 1.2 },
    { dimension: "Connection", average: 0.6 },
    { dimension: "Freedom", average: 0.2 },
    { dimension: "Growth", average: 1.4 }
  ],
  words: ["steadfast", "open", "generous", "brave", "present", "honest"],
  values: ["family", "truth", "care", "curiosity", "service", "attention"],
  blockers: ["fear", "time", "expectation", "work", "doubt", "noise"],
  enablers: ["curiosity", "family", "discipline", "love", "purpose", "rest"],
  locations: [
    { latitude: 51.5072, longitude: -0.1276, choice: "Courage" },
    { latitude: 40.7128, longitude: -74.006, choice: "Kindness" }
  ]
};

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [guidingValue, setGuidingValue] = useState("");
  const [alignment, setAlignment] = useState("");
  const [blocker, setBlocker] = useState("");
  const [enabler, setEnabler] = useState("");
  const [lifeChoice, setLifeChoice] = useState("");
  const [otherChoice, setOtherChoice] = useState("");
  const [ratings, setRatings] = useState<Partial<Record<string, number>>>(
    () => Object.fromEntries(RATING_DIMENSIONS.map((dimension) => [dimension, 0]))
  );
  const [currentRatingIndex, setCurrentRatingIndex] = useState(0);
  const [ratingTransitionDirection, setRatingTransitionDirection] = useState<"forward" | "back">("forward");
  const [ageBand, setAgeBand] = useState("");
  const [gender, setGender] = useState("");
  const [genderSelfDescription, setGenderSelfDescription] = useState("");
  const [locationConsent, setLocationConsent] = useState(false);
  const [location, setLocation] = useState<SubmissionInput["location"]>({ consent: false });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [cohortConfig, setCohortConfig] = useState<{ slug: string; label: string }>(() => ({
    slug: CONFIGURED_COHORT_SLUG,
    label: CONFIGURED_COHORT_LABEL
  }));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStepExiting, setIsStepExiting] = useState(false);
  const [showTestNavigator, setShowTestNavigator] = useState(SHOW_SCREEN_TEST_NAV);
  const locationPromiseRef = useRef<Promise<SubmissionInput["location"]> | null>(null);
  const stepTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedScreen = searchParams.get("screen");
    const cohortSlug = searchParams.get("cohort")?.trim() || CONFIGURED_COHORT_SLUG;
    const cohortLabel = searchParams.get("cohortLabel")?.trim() || searchParams.get("event")?.trim() || CONFIGURED_COHORT_LABEL;
    if (SCREEN_TEST_STEPS.includes(requestedScreen as Step)) {
      setStep(requestedScreen as Step);
    }
    if (cohortSlug) {
      setCohortConfig({ slug: cohortSlug, label: cohortLabel || "WMC2026 Conference" });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stepTransitionTimeoutRef.current) {
        window.clearTimeout(stepTransitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetch(statsPath(cohortConfig))
      .then((response) => response.json())
      .then(setStats)
      .catch(() => undefined);
  }, [cohortConfig]);

  useEffect(() => {
    if (step !== "results") return;
    const interval = window.setInterval(() => {
      fetch(statsPath(cohortConfig))
        .then((response) => response.json())
        .then(setStats)
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [cohortConfig, step]);

  function localLocationContext(): SubmissionInput["location"] {
    return {
      consent: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      source: "local"
    };
  }

  async function ipLocation() {
    const response = await fetch("/api/location", { cache: "no-store" });
    if (!response.ok) throw new Error("Location lookup failed.");
    return (await response.json()) as SubmissionInput["location"];
  }

  function browserLocation() {
    if (!navigator.geolocation) {
      return Promise.reject(new Error("Browser geolocation unavailable."));
    }

    return new Promise<SubmissionInput["location"]>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            consent: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            source: "browser"
          });
        },
        reject,
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 }
      );
    });
  }

  function captureLocation() {
    setLocationConsent(true);
    setLocationStatus("locating");

    const request = Promise.allSettled([ipLocation(), browserLocation()]).then(([ipResult, browserResult]) => {
      const ipSnapshot = ipResult.status === "fulfilled" ? ipResult.value : null;
      const browserSnapshot = browserResult.status === "fulfilled" ? browserResult.value : null;
      const context = localLocationContext();
      const captured: SubmissionInput["location"] = {
        ...context,
        ...ipSnapshot,
        ...browserSnapshot,
        city: ipSnapshot?.city,
        region: ipSnapshot?.region,
        country: ipSnapshot?.country,
        countryCode: ipSnapshot?.countryCode,
        timezone: browserSnapshot?.timezone ?? ipSnapshot?.timezone ?? context.timezone,
        locale: context.locale,
        source: browserSnapshot ? "browser+ipinfo" : ipSnapshot?.source
      };

      const hasCoordinates = captured.latitude != null && captured.longitude != null;
      setLocation(hasCoordinates ? captured : context);
      setLocationStatus(hasCoordinates ? "captured" : "unavailable");
      return hasCoordinates ? captured : context;
    });

    locationPromiseRef.current = request;
    return request;
  }

  function selectedWord() {
    return lifeChoice === "Other" ? otherChoice.trim() : lifeChoice;
  }

  function transitionToStep(nextStep: Step) {
    if (nextStep === step) return;
    if (stepTransitionTimeoutRef.current) {
      window.clearTimeout(stepTransitionTimeoutRef.current);
    }
    setIsStepExiting(true);
    stepTransitionTimeoutRef.current = window.setTimeout(() => {
      setStep(nextStep);
      setIsStepExiting(false);
      stepTransitionTimeoutRef.current = null;
    }, 180);
  }

  function stepSurfaceClass(className: string) {
    return `${className} step-surface${isStepExiting ? " is-exiting" : ""}`;
  }

  function continueToRatings() {
    setError("");
    if (!selectedWord() || !guidingValue.trim() || !alignment || !blocker.trim() || !enabler.trim()) {
      setError("Complete the five reflection questions before continuing.");
      return;
    }
    setRatingTransitionDirection("forward");
    transitionToStep("ratings");
  }

  function handleReflectEnter(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!selectedWord() || !guidingValue.trim() || !alignment || !blocker.trim() || !enabler.trim()) return;
    event.preventDefault();
    continueToRatings();
  }

  function continueToContext() {
    setError("");
    const missing = RATING_DIMENSIONS.find((dimension) => typeof ratings[dimension] !== "number");
    if (missing) {
      setError("Answer every last-year reflection before continuing.");
      return;
    }
    transitionToStep("context");
  }

  function continueRatingFlow() {
    setError("");
    const dimension = RATING_DIMENSIONS[currentRatingIndex];
    if (typeof ratings[dimension] !== "number") {
      setError("Choose a response before continuing.");
      return;
    }
    if (currentRatingIndex < RATING_DIMENSIONS.length - 1) {
      setRatingTransitionDirection("forward");
      setCurrentRatingIndex((index) => index + 1);
      return;
    }
    continueToContext();
  }

  async function latestLocation() {
    if (!locationConsent) return { consent: false };
    if (locationPromiseRef.current) return locationPromiseRef.current;
    return {
      ...location,
      consent: true,
      timezone: location.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: location.locale ?? navigator.language
    };
  }

  function setRating(dimension: string, value: number) {
    setRatings((current) => ({ ...current, [dimension]: value }));
  }

  function jumpToScreen(nextStep: Step) {
    setError("");
    transitionToStep(nextStep);
  }

  const reflectionWord = selectedWord();
  const valueUnlocked = Boolean(reflectionWord);
  const alignmentUnlocked = valueUnlocked && Boolean(guidingValue.trim());
  const shapingQuestionsUnlocked = alignmentUnlocked && Boolean(alignment);

  async function submit() {
    setError("");
    const word = reflectionWord;
    if (!word || !guidingValue.trim() || !alignment || !blocker.trim() || !enabler.trim()) {
      setError("Complete the five reflection questions before continuing.");
      transitionToStep("reflect");
      return;
    }
    if (lifeChoice === "Other" && !otherChoice.trim()) {
      setError("Name your other choice before submitting.");
      transitionToStep("reflect");
      return;
    }

    setIsSubmitting(true);
    try {
      const locationSnapshot = await latestLocation();
      const payload: SubmissionInput = {
        idealWord: word,
        guidingValue,
        alignment,
        blocker,
        enabler,
        lifeChoice,
        otherChoice,
        ratings: ratings as Record<string, number>,
        ageBand,
        gender,
        genderSelfDescription,
        cohortSlug: cohortConfig.slug || undefined,
        cohortLabel: cohortConfig.slug ? cohortConfig.label : undefined,
        location: locationSnapshot
      };

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        setError(data.error ?? "Something went wrong while saving your response.");
        return;
      }

      setSubmission(data.submission);
      fetch(statsPath(cohortConfig))
        .then((response) => response.json())
        .then(setStats)
        .catch(() => setStats(data.stats));
      transitionToStep("results");
    } catch (submitError) {
      console.error("Submit failed", submitError);
      setError("Something went wrong while saving your response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <Link className="mark" href="/">Experiments at evolvable.me</Link>
        <a href={EVOLVABLE_URL}>Explore evolvable.me</a>
      </header>

      {showTestNavigator && (
        <ScreenTestNavigator
          step={step}
          onJump={jumpToScreen}
          onClose={() => setShowTestNavigator(false)}
        />
      )}

      {step === "intro" && (
        <section className={stepSurfaceClass("hero")}>
          <div className="hero-deco" aria-hidden="true">
            <VectorDecoration
              className="v1"
              src="/vector-decoration/profile-vector-new-1.svg"
              delay="0s"
              drawDuration="22s"
              stroke="#F4F3F4"
              activateImmediately
            />
            <VectorDecoration
              className="v2"
              src="/vector-decoration/profile-vector-new-2-open.svg"
              delay="0s"
              stroke="#F4F3F4"
              variant="profile-2-hero"
            />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Looking Back</p>
            <h1>What would you want your life to have been?</h1>
            <p>
              A short public experiment about the qualities we hope our lives express. Take a few minutes, answer honestly,
              then see how your reflection sits within the wider pattern.
            </p>
            <button className="primary" onClick={() => transitionToStep("reflect")}>
              Begin <ArrowRight size={18} />
            </button>
          </div>
          <div className="prompt-panel">
            <p>
              Imagine yourself looking back with enough distance to see the shape of things. Not the perfect life, just the
              quality you would most want to recognise in it.
            </p>
          </div>
        </section>
      )}

      {step === "reflect" && (
        <section className={stepSurfaceClass("stage reflect-stage")}>
          <StepHeader
            index="01"
            title="What do you want your life to mean?"
            text="Begin with the word you would want to recognise in your life, then name how aligned you feel and what shapes that alignment."
          />
          <div className="choice-question">
            <h3>
              <span className="question-number">01</span>
              How would you like your life to have been?
            </h3>
            <p>Select one word. If none of these fits, choose Other and name your own.</p>
          </div>
          <div className="choice-grid" aria-label="How you would like your life to have been">
            {LIFE_CHOICES.map((choice) => (
              <button key={choice} className={lifeChoice === choice ? "choice active" : "choice"} onClick={() => setLifeChoice(choice)}>
                {choice}
              </button>
            ))}
          </div>
          {lifeChoice === "Other" && (
            <label className="field other-choice">
              <span>Your word</span>
              <input
                value={otherChoice}
                onChange={(event) => setOtherChoice(event.target.value)}
                onKeyDown={handleReflectEnter}
                placeholder="The word you would use"
                maxLength={48}
              />
            </label>
          )}
          <div className={reflectionWord ? "selected-choice-shell is-open" : "selected-choice-shell"}>
            <div className="selected-choice" aria-live="polite" aria-hidden={!reflectionWord}>
              <span>Your answer</span>
              <strong>{reflectionWord || "Other"}</strong>
            </div>
          </div>
          <div className="form-grid reflect-form-grid">
            <label className={valueUnlocked ? "field wide reflect-value-field is-active" : "field wide reflect-value-field is-disabled"}>
              <span>
                <span className="question-number">02</span>
                What is the most important value you live your life by?
              </span>
              <textarea
                value={guidingValue}
                onChange={(event) => setGuidingValue(event.target.value)}
                onKeyDown={handleReflectEnter}
                placeholder="A word or sentence"
                rows={3}
                disabled={!valueUnlocked}
              />
            </label>
            <div className={alignmentUnlocked ? "field wide alignment-field is-active" : "field wide alignment-field is-disabled"}>
              <span>
                <span className="question-number">03</span>
                {reflectionWord
                  ? `Are you living your life in alignment with your choice ("${reflectionWord}")?`
                  : "Are you living your life in alignment with your choice?"}
              </span>
              <AlignmentOrbControl
                value={alignmentToValue(alignment)}
                disabled={!alignmentUnlocked}
                selectedWord={reflectionWord}
                onChange={(value) => setAlignment(ALIGNMENT_OPTIONS[value + 2])}
              />
            </div>
            <label className={shapingQuestionsUnlocked ? "field reflection-field is-active" : "field reflection-field is-disabled"}>
              <span>
                <span className="question-number">04</span>
                What blocks you?
              </span>
              <input
                value={blocker}
                onChange={(event) => setBlocker(event.target.value)}
                onKeyDown={handleReflectEnter}
                placeholder="A word or name"
                maxLength={80}
                disabled={!shapingQuestionsUnlocked}
              />
            </label>
            <label className={shapingQuestionsUnlocked ? "field reflection-field is-active" : "field reflection-field is-disabled"}>
              <span>
                <span className="question-number">05</span>
                What enables you?
              </span>
              <input
                value={enabler}
                onChange={(event) => setEnabler(event.target.value)}
                onKeyDown={handleReflectEnter}
                placeholder="A word or name"
                maxLength={80}
                disabled={!shapingQuestionsUnlocked}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <NavActions back={() => transitionToStep("intro")} next={continueToRatings} />
        </section>
      )}

      {step === "ratings" && (
        <section className={stepSurfaceClass("stage ratings-stage")}>
          <div className="ratings-stage-deco" aria-hidden="true">
            <VectorDecoration
              className="ratings-v1"
              src="/vector-decoration/profile-vector-new-1.svg"
              delay="0s"
              drawDuration="22s"
              stroke="#F4F3F4"
              activateImmediately
            />
            <VectorDecoration
              className="ratings-v2"
              src="/vector-decoration/profile-vector-new-2-open.svg"
              delay="0s"
              stroke="#F4F3F4"
              variant="profile-2-hero"
            />
          </div>
          <StepHeader index="02" title="Look back over the last year" text="Compared with your usual life, how much did you feel each of these in the last year?" />
          <RatingFocusPanel
            dimension={RATING_DIMENSIONS[currentRatingIndex]}
            index={currentRatingIndex}
            total={RATING_DIMENSIONS.length}
            value={ratings[RATING_DIMENSIONS[currentRatingIndex]]}
            transitionDirection={ratingTransitionDirection}
            onChange={(value) => setRating(RATING_DIMENSIONS[currentRatingIndex], value)}
          />
          {error && <p className="error">{error}</p>}
          <NavActions
            back={() => {
              setError("");
              if (currentRatingIndex > 0) {
                setRatingTransitionDirection("back");
                setCurrentRatingIndex((index) => index - 1);
                return;
              }
              transitionToStep("reflect");
            }}
            next={continueRatingFlow}
            nextLabel={currentRatingIndex === RATING_DIMENSIONS.length - 1 ? "Continue" : "Next"}
          />
        </section>
      )}

      {step === "context" && (
        <section className={stepSurfaceClass("stage")}>
          <StepHeader index="03" title="Add context" text="These fields are optional, but they make the public pattern more meaningful." />
          <div className="form-grid">
            <label className="field">
              <span>Age</span>
              <select value={ageBand} onChange={(event) => setAgeBand(event.target.value)}>
                <option value="">Prefer not to say</option>
                {AGE_BANDS.map((band) => (
                  <option key={band}>{band}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Gender</span>
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Prefer not to say</option>
                {GENDERS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            {gender === "Prefer to self-describe" && (
              <label className="field wide">
                <span>Self-description</span>
                <input
                  value={genderSelfDescription}
                  onChange={(event) => setGenderSelfDescription(event.target.value)}
                  placeholder="How would you describe your gender?"
                  maxLength={80}
                />
              </label>
            )}
            <div className="consent wide">
              <Globe2 />
              <div>
                <strong>Approximate location</strong>
                <p>Allow approximate location so your result can be compared geographically. We do not store your IP address.</p>
              </div>
              <button
                className={locationConsent ? "secondary active" : "secondary"}
                onClick={captureLocation}
              >
                {locationStatus === "locating" ? "Locating..." : locationConsent ? "Allowed" : "Allow"}
              </button>
            </div>
            {locationConsent && (
              <p className="location-note wide">
                {locationStatus === "captured"
                  ? "Location added for the geographic pattern."
                  : locationStatus === "locating"
                    ? "Looking up an approximate city-level location."
                    : "Location permission was not available, so this response will not add a map point."}
              </p>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <NavActions back={() => transitionToStep("ratings")} next={submit} nextLabel={isSubmitting ? "Saving..." : "See results"} disabled={isSubmitting} />
        </section>
      )}

      {step === "results" && (
        <Results
          stats={stats ?? PREVIEW_STATS}
          submission={submission ?? PREVIEW_SUBMISSION}
          hasSubmission={submission != null}
          cohortLabel={cohortConfig.label}
          className={stepSurfaceClass("")}
        />
      )}
    </main>
  );
}

function statsPath(cohortConfig: { slug: string; label: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("legacy", "1");
  if (cohortConfig.slug) {
    searchParams.set("cohort", cohortConfig.slug);
    searchParams.set("cohortLabel", cohortConfig.label || "WMC2026 Conference");
  }
  const query = searchParams.toString();
  return `/api/stats${query ? `?${query}` : ""}`;
}

function ScreenTestNavigator({
  step,
  onJump,
  onClose
}: {
  step: Step;
  onJump: (step: Step) => void;
  onClose: () => void;
}) {
  const currentIndex = SCREEN_TEST_STEPS.indexOf(step);
  const previousStep = SCREEN_TEST_STEPS[Math.max(currentIndex - 1, 0)];
  const nextStep = SCREEN_TEST_STEPS[Math.min(currentIndex + 1, SCREEN_TEST_STEPS.length - 1)];

  return (
    <div className="screen-test-nav" aria-label="Screen test navigation">
      <strong>Screen test</strong>
      <button className="secondary" onClick={() => onJump(previousStep)} disabled={currentIndex === 0}>
        Previous
      </button>
      <button className="primary" onClick={() => onJump(nextStep)} disabled={currentIndex === SCREEN_TEST_STEPS.length - 1}>
        Next screen <ArrowRight size={16} />
      </button>
      <div className="screen-test-jumps">
        {SCREEN_TEST_STEPS.map((screen) => (
          <button
            key={screen}
            className={step === screen ? "segment active" : "segment"}
            onClick={() => onJump(screen)}
          >
            {screen}
          </button>
        ))}
      </div>
      <button className="ghost" onClick={onClose}>
        Hide
      </button>
    </div>
  );
}

function StepHeader({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="step-header">
      <span>{index}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function NavActions({
  back,
  next,
  nextLabel = "Continue",
  disabled = false
}: {
  back: () => void;
  next: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="actions">
      <button className="primary nav-back" onClick={back}>
        <ArrowLeft size={18} />
        Back
      </button>
      <button className="primary" onClick={next} disabled={disabled}>
        {nextLabel} <ArrowRight size={18} />
      </button>
    </div>
  );
}

function alignmentToValue(alignment: string) {
  const index = ALIGNMENT_OPTIONS.indexOf(alignment as (typeof ALIGNMENT_OPTIONS)[number]);
  return index === -1 ? undefined : index - 2;
}

function AlignmentOrbControl({
  value,
  disabled,
  selectedWord,
  onChange
}: {
  value?: number;
  disabled: boolean;
  selectedWord: string;
  onChange: (value: number) => void;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [visualValue, setVisualValue] = useState(value ?? 0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setVisualValue(value ?? 0);
    setIsDragging(false);
  }, [value]);

  const visibleValue = isDragging ? snapValue(visualValue) : value;
  const selectedOption = typeof visibleValue === "number" ? ALIGNMENT_OPTIONS[visibleValue + 2] : undefined;
  const thumbSize = 26 + ((visualValue + 2) / 4) * 54;
  const orbPosition = ((visualValue + 2) / 4) * 100;

  function valueFromPointer(clientX: number) {
    const lane = laneRef.current;
    if (!lane) return visualValue;
    const rect = lane.getBoundingClientRect();
    const progress = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return progress * 4 - 2;
  }

  function snapValue(rawValue: number) {
    return Math.min(Math.max(Math.round(rawValue), -2), 2);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || disabled) return;
    setVisualValue(valueFromPointer(event.clientX));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || disabled) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const snapped = snapValue(valueFromPointer(event.clientX));
    setIsDragging(false);
    setVisualValue(snapped);
    onChange(snapped);
  }

  return (
    <div className="alignment-orb-control">
      <div
        className="rating-orb-field"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="rating-orb-hit-grid" aria-hidden="true">
          {ALIGNMENT_OPTIONS.map((option, index) => (
            <button
              key={option}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const nextValue = index - 2;
                setIsDragging(false);
                setVisualValue(nextValue);
                onChange(nextValue);
              }}
            />
          ))}
        </div>
        <div ref={laneRef} className="rating-orb-lane">
          <button
            className={isDragging ? "rating-orb-thumb dragging" : "rating-orb-thumb"}
            type="button"
            disabled={disabled}
            aria-label={`Alignment with ${selectedWord || "your choice"}: ${selectedOption ?? "Choose a response"}`}
            style={{
              "--rating-thumb-size": `${thumbSize}px`,
              "--rating-orb-position": `${orbPosition}%`
            } as React.CSSProperties}
            onPointerDown={(event) => {
              if (disabled) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsDragging(true);
              setVisualValue(valueFromPointer(event.clientX));
            }}
            onKeyDown={(event) => {
              if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const nextValue = Math.min(Math.max((value ?? 0) + direction, -2), 2);
              setVisualValue(nextValue);
              onChange(nextValue);
            }}
          />
        </div>
      </div>
      <div className="rating-scale" role="group" aria-label="Alignment response options">
        {ALIGNMENT_OPTIONS.map((option, index) => {
          const optionValue = index - 2;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              className={visibleValue === optionValue ? "rating-scale-option active" : "rating-scale-option"}
              onClick={() => {
                if (disabled) return;
                setIsDragging(false);
                setVisualValue(optionValue);
                onChange(optionValue);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingFocusPanel({
  dimension,
  index,
  total,
  value,
  transitionDirection,
  onChange
}: {
  dimension: string;
  index: number;
  total: number;
  value?: number;
  transitionDirection: "forward" | "back";
  onChange: (value: number) => void;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [visualValue, setVisualValue] = useState(value ?? 0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setVisualValue(value ?? 0);
    setIsDragging(false);
  }, [dimension, value]);

  const visibleRatingValue = isDragging ? snapValue(visualValue) : value;
  const selectedOption = RATING_OPTIONS.find((option) => option.value === visibleRatingValue);
  const progress = ((index + 1) / total) * 100;
  const thumbSize = 26 + ((visualValue + 2) / 4) * 54;
  const orbPosition = ((visualValue + 2) / 4) * 100;

  function valueFromPointer(clientX: number) {
    const lane = laneRef.current;
    if (!lane) return visualValue;
    const rect = lane.getBoundingClientRect();
    const progress = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return progress * 4 - 2;
  }

  function snapValue(rawValue: number) {
    return Math.min(Math.max(Math.round(rawValue), -2), 2);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setVisualValue(valueFromPointer(event.clientX));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const snapped = snapValue(valueFromPointer(event.clientX));
    setIsDragging(false);
    setVisualValue(snapped);
    onChange(snapped);
  }

  return (
    <div className="rating-focus">
      <div className="rating-focus-header">
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <div className="rating-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div key={dimension} className={`rating-widget rating-widget-${transitionDirection}`}>
        <div className="rating-copy">
          <h3>{dimension}</h3>
          <p>{selectedOption?.label ?? "Choose a response"}</p>
        </div>
        <div
          className="rating-orb-field"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="rating-orb-hit-grid" aria-hidden="true">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setIsDragging(false);
                  setVisualValue(option.value);
                  onChange(option.value);
                }}
              />
            ))}
          </div>
          <div ref={laneRef} className="rating-orb-lane">
            <button
              className={isDragging ? "rating-orb-thumb dragging" : "rating-orb-thumb"}
              type="button"
              aria-label={`${dimension}: ${selectedOption?.label ?? "Choose a response"}`}
              style={{
                "--rating-thumb-size": `${thumbSize}px`,
                "--rating-orb-position": `${orbPosition}%`
              } as React.CSSProperties}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setIsDragging(true);
                setVisualValue(valueFromPointer(event.clientX));
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const nextValue = Math.min(Math.max((value ?? 0) + direction, -2), 2);
                setVisualValue(nextValue);
                onChange(nextValue);
              }}
            />
          </div>
        </div>
        <div className="rating-scale" role="group" aria-label={`${dimension} response options`}>
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={visibleRatingValue === option.value ? "rating-scale-option active" : "rating-scale-option"}
              onClick={() => {
                setIsDragging(false);
                setVisualValue(option.value);
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Results({
  stats,
  submission,
  hasSubmission,
  cohortLabel,
  className
}: {
  stats: Stats;
  submission: Submission;
  hasSubmission: boolean;
  cohortLabel: string;
  className?: string;
}) {
  const [choiceChartView, setChoiceChartView] = useState<"cohort" | "population">("cohort");
  const [ratingChartView, setRatingChartView] = useState<"cohort" | "population">("cohort");
  const forcedChoices = useMemo(() => {
    const sourceChoices = stats.cohortComparison?.cohort ?? stats.choices;
    const visibleChoices = sourceChoices.filter((item) => FORCED_CHOICE_SET.has(item.choice));
    const visibleTotal = visibleChoices.reduce((sum, item) => sum + item.count, 0);
    return visibleChoices.map((item) => ({
      ...item,
      percent: visibleTotal ? item.count / visibleTotal : 0
    }));
  }, [stats.choices, stats.cohortComparison]);
  const forcedTotal = forcedChoices.reduce((sum, item) => sum + item.count, 0);
  const choice = forcedChoices.find((item) => item.choice === submission.lifeChoice);
  const topChoice = forcedChoices[0];
  const cohortComparison = stats.cohortComparison;
  const effectiveCohortLabel = cohortComparison?.cohortLabel || cohortLabel || "WMC2026 Conference";
  const historicLabel = cohortComparison?.populationLabel || "Historic Data";
  const comparisonData = useMemo(() => buildCohortChartData(cohortComparison), [cohortComparison]);
  const populationTopChoice = cohortComparison?.population[0]?.choice;
  const cohortTopChoice = cohortComparison?.cohort[0]?.choice;
  const choiceChartChoices = cohortComparison
    ? choiceChartView === "cohort"
      ? cohortComparison.cohort
      : cohortComparison.population
    : forcedChoices;
  const chartData = useMemo(() => buildChoiceChartData(choiceChartChoices), [choiceChartChoices]);
  const choiceChartLabel = choiceChartView === "cohort" ? effectiveCohortLabel : historicLabel;
  const ratingChartSource = cohortComparison
    ? ratingChartView === "cohort"
      ? cohortComparison.cohortRatings
      : cohortComparison.populationRatings
    : stats.ratings;
  const ratingData = ratingChartSource.map((item) => ({ name: item.dimension, average: Number(item.average.toFixed(2)) }));
  const ratingChartLabel = ratingChartView === "cohort" ? effectiveCohortLabel : historicLabel;

  return (
    <section className={`results ${className ?? ""}`}>
      <div className="result-hero">
        <p className="eyebrow">{hasSubmission ? "Your result" : "Results"}</p>
        <h1>{hasSubmission ? `You chose ${submission.lifeChoice}.` : `${effectiveCohortLabel} results.`}</h1>
        <p>
          {hasSubmission
            ? choice
              ? `${choice.count} ${choice.count === 1 ? "person has" : "people have"} chosen this so far.`
              : "You are the first person in this category."
            : `${forcedTotal} ${forcedTotal === 1 ? "response" : "responses"} in this view.`}{" "}
          {topChoice ? `The current leading pattern is ${topChoice.choice}.` : ""}
        </p>
      </div>

      <div className="insight-grid">
        <Metric icon={<Compass />} label="Responses so far" value={String(forcedTotal)} />
        <Metric icon={<BarChart3 />} label="Your category share" value={choice ? `${Math.round(choice.percent * 1000) / 10}%` : "New"} />
        <Metric icon={<Sparkles />} label="Most common" value={topChoice?.choice ?? "Awaiting data"} />
      </div>

      <div className="chart-section">
        <div className="chart-section-header">
          <div>
            <h2>How people are choosing</h2>
            <p>{choiceChartLabel} results, ordered by the most chosen answers in that group.</p>
          </div>
          {cohortComparison && (
            <div className="chart-view-toggle" aria-label="Choose results group">
              <button
                className={choiceChartView === "cohort" ? "segment active" : "segment"}
                type="button"
                onClick={() => setChoiceChartView("cohort")}
              >
                {effectiveCohortLabel}
              </button>
              <button
                className={choiceChartView === "population" ? "segment active" : "segment"}
                type="button"
                onClick={() => setChoiceChartView("population")}
              >
                {historicLabel}
              </button>
            </div>
          )}
        </div>
        <div className="chart-card">
          {chartData.length ? (
            <AnimatedChoiceChart
              data={chartData}
              submissionChoice={hasSubmission ? submission.lifeChoice : ""}
              animationKey={choiceChartView}
            />
          ) : (
            <p className="muted empty-chart-message">No responses yet for {choiceChartLabel}.</p>
          )}
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>Last-year feeling profile</h3>
              <p>{ratingChartLabel} averages.</p>
            </div>
            {cohortComparison && (
              <div className="chart-view-toggle compact" aria-label="Choose feeling results group">
                <button
                  className={ratingChartView === "cohort" ? "segment active" : "segment"}
                  type="button"
                  onClick={() => setRatingChartView("cohort")}
                >
                  {effectiveCohortLabel}
                </button>
                <button
                  className={ratingChartView === "population" ? "segment active" : "segment"}
                  type="button"
                  onClick={() => setRatingChartView("population")}
                >
                  {historicLabel}
                </button>
              </div>
            )}
          </div>
          {ratingData.length ? (
            <div className="feeling-chart-frame">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ded7cc" />
                  <XAxis dataKey="name" tick={{ fill: "#302f2b", fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
                  <YAxis domain={[-2, 2]} tick={{ fill: "#302f2b", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="average" fill={ratingChartView === "cohort" ? "#e75117" : "#3b6b8f"} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={620} animationEasing="ease-in-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted empty-chart-message">No feeling data yet for {ratingChartLabel}.</p>
          )}
        </div>
      </div>

      <div className="chart-section">
        <div>
          <h2>{effectiveCohortLabel} vs {historicLabel}</h2>
          <p>A direct comparison between people taking part at this event and the fixed historical dataset.</p>
        </div>
        <CohortComparisonView
          data={comparisonData}
          comparison={cohortComparison}
          populationTopChoice={populationTopChoice}
          cohortTopChoice={cohortTopChoice}
          cohortLabel={effectiveCohortLabel}
        />
      </div>

      <div className="chart-section">
        <div>
          <h2>Values people are living by WMC2026</h2>
          <p>Anonymised fragments from the value question on the first page.</p>
        </div>
        <WordCloud words={stats.values} emptyText="Values will appear here as people answer the first-page reflection." />
      </div>

      <div className="chart-section">
        <div>
          <h2>What shapes alignment WMC2026</h2>
          <p>Words and names people gave for what blocks and enables alignment with their Looking Back choice.</p>
        </div>
        <div className="two-col word-cloud-columns">
          <div>
            <h3>What gets in the way</h3>
            <WordCloud words={stats.blockers} emptyText="Blockers will appear here once participants add them." compact />
          </div>
          <div>
            <h3>What helps</h3>
            <WordCloud words={stats.enablers} emptyText="Enablers will appear here once participants add them." compact />
          </div>
        </div>
      </div>

      <div className="closing">
        <h2>Explore what drives your choices in evolvable.me</h2>
        <p>
          Continue into evolvable.me to learn more about yourself, understand what shapes your decisions, and explore your
          personal journey in more depth.
        </p>
        <a className="primary link-button cta-button cta-glow-button" href={EVOLVABLE_URL}>
          <span className="cta-glow-band" aria-hidden="true" />
          <span className="cta-glow-plate" aria-hidden="true" />
          <span className="cta-glow-outline" aria-hidden="true" />
          <span className="cta-glow-label">
            <span className="cta-glow-label-text">Explore evolvable.me</span>
          </span>
        </a>
      </div>
    </section>
  );
}

function WordCloud({ words, emptyText, compact = false }: { words: string[]; emptyText: string; compact?: boolean }) {
  const cloudWords = useMemo(() => buildWordCloud(words), [words]);
  if (!cloudWords.length) {
    return <p className="word-cloud empty-word-cloud">{emptyText}</p>;
  }

  return (
    <div className={compact ? "word-cloud compact" : "word-cloud"} aria-label="Anonymised response fragments">
      {cloudWords.map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          tabIndex={0}
          aria-label={`${word.text}: ${word.count} ${word.count === 1 ? "response" : "responses"}`}
          data-count-label={`${word.count} ${word.count === 1 ? "response" : "responses"}`}
          className={`word-cloud-item size-${word.size}`}
          style={{ "--word-cloud-color": COLORS[index % COLORS.length] } as React.CSSProperties}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}

function buildWordCloud(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    for (const fragment of valueFragments(value)) {
      counts.set(fragment, (counts.get(fragment) ?? 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 34);
  const max = Math.max(...sorted.map(([, count]) => count), 1);

  return sorted.map(([text, count]) => ({
    text,
    count,
    size: Math.max(1, Math.min(5, Math.ceil((count / max) * 5)))
  }));
}

function valueFragments(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim().replace(/^[-']+|[-']+$/g, ""))
    .filter((word) => word.length > 2 && !COMMON_WORDS.has(word));
  return Array.from(new Set(cleaned)).slice(0, 8);
}

const COMMON_WORDS = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "have",
  "how",
  "into",
  "life",
  "live",
  "living",
  "most",
  "not",
  "that",
  "the",
  "their",
  "this",
  "through",
  "what",
  "when",
  "with",
  "you",
  "your"
]);

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type ChoiceChartRow = {
  name: string;
  count: number;
  percent: number;
};

const CHOICE_CHART_ANIMATION_MS = 1400;
const CHOICE_CHART_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

function AnimatedChoiceChart({
  data,
  submissionChoice,
  animationKey
}: {
  data: ChoiceChartRow[];
  submissionChoice: string;
  animationKey: string;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositionsRef = useRef(new Map<string, number>());
  const previousAnimationKeyRef = useRef(animationKey);
  const previousHeightRef = useRef<number | null>(null);
  const heightFrameRef = useRef<number | null>(null);
  const heightTimeoutRef = useRef<number | null>(null);
  const [chartHeight, setChartHeight] = useState<number | null>(null);
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  useLayoutEffect(() => {
    if (heightFrameRef.current) {
      window.cancelAnimationFrame(heightFrameRef.current);
      heightFrameRef.current = null;
    }
    if (heightTimeoutRef.current) {
      window.clearTimeout(heightTimeoutRef.current);
      heightTimeoutRef.current = null;
    }

    const nextHeight = chartRef.current?.scrollHeight ?? null;
    const previousHeight = previousHeightRef.current;
    const shouldAnimateChartHeight =
      previousAnimationKeyRef.current !== animationKey &&
      previousHeight != null &&
      nextHeight != null &&
      Math.abs(previousHeight - nextHeight) > 1;

    if (shouldAnimateChartHeight) {
      setChartHeight(previousHeight);
      heightFrameRef.current = window.requestAnimationFrame(() => {
        setChartHeight(nextHeight);
      });
      heightTimeoutRef.current = window.setTimeout(() => {
        setChartHeight(null);
        heightTimeoutRef.current = null;
      }, 1450);
    } else {
      setChartHeight(null);
    }

    const currentPositions = new Map<string, number>();

    for (const [name, element] of rowRefs.current.entries()) {
      currentPositions.set(name, element.offsetTop);
    }

    if (previousAnimationKeyRef.current !== animationKey) {
      for (const [name, element] of rowRefs.current.entries()) {
        const previousTop = previousPositionsRef.current.get(name);
        const currentTop = currentPositions.get(name);
        if (previousTop == null || currentTop == null) continue;

        const delta = previousTop - currentTop;
        if (Math.abs(delta) < 1) continue;

        element.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: "translateY(0)" }
          ],
          {
            duration: CHOICE_CHART_ANIMATION_MS,
            easing: CHOICE_CHART_EASING
          }
        );
      }
    }

    previousPositionsRef.current = currentPositions;
    previousAnimationKeyRef.current = animationKey;

    if (nextHeight != null) {
      previousHeightRef.current = nextHeight;
    }

    return () => {
      if (heightFrameRef.current) {
        window.cancelAnimationFrame(heightFrameRef.current);
        heightFrameRef.current = null;
      }
      if (heightTimeoutRef.current) {
        window.clearTimeout(heightTimeoutRef.current);
        heightTimeoutRef.current = null;
      }
    };
  }, [animationKey, data]);

  return (
    <div
      className={chartHeight == null ? "animated-choice-chart-shell" : "animated-choice-chart-shell is-resizing"}
      style={chartHeight == null ? undefined : { height: chartHeight }}
    >
      <div className="animated-choice-chart" ref={chartRef}>
        {data.map((item, index) => (
          <div
            className={item.name === submissionChoice ? "ranked-bar-row highlighted" : "ranked-bar-row"}
            key={item.name}
            ref={(element) => {
              if (element) {
                rowRefs.current.set(item.name, element);
              } else {
                rowRefs.current.delete(item.name);
              }
            }}
          >
            <div className="ranked-label">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.name}</strong>
            </div>
            <div className="ranked-track" aria-hidden="true">
              <AnimatedChoiceBar
                color={stableChoiceColor(item.name)}
                width={Math.max((item.count / maxCount) * 100, 2)}
              />
            </div>
            <div className="ranked-count">
              <AnimatedNumber className="ranked-count-value" value={item.count} decimals={0} />
              <AnimatedNumber className="ranked-count-percent" value={item.percent} decimals={1} suffix="%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedChoiceBar({ color, width }: { color: string; width: number }) {
  const previousWidthRef = useRef(width);
  const barRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const previousWidth = previousWidthRef.current;
    if (barRef.current && Math.abs(previousWidth - width) > 0.1) {
      barRef.current.animate(
        [
          { width: `${previousWidth}%` },
          { width: `${width}%` }
        ],
        {
          duration: CHOICE_CHART_ANIMATION_MS,
          easing: CHOICE_CHART_EASING
        }
      );
    }
    previousWidthRef.current = width;
  }, [width]);

  return <i ref={barRef} style={{ width: `${width}%`, background: color }} />;
}

function AnimatedNumber({
  className,
  value,
  decimals,
  suffix = ""
}: {
  className?: string;
  value: number;
  decimals: number;
  suffix?: string;
}) {
  const previousValueRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    if (Math.abs(previousValue - value) < 0.001) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    let animationFrame = 0;
    const startTime = performance.now();
    const duration = CHOICE_CHART_ANIMATION_MS;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOut(progress);
      setDisplayValue(previousValue + (value - previousValue) * eased);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = value;
      }
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      previousValueRef.current = value;
    };
  }, [value]);

  return <strong className={className}>{formatAnimatedNumber(displayValue, decimals, suffix)}</strong>;
}

function easeInOut(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function formatAnimatedNumber(value: number, decimals: number, suffix: string) {
  return `${decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals)}${suffix}`;
}

function stableChoiceColor(choice: string) {
  return CHOICE_COLORS.get(choice) ?? COLORS[Math.abs(hashChoice(choice)) % COLORS.length];
}

function hashChoice(choice: string) {
  let hash = 0;
  for (let index = 0; index < choice.length; index++) {
    hash = (hash * 31 + choice.charCodeAt(index)) | 0;
  }
  return hash;
}

type CohortComparisonRow = {
  choice: string;
  population: { count: number; percent: number };
  cohort: { count: number; percent: number };
  total: number;
};

function buildChoiceChartData(choices: Stats["choices"]): ChoiceChartRow[] {
  return choices
    .filter((item) => FORCED_CHOICE_SET.has(item.choice) && item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.choice,
      count: item.count,
      percent: Math.round(item.percent * 1000) / 10
    }));
}

function buildCohortChartData(comparison?: Stats["cohortComparison"]): CohortComparisonRow[] {
  if (!comparison) return [];
  const rowsByChoice = new Map<string, CohortComparisonRow>();

  for (const item of [...comparison.population, ...comparison.cohort]) {
    if (!FORCED_CHOICE_SET.has(item.choice)) continue;
    rowsByChoice.set(item.choice, {
      choice: item.choice,
      population: { count: 0, percent: 0 },
      cohort: { count: 0, percent: 0 },
      total: 0
    });
  }

  for (const item of comparison.population) {
    const row = rowsByChoice.get(item.choice);
    if (!row) continue;
    row.population = { count: item.count, percent: item.percent * 100 };
    row.total += item.count;
  }

  for (const item of comparison.cohort) {
    const row = rowsByChoice.get(item.choice);
    if (!row) continue;
    row.cohort = { count: item.count, percent: item.percent * 100 };
    row.total += item.count;
  }

  return Array.from(rowsByChoice.values())
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

function CohortComparisonView({
  data,
  comparison,
  populationTopChoice,
  cohortTopChoice,
  cohortLabel
}: {
  data: CohortComparisonRow[];
  comparison?: Stats["cohortComparison"];
  populationTopChoice?: string;
  cohortTopChoice?: string;
  cohortLabel: string;
}) {
  if (!comparison) {
    return <p className="muted">Event comparison appears when an event cohort is configured.</p>;
  }

  if (!data.length) {
    return <p className="muted">The event comparison will appear as conference responses come in.</p>;
  }

  const maxDifference = Math.max(4, ...data.map((row) => Math.abs(row.cohort.percent - row.population.percent)));
  const maxComparisonPercent = Math.max(
    10,
    Math.min(
      50,
      Math.ceil(Math.max(...data.flatMap((row) => [row.cohort.percent, row.population.percent])) / 5) * 5
    )
  );
  const historicLabel = comparison.populationLabel || "Historic Data";

  return (
    <div className="cohort-comparison">
      <div className="cohort-summary">
        <span aria-hidden="true" />
        <span className="comparison-scale-head">
          <span><strong>{cohortLabel}</strong> {comparison.cohortTotal} responses</span>
          <span><strong>{historicLabel}</strong> {comparison.populationTotal} responses</span>
        </span>
        <span aria-hidden="true" />
      </div>
      <div className="cohort-topline">
        <strong>Most chosen</strong>
        <span className="comparison-scale-head">
          <span>{cohortLabel}: {cohortTopChoice ?? "Awaiting data"}</span>
          <span>{historicLabel}: {populationTopChoice ?? "Awaiting data"}</span>
        </span>
        <span aria-hidden="true" />
      </div>
      <div className="comparison-head">
        <span>Choice</span>
        <span className="comparison-scale-head">
          <span>{cohortLabel}</span>
          <span>{historicLabel}</span>
        </span>
        <span>Difference</span>
      </div>
      {data.map((row, index) => (
        <div className="comparison-row" key={row.choice}>
          <div className="comparison-choice">
            <strong>{row.choice}</strong>
            <span>{row.total} responses</span>
          </div>
          <MirroredComparisonMetric
            cohort={row.cohort}
            population={row.population}
            maxPercent={maxComparisonPercent}
            cohortLabel={cohortLabel}
            historicLabel={historicLabel}
            showScale={index === data.length - 1}
          />
          <DifferenceMetric
            difference={row.cohort.percent - row.population.percent}
            maxDifference={maxDifference}
            cohortLabel={cohortLabel}
            historicLabel={historicLabel}
          />
        </div>
      ))}
    </div>
  );
}

function MirroredComparisonMetric({
  cohort,
  population,
  maxPercent,
  cohortLabel,
  historicLabel,
  showScale
}: {
  cohort: { count: number; percent: number };
  population: { count: number; percent: number };
  maxPercent: number;
  cohortLabel: string;
  historicLabel: string;
  showScale: boolean;
}) {
  const cohortWidth = Math.min((cohort.percent / maxPercent) * 50, 50);
  const populationWidth = Math.min((population.percent / maxPercent) * 50, 50);
  const tickStep = 10;
  const ticks = Array.from(
    { length: Math.floor(maxPercent / tickStep) },
    (_, index) => (index + 1) * tickStep
  );

  return (
    <div className="comparison-mirror">
      <div className="comparison-values">
        <div className="comparison-value cohort-value" aria-label={`${cohortLabel}: ${formatComparisonPercent(cohort.percent)}, ${cohort.count} responses`}>
          <span>{cohort.count}</span>
          <strong>{formatComparisonPercent(cohort.percent)}</strong>
        </div>
        <div className="comparison-value population-value" aria-label={`${historicLabel}: ${formatComparisonPercent(population.percent)}, ${population.count} responses`}>
          <strong>{formatComparisonPercent(population.percent)}</strong>
          <span>{population.count}</span>
        </div>
      </div>
      <div className="comparison-track mirrored-track" aria-hidden="true">
        <i className="cohort" style={{ width: `${cohortWidth}%` }} />
        <i className="population" style={{ width: `${populationWidth}%` }} />
      </div>
      {showScale && (
        <div className="comparison-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              className="cohort-tick"
              key={`cohort-${tick}`}
              style={{ left: `${50 - (tick / maxPercent) * 50}%` }}
            >
              {tick}%
            </span>
          ))}
          <span className="zero-tick">0%</span>
          {ticks.map((tick) => (
            <span
              className="population-tick"
              key={`population-${tick}`}
              style={{ left: `${50 + (tick / maxPercent) * 50}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DifferenceMetric({
  difference,
  maxDifference,
  cohortLabel,
  historicLabel
}: {
  difference: number;
  maxDifference: number;
  cohortLabel: string;
  historicLabel: string;
}) {
  const absoluteDifference = Math.abs(difference);
  const direction = difference > 0 ? "cohort" : "population";
  const deltaCohortLabel = cohortLabel.replace(/WMC2026/i, "WMC 2026").replace(/\s+Conference$/i, "");
  const label = absoluteDifference < 0.5
    ? "Even"
    : `+${absoluteDifference.toFixed(1)}% ${direction === "cohort" ? deltaCohortLabel : historicLabel}`;

  return (
    <div className="comparison-delta">
      <span>{label}</span>
      <div className="delta-track" aria-hidden="true">
        {absoluteDifference >= 0.5 && (
          <i
            className={direction}
            style={{ "--delta-width": `${Math.min((absoluteDifference / maxDifference) * 50, 50)}%` } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  );
}

function formatComparisonPercent(value: number) {
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`;
}
