"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, Compass, Globe2, Sparkles } from "lucide-react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AGE_BANDS,
  EVOLVABLE_URL,
  GENDERS,
  LIFE_CHOICES,
  RATING_DIMENSIONS,
  RATING_OPTIONS
} from "@/lib/constants";
import type { Stats, Submission, SubmissionInput } from "@/lib/types";

const COLORS = ["#e75117", "#2f7d72", "#3b6b8f", "#bca35e", "#8d6f9f", "#6e7f61", "#232322", "#7a6f58"];
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
  locations: [
    { latitude: 51.5072, longitude: -0.1276, choice: "Courage" },
    { latitude: 40.7128, longitude: -74.006, choice: "Kindness" }
  ]
};

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [guidingValue, setGuidingValue] = useState("");
  const [lifeChoice, setLifeChoice] = useState("");
  const [otherChoice, setOtherChoice] = useState("");
  const [ratings, setRatings] = useState<Partial<Record<string, number>>>(
    () => Object.fromEntries(RATING_DIMENSIONS.map((dimension) => [dimension, 0]))
  );
  const [currentRatingIndex, setCurrentRatingIndex] = useState(0);
  const [ageBand, setAgeBand] = useState("");
  const [gender, setGender] = useState("");
  const [genderSelfDescription, setGenderSelfDescription] = useState("");
  const [locationConsent, setLocationConsent] = useState(false);
  const [location, setLocation] = useState<SubmissionInput["location"]>({ consent: false });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [includeLegacy, setIncludeLegacy] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestNavigator, setShowTestNavigator] = useState(SHOW_SCREEN_TEST_NAV);
  const locationPromiseRef = useRef<Promise<SubmissionInput["location"]> | null>(null);

  useEffect(() => {
    const requestedScreen = new URLSearchParams(window.location.search).get("screen");
    if (SCREEN_TEST_STEPS.includes(requestedScreen as Step)) {
      setStep(requestedScreen as Step);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/stats${includeLegacy ? "?legacy=1" : ""}`)
      .then((response) => response.json())
      .then(setStats)
      .catch(() => undefined);
  }, [includeLegacy]);

  useEffect(() => {
    if (step !== "results") return;
    const interval = window.setInterval(() => {
      fetch(`/api/stats${includeLegacy ? "?legacy=1" : ""}`)
        .then((response) => response.json())
        .then(setStats)
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [includeLegacy, step]);

  function baseLocation(): SubmissionInput["location"] {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const approximateCoordinates: Record<string, { latitude: number; longitude: number }> = {
      "Europe/London": { latitude: 51.5072, longitude: -0.1276 },
      "Europe/Dublin": { latitude: 53.3498, longitude: -6.2603 },
      "Europe/Paris": { latitude: 48.8566, longitude: 2.3522 },
      "Europe/Berlin": { latitude: 52.52, longitude: 13.405 },
      "America/New_York": { latitude: 40.7128, longitude: -74.006 },
      "America/Chicago": { latitude: 41.8781, longitude: -87.6298 },
      "America/Denver": { latitude: 39.7392, longitude: -104.9903 },
      "America/Los_Angeles": { latitude: 34.0522, longitude: -118.2437 }
    };

    return {
      consent: true,
      ...approximateCoordinates[timezone],
      timezone,
      locale: navigator.language
    };
  }

  function captureLocation() {
    setLocationConsent(true);
    setLocationStatus("locating");

    if (!navigator.geolocation) {
      const fallback = baseLocation();
      setLocation(fallback);
      setLocationStatus("unavailable");
      locationPromiseRef.current = Promise.resolve(fallback);
      return locationPromiseRef.current;
    }

    const request = new Promise<SubmissionInput["location"]>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const captured = {
            consent: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language
          };
          setLocation(captured);
          setLocationStatus("captured");
          resolve(captured);
        },
        () => {
          const fallback = baseLocation();
          setLocation(fallback);
          setLocationStatus("unavailable");
          resolve(fallback);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 }
      );
    });

    locationPromiseRef.current = request;
    return request;
  }

  function selectedWord() {
    return lifeChoice === "Other" ? otherChoice.trim() : lifeChoice;
  }

  function continueToRatings() {
    setError("");
    if (!selectedWord() || !guidingValue.trim()) {
      setError("Choose a word and enter the value you live by before continuing.");
      return;
    }
    setStep("ratings");
  }

  function continueToContext() {
    setError("");
    const missing = RATING_DIMENSIONS.find((dimension) => typeof ratings[dimension] !== "number");
    if (missing) {
      setError("Answer every last-year reflection before continuing.");
      return;
    }
    setStep("context");
  }

  function continueRatingFlow() {
    setError("");
    const dimension = RATING_DIMENSIONS[currentRatingIndex];
    if (typeof ratings[dimension] !== "number") {
      setError("Choose a response before continuing.");
      return;
    }
    if (currentRatingIndex < RATING_DIMENSIONS.length - 1) {
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
    setStep(nextStep);
  }

  async function submit() {
    setError("");
    const word = selectedWord();
    if (!word || !guidingValue.trim()) {
      setError("Choose your word and add your value before continuing.");
      setStep("reflect");
      return;
    }
    if (lifeChoice === "Other" && !otherChoice.trim()) {
      setError("Name your other choice before submitting.");
      setStep("reflect");
      return;
    }

    setIsSubmitting(true);
    try {
      const locationSnapshot = await latestLocation();
      const payload: SubmissionInput = {
        idealWord: word,
        guidingValue,
        lifeChoice,
        otherChoice,
        ratings: ratings as Record<string, number>,
        ageBand,
        gender,
        genderSelfDescription,
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
      if (includeLegacy) {
        fetch("/api/stats?legacy=1")
          .then((response) => response.json())
          .then(setStats)
          .catch(() => setStats(data.stats));
      } else {
        setStats(data.stats);
      }
      setStep("results");
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
        <div className="mark">Evolvable</div>
        <a href={EVOLVABLE_URL}>Explore Evolvable</a>
      </header>

      {showTestNavigator && (
        <ScreenTestNavigator
          step={step}
          onJump={jumpToScreen}
          onClose={() => setShowTestNavigator(false)}
        />
      )}

      {step === "intro" && (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Looking Back</p>
            <h1>What would you want your life to have been?</h1>
            <p>
              A short public experiment about the qualities we hope our lives express. Take a few minutes, answer honestly,
              then see how your reflection sits within the wider pattern.
            </p>
            <button className="primary" onClick={() => setStep("reflect")}>
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
        <section className="stage">
          <StepHeader
            index="01"
            title="Choose the word"
            text="Choose the single word that best describes how you would like your life to have been."
          />
          <div className="choice-question">
            <h3>How would you like your life to have been?</h3>
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
              <input value={otherChoice} onChange={(event) => setOtherChoice(event.target.value)} placeholder="The word you would use" maxLength={48} />
            </label>
          )}
          <div className="form-grid">
            <label className="field wide">
              <span>What is the most important value you live your life by?</span>
              <textarea value={guidingValue} onChange={(event) => setGuidingValue(event.target.value)} placeholder="A word or sentence" rows={3} />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <NavActions back={() => setStep("intro")} next={continueToRatings} />
        </section>
      )}

      {step === "ratings" && (
        <section className="stage">
          <StepHeader index="02" title="Look back over the last year" text="Compared with your usual life, how much did you feel each of these in the last year?" />
          <RatingFocusPanel
            dimension={RATING_DIMENSIONS[currentRatingIndex]}
            index={currentRatingIndex}
            total={RATING_DIMENSIONS.length}
            value={ratings[RATING_DIMENSIONS[currentRatingIndex]]}
            onChange={(value) => setRating(RATING_DIMENSIONS[currentRatingIndex], value)}
          />
          {error && <p className="error">{error}</p>}
          <NavActions
            back={() => {
              setError("");
              if (currentRatingIndex > 0) {
                setCurrentRatingIndex((index) => index - 1);
                return;
              }
              setStep("reflect");
            }}
            next={continueRatingFlow}
            nextLabel={currentRatingIndex === RATING_DIMENSIONS.length - 1 ? "Continue" : "Next"}
          />
        </section>
      )}

      {step === "context" && (
        <section className="stage">
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
                <input value={genderSelfDescription} onChange={(event) => setGenderSelfDescription(event.target.value)} />
              </label>
            )}
            <div className="consent wide">
              <Globe2 />
              <div>
                <strong>Approximate location</strong>
                <p>Allow approximate browser location so your result can be compared geographically. We do not store your IP address.</p>
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
                    ? "Waiting for the browser to return an approximate location."
                    : "Location permission was not available, so this response will not add a map point."}
              </p>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <NavActions back={() => setStep("ratings")} next={submit} nextLabel={isSubmitting ? "Saving..." : "See results"} disabled={isSubmitting} />
        </section>
      )}

      {step === "results" && (
        <Results
          stats={stats ?? PREVIEW_STATS}
          submission={submission ?? PREVIEW_SUBMISSION}
          includeLegacy={includeLegacy}
          setIncludeLegacy={setIncludeLegacy}
        />
      )}
    </main>
  );
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
      <button className="ghost" onClick={back}>
        Back
      </button>
      <button className="primary" onClick={next} disabled={disabled}>
        {nextLabel} <ArrowRight size={18} />
      </button>
    </div>
  );
}

function RatingFocusPanel({
  dimension,
  index,
  total,
  value,
  onChange
}: {
  dimension: string;
  index: number;
  total: number;
  value?: number;
  onChange: (value: number) => void;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [visualValue, setVisualValue] = useState(value ?? 0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setVisualValue(value ?? 0);
    setIsDragging(false);
  }, [dimension, value]);

  const selectedOption = RATING_OPTIONS.find((option) => option.value === value);
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
      <div className="rating-widget">
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
              className={value === option.value ? "rating-scale-option active" : "rating-scale-option"}
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
  includeLegacy,
  setIncludeLegacy
}: {
  stats: Stats;
  submission: Submission;
  includeLegacy: boolean;
  setIncludeLegacy: (value: boolean) => void;
}) {
  const forcedChoices = useMemo(() => {
    const visibleChoices = stats.choices.filter((item) => FORCED_CHOICE_SET.has(item.choice));
    const visibleTotal = visibleChoices.reduce((sum, item) => sum + item.count, 0);
    return visibleChoices.map((item) => ({
      ...item,
      percent: visibleTotal ? item.count / visibleTotal : 0
    }));
  }, [stats.choices]);
  const forcedTotal = forcedChoices.reduce((sum, item) => sum + item.count, 0);
  const choice = forcedChoices.find((item) => item.choice === submission.lifeChoice);
  const topChoice = forcedChoices[0];
  const chartData = forcedChoices.map((item) => ({
    name: item.choice,
    count: item.count,
    percent: Math.round(item.percent * 1000) / 10
  }));
  const ratingData = stats.ratings.map((item) => ({ name: item.dimension, average: Number(item.average.toFixed(2)) }));
  const demographicComparison = useMemo(() => buildDemographicComparison(stats.byGender), [stats.byGender]);

  return (
    <section className="results">
      <div className="result-hero">
        <p className="eyebrow">Your result</p>
        <h1>You chose {submission.lifeChoice}.</h1>
        <p>
          {choice
            ? `${choice.count} ${choice.count === 1 ? "person has" : "people have"} chosen this so far.`
            : "You are the first person in this category."}{" "}
          {topChoice ? `The current leading pattern is ${topChoice.choice}.` : ""}
        </p>
        <label className="legacy-toggle">
          <input
            type="checkbox"
            checked={includeLegacy}
            onChange={(event) => setIncludeLegacy(event.target.checked)}
          />
          <span>Include old Looking Back data</span>
        </label>
      </div>

      <div className="insight-grid">
        <Metric icon={<Compass />} label="Responses so far" value={String(forcedTotal)} />
        <Metric icon={<BarChart3 />} label="Your category share" value={choice ? `${Math.round(choice.percent * 1000) / 10}%` : "New"} />
        <Metric icon={<Sparkles />} label="Most common" value={topChoice?.choice ?? "Awaiting data"} />
      </div>

      <div className="chart-section">
        <div>
          <h2>How people are choosing</h2>
          <p>The public pattern updates as new people take part.</p>
        </div>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={Math.max(340, chartData.length * 22 + 56)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 44, bottom: 24, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ded7cc" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "#6d675d", fontSize: 12 }}
                axisLine={{ stroke: "#bdb5a9" }}
                tickLine={{ stroke: "#bdb5a9" }}
                label={{ value: "Number of responses", position: "insideBottom", offset: -12, fill: "#6d675d", fontSize: 11 }}
              />
              <YAxis dataKey="name" type="category" width={142} tick={{ fill: "#302f2b", fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value}`, "Responses"]} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={16}>
                <LabelList dataKey="count" position="right" fill="#302f2b" fontSize={11} fontWeight={700} />
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.name === submission.lifeChoice ? "#e75117" : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <h3>Last-year feeling profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ded7cc" />
              <XAxis dataKey="name" tick={{ fill: "#302f2b", fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis domain={[-2, 2]} tick={{ fill: "#302f2b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="average" fill="#2f7d72" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <div>
          <h2>Geographic pattern</h2>
          <p>
            {stats.locations.length
              ? "Approximate locations from participants."
              : "The map will begin collecting points when people consent to approximate location."}
          </p>
        </div>
        <ResponseGlobe locations={stats.locations} submission={submission} />
      </div>

      <div className="chart-section">
        <div>
          <h2>Demographic patterns</h2>
          <p>Where choices differ between males and females.</p>
        </div>
        <DemographicComparison comparison={demographicComparison} choices={chartData.slice(0, 10).map((item) => item.name)} />
      </div>

      <div className="closing">
        <h2>What would it mean to live closer to that choice?</h2>
        <p>
          Your answer is not a score. It is a direction of attention: a way to notice whether your words, actions, and
          values are moving together.
        </p>
        <a className="primary link-button" href={EVOLVABLE_URL}>
          Explore Evolvable <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type DemographicGroup = {
  total: number;
  counts: Map<string, number>;
};

type DemographicRow = {
  choice: string;
  male: { count: number; percent: number };
  female: { count: number; percent: number };
  other: { count: number; percent: number };
  difference: number;
  total: number;
};

type DemographicComparisonData = {
  maleTotal: number;
  femaleTotal: number;
  otherTotal: number;
  rows: DemographicRow[];
};

function buildDemographicComparison(groups: Stats["byGender"]): DemographicComparisonData {
  const male = emptyDemographicGroup();
  const female = emptyDemographicGroup();
  const other = emptyDemographicGroup();

  for (const [groupName, values] of Object.entries(groups)) {
    const normalised = groupName.trim().toLowerCase();
    const target = normalised === "man" || normalised === "male" || normalised === "males"
      ? male
      : normalised === "woman" || normalised === "female" || normalised === "females"
        ? female
        : other;

    for (const value of values) {
      if (!FORCED_CHOICE_SET.has(value.choice)) continue;
      target.counts.set(value.choice, (target.counts.get(value.choice) ?? 0) + value.count);
      target.total += value.count;
    }
  }

  const choices = new Set([...male.counts.keys(), ...female.counts.keys(), ...other.counts.keys()]);
  const rows = Array.from(choices)
    .map((choice) => {
      const maleCount = male.counts.get(choice) ?? 0;
      const femaleCount = female.counts.get(choice) ?? 0;
      const otherCount = other.counts.get(choice) ?? 0;
      const malePercent = male.total ? (maleCount / male.total) * 100 : 0;
      const femalePercent = female.total ? (femaleCount / female.total) * 100 : 0;
      const otherPercent = other.total ? (otherCount / other.total) * 100 : 0;

      return {
        choice,
        male: { count: maleCount, percent: malePercent },
        female: { count: femaleCount, percent: femalePercent },
        other: { count: otherCount, percent: otherPercent },
        difference: femalePercent - malePercent,
        total: maleCount + femaleCount + otherCount
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    maleTotal: male.total,
    femaleTotal: female.total,
    otherTotal: other.total,
    rows
  };
}

function emptyDemographicGroup(): DemographicGroup {
  return { total: 0, counts: new Map() };
}

function DemographicComparison({ comparison, choices }: { comparison: DemographicComparisonData; choices: string[] }) {
  if (!comparison.rows.length) {
    return <p className="muted">Demographic patterns will appear as people add context.</p>;
  }

  const rowsByChoice = new Map(comparison.rows.map((row) => [row.choice, row]));
  const visibleRows = choices.map((choice) => rowsByChoice.get(choice)).filter((row): row is DemographicRow => row != null);

  return (
    <div className="demographic-comparison">
      <div className="demographic-summary">
        <span><strong>Males</strong> {comparison.maleTotal}</span>
        <span><strong>Females</strong> {comparison.femaleTotal}</span>
        {comparison.otherTotal > 0 && <span><strong>Other</strong> {comparison.otherTotal}</span>}
      </div>
      <div className={comparison.otherTotal > 0 ? "comparison-head has-other" : "comparison-head"}>
        <span>Choice</span>
        <div className="comparison-head-bars">
          <span>Males</span>
          <span>Difference</span>
          <span>Females</span>
        </div>
        {comparison.otherTotal > 0 && <span>Other</span>}
      </div>
      {visibleRows.map((row) => (
        <div className="comparison-row" key={row.choice}>
          <div className="comparison-choice">
            <strong>{row.choice}</strong>
            <span>{row.total} responses</span>
          </div>
          <div className="comparison-bars">
            <div className="comparison-side male-side">
              <span>{Math.round(row.male.percent)}%</span>
              <i style={{ width: `${row.male.percent}%` }} />
            </div>
            <div className="comparison-delta">
              {Math.abs(row.difference) < 0.5
                ? "Even"
                : `${Math.abs(row.difference).toFixed(1)} pts ${row.difference > 0 ? "female" : "male"}`}
            </div>
            <div className="comparison-side female-side">
              <i style={{ width: `${row.female.percent}%` }} />
              <span>{Math.round(row.female.percent)}%</span>
            </div>
            {comparison.otherTotal > 0 && (
              <div className="comparison-other">
                <i style={{ width: `${row.other.percent}%` }} />
                <span>{Math.round(row.other.percent)}%</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResponseGlobe({ locations, submission }: { locations: Stats["locations"]; submission: Submission }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapLoadedRef = useRef(false);
  const mapHasEnteredViewportRef = useRef(false);
  const hasFlownRef = useRef(false);
  const [mapError, setMapError] = useState("");
  const visibleLocations = useMemo(() => sanitiseLocations(locations), [locations]);
  const submittedCoordinates = useMemo(() => submissionCoordinates(submission), [submission]);
  const locationsKey = visibleLocations.map((point) => `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)},${point.choice}`).join("|");
  const submissionLocationKey = [
    submission.lifeChoice,
    submittedCoordinates ? "1" : "0",
    submittedCoordinates?.latitude.toFixed(3) ?? "",
    submittedCoordinates?.longitude.toFixed(3) ?? ""
  ].join("|");
  const locationGeoJson = useMemo(
    () => buildLocationGeoJson(visibleLocations, submission),
    // The map should not refresh just because polling returned new array/object identities.
    // These keys change only when the actual plotted coordinates or submitted location change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationsKey, submissionLocationKey]
  );
  const locationGeoJsonRef = useRef(locationGeoJson);

  const submittedCenter = useCallback((): [number, number] => {
    return submittedCoordinates
      ? [submittedCoordinates.longitude, submittedCoordinates.latitude]
      : [-0.1276, 51.5072];
  }, [submittedCoordinates]);

  const flyToSubmittedLocation = useCallback(() => {
    const map = mapRef.current;
    if (
      !map ||
      !mapLoadedRef.current ||
      !mapHasEnteredViewportRef.current ||
      hasFlownRef.current ||
      !submittedCoordinates
    ) {
      return;
    }

    hasFlownRef.current = true;
    map.easeTo({
      center: submittedCenter(),
      zoom: 4.4,
      duration: 2800,
      easing: (value) => 1 - Math.pow(1 - value, 3)
    });
  }, [submittedCenter, submittedCoordinates]);

  useEffect(() => {
    hasFlownRef.current = false;
    flyToSubmittedLocation();
  }, [flyToSubmittedLocation, submissionLocationKey]);

  useEffect(() => {
    locationGeoJsonRef.current = locationGeoJson;
  }, [locationGeoJson]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!("IntersectionObserver" in window)) {
      mapHasEnteredViewportRef.current = true;
      flyToSubmittedLocation();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        mapHasEnteredViewportRef.current = true;
        flyToSubmittedLocation();
        observer.disconnect();
      },
      { threshold: 0 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [flyToSubmittedLocation, submissionLocationKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initialCenter = hasFlownRef.current ? submittedCenter() : randomGlobeStart(submittedCenter());

    if (!browserSupportsWebGl()) {
      setMapError("The interactive map is not available in this browser.");
      return;
    }

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        style: {
          version: 8,
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
          sources: {
            imagery: {
              type: "raster",
              tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              tileSize: 256,
              attribution: "Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
              maxzoom: 19
            },
            openmaptiles: {
              type: "vector",
              url: "https://tiles.openfreemap.org/planet",
              attribution: "Labels © OpenStreetMap contributors, OpenFreeMap"
            }
          },
          layers: [
          {
            id: "imagery",
            type: "raster",
            source: "imagery",
            paint: {
              "raster-brightness-min": 0.06,
              "raster-brightness-max": 1,
              "raster-contrast": -0.04,
              "raster-saturation": -0.08
            }
          },
          {
            id: "country-boundaries",
            type: "line",
            source: "openmaptiles",
            "source-layer": "boundary",
            filter: [
              "all",
              ["==", ["get", "admin_level"], 2],
              ["!=", ["get", "maritime"], 1],
              ["!=", ["get", "disputed"], 1]
            ],
            paint: {
              "line-color": "rgba(255,255,255,0.62)",
              "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.28, 4, 0.68, 8, 0.9],
              "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.5, 6, 1.1, 12, 2]
            }
          },
          {
            id: "country-labels",
            type: "symbol",
            source: "openmaptiles",
            "source-layer": "place",
            minzoom: 1,
            maxzoom: 8,
            filter: ["==", ["get", "class"], "country"],
            layout: {
              "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
              "text-font": ["Noto Sans Bold"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 4, 15, 7, 19],
              "text-max-width": 8,
              "text-allow-overlap": false,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#f7f7f3",
              "text-halo-color": "rgba(0,0,0,0.74)",
              "text-halo-width": 1.7,
              "text-halo-blur": 0.5
            }
          },
          {
            id: "city-labels",
            type: "symbol",
            source: "openmaptiles",
            "source-layer": "place",
            minzoom: 3.2,
            filter: ["==", ["get", "class"], "city"],
            layout: {
              "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
              "text-font": ["Noto Sans Bold"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 7, 14, 11, 18],
              "text-max-width": 8,
              "text-allow-overlap": false,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#f7f7f3",
              "text-halo-color": "rgba(0,0,0,0.74)",
              "text-halo-width": 1.55,
              "text-halo-blur": 0.45
            }
          }
          ]
        },
        center: initialCenter,
        zoom: hasFlownRef.current ? 4.4 : 1.15,
        minZoom: 1,
        maxZoom: 18,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        canvasContextAttributes: { antialias: true }
      });
    } catch (error) {
      console.error("Map initialisation failed", error);
      setMapError("The interactive map is not available in this browser.");
      return;
    }

    mapRef.current = map;
    mapLoadedRef.current = false;
    setMapError("");
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    let glowAnimationFrame = 0;

    map.on("style.load", () => {
      try {
        map.setProjection({ type: "globe" });
        map.setSky({
          "sky-color": "#020711",
          "horizon-color": "#8fc5ff",
          "fog-color": "#d8ecff",
          "fog-ground-blend": 0.12,
          "horizon-fog-blend": 0.55,
          "sky-horizon-blend": 0.72,
          "atmosphere-blend": 0.86
        });
      } catch (error) {
        console.error("Map globe styling failed", error);
      }
    });

    map.on("load", () => {
      try {
        map.addSource("responses", {
          type: "geojson",
          data: locationGeoJsonRef.current
        });

        map.addLayer({
          id: "response-glow",
          type: "circle",
          source: "responses",
          filter: ["!=", ["get", "kind"], "user"],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 6, 24, 12, 34],
            "circle-color": "#45e7ff",
            "circle-blur": 0.82,
            "circle-opacity": 0.55
          }
        });

      map.addLayer({
        id: "response-halo",
        type: "circle",
        source: "responses",
        filter: ["!=", ["get", "kind"], "user"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 7, 6, 9, 12, 12],
          "circle-color": "rgba(69,231,255,0)",
          "circle-stroke-color": "rgba(210,250,255,0.95)",
          "circle-stroke-width": 1.8,
          "circle-opacity": 0.9
        }
      });

      map.addLayer({
        id: "response-core",
        type: "circle",
        source: "responses",
        filter: ["!=", ["get", "kind"], "user"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 3.5, 6, 4.5, 12, 6],
          "circle-color": "#8ff5ff",
          "circle-stroke-color": "#07111b",
          "circle-stroke-width": 1.2,
          "circle-opacity": 1
        }
      });

      map.addLayer({
        id: "user-glow",
        type: "circle",
        source: "responses",
        filter: ["==", ["get", "kind"], "user"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 30, 6, 38, 12, 52],
          "circle-color": "#ff2f92",
          "circle-blur": 0.78,
          "circle-opacity": 0.78
        }
      });

      map.addLayer({
        id: "user-halo",
        type: "circle",
        source: "responses",
        filter: ["==", ["get", "kind"], "user"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 11, 6, 13, 12, 17],
          "circle-color": "rgba(255,47,146,0)",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-opacity": 1
        }
      });

        map.addLayer({
          id: "user-core",
          type: "circle",
          source: "responses",
          filter: ["==", ["get", "kind"], "user"],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5.5, 6, 6.5, 12, 8.5],
            "circle-color": "#ff5fb0",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.8,
            "circle-opacity": 1
          }
        });
      } catch (error) {
        console.error("Map response markers failed", error);
        setMapError("The interactive map is not available in this browser.");
        return;
      }

      const animateMarkerGlow = () => {
        const phase = (Math.sin(performance.now() / 1250) + 1) / 2;
        const eased = phase * phase * (3 - 2 * phase);

        if (map.getLayer("response-glow")) {
          map.setPaintProperty("response-glow", "circle-opacity", 0.3 + eased * 0.28);
        }
        if (map.getLayer("user-glow")) {
          map.setPaintProperty("user-glow", "circle-opacity", 0.42 + eased * 0.34);
        }

        glowAnimationFrame = window.requestAnimationFrame(animateMarkerGlow);
      };
      glowAnimationFrame = window.requestAnimationFrame(animateMarkerGlow);
      mapLoadedRef.current = true;
      flyToSubmittedLocation();
    });

    return () => {
      if (glowAnimationFrame) window.cancelAnimationFrame(glowAnimationFrame);
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [flyToSubmittedLocation, submittedCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("responses")) return;
    const source = map.getSource("responses") as maplibregl.GeoJSONSource;
    source.setData(locationGeoJson);
  }, [locationGeoJson]);

  return (
    <div ref={wrapperRef} className="map-card globe-card tiled-map-card" aria-label="Interactive satellite response globe">
      <div ref={containerRef} className="response-globe" />
      {mapError && <div className="map-fallback">{mapError}</div>}
      <div className="globe-caption">
        {submittedCoordinates
          ? "Your captured location"
          : visibleLocations.length
            ? "Showing consenting responses"
            : "Awaiting consenting responses"}
      </div>
      <div className="globe-legend" aria-label="Globe legend">
        <span><i className="legend-dot user-dot" />Your location</span>
        <span><i className="legend-dot response-dot" />Other responses</span>
      </div>
    </div>
  );
}

function buildLocationGeoJson(locations: Stats["locations"], submission: Submission): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const userCoordinates = submissionCoordinates(submission);
  const features: GeoJSON.Feature<GeoJSON.Point>[] = locations.map((point) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude]
    },
    properties: {
      choice: point.choice,
      kind: "response"
    }
  }));

  if (userCoordinates) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [userCoordinates.longitude, userCoordinates.latitude]
      },
      properties: {
        choice: submission.lifeChoice,
        kind: "user"
      }
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function submissionCoordinates(submission: Submission) {
  if (!submission.location.consent) return null;
  const latitude = finiteNumber(submission.location.latitude);
  const longitude = finiteNumber(submission.location.longitude);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function sanitiseLocations(locations: Stats["locations"]) {
  return locations.filter((point) => finiteNumber(point.latitude) != null && finiteNumber(point.longitude) != null);
}

function browserSupportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function randomGlobeStart(target: [number, number]): [number, number] {
  const longitudeOffset = 95 + Math.random() * 170;
  const latitude = -45 + Math.random() * 90;
  const longitude = ((((target[0] + longitudeOffset) % 360) + 540) % 360) - 180;

  return [longitude, latitude];
}
