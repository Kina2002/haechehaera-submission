const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/frame-bounds.js'),'utf8');
const start=source.indexOf('function skinPixel('),end=source.indexOf('function uniformBase(',start);
const ctx=vm.createContext({});vm.runInContext(source.slice(start,end),ctx);
const pixel=(rgb,tone)=>Array.from(ctx.skinPixel(...rgb,tone));
const tones=['ffd3a5','e9b383','d79b6c','b87a51','8d583d','624130'].map(s=>s.match(/../g).map(v=>parseInt(v,16)));
test('equal red values retain source nose and cheek luminance differences',()=>{
 for(const tone of tones){const cheek=pixel([250,210,150],tone),mouth=pixel([250,145,80],tone);assert.ok(cheek.reduce((a,b)=>a+b)-mouth.reduce((a,b)=>a+b)>35);}
});
test('neutral source keeps each selected skin palette instead of replacing skin identity',()=>{
 for(const tone of tones)assert.deepEqual(pixel([185,185,185],tone),tone);
 assert.equal(new Set(tones.map(t=>pixel([250,210,150],t).join(','))).size,6);
});
test('skin shading stays finite, bounded and ordered from shadow to highlight',()=>{
 for(const tone of tones){let prior=-1;for(const v of [0,45,90,130,185,220,255]){const p=pixel([v,v,v],tone);assert.ok(p.every(n=>Number.isInteger(n)&&n>=0&&n<=255));const sum=p.reduce((a,b)=>a+b);assert.ok(sum>=prior);prior=sum;}}
});
test('colour conversion never mutates the saved palette or source values',()=>{
 const tone=Object.freeze([98,65,48]),input=Object.freeze([250,210,150]);assert.doesNotThrow(()=>pixel(input,tone));assert.deepEqual(tone,[98,65,48]);assert.deepEqual(input,[250,210,150]);
});
