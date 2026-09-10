"""Read Study Two's protected export without exposing credentials or response content."""
import hashlib,hmac,json,subprocess,time,urllib.request
r=subprocess.run(['/opt/homebrew/bin/railway','environment','config','--json'],capture_output=True,text=True,check=True)
c=json.loads(r.stdout);v=c['services']['8925101a-c889-4369-a839-d517e94b907f']['variables'];key=v['ADMIN_COOKIE_SECRET']['value']
t=str(int(time.time()*1000));sig=hmac.new(key.encode(),t.encode(),hashlib.sha256).hexdigest()
request=urllib.request.Request('https://experiments.evolvable.me/study-two/api/admin',data=json.dumps({'action':'export'}).encode(),headers={'Content-Type':'application/json','Cookie':'looking_back_admin='+t+'.'+sig})
with urllib.request.urlopen(request,timeout=20) as response:data=json.load(response)
records=data['records'];proof=json.load(open('/tmp/study-two-live-persistence-proof.json'));ids={r['id'] for r in records}
assert all(r['id'] in ids for r in proof['records'])
assert 'accessHash' not in json.dumps(data)
assert all(r['access'] not in json.dumps(data) for r in proof['records'])
assert all(r.get('isTest') is True for r in records)
print(json.dumps({'protected_export_verified':True,'record_count':len(records),'qa_records_present':len(proof['records']),'private_keys_excluded':True}))
