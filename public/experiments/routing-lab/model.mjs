export const missions=[
  {title:'Take the cheaper road.',brief:'A packet is waiting at A. Reach D with a total link cost of 3 or less.',budget:3,start:['A'],links:[['A','B',1],['A','C',2],['B','D',4],['C','D',1],['B','C',3]]},
  {title:'The shortcut is down.',brief:'The C-D link has failed. Find an available route from A to D within a cost of 5.',budget:5,start:['A'],links:[['A','B',1],['A','C',2],['B','D',4],['C','D',1,false],['B','C',3]]},
  {title:'Recover mid-flight.',brief:'Your packet has reached B when B-D fails. Finish the delivery with a total cost of 3 or less.',budget:3,start:['A','B'],links:[['A','B',1],['A','C',2],['B','D',4,false],['C','D',1],['B','C',1]]}
].map(m=>({...m,links:m.links.map(([a,b,cost,up=true])=>({a,b,cost,up}))}));

export function inspectRoute(path,mission){
  if(path[0]!=='A'||new Set(path).size!==path.length)return {valid:false,cost:0,delivered:false};
  let cost=0;
  for(let i=1;i<path.length;i++){
    const link=mission.links.find(l=>[l.a,l.b].includes(path[i-1])&&[l.a,l.b].includes(path[i]));
    if(!link?.up)return {valid:false,cost,delivered:false};
    cost+=link.cost;
  }
  return {valid:true,cost,delivered:path.at(-1)==='D'&&cost<=mission.budget};
}
