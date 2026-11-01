import {$,esc,ready,fail} from './utils.mjs';
let revision=0;
async function update(){
  const current=++revision;document.body.dataset.ready='false';$('status').textContent='';
  try{
    const response=await fetch('/status-clock/contracts/fixtures/clocks_'+$('persona').value+'.json');if(!response.ok)throw Error('The persona fixture could not load.');
    const fixture=await response.json();if(current!==revision)return;
    $('as-of').textContent='Recorded as of '+fixture.as_of;
    $('clock-wall').innerHTML=fixture.clocks.filter(c=>c.applicable).map(c=>{
      const p=c.provenance,consumption=c.kind==='consumption'&&c.days_consumed!==null;
      const label=c.label||c.clock_key?.replaceAll('_',' ')||'Recorded clock';
      const value=consumption?c.days_consumed+' / '+c.denominator:c.days_remaining!==null?c.days_remaining:c.window_end||'See record';
      const remaining=c.days_remaining!==null?c.days_remaining+' days remaining in the fixture':'Recorded window end';
      return '<article class="clock-card"><h3>'+esc(label)+'</h3><span class="tag">'+(p.verified?'Source verified in fixture':'Source unverified in fixture')+'</span><div class="clock-value">'+esc(value)+'</div><p class="clock-remaining">'+esc(consumption?'Days consumed · '+remaining:remaining)+'</p>'+(consumption?'<div class="balance-bar"><span style="width:'+Math.min(100,c.days_consumed/c.denominator*100)+'%"></span></div>':'')+'<a class="rule-link" href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.citation)+'</a><p class="note">Effective from '+esc(p.effective_from)+'</p><details><summary>Why this value?</summary><p>'+esc(c.derivation||'This value is copied directly from the original clock fixture.')+'</p><p>Window: '+esc(c.window_start||'Not recorded')+' to '+esc(c.window_end||'Not recorded')+'</p><p>Engine version: '+esc(c.engine_version)+'</p></details></article>';
    }).join('');
    const inactive=fixture.clocks.filter(c=>!c.applicable);
    $('inactive-clocks').innerHTML=inactive.length?'<ul class="note">'+inactive.map(c=>'<li>'+esc(c.label)+': '+esc(c.not_applicable_reason||'Not applicable in this fixture.')+'</li>').join('')+'</ul>':'<p class="note">All clocks in this persona fixture are applicable.</p>';
    ready();
  }catch(error){if(current===revision)fail(error);}
}
$('persona').onchange=update;update();
