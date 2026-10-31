import {$,esc,ready,fail} from './utils.mjs';
import {data} from './charts.mjs';
let fixture,selected;
function draw(){
  const thread=$('thread').value,nodes=fixture.nodes.filter(n=>n.thread===thread),edges=fixture.edges.filter(e=>e[2]===thread),positions={};
  if(!nodes.some(n=>n.id===selected))selected=nodes[0].id;
  nodes.forEach((n,i)=>positions[n.id]=[125+i%3*230,90+Math.floor(i/3)*165]);
  $('evidence-graph').setAttribute('viewBox','0 0 710 '+(Math.ceil(nodes.length/3)*165+30));
  $('evidence-graph').innerHTML=edges.map(([from,to])=>'<line x1="'+positions[from][0]+'" y1="'+positions[from][1]+'" x2="'+positions[to][0]+'" y2="'+positions[to][1]+'"/>').join('')+nodes.map(n=>{
    const [x,y]=positions[n.id],short=n.label.length>33?n.label.slice(0,30)+'…':n.label;
    const first=short.slice(0,17),second=short.slice(17);
    return '<g data-node="'+esc(n.id)+'" class="'+(n.id===selected?'selected':'')+'" role="button" tabindex="0" aria-label="'+esc(n.label)+'"><rect x="'+(x-98)+'" y="'+(y-38)+'" width="196" height="76"/><title>'+esc(n.label)+'</title><text text-anchor="middle" x="'+x+'" y="'+(y-9)+'">'+esc(first)+'</text><text text-anchor="middle" x="'+x+'" y="'+(y+9)+'">'+esc(second)+'</text><text text-anchor="middle" x="'+x+'" y="'+(y+28)+'" style="font-size:9px;fill:#8a98a4">'+esc(n.meta||n.kind)+'</text></g>';
  }).join('');
  const node=nodes.find(n=>n.id===selected),detail=fixture.details[thread];
  $('node-kind').textContent=node.kind;$('node-title').textContent=node.meta||'Selected evidence';$('node-quote').textContent=node.label;
  const related=[...new Set(edges.filter(e=>e[0]===selected||e[1]===selected).flatMap(e=>e.slice(0,2)).filter(id=>id!==selected))];
  $('node-links').innerHTML=related.map(id=>'<p><button data-link="'+esc(id)+'">'+esc(nodes.find(n=>n.id===id).label)+'</button></p>').join('')||'<p>No connected nodes.</p>';
  $('thread-title').textContent=detail.title;$('thread-context').textContent=detail.body;
  $('evidence-hops').innerHTML=detail.hops.map(h=>'<li>'+esc(h.text)+'<br><small>'+esc(h.src)+'</small></li>').join('');
}
function activate(event){const target=event.target.closest('[data-node]');if(target){selected=target.dataset.node;draw();}}
$('evidence-graph').onclick=activate;$('evidence-graph').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(event);}};
$('node-links').onclick=event=>{const target=event.target.closest('[data-link]');if(target){selected=target.dataset.link;draw();}};
$('thread').onchange=()=>{selected=null;draw();};
try{fixture=await data('alongside');$('thread').innerHTML=fixture.threads.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.label)+'</option>').join('');draw();ready();}catch(error){fail(error);}
