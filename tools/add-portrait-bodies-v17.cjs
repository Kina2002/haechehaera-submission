const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.resolve(__dirname,'..'),game=path.join(root,'구현/해체해라-2026-10-07-v01'),old=path.resolve(root,'../character-design-worktree'),dir=path.join(old,'시안'),t=require(path.join(dir,'경기장용-파츠전면제작-2026-11-17-v01/도구.cjs')),FC=require(path.join(dir,'선수창-1번얼굴-색변경-2026-11-17-v01/face-color-v01.js'));
const source=t.readPNG(path.join(dir,'선수창-전신6체형-2026-11-17-v01/선수창-전신6체형-생성원본-v01.png'));
const specs=[{id:2,cx:161,chin:200},{id:5,cx:455,chin:191},{id:4,cx:737,chin:189},{id:3,cx:1034,chin:189},{id:1,cx:1316,chin:146},{id:0,cx:1612,chin:235}];
const atlas=t.canvas(1920,2700),scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(game,'src/character-assets-v17.js'),'utf8'),scope);const D=scope.window.CHARACTER_ASSETS_V17;
if(D.portraitBodies)throw Error('Already added body atlas');
D.portraitBodies={};const ai=D.atlases.length;
for(let i=0;i<6;i++){const s=specs[i],base=t.canvas(320,900),mask=t.canvas(320,900);
for(let y=s.chin-4;y<830;y++)for(let x=0;x<320;x++){const sx=s.cx+x-160;if(sx<Math.floor(i*1774/6)||sx>=Math.floor((i+1)*1774/6))continue;const p=(y*source.width+sx)*4,q=(y*320+x)*4,[r,g,b,a]=source.data.subarray(p,p+4);if(a<128)continue;base.data.set([r,g,b,255],q);if(r>g*1.13&&g>b*1.13){base.data.set([Math.min(255,r+50),Math.min(255,g+48),Math.min(255,b+49),255],q);mask.data.set([255,0,0,255],q);}else mask.data.set([0,0,0,255],q);}
for(let skin=0;skin<3;skin++){const result=FC.recolor(base,mask,skin,0),im={...result,data:Buffer.from(result.data)};t.blit(atlas,im,i*320,skin*900);D.rects['portrait/body/'+s.id+'/'+skin]={atlas:ai,rect:[i*320,skin*900,320,900],offset:[0,0],frame:[320,900]};}
D.portraitBodies[s.id]={head:[93,Math.round(s.chin-290*.42),134,161],foot:[160,829]};
}
const out=path.join(root,'시안/경기장-사이트적용-2026-11-17-v01/선수창-몸파츠-색상3종-v01.png');t.writePNG(out,atlas);const bytes=fs.readFileSync(out),hash=crypto.createHash('sha256').update(bytes).digest('hex'),uri='assets/'+hash.slice(0,20)+'.png';fs.copyFileSync(out,path.join(game,uri));D.atlases.push({uri,width:1920,height:2700});
const manifest=JSON.parse(fs.readFileSync(path.join(game,'assets/manifest.json')));manifest[uri]={sha256:hash,bytes:bytes.length,mime:'image/png',source:'portrait-body-concept-20261117'};
fs.writeFileSync(path.join(game,'assets/manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(game,'src/character-assets-v17.js'),'window.CHARACTER_ASSETS_V17='+JSON.stringify(D)+';\n');console.log({bodyParts:18,uri,bytes:bytes.length});
