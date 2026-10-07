(function(root){
 'use strict';
 function create({assets,settings,allowed,Context,fetchFile,trace=()=>{}}){
  let ctx=null,unlocked=false,epoch=0,desiredMusic=null,musicToken=0;
  const buffers=new Map(),loads=new Map(),voices=new Set(),channels=new Map(),errors=[];
  let master,musicBus,effectBus,lastMix='';
  const log=(type,extra={})=>trace({type,...extra});
  function enabled(){return unlocked&&ctx?.state==='running'&&settings().enabled&&allowed();}
  function mix(){
   if(!ctx)return;
   const s=settings(),duck=[...voices].some(v=>['judge','reaction','stinger'].includes(v.channel)) ? .24 : [...voices].some(v=>v.channel==='ambience') ? .42 : 1;
   const key=[s.enabled,s.music,s.effects,duck,allowed()].join(':');if(key===lastMix)return;lastMix=key;
   master.gain.setTargetAtTime(s.enabled&&allowed() ? .8 : 0,ctx.currentTime,.025);
   musicBus.gain.setTargetAtTime(s.music*duck,ctx.currentTime,.07);
   effectBus.gain.setTargetAtTime(s.effects,ctx.currentTime,.025);
  }
  function load(id){
   if(buffers.has(id))return Promise.resolve(buffers.get(id));
   if(loads.has(id))return loads.get(id);
   if(!ctx||!assets[id])return Promise.resolve(null);
   const promise=Promise.resolve().then(()=>fetchFile(assets[id].src)).then(r=>{
    if(!r.ok)throw Error('HTTP '+r.status);return r.arrayBuffer();
   }).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{buffers.set(id,buffer);return buffer;}).catch(error=>{
    errors.push({id,message:String(error.message||error)});log('error',{id,message:String(error.message||error)});return null;
   });
   loads.set(id,promise);return promise;
  }
  async function unlock(){
   if(!settings().enabled)return false;
   try{
    if(!ctx){ctx=new Context();master=ctx.createGain();musicBus=ctx.createGain();effectBus=ctx.createGain();musicBus.connect(master);effectBus.connect(master);master.connect(ctx.destination);master.gain.value=0;}
    if(ctx.state!=='running')await ctx.resume();
    unlocked=ctx.state==='running';mix();
    if(unlocked)for(const id of Object.keys(assets))void load(id);
    return unlocked;
   }catch(error){log('unlock-error',{message:String(error.message||error)});return false;}
  }
  function stopVoice(v,reason){
   if(!voices.delete(v))return;
   try{v.gain.gain.cancelScheduledValues(ctx.currentTime);v.gain.gain.setTargetAtTime(0,ctx.currentTime,.006);v.source.stop(ctx.currentTime+.035);}catch(_){}
   log('stop',{id:v.id,channel:v.channel,reason});
  }
  function stopChannel(channel,reason='channel-change'){
   channels.set(channel,(channels.get(channel)||0)+1);
   for(const v of [...voices])if(v.channel===channel)stopVoice(v,reason);
   mix();
  }
  function stopEffects(reason='scene-change'){
   for(const channel of ['field','judge','crowd','reaction','stinger','ui','ambience'])stopChannel(channel,reason);
  }
  function stopAll(reason='muted'){
   epoch++;musicToken++;desiredMusic=null;for(const v of [...voices])stopVoice(v,reason);mix();
  }
  function start(id,buffer,options){
   const spec=assets[id],channel=options.channel||spec.channel;
   const offset=Math.max(0,Number(typeof options.offset==='function'?options.offset():options.offset)||0);
   if(offset>=buffer.duration)return false;
   if(['judge','reaction','stinger','ui','bgm'].includes(channel))for(const v of [...voices])if(v.channel===channel)stopVoice(v,'replaced');
   if(channel==='field'&&[...voices].filter(v=>v.channel==='field').length>=4)stopVoice([...voices].find(v=>v.channel==='field'),'field-limit');
   const source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;
   source.buffer=buffer;source.loop=!!options.loop;
   if(options.loop){source.loopStart=0;source.loopEnd=buffer.duration;}
   const fadeIn=options.loop ? .18 : Math.max(0,options.fadeIn||0);
   gain.gain.setValueAtTime(fadeIn?0:spec.gain,now);
   if(fadeIn)gain.gain.linearRampToValueAtTime(spec.gain,now+fadeIn);
   source.connect(gain);gain.connect(channel==='bgm'?musicBus:effectBus);
   const v={id,channel,source,gain};voices.add(v);
   source.onended=()=>{voices.delete(v);try{source.disconnect();gain.disconnect();}catch(_){}mix();};
   source.start(now,offset);
   if(!options.loop&&Number.isFinite(options.maxDuration)&&options.maxDuration<buffer.duration-offset){
    const end=now+Math.max(.05,options.maxDuration);
    gain.gain.setValueAtTime(spec.gain,Math.max(now,end-.035));gain.gain.linearRampToValueAtTime(0,end);source.stop(end);
   }
   log('play',{id,channel,bufferSeconds:buffer.duration,offsetSeconds:offset,...options.meta});mix();return true;
  }
  async function play(id,options={}){
   if(!enabled()||!assets[id])return false;
   const ticket=epoch,channel=options.channel||assets[id].channel,channelTicket=channels.get(channel)||0;
   const buffer=await load(id);
   if(!buffer||ticket!==epoch||channelTicket!==(channels.get(channel)||0)||!enabled()||options.valid&&!options.valid())return false;
   return start(id,buffer,options);
  }
  function music(id){
   if(!enabled())return;
   if(id===desiredMusic)return;
   desiredMusic=id;const ticket=++musicToken;
   stopChannel('bgm','music-change');
   if(id)void play(id,{loop:true,valid:()=>ticket===musicToken&&desiredMusic===id});
  }
  return {unlock,play,music,mix,load,stopAll,stopEffects,stopChannel,
   isPlaying:channel=>[...voices].some(v=>v.channel===channel),
   preload:()=>Promise.all(Object.keys(assets).map(load)),
   snapshot:()=>({unlocked,state:ctx?.state||'locked',desiredMusic,voices:[...voices].map(v=>({id:v.id,channel:v.channel})),
    loaded:[...buffers].map(([id,b])=>({id,seconds:b.duration})),errors:[...errors]})};
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.HaecheAudioEngine=api;
})(typeof window==='object'?window:globalThis);
