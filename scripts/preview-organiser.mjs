// Synthetic local-only preview. No production API or credentials are used.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHmac,randomBytes} from 'node:crypto';
import {createStore} from '../services/study-two-store/store.mjs';
import {instrumentVersion} from '../services/study-two-store/instrument.mjs';
import {INFORMATION_VERSION} from '../services/study-two-store/participation.mjs';
const dir=await mkdtemp(join(tmpdir(),'organiser-preview-')),store=await createStore(dir),secret=randomBytes(32).toString('hex');
for(let i=0;i<4;i++){
 const base={role:'speaker',access:String(i+1).repeat(64),instrumentVersion:instrumentVersion('speaker'),agree:true,informationVersion:INFORMATION_VERSION,consentKind:'research',isTest:i===3,testLabel:'local-only-fixture'};
 let p=await store.action({...base,action:'enrol'});
 if(i!==2){const answers=Object.fromEntries(p.questionnaires.pre.slice(0,i===1?2:99).map(q=>[q.id,q.type==='text'?'Synthetic text: exact answer':q.type==='continuous'?0:q.options?.[0]??0]));p=await store.action({...base,action:'save',wave:'pre',revision:0,page:i===1?1:20,complete:i!==1,answers});}
 if(i===0){p=await store.action({...base,action:'start',wave:'post'});await store.action({...base,action:'save',wave:'post',revision:0,page:24,complete:true,answers:Object.fromEntries(p.questionnaires.post.map(q=>[q.id,q.type==='text'?'Synthetic after answer':q.type==='continuous'?70:q.options?.[0]??0]))});}
}
const q=[{id:'E1_TEST',prompt:'Synthetic fixture: I understand another point of view.',type:'continuous',min:0,max:100,low:'Strongly disagree',high:'Strongly agree',bands:['Strongly disagree','Somewhat disagree','Neither','Somewhat agree','Strongly agree']},{id:'E1_TEXT',prompt:'Synthetic fixture: What would you add?',type:'text'}],stamp='2026-09-15T16:00:00Z';
const people=Array.from({length:4},(_,i)=>({id:'local-person-'+i,createdAt:stamp,isTest:i===3,questionnaireInstrument:'fixture-v1',responses:i===2?[]:[{wave:'pre',instrumentVersion:'fixture-v1',questions:q,startedAt:stamp,completedAt:stamp,answers:{E1_TEST:i===1?{missing:'prefer_not'}:0,E1_TEXT:'Synthetic exact text\n<script>shown as text</script>'}},...(i===0?[{wave:'post',instrumentVersion:'fixture-v1',questions:q,startedAt:stamp,completedAt:stamp,answers:{E1_TEST:70,E1_TEXT:'Synthetic after response'}}]:[])]}));
const contacts=people.map((p,i)=>({id:p.id,isTest:p.isTest,email:i===1?null:`fixture${i}@example.test`,permission:i!==1,contactChoiceSaved:true,delivery:i===0?'sent':'not_sent',sentAt:i===0?stamp:undefined,contactRetained:true,firstSaved:p.responses[0]?.completedAt??null,secondSaved:p.responses[1]?.completedAt??null,firstInstrumentVersion:'fixture-v1',secondInstrumentVersion:null,afterKey:'synthetic-private-key',events:[],deliveryNote:'Synthetic',afterOpen:true}));
const s1=http.createServer((req,res)=>{const cookie=req.headers.cookie?.split('=')[1]??'', [time,sig]=cookie.split('.');if(sig!==createHmac('sha256',secret).update(time??'').digest('hex')){res.writeHead(401);res.end('{}');return;}res.setHeader('Content-Type','application/json');const format=new URL(req.url,'http://localhost').searchParams.get('format');res.end(JSON.stringify(format==='research'?{people}:contacts));}).listen(3198,'127.0.0.1');
const env={...process.env,NODE_ENV:'production',ADMIN_PASSWORD:'local-preview-only',ADMIN_COOKIE_SECRET:randomBytes(32).toString('hex'),STUDY_TWO_SERVICE_KEY:secret,STUDY_TWO_API_URL:'http://127.0.0.1:3197',STUDY_ONE_ADMIN_URL:'http://127.0.0.1:3198',STUDY_ONE_ADMIN_COOKIE_SECRET:secret};
const children=[spawn('node',['services/study-two-store/server.mjs'],{env:{...env,PORT:'3197',STUDY_TWO_STORE_DIR:dir},stdio:'inherit'}),spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3196'],{env,stdio:'inherit'})];
function stop(){for(const c of children)c.kill();s1.close();}
process.on('SIGTERM',()=>{stop();process.exit();});process.on('SIGINT',()=>{stop();process.exit();});
console.log('Synthetic preview http://127.0.0.1:3196 · password local-preview-only · participant link /study-two/speaker/before#access='+ '2'.repeat(64));
