import {$,esc,request,ready} from './utils.mjs';
const examples={
  shop:{
    'main.ts':"import { total } from './cart';\nimport { formatPrice } from './format';\n\nexport function checkout() {\n  return formatPrice(total([12, 24, 8]));\n}\n",
    'cart.ts':"import { add } from './math';\n\nexport function total(prices: number[]) {\n  return prices.reduce(add, 0);\n}\n",
    'math.ts':"export function add(a: number, b: number) {\n  return a + b;\n}\n",
    'format.ts':"export function formatPrice(amount: number) {\n  return '$' + amount.toFixed(2);\n}\n"
  },
  comment:{
    'main.ts':"import { add } from './math';\n\n// add(2, 3) is only a comment.\nexport function run() {\n  return 0;\n}\n",
    'math.ts':"export function add(a: number, b: number) {\n  return a + b;\n}\n"
  },
  rust:{'main.rs':"mod math;\n\nfn main() {\n  math::add(2, 3);\n}\n",'math.rs':"pub fn add(a: i32, b: i32) -> i32 {\n  a + b\n}\n"}
};
let files,active,graph={nodes:[],edges:[]},flat=[],selectedEdge=-1,timer,controller,revision=0;
const editor=$('source-editor');
function fileNodes(nodes){return nodes.flatMap(n=>n.type==='file'?[n]:n.type==='folder'?fileNodes(n.children||[]):[]);}
function lineNumbers(){
  $('line-numbers').textContent=editor.value.split('\n').map((_,i)=>i+1).join('\n');
  $('source-size').textContent=editor.value.length.toLocaleString()+' characters';
}
function cursor(){const line=editor.value.slice(0,editor.selectionStart).split('\n').length;$('cursor-position').textContent='Line '+line;}
function openFile(name,line){
  active=name;editor.value=files[name];$('active-file').textContent=name;lineNumbers();cursor();
  $('file-list').innerHTML=Object.keys(files).map(f=>'<button data-file="'+esc(f)+'" aria-pressed="'+(f===name)+'">'+esc(f)+'</button>').join('');
  if(line!==undefined){
    const lines=editor.value.split('\n'),start=lines.slice(0,line).reduce((n,s)=>n+s.length+1,0);
    editor.focus();editor.setSelectionRange(start,start+lines[line].length);editor.scrollTop=Math.max(0,(line-4)*23);cursor();
  }
  drawGraph();
}
function targetFile(edge){return edge.to.split(':')[0];}
function inspectEdge(index){
  selectedEdge=index;const edge=graph.edges[index],source=files[edge.from];
  if(source===undefined)return;
  const name=targetFile(edge).split('/').pop().replace(/\.[^.]+$/,'');
  const line=source.split('\n').findIndex(text=>edge.type==='calls'?text.includes(edge.to.split(':')[1]+'('):text.includes(name)&&/import|require/.test(text));
  openFile(edge.from,line<0?undefined:line);drawEdges();
}
function drawEdges(){
  $('edge-list').innerHTML=graph.edges.length?graph.edges.map((e,i)=>'<button data-edge="'+i+'" class="'+(selectedEdge===i?'selected':'')+'">'+esc(e.from)+' → '+esc(e.to)+' <span class="subtle">('+esc(e.type)+')</span></button>').join(''):'<p class="note">No import or call edges were returned.</p>';
}
function drawGraph(){
  const width=520,height=Math.max(260,flat.length*68),positions={};
  flat.forEach((node,i)=>{positions[node.id]=[i%2?350:145,48+Math.floor(i/2)*135];});
  const elements=graph.edges.map((e,i)=>{
    const a=positions[e.from],b=positions[targetFile(e)];if(!a||!b)return '';
    const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.min(87/Math.max(Math.abs(dx),.001),32/Math.max(Math.abs(dy),.001));
    const end=[b[0]-dx*t,b[1]-dy*t];
    return '<path class="graph-edge '+(selectedEdge===i?'selected':'')+'" data-edge="'+i+'" tabindex="0" role="button" aria-label="'+esc(e.from+' '+e.type+' '+e.to)+'" d="M '+a[0]+' '+a[1]+' Q '+((a[0]+b[0])/2)+' '+((a[1]+b[1])/2-35)+' '+end[0]+' '+end[1]+'" marker-end="url(#arrow)"/>';
  }).join('')+flat.map(node=>{
    const [x,y]=positions[node.id],functions=new Set((node.children||[]).filter(n=>n.type==='function').map(n=>n.name));
    return '<g class="graph-node '+(node.id===active?'selected':'')+'" data-node="'+esc(node.id)+'" tabindex="0" role="button" aria-label="Open '+esc(node.id)+'"><rect x="'+(x-84)+'" y="'+(y-25)+'" width="168" height="58"/><text x="'+x+'" y="'+(y-2)+'" text-anchor="middle">'+esc(node.id)+'</text><text class="node-meta" x="'+x+'" y="'+(y+17)+'" text-anchor="middle">'+functions.size+' detected '+(functions.size===1?'symbol':'symbols')+'</text></g>';
  }).join('');
  $('dependency-graph').setAttribute('viewBox','0 0 '+width+' '+height);
  $('dependency-graph').innerHTML='<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#b8c5d0"/></marker></defs>'+elements;
  $('graph-empty').hidden=graph.edges.length>0;
}
async function update(){
  clearTimeout(timer);controller?.abort();controller=new AbortController();const current=revision;
  document.body.dataset.ready='false';$('run-graph').disabled=true;$('edit-state').textContent='Parsing…';$('status').textContent='';
  try{
    const result=await request('/api/node/',{project:'repomap',files},controller.signal);
    if(current!==revision)return;
    graph=result.graph;flat=fileNodes(graph.nodes);selectedEdge=-1;drawGraph();drawEdges();
    $('graph-count').textContent=flat.length+' files / '+graph.edges.length+' edges';
    $('edit-state').textContent='Graph up to date';
    $('extractor-note').textContent=$('example').value==='rust'?'Rust files are discovered, but the original extractor has no Rust import or function branch.':'Original regex extraction. Export detection is limited; call-like comments can be ambiguous. Edges do not prove execution.';
    ready();
  }catch(error){
    if(error.name==='AbortError')return;
    $('status').textContent=error.message;$('edit-state').textContent='Graph update failed';ready();
  }finally{if(current===revision)$('run-graph').disabled=false;}
}
function load(){
  controller?.abort();revision++;clearTimeout(timer);files={...examples[$('example').value]};graph={nodes:[],edges:[]};flat=[];selectedEdge=-1;
  openFile(Object.keys(files)[0]);drawEdges();update();
}
editor.addEventListener('input',()=>{
  files[active]=editor.value;revision++;controller?.abort();$('run-graph').disabled=false;lineNumbers();cursor();$('edit-state').textContent='Graph needs update';$('graph-count').textContent='Previous graph';document.body.dataset.ready='false';clearTimeout(timer);
  if($('auto-run').checked)timer=setTimeout(update,550);
});
editor.addEventListener('scroll',()=>{$('line-numbers').scrollTop=editor.scrollTop;});
editor.addEventListener('click',cursor);editor.addEventListener('keyup',cursor);
editor.addEventListener('keydown',event=>{
  if(event.key==='Tab'&&!event.shiftKey){
    event.preventDefault();editor.setRangeText('  ',editor.selectionStart,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));
  }
});
$('file-list').onclick=event=>{const b=event.target.closest('[data-file]');if(b)openFile(b.dataset.file);};
$('dependency-graph').addEventListener('click',event=>{
  const edge=event.target.closest('[data-edge]'),node=event.target.closest('[data-node]');
  if(edge)inspectEdge(Number(edge.dataset.edge));else if(node)openFile(node.dataset.node);
});
$('dependency-graph').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('edge-list').onclick=event=>{const b=event.target.closest('[data-edge]');if(b)inspectEdge(Number(b.dataset.edge));};
$('example').onchange=load;$('reset-code').onclick=load;$('run-graph').onclick=update;$('auto-run').onchange=()=>{clearTimeout(timer);if($('auto-run').checked)update();};
load();
