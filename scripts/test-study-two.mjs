import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import Module from 'node:module';
import {execFileSync} from 'node:child_process';
function compile(source){const mod=new Module('instrument');mod._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'instrument.cjs');return mod.exports;}
const source=fs.readFileSync('lib/study-two/instrument.ts','utf8');
const {questions,SAMPLE,SPEAKER_ITEMS,instrumentVersion}=compile(source);
const original=compile(execFileSync('git',['show','a7f554c:lib/study-two/instrument.ts'],{encoding:'utf8'}));
const slack=JSON.parse(fs.readFileSync('docs/study-two/speaker-source-2026-09-15.json','utf8'));
for(const wave of ['pre','post']){
 const expected=slack[wave].split('\n').filter(l=>/^\d+\. /.test(l)).map(l=>l.replace(/^\d+\. /,''));
 const actual=questions(SAMPLE,'speaker',wave,'speaker-a','speaker-b');
 assert.equal(actual.length,wave==='pre'?21:25);assert.deepEqual(actual.map(q=>q.prompt),expected);
 assert(actual.every(q=>!q.target));assert.equal(new Set(actual.map(q=>q.id)).size,actual.length);
 for(const q of actual.filter(q=>q.type==='continuous')){assert.deepEqual([q.min,q.max,q.cannot],[0,100,'cannot_assess']);assert.deepEqual(q.bands,['Strongly disagree','Somewhat disagree','Neither agree nor disagree','Somewhat agree','Strongly agree']);}
 assert.deepEqual(actual.filter(q=>q.optional).map(q=>q.id),wave==='pre'?['S2S_V2_10','S2S_V4_OTHERS_REASONS']:['S2S_V2_10','S2S_V4_OTHERS_REASONS','S2S_V4_SEE_NOW']);
}
assert.deepEqual(questions(SAMPLE,'speaker','pre'),questions(SAMPLE,'speaker','post').slice(0,21));
assert.equal(SPEAKER_ITEMS.length,21);
assert.equal(questions(SAMPLE,'speaker','post')[23].optional,undefined);
for(const wave of ['pre','post'])assert.deepEqual(questions(SAMPLE,'audience',wave),original.questions(SAMPLE,'audience',wave));
assert.equal(instrumentVersion('audience'),original.VERSION);
assert.notEqual(instrumentVersion('speaker'),original.VERSION);
const generated=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
assert.equal(fs.readFileSync('services/study-two-store/instrument.mjs','utf8'),'// Generated from lib/study-two/instrument.ts by scripts/sync-study-two-service.mjs.\n'+generated);
console.log('Exact Slack wording/sections, 21 common items and four post-only items, five-band continuous scales, collective target, unchanged audience and server parity verified.');

const reference=JSON.parse(fs.readFileSync('docs/study-two/study-one-ui-reference.json','utf8'));
assert.equal(fs.readFileSync('app/study-two/ContinuousOrb.tsx','utf8').split('// Adapted from')[1],reference.component.split('// Adapted from')[1],'Orb interaction and rendering must be identical to actual Study One');
console.log('Study One orb rendering, pointer capture, keyboard and label-selection implementation match exactly.');

const participation=fs.readFileSync('lib/study-two/participation.ts','utf8');
assert.equal(fs.readFileSync('services/study-two-store/participation.mjs','utf8'),'// Generated from lib/study-two/participation.ts.\n'+ts.transpileModule(participation,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
console.log('Participant information snapshot matches between browser and durable store.');
