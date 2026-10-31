import {laneFor} from '../vendor/hackqueue_lanes.mjs';
import {DependencyService} from '../vendor/repomap.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function run(body){
  if(body.project==='hackqueue'){
    const cash=Number(body.cash);
    if(!Number.isFinite(cash)||cash<0||cash>1000000)throw new Error('Cash must be between 0 and 1,000,000.');
    const organizer=String(body.organizer);
    if(!['startup','NVIDIA','community'].includes(organizer))throw new Error('Unknown organizer.');
    if(!['hackathon','trading_competition','hiring_assessment'].includes(body.kind))throw new Error('Unknown event kind.');
    const event={title:organizer==='NVIDIA'?'NVIDIA example event':'Fictional example event',going:100};
    const grade={host:organizer,kind:body.kind,hiringPath:3,brand:organizer==='NVIDIA'?5:1,cashUSD:cash,creditsUSD:0,grant:false,tracks:3,topicFit:4,eligible:'unknown',companies:organizer==='startup'?[{name:'Example startup',role:'host'}]:[]};
    const companies={'Example startup':{isStartup:true,quality:4,hiring:3,linkedinFollowers:0}};
    return {result:laneFor(event,grade,companies),scope:'Fictional event inputs. Ranking only. No Discord message, approval, or build dispatch.'};
  }
  if(body.project==='repomap'){
    const scenario=body.scenario;
    const files=scenario==='javascript'?{'main.ts':"import { add } from './math';\nexport function run(){ return add(2,3); }",'math.ts':'export function add(a:number,b:number){return a+b;}'}:
      scenario==='comment'?{'main.ts':"import { add } from './math';\n// add(2,3) is only a comment.\nexport function run(){return 0;}",'math.ts':'export function add(a:number,b:number){return a+b;}'}:
      scenario==='rust'?{'main.rs':'mod math;\nfn main(){math::add(2,3);}', 'math.rs':'pub fn add(a:i32,b:i32)->i32{a+b}'}:null;
    if(!files)throw new Error('Unknown source fixture.');
    const dir=await mkdtemp(path.join(tmpdir(),'repomap-demo-'));
    try{
      for(const [name,content] of Object.entries(files))await writeFile(path.join(dir,name),content);
      const service=new DependencyService();
      service.workspaceRoot=dir;
      service.getAllSupportedFiles=async()=>Object.keys(files).map(n=>path.join(dir,n));
      const graph=await service.buildDependencyGraph();
      return {files,graph,scope:'Original extractor and resolver with a temporary-file adapter. VS Code and IBM Bob are not connected.',limitation:scenario==='comment'?'This source contains a call-like comment. Regex-based edges do not establish execution; this revision also has export-detection limitations.':scenario==='rust'?'Rust files are discovered, but the original extractor has no Rust import/function branch.':'Relative TypeScript imports are extracted by the original implementation. Inspect the reported edges; this revision has export-detection limitations.'};
    }finally{await rm(dir,{recursive:true,force:true});}
  }
  throw new Error('Unknown experiment.');
}

export default async function handler(req,res){
  if(req.method!=='POST'){res.statusCode=405;return res.end('POST required');}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(JSON.stringify(body).length>4096)throw new Error('Request is too large.');
    const result=await run(body);
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result));
  }catch(error){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:String(error.message).slice(0,200)}));}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let text='';for await(const part of process.stdin)text+=part;
  try{console.log(JSON.stringify(await run(JSON.parse(text))));}catch(error){console.log(JSON.stringify({error:String(error.message)}));process.exitCode=1;}
}
