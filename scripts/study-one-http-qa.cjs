/* eslint-disable @typescript-eslint/no-require-imports */
// Local-only real HTTP/storage integration check for the isolated production build.
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {questions}=require('../.local/brufest-tests/lib/brufest/instruments');
const {FESTIVAL_VERSION,INFORMATION_VERSION}=require('../.local/brufest-tests/lib/brufest/festival/content');
const base='http://localhost:3119', access=randomBytes(32).toString('hex');
const dir=path.resolve('.local/release-qa');
async function req(body){const r=await fetch(base+'/study-one/api/brufest/festival',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({access,kind:'first',...body})});return {status:r.status,data:await r.json()};}
function answers(wave){const a={};for(let pass=0;pass<3;pass++)for(const q of questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION},a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'Synthetic local QA':q.type==='multi'?[q.options[0]]:q.type==='single'?q.options[0]:q.type==='scale'?9.9:4;return a;}
(async()=>{
 assert.equal((await req({action:'enrol',agree:false,informationVersion:INFORMATION_VERSION})).status,400);
 let r=await req({action:'enrol',agree:true,informationVersion:INFORMATION_VERSION});assert.equal(r.status,200);const id=r.data.id;
 assert.equal((await req({action:'submit',wave:'pre',answers:{},startedAt:new Date().toISOString()})).status,400);
 r=await req({action:'submit',wave:'pre',answers:answers('pre'),startedAt:new Date().toISOString()});assert.equal(r.data.step,'contact');assert.equal(r.data.id,id);
 assert.equal((await req({action:'contact',permission:true,email:'bad'})).status,400);
 assert.equal((await req({action:'contact',permission:true,email:'synthetic@example.invalid'})).data.step,'waiting');
 // Only our isolated local fixture can bypass the date gate. No production records are read.
 let rev=fs.readFileSync(path.join(dir,'current'),'utf8');const folder=path.join(dir,rev);
 const research=JSON.parse(fs.readFileSync(path.join(folder,'research.json'))),contacts=JSON.parse(fs.readFileSync(path.join(folder,'contacts.json')));
 const person=research.people.find(p=>p.id===id),contact=contacts.contacts.find(c=>c.personId===id);const after=contact.afterKey;
 assert.equal((await req({action:'status',kind:'after',access:after})).data.step,'waiting');
 rev=fs.readFileSync(path.join(dir,'current'),'utf8');
 person.isTest=true;contact.demoAfterOpen=true;
 fs.writeFileSync(path.join(dir,rev,'research.json'),JSON.stringify(research));fs.writeFileSync(path.join(dir,rev,'contacts.json'),JSON.stringify(contacts));
 assert.equal((await req({action:'status',kind:'after',access:after})).data.step,'post');
 r=await req({action:'submit',kind:'after',access:after,wave:'post',answers:answers('post'),startedAt:new Date().toISOString()});assert.equal(r.data.step,'complete');assert.equal(r.data.id,id);assert.deepEqual(r.data.completed,['pre','post']);
 assert.equal((await req({action:'delete'})).data.step,'deleted');assert.equal((await req({action:'status'})).status,400);assert.equal((await req({action:'status',kind:'after',access:after})).status,400);
 console.log(JSON.stringify({passed:true,localOnly:true,checks:['consent','real HTTP routing','validation','storage','matched before and after','date gate','local demo release','contact validation','completion','deletion revokes both links']}));
})().catch(e=>{console.error(e);process.exit(1)});
