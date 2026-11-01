import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {route} from '../public/workspaces/routing-model.mjs';
import {overlaps} from '../public/workspaces/chip-geometry.mjs';

const links=[{a:'A',b:'B',cost:10,up:true},{a:'B',b:'D',cost:10,up:true},{a:'A',b:'C',cost:1,up:true},{a:'C',b:'D',cost:1,up:true}];
assert.deepEqual(route('A','D',links).path,['A','C','D']);
assert.equal(route('A','D',links).cost,2);
assert.equal(route('A','D',links,false).cost,2);
assert.deepEqual(route('A','D',links.filter(l=>l.a!=='A')).path,[]);
assert.deepEqual(route('A','A',links),{path:['A'],cost:0});
const records=JSON.parse(await readFile(new URL('../public/data/chip.json',import.meta.url),'utf8'));
for(const record of records){
  const pairs=overlaps(record.after,record.widths,record.heights);
  assert.equal(pairs.length,record.overlapping_pairs);
  assert.equal(pairs.length>0,record.solver_rejected);
}
const accepted=records.find(r=>!r.solver_rejected),edited=accepted.after.map(p=>p.slice());
edited[2]=edited[0].slice();
assert.ok(overlaps(edited,accepted.widths,accepted.heights).some(pair=>pair.includes(0)&&pair.includes(2)));
assert.equal(overlaps(accepted.after,accepted.widths,accepted.heights).length,0);
console.log('Routing reachability/cost and recorded/live placement invariants passed.');
