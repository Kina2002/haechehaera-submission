// The home cast belongs to the plaza: no roster panel or internal scrolling.
const homeBefore24=homeArtworkHTML;
function homePlayers24(t){
 const ids=[...new Set([...(t.lineup||[]).map(x=>x.id),...t.players.map(p=>p.id)])];
 return ids.map(id=>ply(t,id)).filter(Boolean).slice(0,9);
}
homeArtworkHTML=function(t){
 const spots=[[12,132,120],[34,144,116],[56,136,120],[79,148,114],
              [4,26,146],[26,12,152],[49,30,146],[72,9,154],[94,24,146]];
 const cast='<div class="home-cast24" aria-label="구장 앞에 모인 선발 선수">'+homePlayers24(t).map((p,i)=>{
  const [x,y,h]=spots[i];
  return '<figure style="left:'+x+'%;bottom:'+y+'px;--cast-height:'+h+'px;z-index:'+(i<4?1:2)+'"><canvas width="240" height="320" data-home-detail="'+esc(p.id)+'" role="img" aria-label="'+esc(p.name)+' 상세 캐릭터"></canvas><figcaption><b>'+esc(p.name)+'</b><span>#'+p.number+'</span></figcaption></figure>';
 }).join('')+'</div>';
 return homeBefore24(t).replace('<canvas class="club-cast" id="clubCast" width="760" height="350"></canvas>',cast);
};
function paintHome24(){if(!charsReady||!team())return;for(const cv of $$('canvas[data-home-detail]')){if(cv.dataset.painted)return;const p=ply(team(),cv.dataset.homeDetail);if(p){paintDetail(cv,p,team());cv.dataset.painted='true';}}}
const decorBefore24=drawDecorations;
drawDecorations=function(time,force=false){decorBefore24(time,force);paintHome24();};
const homeStyle24=document.createElement('style');homeStyle24.textContent=`
.club-stage .club-menu{gap:4px!important}.club-stage .club-menu button{padding:4px 8px;min-height:32px!important;font-size:16px!important}
.home-cast24{position:absolute;left:236px;right:270px;bottom:12px;height:340px;pointer-events:none}
.home-cast24 figure{position:absolute;margin:0;width:118px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.home-cast24 canvas{display:block;width:auto;height:var(--cast-height);image-rendering:pixelated}
.home-cast24 figcaption{display:flex;align-items:baseline;justify-content:center;gap:5px;white-space:nowrap;color:#fff6db;font:14px NeoDunggeunmo;line-height:20px;text-shadow:-1px -1px 0 #142a29,1px -1px 0 #142a29,-1px 1px 0 #142a29,1px 1px 0 #142a29,0 2px 2px #142a29;margin-top:-3px}
.home-cast24 figcaption b{font-weight:normal}.home-cast24 figcaption span{color:#ffe28b;font-size:12px}
`;document.head.append(homeStyle24);
if($('#qaTools')){const b=document.createElement('button');b.textContent='홈 상세 선수 미리보기';b.onclick=()=>context23(()=>{const {t}=fixture23();t.match=null;screen='home';note('홈 화면 · 저장하지 않는 미리보기','<div id="qaHome24">'+homeArtworkHTML(t)+'</div>');$('#dialog').style.cssText='max-width:1480px;width:98vw';$('#qaHome24').querySelectorAll('button').forEach(b=>b.disabled=true);portraitCanvases();paintHome24();});$('#qaTools').append(b);}
