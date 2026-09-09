// Run through playwright-cli run-code. Every participant request is intercepted.
export default async function interactionQA(page) {
 const origin=await page.evaluate(()=>location.origin),reports=[];let requests=0;
 await page.unroute('**/study-one/api/brufest/festival');
 await page.route('**/study-one/api/brufest/festival',route=>{requests++;return route.fulfill({status:500,json:{error:'QA prevents participant requests'}});});
 for(const width of [1366,390,320]){
  await page.setViewportSize({width,height:width===1366?768:844});
  await page.goto(origin+'/study-one?preview=1');
  await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.includes('preview-only'))localStorage.removeItem(key);});await page.reload();
  await page.getByRole('button',{name:'Connection questions',exact:true}).click();
  const stage=page.locator('.s1-circle-stage');await stage.waitFor();
  await page.locator('.bf-question').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  if(await page.locator('.s1-circle-choices [aria-pressed=true]').count())throw new Error('Initial circle response selected');
  await stage.focus();await stage.click();if(await page.locator('.s1-circle-choices [aria-pressed=true]').count())throw new Error('Focus/click selected a response');
  await stage.press('ArrowRight');if(await stage.getAttribute('aria-valuenow')!=='2')throw new Error('Keyboard circle movement');
  await page.getByRole('button',{name:'4 — Some connection',exact:true}).click();
  await stage.evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
  const centered=await stage.locator('svg').evaluate(e=>{const circles=e.querySelectorAll('circle');return Math.abs((Number(getComputedStyle(circles[0]).cx.replace('px',''))+Number(getComputedStyle(circles[1]).cx.replace('px','')))/2-260)<1;});
  if(!centered)throw new Error('Circles lost centering');
  await page.screenshot({path:`output/playwright/perspectives-${origin.includes('localhost')?'local':'live'}-${width}-circles.png`,fullPage:true});
  if(width===390){
   const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await page.getByRole('button',{name:'1 — Not at all connected',exact:true}).click();await stage.evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
   const b=await stage.boundingBox(),y=b.y+b.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.66,y}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*(.66-.16*i/8),y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   if(Number(await stage.getAttribute('aria-valuenow'))<6)throw new Error('Native touch drag failed');
   const selected=await stage.getAttribute('aria-valuenow');await page.reload();await stage.waitFor();if(await stage.getAttribute('aria-valuenow')!==selected)throw new Error('Touch value lost on reload');
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  }
  await page.getByRole('button',{name:'Cannot assess',exact:true}).click();if(await page.locator('.s1-circle-choices [aria-pressed=true]').count())throw new Error('Opt-out left selection');
  await page.reload();await stage.waitFor();if(await page.getByRole('button',{name:'Cannot assess',exact:true}).getAttribute('aria-pressed')!=='true')throw new Error('Missing response lost');
  await page.emulateMedia({reducedMotion:'reduce'});await stage.press('End');
  const duration=await page.locator('.s1-other-ring').evaluate(e=>getComputedStyle(e).transitionDuration);if(duration!=='0s')throw new Error('Reduced motion not respected');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.bf-nav .primary').click();if(!(await page.locator('.s1-circle-referents').innerText()).includes('People all over the world'))throw new Error('Second target missing');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow');
  reports.push({width,passed:true});
 }
 // The preview can complete either wave and never contacts the participant API.
 for(const wave of ['Before Big Brue','After Big Brue']){
  await page.getByRole('button',{name:wave,exact:true}).click();
  let count=0;
  while(await page.locator('.bf-question').count()){
   if(++count>100)throw new Error('Preview did not finish');
   await page.getByRole('button',{name:'Prefer not to answer',exact:true}).click();await page.locator('.bf-nav .primary').click();
  }
  await page.getByRole('heading',{name:'Preview complete',exact:true}).waitFor();reports.push({preview:wave,questions:count});
 }
 if(requests!==0)throw new Error('Preview attempted an API request');
 // Historical baseline versions retain original forms in the new client.
 for(const [version,wave,expected] of [['brufest-study-one-continuous-v1-2026-09-08','pre',15],['brufest-study-one-v0.2-2026-09-07','post',null]]){
  await page.unroute('**/study-one/api/brufest/festival');
  await page.route('**/study-one/api/brufest/festival',route=>route.fulfill({json:{id:'synthetic-old',mode:'study',step:wave,message:'',contactChoiceSaved:true,permission:true,email:null,completed:wave==='post'?['pre']:[],responseInstrument:version}}));
  const key='e'.repeat(64);await page.goto(origin+`/study-one#${wave==='pre'?'first':'after'}=${key}`);await page.locator('.bf-question').waitFor();
  if(version.includes('continuous')){if(!(await page.locator('.rating-focus-header').innerText()).includes(`of ${expected}`))throw new Error('Old draft questionnaire grew');const slider=page.getByRole('slider');await slider.press('End');await slider.press('ArrowLeft');await page.reload();await slider.waitFor();if(await slider.getAttribute('aria-valuenow')!=='99')throw new Error('Old draft was lost');}
  else if(!await page.locator('.bf-likert').count())throw new Error('Seven-point follow-up changed scale');
  reports.push({historical:version,passed:true});
 }
 return {reports,previewParticipantRequests:requests};
}
