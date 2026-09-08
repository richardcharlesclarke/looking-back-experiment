import briefings from './briefings.json';
export const PAIR_BRIEFING_VERSION='brufest-pair-briefing-v0.2-2026-09-07';
export function pairBriefing(condition:'treatment'|'active_control',proposition:string){
  if(condition==='treatment')return briefings.treatment.slice(briefings.treatment.indexOf('“Before'),briefings.treatment.lastIndexOf('”')+1);
  return `Before the discussion, here are the arrangements. The topic is: ${proposition}

The helper will time two opening statements, each lasting two minutes, followed by eight minutes of discussion and three minutes for a joint record. The helper will say when each stage starts and ends.

Check that each participant has their own personal return link. After the shared record, each person will complete the final questions privately using that link. Ask the helper if the link or equipment does not work.

Review these arrangements privately for the rest of the five-minute briefing slot. Ask only logistical questions during this slot. The same agreed participation, recording and withdrawal information applies to both groups and must already have been provided.`;
}
