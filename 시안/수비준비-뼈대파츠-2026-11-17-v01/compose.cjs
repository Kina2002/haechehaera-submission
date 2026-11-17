const fs=require('node:fs'),path=require('node:path'),E=require('./build-parts.cjs');
const {t,H,source,rows,paint}=E,cache=new Map(),heads=new Map();
const read=f=>{if(!cache.has(f))cache.set(f,t.readPNG(f));return cache.get(f);};
function poly(x,y,p){let on=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])on=!on;}return on;}
function gear(view,o){const raw=read(path.join(source,'파츠-v01/materials/headwear/cap/'+view+'.png')),out=t.canvas(33,36),hex=s=>s.replace('#','').match(/../g).map(v=>parseInt(v,16)),pri=hex(o.primary||'#126451'),sec=hex(o.secondary||'#f2e5bd');
 const brim=view==='F'?[[10,11],[12,10],[21,10],[23,11],[25,14],[21,13],[19,12],[13,12],[9,14]]:[[15,11],[18,10],[24,10],[28,12],[29,14],[21,13],[16,14],[13,13]];
 for(let p=0;p<raw.data.length;p+=4)if(raw.data[p+3]){const x=(p/4)%33,y=Math.floor(p/4/33),color=poly(view==='FL'?32-x:x,y,brim)?sec:pri,f=[1.18,1,.75,.46][raw.data[p]-40];out.data.set([...color.map(v=>Math.min(255,Math.round(v*f))),255],p);}return out;
}
function compose(body='normal',view='F',o={}){
 const row=rows.find(r=>r.body===body&&r.view===view);if(!row)throw Error('Unknown pose');const state=o.state||'CAP',key=JSON.stringify([view,state,o]),neck=row.neck;
 if(!heads.has(key))heads.set(key,H.head(view,state,o.hairId||1,o));const h=heads.get(key),bm=read(path.join(__dirname,'materials/body',body,view+'.png')),bodyImage=paint(bm,o),arms=paint(read(path.join(__dirname,'materials/forearm',body,view+'.png')),o),glove=paint(read(path.join(__dirname,'materials/glove',body,view+'.png')),o),accessory=t.canvas(33,36),chain=t.canvas(64,64),all=t.canvas(64,64);
 for(const id of [o.glasses,o.earring,o.black])if(id&&id!=='none')t.blit(accessory,read(path.join(source,'액세서리/방향추출-v02/개별',view,id+'.png')));
 if(o.necklace&&o.necklace!=='none'){t.blit(chain,read(path.join(source,'액세서리/목걸이방향-v02/개별',view,o.necklace+'.png')),neck[0]-16,neck[1]-24);for(let p=0;p<chain.data.length;p+=4)if(!bm.data[p+3]||bm.data[p]<50||bm.data[p]>53)chain.data.fill(0,p,p+4);}
 const hp=row.headPosition,cap=state==='CAP'?gear(view,o):t.canvas(33,36);
 for(const [a,x,y]of [[h.back,...hp],[bodyImage,0,0],[chain,0,0],[h.face,...hp],[accessory,...hp],[h.front,...hp],[cap,...hp],[h.over,...hp],[arms,0,0],[glove,0,0]])t.blit(all,a,x,y);
 return{all,body:bodyImage,forearm:arms,glove,head:h,cap,accessory,row};
}
module.exports={...E,compose,read};
