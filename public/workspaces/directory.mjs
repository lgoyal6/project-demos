import {$,esc,ready,fail} from './utils.mjs';
import {data} from './charts.mjs';
let projects;
const groups={tools:{title:'Interactive tools',slugs:['repomap','contract-to-revenue','bench','gcapi','hackqueue','actiongate','memharness','pms-race','wildfire-preproc','night-shift-coach']},evidence:{title:'Evidence explorers',slugs:['chip-placer','buildsignal','urbansound8k','blackbox','alongside','firecracker','midnight-mandate','status-clock','flightrisk','apparatus-comps','job-discovery']},study:{title:'Research and reconstruction',slugs:['routing-lab','helmet-identification']}};
function draw(){
  const query=$('search').value.trim().toLowerCase(),format=$('format').value;let count=0;
  $('project-directory').innerHTML=Object.entries(groups).flatMap(([key,group])=>{
    if(format&&format!==key)return [];
    const rows=group.slugs.map(slug=>projects.find(p=>p.slug===slug)).filter(p=>p&&(p.name+' '+p.scope).toLowerCase().includes(query));count+=rows.length;
    return rows.length?['<section class="directory-group"><h3>'+group.title+'</h3>'+rows.map(p=>'<a class="directory-row" href="/'+p.slug+'/"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.scope)+'</small></span><span aria-hidden="true">↗</span></a>').join('')+'</section>']:[];
  }).join('')||'<p class="empty-directory">No projects match. Try another name or format.</p>';
  $('result-count').textContent=count+' projects';ready();
}
$('search').oninput=draw;$('format').onchange=draw;
try{projects=await data('projects');draw();}catch(error){fail(error);}
