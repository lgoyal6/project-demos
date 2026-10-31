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
for(const id of ['organizer','kind','cash'])$(id).onchange=()=>{
  events[selected][id]=id==='cash'?Number($(id).value):$(id).value;clearTimeout(timer);timer=setTimeout(update,100);
};
$('reset-events').onclick=()=>{events=initial.map(e=>({...e}));inspect(0);update();};
inspect(0);update();
