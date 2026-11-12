const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
function fixture(){
 const context=vm.createContext({Math});
 vm.runInContext(`
 const clone=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const POS=['P','C','1B','2B','3B','SS','LF','CF','RF'],BAT_POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];let selection='p0';
 const t={players:Array.from({length:12},(_,i)=>({id:'p'+i,name:'선수'+i,number:i,a:{contact:50,power:50,eye:50,speed:50,sense:50},loyalty:100,salary:100,contract:0,lowOffers:2,stats:{games:2},wage26:{ask:100,baseline:{games:0},clubGames:0,expired:true,lastChange:null}})),departed:[],lineup:POS.map((pos,i)=>({id:'p'+i,pos})),w:3,l:1,d:1,news:[],debt:0,match:null,league:{phase:'offseason'}};
 const team=()=>t,live=t=>!!t.match&&!t.match.done,balance=()=>({salaryBonusChance:.3,salaryBonusLoyalty:1});
 const contractGamesFor26=()=>10;
 const salaryAsk=p=>p.wage26.ask,wageState26=p=>p.wage26,money=n=>n+'만 원';
 const news=(t,title,text)=>t.news.unshift({title,text}),renewAsk26=()=>{},r=()=>.5;
 const wonValue=n=>n*10000;let dialog=null,lastToast=null;
 const note=(title,html)=>{dialog={title,html};},toast=text=>{lastToast=text;};
 `,context);
 for(const pattern of [/^const WAGE_RULES26=.*$/m,/^function wageEffect26\(.*$/m])vm.runInContext(source.match(pattern)[0],context);
 vm.runInContext(game.match(/^const esc=.*$/m)[0],context);
 vm.runInContext(game.split(/\r?\n/).filter(line=>/^function (dhLineup|legacyLineup|lineupSlots|adoptDH)\(/.test(line)).join('\n'),context);
 vm.runInContext(source.slice(source.indexOf('function settleContract26('),source.indexOf('function validVacancy26(')),context);
 vm.runInContext(source.slice(source.indexOf('negotiate=function(p,amount'),source.indexOf('\nconst commitBefore26=')),context);
 const uiStart=source.indexOf('function openContract26(');
 vm.runInContext(source.slice(uiStart,source.indexOf("document.addEventListener('click',ev=>{",uiStart)),context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}

test('offseason renewal: 70% and below lose 20 once, higher offers do not',()=>{
 for(const amount of [1,69,70,71,79,80,81,100,10000]){
  const r=fixture()(`(()=>{const p=t.players[0];let draws=0;negotiate(p,${amount},()=>{draws++;return 0;});return [p.salary,p.contract,p.loyalty,draws,p.wage26.expired,p.lowOffers,p.wage26.baseline.games,p.wage26.clubGames];})()`);
  assert.deepEqual(r,[amount,10,amount<=70?80:100,0,false,0,2,5]);
 }
});

test('per-game boundary: below 80% loses 3, exact 80% and above do not; unpaid wages remain separate',()=>{
 for(const [ask,salary,delta]of [[100,70,-3],[100,71,-3],[100,79,-3],[100,80,0],[100,90,0],[100,100,0],[105,83,-3],[105,84,0]]){
  const r=fixture()(`(()=>{const p=t.players[0];p.salary=${salary};p.wage26.ask=${ask};p.contract=5;const before=p.loyalty;settleContract26(t,p,{},0);return [p.loyalty-before,p.contract];})()`);
  assert.deepEqual(r,[delta,4]);
 }
 assert.equal(fixture()("(()=>{const p=t.players[0];p.salary=80;p.contract=5;t.debt=1;settleContract26(t,p,{},0);return p.loyalty;})()"),92);
});

test('raising to 80% stops future loss without refunding affection or changing the contract and season baseline',()=>{
 const r=fixture()("(()=>{let p=t.players[0];p.loyalty=60;negotiate(p,70);t.league.phase='season';settleContract26(t,p,{},0);const before=[p.loyalty,p.contract,JSON.stringify(p.wage26)];const text=negotiate(p,80);const after=[p.loyalty,p.contract,JSON.stringify(p.wage26)];Object.assign(t,clone(t));p=t.players[0];settleContract26(t,p,{},0);return {before,after,end:[p.loyalty,p.contract],raised:text.includes('인상'),warnings:wageWarning26(t,p)};})()");
 assert.deepEqual(r.before.slice(0,2),[37,9]);assert.deepEqual(r.after,r.before);
 assert.deepEqual(r.end,[37,8]);assert.ok(r.raised);assert.equal(r.warnings,'');
});

test('season raises reject equal/lower offers and expired contracts without changing the player',()=>{
 for(const amount of [50,70]){
  assert.deepEqual(fixture()(`(()=>{const p=t.players[0];negotiate(p,70);t.league.phase='season';const before=JSON.stringify(p),n=t.news.length;const text=negotiate(p,${amount});return [before===JSON.stringify(p),n===t.news.length,text.includes('높은 금액')];})()`),[true,true,true]);
 }
 assert.equal(fixture()("(()=>{const p=t.players[0];t.league.phase='season';const before=JSON.stringify(p);return negotiate(p,100).includes('시즌이 끝난 뒤')&&before===JSON.stringify(p);})()"),true);
 assert.equal(fixture()("(()=>{const p=t.players[0];negotiate(p,70);const before=JSON.stringify(p);return negotiate(p,69).includes('높은 금액')&&before===JSON.stringify(p);})()"),true,'a signed offseason contract cannot be replaced with another discount');
});

test('the next offseason can renew again; raises do not reset the season performance baseline',()=>{
 const r=fixture()("(()=>{const p=t.players[0];negotiate(p,70);t.league.phase='season';const baseline=JSON.stringify(p.wage26);negotiate(p,80);const held=baseline===JSON.stringify(p.wage26);p.contract=0;p.wage26.expired=true;t.league.phase='offseason';negotiate(p,70);return [held,p.loyalty,p.contract,p.wage26.expired];})()");
 assert.deepEqual(r,[true,60,10,false]);
});

test('one season at low pay: 60 affection ends at 10; 50 can reach zero and leave',()=>{
 for(const [start,end,n]of [[60,10,12],[50,0,11]]){
  assert.deepEqual(fixture()(`(()=>{const p=t.players[0];p.loyalty=${start};negotiate(p,70);t.league.phase='season';for(let i=0;i<10;i++)settleContract26(t,p,{},0);departUnhappy26(t);return [p.loyalty,t.players.length];})()`),[end,n]);
 }
});

test('warning arrives before departure, is not logged every game, and disappears after a sufficient raise',()=>{
 const r=fixture()("(()=>{const p=t.players[0];p.loyalty=23;p.salary=79;p.contract=10;p.wage26.expired=false;t.league.phase='season';settleContract26(t,p,{},0);const first={loyalty:p.loyalty,n:t.news.length,text:wageWarning26(t,p),html:wageWarningsHTML26(t)};settleContract26(t,p,{},0);const second=t.news.length;negotiate(p,80);return {first,second,after:wageWarning26(t,p),html:wageWarningsHTML26(t),loyalty:p.loyalty};})()");
 assert.equal(r.first.loyalty,20);assert.equal(r.first.n,1);assert.ok(r.first.text.includes('떠날 수'));
 assert.ok(r.first.html.includes('data-contract-open="p0"'));assert.equal(r.second,1);
 assert.equal(r.after,'');assert.equal(r.html,'');assert.equal(r.loyalty,17);
 assert.equal(fixture()("(()=>{const p=t.players[0];p.name='<박&>';p.loyalty=15;p.salary=79;p.contract=5;return wageWarningsHTML26(t).includes('&lt;박&amp;&gt;');})()"),true);
});

test('invalid amounts, live games and departed players do not change a contract',()=>{
 for(const amount of [0,-1,10001,1.1,'x'])assert.deepEqual(fixture()(`(()=>{const p=t.players[0],before=JSON.stringify(p);const result=negotiate(p,${JSON.stringify(amount)});return [before===JSON.stringify(p),t.news.length];})()`),[true,0]);
 assert.equal(fixture()("(()=>{const p=t.players[0];t.match={done:false};const before=JSON.stringify(p);return negotiate(p,70).includes('경기가 끝난 뒤')&&before===JSON.stringify(p);})()"),true);
 assert.equal(fixture()("(()=>{const p=t.players.shift(),before=JSON.stringify(p);return negotiate(p,70).includes('떠난 선수')&&before===JSON.stringify(p);})()"),true);
});

test('a severe renewal can still cause immediate departure, retaining records and repairing the roster',()=>{
 assert.deepEqual(fixture()("(()=>{const p=t.players[0];p.loyalty=15;const message=negotiate(p,70);return [p.loyalty,p.salary,p.contract,t.players.length,t.departed[0].id,t.lineup[0].id,message.includes('애정도 0')];})()"),[0,70,10,11,'p0','p9',true]);
});

test('the dialog offers renewal in offseason, raises during a contract, and explains consequences without rule percentages',()=>{
 const r=fixture()("(()=>{const p=t.players[0];openContract26(p);const renewal=dialog;negotiate(p,70);t.league.phase='season';openContract26(p);return {renewal,raise:dialog};})()");
 assert.ok(r.renewal.title.includes('재계약'));assert.ok(r.renewal.html.includes('희망급여보다 너무 낮은'));
 assert.ok(r.raise.title.includes('급여 인상'));assert.ok(r.raise.html.includes('계약 기간과 희망급여는 그대로'));
 assert.ok(r.raise.html.includes('min="710000"'));
 for(const ui of [r.renewal,r.raise])assert.doesNotMatch(ui.html,/70%|80%|90%|애정도 -20|애정도 -3/);
});
