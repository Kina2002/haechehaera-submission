const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
const functions=source.slice(source.indexOf('const historyScroll21='),source.indexOf('const matchBefore21='));
function fixture(){
 const ctx=vm.createContext({});
 vm.runInContext(`let anim=null;const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const eventCaption=e=>e.text||e.type;`,ctx);
 vm.runInContext(source.slice(source.indexOf('function eventStage21('),source.indexOf('const popupBefore21='))+functions,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}
const run=fixture(),tone=e=>run('historyTone21('+JSON.stringify(e)+')');

test('hits, walks, loose balls, steals and pitch counts use our side rather than inning or home field',()=>{
 for(const type of ['ball','single','double','triple','hr','bb','hbp','sb','error','wp','pb'])for(const half of [0,1]){
  assert.equal(tone({type,attack:0,half}),'positive',type);
  assert.equal(tone({type,attack:1,half}),'negative',type);
 }
 for(const type of ['strike','swing','ks','kl','ground','fly','line','dp','flydp','cs']){
  assert.equal(tone({type,attack:0}),'negative',type);
  assert.equal(tone({type,attack:1}),'positive',type);
 }
 for(const attack of [0,1])assert.equal(tone({type:'foul',attack}),'neutral');
});

test('combined hits or runs with outs are neutral for both teams, including sacrifice flies',()=>{
 for(const attack of [0,1])for(const type of ['single','double','sf','ground']){
  const score=[0,0];score[attack]=1;
  assert.equal(tone({attack,type,outsAdded:1,before:{score:[0,0]},after:{score},runs:['runner']}),'neutral');
 }
 assert.equal(tone({attack:0,type:'single',moves:[{id:'runner',from:2,to:3,out:true}]}),'neutral');
 assert.equal(tone({attack:1,type:'fly',moves:[{id:'r',from:1,to:2,out:false}],after:{bases:[null,'r',null]}}),'neutral');
});

test('actual score and bonehead side determine the color when the outcome type alone is insufficient',()=>{
 assert.equal(tone({attack:1,type:'other',before:{score:[0,0]},after:{score:[0,1]}}),'negative');
 assert.equal(tone({attack:0,type:'other',runs:['r']}),'positive');
 assert.equal(tone({attack:1,type:'foul',bh:8,bhSide:0}),'negative');
 assert.equal(tone({attack:0,type:'foul',bh:8,bhSide:1}),'positive');
 assert.equal(tone({attack:0,type:'single',bh:1,bhSide:0}),'neutral');
 assert.equal(tone({attack:0,type:'other',before:{score:[1,1]},after:{score:[2,2]}}),'neutral');
 assert.equal(tone(null),'neutral');assert.equal(tone({type:'single'}),'neutral');
});

test('rendering retains recorded top/bottom on the third out, escapes text and hides unshown or duplicate results',()=>{
 const e={id:'third-out',type:'ground',attack:1,inning:2,half:1,outsAdded:1,text:'땅볼 아웃 <script>',batterName:'선수&'};
 const html=run('historyHTML21({events:['+JSON.stringify(e)+','+JSON.stringify(e)+']})');
 assert.match(html,/data-tone="positive"/);assert.match(html,/<time>2회 말<\/time>/);
 assert.match(html,/선수&amp;/);assert.match(html,/&lt;script&gt;/);
 assert.equal((html.match(/data-event="third-out"/g)||[]).length,1);
 assert.equal(run('(anim={e:'+JSON.stringify(e)+',resultShown:false},visibleHistory21({events:['+JSON.stringify(e)+']}).length)'),0);
 const before=JSON.stringify(e);tone(e);assert.equal(JSON.stringify(e),before);
});

test('actual resolved plays can be rendered repeatedly without altering match RNG or saved results',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{}});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(source.slice(source.indexOf('function historyTone21('),source.indexOf('function historyHTML21(')),ctx);
 const result=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
  const t=newTeam('우리',11,5),o=newTeam('상대',8,4);data.slots=[t,null];data.current=0;
  for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
  const m={id:'colors',opp:o,home:0,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],order:[0,0],last:[null,null],hits:[0,0],errors:[0,0],innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261008,done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
  t.match=m;prepare(m);let pitches=0;const tones=new Set();
  while(!m.done&&pitches++<800){const e=resolvePitch(m),before=JSON.stringify(m);for(let i=0;i<3;i++)tones.add(historyTone21(e));if(JSON.stringify(m)!==before)throw Error('color changed match');}
  return {done:m.done,violations:m.checks.violations,tones:[...tones],pitches};
 })())`,ctx));
 assert.equal(result.done,true);assert.deepEqual(result.violations,[]);
 assert.ok(result.tones.includes('positive'));assert.ok(result.tones.includes('negative'));assert.ok(result.tones.includes('neutral'));
});
