"use client";
import ContinuousOrb from './ContinuousOrb';
import ConnectionCircles from './ConnectionCircles';
import { useRef } from "react";
import { ConflictBenchVoiceTextarea } from "../conflictbench/ConflictBenchVoiceTextarea";
import type { Answer, Question as Item } from "@/lib/brufest/types";
import { isMissing } from "@/lib/brufest/instruments";
export default function Question({
  item,
  value,
  onChange,
  index,
  allowVoice = true,
  invalid = false,
  motionDirection = 'forward',
}: {
  item: Item;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
  index: number;
  allowVoice?: boolean;
  invalid?: boolean;
  motionDirection?: 'forward' | 'back';
}) {
  const lane = useRef<HTMLDivElement>(null);
  const n = typeof value === "number" ? value : null;
  const ratio = ((n ?? 5) / 10) * 100;
  const anchors = [0, 2.5, 5, 7.5, 10];
  const nearest =
    n === null
      ? null
      : anchors.reduce((a, b) => (Math.abs(a - n) <= Math.abs(b - n) ? a : b));
  const labels = [
    item.low ?? "Not at all",
    "A little",
    "Somewhat",
    "Quite a lot",
    item.high ?? "Extremely",
  ];
  if (item.low === "Strongly oppose") {
    labels[1] = "Lean against";
    labels[2] = "In between";
    labels[3] = "Lean towards";
  }
  function pointer(clientX: number) {
    const rect = lane.current?.getBoundingClientRect();
    if (rect)
      onChange(
        Math.round(
          Math.max(0, Math.min(10, ((clientX - rect.left) / rect.width) * 10)) *
            10,
        ) / 10,
      );
  }
  if (item.type === "text")
    return (
      <div className={`bf-question bf-written ${!allowVoice?`rating-widget rating-widget-${motionDirection}`:''}`} id={`question-${item.id}`} tabIndex={-1} aria-invalid={invalid || undefined}>
        {allowVoice ? <ConflictBenchVoiceTextarea
          id={item.id}
          number={String(index + 1).padStart(2, "0")}
          question={item.prompt}
          optional={!item.required}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          rows={4}
          maxLength={3000}
          placeholder={
            item.id.includes("JOINT")
              ? "A few words are enough. “None identified” is fine."
              : "In your own words…"
          }
        /> : <label className="s1-field"><span>{String(index + 1).padStart(2, "0")} {item.prompt}{!item.required ? " (optional)" : ""}</span><textarea rows={4} maxLength={3000} value={typeof value === "string" ? value : ""} onChange={e=>onChange(e.target.value)} /></label>}
        <div className="bf-skip">
          <button
            type="button"
            aria-pressed={isMissing(value) && value.missing === "prefer_not"}
            onClick={() => onChange({ missing: "prefer_not" })}
          >
            Prefer not to answer
          </button>
        </div>
      </div>
    );
  return (
    <fieldset
      className={`bf-question ${item.type==='circles'?'s1-connection-question':''} ${!allowVoice?`rating-widget rating-widget-${motionDirection}`:''} ${value === undefined ? "bf-unanswered" : ""}`}
      id={`question-${item.id}`} tabIndex={-1} aria-invalid={invalid || undefined}
    >
      <legend>
        <span className="bf-q-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span>{item.prompt}</span>
      </legend>
      {item.help && <p className="s1-question-help">{item.help}</p>}
      {item.type === "circles" && <ConnectionCircles item={item} value={n} onChange={onChange}/>}
      {(item.type === "continuous" || (item.type === "scale" && !allowVoice)) && <ContinuousOrb item={item} value={n} onChange={onChange}/> }
      {item.type === "likert" && (
        <>
          <p className="bf-scale-hint">
            {item.low} <span>→</span> {item.high}
          </p>
          <div className="bf-likert" role="group" aria-label={item.prompt}>
            {Array.from({ length: 7 }, (_, i) => i + 1).map((v) => (
              <button
                type="button"
                key={v}
                aria-label={`${v}${v === 1 ? ` — ${item.low}` : v === 7 ? ` — ${item.high}` : ""}`}
                aria-pressed={n === v}
                className={n === v ? "selected" : ""}
                onClick={() => onChange(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}
      {item.type === "scale" && allowVoice && (
        <>
          <div className="bf-orb-value" aria-live="polite">
            {n === null ? "Choose a position" : `${n} / 10`}
          </div>
          <div
            ref={lane}
            className="bf-orb-lane"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                pointer(e.clientX);
            }}
            onPointerUp={(e) => {
              pointer(e.clientX);
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
          >
            <button
              type="button"
              role="slider"
              aria-label={item.prompt}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={n ?? 5}
              aria-valuetext={
                n === null ? "No response selected" : `${n} out of 10`
              }
              className={`bf-orb ${n === null ? "unselected" : ""}`}
              style={{
                left: `${ratio}%`,
                width: `${28 + (n ?? 5) * 4}px`,
                height: `${28 + (n ?? 5) * 4}px`,
              }}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowRight" || e.key === "ArrowUp"
                    ? 0.1
                    : e.key === "ArrowLeft" || e.key === "ArrowDown"
                      ? -0.1
                      : 0;
                if (delta || ["Home", "End"].includes(e.key)) {
                  e.preventDefault();
                  onChange(
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 10
                        : Math.round(
                            Math.max(0, Math.min(10, (n ?? 5) + delta)) * 10,
                          ) / 10,
                  );
                }
              }}
            />
          </div>
          <div className="bf-anchors">
            {anchors.map((v, i) => (
              <button
                type="button"
                key={v}
                aria-pressed={nearest === v}
                className={nearest === v ? "selected" : ""}
                onClick={() => onChange(v)}
              >
                {labels[i]}
              </button>
            ))}
          </div>
        </>
      )}
      {(item.type === "single" || item.type === "multi") && (
        <>
          <p className="bf-input-hint">
            {item.type === "single"
              ? item.required ? "Choose one" : "Optional · Choose one or continue"
              : item.limit
                ? `Choose up to ${item.limit}`
                : "Choose all that apply"}
          </p>
          <div className="bf-options" role="group" aria-label={item.prompt}>
            {item.options?.map((option) => {
              const selected = Array.isArray(value)
                ? value.includes(option)
                : value === option;
              return (
                <button
                  type="button"
                  key={option}
                  aria-pressed={selected}
                  className={selected ? "selected" : ""}
                  onClick={() => {
                    if (item.type === "single") return onChange(option);
                    let list = Array.isArray(value) ? value : [];
                    if (selected) list = list.filter((v) => v !== option);
                    else if (item.exclusive?.includes(option)) list = [option];
                    else {
                      list = list.filter((v) => !item.exclusive?.includes(v));
                      if (item.limit && list.length >= item.limit) return;
                      list = [...list, option];
                    }
                    onChange(list);
                  }}
                >
                  <i aria-hidden="true">{selected ? "✓" : "+"}</i>
                  {option}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="bf-skip">
        <button
          type="button"
          aria-pressed={isMissing(value) && value.missing === "prefer_not"}
          onClick={() => onChange({ missing: "prefer_not" })}
        >
          Prefer not to answer
        </button>
        {(item.type === "scale" || item.type === "likert" || item.type === "continuous" || item.type === "circles") && (
          <button
            type="button"
            aria-pressed={isMissing(value) && value.missing === "cannot_assess"}
            onClick={() => onChange({ missing: "cannot_assess" })}
          >
            Cannot assess
          </button>
        )}
      </div>
    </fieldset>
  );
}
