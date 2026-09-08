import { questions, isMissing } from "./instruments";
import type { State } from "./types";
export function exportRows(state: State) {
  return state.submissions.flatMap((s) => {
    const items = questions(s.context, s.answers);
    return Object.entries(s.answers).map(([itemId, value]) => {
      const item = items.find((q) => q.id === itemId);
      return {
        responseId: s.id,
        participantToken: s.participantToken,
        study: s.context.study,
        role: s.context.role,
        wave: s.context.wave,
        sessionId: s.context.session?.id ?? "",
        proposition: s.context.session?.proposition ?? "",
        member: s.context.member ?? "",
        instrumentVersion: s.instrumentVersion,
        itemId,
        prompt: item?.prompt ?? "",
        construct: item?.construct ?? "",
        reverseScored: item?.reverse ?? false,
        condition: s.condition ?? state.pairs?.find(p => p.id === s.context.session?.id)?.condition ?? "",
        topicId: state.pairs?.find(p => p.id === s.context.session?.id)?.topicId ?? "",
        topicSource: state.pairs?.find(p => p.id === s.context.session?.id)?.topicSource ?? "",
        contaminationGroupId: state.sessions.find(session => session.id === s.context.session?.id)?.contaminationGroupId ?? s.context.session?.id ?? "",
        extended: s.context.extended ?? false,
        briefingVersion: s.briefingVersion ?? "",
        isTest: s.isTest,
        numeric: typeof value === "number" ? value : "",
        text: typeof value === "string" ? value : "",
        options: Array.isArray(value) ? JSON.stringify(value) : "",
        missingReason: isMissing(value) ? value.missing : "",
        order: s.displayOrder.indexOf(itemId),
        startedAt: s.startedAt,
        completedAt: s.createdAt,
      };
    });
  });
}
export function csv(rows: Record<string, unknown>[]) {
  const columns = Object.keys(rows[0] ?? { responseId: "" });
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [columns, ...rows.map((r) => columns.map((k) => r[k]))]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");
}
