import {overlaps,bounds} from '../../workspaces/chip-geometry.mjs';

export function makeLevel(run,index=0){
  if(run.solver_rejected)throw Error('A puzzle needs an accepted reference placement.');
  const solution=run.after.map(p=>p.slice()),positions=solution.map(p=>p.slice());
  for(const i of [[0],[0,2],[0,2,4]][index])positions[i]=solution[i+1].slice();
  return {positions,solution,widths:run.widths,heights:run.heights,edges:run.edges,pins:run.pin_offsets,board:bounds(solution,run.widths,run.heights)};
}
export function inspect(level,positions){
  const [x,y,w,h]=level.board;
  const outside=positions.flatMap((p,i)=>!p.every(Number.isFinite)||p[0]-level.widths[i]/2<x-1e-6||p[0]+level.widths[i]/2>x+w+1e-6||p[1]-level.heights[i]/2<y-1e-6||p[1]+level.heights[i]/2>y+h+1e-6?[i]:[]);
  const pairs=overlaps(positions,level.widths,level.heights);
  return {pairs,outside,solved:!pairs.length&&!outside.length};
}
export function hintCell(level,positions){
  const state=inspect(level,positions),candidates=[...new Set([...state.pairs.flat(),...state.outside])];
  return candidates.find(i=>positions[i].some((n,axis)=>Math.abs(n-level.solution[i][axis])>1e-6))??candidates[0]??0;
}
