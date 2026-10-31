export function route(source,destination,links,weighted=true){
  const distance={A:Infinity,B:Infinity,C:Infinity,D:Infinity},previous={},todo=new Set(Object.keys(distance));distance[source]=0;
  while(todo.size){
    const at=[...todo].sort((a,b)=>distance[a]-distance[b])[0];todo.delete(at);
    for(const link of links.filter(l=>l.up)){
      const next=link.a===at?link.b:link.b===at?link.a:null;
      if(next&&todo.has(next)){
        const candidate=distance[at]+(weighted?link.cost:1);
        if(candidate<distance[next]){distance[next]=candidate;previous[next]=at;}
      }
    }
  }
  const path=[];
  if(Number.isFinite(distance[destination]))for(let at=destination;at;at=previous[at])path.unshift(at);
  return {path,cost:distance[destination]};
}
