"""Run against the synthetic local preview only."""
import urllib.request,urllib.error,http.cookiejar,json
base='http://127.0.0.1:3196'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar),NoRedirect)
def req(path,body=None,headers=None):
 data=None if body is None else json.dumps(body).encode()
 r=urllib.request.Request(base+path,data=data,headers={**({'Content-Type':'application/json'} if data else {}),**(headers or {})})
 try:
  with client.open(r) as response:return response.status,response.headers,response.read().decode()
 except urllib.error.HTTPError as e:return e.code,e.headers,e.read().decode()
private=['/results','/results/study-one','/administration','/administration/study-one','/study-two/results','/study-two/review','/study-guides/study-one','/study-guides/study-two','/admin','/admin/conflictbench']
for path in private:
 for headers in [{},{'RSC':'1'}]:
  code,h,text=req(path,headers=headers)
  if headers:assert code==200 and 'NEXT_REDIRECT;replace;/organiser/sign-in' in text,(path,code)
  else:assert code==307 and '/organiser/sign-in' in h['Location'],(path,code)
  assert 'Who does what?' not in text
for path,body in [('/study-two/api/admin',{'action':'export'}),('/study-two/api/admin',{'action':'reset'}),('/api/organiser/study-one?format=research',None),('/api/organiser/study-one?format=overview',None),('/api/organiser/study-one',{'action':'delete_person'})]:assert req(path,body)[0]==401,path
assert req('/api/admin/login',{'password':'wrong'})[0]==401
assert req('/api/admin/login',{'password':'local-preview-only'},headers={'Origin':'https://wrong.example'})[0]==403
assert req('/api/admin/login',{'password':'local-preview-only'})[0]==200
for c in jar:c.secure=False # local HTTP test client only
for path in private:
 code,h,text=req(path);assert code==200,(path,code);assert 'no-store' in h.get('Cache-Control',''),(path,h)
assert req('/api/organiser/study-one?format=research')[0]==200
code,h,text=req('/api/organiser/study-one?format=overview');assert code==200;assert 'afterKey' not in text and 'events' not in text
assert req('/study-two/api/admin',{'action':'export'})[0]==200
assert req('/study-two/api',{'action':'reset'})[0]==400
assert req('/api/admin/logout',{})[0]==303
assert req('/study-two/api/admin',{'action':'export'})[0]==401
assert req('/api/organiser/study-one?format=research')[0]==401
for path in private:assert req(path)[0]==307,path
code,h,text=req('/');assert code==200;assert '/study-guides/' not in text and '/study-two/review' not in text and 'How to run this study' not in text
for path in ['/study-two/speaker/before','/study-two/speaker/after','/study-two/audience/before']:assert req(path)[0]==200
print('PASS: 10 protected pages + RSC, both API boundaries, same-origin login, guide no-store, overview strips private keys, logout denial, public discovery and participant access.')
