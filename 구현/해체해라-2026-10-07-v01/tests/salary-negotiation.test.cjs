const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
function fixture(){
 const context=vm.createContext({Math});
 vm.runInContext(`
 const clone=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const POS=['P','C','1B','2B','3B','SS','LF','CF','RF'];let selection='p0';
 const t={players:Array.from({length:12},(_,i)=>({id:'p'+i,name:'선수'+i,number:i,loyalty:100,salary:100,contract:0,lowOffers:2,stats:{games:2},wage26:{ask:100,baseline:{games:0},clubGames:0,expired:true}})),departed:[],lineup:POS.map((pos,i)=>({id:'p'+i,pos})),w:3,l:1,d:1,news:[],debt:0,match:null};
 const team=()=>t,live=t=>!!t.match&&!t.match.done,balance=()=>({contractGames:5,salaryBonusChance:.3,salaryBonusLoyalty:1});
 const salaryAsk=p=>p.wage26.ask,wageState26=p=>p.wage26,money=n=>n+'만원';
 const news=(t,title,text)=>t.news.unshift({title,text}),wageEffect26=p=>p.salary*100<=salaryAsk(p)*90?'low':'normal';
 const renewAsk26=()=>{},r=()=>.5;
 `,context);
 vm.runInContext(source.slice(source.indexOf('function settleContract26('),source.indexOf('function validVacancy26(')),context);
 vm.runInContext(source.slice(source.indexOf('negotiate=function(p,amount,random='),source.indexOf('\nconst commitBefore26=')),context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}
test('79% and exact 80% accept with one penalty draw; 81% accepts without drawing',()=>{
 for(const amount of [1,79,80,81,100,10000]){
  const result=fixture()(`(()=>{const p=t.players[0];let draws=0;negotiate(p,${amount},()=>{draws++;return 0;});return [p.salary,p.contract,p.loyalty,draws,p.wage26.expired,p.lowOffers,p.wage26.baseline.games,p.wage26.clubGames];})()`);
  assert.deepEqual(result,[amount,5,amount<=80?70:100,amount<=80?1:0,false,0,2,5]);
 }
});
test('90% probability uses a strict boundary and has no automatic retry for the remaining 10%',()=>{
 for(const [draw,loyalty]of [[0,70],[.899999,70],[.9,100],[.9999,100]])assert.deepEqual(fixture()(`(()=>{const p=t.players[0];let calls=0;negotiate(p,80,()=>{calls++;return ${draw};});return [p.loyalty,calls,p.salary];})()`),[loyalty,1,80]);
 let reduced=0;for(let i=0;i<100;i++)if(fixture()(`(()=>{const p=t.players[0];negotiate(p,80,()=>${i}/100);return p.loyalty;})()`)<100)reduced++;
 assert.equal(reduced,90);
});
test('each new negotiation can deduct once; JSON restore and game settlement do not repeat the 30',()=>{
 assert.deepEqual(fixture()("(()=>{let p=t.players[0],calls=0;negotiate(p,80,()=>{calls++;return 0;});const saved=clone(t);Object.assign(t,saved);p=t.players[0];settleContract26(t,p,{},0);const afterGame=p.loyalty;negotiate(p,80,()=>{calls++;return 0;});return [afterGame,p.loyalty,calls,t.news.length];})()"),[67,37,2,2]);
});
test('invalid salary and departed player leave contract and affection untouched without a draw',()=>{
 for(const amount of [0,-1,10001,1.1,'x'])assert.deepEqual(fixture()(`(()=>{const p=t.players[0],before=JSON.stringify(p);let calls=0;negotiate(p,${JSON.stringify(amount)},()=>{calls++;return 0;});return [before===JSON.stringify(p),calls,t.news.length];})()`),[true,0,0]);
 assert.deepEqual(fixture()("(()=>{const p=t.players.shift(),before=JSON.stringify(p);let calls=0;negotiate(p,80,()=>{calls++;return 0;});return [before===JSON.stringify(p),calls];})()"),[true,0]);
});
test('penalty clamps at zero and preserves immediate departure, contract and roster repair',()=>{
 assert.deepEqual(fixture()("(()=>{const p=t.players[0];p.loyalty=15;const message=negotiate(p,80,()=>0);return [p.loyalty,p.salary,p.contract,t.players.length,t.departed[0].id,t.lineup[0].id,message.includes('애정도 0')];})()"),[0,80,5,11,'p0','p9',true]);
});
