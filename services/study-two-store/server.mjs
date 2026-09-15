import http from 'node:http';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {createStore,StudyError} from './store.mjs';
const directory=process.env.STUDY_TWO_STORE_DIR;
if(!directory)throw new Error('STUDY_TWO_STORE_DIR is required; refusing ephemeral storage.');
if(process.env.RAILWAY_ENVIRONMENT_ID&&process.env.RAILWAY_VOLUME_MOUNT_PATH!==directory)throw new Error('Study Two must use its mounted persistent volume.');
const serviceKey=process.env.STUDY_TWO_SERVICE_KEY;
if(!serviceKey||serviceKey.length<64)throw new Error('A private service key is required.');
const store=await createStore(directory),instanceId=randomUUID();
const retentionTimer=setInterval(()=>{void store.runRetention().catch(e=>console.error('Study Two retention failed:',e.code??e.name));},6*60*60*1000);retentionTimer.unref();
const authenticated=raw=>typeof raw==='string'&&Buffer.byteLength(raw)===Buffer.byteLength(serviceKey)&&timingSafeEqual(Buffer.from(raw),Buffer.from(serviceKey));
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 try{
  if(req.url==='/health'&&req.method==='GET'){res.end(JSON.stringify({...await store.health(),instanceId}));return;}
  if(req.url!=='/actions'||req.method!=='POST'){res.writeHead(404);res.end('{}');return;}
  if(!authenticated(req.headers['x-study-two-service-key']))throw new StudyError('Not authorised.',401);
  let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>65536)throw new StudyError('Request too large.',413);parts.push(chunk);}
  let body;try{body=JSON.parse(Buffer.concat(parts).toString());}catch{throw new StudyError('Invalid JSON.');}
  const result=await store.action(body,req.headers['x-study-two-admin']==='true');res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e instanceof StudyError?e.status:503;res.end(JSON.stringify({error:e instanceof StudyError?e.message:'Answers could not be saved. Please try again.'}));if(!(e instanceof StudyError))console.error('Study Two storage operation failed:',e.code??e.name);}
});
server.listen(Number(process.env.PORT??3000),'::',()=>console.log('Study Two persistence service ready',instanceId));
process.on('SIGTERM',()=>{clearInterval(retentionTimer);server.close(()=>process.exit(0));});
