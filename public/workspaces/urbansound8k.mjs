import {$,esc,ready,fail} from './utils.mjs';
import {data,plot,table,bars} from './charts.mjs';
let records;const name=r=>r.model.replaceAll('_',' ')+' / '+r.features;
function classes(){
  const key=$('sound-class').value;
  $('class-comparison').innerHTML=bars(records.map(r=>[r.model.replaceAll('_',' ')+' '+r.features,(r.metrics[key]?.mean??0)*100,'%']),100);
}
function update(){
  const a=records[Number($('config-a').value)],b=records[Number($('config-b').value)],metric=$('metric').value;
  $('legend-a').textContent='A: '+name(a);$('legend-b').textContent='B: '+name(b);
  $('fold-chart').innerHTML=plot([a.metrics[metric].folds.map(v=>v*100),b.metrics[metric].folds.map(v=>v*100)],Array.from({length:10},(_,i)=>String(i+1)),{max:100,label:'Recorded '+metric+' by predefined fold',suffix:'%'});
  const rows=[a,b].map((r,i)=>({configuration:(i?'B: ':'A: ')+name(r),accuracy:(r.metrics.accuracy.mean*100).toFixed(2)+'%',std:(r.metrics.accuracy.std*100).toFixed(2)+' percentage points',f1:r.metrics.macro_f1.mean.toFixed(4),latency:r.metrics.latency_ms?.mean.toFixed(3)+' ms'}));
  $('comparison-summary').innerHTML=table(rows,[['configuration','Configuration'],['accuracy','Mean accuracy'],['f1','Mean macro F1']]);
  $('configuration-details').innerHTML=table(rows,[['configuration','Configuration'],['std','Accuracy std. dev.'],['latency','Recorded latency']]);
  $('source-links').innerHTML=[a,b].map((r,i)=>'<p><a href="https://github.com/lgoyal6/UrbanSound8k-classification/blob/main/results/'+encodeURIComponent(r.file)+'" target="_blank" rel="noopener noreferrer">Configuration '+(i?'B':'A')+' source CSV</a></p>').join('');
}
try{
  records=await data('urbansound');const options=records.map((r,i)=>'<option value="'+i+'">'+esc(name(r))+'</option>').join('');
  $('config-a').innerHTML=options;$('config-b').innerHTML=options;$('config-b').value=String(records.length-1);
  $('sound-class').innerHTML=Object.keys(records[0].metrics).filter(k=>k.startsWith('f1_')).map(k=>'<option value="'+esc(k)+'">'+esc(k.slice(3).replaceAll('_',' '))+'</option>').join('');
  for(const id of ['config-a','config-b','metric'])$(id).onchange=update;$('sound-class').onchange=classes;update();classes();ready();
}catch(error){fail(error);}
