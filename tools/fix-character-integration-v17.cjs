const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),g=path.join(root,'구현/해체해라-2026-10-07-v01/src');
function replace(f,a,b){const p=path.join(g,f),s=fs.readFileSync(p,'utf8');if(!s.includes(a))throw Error('Missing '+f);fs.writeFileSync(p,s.replace(a,b));}
replace('character-integration-v17.js',"out=R.portrait(a,a.portraitCap!==false)","out=small?R.portrait(a,a.portraitCap!==false):R.fullPortrait(a,a.portraitCap!==false)");
replace('character-integration-v17.js',"box=small?out.crop:[0,0,320,384]","box=out.crop");
replace('character-integration-v17.js',"p.name+' 선수 얼굴'","p.name+(small?' 선수 얼굴':' 선수 전신')");
replace('character-integration-v17.js',"return html.replace('</canvas>','</canvas>'+button);","return html.replace(/(<section class=\"panel profile26\">[\\s\\S]*?<\\/canvas>)/,'$1'+button);");
replace('field-integration-v17.js',"if(rear&&pose==='run')direction=3;","if(offense&&['bat','swing'].includes(pose))flip=p.hand==='좌타';\n if(rear&&pose==='run')direction=3;");
replace('stadium-view-v13.js',"if(V.low&&o.base===0)q=project(1.2,-2.25);","if(V.low&&o.base===0)q=project(-1.3,-2.0);");
replace('stadium-view-v13.js',"else if(V.low&&['bat','swing'].includes(call.pose)&&(actor.entry===undefined||actor.entry>=.9))state.direction=2;","// Batting keeps the pose's registered head direction; do not twist only the head toward the camera.");
replace('stadium-view-v13.js',"direction:state.direction});","direction:state.direction,headwear:state.headwear,catcher:state.catcher,position:state.position,offense:state.offense});");

