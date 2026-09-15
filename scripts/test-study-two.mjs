import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import Module from 'node:module';
import {execFileSync} from 'node:child_process';
function compile(source){const mod=new Module('instrument');mod._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'instrument.cjs');return mod.exports;}
const source=fs.readFileSync('lib/study-two/instrument.ts','utf8');
const {questions,SAMPLE,SPEAKER_ITEMS,instrumentVersion}=compile(source);
const original=compile(execFileSync('git',['show','a7f554c:lib/study-two/instrument.ts'],{encoding:'utf8'}));
const slack=JSON.parse(fs.readFileSync('docs/study-two/speaker-source-2026-09-14.json','utf8'));
const lines=slack.text.split('\n');
const expected=lines.filter(l=>/^\d+\. /.test(l)).map(l=>l.replace(/^\d+\. /,''));
assert.equal(expected.length,20);assert.deepEqual(SPEAKER_ITEMS.map(q=>q.prompt),expected);
assert.deepEqual([...new Set(SPEAKER_ITEMS.map(q=>q.section))],lines.filter(l=>/^\*[A-D]\./.test(l)).map(l=>l.replaceAll('*','')));
for(const speaker of SAMPLE.speakers)for(const target of SAMPLE.speakers.filter(s=>s.id!==speaker.id)){
 const pre=questions(SAMPLE,'speaker','pre',speaker.id,target.id),post=questions(SAMPLE,'speaker','post',speaker.id,target.id);
 assert.equal(pre.length,20);assert.deepEqual(pre,post);
 assert.deepEqual(pre.map(q=>q.prompt),expected.map(p=>p.replace(/\[name\]/gi,target.name)));
 assert.deepEqual(pre.filter(q=>q.type==='text').map(q=>q.id),['S2S_V2_10','S2S_V2_20']);
 for(const q of pre.filter(q=>q.type==='continuous'))assert.deepEqual([q.min,q.max,q.low,q.high,q.cannot],[0,100,'Strongly disagree','Strongly agree','cannot_assess']);
 assert.equal(pre.filter(q=>q.type==='continuous').length,18);
 for(const q of pre.filter(q=>q.type==='continuous'))assert.deepEqual(q.bands,['Strongly disagree','Somewhat disagree','Neither agree nor disagree','Somewhat agree','Strongly agree']);
 assert(pre.slice(13).every(q=>q.target===target.id));
}
for(const wave of ['pre','post'])assert.deepEqual(questions(SAMPLE,'audience',wave),original.questions(SAMPLE,'audience',wave));
assert.equal(instrumentVersion('audience'),original.VERSION);
assert.notEqual(instrumentVersion('speaker'),original.VERSION);
const generated=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
assert.equal(fs.readFileSync('services/study-two-store/instrument.mjs','utf8'),'// Generated from lib/study-two/instrument.ts by scripts/sync-study-two-service.mjs.\n'+generated);
console.log('Exact Slack wording/sections, twenty identical pre/post items, five-band continuous scales, every named target, unchanged audience and server parity verified.');

const reference=JSON.parse(fs.readFileSync('docs/study-two/study-one-ui-reference.json','utf8'));
assert.equal(fs.readFileSync('app/study-two/ContinuousOrb.tsx','utf8').split('// Adapted from')[1],reference.component.split('// Adapted from')[1],'Orb interaction and rendering must be identical to actual Study One');
console.log('Study One orb rendering, pointer capture, keyboard and label-selection implementation match exactly.');
