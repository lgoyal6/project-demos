import {$,esc,request,ready,fail} from './utils.mjs';
import {plot} from './charts.mjs';
let day=1,revision=0,timer,sunrise=6,sunset=20;
function time(value){const [h,m]=value.split(':').map(Number);return h+m/60;}
function label(hour){return String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.round((hour%1)*60)).padStart(2,'0');}
function dial(sleep,hours,result){
  const radius=140,circumference=2*Math.PI*radius;
  const point=(h,r)=>[200+Math.cos(h/24*Math.PI*2-Math.PI/2)*r,200+Math.sin(h/24*Math.PI*2-Math.PI/2)*r];
  $('schedule-dial').innerHTML='<circle class="clock-ring" cx="200" cy="200" r="'+radius+'"/><circle class="sleep-arc" cx="200" cy="200" r="'+radius+'" stroke-dasharray="'+(circumference*hours/24)+' '+circumference+'" transform="rotate('+(sleep/24*360-90)+' 200 200)"/>'+[0,3,6,9,12,15,18,21].map(h=>{const [x,y]=point(h,175);return '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle">'+String(h).padStart(2,'0')+'</text>';}).join('')+'<text x="200" y="191" text-anchor="middle" style="font-size:25px;fill:#3b4b59">'+label(sleep)+'</text><text x="200" y="215" text-anchor="middle">sleep onset</text><text x="200" y="246" text-anchor="middle">'+hours+' hours</text>';
  $('phase-state').textContent='DLMO '+label(result.dlmo)+' / minimum core body temperature '+label(result.mcbt)+'. Model phase shift: '+result.shift_hours.toFixed(2)+' hours.';
}
async function update(){
  const current=++revision;document.body.dataset.ready='false';$('status').textContent='';
  const sleep=time($('sleep-onset').value),hours=Number($('hours').value),phase=$('schedule-mode').value==='phase';$('hours-label').textContent=hours+' hours';
  if(!Number.isFinite(sleep)){fail(Error('Choose a valid example sleep time.'));return;}
  $('schedule-days').innerHTML=Array.from({length:7},(_,i)=>'<button data-day="'+(i+1)+'" aria-pressed="'+(day===i+1)+'">Day '+(i+1)+'</button>').join('');
  try{
    const result=await request('/api/run/',{project:'night-shift-coach',operation:phase?'phase_shift':'recommendations',phase_day:phase?day:0,state:{sleep_onset:sleep,hours_needed:hours,eating_mode:$('eating').value,sunrise,sunset,dlmo:21,mcbt:4}});
    if(current!==revision)return;
    dial(sleep,hours,result);$('recommendations').innerHTML=result.rows.map(([title,value])=>'<div class="recommendation"><strong>'+esc(title)+'</strong><span>'+esc(value)+'</span></div>').join('');
    const sampled=result.ir_curve.filter((_,i)=>i%15===0);
    $('ir-chart').innerHTML=plot([sampled],sampled.map((_,i)=>String(i*2).padStart(2,'0')),{max:1,label:'Original physiology model normalized IR curve'});ready();
  }catch(error){if(current===revision)fail(error);}
}
for(const id of ['sleep-onset','eating','schedule-mode'])$(id).onchange=update;
$('hours').oninput=()=>{$('hours-label').textContent=$('hours').value+' hours';clearTimeout(timer);timer=setTimeout(update,120);};$('hours').onchange=()=>{clearTimeout(timer);update();};
$('schedule-days').onclick=event=>{const button=event.target.closest('[data-day]');if(button){day=Number(button.dataset.day);update();}};
try{const response=await fetch('/api/run/?project=night-shift-coach&operation=sun_times');if(response.ok){const sun=await response.json();sunrise=sun.sunrise;sunset=sun.sunset;}}catch{}
update();
