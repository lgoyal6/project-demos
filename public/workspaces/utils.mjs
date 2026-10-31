export const $=id=>document.getElementById(id);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function request(endpoint,body,signal){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  const result=await response.json();
  if(!response.ok||result.error)throw Error(result.error||'The request failed. Try again.');
  return result;
}
export function ready(){document.body.dataset.ready='true';}
export function fail(error){$('status').textContent=error.message;ready();}
