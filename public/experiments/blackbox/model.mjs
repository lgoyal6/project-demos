export function questions(events){
  const status=events.find(e=>e.kind==='status'&&e.payload.unit),retrieval=events.find(e=>e.kind==='retrieval'),readback=events.find(e=>e.kind==='readback'&&e.payload.state==='awaiting');
  if(!status||!retrieval||!readback)throw Error('The recorded investigation evidence is incomplete.');
  return [
    {title:'Establish who was there.',prompt:'Find the original status record identifying the unit on scene. Pin that record to your notebook.',event:status,quote:'Unit '+status.payload.unit+' was on scene.',hint:'The first status record contains the unit assignment.'},
    {title:'Trace the first retrieval.',prompt:'Find the first recorded retrieval query. Cite the retrieval event itself, rather than a later spoken message.',event:retrieval,quote:retrieval.payload.query,hint:'Look for an event whose kind is retrieval.'},
    {title:'Was the readback confirmed?',prompt:'Find the record showing that a readback was still awaiting confirmation at this checkpoint.',event:readback,quote:'Readback state: '+readback.payload.state+'.',hint:'The readback event stores its confirmation state explicitly.'}
  ];
}
export function supportsQuestion(event,question){return event?.seq===question.event.seq&&event.kind===question.event.kind;}
