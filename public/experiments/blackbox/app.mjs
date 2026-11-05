import {$,esc,ready,fail} from '../../workspaces/utils.mjs';
import {questions,supportsQuestion} from './model.mjs';
let events=[],tasks=[],chapter=0,position=0,notes=[],answered=false,timer=null;
function limit(){return events.findIndex(e=>e.seq===tasks[chapter].event.seq);}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play to checkpoint';}
function record(){
  const event=events[position],p=event.payload;
  $('record-kind').textContent='Event '+event.seq+' / '+event.kind;$('record-time').textContent=event.t.slice(11,19)+' UTC';
  if(event.kind==='status')$('record-content').innerHTML='<h3>Unit '+esc(p.unit||'not recorded')+'</h3><p class="fact">Recorded status: '+esc(p.status||'not recorded')+'<br>Dispatch area: '+esc(p.dispatchArea||'not recorded')+'</p>';
  else if(event.kind==='retrieval')$('record-content').innerHTML='<blockquote>'+esc(p.query)+'</blockquote><p class="fact">Stored retrieval query with '+p.hits.length+' recorded hits.</p>';
  else if(event.kind==='readback')$('record-content').innerHTML='<h3>'+esc(p.state)+'</h3><p class="fact">Recorded readback confirmation state.</p>';
  else if(event.kind==='voice')$('record-content').innerHTML='<blockquote>'+esc(p.text)+'</blockquote><p class="fact">Recorded speaker: '+esc(p.speaker)+'</p>';
  else $('record-content').innerHTML='<h3>'+esc(event.kind)+'</h3><p class="fact">Inspect the payload for the values stored in this event.</p>';
  $('raw').textContent=JSON.stringify(p,null,2);$('citation').textContent='Original fixture / seq '+event.seq+' / '+event.t;
  $('scrub').value=position;$('position').textContent=(position+1)+' / '+(limit()+1);$('previous').disabled=position===0;$('following').disabled=position===limit();
  document.querySelectorAll('[data-event]').forEach(button=>button.classList.toggle('active',Number(button.dataset.event)===position));
}
function draw(){
  const question=tasks[chapter],last=limit();
  $('chapter').textContent='Checkpoint '+(chapter+1)+' / 3';$('available').textContent='Evidence through event '+question.event.seq;
  $('question').textContent=question.title;$('prompt').textContent=question.prompt;$('scrub').max=last;
  $('timeline').innerHTML=events.slice(0,last+1).map((event,i)=>'<button data-event="'+i+'" aria-label="Inspect event '+event.seq+': '+esc(event.kind)+'">'+String(event.seq).padStart(2,'0')+'<small>'+esc(event.kind)+'</small></button>').join('');
  $('notes-count').textContent=notes.length+' / 3 citations';
  $('notes').innerHTML=notes.map(q=>'<li><h3>'+esc(q.title)+'</h3><p>'+esc(q.quote)+'</p><small>Event '+q.event.seq+' / '+esc(q.event.t)+'</small></li>').join('');
  $('notes-empty').hidden=notes.length>0;
  $('pin').disabled=answered;$('hint').disabled=answered;$('next').hidden=!answered||chapter===2;$('complete').hidden=notes.length!==3;
  record();ready();
}
function select(i){stop();position=Math.max(0,Math.min(limit(),i));record();}
$('timeline').onclick=event=>{const button=event.target.closest('[data-event]');if(button)select(Number(button.dataset.event));};
$('scrub').oninput=()=>select(Number($('scrub').value));$('previous').onclick=()=>select(position-1);$('following').onclick=()=>select(position+1);
$('play').onclick=()=>{
  if(timer){stop();return;}if(position===limit())position=0;$('play').textContent='Pause replay';
  timer=setInterval(()=>{position=Math.min(limit(),position+1);record();if(position===limit())stop();},650);
};
$('pin').onclick=()=>{
  if(answered)return;stop();const question=tasks[chapter];
  if(!supportsQuestion(events[position],question)){$('feedback').textContent='This event does not directly support the observation. '+question.hint;return;}
  notes.push(question);answered=true;$('feedback').textContent='Citation attached. The notebook now links this observation to its original record.';draw();
};
$('hint').onclick=()=>{$('feedback').textContent=tasks[chapter].hint;};
$('next').onclick=()=>{if(!answered||chapter>=2)return;stop();chapter++;position=0;answered=false;$('feedback').textContent='More recorded events are now available. Find the record that supports this checkpoint.';draw();};
function reset(){if(!tasks.length)return;stop();chapter=0;position=0;notes=[];answered=false;$('feedback').textContent='Inspect a record, then pin it when it supports the observation.';draw();}
$('reset').onclick=reset;$('again').onclick=reset;document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{const response=await fetch('/data/blackbox.json');if(!response.ok)throw Error('The recorded case could not load. Reload to retry.');events=await response.json();tasks=questions(events);reset();}catch(error){fail(error);}
