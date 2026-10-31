import {$,esc,request,ready,fail} from './utils.mjs';
let grid,row=9,col=9,revision=0;const canvas=$('raster'),ctx=canvas.getContext('2d'),cell=26;
function draw(){
  if(!grid)return;
  const values=grid.flat(),min=Math.min(...values),max=Math.max(...values,min+1);
  for(let y=0;y<20;y++)for(let x=0;x<20;x++){
    const shade=235-(grid[y][x]-min)/(max-min)*100;ctx.fillStyle='rgb('+shade+','+(shade+3)+','+(shade+6)+')';ctx.fillRect(x*cell,y*cell,cell-1,cell-1);
  }
  ctx.strokeStyle='#506d89';ctx.lineWidth=3;ctx.strokeRect(col*cell+1.5,row*cell+1.5,cell-4,cell-4);
  $('pixel-row').textContent=row;$('pixel-col').textContent=col;$('pixel-value').value=grid[row][col];
}
async function validate(reset=false){
  const current=++revision;document.body.dataset.ready='false';$('status').textContent='';$('raster-decision').textContent='Checking…';
  try{
    const body={project:'wildfire-preproc',scenario:$('scenario').value};if(!reset)body.grid=grid;
    const r=await request('/api/run/',body);if(current!==revision)return;
    grid=r.grid;
    if(reset&&$('scenario').value!=='valid'){grid[9][9]=$('scenario').value==='fuel'?101:300;return validate();}
    $('layer-name').textContent=r.layer;$('raster-decision').textContent=r.decision==='rejected'?'Needs correction':'Value checks passed';
    $('raster-errors').innerHTML=r.errors.length?'<ul class="error-list">'+r.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>':'<p class="note">The original validator accepted these values.</p>';
    draw();ready();
  }catch(error){if(current===revision){$('raster-decision').textContent='Unverified';fail(error);}}
}
canvas.onclick=event=>{const rect=canvas.getBoundingClientRect();col=Math.min(19,Math.max(0,Math.floor((event.clientX-rect.left)/rect.width*20)));row=Math.min(19,Math.max(0,Math.floor((event.clientY-rect.top)/rect.height*20)));draw();};
canvas.onkeydown=event=>{const move={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[event.key];if(move){event.preventDefault();row=Math.min(19,Math.max(0,row+move[0]));col=Math.min(19,Math.max(0,col+move[1]));draw();}};
$('apply-pixel').onclick=()=>{const value=Number($('pixel-value').value);if(!Number.isFinite(value)||Math.abs(value)>100000){$('status').textContent='Use a finite value between -100,000 and 100,000.';return;}grid[row][col]=value;validate();};
$('inject').onclick=()=>{grid[row][col]=$('scenario').value==='valid'?2:$('scenario').value==='fuel'?999:10000;validate();};
$('scenario').onchange=()=>validate(true);$('reset-raster').onclick=()=>validate(true);validate(true);
