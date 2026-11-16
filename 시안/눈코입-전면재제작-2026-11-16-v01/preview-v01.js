const $=id=>document.getElementById(id),R=PortraitRendererV13,N=PortraitRemakeV01,F=FieldRendererV13,G=FieldRemakeV01;
const names=['기본 눈매','둥근 눈매','차분한 눈매','부드러운 눈매','올라간 눈매','편안한 눈매'];
const cfg=(i=0)=>({body:2,skin:+$('skin').value||0,hairColor:2,eyeColor:+$('eye').value||0,headwear:['cap','helmet'].includes($('wear').value)?$('wear').value:'none',eyePatch:$('wear').value==='patch',eyePatchSide:'left',parts:{hair:+$('hair').value,eyes:i,brows:i,nose:i,mouth:i,wear:$('wear').value==='glasses'?0:-1,beard:-1,black:-1}});
const context=id=>{const g=$(id).getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#f1eee5';g.fillRect(0,0,g.canvas.width,g.canvas.height);return g;};
function label(g,t,x,y,n=17,color='#243f37'){g.font=n+'px system-ui';g.fillStyle=color;g.fillText(t,x,y);}
function compare(){const g=context('comparison');for(let i=0;i<6;i++){const x=i*240,a=cfg(i);label(g,names[i],x+25,28,20);
 const old=R.render(a).canvas,n=N.render(a).canvas;
 g.drawImage(old,25,2,78,94,x+42,48,156,188);label(g,'이전 파츠',x+75,267,16,'#9b5743');
 g.drawImage(n,25,2,78,94,x+42,305,156,188);label(g,'새 파츠',x+77,526,18,'#26734d');
 const naked={...a,headwear:'none',eyePatch:false,parts:{...a.parts,hair:-1,wear:-1}};
 g.drawImage(N.render(naked).canvas,35,12,58,76,x+62,550,116,152);label(g,'맨얼굴 연결',x+65,726,15);
}}
function field(){const g=context('field');for(let i=0;i<6;i++){const x=i*240,a=cfg(i);label(g,names[i],x+24,27,19);[0,1,4].forEach((d,j)=>{
 const h=G.head(a,d,a.headwear);g.drawImage(h,x+44,45+j*165,150,144);label(g,['정면','앞 사선','옆 · 장비 별도'][j],x+56,198+j*165,14);
 });const b=G.render(a,0,{headwear:a.headwear}).canvas;g.drawImage(b,x+18,562,128,128);g.drawImage(b,x+163,606,64,64);label(g,'2배 / 원래 크기',x+34,696,15);}}
function parts(){const g=context('parts'),space=$('sheet').value,a=cfg();for(let row=0;row<4;row++){label(g,['눈','눈썹','코','입'][row],16,row*145+30,20);for(let i=0;i<6;i++){const p=NewFaceParts.part(space,row,i,a),s=space==='portrait'?4:10,x=100+i*215;g.drawImage(p,x+(190-p.width*s)/2,row*145+70-p.height*s/2,p.width*s,p.height*s);label(g,(i+1)+' · '+p.width+'×'+p.height,x+65,row*145+130,14);}}}
function mix(){const g=context('mix'),a=cfg();['eyes','brows','nose','mouth'].forEach(k=>a.parts[k]=+$('pick'+k[0].toUpperCase()+k.slice(1)).value);
 g.drawImage(N.render(a).canvas,25,2,78,94,55,15,234,282);
 [0,1,4].forEach((d,i)=>{g.drawImage(G.head(a,d,a.headwear),400+i*230,40,200,192);label(g,['정면','앞 사선','옆'][i],463+i*230,270,18);});
}
function render(){compare();field();parts();mix();}
Promise.all([F.init(),G.init()]).then(()=>{
 for(let i=0;i<6;i++){$('skin').add(new Option('피부 '+(i+1),i));$('eye').add(new Option(['짙은 갈색','갈색','파랑','초록','금색','회색'][i],i));}
 $('hair').add(new Option('없음',-1));for(let i=0;i<7;i++)$('hair').add(new Option('머리 '+(i+1),i));$('hair').value=1;
 for(const id of ['pickEyes','pickBrows','pickNose','pickMouth'])for(let i=0;i<6;i++)$(id).add(new Option(String(i+1),i));
 for(const id of ['skin','eye','hair','wear','sheet','pickEyes','pickBrows','pickNose','pickMouth'])$(id).onchange=render;
 render();window.faceRemakeReady=true;window.redrawFaceRemake=render;
});
