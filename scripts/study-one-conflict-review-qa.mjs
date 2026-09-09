// Run using playwright-cli run-code on the target origin. Preview requests are blocked.
export default async function conflictReviewQA(page) {
 const origin=await page.evaluate(()=>location.origin),reports=[];let participantRequests=0;
 const expected=[
  'My view on an important issue contains weaknesses I have not yet recognized.',
  'I see little value in revisiting the opposing case.',
  'When someone strongly disagrees with me, I want to understand how their view makes sense to them.',
  'I am willing to spend time considering the strongest argument against a view I hold.',
  'When I reject someone’s conclusion, I can still understand the concern or value behind it.',
  'I can disagree strongly with a person’s view without rejecting the person.',
  'Important conflicts often involve several issues, not just a choice between two sides.',
  'Choices in important conflicts can have several connected consequences.',
  'A useful conflict can expand one’s perception of a problem, even when nobody changes sides.',
 ];
 await page.unroute('**/study-one/api/brufest/festival');
 await page.route('**/study-one/api/brufest/festival',r=>{participantRequests++;return r.fulfill({status:500,json:{error:'Participant requests blocked during preview QA'}});});
 for(const width of [1366,390,320]){
  await page.setViewportSize({width,height:width===1366?768:844});
  await page.goto(origin+'/study-one/api/health');
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.includes('preview-only'))localStorage.removeItem(k);});
  await page.goto(origin+'/study-one?preview=1');await page.locator('.bf-question').waitFor();
  for(let i=0;i<19;i++){
   const q=page.locator('.bf-question');await q.evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
   const before=await q.getAttribute('id');
   if(i<9){
    if((await q.locator('legend>span:last-child').textContent()).trim()!==expected[i])throw new Error('Unexpected wording at '+(i+1));
    const slider=q.getByRole('slider');if(await slider.getAttribute('aria-valuemax')!=='100')throw new Error('Changed core scale');
    await slider.press('End');await slider.press('ArrowLeft');if(await slider.getAttribute('aria-valuenow')!=='99')throw new Error('Keyboard scale changed');
    await page.screenshot({path:`output/playwright/conflict-review-${origin.includes('localhost')?'local':'live'}-${width}-q${i+1}.png`,fullPage:true});
   }else await page.getByRole('button',{name:'Prefer not to answer',exact:true}).click();
   if(i===13){if(!(await q.innerText()).toLowerCase().includes('your close friends and family'))throw new Error('Connection shift incorrect');await page.getByText('Drag either circle',{exact:true}).waitFor();}
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow '+width+' '+i);
   await page.locator('.bf-nav .primary').click();
   if(i<18)await page.waitForFunction(id=>document.querySelector('.bf-question')?.id!==id,before);
  }
  await page.getByRole('heading',{name:'Preview complete',exact:true}).waitFor();reports.push({width,questions:19,wording:true,completed:true});
 }
 if(participantRequests)throw new Error('Preview attempted participant requests');
 // Current introduction is inspected without enrolment or participant data.
 await page.goto(origin+'/study-one/api/health');await page.evaluate(()=>localStorage.removeItem('study-one-first-link-v2'));
 await page.goto(origin+'/study-one');await page.getByRole('checkbox').waitFor();const intro=await page.locator('main').innerText();
 if(!intro.includes('Beau Lotto leads the study.')||!intro.includes('beau@labofmisfits.com')||!intro.includes('does not establish that the festival caused a change.'))throw new Error('Current study information missing');
 if(!(await page.locator('.s1-information').first().innerText()).includes('Beau Lotto leads the study.'))throw new Error('Study lead missing from study-about section');
 if(intro.includes('Richard Clarke leads the study.'))throw new Error('Old lead in current information');
 return {reports,participantRequests,currentStudyLead:'Beau Lotto',currentContact:'beau@labofmisfits.com'};
}
