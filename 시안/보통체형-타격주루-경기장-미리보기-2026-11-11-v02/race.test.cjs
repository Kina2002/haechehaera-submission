'use strict';
const assert=require('node:assert/strict'),R=require('./race.js');
let count=0;function check(name,f){f();count++;process.stdout.write('PASS '+name+'\n');}
check('runner first stays safe after the later throw',()=>{assert.equal(R.at(8.2,R.scenarios.safe).result,'safe');assert.equal(R.at(10,R.scenarios.safe).result,'safe');assert.equal(R.at(10,R.scenarios.safe).runnerOnBase,true);});
check('caught ball plus base contact before runner retires runner',()=>{assert.equal(R.at(7.59,R.scenarios.out).result,null);assert.equal(R.at(7.6,R.scenarios.out).result,'out');assert.equal(R.at(10,R.scenarios.out).runnerOnBase,false);});
check('ball arrival without a catch is not an out',()=>{assert.equal(R.at(7.8,{...R.scenarios.out,hasPossession:false}).result,null);assert.equal(R.at(9,{...R.scenarios.out,hasPossession:false}).result,'safe');});
check('receiver off the base does not cause a force out',()=>{assert.equal(R.at(7.8,{...R.scenarios.out,footOnBase:false}).result,null);assert.equal(R.at(9,{...R.scenarios.out,footOnBase:false}).result,'safe');});
check('no premature calls before catch or runner contact',()=>{assert.equal(R.at(7.59,R.scenarios.out).call,null);assert.equal(R.at(8.19,R.scenarios.safe).call,null);assert.equal(R.at(7.75,R.scenarios.out).call,'out');assert.equal(R.at(8.35,R.scenarios.safe).call,'safe');});
check('unresolved identical timestamps do not invent a ruling',()=>{assert.equal(R.at(9,{...R.scenarios.safe,ballAt:8.2}).result,'review');assert.equal(R.at(9,{...R.scenarios.safe,ballAt:8.2}).call,null);});
console.log(JSON.stringify({passed:count,total:count}));
