// Run with playwright-cli run-code after opening the target (strip export default).
// Intercepts every participant API request: never writes production research data.
export default async function studyOneQA(page) {
  const origin=await page.evaluate(()=>location.origin), width=page.viewportSize().width;
  const before=!(await page.locator('.s1-participant').count());
  const prefix=`${origin.includes('localhost')?'local':'live'}-${before?'before':'after'}-${width}`;
  const reports=[], submissions=[];
  let step='pre', failure=false, invalidLink=false;
  const view=()=>({id:'synthetic-qa',mode:'study',step,message:step==='complete'?'Both questionnaires are saved and matched. Thank you for taking part.':step==='waiting'?'The questionnaire after the festival opens on 21 September 2026.':step==='stopped'?'Follow-up contact has stopped. Your email address has been removed from the contact list. Previously submitted research answers have not been deleted.':'',contactChoiceSaved:!['pre','contact'].includes(step),permission:['waiting','post','complete'].includes(step),email:['waiting','post','complete'].includes(step)?'qa@example.invalid':null,completed:step==='pre'?[]:step==='complete'?['pre','post']:['pre']});
  await page.unroute('**/study-one/api/brufest/festival');
  await page.route('**/study-one/api/brufest/festival',async route=>{
    const b=route.request().postDataJSON();
    if(invalidLink)return route.fulfill({status:400,json:{error:'This personal link is not recognised. Use the link in your follow-up email or ask the research assistant to resend it.'}});
    if(failure){failure=false;return route.fulfill({status:503,json:{error:'Your answers could not be saved. Please try again.'}});}
    if(b.action==='submit'){submissions.push(b);step=b.wave==='pre'?'contact':'complete';}
    if(b.action==='contact'){
      if(b.permission&&!/^\S+@\S+\.\S+$/.test(b.email))return route.fulfill({status:400,json:{error:'Enter a valid email address.'}});
      step=b.permission?'waiting':'stopped';
    }
    if(b.action==='delete')step='deleted';
    return route.fulfill({json:view()});
  });
  async function shot(name){
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow&&!before)throw new Error(`Overflow ${name} ${width}`);
    await page.screenshot({path:`output/playwright/${prefix}-${name}.png`,fullPage:true});reports.push({name,overflow});
  }
  await page.evaluate(()=>localStorage.clear());await page.goto(`${origin}/study-one?qa=${Date.now()}`);
  await page.getByRole('checkbox').waitFor();await shot('entry');
  await page.getByRole('checkbox').focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await page.locator('.bf-question').first().waitFor();
  for(const wave of ['pre','post']){
    if(wave==='post'){step='post';await page.goto(`${origin}/study-one?qa=${Date.now()}#after=${'d'.repeat(64)}`);await page.getByRole('heading',{name:before?'Questionnaire after the festival':'After Big Brue',exact:true}).waitFor();}
    let sections=0;
    while(await page.locator('.s1-form').count()){
      if(++sections>30)throw new Error('Navigation did not terminate');
      const nav=page.locator('.bf-nav .primary');
      if(sections===1){await nav.click({force:before});await page.locator('.s1-form [role=alert]').waitFor();if(!before&&!(await page.locator('.s1-form [role=alert]').evaluate(e=>e===document.activeElement)))throw new Error('Validation focus');await shot(`${wave}-validation`);}
      for(const q of await page.locator('.bf-question').all()){
        const id=await q.getAttribute('id');
        if(await q.locator('.bf-likert').count())await q.getByRole('button',{name:'4',exact:true}).click({force:before});
        else if(await q.getByRole('slider').count()){const s=q.getByRole('slider');await s.focus();await s.press('Home');await s.press('ArrowRight');if(await s.getAttribute('aria-valuenow')!=='0.1')throw new Error('Continuous value');await s.press('End');await s.press('ArrowLeft');}
        else if(await q.locator('textarea').count())await q.locator('textarea').fill('Synthetic QA response.');
        else if(id==='question-E1_POST_KEYNOTE')await q.locator('.bf-options button').filter({hasText:/^\+?All$/}).click({force:before});
        else await q.locator('.bf-options button').first().click({force:before});
      }
      if(sections===1)await page.locator('.bf-question').first().getByRole('button',{name:'Cannot assess',exact:true}).click({force:before});
      await shot(`${wave}-section-${sections}`);
      if(sections===2){await page.locator('.bf-nav .secondary').click({force:before});if(await page.locator('.bf-question').first().getByRole('button',{name:'Cannot assess',exact:true}).getAttribute('aria-pressed')!=='true')throw new Error('Back lost response');await page.locator('.bf-nav .primary').click({force:before});}
      const save=(await nav.innerText()).includes('Save');
      if(save){failure=true;await nav.click({force:before});await page.locator('.s1-form [role=alert]').waitFor();await shot(`${wave}-save-error`);}
      const previous=await page.locator('.s1-form .eyebrow').innerText();await nav.click({force:before});if(!save)await page.waitForFunction(p=>document.querySelector('.s1-form .eyebrow')?.textContent!==p,previous);if(save)await page.locator('.s1-form').waitFor({state:'detached'});
    }
    if(wave==='pre'){
      await shot('contact');await page.getByRole('textbox',{name:'Email address'}).fill('invalid');await page.getByRole('checkbox').check();await page.locator('.s1-actions .primary').click({force:before});await page.locator('[role=alert]').filter({hasText:'valid email'}).waitFor();await shot('email-error');
      await page.getByRole('textbox',{name:'Email address'}).fill('qa@example.invalid');await page.locator('.s1-actions .primary').click({force:before});await page.locator('details').first().waitFor();await shot('waiting-first');
      await page.locator('summary').first().click({force:before});await shot('edit-followup');await page.getByRole('button',{name:/without email follow-up/}).click({force:before});await shot('stopped');
      step='waiting';await page.goto(`${origin}/study-one?qa=${Date.now()}#after=${'a'.repeat(64)}`);await page.getByRole('button',{name:/Check/}).waitFor();await shot('waiting-after');
    }else await shot('complete');
  }
  await page.locator('summary').filter({hasText:'Remove my study data'}).click({force:before});await page.evaluate(()=>{window.confirm=()=>true;});await page.getByRole('button',{name:'Remove my study data',exact:true}).click({force:before});await page.getByRole('heading',{name:/removed/}).waitFor();await shot('deleted');
  invalidLink=true;await page.goto(`${origin}/study-one?qa=${Date.now()}#after=${'b'.repeat(64)}`);await page.getByRole('heading',{name:'Personal link could not be opened'}).waitFor();await shot('invalid-link');
  if(submissions.length!==2||submissions[1].answers.E1_POST_KEYNOTE_IMPACT!==9.9||submissions.some(s=>s.answers.E1_HUM_01?.missing!=='cannot_assess'))throw new Error('Submission semantics changed');
  return {prefix,reports,submissions:submissions.map(s=>({wave:s.wave,itemCount:Object.keys(s.answers).length})),checks:['all pages','branching','keyboard','validation','back retains responses','save retry','contact choice','email validation','waiting','completion','deletion','invalid link','exact continuous value','no overflow']};
}
