const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const report={events:[],pageErrors:[]};
 try{
  const context=await browser.newContext({viewport:{width:1365,height:1000}});
  const page=await context.newPage();
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto((process.env.GAME_TEST_URL||'http://127.0.0.1:18727/tests.html')+'?qa=1',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof ClubEvents!=='undefined'&&charsReady&&ART.ready);
  report.regression=await page.evaluate(()=>({rules:ruleChecks(),contracts:checks26()}));
  assert.ok(report.regression.rules.every(x=>x.ok));
  assert.equal(report.regression.contracts.passed,report.regression.contracts.total);
  const eventCount=await page.evaluate(()=>CLUB_EVENT_TYPES.length);
  for(let index=0;index<eventCount;index++){
   const initial=await page.evaluate(index=>{
    const {t,m}=fixture23();activeGame=true;t.name='해체 드림즈';t.balance.fanEventChance=0;t.funds=1000000;
    m.done=true;m.score=[1,3];reward(m);
    const p=t.players[index===5?9:0];p.fans=50;p.loyalty=60;
    const event=applyClubEvent(t,m,p,index);screen='result';render();
    return {kind:event.kind,event:clone(event),team:JSON.stringify(t),open:!!clubEventView};
   },index);
   assert.equal(initial.open,true);
   assert.ok(await page.locator('.club-event-dialog').isVisible());
   const frames=await page.evaluate(()=>{
    cancelAnimationFrame(clubEventView.raf);
    const times=clubEventDefinition(clubEventView.event).shots?[0,3000,5900,10000]:[0,2900,6600];
    return times.map(ms=>{
     clubEventView.elapsed=ms;paintClubEventView(clubEventView);
     return clubEventView.el.querySelector('canvas').toDataURL();
    });
   });
   assert.equal(new Set(frames).size,frames.length,'Each animation must visibly progress through all phases');
   assert.ok(await page.locator('.club-event-changes').first().isVisible());
   const canvasBounds=await page.locator('.club-event-dialog canvas').boundingBox();
   assert.ok(canvasBounds.width>300&&canvasBounds.height>100);
   await page.locator('.club-event-dialog').screenshot({path:join(__dirname,'club-event-'+initial.kind+'.png')});
   await page.locator('[data-club-event-close]').click();
   const after=await page.evaluate(()=>({pending:!!pendingClubEvent(team()),seen:team().match.clubEvent.seen,event:clone(team().match.clubEvent),fans:team().players.map(p=>[p.fans,p.loyalty])}));
   assert.equal(after.pending,false);assert.equal(after.seen,true);
   assert.deepEqual(after.event.after,initial.event.after);
   await page.evaluate(()=>{screen='news';render();});
   await page.locator('[data-club-event-open]').first().click();
   await page.locator('[data-club-event-skip]').click();
   await page.locator('[data-club-event-close]').click();
   assert.deepEqual(await page.evaluate(()=>team().players.map(p=>[p.fans,p.loyalty])),after.fans);
   await page.evaluate(()=>render());
   assert.equal(await page.locator('.club-event-dialog').count(),0,'Acknowledged events must not auto-open again');
   report.events.push({kind:initial.kind,autoOpen:true,distinctFrames:frames.length,seenPersisted:true,replayDoesNotReapply:true});
  }
  // Restored unread data must notify once after returning to the club.
  report.restore=await page.evaluate(()=>{
   const event=team().news.find(x=>x.clubEvent).clubEvent;event.seen=false;team().match.clubEvent.seen=false;
   data=JSON.parse(JSON.stringify(data));screen='home';render();
   return !!clubEventView&&clubEventView.event.id===event.id;
  });
  assert.equal(report.restore,true);
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.club-event-dialog .club-event-changes').isVisible());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.club-event-dialog').count(),0);
  // Preview and reduced-motion mode must never change saved players.
  const before=await page.evaluate(()=>JSON.stringify(team()));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>ClubEvents.preview('autograph'));
  assert.equal(await page.evaluate(()=>clubEventView.elapsed),10000);
  await page.setViewportSize({width:390,height:844});
  const responsive=await page.evaluate(()=>{
   const el=clubEventView.el,r=el.getBoundingClientRect();
   return {width:r.width,height:r.height,window:innerWidth,overflow:el.scrollWidth>el.clientWidth+1};
  });
  assert.ok(responsive.width<=390&&responsive.height<=844&&!responsive.overflow);
  await page.locator('.club-event-dialog').screenshot({path:join(__dirname,'club-event-mobile.png')});
  await page.locator('[data-club-event-close]').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(team())),before);
  report.reducedMotion=true;report.previewDoesNotMutate=true;report.responsive=responsive;
  report.runtimeErrors=await page.evaluate(()=>runtimeErrors.slice());
  assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.pageErrors,[]);
  writeFileSync(join(__dirname,'club-events-browser-checks.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({events:report.events.length,rules:report.regression.rules.length,contracts:report.regression.contracts.total,restoredUnread:report.restore,reducedMotion:true,previewDoesNotMutate:true,responsive,errors:report.pageErrors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
