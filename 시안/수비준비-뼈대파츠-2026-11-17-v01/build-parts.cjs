/* Deterministic export of image-generated art; original PNGs are retained. */
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../../../character-design-worktree/시안/경기장용-파츠전면제작-2026-11-17-v01');
const t=require(path.join(source,'도구.cjs')),H=require(path.join(source,'머리조립-v01.cjs'));
const bodies=['normal','compact','tall','broad','slender','heavy'],views=['F','FR','FL'];
const sizes={normal:[23,22],compact:[21,18],tall:[21,25],broad:[27,23],slender:[20,23],heavy:[28,22]};
const palette={skin:JSON.parse(fs.readFileSync(path.join(source,'파츠묶음-v01/palettes.json'))).skin,shirt:[[6,46,40],[10,72,60],[18,99,79],[27,119,95]],trim:[[142,147,142],[205,207,198],[246,245,231]],pants:[[111,117,115],[165,171,168],[211,214,207],[244,245,237]],shoes:[[27,26,28],[45,43,45],[65,61,62]],glove:[[64,32,15],[107,57,25],[153,88,39],[198,128,65]]};
const copy=a=>({...a,data:Buffer.from(a.data)}),empty=()=>t.canvas(64,64),nearest=(rgb,pal)=>H.c.nearest(rgb,pal),save=(f,a)=>t.writePNG(path.join(__dirname,f),a);
function classify(rgb,y,neck){const[r,g,b]=rgb,hi=Math.max(...rgb),lo=Math.min(...rgb);
 if(r>g*1.12&&g>b*1.1){if(y<=neck+2||(r>=115&&r>=g*1.16&&b>=g*.6))return 1+nearest(rgb,palette.skin[0]);return 90+nearest(rgb,palette.glove);}
 if(g>r*1.09&&g>b*.94)return 50+nearest(rgb,palette.shirt);
 if(hi-lo<35&&hi>95)return 70+nearest(rgb,palette.pants);
 return 80+nearest(rgb,palette.shoes);
}
function rgbFor(id,o={}){const hex=s=>s.replace('#','').match(/../g).map(x=>parseInt(x,16)),shade=(c,f)=>c.map(v=>Math.round(Math.min(255,v*f)));
 if(id<=5)return palette.skin[o.skin||0][id-1];
 if(id>=50&&id<=53)return o.primary?shade(hex(o.primary),[.4,.65,.9,1.06][id-50]):palette.shirt[id-50];
 if(id>=60&&id<=62)return o.secondary?shade(hex(o.secondary),[.6,.84,1][id-60]):palette.trim[id-60];
 if(id>=70&&id<=73)return palette.pants[id-70];if(id>=80&&id<=82)return palette.shoes[id-80];
 if(id>=90&&id<=93)return o.glove==='black'?[[26,25,24],[47,43,39],[73,66,57],[110,99,85]][id-90]:palette.glove[id-90];
 throw Error('Unknown material '+id);
}
function paint(mask,o={}){const out=empty();for(let p=0;p<mask.data.length;p+=4)if(mask.data[p+3])out.data.set([...rgbFor(mask.data[p],o),255],p);return out;}
const rows=[];
for(const [file,types]of [['보통형-생성원본-v01.png',['normal']],['5체형-생성원본-v01.png',bodies.slice(1)]]){
 const image=t.readPNG(path.join(__dirname,file)),cs=t.components(image,(r,g,b,a)=>a>=245,800).sort((a,b)=>a.bounds[1]-b.bounds[1]);if(cs.length!==types.length*3)throw Error('Unexpected body count '+cs.length);
 types.forEach((body,row)=>{const line=cs.slice(row*3,row*3+3).sort((a,b)=>a.bounds[0]-b.bounds[0]);line.forEach((c,index)=>{
  const view=views[index],[w,h]=sizes[body],neck=57-h,core=t.canvas(image.width,image.height);for(const p of c.pixels)image.data.copy(core.data,p*4,p*4,p*4+4);
  const small=t.scale(t.crop(core,c.bounds),w,h,true),top=[];for(let y=0;y<2;y++)for(let x=0;x<w;x++)if(small.data[(y*w+x)*4+3]>=245)top.push(x);const neckX=Math.round(top.reduce((s,x)=>s+x,0)/top.length),ox=32-neckX,material=empty();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;if(small.data[p+3]<245)continue;const id=classify([...small.data.subarray(p,p+3)],y+neck,neck);material.data.set([id,id,id,255],((y+neck)*64+x+ox)*4);}
  // Brown skin shadows are not glove pieces. Keep the contiguous mitt region,
  // and recover its light leather pixels before exporting independent layers.
  const leather=t.components(material,(r,g,b,a)=>a&&r>=90).sort((a,b)=>b.count-a.count)[0];if(!leather)throw Error('Missing glove '+body+view);
  const[gx,gy,gw,gh]=leather.bounds;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const p=(y*64+x)*4,id=material.data[p];if(!material.data[p+3]||!(id<=5||id>=90))continue;const inside=x>=gx&&x<gx+gw&&y>=gy&&y<gy+gh;
   if(id>=90&&!inside){const skinId=1+nearest(palette.glove[id-90],palette.skin[0]);material.data.set([skinId,skinId,skinId,255],p);}
   else if(id<=5&&inside){const gloveId=90+nearest(palette.skin[0][id-1],palette.glove);material.data.set([gloveId,gloveId,gloveId,255],p);}
  }
  for(const part of t.components(material,(r,g,b,a)=>a&&r>=70&&r<=73)){const[x,y,pw,ph]=part.bounds;if(part.count<=10&&y+ph<=neck+Math.round(h*.48))for(const p of part.pixels){const old=material.data[p*4],id=60+Math.min(2,Math.max(0,old-71));material.data.set([id,id,id,255],p*4);}}
  const bm=copy(material),gm=empty(),am=empty(),skin=empty(),primary=empty(),secondary=empty();
  for(let p=0;p<material.data.length;p+=4){if(!material.data[p+3])continue;const id=material.data[p],y=Math.floor(p/4/64);if(id>=90){material.data.copy(gm.data,p,p,p+4);bm.data.fill(0,p,p+4);}else if(id<=5){material.data.copy(skin.data,p,p,p+4);if(y>=neck+4)material.data.copy(am.data,p,p,p+4);}else if(id>=50&&id<=53)material.data.copy(primary.data,p,p,p+4);else if(id>=60&&id<=62)material.data.copy(secondary.data,p,p,p+4);}
  const name=body+'/'+view;for(const[k,m]of Object.entries({body:bm,forearm:am,glove:gm,skin,primary,secondary,complete:material})){save('materials/'+k+'/'+name+'.png',m);if(['body','forearm','glove','complete'].includes(k))save('PNG/'+k+'/'+name+'.png',paint(m));}
  rows.push({id:body+'-defensive-ready-'+view,body,view,width:64,height:64,neck:[32,neck],headAnchor:[16,24],headPosition:[16,neck-24],foot:[32,56],source:file,sourceRect:c.bounds,gloveHand:'anatomical-left',mirrored:false,bodyFile:'PNG/body/'+name+'.png',foregroundFile:'PNG/forearm/'+name+'.png',gloveFile:'PNG/glove/'+name+'.png',materialPrefix:'materials/',review:'candidate; visual review required'});
 });});
}
fs.writeFileSync(path.join(__dirname,'poses.json'),JSON.stringify({version:1,rows},null,2));fs.writeFileSync(path.join(__dirname,'palettes.json'),JSON.stringify(palette,null,2));
console.log({poses:rows.length,source,opaqueExport:true});
module.exports={t,H,source,rows,palette,paint,rgbFor};
