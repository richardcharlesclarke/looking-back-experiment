export const VERSION = 'study-two-review-v1-2026-09-10';
export const SPEAKER_VERSION = 'study-two-speaker-review-v4-2026-09-15';
export const instrumentVersion = (role:Role) => role === 'speaker' ? SPEAKER_VERSION : VERSION;
export type Role = 'speaker' | 'audience';
export type Wave = 'pre' | 'post';
export type Answer = number | string | {missing:'prefer_not'|'cannot_assess'|'cannot_estimate'|'skipped'|'dont_know'};
export type Question = {id:string;prompt:string;section:string;type:'continuous'|'text'|'single'|'rating';min?:number;max?:number;low?:string;high?:string;bands?:string[];options?:string[];target?:string;optional?:boolean;cannot?:'cannot_assess'|'cannot_estimate'|'dont_know'};
export type Panel = {id:string;title:string;proposition:string;speakers:{id:string;name:string}[]};
export const SAMPLE:Panel = {id:'sample-panel',title:'Who should shape our town?',proposition:'Residents should have the final say on major changes to their town.',speakers:[{id:'speaker-a',name:'Speaker A'},{id:'speaker-b',name:'Speaker B'},{id:'speaker-c',name:'Speaker C'}]};
// Neutral inspection context only. Real named panels are prepared through protected setup.
export const SPEAKER_PANEL:Panel = {...SAMPLE,id:'speaker-panel',title:'Panel conversation',proposition:'The issue being discussed'};
const agreement=['Strongly disagree','Somewhat disagree','Neither agree nor disagree','Somewhat agree','Strongly agree'];
const support=['Strongly oppose','Lean against','Neither oppose nor support','Lean towards','Strongly support'];
const extent=['Not at all','A little','Somewhat','Very well','Extremely well'];
function scale(id:string,prompt:string,section:string,bands=agreement,max=100):Question{return {id,prompt,section,type:'continuous',max,bands};}
export const SPEAKER_ITEMS:Question[] = [
  {
    "id": "S2S_V2_01",
    "prompt": "I actively look for something in an opposing view that could expand my understanding.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_02",
    "prompt": "I can remain curious about someone’s reasons even when I strongly disagree with their position.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_03",
    "prompt": "I am prepared for my own position on this issue to change.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_04",
    "prompt": "During disagreement, I find myself preparing my response rather than fully listening.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_05",
    "prompt": "Changing my mind during a disagreement can feel like losing.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_06",
    "prompt": "A disagreement can be successful if my understanding expands, even when my position stays the same.",
    "section": "A. How I approach conflict",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_07",
    "prompt": "There are important aspects of this issue that I may not yet see.",
    "section": "B. How I understand the issue",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_POSITION_TENSION",
    "prompt": "There are things that matter to me about this issue that don’t fit neatly with my current position.",
    "section": "B. How I understand the issue",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_COUNTER_CASE",
    "prompt": "I can make a strong case for parts of this issue that don’t support my current position.",
    "section": "B. How I understand the issue",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_09",
    "prompt": "My current position on this issue feels important to who I am.",
    "section": "B. How I understand the issue",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_10",
    "prompt": "What are the main considerations that shape how you currently see this issue? Where, if anywhere, do they pull you in different directions?",
    "section": "B. How I understand the issue",
    "type": "text",
    "optional": true
  },
  {
    "id": "S2S_V2_11",
    "prompt": "I feel positive about myself right now.",
    "section": "C. How I feel about myself and the future",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_12",
    "prompt": "I feel hopeful about people’s ability to work through serious disagreements.",
    "section": "C. How I feel about myself and the future",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V2_13",
    "prompt": "I can see a workable way forward on this issue.",
    "section": "C. How I feel about myself and the future",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_UNDERSTANDING",
    "prompt": "I understand why the other panellists hold their positions on this issue.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_IMPRESSION",
    "prompt": "My impression of the other panellists goes beyond their positions on this issue.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_LEGITIMATE_INTENTIONS",
    "prompt": "Even where I disagree with the other panellists, I can recognise legitimate intentions behind their positions.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_KNOWLEDGE",
    "prompt": "I consider the other panellists knowledgeable about this issue.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_APPROACHES",
    "prompt": "The other panellists and I favour similar approaches to addressing this issue.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_CONCERNS",
    "prompt": "The other panellists and I share underlying concerns about this issue.",
    "section": "D. How I perceive the other panellists",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_OTHERS_REASONS",
    "prompt": "What do you currently think explains the other panellists’ positions on this issue? Please say what you are unsure about, too.",
    "section": "D. How I perceive the other panellists",
    "type": "text",
    "optional": true
  }
];
export const SPEAKER_POST_ITEMS:Question[] = [
  {
    "id": "S2S_V4_NEW_INSIGHT",
    "prompt": "The other panellists helped me see something about this issue that I had not seen before.",
    "section": "E. Learning from difference — post-panel only",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_POSITION_COMPLEXITY",
    "prompt": "Something the other panellists said made my own position more complex.",
    "section": "E. Learning from difference — post-panel only",
    "type": "continuous",
    "min": 0,
    "max": 100,
    "bands": [
      "Strongly disagree",
      "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree",
      "Strongly agree"
    ],
    "low": "Strongly disagree",
    "high": "Strongly agree",
    "cannot": "cannot_assess"
  },
  {
    "id": "S2S_V4_EXPANDED_VIEW",
    "prompt": "What, if anything, did the other panellists say that changed, complicated or expanded how you see the issue?",
    "section": "E. Learning from difference — post-panel only",
    "type": "text"
  },
  {
    "id": "S2S_V4_SEE_NOW",
    "prompt": "What do you see now that you did not see when you entered the conversation?",
    "section": "E. Learning from difference — post-panel only",
    "type": "text",
    "optional": true
  }
];
export function questions(panel:Panel,role:Role,wave:Wave,speakerId?:string,targetSpeakerId?:string):Question[]{
 void speakerId; void targetSpeakerId;
 if(role==='speaker')return [...SPEAKER_ITEMS,...(wave==='post'?SPEAKER_POST_ITEMS:[])].map(q=>({...q}));
 const p='S2A';
 const out:Question[]=[];
 out.push(scale(p+'_POSITION',`To what extent do you support this claim: “${panel.proposition}”`,'Your view',support,10),scale(p+'_CONFIDENCE',`How confident are you in your position on this claim: “${panel.proposition}”`,'Your view',['Not at all confident','Slightly confident','Somewhat confident','Very confident','Completely confident'],10),scale(p+'_UNDERSTANDING',`How well do you understand the strongest reasons for a view different from yours on this claim: “${panel.proposition}”`,'Understanding another view',extent,10));
 if(wave==='pre')out.push(scale('S2A_FAMILIAR','How familiar are you with the subject of this panel?','Before the panel',['Not at all familiar','Slightly familiar','Somewhat familiar','Very familiar','Extremely familiar'],10),scale('S2A_IMPORTANCE','How much does this issue matter to you personally?','Before the panel',['Not at all','A little','Somewhat','A lot','Extremely'],10));
 if(wave==='post'){
  const process=[['RESPONDED','The speakers responded to one another’s reasons.'],['QUALIFIED','At least one speaker qualified or refined a claim in response to another speaker.'],['UNDERSTOOD','The discussion helped me understand why people hold different views on this issue.'],['NEW','The discussion gave me a useful question, distinction or possibility I had not considered before.'],['RESPECT','The speakers treated one another with respect when they disagreed.']];
  out.push(...process.map(([id,prompt])=>({...scale(p+'_POST_'+id,prompt,'What you heard'),cannot:'cannot_assess' as const})));
  if(role==='audience')out.push({id:'S2A_CLOSEST',prompt:'Which speaker’s position was closest to yours?',section:'What you heard',type:'single',options:[...panel.speakers.map(s=>s.name),'None of these speakers','Not sure']});
  out.push({id:p+'_NEW_EXAMPLE',prompt:'What is one idea or question from the panel that you had not considered before, if any?',section:'In your own words',type:'text',optional:true});
 }
 return out;
}
