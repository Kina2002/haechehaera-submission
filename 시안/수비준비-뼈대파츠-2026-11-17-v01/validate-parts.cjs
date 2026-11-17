const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),C=require('./compose.cjs'),{t,rows,paint}=C;
const checks=[],failures=[],check=(name,ok,details)=>{checks.push({name,ok,...(details?{details}:{})});if(!ok)failures.push(name);},eq=(a,b)=>a.data.equals(b.data);
let reconstructed=0,colors=0,opaque=0;
for(const row of rows){const file=k=>path.join(__dirname,'materials',k,row.body,row.view+'.png'),body=t.readPNG(file('body')),glove=t.readPNG(file('glove')),complete=t.readPNG(file('complete'));
 const rebuilt=t.canvas(64,64);t.blit(rebuilt,paint(body));t.blit(rebuilt,paint(glove));if(eq(rebuilt,paint(complete)))reconstructed++;
 const a=paint(body,{skin:0,primary:'#126451',secondary:'#eeeeee'}),b=paint(body,{skin:2,primary:'#b01830',secondary:'#29a2e5'});let stable=true;for(let p=0;p<body.data.length;p+=4){const id=body.data[p];if(body.data[p+3]&&id>=70&&id<=82)for(let k=0;k<4;k++)if(a.data[p+k]!==b.data[p+k])stable=false;}if(stable&&eq(paint(glove,{skin:0}),paint(glove,{skin:2})))colors++;
 if([...complete.data].every((v,i)=>i%4!==3||v===0||v===255))opaque++;
}
check('몸+글러브 분리 뒤 원본 조립 픽셀 일치',reconstructed===18,{passed:reconstructed,total:18});check('피부/팀색 변경 시 바지·신발·글러브 색 보존',colors===18,{passed:colors,total:18});check('원본칸64×64·알파0/255',opaque===18,{passed:opaque,total:18});
for(const view of ['F','FR','FL']){const a=C.compose('normal',view,{skin:0,eye:'brown',hair:'brown',hairId:1}),b=C.compose('normal',view,{skin:2,eye:'green',hair:'blond',hairId:1});check('머리와 노출 피부 색 연동 '+view,!eq(a.head.face,b.head.face)&&!eq(a.body,b.body));}
const files=[];for(const kind of ['PNG','materials']){const visit=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else{const data=fs.readFileSync(f),a=t.readPNG(f);if(a.width!==64||a.height!==64)throw Error('Wrong frame '+f);files.push({file:path.relative(__dirname,f).replaceAll('\\','/'),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}}};visit(path.join(__dirname,kind));}
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({version:1,frame:[64,64],headFrame:[33,36],headAnchor:[16,24],footY:56,poseCount:18,gloveHand:'left',throwingHand:'right',files},null,2));
fs.writeFileSync(path.join(__dirname,'재질-분리검수-v01.json'),JSON.stringify({checks,failures,fileCount:files.length},null,2));console.log({checks,failures,fileCount:files.length});if(failures.length)process.exitCode=1;
