"""Configure isolated Study Two persistence. Never print or persist service credentials."""
import json,secrets,subprocess,sys
cli='/opt/homebrew/bin/railway'
env='3a592d70-3e89-4cdf-bcdd-aaa96013e26a'
app='8925101a-c889-4369-a839-d517e94b907f'
store='dce4c0de-0602-4888-aaa8-3d0500c69f92'
r=subprocess.run([cli,'environment','config','--json'],capture_output=True,text=True,check=True)
c=json.loads(r.stdout)
existing=c.get('services',{}).get(app,{}).get('variables',{})
print(json.dumps({'hub_admin_password_configured':bool(existing.get('ADMIN_PASSWORD',{}).get('value')),'hub_admin_cookie_secret_configured':bool(existing.get('ADMIN_COOKIE_SECRET',{}).get('value'))}))
if '--apply' not in sys.argv:sys.exit()
key=existing.get('STUDY_TWO_SERVICE_KEY',{}).get('value') or secrets.token_hex(32)
patch={'services':{
 store:{'source':{'repo':'richardcharlesclarke/looking-back-experiment','branch':'looking-back','rootDirectory':'/services/study-two-store'},'build':{'builder':'DOCKERFILE','dockerfilePath':'Dockerfile','watchPatterns':['/services/study-two-store/**']},'deploy':{'startCommand':'node server.mjs','healthcheckPath':'/health','healthcheckTimeout':60,'multiRegionConfig':{'europe-west4-drams3a':{'numReplicas':1}}},'variables':{'STUDY_TWO_STORE_DIR':{'value':'/study-two-data'},'STUDY_TWO_SERVICE_KEY':{'value':key},'PORT':{'value':'3000'},'NODE_ENV':{'value':'production'}}},
 app:{'variables':{'STUDY_TWO_API_URL':{'value':'http://study-two-store.railway.internal:3000'},'STUDY_TWO_SERVICE_KEY':{'value':key}}}
}}
r=subprocess.run([cli,'environment','edit','-e',env,'-m','Configure isolated Study Two durable store and private hub connection','--json'],input=json.dumps(patch),capture_output=True,text=True)
print(json.dumps({'configured':r.returncode==0,'exit_code':r.returncode,'store_service_id':store}))
if r.returncode:sys.exit(r.returncode)
