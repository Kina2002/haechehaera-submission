const assert=require('node:assert/strict'),B=require('../src/stadium-banners-v13.js');
for(let stage=0;stage<4;stage++)for(const home of [false,true]){const q={matchId:'match-99',stage,home,awayCrowd:20},a=B.select(q);assert.deepEqual(a,B.select(q));assert.equal(new Set(a.map(x=>x.text)).size,a.length);assert.equal(new Set(a.map(x=>x.slot)).size,a.length);assert.equal(a.length,home?[2,2,4,6][stage]:Math.min(3,[2,2,4,6][stage]));}
assert.equal(B.select({matchId:'zero',stage:3,home:false,awayCrowd:0}).length,0);
const sample={id:'new-banner-101',text:'새 문구 123!',stage:1,cloth:'wide',enabled:true};assert.equal(B.select({matchId:'one',stage:1,home:true},[sample])[0].text,sample.text);
assert.deepEqual(B.wrap('한글 123, 응원!',s=>s.length*10,90),['한글 123,','응원!']);assert.equal(B.wrap('아주아주길고띄어쓰기없는문장',s=>s.length*10,60),null);
const frozen={opinionBanners:{version:1,items:[{...sample,slot:2}]}},saved=JSON.parse(JSON.stringify(frozen));assert.equal(B.ensure({},saved).items[0].text,sample.text);
console.log('PASS: 8 home/away stages, stable unique selection, zero-away, added text, wrapping and frozen snapshot');
