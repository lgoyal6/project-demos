import {$,esc,ready,fail} from './utils.mjs';
import {data,facts,bars,number} from './charts.mjs';
const phases=[['Prepare target','Prepare the destination host for the incoming guest state.'],['Pre-copy','Copy dirty memory pages while the guest continues running.'],['Pause and transfer','Pause the source guest and transfer the remaining state.'],['Restore and announce','Restore and resume the guest, then announce the network address.']];
let record,selected=0,phase=0;
function draw(){
  $('run-selector').innerHTML=record.pause_ms.map((_,i)=>'<button data-run="'+i+'" aria-pressed="'+(i===selected)+'">Run '+(i+1)+'</button>').join('');
  $('run-facts').innerHTML=facts([[record.pause_ms[selected]+' ms','VMM pause for run '+(selected+1)],[number(record.guest_pages),'self-verifying guest pages']]);
  $('pause-chart').innerHTML=bars(record.pause_ms.map((v,i)=>['Run '+(i+1),v,' ms']),30);
  $('client-facts').innerHTML=facts([[record.client_gap_range_ms.join('–')+' ms','client gap range across four runs'],[record.integrity_errors,'recorded guest integrity errors']]);
  $('pipeline').innerHTML=phases.map(([name],i)=>'<button data-phase="'+i+'" aria-pressed="'+(i===phase)+'">'+esc(name)+'</button>').join('');
  $('phase-description').textContent=phases[phase][1];
}
$('run-selector').onclick=event=>{const button=event.target.closest('[data-run]');if(button){selected=Number(button.dataset.run);draw();}};
$('pipeline').onclick=event=>{const button=event.target.closest('[data-phase]');if(button){phase=Number(button.dataset.phase);draw();}};
try{record=await data('firecracker');draw();ready();}catch(error){fail(error);}
