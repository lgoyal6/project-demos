import {$,esc,request,ready,fail} from './utils.mjs';
import {facts} from './charts.mjs';
let revision=0;
async function update(){
  const current=++revision;document.body.dataset.ready='false';$('preflight').disabled=true;$('status').textContent='';
  const environment=$('environment').value,target=$('target').value;
  const hosts={production:'https://www.givecampus.com/api',sandbox:'https://sandbox.givecampus.com/api',unknown:'https://example.invalid/api'};
  $('request-url').textContent=hosts[target];
  try{
    const r=await request('/api/run/',{project:'gcapi',environment,target});if(current!==revision)return;
    $('trace').innerHTML='<li><strong>Read the token declaration</strong><small>'+esc(environment)+'</small></li><li><strong>Identify the target environment</strong><small>'+esc(r.url_environment)+'</small></li><li><strong>'+ (r.decision==='allow'?'Allow at preflight boundary':'Stop at preflight boundary')+'</strong><small>No vendor request is sent in this demo.</small></li>';
    $('decision').textContent=r.decision==='allow'?'Allowed by the guard':'Request refused';
    $('reason').textContent=r.reason;$('call-count').innerHTML=facts([[r.network_calls,'vendor network calls']]);ready();
  }catch(error){if(current===revision)fail(error);}
  finally{if(current===revision)$('preflight').disabled=false;}
}
$('preflight').onclick=update;$('environment').onchange=update;$('target').onchange=update;update();
