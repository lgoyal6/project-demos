"""Bounded, credential-free execution of selected original project functions."""
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlparse,parse_qs
from datetime import date
from types import SimpleNamespace
import dataclasses
import importlib.util
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'vendor'))

def module(name, file):
    spec=importlib.util.spec_from_file_location(name, ROOT/'vendor'/file)
    result=importlib.util.module_from_spec(spec)
    sys.modules[name]=result
    spec.loader.exec_module(result)
    return result

def run(body):
    project=body.get('project')
    if project=='night-shift-coach':
        model=module('demo_night_model','night_model.py')
        operation=body.get('operation')
        if operation=='sun_times':
            model._time_mod=SimpleNamespace(timezone=7*3600,daylight=0)
            sunrise,sunset=model._compute_sun_times(32.7157,-117.1611,date(2026,6,21))
            return {'sunrise':sunrise,'sunset':sunset,'location':'San Diego example, June 21, 2026; no location collected'}
        if operation not in {'phase_shift','recommendations'}:raise ValueError('Unknown planner operation.')
        state=body.get('state',{})
        if not isinstance(state,dict):raise ValueError('Planner state must be an object.')
        allowed={k.removeprefix('_') for k in model.DialShim.__slots__}
        clean={}
        bools={'biphasic','show_nap','show_dip','show_night_shift'}
        for key,value in state.items():
            if key not in allowed:continue
            if key in bools:
                if not isinstance(value,bool):raise ValueError('Planner flags must be booleans.')
            elif key=='eating_mode':
                if value not in {'adlib','tr10','tr8'}:raise ValueError('Unknown eating mode.')
            elif key=='ir_curve':
                if not isinstance(value,list) or len(value)!=180 or not all(isinstance(n,(int,float)) and math.isfinite(n) and abs(n)<10000 for n in value):raise ValueError('The physiology curve must contain 180 finite values.')
            elif isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not 0<=value<=(180 if key=='nap_duration' else 24):raise ValueError('Planner timing is outside the supported range.')
            clean[key]=value
        day=body.get('phase_day',0)
        if isinstance(day,bool) or not isinstance(day,int) or not 0<=day<=30:raise ValueError('Phase day must be an integer from 0 to 30.')
        dial,plasma,schedule=model.make_state(**clean)
        if operation=='phase_shift':
            if day<1:raise ValueError('A phase-shift day starts at 1.')
            dlmo,mcbt,shift,curve=model.phase_shift_state(schedule,day)
            dial._dlmo=dlmo;dial._mcbt=mcbt;dial._ir_curve=curve
            return {'dlmo':dlmo,'mcbt':mcbt,'shift_hours':shift,'ir_curve':curve,'rows':model.recommendation_rows(dial,day)}
        return {'rows':model.recommendation_rows(dial,day)}
    if project=='gcapi':
        env=module('demo_gcapi_env','gcapi_env.py')
        target={'production':env.PRODUCTION_BASE_URL,'sandbox':env.SANDBOX_BASE_URL,'unknown':'https://example.invalid/api'}[body['target']]
        declared=env.Environment(body['environment'])
        with TemporaryDirectory() as temp:
            verdict=env.preflight('fictional-demo-token',target,declared_environment=declared,store=env.TokenStore(Path(temp)/'store.json'))
        result=dataclasses.asdict(verdict)
        return {'decision':result['decision'],'reason':result['reason'],'url_environment':result['url_environment'],'token_environment':result['token_environment'],'network_calls':0}
    if project=='contract-to-revenue':
        from contract_to_revenue.checks import quote_on_page, value_in_quote
        source='Acme Analytics\nAnnual service: USD 1,200.00\nQuantity: 10 seats\nPayment terms: Net 30'
        if 'fields' in body:
            fields=body['fields']
            if not isinstance(fields,list) or not 1<=len(fields)<=4:raise ValueError('Review between 1 and 4 fields.')
            rows=[];seen=set()
            for item in fields:
                if not isinstance(item,dict):raise ValueError('Each field must be an object.')
                key=item.get('field')
                if key not in {'unit_price','quantity','payment_terms','currency'} or key in seen:raise ValueError('Use each supported field once.')
                seen.add(key);value=item.get('value');quote=item.get('quote')
                if not isinstance(quote,str) or len(quote)>250:raise ValueError('Source quotes must be at most 250 characters.')
                if key in {'unit_price','quantity'}:
                    if isinstance(value,bool):raise ValueError('Enter a numeric value.')
                    value=float(value)
                    if not math.isfinite(value) or not 0<=value<=1_000_000:raise ValueError('Numeric values must be between 0 and 1,000,000.')
                elif not isinstance(value,str) or len(value)>100:raise ValueError('Text values must be at most 100 characters.')
                on_page=quote_on_page(quote,source);supported=value_in_quote(key,value,quote)
                rows.append({'field':key,'value':value,'quote':quote,'quote_exists_on_page':on_page,'value_supported_by_quote':supported,'decision':'supported' if on_page and supported else 'needs correction'})
            return {'rows':rows,'supported':sum(r['decision']=='supported' for r in rows),'source':source,'extraction':'Original deterministic citation checks on a synthetic excerpt. No model extraction.'}
        amount=float(body['amount'])
        if not math.isfinite(amount) or not 0<=amount<=1_000_000:
            raise ValueError('Amount must be between 0 and 1,000,000.')
        quote=str(body['quote'])
        if len(quote)>250:raise ValueError('Quote is too long.')
        on_page=quote_on_page(quote,source)
        supported=value_in_quote('unit_price',amount,quote)
        return {'decision':'supported' if on_page and supported else 'needs correction','quote_exists_on_page':on_page,'value_supported_by_quote':supported,'amount':amount,'extraction':'No model extraction was run. These are the original deterministic citation checks.'}
    if project=='bench':
        bonds=module('demo_bench_bonds','bench_bonds.py')
        confidence=float(body['confidence'])
        if not math.isfinite(confidence) or not 0<=confidence<=1:raise ValueError('Probability must be between 0 and 1.')
        passed=body['outcome']=='pass'
        agent,customer=bonds.settle(5.25,10.50,confidence,passed)
        curve=[{'confidence':i/10,'pass_agent':bonds.settle(5.25,10.50,i/10,True)[0],'fail_agent':bonds.settle(5.25,10.50,i/10,False)[0]} for i in range(11)]
        return {'disclosure':'Demo payment simulation. No funds moved.','hypothetical_outcome':body['outcome'],'confidence':confidence,'brier_score':bonds.brier_score(confidence,passed),'virtual_amount_to_agent':agent,'virtual_amount_to_customer':customer,'price_only_on_pass':5.25 if passed else 0,'curve':curve}
    if project=='wildfire-preproc':
        import numpy as np
        check=module('demo_wildfire_values','wildfire_values.py')
        case=body['scenario'];grid=np.zeros((20,20),dtype=np.int32);grid[5:15,5:15]=1
        layer=check.LayerKey.PROTECTED_MASK;kind=check.LayerKind.MASK;nodata=None
        if case=='empty':grid[:]=0
        elif case=='mask':grid[9,9]=2
        elif case=='fuel':grid[:]=101;grid[9,9]=999;layer=check.LayerKey.FBFM40;kind=check.LayerKind.CATEGORICAL;nodata=-9999
        elif case=='elevation':
            grid=np.indices((20,20)).sum(axis=0).astype(float)*10+120;grid[9,9]=10000;layer=check.LayerKey.DEM;kind=check.LayerKind.CONTINUOUS;nodata=-9999
        elif case!='valid':raise ValueError('Unknown raster scenario.')
        errors=[];check._check_data(grid,layer,kind,nodata,errors)
        return {'decision':'rejected' if errors else 'valid value range','layer':layer.value,'errors':errors,'grid':grid.tolist(),'scope':'Synthetic array value checks only, not a fire forecast.'}
    raise ValueError('Unknown experiment.')

def route_input(path,body):
    if not isinstance(body,dict):raise ValueError('Request JSON must be an object.')
    query=parse_qs(urlparse(path).query)
    if query.get('project')==['night-shift-coach']:
        body={**body,'project':'night-shift-coach','operation':query.get('operation',[''])[0]}
    return body

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=16384:raise ValueError('Request must contain 1 to 16384 bytes.')
            body=route_input(self.path,json.loads(self.rfile.read(size)))
            result=run(body)
            self.respond(200,result)
        except (ValueError,KeyError,TypeError) as error:
            self.respond(400,{'error':str(error)[:300]})
        except Exception:
            self.respond(500,{'error':'The experiment could not finish. Try again shortly.'})
    def do_GET(self):
        body=route_input(self.path,{})
        if body.get('project')=='night-shift-coach':
            try:self.respond(200,run(body))
            except (ValueError,KeyError,TypeError) as error:self.respond(400,{'error':str(error)[:300]})
        else:self.respond(200,{'status':'ready','projects':['gcapi','contract-to-revenue','bench','wildfire-preproc','night-shift-coach']})
    def respond(self,status,result):
        payload=json.dumps(result,allow_nan=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
