/* Image-generated poses -> indexed, integer-grid layers. Original art is retained. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),io=require('./lib/png-io.cjs');
const root=path.resolve(__dirname,'../..'),previous=JSON.parse(fs.readFileSync(path.join(__dirname,'../수비준비-뼈대파츠-2026-11-17-v01/palettes.json'),'utf8'));
const palette={...previous,armor:[[24,30,35],[43,52,59],[78,91,98],[125,141,145]]},views=['F','FR','R','BR','B','BL','L','FL'];
const sizes={normal:[23,22],compact:[21,18],tall:[21,25],broad:[27,23],slender:[20,23],heavy:[28,22]};
const specs=[['포구-생성원본-v01.png',['ground','receive','secure']],['송구-생성원본-v01.png',['load','release','follow']],['이동-생성원본-v01.png',['run0','run1']],['포수-생성원본-v01.png',['crouch','crouchReceive']]];
const nearest=(rgb,pal)=>pal.map(c=>c.reduce((s,v,i)=>s+(v-rgb[i])**2,0)).reduce((best,v,i,a)=>v<a[best]?i:best,0);
function components(im,predicate){const seen=new Uint8Array(im.width*im.height),out=[];for(let s=0;s<seen.length;s++){if(seen[s]||!predicate(im.data[s*4],im.data[s*4+1],im.data[s*4+2],im.data[s*4+3],s))continue;const q=[s];seen[s]=1;for(let i=0;i<q.length;i++){const p=q[i],x=p%im.width,y=Math.floor(p/im.width);for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,k=yy*im.width+xx;if(xx<0||yy<0||xx>=im.width||yy>=im.height||seen[k]||!predicate(im.data[k*4],im.data[k*4+1],im.data[k*4+2],im.data[k*4+3],k))continue;seen[k]=1;q.push(k);}}out.push(q);}return out.sort((a,b)=>b.length-a.length);}
function bounds(im){let l=im.width,t=im.height,r=-1,b=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]>=230){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}if(r<0)throw Error('Empty cell');return[l,t,r-l+1,b-t+1];}
function isSkin(r,g,b){return r>g*1.13&&g>b*1.05&&b>=g*.54&&r>95;}
function material(rgb,x,y,neck,crouch){const[r,g,b]=rgb,hi=Math.max(...rgb),lo=Math.min(...rgb);
 if(g>r*1.65&&g>b*1.04)return 50+nearest(rgb,palette.shirt);
 if(r>g*1.13&&g>b*1.05){if(isSkin(r,g,b)||(Math.abs(x-32)<3&&y<=neck+2))return 1+nearest(rgb,palette.skin[0]);return 90+nearest(rgb,palette.glove);}
 if(hi-lo<48&&hi>(crouch?150:70))return 70+nearest(rgb,palette.pants);
 if(crouch&&y<54)return 100+nearest(rgb,palette.armor);
 return 80+nearest(rgb,palette.shoes);
}
const sparse=im=>{const out=[];for(let p=0;p<4096;p++)if(im.data[p*4+3])out.push(p,im.data[p*4]);return out;};
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
function centroid(im,lo,hi,fallback){let xs=[],ys=[];for(let p=0;p<4096;p++)if(im.data[p*4+3]&&im.data[p*4]>=lo&&im.data[p*4]<=hi){xs.push(p%64);ys.push(Math.floor(p/64));}return xs.length?[Math.round(xs.reduce((a,b)=>a+b)/xs.length),Math.round(ys.reduce((a,b)=>a+b)/ys.length)]:fallback;}
function color(id){return id<6?palette.skin[0][id-1]:id<60?palette.shirt[id-50]:id<70?palette.trim[id-60]:id<80?palette.pants[id-70]:id<90?palette.shoes[id-80]:id<100?palette.glove[id-90]:palette.armor[id-100];}
const rows={},sources=[],meta=[],corrected={};
for(const file of ['송구-손방향보정-v02.png','이동-교차발보정-v02.png']){corrected[file]=io.readPNG(path.join(__dirname,file));sources.push({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')});}
for(const[file,phases]of specs){const source=path.join(__dirname,file);const sheet=io.readPNG(source);sources.push({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
 for(let row=0;row<phases.length;row++)for(let col=0;col<8;col++){
  const sourceFile=file.startsWith('송구')&&col===7?'송구-손방향보정-v02.png':file.startsWith('이동')&&row===1?'이동-교차발보정-v02.png':file,selected=corrected[sourceFile]||sheet,cw=Math.floor(selected.width/8),ch=Math.floor(selected.height/phases.length);
  const phase=phases[row],view=views[col],crouch=phase.startsWith('crouch'),cell=io.crop(selected,[col*cw,row*ch,cw,ch]),bb=bounds(cell),center=bb[0]+bb[2]/2,neckPixels=[];
  for(let y=bb[1];y<bb[1]+bb[3]*.32;y++)for(let x=Math.round(center-bb[2]*.19);x<center+bb[2]*.19;x++){const p=(y*cw+x)*4;if(cell.data[p+3]>=230&&isSkin(...cell.data.subarray(p,p+3)))neckPixels.push([x,y]);}
  if(!neckPixels.length)throw Error('No neck '+phase+'/'+view);const ny=Math.min(...neckPixels.map(v=>v[1])),nx=median(neckPixels.filter(v=>v[1]<ny+Math.max(3,bb[3]*.03)).map(v=>v[0])),bottom=bb[1]+bb[3]-1;
  for(const[body,[w,h]]of Object.entries(sizes)){
   const height=crouch?Math.round(h*.8):h,neck=57-height,sy=(height-1)/(bottom-ny),sx=crouch?({F:24,FR:23,R:18,BR:23,B:24,BL:23,L:18,FL:23}[view]*(w/23)/bb[2]):sy*(w/23)/(h/22),im=io.canvas(64,64);
   for(let y=0;y<64;y++)for(let x=0;x<64;x++){const ox=Math.round(nx+(x-32)/sx),oy=Math.round(ny+(y-neck)/sy);if(ox<0||oy<0||ox>=cw||oy>=ch)continue;const p=(oy*cw+ox)*4;if(cell.data[p+3]<230)continue;const id=material([...cell.data.subarray(p,p+3)],x,y,neck,crouch);im.data.set([id,id,id,255],(y*64+x)*4);}
   // Cuffs/collar are isolated light clusters above the hip, not the connected trousers.
   for(const comp of components(im,(r,g,b,a)=>a&&r>=70&&r<80)){const ys=comp.map(p=>Math.floor(p/64));if(comp.length<=12&&Math.max(...ys)<neck+Math.max(7,height*.48))for(const p of comp){const id=60+Math.min(2,Math.max(0,im.data[p*4]-71));im.data.set([id,id,id,255],p*4);}}
   // Keep dark skin shading connected to the neck/arms out of the leather layer.
   const gloveParts=components(im,(r,g,b,a)=>a&&r>=90&&r<100),gloveMain=crouch&&view==='B'?undefined:gloveParts.find(c=>c.some(p=>Math.floor(p/64)>neck+3));
   for(const comp of gloveParts){if(comp===gloveMain)continue;for(const p of comp){const old=im.data[p*4],id=1+nearest(palette.glove[old-90],palette.skin[0]);im.data.set([id,id,id,255],p*4);}}
   const bodyLayer=io.canvas(64,64),arm=io.canvas(64,64),glove=io.canvas(64,64),complete=io.canvas(64,64);
   for(let p=0;p<4096;p++){const at=p*4,id=im.data[at];if(!im.data[at+3])continue;const target=id>=90&&id<100?glove:bodyLayer;im.data.copy(target.data,at,at,at+4);if(id<=5&&Math.floor(p/64)>=neck+3)im.data.copy(arm.data,at,at,at+4);complete.data.set([...color(id),255],at);}
   const glovePoint=centroid(glove,90,93,[32,neck+Math.round(height*.4)]),skinPoints=[];
   for(let p=0;p<4096;p++)if(im.data[p*4+3]&&im.data[p*4]<=5&&Math.floor(p/64)>=neck+2)skinPoints.push([p%64,Math.floor(p/64)]);
   const right=['FR','R','BR','B'].includes(view),extreme=skinPoints.length?(right?Math.max(...skinPoints.map(p=>p[0])):Math.min(...skinPoints.map(p=>p[0]))):32,hand=skinPoints.filter(p=>Math.abs(p[0]-extreme)<=1),handPoint=hand.length?[extreme,median(hand.map(p=>p[1]))]:[32,neck+6];
   const key=body+'/'+phase+'/'+view,r={body,phase,view,neck:[32,neck],headPosition:[16,neck-24],foot:[32,56],glovePoint,handPoint,gloveHand:'anatomical-left',bodyLayer:sparse(bodyLayer),forearm:sparse(arm),glove:sparse(glove)};rows[key]=r;
   for(const[name,layer]of Object.entries({body:bodyLayer,forearm:arm,glove}))io.writePNG(path.join(__dirname,'materials',body,phase,view+'-'+name+'.png'),layer);
   if(body==='normal')io.writePNG(path.join(__dirname,'normal-preview',phase+'-'+view+'.png'),complete);
   meta.push({key,source:sourceFile,cell:[col*cw,row*ch,cw,ch],crop:bb,sourceNeck:[nx,ny],neck:r.neck,foot:r.foot,glovePoint,handPoint,mirrored:false});
  }
 }
}
const data={version:22,views,bodyIds:Object.keys(sizes),palettes:palette,rows};
fs.writeFileSync(path.join(root,'구현/해체해라-2026-10-07-v01/src/defense-actions-v22.js'),'/* Generated from original sprite sheets by export-actions.cjs. */\nwindow.DEFENSE_ACTIONS_V22='+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(__dirname,'poses.json'),JSON.stringify({version:22,sources,poses:meta},null,2));
console.log({sources:sources.length,poses:meta.length,bytes:JSON.stringify(data).length});
