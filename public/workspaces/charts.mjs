import {esc} from './utils.mjs';
export async function data(name){const response=await fetch('/data/'+name+'.json');if(!response.ok)throw Error('The recorded data could not load. Reload to retry.');return response.json();}
export const number=(value,digits=0)=>Number(value).toLocaleString('en-US',{maximumFractionDigits:digits});
export function facts(rows){return '<div class="inline-facts">'+rows.map(([value,label])=>'<div><strong>'+esc(value)+'</strong><small>'+esc(label)+'</small></div>').join('')+'</div>';}
export function table(rows,columns){
  return '<div class="table-scroll"><table class="data-table"><thead><tr>'+columns.map(([key,label])=>'<th scope="col">'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+columns.map(([key])=>'<td>'+esc(row[key]??'Not recorded')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
export function bars(rows,max=Math.max(...rows.map(r=>Number(r[1])),1)){
  return '<div class="bar-rows">'+rows.map(([label,value,suffix=''])=>'<div class="bar-row"><span>'+esc(label)+'</span><div class="bar-track"><span style="width:'+Math.max(0,Math.min(100,value/max*100))+'%"></span></div><span>'+esc(number(value,2)+suffix)+'</span></div>').join('')+'</div>';
}
export function plot(series,labels,{min=0,max=100,label='',suffix=''}={}){
  const width=700,height=260,left=40,bottom=32,top=18,usable=height-bottom-top,x=i=>left+i*(width-left-15)/Math.max(labels.length-1,1),y=v=>top+usable-(v-min)/Math.max(max-min,.01)*usable;
  return '<svg class="plot" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(label)+'">'+[0,.5,1].map(v=>'<line class="gridline" x1="'+left+'" x2="'+(width-10)+'" y1="'+y(min+(max-min)*v)+'" y2="'+y(min+(max-min)*v)+'"/><text x="3" y="'+(y(min+(max-min)*v)+4)+'">'+number(min+(max-min)*v,1)+'</text>').join('')+series.map((values,s)=>'<path class="series '+(s?'comparison':'')+'" d="'+values.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v)).join(' ')+'"/>'+values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(s?2:3)+'" style="'+(s?'fill:#aab6c0':'')+'"><title>'+esc(labels[i]+': '+number(v,3)+suffix)+'</title></circle>').join('')).join('')+labels.map((l,i)=>'<text x="'+x(i)+'" y="'+(height-7)+'" text-anchor="middle">'+esc(l)+'</text>').join('')+'</svg>';
}
