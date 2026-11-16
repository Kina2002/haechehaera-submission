/* Reusable cloth + separate text. Selection is frozen in the match snapshot. */
(function(root){'use strict';
const texts=[['오늘도 직관 성공','하고 싶은 야구 다 해','이기면 치킨, 지면 치맥','해체는 다음 생에'],['이번 시즌 지켜본다','응원은 공짜가 아니다','팬도 사람이다','연패 그만, 진심으로','해체? 아직은 아니다'],['해체해라','감독 나와','입장료 환불해 줘','이게 야구냐','야, 나와봐! 내가 할게','해체 서명 받습니다'],['해체해라!!','오늘이 마지막 직관','유니폼 팝니다','구단주님 보고 계세요?','해체 카운트다운','그래도 왔다']];
const catalog=texts.flatMap((lines,stage)=>lines.map((text,i)=>({id:'banner-'+stage+'-'+String(i+1).padStart(3,'0'),text,stage,cloth:text.length>9?'wide':'short',enabled:true})));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function wrap(text,measure,width){
 text=String(text).trim();if(!text)return null;if(measure(text)<=width)return[text];
 const words=text.split(/\s+/);let best=null;
 for(let i=1;i<words.length;i++){const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')],max=Math.max(...pair.map(measure));if(max<=width&&(!best||max<best.max))best={pair,max};}
 return best?.pair||null;
}
function select({matchId,stage,home=true,awayCrowd=0},list=catalog){
 if(!home&&awayCrowd<=0)return[];
 const count=home?[2,2,4,6][stage]:Math.min(3,[2,2,4,6][stage]),seen=new Set();
 const pool=list.filter(x=>x.enabled&&x.stage===stage&&x.text&&!seen.has(x.text)&&seen.add(x.text)).slice().sort((a,b)=>hash(matchId+a.id)-hash(matchId+b.id));
 const slots=home?[2,5,0,3,1,4]:[5,3,4];return pool.slice(0,count).map((x,i)=>({id:x.id,text:x.text,cloth:x.cloth,slot:slots[i]}));
}
function ensure(t,m){
 if(m.opinionBanners?.version===1&&Array.isArray(m.opinionBanners.items)&&m.opinionBanners.items.length<=6&&m.opinionBanners.items.every(x=>typeof x.text==='string'&&Number.isInteger(x.slot)&&x.slot>=0&&x.slot<6))return m.opinionBanners;
 const stage=typeof opinionStage==='function'?opinionStage(t.opinion?.value??30):1,home=m.home===0;
 const awayCrowd=home?0:typeof facilitySettlement==='function'?facilitySettlement(t,m,attendance(t)).awayCrowd:0;
 return m.opinionBanners={version:1,stage,home,awayCrowd,items:select({matchId:m.id,stage,home,awayCrowd})};
}
// Fixed stadium rail slots: the architecture is common to both cameras.
const slots=[[12,146,150,29],[22,178,140,29],[6,211,163,27],[738,146,150,29],[738,178,140,29],[731,211,163,27]];
function paint(c,t,m){
 const snapshot=ensure(t,m);c.save();c.font='bold 11px "Malgun Gothic",sans-serif';c.textAlign='center';c.textBaseline='middle';
 for(const item of snapshot.items){const [sx,y,sw,h]=slots[item.slot]||slots[0];let w=item.cloth==='short'?Math.min(132,sw):sw,lines=wrap(item.text,s=>c.measureText(s).width,w-12);if(!lines&&w<sw){w=sw;lines=wrap(item.text,s=>c.measureText(s).width,w-12);}if(!lines)continue;const x=sx+(sw-w)/2;
  c.fillStyle='#0c2c3b66';c.fillRect(x+3,y+3,w,h);c.fillStyle=snapshot.stage>=2?'#f6e2bb':'#e9efdc';c.fillRect(x,y,w,h-2);c.fillRect(x+3,y+h-2,w-6,2);
  c.fillStyle='#ad9e7d';c.fillRect(x,y+2,3,h-4);c.fillRect(x+w-3,y+2,3,h-4);c.fillStyle='#8a3030';c.fillRect(x+6,y+2,w-12,1);c.fillRect(x+6,y+h-4,w-12,1);
  c.fillStyle='#274648';for(const dx of [5,w-6])c.fillRect(x+dx,y-3,2,6);
  c.fillStyle=snapshot.stage>=2?'#8a2827':'#24493f';lines.forEach((line,i)=>c.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*12));
 }
 c.restore();
}
const api={catalog,wrap,select,ensure,paint,slots};root.StadiumBannersV13=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof startMatch==='function'){const before=startMatch;startMatch=function(){const result=before.apply(this,arguments),t=team();if(t?.match&&!t.match.done){ensure(t,t.match);save();}return result;};}
if(typeof reward==='function'){const before=reward;reward=function(m){const t=team(),snapshot=JSON.parse(JSON.stringify(ensure(t,m))),result=before.apply(this,arguments),record=t.history.find(r=>r.id===m.id);if(record)record.opinionBanners=snapshot;return result;};}
})(typeof window!=='undefined'?window:globalThis);
