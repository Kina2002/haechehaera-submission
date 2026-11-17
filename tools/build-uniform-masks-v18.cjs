const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),game=path.join(root,'구현/해체해라-2026-10-07-v01'),source=path.resolve(root,'../character-design-worktree/시안/경기장용-파츠전면제작-2026-11-17-v01'),t=require(path.join(source,'도구.cjs')),pack=path.join(source,'파츠묶음-v01'),rows=JSON.parse(fs.readFileSync(path.join(pack,'poses.json'))).cases,masks={};
for(const row of rows)for(const layer of ['몸','앞팔']){
const file='PNG/'+layer+'/'+row.body+'/'+String(row.pose).padStart(2,'0')+'.png',a=t.readPNG(path.join(pack,file)),skin=t.readPNG(path.join(pack,'재질/피부/'+layer+'/'+row.body+'/'+String(row.pose).padStart(2,'0')+'.png'));
const out=[];for(const c of t.components(a,(r,g,b,al)=>al&&Math.min(r,g,b)>100&&Math.max(r,g,b)-Math.min(r,g,b)<25)){
const [x,y,w,h]=c.bounds;if(y>row.neck[1]+11)continue;
if(c.count>9&&!(c.count<=18&&h<=3&&w>=h*1.5&&y<=row.neck[1]+9))continue;
if([27,28].includes(row.pose)&&x+w<=29)continue;
const nearSkin=c.pixels.some(p=>{let xx=p%64,yy=p>>6;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){let nx=xx+dx,ny=yy+dy;if(nx>=0&&nx<64&&ny>=0&&ny<64&&skin.data[(ny*64+nx)*4+3])return true;}return false;});
if(nearSkin||y<=row.neck[1]+4)out.push(...c.pixels);
}const bodyMask=layer==='앞팔'?new Set(masks[file.replace('/앞팔/','/몸/')]||[]):null;const accepted=bodyMask?out.filter(p=>bodyMask.has(p)):out;if(accepted.length)masks[file]=accepted;
}
const js='/* F02: crown/shirt/socks primary; brim/collar/cuffs secondary; pants remain white. */\nwindow.UNIFORM_COLORS_V18='+JSON.stringify({trimPixels:masks,portraitHem:[425,356,390,390,389,390]})+';\n';
fs.writeFileSync(path.join(game,'src/uniform-colors-v18.js'),js);console.log({bodyLayers:rows.length*2,trimLayers:Object.keys(masks).length,trimPixels:Object.values(masks).reduce((n,v)=>n+v.length,0),bytes:js.length});
