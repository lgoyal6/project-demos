import {$,esc,request,ready} from './utils.mjs';
const defaults=[
  {field:'unit_price',label:'Unit price',value:1200,quote:'Annual service: USD 1,200.00',line:1},
  {field:'quantity',label:'Quantity',value:10,quote:'Quantity: 10 seats',line:2},
  {field:'currency',label:'Currency',value:'USD',quote:'Annual service: USD 1,200.00',line:1},
  {field:'payment_terms',label:'Payment terms',value:'Net 30',quote:'Payment terms: Net 30',line:3}
];
const sourceLines=['Acme Analytics','Annual service: USD 1,200.00','Quantity: 10 seats','Payment terms: Net 30'];
let fields,selected=0,results=[],revision=0,controller,timer;
function renderFields(){
  $('review-fields').innerHTML=fields.map((f,i)=>'<div class="review-row '+(i===selected?'active':'')+'" data-row="'+i+'"><button class="select-field" data-select="'+i+'">'+esc(f.label)+'<span class="field-state" id="state-'+i+'">Checking evidence</span></button><input id="value-'+i+'" data-value="'+i+'" aria-label="'+esc(f.label)+'" '+(typeof defaults[i].value==='number'?'type="number" min="0" max="1000000" step="0.01"':'type="text" maxlength="100"')+' value="'+esc(f.value)+'"></div>').join('');
}
function highlight(){
  const field=fields[selected],quote=field.quote.toLowerCase().trim();let matched=false;
  document.querySelectorAll('.document-line').forEach((button,i)=>{
    const line=sourceLines[i],start=quote?line.toLowerCase().indexOf(quote):-1;
    button.classList.toggle('active',start>=0);
    button.innerHTML=start>=0?esc(line.slice(0,start))+'<mark>'+esc(line.slice(start,start+quote.length))+'</mark>'+esc(line.slice(start+quote.length)):esc(line);
    if(start>=0)matched=true;
  });
  $('evidence-caption').textContent=matched?'Linked evidence for '+field.label.toLowerCase()+': '+field.quote:'No exact quote match is visible. Inspect the original checks on the right.';
}
function showEvidence(){
  const field=fields[selected],result=results.find(r=>r.field===field.field);
  document.querySelectorAll('[data-row]').forEach((row,i)=>row.classList.toggle('active',i===selected));
  $('selected-field-label').textContent=field.label+' evidence';
  $('source-quote').value=field.quote;
  $('selected-verdict').textContent=result?result.decision:'Checking';
  for(const [id,key] of [['quote-check','quote_exists_on_page'],['value-check','value_supported_by_quote']]){
    $(id).textContent=result?(result[key]?'✓':'×'):'·';$(id).classList.toggle('failed',!!result&&!result[key]);
  }
  $('evidence-explanation').textContent=!result?'Checking against the source document.':result.decision==='supported'?'The quote is present and supports the proposed value.':!result.quote_exists_on_page?'The quoted text is not supported by this document. Restore the original quote or correct it.':'The quote occurs in the document, but does not support this value. Correct the value or its evidence.';
  highlight();
}
function selectField(i){selected=i;showEvidence();}
function markPending(){
  $('export-review').disabled=true;$('review-download').hidden=true;$('export-note').textContent='Inputs changed. All fields must be checked again.';
  results=[];$('review-summary').textContent='Checking evidence…';$('selected-verdict').textContent='Checking';
  for(let i=0;i<fields.length;i++){$('state-'+i).textContent='Checking evidence';$('state-'+i).classList.remove('correction');}
  for(const id of ['quote-check','value-check']){$(id).textContent='·';$(id).classList.remove('failed');}
  $('evidence-explanation').textContent='Checking against the source document.';$('progress-fill').style.width='0%';
}
async function validate(){
  clearTimeout(timer);controller?.abort();controller=new AbortController();const current=revision;document.body.dataset.ready='false';$('status').textContent='';
  try{
    const result=await request('/api/run/',{project:'contract-to-revenue',fields:fields.map(({field,value,quote})=>({field,value,quote}))},controller.signal);
    if(current!==revision)return;
    $('export-review').disabled=result.supported!==4;$('export-note').textContent=result.supported===4?'All four values are supported. You can download this reviewed snapshot.':'Correct the remaining evidence before creating a handoff.';
    results=result.rows;$('review-summary').textContent=result.supported+' of 4 fields supported';$('progress-fill').style.width=result.supported/4*100+'%';
    results.forEach((r,i)=>{$('state-'+i).textContent=r.decision==='supported'?'Supported by source':'Needs correction';$('state-'+i).classList.toggle('correction',r.decision!=='supported');});
    showEvidence();ready();
  }catch(error){if(error.name==='AbortError')return;$('status').textContent=error.message;$('review-summary').textContent='Review could not complete';$('selected-verdict').textContent='Unverified';ready();}
}
function changed(){
  revision++;controller?.abort();clearTimeout(timer);document.body.dataset.ready='false';markPending();highlight();timer=setTimeout(validate,350);
}
function load(){
  controller?.abort();revision++;clearTimeout(timer);fields=defaults.map(f=>({...f}));selected=0;results=[];
  if($('scenario').value==='amount')fields[0].value=999;
  if($('scenario').value==='quote')fields[0].quote='Annual service: USD 999.00';
  renderFields();markPending();showEvidence();validate();
}
$('review-fields').addEventListener('click',event=>{const b=event.target.closest('[data-select]');if(b)selectField(Number(b.dataset.select));});
$('review-fields').addEventListener('focusin',event=>{if(event.target.dataset.value!==undefined)selectField(Number(event.target.dataset.value));});
$('review-fields').addEventListener('input',event=>{
  if(event.target.dataset.value===undefined)return;
  const i=Number(event.target.dataset.value);fields[i].value=event.target.value;changed();
});
$('source-quote').addEventListener('input',()=>{fields[selected].quote=$('source-quote').value;changed();});
document.querySelectorAll('.document-line').forEach(button=>button.onclick=()=>{
  const index=fields.findIndex(f=>f.line===Number(button.dataset.line));if(index>=0)selectField(index);
});
$('restore-field').onclick=()=>{fields[selected]={...defaults[selected]};$('value-'+selected).value=fields[selected].value;changed();showEvidence();};
$('scenario').onchange=load;$('reset-review').onclick=()=>{$('scenario').value='clean';load();};
load();

$('export-review').onclick=()=>{if(results.length!==4||results.some(r=>r.decision!=='supported'))return;const prior=$('review-download').href;if(prior.startsWith('blob:'))URL.revokeObjectURL(prior);const packet={document:'Acme Analytics, synthetic order form',source_excerpt:sourceLines.join('\n'),fields:results,scope:'Reviewed synthetic evidence handoff. No catalog import, invoice or external delivery.'};$('review-download').href=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}));$('review-download').hidden=false;$('export-note').textContent='Reviewed snapshot ready to save. Editing any field invalidates this handoff.';};
