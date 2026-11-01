import {$,esc,ready,fail} from './utils.mjs';
import {data,number,table,bars,plot} from './charts.mjs';
let snapshot;
function options(values){return '<option value="">All</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');}
function filter(){
  const rows=snapshot.anomaly_hotspots.filter(r=>(!$('vendor').value||r.vendor===$('vendor').value)&&(!$('project').value||r.project===$('project').value));
  $('hotspots').innerHTML=rows.length?table(rows,[['vendor','Vendor'],['project','Project'],['flagged_pos','Flagged POs'],['total_overpayment_inr','Synthetic flagged amount (INR)']]):'<p class="note">No recorded hotspot matches these filters.</p>';
  $('filter-summary').textContent=rows.length+' hotspots / '+number(rows.reduce((sum,r)=>sum+r.total_overpayment_inr,0))+' INR in this extract';
}
function category(){
  const selected=$('category').value,rows=snapshot.demand_first10.filter(r=>r.category===selected);
  $('demand-chart').innerHTML=plot([rows.map(r=>r.predicted_qty)],rows.map(r=>r.month.slice(5)),{max:Math.max(...rows.map(r=>r.predicted_qty),1)*1.15,label:'Recorded synthetic demand for '+selected});
  const signals=snapshot.price_signals.filter(r=>r.category===selected),surplus=snapshot.surplus_top5;
  $('material-decision').innerHTML=signals.length?signals.map(r=>'<article><h4>'+esc(r.region)+': '+esc(r.signal==='BUY_NOW'?'Buy now':r.signal.replaceAll('_',' ').toLowerCase())+'</h4><p>Recorded '+esc(r.category)+' price: '+number(r.current_price)+' '+esc(r.unit)+'. Expected change in this synthetic snapshot: '+number(r.expected_change_pct,2)+'%.</p></article>').join(''):'<p>No recorded price decision for this material.</p>';
  $('surplus-review').innerHTML=table(surplus,[['demand_id','Demand'],['material_id','Material ID'],['from_project','Surplus source'],['to_project','Destination'],['qty_transferred','Recorded transfer quantity'],['distance_km','Distance (km)']]);
  $('vendor-ranking').innerHTML=bars(snapshot.vendors[selected].ranking.slice(0,7).map(([id,score])=>[id,score]),100);
}
try{
  snapshot=await data('buildsignal');
  $('snapshot-metrics').innerHTML=[[snapshot.anomalies.pos_scanned,'purchase orders in synthetic scan'],[snapshot.anomalies.flagged_count,'flagged in full synthetic snapshot'],[snapshot.anomaly_hotspots.length,'recorded hotspot groups']].map(([value,label])=>'<div><strong>'+number(value)+'</strong><small>'+esc(label)+'</small></div>').join('');
  $('vendor').innerHTML=options([...new Set(snapshot.anomaly_hotspots.map(r=>r.vendor))]);$('project').innerHTML=options([...new Set(snapshot.anomaly_hotspots.map(r=>r.project))]);
  $('category').innerHTML=Object.keys(snapshot.vendors).map(v=>'<option value="'+esc(v)+'">'+esc(v.replaceAll('_',' '))+'</option>').join('');
  $('vendor').onchange=filter;$('project').onchange=filter;$('category').onchange=category;filter();category();ready();
}catch(error){fail(error);}
