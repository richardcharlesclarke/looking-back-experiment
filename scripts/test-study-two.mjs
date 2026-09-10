import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import Module from 'node:module';
const code=ts.transpileModule(fs.readFileSync('lib/study-two/instrument.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module('instrument');mod._compile(code,'instrument.cjs');
const {questions,SAMPLE,VERSION}=mod.exports;
for(const role of ['speaker','audience']){
 const pre=questions(SAMPLE,role,'pre','speaker-a'),post=questions(SAMPLE,role,'post','speaker-a');
 assert.equal(pre.length,role==='speaker'?11:5);assert.equal(post.length,role==='speaker'?17:10);
 for(const q of pre){const repeated=post.find(x=>x.id===q.id);if(repeated)assert.deepEqual(repeated,q,'Repeated question changed');}
 for(const wave of [pre,post]){assert.equal(new Set(wave.map(q=>q.id)).size,wave.length);for(const q of wave){assert(!q.prompt.includes('[proposition]'));if(q.type==='continuous'){assert.equal(q.bands.length,5);assert([10,100].includes(q.max));}}}
}
const predictions=questions(SAMPLE,'speaker','pre','speaker-a').filter(q=>q.target);
assert.deepEqual(predictions.map(q=>q.target),['speaker-b','speaker-c']);
assert(predictions.every(q=>q.cannot==='cannot_estimate'&&q.max===10));
const changed={...SAMPLE,proposition:'A different draft claim.',speakers:SAMPLE.speakers.map(s=>({...s,name:s.name+' revised'}))};
assert(questions(changed,'speaker','post','speaker-a').find(q=>q.id==='S2S_POSITION').prompt.includes(changed.proposition));
assert(questions(changed,'speaker','pre','speaker-a').find(q=>q.target==='speaker-b').prompt.includes('revised'));
assert(VERSION.includes('review'));
console.log('Study Two: four forms, exact repeated wording/scales, response anchors, speaker targets and substitutions verified.');
