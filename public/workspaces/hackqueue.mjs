import {$,esc,request,ready,fail} from './utils.mjs';
import {facts,number} from './charts.mjs';
const initial=[{title:'Startup build weekend',organizer:'startup',kind:'hackathon',cash:10000},{title:'NVIDIA example challenge',organizer:'NVIDIA',kind:'hackathon',cash:10000},{title:'Community practice event',organizer:'community',kind:'hackathon',cash:0}];
const lanes=['startup pipeline','big name','recruiting competition','outside lanes'];
let events=initial.map(e=>({...e})),results=[],selected=0,revision=0,timer;
function inspect(index){
  selected=index;const e=events[index];$('event-title').textContent=e.title;$('organizer').value=e.organizer;$('kind').value=e.kind;$('cash').value=e.cash;draw();
}
function draw(){
  $('board').innerHTML=lanes.map(lane=>'<section class="lane"><h3>'+esc(lane)+'</h3>'+events.map((e,i)=>(results[i]?.result?.lane||'outside lanes')===lane?'<button class="event-card '+(i===selected?'selected':'')+'" data-event="'+i+'">'+esc(e.title)+'<small>'+esc(e.organizer)+' / $'+number(e.cash)+'</small><small>'+esc(e.kind.replaceAll('_',' '))+'</small></button>':'').join('')+'</section>').join('');
  const result=results[selected]?.result;
  $('lane-reason').textContent=result?.reason||'The original rules declined this example. Change its type, organizer, or prize to compare the outcome.';
  $('lane-score').innerHTML=result?facts([[number(result.score,2),'original rule score']]):'';
}
async function update(){
  const current=++revision;document.body.dataset.ready='false';$('status').textContent='';
  try{
    const next=await Promise.all(events.map(e=>request('/api/node/',{project:'hackqueue',...e})));
    if(current!==revision)return;results=next;draw();ready();
  }catch(error){if(current===revision)fail(error);}
}
$('board').onclick=event=>{const b=event.target.closest('[data-event]');if(b)inspect(Number(b.dataset.event));};
for(const id of ['organizer','kind','cash'])$(id)[id==='cash'?'oninput':'onchange']=()=>{
  events[selected][id]=id==='cash'?Number($(id).value):$(id).value;document.body.dataset.ready='false';$('lane-reason').textContent='Re-evaluating the selected event…';clearTimeout(timer);timer=setTimeout(update,100);
};
$('reset-events').onclick=()=>{events=initial.map(e=>({...e}));inspect(0);update();};
inspect(0);update();

const workflow=[['pending','Approve event selection','A selected event still needs an approved idea before any build.'],['approved','Claim selection work','The dispatcher works one approved event at a time.'],['selecting','Review the proposed idea','The worker researches and prepares an idea for review.'],['idea_pending','Approve this fictional idea','A pending idea cannot start a build.'],['build_approved','Start approved build','The approved idea becomes eligible for the builder.'],['building','Mark review-ready','A build is in progress. A failure retains the stage to retry.'],['ready','Review complete','A ready build still needs the owner’s review.']];
let queueAt=0,failedAt=null,history=[];
function showQueue(){const [stage,label,description]=workflow[queueAt];$('queue-stage').textContent=failedAt===null?'Illustrated state: '+stage:'Illustrated state: failed, retry target '+(stage==='building'?'build_approved':'approved');$('queue-next').textContent=label;$('queue-next').disabled=failedAt!==null||queueAt===workflow.length-1;$('queue-crash').disabled=failedAt!==null||!['selecting','building'].includes(stage);$('queue-recover').disabled=failedAt===null;$('queue-explanation').textContent=description+' Abandoned selection and build work have separate expiry windows in the original queue. Expiry is not a successful build.';$('queue-history').replaceChildren(...history.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
$('queue-next').onclick=()=>{if(failedAt!==null||queueAt===workflow.length-1)return;queueAt++;history.push('Fictional transition to '+workflow[queueAt][0]);showQueue();};
$('queue-crash').onclick=()=>{if(!['selecting','building'].includes(workflow[queueAt][0])||failedAt!==null)return;failedAt=queueAt;history.push('Fictional worker failure; preserve retry target '+(workflow[queueAt][0]==='building'?'build_approved':'approved'));showQueue();};
$('queue-recover').onclick=()=>{if(failedAt===null)return;queueAt=workflow[failedAt][0]==='building'?4:1;failedAt=null;history.push('Return to approved stage: '+workflow[queueAt][0]);showQueue();};
$('queue-reset').onclick=()=>{queueAt=0;failedAt=null;history=[];showQueue();};showQueue();
