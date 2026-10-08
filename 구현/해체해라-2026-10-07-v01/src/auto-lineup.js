(function(root){
  'use strict';
  const positions=['P','C','1B','2B','3B','SS','LF','CF','RF'];
  const weights={
    P:{velocity:.4,control:.4,sense:.15,stamina:.05},
    C:{catch:.5,throw:.3,sense:.2},
    '1B':{catch:.65,sense:.2,throw:.15},
    '2B':{catch:.35,throw:.2,sense:.25,speed:.2},
    '3B':{catch:.35,throw:.4,sense:.25},
    SS:{catch:.3,throw:.3,sense:.2,speed:.2},
    LF:{catch:.4,speed:.35,throw:.15,sense:.1},
    CF:{catch:.35,speed:.4,throw:.15,sense:.1},
    RF:{catch:.35,speed:.25,throw:.3,sense:.1}
  };
  function choose(roster,value){
    const seen=new Set();
    const players=roster.filter(p=>p&&p.id&&!seen.has(p.id)&&seen.add(p.id));
    if(players.length<9)return null;
    const score=(p,w)=>Object.entries(w).reduce((sum,[key,weight])=>sum+value(p,key)*weight,0);
    const attack=p=>score(p,{contact:.35,power:.3,eye:.2,speed:.1,sense:.05});
    // One player per mask transition: descending masks prevent reuse. Immutable
    // parent nodes preserve the chosen assignment when later states improve.
    const best=Array(512).fill(null);best[0]={score:0};
    for(const p of players){
      const offense=attack(p);
      const scores=positions.map(pos=>{
        const defenseShare=pos==='P'?.9:.65;
        return score(p,weights[pos])*defenseShare+offense*(1-defenseShare);
      });
      for(let mask=511;mask>=0;mask--){
        const previous=best[mask];if(!previous)continue;
        for(let i=0;i<9;i++){
          if(mask&(1<<i))continue;
          const next=mask|(1<<i),total=previous.score+scores[i];
          if(!best[next]||total>best[next].score+1e-8)
            best[next]={score:total,previous,p,pos:positions[i]};
        }
      }
    }
    const remaining=[];
    for(let node=best[511];node?.p;node=node.previous)remaining.push({p:node.p,pos:node.pos});
    const take=rank=>{
      let index=0;
      for(let i=1;i<remaining.length;i++)if(rank(remaining[i].p)>rank(remaining[index].p)+1e-8)index=i;
      return remaining.splice(index,1)[0];
    };
    const order=Array(9);
    order[2]=take(attack);
    order[3]=take(p=>score(p,{power:.6,contact:.3,eye:.1}));
    order[0]=take(p=>score(p,{eye:.4,contact:.35,speed:.25}));
    order[1]=take(p=>score(p,{contact:.45,eye:.3,speed:.25}));
    for(let i=4;i<9;i++)order[i]=take(attack);
    return order.map(({p,pos})=>({id:p.id,pos}));
  }
  const api={choose};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GameAutoLineup=api;
})(globalThis);
