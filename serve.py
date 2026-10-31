"""Local same-origin development server for static pages and both API runtimes."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import importlib.util
import json
import subprocess

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('demo_api',ROOT/'api/run.py');api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'public'),**kwargs)
    def do_GET(self):
        if self.path.startswith('/api/run'):
            try:self.reply(200,api.run(api.route_input(self.path,{})))
            except Exception as e:self.reply(400,{'error':str(e)[:300]})
        else:super().do_GET()
    def do_POST(self):
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=32768:raise ValueError('Invalid request size.')
            raw=self.rfile.read(size);body=api.route_input(self.path,json.loads(raw))
            if self.path.rstrip('/')=='/api/node':
                r=subprocess.run(['node',str(ROOT/'api/node.mjs')],input=raw,capture_output=True,timeout=15);result=json.loads(r.stdout)
                if r.returncode:raise ValueError(result['error'])
            else:result=api.run(body)
            self.reply(200,result)
        except Exception as e:self.reply(400,{'error':str(e)[:300]})
    def reply(self,status,result):
        data=json.dumps(result).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
ThreadingHTTPServer(('127.0.0.1',8773),Handler).serve_forever()
