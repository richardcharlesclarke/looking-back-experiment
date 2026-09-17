import { CONFLICT_PERCEPTION_INSTRUMENT_VERSION, isItemScalesInstrument, ITEM_RESPONSE_LABELS, isSelectiveInstrument, LIKELIHOOD_LABELS, CONFLICT_INSTRUMENT_VERSION, isPerspectivesInstrument, CONTINUOUS_LABELS, CONNECTION_LABELS, isContinuousInstrument } from "./festival/scales";
import bank from "./question-bank.json";
import { FESTIVAL_VERSION, TOPIC_PROGRAMME, FESTIVAL_PROGRAMME, HUB_PROGRAMME, BEAU_SESSION } from "./festival/content";
import type {
  Answer,
  Answers,
  Context,
  Question,
  TopicReference,
  Role,
  Study,
  Wave,
} from "./types";
export const VERSION = "conflict_bench_v0.1";
export const PROGRAMME = [
  "Sample: Opening talk",
  "Sample: Panel A",
  "Sample: Panel B",
  "Sample: Hub workshop",
  "Sample: Speakers’ Corner",
];
const yes = ["Yes", "No", "Not sure"];
const festivalCore = [
  "HUM_01",
  "HUM_02",
  "CUR_01",
  "CUR_02",
  "REG_01",
  "REG_02",
  "CPX_01",
  "CPX_02",
  "REV_01",
  "REV_02",
  "AGY_01",
  "AGY_02",
];
function q(
  id: string,
  section: string,
  extra: Partial<Question> = {},
): Question {
  const prompt = (bank as Record<string, string>)[id];
  if (!prompt && !extra.prompt) throw new Error(`Missing question ${id}`);
  return {
    id,
    prompt,
    section,
    type: "likert",
    min: 1,
    max: 7,
    low: "Not at all true of me now",
    high: "Very true of me now",
    required: true,
    ...extra,
  };
}
const single = (
  id: string,
  section: string,
  options: string[],
  prompt?: string,
) => q(id, section, { type: "single", options, ...(prompt ? { prompt } : {}) });
const multi = (
  id: string,
  section: string,
  options: string[],
  limit?: number,
  exclusive: string[] = [
    "None",
    "Cannot remember",
    "Not yet decided",
    "No meaningful change",
  ],
) => q(id, section, { type: "multi", options, limit, exclusive });
const text = (id: string, section: string, prompt?: string, required = false) =>
  q(id, section, { type: "text", required, ...(prompt ? { prompt } : {}) });
const scale = (
  id: string,
  section: string,
  low = "Not at all",
  high = "Extremely",
  prompt?: string,
) =>
  q(id, section, {
    type: "scale",
    min: 0,
    max: 10,
    low,
    high,
    ...(prompt ? { prompt } : {}),
  });
export function validFlow(study: Study, role: Role, wave: Wave) {
  return study === 'festival' && role === 'attendee' && ['pre','post'].includes(wave);
}
export function topicReferenceFromAnswers(answers: Answers): TopicReference | undefined {
  const topic=answers.E1_PRE_TOPIC_PANEL, view=answers.E1_PRE_STARTING_VIEW;
  return typeof topic==='string' && TOPIC_PROGRAMME.includes(topic) && typeof view==='string' && !!view.trim() ? {topic,view} : undefined;
}
export function questions(ctx: Context, answers: Answers = {}): Question[] {
  const { study, role, wave } = ctx;
  if (!validFlow(study, role, wave))
    throw new Error("Choose a valid questionnaire.");
  let out: Question[] = [];
  if (study === "festival") {
    const revised = ctx.festivalVersion === FESTIVAL_VERSION;
    const programme = revised ? FESTIVAL_PROGRAMME : PROGRAMME;
    out = festivalCore.map((key, i) =>
      q(
        `E1_${key}`,
        ["Your perspective", "Meeting another view", "Room to change"][
          Math.floor(i / 4)
        ],
        {
          reverse: ["HUM_02", "REV_02", "AGY_02"].includes(key),
          construct: key.split("_")[0],
        },
      ),
    );
    if (ctx.responseInstrument === CONFLICT_INSTRUMENT_VERSION) {
      const prompts:Record<string,string> = {
        E1_HUM_01: 'My view on an important issue contains weaknesses I have not yet recognized.',
        E1_HUM_02: 'I see little value in revisiting the opposing case.',
        E1_CUR_02: 'I am willing to spend time considering the strongest argument against a view I hold.',
        E1_REG_01: 'When I reject someone’s conclusion, I can still understand the concern or value behind it.',
        E1_REG_02: 'I can disagree strongly with a person’s view without rejecting the person.',
        E1_CPX_02: 'A useful conflict can expand one’s perception of a problem, even when nobody changes sides.',
      };
      out = out.flatMap(item => item.id === 'E1_CPX_01' ? [
        {...item, id:'E1_CPX_ISSUES', prompt:'Important conflicts often involve several issues, not just a choice between two sides.'},
        {...item, id:'E1_CPX_CONSEQUENCES', prompt:'Choices in important conflicts can have several connected consequences.'},
      ] : [{...item, ...(prompts[item.id] ? {prompt:prompts[item.id]} : {})}]);
    }
    if (isSelectiveInstrument(ctx.responseInstrument)) {
      // A distinct item-level instrument. Historical prompts/IDs above stay frozen.
      // Acknowledgement, willingness, perceived ability and expectations remain separate.
      out = [
        q('E1_HUM_01', 'Your perspective', {prompt:'My view on an important issue is likely to contain weaknesses I have not yet recognised.', construct:'humility'}),
        q('E1_HUM_02', 'Your perspective', {prompt:'When I have a strong opinion about a topic that matters to me, I see little value in considering a perspective that challenges it.', reverse:true, construct:'openness'}),
        q('E1_CUR_02', 'Meeting another view', {prompt:'I am willing to spend time considering the strongest argument against a view I hold.', construct:'willingness_to_consider'}),
        q('E1_CUR_01', 'Meeting another view', {prompt:'When someone strongly disagrees with me, I want to understand how their view makes sense to them.', construct:'desire_to_understand'}),
        q('E1_REG_01', 'Meeting another view', {prompt:'When I reject someone’s conclusion, I can still understand the concern or value behind it.', construct:'perceived_understanding'}),
        q('E1_CPX_ISSUES', 'Seeing the issue', {prompt:'When I disagree with someone, I recognise that the issue may involve several connected concerns.', construct:'complexity'}),
        q('E1_AGY_01', 'Staying in the conversation', {prompt:'I feel able to stop a difficult disagreement becoming personal.', construct:'perceived_agency'}),
        q('E1_AGY_02', 'Staying in the conversation', {prompt:'When a disagreement becomes tense, there is little I can do to make it productive.', reverse:true, construct:'perceived_agency'}),
        q('E1_REG_02', 'Staying in the conversation', {prompt:'I can disagree strongly with a person’s view without rejecting the person.', construct:'person_position_separation'}),
        q('E1_ACK_01', 'Room to change', {prompt:'When I recognise a weakness in my view, I am willing to acknowledge it openly.', construct:'willingness_to_acknowledge'}),
        q('E1_LEARN_01', 'Seeing the issue', {prompt:'I can learn something valuable from a view that challenges my own, even if my conclusion does not change.', construct:'perceived_learning'}),
        q('E1_CPX_UNANTICIPATED', 'Seeing the issue', {prompt:'Even when I am convinced my view is correct, acting on it may have consequences I have not anticipated.', construct:'uncertainty'}),
        q('E1_REV_WILLING', 'Room to change', {prompt:'When I see a good reason to do so, I am willing to revise my position in a disagreement.', construct:'willingness_to_revise'}),
        q('E1_ACK_COST', 'Room to change', {prompt:'Acknowledging a weakness in my view feels like losing ground.', reverse:true, construct:'acknowledgement_cost'}),
        ...[
          ['E1_EXPECT_UNDERSTANDING', 'When you strongly disagree with someone about an issue that matters to you, how likely is the conversation to deepen your understanding?', 'expected_understanding'],
          ['E1_EXPECT_CONNECTION_LOSS', 'When you strongly disagree with someone about an issue that matters to you, how likely is the conversation to leave you feeling less connected to that person?', 'expected_connection_loss'],
        ].map(([id,prompt,construct]) => q(id, 'What you expect', {prompt,construct,type:'continuous',min:0,max:100,low:LIKELIHOOD_LABELS[0],high:LIKELIHOOD_LABELS[4],bands:[...LIKELIHOOD_LABELS],reverse:id==='E1_EXPECT_CONNECTION_LOSS'})),
      ];
    }
    if (isItemScalesInstrument(ctx.responseInstrument)) {
      out = out.map(item => {
        const bands = ITEM_RESPONSE_LABELS[item.id];
        return bands ? {...item, type:'continuous', min:0, max:100, low:bands[0], high:bands[4], bands:[...bands]} : item;
      });
    }
    if (ctx.responseInstrument === CONFLICT_PERCEPTION_INSTRUMENT_VERSION && (wave === 'pre' || wave === 'post')) {
      out.push(
        q('E1_CONFLICT_PERCEPTION', 'How you see conflict', {
          prompt:'When you think about conflict with someone over an issue that matters to you, how do you tend to see the conflict itself?',
          type:'continuous', min:0, max:10, construct:'perceived_conflict_value',
          low:'Something destructive that diminishes what’s possible', high:'Something generative that can create new possibilities',
          help:'0 — Something destructive that diminishes what’s possible → 10 — Something generative that can create new possibilities',
          bands:['Destructive', 'Mostly destructive', 'In between', 'Mostly generative', 'Generative'],
        }),
        q('E1_DISCUSSION_WILLINGNESS', 'Discussing a disagreement', {
          prompt:'When you anticipate a disagreement with someone over an issue that matters to you, how willing are you to discuss it with them?',
          type:'continuous', min:0, max:10, construct:'willingness_to_discuss_disagreement',
          low:'Not at all willing to discuss it', high:'Very willing to discuss it',
          help:'0 — Not at all willing to discuss it → 10 — Very willing to discuss it',
          bands:['Not at all willing', 'Slightly willing', 'Moderately willing', 'Quite willing', 'Very willing'],
        }),
      );
    }
    const perspectives = isPerspectivesInstrument(ctx.responseInstrument);
    if (perspectives && (wave === 'pre' || wave === 'post')) out.push(
      ...(isSelectiveInstrument(ctx.responseInstrument) ? [['SIMILAR', 'people who have similar views to your own', 'People with similar views'], ['DIFFERENT', 'people who have views that are significantly different from your own', 'People with significantly different views'], ['WORLD', 'people all over the world', 'People all over the world']] : [['CLOSE', 'your close friends and family', 'My close friends and family'], ['WORLD', 'people all over the world', 'People all over the world']]).map(([id, group, target]) => q(`E1_CONNECTION_${id}`, 'Feeling connected', {
        prompt: `How connected do you feel to ${group}?`, type: 'circles', min: 1, max: 7, bands: [...CONNECTION_LABELS], target, construct: 'felt_connection',
        help: 'More overlap means a stronger feeling of connection. This is about connection, not whether you agree with everyone in the group.',
      })),
      q('E1_FUTURE_OUTLOOK', 'Looking ahead', {prompt: 'Thinking about life for people around the world over the next ten years, how optimistic or pessimistic do you feel?', type: 'single', options: ['Very pessimistic', 'Somewhat pessimistic', 'Neither optimistic nor pessimistic', 'Somewhat optimistic', 'Very optimistic', 'Not sure'], required: false, construct: 'future_outlook'}),
    );
    if (isSelectiveInstrument(ctx.responseInstrument)) {
      if (wave==='pre') {
        out.push(single('E1_PRE_TOPIC_PANEL', 'Your selected topic', [...TOPIC_PROGRAMME, 'None of these', 'Not sure'], 'Which of the panels is discussing a topic about which you feel very certain?'));
        if (typeof answers.E1_PRE_TOPIC_PANEL==='string' && TOPIC_PROGRAMME.includes(answers.E1_PRE_TOPIC_PANEL)) out.push(text('E1_PRE_STARTING_VIEW', 'Your selected topic', 'What is your current view on this topic? State it briefly in your own words. Please avoid names or identifying details.', true));
      }
      const reference=wave==='pre'?topicReferenceFromAnswers(answers):ctx.topicReference;
      if(reference && (wave==='pre'||wave==='post')) out.push(
        ...[
          ['E1_TOPIC_CERTAINTY','How certain are you that your current view on this topic is correct?','Not at all certain','Completely certain','topic_certainty'],
          ['E1_TOPIC_RECONSIDER','How willing are you to reconsider your current view on this topic?','Not at all willing','Completely willing','topic_reconsideration'],
        ].map(([id,prompt,low,high,construct])=>q(id,'Your selected topic',{prompt,type:'continuous',min:0,max:10,low,high,help:`0 — ${low} → 10 — ${high}`,bands:[low,'Slightly '+(id==='E1_TOPIC_CERTAINTY'?'certain':'willing'),'Somewhat '+(id==='E1_TOPIC_CERTAINTY'?'certain':'willing'),'Very '+(id==='E1_TOPIC_CERTAINTY'?'certain':'willing'),high],construct,target:JSON.stringify(reference)})),
      );
    }
    if (wave === "pre")
      out.push(
        multi(
          "E1_PRE_DAYS",
          "Your festival",
          ["Saturday", "Sunday", "Not sure"],
          undefined,
          ["Not sure"],
        ),
        single("E1_PRE_ACCESS", "Your festival", [
          "Day ticket",
          "Weekend ticket",
          "Speaker / contributor",
          "Other",
        ]),
        multi("E1_PRE_SESSIONS", "Your festival", [
          ...programme,
          "Not yet decided",
        ]),
        ...(!revised ? [single("E1_PRE_FAMILIAR", "Before you arrive", [
          "Not at all",
          "A little",
          "Quite familiar",
          "Very familiar",
        ]),
        single("E1_PRE_PRIOR", "Before you arrive", yes),
        single("E1_PRE_EXPOSURE", "Before you arrive", yes),
        scale("E1_PRE_INTEREST", "Before you arrive")] : []),
      );
    if (wave === "post") {
      out.push(
        multi("E1_POST_DAYS", "Your festival", ["Saturday", "Sunday"]),
        multi("E1_POST_SESSIONS", "Your festival", [
          ...programme,
          "Other",
          "Cannot remember",
        ]),
      );
      const attended = answers.E1_POST_SESSIONS;
      if (Array.isArray(attended))
        attended
          .filter((s) => programme.includes(s))
          .forEach((s) =>
            out.push(
              single(
                `EXPOSURE_${programme.indexOf(s)}_portion`,
                "What you took part in",
                ["All", "Part", "Not sure"],
                `How much of “${s}” did you attend?`,
              ),
              single(
                `EXPOSURE_${programme.indexOf(s)}_role`,
                "What you took part in",
                ["Listen/watch", "Actively take part", "Both", "Not sure"],
                `How did you take part in “${s}”?`,
              ),
            ),
          );
      out.push(
        multi("E1_POST_HUB", "What you took part in", revised ? [...HUB_PROGRAMME, "Other", "None"] : [
          "Hub workshop",
          "Speakers’ Corner",
          "Soapbox / open mic",
          "Other",
          "None",
        ]),
        single("E1_POST_KEYNOTE", "What you took part in", [
          "All",
          "Part",
          "No",
          "Not sure",
        ]),
      );
      if (revised) {
        const keynote = out.find(q => q.id === "E1_POST_KEYNOTE")!;
        keynote.prompt = `Did you attend “${BEAU_SESSION}” (with Beau Lotto)?`;
      }
      if (["All", "Part"].includes(String(answers.E1_POST_KEYNOTE)))
        out.push(
          scale(
            "E1_POST_KEYNOTE_IMPACT",
            "What you took part in",
            "Not at all",
            "A great deal",
          ),
        );
      out.push(
        single("E1_POST_DISAGREEMENT", "Conversations", yes),
        single("E1_POST_TRIAL", "Conversations", yes),
        multi(
          "E1_POST_CHANGE",
          "What stays with you",
          [
            "No meaningful change",
            "More interested in understanding different views",
            "More willing to qualify my own view",
            "More aware of uncertainty",
            "Better able to explain why people disagree",
            "More able to handle a difficult exchange",
            "Less willing to engage",
            "Something else",
          ],
          2,
        ),
        text("E1_POST_OPEN", "What stays with you"),
        ...(!perspectives ? [text("E1_POST_GENERATED", "What stays with you")] : []),
        single("E1_POST_INFLUENCE", "Looking forward", [
          ...programme,
          "Informal conversation",
          "Small-group study",
          "Other",
          "None",
          "Not sure",
        ]),
        single("E1_POST_CHOICE", "Looking forward", [
          "A strong case supporting my view",
          "A strong case challenging my view",
          "A comparison of different views",
          "Nothing further",
        ]),
      );
    }
    if (perspectives && wave === 'post') {
      const learning = [single('E1_POST_ENCOUNTER', 'Seeing things differently', ['Yes', 'No', 'Cannot recall'], 'At Big Brue, did you encounter a view on a topic that differed from yours?')];
      if (answers.E1_POST_ENCOUNTER === 'Yes') {
        learning.push(text('E1_POST_TOPIC', 'Seeing things differently', 'Think of one such occasion from a talk, workshop or conversation. What was the topic? Please avoid names or identifying details.', true));
        learning.push(single('E1_POST_DEPTH', 'Seeing things differently', ['Shallower', 'About the same', 'Deeper', 'Changed in another way', 'Not sure'], 'Compared with before Big Brue, how would you describe your understanding of this topic?'));
        learning.push(single('E1_POST_ASSUMPTION', 'Seeing things differently', ['Yes', 'No', 'Not sure'], 'Did you notice an assumption shaping your own view of this topic that you had not noticed before?'));
        learning.push(single('E1_POST_POSITION_CHANGE', 'Seeing things differently', ['My position changed', 'My position stayed the same', 'I became less certain without settling on a different position', 'Not sure', 'I had no initial position'], 'Which best describes what happened to your position on this topic?'));
        learning.push(text('E1_POST_UNDERSTANDING_ACCOUNT', 'Seeing things differently', 'What, if anything, do you understand differently now? Describe a particular reason, distinction or assumption. No change, greater confusion, or an experience that made understanding harder are equally useful to describe. Please avoid names or identifying details.'));
      }
      const insertion = out.findIndex(item => item.id === 'E1_POST_INFLUENCE');
      out.splice(insertion, 0, ...learning);
    }
    if (wave === "followup")
      out.push(
        ...["OPPOSING", "CONVERSATION", "USED"].map((k) =>
          single(`E1_FU_${k}`, "Since the festival", [
            "Yes",
            "No",
            "No opportunity",
            "Not sure",
          ]),
        ),
        text("E1_FU_EXAMPLE", "Since the festival"),
      );
  }
  return out.map((item) => resolve(item, ctx));
}

function resolve(item: Question, ctx: Context): Question {
  return {
    ...item,
    ...(ctx.study === 'festival' && isContinuousInstrument(ctx.responseInstrument) && item.type === 'likert' ? {type: 'continuous' as const, min: 0, max: 100, bands: [...CONTINUOUS_LABELS]} : {}),
    prompt: item.prompt
      .replaceAll(
        "[proposition]",
        `“${ctx.session?.proposition || "the central question"}”`,
      )
      .replaceAll(
        "[candidate proposition]",
        `“${ctx.session?.proposition || "the central question"}”`,
      )
      .replaceAll("[Beau session title]", "Beau’s session"),
    reverse: item.reverse || /(?:POST_08|DEG_01)$/.test(item.id),
  };
}
export function isMissing(
  a: unknown,
): a is { missing: "prefer_not" | "cannot_assess" | "not_applicable" } {
  return (
    !!a &&
    typeof a === "object" &&
    !Array.isArray(a) &&
    Object.keys(a).length === 1 &&
    ["prefer_not", "cannot_assess", "not_applicable"].includes(
      String((a as { missing?: unknown }).missing),
    )
  );
}
export function answerError(q: Question, a: unknown): string | null {
  if (isMissing(a)) return null;
  if (a === undefined || a === "" || (Array.isArray(a) && !a.length))
    return q.required
      ? "Choose an answer or select “Prefer not to answer”."
      : null;
  if (q.type === "scale" || q.type === "likert" || q.type === "continuous" || q.type === "circles")
    return typeof a === "number" &&
      Number.isFinite(a) &&
      a >= (q.min ?? 0) &&
      a <= (q.max ?? 10) &&
      (!["likert", "circles"].includes(q.type) || Number.isInteger(a))
      ? null
      : "Choose a value on this scale.";
  if (q.type === "text")
    return typeof a === "string" &&
      a.trim().length <= 3000 &&
      (!q.required || !!a.trim())
      ? null
      : "Write up to 3,000 characters, or choose to skip.";
  if (q.type === "single")
    return typeof a === "string" && q.options?.includes(a)
      ? null
      : "Choose one of the listed answers.";
  if (
    !Array.isArray(a) ||
    !a.every((v) => typeof v === "string" && q.options?.includes(v)) ||
    new Set(a).size !== a.length
  )
    return "Choose from the listed answers.";
  if (q.limit && a.length > q.limit) return `Choose up to ${q.limit}.`;
  if (a.length > 1 && a.some((v) => q.exclusive?.includes(v)))
    return "This answer must be selected on its own.";
  return null;
}
export function validateAnswers(
  ctx: Context,
  answers: unknown,
): { questions: Question[]; answers: Answers } {
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    throw new Error("Answers could not be read.");
  const values = answers as Answers,
    items = questions(ctx, values),
    clean: Answers = {};
  for (const item of items) {
    const err = answerError(item, values[item.id]);
    if (err) throw new Error(`${item.prompt} ${err}`);
    if (values[item.id] !== undefined)
      clean[item.id] = values[item.id] as Answer;
  }
  return { questions: items, answers: clean };
}
