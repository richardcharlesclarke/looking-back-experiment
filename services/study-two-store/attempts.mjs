// Generated from lib/study-two/attempts.ts.
export const attemptOf = (record, wave) => record.attempts?.[wave] ?? 1;
export function pairing(record) {
    const post = record.forms.post;
    const beforeAttempt = attemptOf(record, 'pre');
    const afterBeforeAttempt = post ? (post.beforeAttempt ?? 1) : null;
    return { beforeAttempt, afterBeforeAttempt, matched: Boolean(record.forms.pre?.completedAt && post?.completedAt && beforeAttempt === afterBeforeAttempt), staleAfter: Boolean(post && beforeAttempt !== afterBeforeAttempt) };
}
export function draftKey(version, access, wave, attempt) { return `study-two-speaker-draft:${version}:${access}:${wave}:attempt:${attempt}`; }
// Return only obsolete keys for the specified person, version and affected wave.
export function obsoleteDraftKeys(keys, version, access, wave, attempt) {
    if (attempt <= 1)
        return [];
    const legacy = `study-two-speaker-draft:${version}:${access}:${wave}`, current = draftKey(version, access, wave, attempt);
    return keys.filter(key => { if (key === legacy || key === legacy + ':unmerged')
        return true; if (!key.startsWith(legacy + ':attempt:'))
        return false; const value = key.slice((legacy + ':attempt:').length); const match = /^(\d+)(?::unmerged)?$/.exec(value); return Boolean(match && Number(match[1]) < attempt) && key !== current && key !== current + ':unmerged'; });
}
