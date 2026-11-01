import {$,esc,ready,fail} from './utils.mjs';
import {overlaps,bounds} from './chip-geometry.mjs';

let runs,run,positions,selected=0,mode='after',edited=false,view,home,drag=null;
const svg=$('placement-canvas');
function clone(value){return value.map(p=>p.slice());}
function selectedEdges(){return run.edges.filter(e=>e.includes(selected));}
function applyView(){
  svg.setAttribute('viewBox',view.join(' '));
  $('zoom-label').textContent=Math.round(home[2]/view[2]*100)+'%';
}
function fit(){home=bounds(positions,run.widths,run.heights);view=home.slice();applyView();}
function draw(){
  const pairs=overlaps(positions,run.widths,run.heights),bad=new Set(pairs.flat());
  $('net-layer').innerHTML=$('show-nets').checked?run.edges.map(([a,b])=>{
    const p=positions[a],q=positions[b],pa=run.pin_offsets[a],pb=run.pin_offsets[b];
    return '<line class="net '+([a,b].includes(selected)?'connected':'')+'" x1="'+(p[0]+pa[0])+'" y1="'+(p[1]+pa[1])+'" x2="'+(q[0]+pb[0])+'" y2="'+(q[1]+pb[1])+'"/>';
  }).join(''):'';
  $('cell-layer').innerHTML=positions.map((p,i)=>'<rect role="button" tabindex="0" aria-label="Cell '+i+'" data-cell="'+i+'" class="cell '+(i<2?'macro ':'')+(selected===i?'selected ':'')+(bad.has(i)?'overlap':'')+'" x="'+(p[0]-run.widths[i]/2)+'" y="'+(p[1]-run.heights[i]/2)+'" width="'+run.widths[i]+'" height="'+run.heights[i]+'"><title>Cell '+i+' · '+run.widths[i].toFixed(2)+' × '+run.heights[i].toFixed(2)+'</title></rect>').join('');
  $('cell-count').textContent=run.cells;
  $('overlap-count').textContent=pairs.length;
  $('overlap-count').classList.toggle('alert',pairs.length>0);
  $('solver-verdict').textContent=run.solver_rejected?'Rejected':'Accepted';
  $('layout-state').textContent=edited?'Edited locally':'Recorded';
  $('canvas-label').textContent=edited?'Edited placement · live overlap check':mode==='after'?'Recorded solver output':'Recorded input';
  $('layout-note').textContent=edited?'These are your edits. The original solver has not been rerun.':mode==='before'?'Input positions before the recorded solver run.':run.solver_rejected?'The original solver rejected this output. Overlaps are outlined.':'This recorded output passed the independent overlap check.';
  $('cell-picker').value=String(selected);
  $('cell-size').textContent=run.widths[selected].toFixed(2)+' × '+run.heights[selected].toFixed(2);
  $('cell-connections').textContent=selectedEdges().length;
  $('cell-x').value=positions[selected][0].toFixed(3);$('cell-y').value=positions[selected][1].toFixed(3);
  $('overlap-list').innerHTML=pairs.length?pairs.slice(0,30).map(([a,b])=>'<button data-pair="'+a+'">Cell '+a+' overlaps cell '+b+'</button>').join('')+(pairs.length>30?'<p>Showing 30 of '+pairs.length+' pairs.</p>':''):'<p>No overlapping cells.</p>';
  $('record-label').textContent='C++20 solver · seed '+run.seed+' · '+run.cells+' cells · '+run.wall_seconds.toFixed(3)+' s recorded run';
  $('before-canvas').setAttribute('viewBox',bounds(run.before,run.widths,run.heights).join(' '));
  $('before-canvas').innerHTML=run.before.map((p,i)=>'<rect x="'+(p[0]-run.widths[i]/2)+'" y="'+(p[1]-run.heights[i]/2)+'" width="'+run.widths[i]+'" height="'+run.heights[i]+'" fill="'+(i<2?'#8998a5':'#c3cbd2')+'" stroke="white" stroke-width=".08"/>').join('');
}
function load(){
  run=runs[Number($('case').value)];positions=clone(run[mode]);edited=false;selected=0;
  $('cell-picker').innerHTML=positions.map((_,i)=>'<option value="'+i+'">Cell '+i+(i<2?' · macro':'')+'</option>').join('');
  fit();draw();$('status').textContent='';ready();
}
function point(event){const p=new DOMPoint(event.clientX,event.clientY);return p.matrixTransform(svg.getScreenCTM().inverse());}
function select(i){selected=i;draw();}
svg.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  const cell=event.target.closest('[data-cell]'),p=point(event);
  if(cell)selected=Number(cell.dataset.cell);
  drag={id:event.pointerId,cell:cell?selected:null,start:p,x:event.clientX,y:event.clientY,position:cell?positions[selected].slice():null,view:view.slice()};
  svg.setPointerCapture(event.pointerId);svg.focus();draw();
});
svg.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const p=point(event);
  if(drag.cell!==null){
    const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    if(Math.hypot(dx,dy)>.005){positions[drag.cell]=[drag.position[0]+dx,drag.position[1]+dy];edited=true;draw();}
  }else{
    const matrix=svg.getScreenCTM(),dx=(event.clientX-drag.x)/matrix.a,dy=(event.clientY-drag.y)/matrix.d;
    view=[drag.view[0]-dx,drag.view[1]-dy,drag.view[2],drag.view[3]];applyView();
  }
});
function release(event){if(drag?.id===event.pointerId){drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);}}
svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
svg.addEventListener('keydown',event=>{
  const target=event.target.closest('[data-cell]');
  if(target)selected=Number(target.dataset.cell);
  if(event.key==='Enter'||event.key===' '){event.preventDefault();draw();return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!delta)return;
  event.preventDefault();const step=event.shiftKey?1:.25;
  positions[selected]=positions[selected].map((n,i)=>n+delta[i]*step);edited=true;draw();svg.focus();
});
$('cell-picker').addEventListener('change',()=>select(Number($('cell-picker').value)));
$('overlap-list').addEventListener('click',event=>{const button=event.target.closest('[data-pair]');if(button)select(Number(button.dataset.pair));});
for(const [id,index] of [['cell-x',0],['cell-y',1]])$(id).addEventListener('change',()=>{
  const value=Number($(id).value);
  if(!Number.isFinite(value)||Math.abs(value)>10000){$('status').textContent='Use a finite position between −10,000 and 10,000.';draw();return;}
  $('status').textContent='';positions[selected][index]=value;edited=true;draw();
});
function zoom(factor){const cx=view[0]+view[2]/2,cy=view[1]+view[3]/2,w=view[2]*factor,h=view[3]*factor;if(w<home[2]/12||w>home[2]*5)return;view=[cx-w/2,cy-h/2,w,h];applyView();}
$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);$('fit').onclick=fit;
$('reset').onclick=()=>{positions=clone(run[mode]);edited=false;fit();draw();};
for(const [id,value] of [['output','after'],['input','before']])$(id).onclick=()=>{
  mode=value;$('output').setAttribute('aria-pressed',String(mode==='after'));$('input').setAttribute('aria-pressed',String(mode==='before'));load();
};
$('case').onchange=load;$('show-nets').onchange=draw;$('compare').onchange=()=>{$('compare-pane').hidden=!$('compare').checked;};
try{const response=await fetch('/data/chip.json');if(!response.ok)throw Error('The recorded placements could not load. Reload to retry.');runs=await response.json();load();}catch(error){fail(error);}
