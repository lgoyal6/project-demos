export function overlaps(positions,widths,heights){
  const pairs=[];
  for(let i=0;i<positions.length;i++)for(let j=0;j<i;j++){
    if(Math.abs(positions[i][0]-positions[j][0])<(widths[i]+widths[j])/2-1e-6&&Math.abs(positions[i][1]-positions[j][1])<(heights[i]+heights[j])/2-1e-6)pairs.push([i,j]);
  }
  return pairs;
}
export function bounds(positions,widths,heights){
  const x=Math.min(...positions.map((p,i)=>p[0]-widths[i]/2))-2,y=Math.min(...positions.map((p,i)=>p[1]-heights[i]/2))-2;
  return [x,y,Math.max(...positions.map((p,i)=>p[0]+widths[i]/2))+2-x,Math.max(...positions.map((p,i)=>p[1]+heights[i]/2))+2-y];
}
