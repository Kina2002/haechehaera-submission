const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const source=read('fan-reactions.js'),ctx=vm.createContext({});
vm.runInContext(source.slice(0,source.indexOf('const SAD_FAN_ASSET')),ctx);
const groups=JSON.parse(vm.runInContext('JSON.stringify(SAD_FAN_GROUPS)',ctx));
const pose=(speaker,group)=>ctx.fanReactionPose(speaker,group);
const dialogues=JSON.parse(read('game.js').match(/const DIALOGUES=(\[.*?\]);/s)[1]);
const flow=vm.runInNewContext('('+read('extensions.js').match(/const FLOW_LINES23=(\{.*?\});/s)[1]+')');
for(const [key,lines] of Object.entries(flow))dialogues.push(['f23-'+key,'','', '', [['우리 관객',lines[2]]]]);

test('every disappointed portrait is backed by a real own-fan line',()=>{
 assert.equal(Object.keys(groups).length,38);
 for(const id of Object.keys(groups)){const group=dialogues.find(g=>g[0]===id);assert.ok(group,id);assert.ok(group[4].some(([speaker,line])=>speaker==='우리 관객'&&line.length),id);assert.equal(pose('우리 관객',id),'sad');}
});
test('positive outcomes, sacrifice scores, neutral draws and unknown saved groups keep normal fans',()=>{
 for(const id of ['g01','g02','g03','g10','g11','g12','g13','g15','g17','g20','g25','g26','g28','g29','f23-lead','f23-tie','f23-chase','f23-scoreOut','f23-advance','f23-awayStrand','f23-awayMixed','old-save',null])assert.equal(pose('우리 관객',id),'idle',String(id));
});
test('opposing fans and other speakers never borrow our disappointed image',()=>{
 for(const id of Object.keys(groups)){assert.equal(pose('상대 관객',id),'tease');assert.equal(pose('우리 치어리더',id),'idle');assert.equal(pose('중계진',id),'idle');}
 assert.equal(pose('우리 치어리더','g29'),'celebrate');assert.equal(pose('상대 치어리더','g03'),'tease');
});
test('mood selection does not rewrite saved reactions or consume game randomness',()=>{
 const reaction=Object.freeze({speaker:'우리 관객',group:'g27',line:'아 진짜… 한 판 더 하면 이긴다!',index:3});
 const before=JSON.stringify(reaction);ctx.Math=Object.freeze({random(){throw Error('randomness used');}});
 for(let i=0;i<10;i++)assert.equal(pose(reaction.speaker,reaction.group),'sad');assert.equal(JSON.stringify(reaction),before);
});
test('event identity comes from the stored actor including after renaming or transfer',()=>{
 const club=read('club-events.js'),start=club.indexOf('function clubEventActorLabel('),end=club.indexOf('function clubEventActorPortrait(',start);
 vm.runInContext(club.slice(start,end),ctx);
 const event=Object.freeze({actor:Object.freeze({name:'당시 선수',number:0}),player:'과거 안내 이름'});
 assert.equal(ctx.clubEventActorLabel(event),'#0 당시 선수');
 assert.equal(ctx.clubEventActorLabel({actor:{name:'이적 선수',number:17},player:'다른 이름'}),'#17 이적 선수');
});
