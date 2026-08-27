"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS } from "@/lib/conflictbench-transcription";

const PRIVACY_ACKNOWLEDGEMENT_KEY = "conflictbenchLiveTranscriptionPrivacyAcknowledgedV1";
const CLIENT_ID_KEY = "conflictbenchLiveTranscriptionClientIdV1";
const FINAL_TRANSCRIPT_GRACE_MS = 2_500;
const DISCONNECTED_GRACE_MS = 3_000;

export type ConflictBenchTranscriptionStatus =
  | "idle"
  | "requesting_permission"
  | "connecting"
  | "recording"
  | "finalizing"
  | "error";

type TranscriptSegment = {
  order: number;
  text: string;
  final: boolean;
};

type RealtimeTranscriptEvent = {
  type?: unknown;
  item_id?: unknown;
  delta?: unknown;
  transcript?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type CredentialResponse = {
  clientSecret: string;
  expiresAt: number;
  model: string;
};

type UseConflictBenchLiveTranscriptionArgs = {
  draft: string;
  setDraft: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  maxCharacters: number;
};

export type ConflictBenchLiveTranscriptionController = {
  isSupported: boolean | null;
  status: ConflictBenchTranscriptionStatus;
  isActive: boolean;
  isReadOnly: boolean;
  secondsRemaining: number;
  error: string | null;
  notice: string | null;
  showPrivacyNotice: boolean;
  start: () => void;
  confirmPrivacyAndStart: () => void;
  dismissPrivacyNotice: () => void;
  stop: () => void;
  cancel: () => void;
};

function needsSeparator(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (/\s$/.test(left) || /^\s/.test(right)) return false;
  return !/^[,.;:!?)}\]]/.test(right);
}
export function insertConflictBenchTranscript(
  baseDraft: string,
  insertionIndex: number,
  transcript: string
): string {
  if (!transcript) return baseDraft;
  const safeIndex = Math.max(0, Math.min(insertionIndex, baseDraft.length));
  const before = baseDraft.slice(0, safeIndex);
  const after = baseDraft.slice(safeIndex);
  const beforeSeparator = needsSeparator(before, transcript) ? " " : "";
  const afterSeparator = needsSeparator(transcript, after) ? " " : "";
  return `${before}${beforeSeparator}${transcript}${afterSeparator}${after}`;
}

function humanizeStartError(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone access was blocked. Allow microphone access in your browser settings and try again.";
    }
    if (error.name === "NotFoundError") return "No microphone was found on this device.";
    if (error.name === "NotReadableError") return "The microphone is being used by another app or tab.";
    if (error.name === "AbortError") return "Microphone startup was interrupted. Please try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Voice transcription could not start. Please try again.";
}

function parseCredentialResponse(value: unknown): CredentialResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CredentialResponse>;
  if (
    typeof candidate.clientSecret !== "string"
    || typeof candidate.expiresAt !== "number"
    || typeof candidate.model !== "string"
  ) return null;
  return candidate as CredentialResponse;
}

function createClientId(): string {
  if (typeof window.crypto?.randomUUID === "function") return window.crypto.randomUUID();
  return `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function getOrCreateClientId(): string {
  try {
    const stored = window.localStorage.getItem(CLIENT_ID_KEY);
    if (stored && /^[A-Za-z0-9_-]{16,128}$/.test(stored)) return stored;
    const created = createClientId();
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return createClientId();
  }
}

export function useConflictBenchLiveTranscription({
  draft,
  setDraft,
  inputRef,
  maxCharacters
}: UseConflictBenchLiveTranscriptionArgs): ConflictBenchLiveTranscriptionController {
  const [status, setStatus] = useState<ConflictBenchTranscriptionStatus>("idle");
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const statusRef = useRef<ConflictBenchTranscriptionStatus>("idle");
  const draftRef = useRef(draft);
  const runIdRef = useRef(0);
  const baseDraftRef = useRef("");
  const insertionIndexRef = useRef(0);
  const segmentOrderRef = useRef(0);
  const segmentsRef = useRef(new Map<string, TranscriptSegment>());
  const pendingTranscriptItemsRef = useRef(new Set<string>());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const durationTimeoutRef = useRef<number | null>(null);
  const finalizationTimeoutRef = useRef<number | null>(null);
  const finalizationSettleTimeoutRef = useRef<number | null>(null);
  const disconnectedTimeoutRef = useRef<number | null>(null);
  const stopNoticeRef = useRef<string | null>(null);
  const stopRef = useRef<(reason?: "user" | "limit") => void>(() => undefined);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!draft.trim() && statusRef.current === "idle") setNotice(null);
  }, [draft]);

  const updateStatus = useCallback((next: ConflictBenchTranscriptionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    for (const timerRef of [
      durationTimeoutRef,
      finalizationTimeoutRef,
      finalizationSettleTimeoutRef,
      disconnectedTimeoutRef
    ]) {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseResources = useCallback(() => {
    clearTimers();
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recordingStartedAtRef.current = null;
  }, [clearTimers]);

  const focusDraft = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
      const length = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(length, length);
    }, 0);
  }, [inputRef]);

  const renderSegmentsIntoDraft = useCallback(() => {
    const transcript = [...segmentsRef.current.values()]
      .sort((left, right) => left.order - right.order)
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join(" ");
    const nextDraft = insertConflictBenchTranscript(
      baseDraftRef.current,
      insertionIndexRef.current,
      transcript
    );
    const limitedDraft = nextDraft.slice(0, maxCharacters);
    if (limitedDraft.length < nextDraft.length) {
      setNotice("The answer limit was reached. Review the transcript before continuing.");
      window.setTimeout(() => stopRef.current("user"), 0);
    }
    draftRef.current = limitedDraft;
    setDraft(limitedDraft);
  }, [maxCharacters, setDraft]);

  const completeStop = useCallback((completionNotice?: string) => {
    const hasTranscript = [...segmentsRef.current.values()].some((segment) => Boolean(segment.text.trim()));
    const resolvedNotice = completionNotice
      ?? stopNoticeRef.current
      ?? (hasTranscript ? "Transcript ready to edit." : null);
    stopNoticeRef.current = null;
    updateStatus("idle");
    releaseResources();
    setSecondsRemaining(CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS);
    setNotice(resolvedNotice);
    focusDraft();
  }, [focusDraft, releaseResources, updateStatus]);

  const failSession = useCallback((message: string) => {
    runIdRef.current += 1;
    updateStatus("error");
    releaseResources();
    setError(message);
    setNotice(segmentsRef.current.size > 0 ? "Review the transcript before continuing." : null);
    focusDraft();
  }, [focusDraft, releaseResources, updateStatus]);

  const handleRealtimeEvent = useCallback((raw: string) => {
    let event: RealtimeTranscriptEvent;
    try {
      event = JSON.parse(raw) as RealtimeTranscriptEvent;
    } catch {
      return;
    }

    const type = typeof event.type === "string" ? event.type : "";
    const itemId = typeof event.item_id === "string" ? event.item_id : "";
    if (type === "input_audio_buffer.committed" && itemId) {
      pendingTranscriptItemsRef.current.add(itemId);
      if (!segmentsRef.current.has(itemId)) {
        segmentsRef.current.set(itemId, {
          order: segmentOrderRef.current++,
          text: "",
          final: false
        });
      }
      if (finalizationSettleTimeoutRef.current !== null) {
        window.clearTimeout(finalizationSettleTimeoutRef.current);
        finalizationSettleTimeoutRef.current = null;
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.delta" && itemId) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      const current = segmentsRef.current.get(itemId);
      if (!current) {
        segmentsRef.current.set(itemId, {
          order: segmentOrderRef.current++,
          text: delta,
          final: false
        });
      } else if (!current.final) {
        segmentsRef.current.set(itemId, { ...current, text: `${current.text}${delta}` });
      }
      renderSegmentsIntoDraft();
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed" && itemId) {
      const transcript = typeof event.transcript === "string" ? event.transcript : "";
      const current = segmentsRef.current.get(itemId);
      segmentsRef.current.set(itemId, {
        order: current?.order ?? segmentOrderRef.current++,
        text: transcript,
        final: true
      });
      pendingTranscriptItemsRef.current.delete(itemId);
      renderSegmentsIntoDraft();
      if (statusRef.current === "finalizing" && pendingTranscriptItemsRef.current.size === 0) {
        if (finalizationSettleTimeoutRef.current !== null) {
          window.clearTimeout(finalizationSettleTimeoutRef.current);
        }
        finalizationSettleTimeoutRef.current = window.setTimeout(() => completeStop(), 500);
      }
      return;
    }

    if (type === "error") {
      const code = typeof event.error?.code === "string" ? event.error.code : "";
      if (statusRef.current === "finalizing" && code.includes("commit_empty")) {
        completeStop();
        return;
      }
      failSession("The transcription connection reported an error. Review any text received and try again.");
    }
  }, [completeStop, failSession, renderSegmentsIntoDraft]);

  const stop = useCallback((reason: "user" | "limit" = "user") => {
    const currentStatus = statusRef.current;
    if (currentStatus === "idle" || currentStatus === "error") return;

    if (currentStatus === "requesting_permission" || currentStatus === "connecting") {
      runIdRef.current += 1;
      completeStop(reason === "limit" ? "Three-minute limit reached. Review the transcript before continuing." : undefined);
      return;
    }

    updateStatus("finalizing");
    stopNoticeRef.current = reason === "limit"
      ? "Three-minute limit reached. Review the transcript before continuing."
      : null;
    setError(null);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      finalizationTimeoutRef.current = window.setTimeout(
        () => completeStop(),
        FINAL_TRANSCRIPT_GRACE_MS
      );
      return;
    }

    completeStop();
  }, [completeStop, updateStatus]);

  stopRef.current = stop;

  const startCountdown = useCallback(() => {
    recordingStartedAtRef.current = Date.now();
    setSecondsRemaining(CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS);
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - (recordingStartedAtRef.current ?? Date.now())) / 1000
      );
      setSecondsRemaining(Math.max(0, CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS - elapsedSeconds));
    }, 250);
    durationTimeoutRef.current = window.setTimeout(
      () => stopRef.current("limit"),
      CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS * 1000
    );
  }, []);

  const startInternal = useCallback(async () => {
    if (["requesting_permission", "connecting", "recording", "finalizing"].includes(statusRef.current)) return;
    setError(null);
    setNotice(null);

    if (
      typeof window === "undefined"
      || !window.isSecureContext
      || !navigator.mediaDevices?.getUserMedia
      || typeof RTCPeerConnection === "undefined"
    ) {
      failSession("Voice transcription requires a supported browser on a secure HTTPS connection.");
      return;
    }

    const runId = ++runIdRef.current;
    baseDraftRef.current = draftRef.current;
    insertionIndexRef.current = inputRef.current?.selectionEnd ?? draftRef.current.length;
    segmentsRef.current.clear();
    pendingTranscriptItemsRef.current.clear();
    segmentOrderRef.current = 0;
    stopNoticeRef.current = null;
    updateStatus("requesting_permission");

    let discardPendingMedia = false;
    let pendingMediaStream: MediaStream | null = null;

    try {
      const mediaStreamPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }).then((mediaStream) => {
        pendingMediaStream = mediaStream;
        if (discardPendingMedia || runId !== runIdRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
        } else {
          mediaStreamRef.current = mediaStream;
          updateStatus("connecting");
        }
        return mediaStream;
      });

      const credentialPromise = (async () => {
        const credentialResponse = await fetch("/api/conflictbench/transcription-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: getOrCreateClientId() }),
          cache: "no-store"
        });
        const credentialBody = await credentialResponse.json().catch(() => null);
        if (!credentialResponse.ok) {
          const serverMessage = credentialBody && typeof credentialBody.error === "string"
            ? credentialBody.error
            : "Could not create a transcription session.";
          throw new Error(serverMessage);
        }
        const credential = parseCredentialResponse(credentialBody);
        if (!credential) throw new Error("The transcription session response was invalid.");
        return credential;
      })();

      const [mediaStream, credential] = await Promise.all([mediaStreamPromise, credentialPromise]);
      if (runId !== runIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error("No microphone audio track was available.");

      audioTrack.addEventListener("ended", () => {
        if (runId === runIdRef.current && statusRef.current !== "idle") {
          failSession("Microphone capture ended. Review any text received and try again.");
        }
      });
      audioTrack.addEventListener("mute", () => {
        if (runId === runIdRef.current) {
          setNotice("Microphone interrupted. Recording will continue if it becomes available.");
        }
      });
      audioTrack.addEventListener("unmute", () => {
        if (runId === runIdRef.current) setNotice(null);
      });

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;
      peerConnection.addTrack(audioTrack, mediaStream);
      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("message", (event) => {
        if (runId === runIdRef.current && typeof event.data === "string") {
          handleRealtimeEvent(event.data);
        }
      });
      dataChannel.addEventListener("open", () => {
        if (runId !== runIdRef.current) return;
        updateStatus("recording");
        startCountdown();
      });
      dataChannel.addEventListener("error", () => {
        if (runId === runIdRef.current) {
          failSession("The transcription connection failed. Review any text received and try again.");
        }
      });

      peerConnection.addEventListener("connectionstatechange", () => {
        if (runId !== runIdRef.current) return;
        if (peerConnection.connectionState === "connected") {
          if (disconnectedTimeoutRef.current !== null) {
            window.clearTimeout(disconnectedTimeoutRef.current);
          }
          disconnectedTimeoutRef.current = null;
          return;
        }
        if (peerConnection.connectionState === "disconnected") {
          if (disconnectedTimeoutRef.current !== null) {
            window.clearTimeout(disconnectedTimeoutRef.current);
          }
          disconnectedTimeoutRef.current = window.setTimeout(() => {
            if (peerConnection.connectionState === "disconnected") {
              failSession("The network connection was lost. Review any text received and try again.");
            }
          }, DISCONNECTED_GRACE_MS);
          return;
        }
        if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "closed") {
          if (statusRef.current !== "idle") {
            failSession("The transcription connection closed. Review any text received and try again.");
          }
        }
      });

      const offer = await peerConnection.createOffer();
      if (!offer.sdp) throw new Error("The browser could not create a transcription connection offer.");
      await peerConnection.setLocalDescription(offer);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential.clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      if (!sdpResponse.ok) throw new Error("OpenAI could not establish the transcription connection.");
      const answerSdp = await sdpResponse.text();
      if (runId !== runIdRef.current) return;
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (startError) {
      discardPendingMedia = true;
      const streamToRelease = pendingMediaStream as MediaStream | null;
      if (streamToRelease && mediaStreamRef.current === null) {
        streamToRelease.getTracks().forEach((track) => track.stop());
      }
      if (runId === runIdRef.current) failSession(humanizeStartError(startError));
    }
  }, [failSession, handleRealtimeEvent, inputRef, startCountdown, updateStatus]);

  const start = useCallback(() => {
    let acknowledged = false;
    try {
      acknowledged = window.localStorage.getItem(PRIVACY_ACKNOWLEDGEMENT_KEY) === "1";
    } catch {
      acknowledged = false;
    }
    if (!acknowledged) {
      setShowPrivacyNotice(true);
      return;
    }
    void startInternal();
  }, [startInternal]);

  const confirmPrivacyAndStart = useCallback(() => {
    try {
      window.localStorage.setItem(PRIVACY_ACKNOWLEDGEMENT_KEY, "1");
    } catch {
      // The acknowledgement remains session-only when storage is unavailable.
    }
    setShowPrivacyNotice(false);
    void startInternal();
  }, [startInternal]);

  const dismissPrivacyNotice = useCallback(() => setShowPrivacyNotice(false), []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
    }
    updateStatus("idle");
    releaseResources();
    const originalDraft = baseDraftRef.current;
    draftRef.current = originalDraft;
    setDraft(originalDraft);
    segmentsRef.current.clear();
    pendingTranscriptItemsRef.current.clear();
    setError(null);
    setNotice(null);
    setSecondsRemaining(CONFLICTBENCH_TRANSCRIPTION_MAX_DURATION_SECONDS);
    focusDraft();
  }, [focusDraft, releaseResources, setDraft, updateStatus]);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined"
      && window.isSecureContext
      && Boolean(navigator.mediaDevices?.getUserMedia)
      && typeof RTCPeerConnection !== "undefined"
    );
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !["idle", "error"].includes(statusRef.current)) {
        failSession("Recording stopped when the page became inactive. Review any text received before continuing.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [failSession]);

  useEffect(() => () => {
    runIdRef.current += 1;
    releaseResources();
  }, [releaseResources]);

  const isActive = useMemo(
    () => ["requesting_permission", "connecting", "recording", "finalizing"].includes(status),
    [status]
  );

  return {
    isSupported,
    status,
    isActive,
    isReadOnly: isActive,
    secondsRemaining,
    error,
    notice,
    showPrivacyNotice,
    start,
    confirmPrivacyAndStart,
    dismissPrivacyNotice,
    stop: () => stop("user"),
    cancel
  };
}
