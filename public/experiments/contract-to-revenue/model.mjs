export const originalFields=[
  {field:'unit_price',label:'Unit price',value:1200,quote:'Annual service: USD 1,200.00'},
  {field:'quantity',label:'Quantity',value:10,quote:'Quantity: 10 seats'},
  {field:'currency',label:'Currency',value:'USD',quote:'Annual service: USD 1,200.00'},
  {field:'payment_terms',label:'Payment terms',value:'Net 30',quote:'Payment terms: Net 30'}
];
export function caseFields(index){
  const fields=originalFields.map(f=>({...f}));
  if(index<2)fields[0].value=999;
  if(index===1)fields[0].quote='Annual service: USD 999.00';
  return fields;
}
export function reviewResult(choice,result){
  const supported=result.rows.length===4&&result.rows.every(row=>row.quote_exists_on_page&&row.value_supported_by_quote&&row.decision==='supported');
  return {supported,correct:choice===(supported?'approve':'flag')};
}
