import {$,esc,ready,fail} from './utils.mjs';
import {data,facts,table,number} from './charts.mjs';
let evidence,stage='payment';
const descriptions={'over-cap':'The original test submitted a proposal over the per-payment cap.','cumulative-budget':'The original test exceeded the cumulative spending budget.','wrong-recipient':'The original test used a recipient outside the mandate.','replay':'The original test replayed a previously used proposal.','closed-vault':'The original test attempted payment after the vault closed.'};
function receipt(label,id){return '<div class="receipt"><strong>'+esc(label)+'</strong><br><code>'+esc(id)+'</code></div>';}
function draw(){
  document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stage===stage)));
  if(stage==='payment'){
    $('receipt-content').innerHTML='<h3>Recorded payment</h3>'+facts([[evidence.vaultBeforePayment,'vault before'],[evidence.vaultAfterPayment,'vault after'],[evidence.vendorAfterPayment-evidence.vendorBeforePayment,'recipient increase']])+table([{account:'Vault',before:evidence.vaultBeforePayment,after:evidence.vaultAfterPayment},{account:'Recipient',before:evidence.vendorBeforePayment,after:evidence.vendorAfterPayment}],[['account','Account'],['before','Before (units)'],['after','After (units)']])+'<p class="note">Receipt verified on ledger in the original recording: '+(evidence.receiptVerifiedOnLedger?'yes':'no')+'. Balances are recorded units.</p>'+receipt('Payment transaction',evidence.paymentTxId);
  }else if(stage==='recovery'){
    $('receipt-content').innerHTML='<h3>Recorded owner recovery</h3>'+facts([[evidence.ownerAfterRecovery-evidence.ownerBeforeRecovery,'returned to owner'],[evidence.vaultAfterClose,'vault after close'],[String(evidence.activeAfterClose),'active after close']])+receipt('Close transaction',evidence.closeTxId)+'<p class="note">The stored evidence records owner recovery and a closed vault.</p>';
  }else{
    $('receipt-content').innerHTML='<h3>Original rejected cases</h3><label class="field">Rejection to inspect<select id="rejection">'+evidence.rejected.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('')+'</select></label><p class="note" id="rejection-detail"></p><div class="quiet-banner">All cases listed here were rejected in the stored smoke-run evidence. No new proposal is executed.</div>';
    $('rejection').onchange=()=>{$('rejection-detail').textContent=descriptions[$('rejection').value]||'Rejected in the original stored run.';};$('rejection').onchange();
  }
}
$('receipt-stage').onclick=event=>{const b=event.target.closest('[data-stage]');if(b){stage=b.dataset.stage;draw();}};
try{evidence=await data('midnight');draw();ready();}catch(error){fail(error);}
