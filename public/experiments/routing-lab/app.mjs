import {$,ready} from '../../workspaces/utils.mjs';
import {route} from '../../workspaces/routing-model.mjs';
import {missions,inspectRoute} from './model.mjs';
const coordinates={A:[80,205],B:[350,65],C:[350,345],D:[620,205]};
let episode=0,path=[],complete=false,finished=new Set();
function draw(){
  const mission=missions[episode],state=inspectRoute(path,mission);
  $('episode').textContent='Delivery '+(episode+1)+' of 3';$('mission-title').textContent=mission.title;$('brief').textContent=mission.brief;
  $('progress').innerHTML=missions.map((_,i)=>'<span class="'+(finished.has(i)?'done ':i===episode?'current':'')+'" aria-label="Delivery '+(i+1)+(finished.has(i)?' completed':i===episode?' current':'')+'"></span>').join('');
  $('links').innerHTML=mission.links.map(link=>{
    const [x1,y1]=coordinates[link.a],[x2,y2]=coordinates[link.b],chosen=path.some((p,i)=>i&&[link.a,link.b].includes(p)&&[link.a,link.b].includes(path[i-1]));
    return '<line class="link '+(!link.up?'down':chosen?'chosen':'')+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/><text class="link-label" x="'+((x1+x2)/2+([link.a,link.b].includes('B')&&[link.a,link.b].includes('C')?18:0))+'" y="'+((y1+y2)/2-12)+'" text-anchor="middle">'+link.cost+'</text>'+(!link.up?'<text class="broken" x="'+((x1+x2)/2)+'" y="'+((y1+y2)/2+12)+'" text-anchor="middle">down</text>':'');
  }).join('');
  document.querySelectorAll('[data-node]').forEach(button=>{button.classList.toggle('visited',path.includes(button.dataset.node));button.classList.toggle('here',button.dataset.node===path.at(-1));button.setAttribute('aria-pressed',String(button.dataset.node===path.at(-1)));button.disabled=complete;});
  $('path').textContent=path.join(' → ');$('cost').textContent=state.cost;$('budget').textContent=mission.budget;
  $('undo').disabled=complete||path.length<=mission.start.length;$('send').disabled=complete||path.at(-1)!=='D';$('next').hidden=!complete||episode===2;
  ready();
}
function reset(){path=missions[episode].start.slice();complete=false;$('feedback').textContent='Choose the next router. The packet is at '+path.at(-1)+'.';draw();}
function visit(node){
  if(complete)return;const mission=missions[episode],last=path.at(-1);
  if(node===last)return;
  if(path.includes(node)){$('feedback').textContent='Use Undo hop to revise your route.';return;}
  const link=mission.links.find(l=>[l.a,l.b].includes(last)&&[l.a,l.b].includes(node));
  if(!link?.up){$('feedback').textContent=link?'The '+last+'-'+node+' link is down. Choose another hop.':'There is no direct link from '+last+' to '+node+'.';return;}
  path.push(node);$('feedback').textContent=node==='D'?'The packet reached D. Check whether the route met its cost budget.':'Packet at '+node+'. Choose your next hop.';draw();
}
document.querySelectorAll('[data-node]').forEach(button=>button.onclick=()=>visit(button.dataset.node));
$('undo').onclick=()=>{if(path.length>missions[episode].start.length)path.pop();$('feedback').textContent='Back at '+path.at(-1)+'. Try another route.';draw();};
$('retry').onclick=()=>{finished.delete(episode);reset();};
$('send').onclick=()=>{
  const mission=missions[episode],state=inspectRoute(path,mission);
  if(!state.delivered){$('feedback').textContent='Reached D, but link cost '+state.cost+' exceeds the budget of '+mission.budget+'. Undo a hop or retry.';return;}
  complete=true;finished.add(episode);const shortest=route('A','D',mission.links).cost;
  $('feedback').textContent=(episode===2?'All three deliveries complete. ':'Delivered. ')+'Your cost: '+state.cost+'. Shortest available cost in this topology: '+shortest+'.';draw();
};
$('next').onclick=()=>{if(!complete||episode>=2)return;episode++;reset();};
$('restart').onclick=()=>{episode=0;finished.clear();reset();};reset();
