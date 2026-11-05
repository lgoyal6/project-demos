import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeLevel,inspect,hintCell} from '../public/experiments/chip-placer/model.mjs';
import {missions,inspectRoute} from '../public/experiments/routing-lab/model.mjs';
import {caseFields,reviewResult} from '../public/experiments/contract-to-revenue/model.mjs';
import {questions,supportsQuestion} from '../public/experiments/blackbox/model.mjs';
import {route} from '../public/workspaces/routing-model.mjs';

const runs=JSON.parse(await readFile(new URL('../public/data/chip.json',import.meta.url)));
const reference=runs.find(r=>!r.solver_rejected),original=JSON.stringify(reference);
for(let i=0;i<3;i++){
  const level=makeLevel(reference,i);
  assert.equal(inspect(level,level.positions).solved,false,'A puzzle must start unsolved');
  assert.equal(inspect(level,level.solution).solved,true,'Every puzzle must have a known valid solution');
  const hinted=hintCell(level,level.positions);
  assert.notDeepEqual(level.positions[hinted],level.solution[hinted],'A hint must identify a cell that actually needs moving');
  const outside=level.solution.map(p=>p.slice());outside[0]=[1000,1000];
  assert.equal(inspect(level,outside).solved,false,'No victory by moving a cell outside the board');
  outside[0]=[NaN,0];assert.equal(inspect(level,outside).solved,false,'Invalid coordinates cannot complete a puzzle');
}
assert.equal(JSON.stringify(reference),original,'Recorded evidence must not be mutated');
assert.throws(()=>makeLevel(runs.find(r=>r.solver_rejected),0));
const winning=[['A','C','D'],['A','B','D'],['A','B','C','D']];
missions.forEach((mission,i)=>{
  assert.equal(inspectRoute(winning[i],mission).delivered,true);
  assert.ok(route('A','D',mission.links).cost<=mission.budget,'Each mission has an available solution within budget');
  assert.equal(inspectRoute(['A'],mission).delivered,false);
  assert.equal(inspectRoute(['A','D'],mission).valid,false,'A nonexistent direct link must fail');
  assert.equal(inspectRoute(['A','B','A','C','D'],mission).valid,false,'Loops are not accepted as delivery paths');
});
assert.equal(inspectRoute(['A','B','D'],missions[0]).delivered,false,'Arrival alone does not satisfy the budget');
assert.equal(inspectRoute(['A','C','D'],missions[1]).valid,false,'A down link cannot carry the packet');
assert.equal(inspectRoute(['A','B','D'],missions[2]).valid,false);
const events=JSON.parse(await readFile(new URL('../public/data/blackbox.json',import.meta.url))),tasks=questions(events);
for(const task of tasks){
  assert.equal(supportsQuestion(task.event,task),true);
  assert.equal(supportsQuestion(events.find(e=>e.seq!==task.event.seq),task),false,'A plausible but wrong citation must not advance the notebook');
}
assert.equal(tasks[2].event.payload.state,'awaiting');
assert.equal(caseFields(0)[0].value,999);assert.equal(caseFields(1)[0].quote,'Annual service: USD 999.00');
const good={rows:caseFields(2).map(f=>({...f,quote_exists_on_page:true,value_supported_by_quote:true,decision:'supported'}))};
assert.deepEqual(reviewResult('approve',good),{supported:true,correct:true});
assert.equal(reviewResult('flag',good).correct,false);
const invented=structuredClone(good);invented.rows[0].quote_exists_on_page=false;
assert.equal(reviewResult('approve',invented).supported,false,'Matching value is insufficient when the quote is absent');
const wrongValue=structuredClone(good);wrongValue.rows[0].value_supported_by_quote=false;
assert.equal(reviewResult('flag',wrongValue).correct,true);
assert.equal(reviewResult('approve',{rows:[]}).supported,false,'No empty or unavailable check can count as approval');
console.log('Four experiment domain checks passed: placement bounds, valid routes/budgets, original citations and independent evidence checks.');
