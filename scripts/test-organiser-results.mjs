import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('lib/organiser/results.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {answerText,comparable,scaleText}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(answerText(0),'0');assert.equal(answerText({missing:'cannot_assess'}),'Cannot assess');assert.equal(answerText(undefined),'Not saved');assert.equal(answerText(['A','B']),'A; B');assert.equal(answerText('<script>raw answer</script>'),'<script>raw answer</script>');
const q={id:'a',prompt:'Exact question',type:'continuous',min:0,max:10,low:'Never',high:'Always',help:'Context',target:'one'};
assert.equal(scaleText(q),'0 = Never · 10 = Always');assert(comparable(q,{...q}));assert(!comparable(q,{...q,max:100}));assert(!comparable(q,{...q,prompt:'Different'}));assert(!comparable(q,{...q,target:'two'}));assert(!comparable(q,undefined));
console.log('Exact values, missingness, multi-select and frozen scale/wording comparison passed.');
