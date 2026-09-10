"""Run the production UI and private store for local persistence QA, without logging keys."""
import os,pathlib,secrets,signal,subprocess,time
root=pathlib.Path(__file__).resolve().parents[1]
shared=secrets.token_hex(32)
store_env={**os.environ,'PORT':'3143','STUDY_TWO_STORE_DIR':'/tmp/study-two-local-persistence','STUDY_TWO_SERVICE_KEY':shared}
app_env={**os.environ,'STUDY_TWO_API_URL':'http://127.0.0.1:3143','STUDY_TWO_SERVICE_KEY':shared}
children=[]
def stop(*args):
 for p in children:
  if p.poll() is None:p.terminate()
 for p in children:
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill()
 raise SystemExit()
signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
children.append(subprocess.Popen(['node','server.mjs'],cwd=root/'services/study-two-store',env=store_env))
children.append(subprocess.Popen(['npm','run','start','--','--hostname','127.0.0.1','--port','3142'],cwd=root,env=app_env))
try:
 while all(p.poll() is None for p in children):time.sleep(1)
finally:stop()
