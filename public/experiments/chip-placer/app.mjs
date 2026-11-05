import {$,ready,fail} from '../../workspaces/utils.mjs';
import {makeLevel,inspect,hintCell} from './model.mjs';
let run,level,positions,selected=0,moves=0,drag=null,comparison=false;
const board=$('board');
function draw(){
  const state=inspect(level,positions),bad=new Set(state.pairs.flat()),[x,y,w,h]=level.board;
  board.setAttribute('viewBox',[x-1,y-1,w+2,h+2].join(' '));
  board.innerHTML='<rect class="frame" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>'+
    ($('connections').checked?level.edges.map(([a,b])=>'<line class="wire" x1="'+(positions[a][0]+level.pins[a][0])+'" y1="'+(positions[a][1]+level.pins[a][1])+'" x2="'+(positions[b][0]+level.pins[b][0])+'" y2="'+(positions[b][1]+level.pins[b][1])+'"/>').join(''):'')+
    (comparison?level.solution.map((p,i)=>'<rect class="ghost" x="'+(p[0]-level.widths[i]/2)+'" y="'+(p[1]-level.heights[i]/2)+'" width="'+level.widths[i]+'" height="'+level.heights[i]+'"/>').join(''):'')+
    positions.map((p,i)=>({p,i})).sort((a,b)=>Number(a.i===selected)-Number(b.i===selected)).map(({p,i})=>'<rect tabindex="0" role="button" aria-label="Select cell '+i+'" data-cell="'+i+'" class="cell '+(i<2?'macro ':'')+(i===selected?'selected ':'')+(bad.has(i)?'overlap':'')+'" x="'+(p[0]-level.widths[i]/2)+'" y="'+(p[1]-level.heights[i]/2)+'" width="'+level.widths[i]+'" height="'+level.heights[i]+'"/>').join('');
  $('overlaps').textContent=state.pairs.length;$('outside').textContent=state.outside.length;$('moves').textContent=moves;
  $('cell').value=selected;$('x').value=positions[selected][0].toFixed(3);$('y').value=positions[selected][1].toFixed(3);
  $('result').dataset.solved=state.solved;
  $('result').textContent=state.solved?'Clean layout. No overlaps, and every cell is inside the board.':state.outside.length?'Bring every cell back inside the board.':state.pairs.length+' overlapping '+(state.pairs.length===1?'pair':'pairs')+' left. Select a cell and give it some room.';
  $('compare').disabled=!state.solved;$('compare').textContent=comparison?'Hide recorded outlines':'Compare recorded layout';
  $('next').hidden=!state.solved||Number($('level').value)===2;
}
function load(){
  level=makeLevel(run,Number($('level').value));positions=level.positions.map(p=>p.slice());selected=0;moves=0;comparison=false;
  $('hint-text').hidden=true;$('hint').textContent='Show a useful hint';$('status').textContent='';
  $('cell').innerHTML=positions.map((_,i)=>'<option value="'+i+'">Cell '+i+(i<2?' / macro':'')+'</option>').join('');draw();ready();
}
function move(x,y){
  if(![x,y].every(Number.isFinite)||Math.max(Math.abs(x),Math.abs(y))>10000){$('status').textContent='Use finite coordinates between -10,000 and 10,000.';return;}
  if(x!==positions[selected][0]||y!==positions[selected][1]){positions[selected]=[x,y];moves++;comparison=false;}
  $('status').textContent='';draw();
}
function point(event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(board.getScreenCTM().inverse());}
board.onpointerdown=event=>{
  const cell=event.target.closest('[data-cell]');if(!cell||event.button!==0)return;
  selected=Number(cell.dataset.cell);drag={id:event.pointerId,start:point(event),position:positions[selected].slice(),changed:false};board.setPointerCapture(event.pointerId);board.focus();draw();
};
board.onpointermove=event=>{
  if(!drag||drag.id!==event.pointerId)return;const p=point(event),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  if(Math.hypot(dx,dy)<.01)return;positions[selected]=[drag.position[0]+dx,drag.position[1]+dy];drag.changed=true;comparison=false;draw();
};
function release(event){if(drag?.id===event.pointerId){if(drag.changed)moves++;drag=null;if(board.hasPointerCapture(event.pointerId))board.releasePointerCapture(event.pointerId);draw();}}
board.onpointerup=release;board.onpointercancel=release;
board.onkeydown=event=>{
  const target=event.target.closest('[data-cell]');if(target)selected=Number(target.dataset.cell);
  if(['Enter',' '].includes(event.key)){event.preventDefault();draw();board.focus();return;}
  const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!d)return;
  event.preventDefault();const step=event.shiftKey?1:.25;move(positions[selected][0]+d[0]*step,positions[selected][1]+d[1]*step);board.focus();
};
$('cell').onchange=()=>{selected=Number($('cell').value);draw();};$('move').onclick=()=>move(Number($('x').value),Number($('y').value));
$('reset').onclick=load;$('level').onchange=load;$('connections').onchange=draw;
$('hint').onclick=()=>{const i=hintCell(level,positions);selected=i;const p=level.solution[i];$('hint-text').hidden=false;$('hint-text').textContent='One known valid arrangement places cell '+i+' at X '+p[0].toFixed(3)+', Y '+p[1].toFixed(3)+'. Other clean arrangements also count.';draw();};
$('compare').onclick=()=>{if(!inspect(level,positions).solved)return;comparison=!comparison;draw();};
$('next').onclick=()=>{$('level').value=Number($('level').value)+1;load();};
try{const response=await fetch('/data/chip.json');if(!response.ok)throw Error('The recorded cells could not load. Reload to retry.');run=(await response.json()).find(r=>!r.solver_rejected);if(!run)throw Error('No accepted reference placement is available.');load();}catch(error){fail(error);}
