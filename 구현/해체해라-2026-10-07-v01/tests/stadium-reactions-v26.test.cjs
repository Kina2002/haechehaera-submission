const {test}=require('node:test'),assert=require('node:assert/strict');
const {timing,frame}=require('../src/stadium-reactions-v26.js');
for(const speaker of ['중계진','우리 관객','상대 관객','우리 치어리더','상대 치어리더']){
 test(speaker+' crosses continuously and clears both edges within five seconds',()=>{
  const t=timing(speaker);assert.ok(t.total>=4460&&t.total<=4950);
  for(const [width,card]of [[320,294],[668,321],[1024,470],[1680,470]]){
   let last=-Infinity;
   for(let ms=t.wait;ms<t.total-150;ms+=10){const f=frame(width,card,ms,speaker);assert.ok(f.x>last);last=f.x;assert.equal(f.opacity,1);}
   assert.ok(frame(width,card,0,speaker).x+card<0);
   assert.ok(frame(width,card,t.total,speaker).x>width);
   const middle=frame(width,card,t.wait+t.enter+t.flow/2,speaker);
   assert.ok(Math.abs(middle.x-(width-card)/2)<.001);
  }
 });
}
test('reduced motion keeps the same duration and fades at the center',()=>{
 const t=timing('중계진');
 for(const ms of [500,1400,3000,4500]){
  const f=frame(900,432,ms,'중계진',true);
  assert.equal(f.x,234);assert.ok(f.opacity>=0&&f.opacity<=1);
 }
 assert.equal(frame(900,432,t.total,'중계진',true).visible,false);
});
test('sampling a paused or resized reaction never consumes time or game state',()=>{
 const f=frame(900,432,2000,'우리 관객');
 assert.deepEqual(frame(900,432,2000,'우리 관객'),f);
 const resized=frame(320,294,2000,'우리 관객');assert.equal(resized.visible,f.visible);
});
