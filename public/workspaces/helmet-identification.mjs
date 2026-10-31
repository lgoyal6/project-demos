import {$,ready} from './utils.mjs';
import {bars,facts} from './charts.mjs';
const iterations=[{precision:73.6,recall:74.8,map:80.3,hours:18,page:8},{precision:72.6,recall:80.3,map:80.2,hours:7,page:8},{precision:100,recall:null,map:59.6,hours:24,page:9}];
function draw(){
  const index=Number($('iteration').value),r=iterations[index],metric=$('metric').value;
  $('metric-chart').innerHTML=bars(iterations.flatMap((v,i)=>v[metric]===null?[]:[['Iteration '+(i+1),v[metric],'%']]),100);
  $('iteration-facts').innerHTML=facts([[r.precision+'%','published precision'],[r.recall===null?'See paper':r.recall+'%','published recall'],[r.map+'%','published mAP']]);
  $('iteration-note').textContent='Iteration '+(index+1)+' reported training budget: '+r.hours+' hours. '+(r.recall===null?'Iteration 3 recall was not transcribed into this explorer; inspect the original result.':'These figures are reported values from the paper.');
  $('paper-link').innerHTML='<p class="note"><a href="https://www.jetir.org/papers/JETIR2303781.pdf#page='+r.page+'" target="_blank" rel="noopener noreferrer">Inspect iteration '+(index+1)+' on paper page '+r.page+'</a></p>';
  ready();
}
$('iteration').onchange=draw;$('metric').onchange=draw;draw();
