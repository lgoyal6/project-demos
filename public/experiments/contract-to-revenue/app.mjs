import {$,esc,request,ready} from '../../workspaces/utils.mjs';
import {caseFields,reviewResult} from './model.mjs';
let index=0,fields=[],verdict=null,firstChoices=[],corrected=new Set(),busy=false,revision=0,controller;
const values=()=>fields.map(({field,value,quote})=>({field,value,quote}));
function lock(value){busy=value;for(const id of ['approve','flag','verify'])$(id).disabled=value;document.body.dataset.ready=String(!value);}
function extraction(){
  $('extraction').innerHTML=fields.map(f=>'<div class="field-line"><span>'+esc(f.label)+'</span><strong>'+esc(f.field==='unit_price'?'USD '+Number(f.value).toLocaleString('en-US',{minimumFractionDigits:2}):String(f.value))+'</strong></div>').join('');
  $('attached-quote').textContent=fields[0].quote;
}
function load(){
  controller?.abort();revision++;fields=caseFields(index);verdict=null;lock(false);
  $('tray-count').textContent=(index+1)+' / 3';$('task-number').textContent='Extraction '+(index+1);
  $('tray-progress').innerHTML=[0,1,2].map(i=>'<i class="'+(i<index?'done':'')+'" aria-label="Extraction '+(i+1)+(i<index?' reviewed':'')+'"></i>').join('');
  $('decisions').hidden=false;$('correction').hidden=true;$('next').hidden=true;$('receipt').hidden=true;document.querySelector('.desk').hidden=false;
  $('feedback').textContent='Does every extracted value have support in the source?';$('feedback').removeAttribute('data-correct');$('status').textContent='';extraction();ready();
  $('task-state').textContent='Awaiting your decision';
}
async function check(choice,correction=false){
  if(busy)return;const current=++revision;controller?.abort();controller=new AbortController();lock(true);$('status').textContent='';
  $('feedback').textContent=correction?'Verifying the correction against the source…':'Revealing the evidence checks…';
  $('task-state').textContent='Checking evidence';
  try{
    const result=await request('/api/run/',{project:'contract-to-revenue',fields:values()},controller.signal);if(current!==revision)return;
    verdict=reviewResult(choice,result);
    if(!correction&&firstChoices[index]===undefined)firstChoices[index]=verdict.correct;
    $('decisions').hidden=true;$('feedback').dataset.correct=correction?verdict.supported:verdict.correct;
    if(verdict.supported){
      $('task-state').textContent='Verified against source';
      if(correction)corrected.add(index);
      $('feedback').textContent=correction?'Correction verified. Every value and quote now has support in the document.':verdict.correct?'Approved with evidence. All four fields are supported by the source.':'The checks support all four fields. This extraction can be approved; no correction is needed.';
      $('correction').hidden=true;$('next').hidden=false;$('next').textContent=index===2?'Finish review':'Review next extraction';
    }else{
      $('task-state').textContent='Needs correction';
      const issue=result.rows.find(r=>!r.quote_exists_on_page||!r.value_supported_by_quote);
      $('feedback').textContent=(correction?'There is still an issue. ':verdict.correct?'Good catch. ':'That approval would miss an issue. ')+(issue?.quote_exists_on_page?'The quote exists, but it does not support the extracted value.':'The attached quote is not present in the source document.');
      $('correction').hidden=false;$('price').value=fields[0].value;$('quote').value=fields[0].quote;
    }
  }catch(error){if(error.name==='AbortError')return;$('task-state').textContent='Checks unavailable';$('status').textContent=error.message+' Nothing was marked complete.';$('feedback').textContent='Verification did not finish. Retry when the original checks are available.';}
  finally{if(current===revision){lock(false);ready();}}
}
$('approve').onclick=()=>check('approve');$('flag').onclick=()=>check('flag');
$('verify').onclick=()=>{
  const value=Number($('price').value),quote=$('quote').value.trim();
  if(!Number.isFinite(value)||value<0||value>1000000||!quote){$('status').textContent='Enter a finite price from 0 to 1,000,000 and a source quote.';return;}
  fields[0].value=value;fields[0].quote=quote;extraction();check('flag',true);
};
$('next').onclick=()=>{
  if(busy||!verdict?.supported)return;
  if(index<2){index++;load();return;}
  document.querySelector('.desk').hidden=true;$('receipt').hidden=false;$('tray-progress').innerHTML=[0,1,2].map(()=>'<i class="done"></i>').join('');
  $('receipt-copy').textContent='You reviewed all three synthetic extractions and verified '+corrected.size+' corrections. '+firstChoices.filter(Boolean).length+' of your 3 first decisions matched the original checks. These counts describe this practice session only.';
  $('receipt').scrollIntoView({behavior:'auto',block:'start'});
};
function restart(){index=0;firstChoices=[];corrected.clear();load();}
$('restart').onclick=restart;$('again').onclick=restart;load();
