import {$,request,ready,fail} from './utils.mjs';
import {facts,plot} from './charts.mjs';
let timer,revision=0,controller;
async function update(){
  const current=++revision;controller?.abort();controller=new AbortController();document.body.dataset.ready='false';$('status').textContent='';
  const confidence=Number($('confidence').value);$('confidence-label').textContent=Math.round(confidence*100)+'%';
  try{
    const r=await request('/api/run/',{project:'bench',confidence,outcome:$('outcome').value},controller.signal);if(current!==revision)return;
    const agent=r.virtual_amount_to_agent,customer=r.virtual_amount_to_customer,total=agent+customer;
    $('allocation').innerHTML=facts([['$'+agent.toFixed(2),'to agent'],['$'+customer.toFixed(2),'to customer'],[r.brier_score.toFixed(3),'settlement score']]);
    $('agent-share').style.width=agent/total*100+'%';$('allocation-legend').textContent='$'+agent.toFixed(2)+' to agent / $'+customer.toFixed(2)+' to customer';
    $('settlement-chart').innerHTML=plot([r.curve.map(p=>p.pass_agent),r.curve.map(p=>p.fail_agent)],r.curve.map(p=>Math.round(p.confidence*100)+'%'),{max:16,label:'Virtual agent payout by stated confidence',suffix:' USD'});
    $('score-detail').innerHTML='<h3>'+($('outcome').value==='pass'?'Pass: task price plus returned bond':'Fail: returned bond only')+'</h3><p class="note">Settlement score = 1 − squared prediction error. The customer keeps the unreturned bond. '+r.disclosure+'</p>';
    ready();
  }catch(error){if(error.name!=='AbortError')fail(error);}
}
$('confidence').oninput=()=>{$('confidence-label').textContent=Math.round(Number($('confidence').value)*100)+'%';clearTimeout(timer);timer=setTimeout(update,100);};
$('confidence').onchange=()=>{clearTimeout(timer);update();};$('outcome').onchange=update;update();
