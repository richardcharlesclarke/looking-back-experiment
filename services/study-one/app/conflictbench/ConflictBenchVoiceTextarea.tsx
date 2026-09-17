"use client";

import { useRef } from "react";
import {
  type ConflictBenchLiveTranscriptionController,
  useConflictBenchLiveTranscription
} from "./useConflictBenchLiveTranscription";

type ConflictBenchVoiceTextareaProps = {
  id: string;
  number: string;
  question: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  maxLength: number;
  placeholder: string;
};

function formatRemainingTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
function statusMessage(transcription: ConflictBenchLiveTranscriptionController): string | null {
  switch (transcription.status) {
    case "requesting_permission":
      return "Waiting for microphone permission…";
    case "connecting":
      return "Connecting voice transcription…";
    case "recording":
      return `Recording · ${formatRemainingTime(transcription.secondsRemaining)} remaining`;
    case "finalizing":
      return "Finishing the transcript…";
    default:
      return transcription.isSupported === false
        ? "Voice transcription is not supported in this browser."
        : null;
  }
}

export function ConflictBenchVoiceTextarea({
  id,
  number,
  question,
  optional = false,
  value,
  onChange,
  rows,
  maxLength,
  placeholder
}: ConflictBenchVoiceTextareaProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const transcription = useConflictBenchLiveTranscription({
    draft: value,
    setDraft: onChange,
    inputRef,
    maxCharacters: maxLength
  });
  const statusId = `${id}-voice-status`;
  const canStop = ["requesting_permission", "connecting", "recording"].includes(transcription.status);
  const buttonDisabled = transcription.isSupported !== true || transcription.status === "finalizing";
  const buttonLabel = canStop ? "Stop voice transcription" : "Start voice transcription";
  const currentStatus = statusMessage(transcription);
  const feedback = transcription.error ?? currentStatus ?? transcription.notice;

  return (
    <div className="field wide conflictbench-text-question">
      <label className="conflictbench-text-question-label" htmlFor={id}>
        <b className="question-number">{number}</b>
        {question}
        {optional ? <em>Optional</em> : null}
      </label>
      <div className="conflictbench-textarea-shell">
        <textarea
          ref={inputRef}
          id={id}
          value={value}
          onChange={(event) => {
            if (!transcription.isReadOnly) onChange(event.target.value);
          }}
          readOnly={transcription.isReadOnly}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={statusId}
        />
        <button
          className={transcription.status === "recording"
            ? "conflictbench-voice-button is-recording"
            : "conflictbench-voice-button"}
          type="button"
          onClick={canStop ? transcription.stop : transcription.start}
          disabled={buttonDisabled}
          aria-label={buttonLabel}
          aria-pressed={transcription.status === "recording"}
          aria-describedby={statusId}
          title={buttonLabel}
        >
          {transcription.status === "recording" ? (
            <span className="conflictbench-voice-stop" aria-hidden="true" />
          ) : (
            <svg aria-hidden="true" width="19" height="22" viewBox="0 0 19 22" fill="none">
              <rect x="6" y="1" width="7" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 10.5C3.5 14 6.1 16.5 9.5 16.5C12.9 16.5 15.5 14 15.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9.5 16.5V20.5M6.5 20.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {transcription.showPrivacyNotice ? (
        <div className="conflictbench-voice-privacy">
          <p>
            Your microphone audio will be streamed to OpenAI to create text. Nothing is saved as a
            ConflictBench response until you submit the questionnaire.
          </p>
          <div>
            <button type="button" className="primary" onClick={transcription.confirmPrivacyAndStart}>
              Continue
            </button>
            <button type="button" className="secondary" onClick={transcription.dismissPrivacyNotice}>
              Not now
            </button>
          </div>
        </div>
      ) : null}

      <div
        id={statusId}
        className={transcription.error ? "conflictbench-voice-feedback is-error" : "conflictbench-voice-feedback"}
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{feedback}</span>
        {transcription.isActive ? (
          <button
            type="button"
            onClick={transcription.cancel}
            aria-label="Cancel voice transcription and discard its text"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
