import {$,esc,ready,fail} from './utils.mjs';
import {data,facts,table} from './charts.mjs';
let events,position=0,timer=null;
function pairs(payload){return '<dl class="field-pairs">'+Object.entries(payload).map(([key,value])=>'<div><dt>'+esc(key.replace(/([A-Z])/g,' $1').replaceAll('_',' '))+'</dt><dd>'+esc(typeof value==='object'?JSON.stringify(value):String(value))+'</dd></div>').join('')+'</dl>';}
function draw(){
  const current=events[position],past=events.slice(0,position+1),state=Object.assign({},...past.filter(e=>e.kind==='status').map(e=>e.payload));
  $('event-position').value=position;$('position-label').textContent=(position+1)+' / '+events.length;
  $('incident-summary').innerHTML='<h3>Fictional incident '+esc(current.incidentId)+'</h3>'+facts([[state.unit||'Not recorded','unit'],[past.filter(e=>e.kind==='retrieval').length,'stored retrieval events seen'],[past.filter(e=>e.kind==='decision').length,'decisions seen']]);
  $('event-heading').textContent='Event '+current.seq+': '+current.kind;$('event-time').textContent=current.t;
  const p=current.payload;
  if(current.kind==='retrieval')$('event-content').innerHTML='<p class="note">Stored fixture query: '+esc(p.query)+'</p>'+table(p.hits.map(h=>({title:h.title,source:h.source,score:h.score,text:h.text})),[['title','Stored result'],['source','Source'],['score','Score'],['text','Fixture evidence']]);
  else if(current.kind==='voice'||current.kind==='readback')$('event-content').innerHTML='<blockquote class="compact-code">'+esc(p.text||p.readbackText)+'</blockquote>'+pairs(Object.fromEntries(Object.entries(p).filter(([key])=>!['text','readbackText'].includes(key))));
  else $('event-content').innerHTML=pairs(p);
  $('event-list').innerHTML=events.map((e,i)=>!$('event-filter').value||e.kind===$('event-filter').value?'<button data-event="'+i+'" class="'+(i===position?'active':i>position?'future':'')+'">'+e.seq+'. '+esc(e.kind)+'<small>'+esc(e.t.slice(11,19))+' UTC</small></button>':'').join('');
}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play';}
function step(delta){position=Math.max(0,Math.min(events.length-1,position+delta));draw();if(position===events.length-1)stop();}
function play(){
  if(timer){stop();return;}if(position===events.length-1)position=0;
  $('play').textContent='Pause';timer=setInterval(()=>step(1),1000/Number($('rate').value));
}
$('play').onclick=play;$('next').onclick=()=>{stop();step(1);};$('previous').onclick=()=>{stop();step(-1);};
$('event-position').oninput=()=>{stop();position=Number($('event-position').value);draw();};
$('event-list').onclick=event=>{const button=event.target.closest('[data-event]');if(button){stop();position=Number(button.dataset.event);draw();}};
$('event-filter').onchange=draw;$('rate').onchange=()=>{if(timer){stop();play();}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{events=await data('blackbox');$('event-position').max=events.length-1;$('event-filter').innerHTML='<option value="">All events</option>'+[...new Set(events.map(e=>e.kind))].map(kind=>'<option value="'+esc(kind)+'">'+esc(kind)+'</option>').join('');draw();ready();}catch(error){fail(error);}
