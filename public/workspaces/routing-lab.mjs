import {$,esc,ready} from './utils.mjs';
import {table} from './charts.mjs';
import {route} from './routing-model.mjs';
const initial=[{a:'A',b:'B',cost:1,up:true},{a:'A',b:'C',cost:2,up:true},{a:'B',b:'D',cost:1,up:true},{a:'C',b:'D',cost:4,up:true}];
const positions={A:[80,180],B:[300,65],C:[300,295],D:[520,180]};let links=initial.map(l=>({...l}));
function draw(){
  const weighted=$('protocol').value==='weighted',source=$('source').value,destination=$('destination').value,result=route(source,destination,links,weighted);
  $('topology').innerHTML=links.map((l,i)=>{const a=positions[l.a],b=positions[l.b],onPath=result.path.some((n,j)=>j&&[n,result.path[j-1]].includes(l.a)&&[n,result.path[j-1]].includes(l.b));return '<line data-link="'+i+'" role="button" tabindex="0" aria-label="Toggle '+l.a+'-'+l.b+'" class="'+(!l.up?'down':onPath?'route':'')+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/><text class="cost" style="pointer-events:none" x="'+((a[0]+b[0])/2)+'" y="'+((a[1]+b[1])/2-10)+'" text-anchor="middle">'+l.cost+'</text>';}).join('')+Object.entries(positions).map(([name,[x,y]])=>'<circle cx="'+x+'" cy="'+y+'" r="25"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle">'+name+'</text>').join('');
  $('selected-route').textContent=result.path.length?result.path.join(' → '):'No reachable route';
  $('route-metric').textContent=result.path.length?'Selected '+(weighted?'link cost: ':'AS-hop count: ')+result.cost:'No active path connects the selected routers.';
  $('route-table').innerHTML=table(Object.keys(positions).map(router=>{const r=route(router,destination,links,weighted);return {router,next:r.path[1]||(router===destination?'Local':'Unreachable'),metric:Number.isFinite(r.cost)?r.cost:'Unreachable'};}),[['router','Router'],['next','Next hop to '+destination],['metric',weighted?'Link cost':'AS hops']]);
  ready();
}
function controls(){
  $('link-controls').innerHTML=links.map((l,i)=>'<label class="field">'+l.a+'-'+l.b+' link cost <input type="number" data-cost="'+i+'" aria-label="'+l.a+'-'+l.b+' link cost" min="1" max="50" value="'+l.cost+'"></label>').join('');
}
function toggle(event){const link=event.target.closest('[data-link]');if(link){links[Number(link.dataset.link)].up=!links[Number(link.dataset.link)].up;draw();}}
$('topology').onclick=toggle;$('topology').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(event);}};
$('link-controls').onchange=event=>{if(event.target.dataset.cost!==undefined){const cost=Number(event.target.value);if(!Number.isFinite(cost)||cost<1||cost>50){$('status').textContent='Link costs must be between 1 and 50.';controls();return;}$('status').textContent='';links[Number(event.target.dataset.cost)].cost=cost;draw();}};
for(const id of ['protocol','source','destination'])$(id).onchange=draw;
$('reset-links').onclick=()=>{links=initial.map(l=>({...l}));$('status').textContent='';controls();draw();};controls();draw();
