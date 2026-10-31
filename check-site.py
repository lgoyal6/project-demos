"""Check the public bundle without fetching or publishing private implementations."""
from pathlib import Path
from html.parser import HTMLParser
import json
import subprocess

ROOT=Path(__file__).resolve().parent
class Assets(HTMLParser):
    def handle_starttag(self,tag,attrs):
        attributes=dict(attrs)
        key='src' if tag in {'script','img','iframe','video','source'} else 'href' if tag=='link' else None
        value=attributes.get(key,'')
        if value.startswith('/') and not value.startswith('//'):
            target=ROOT/'public'/value.lstrip('/').split('?')[0]
            assert target.exists(),value

for page in (ROOT/'public').rglob('*.html'):
    parser=Assets();parser.feed(page.read_text())
for script in [*(ROOT/'public').rglob('*.mjs'),ROOT/'api/node.mjs']:
    subprocess.run(['node','--check',str(script)],check=True)
for entry in json.loads((ROOT/'public/data/projects.json').read_text()):
    assert (ROOT/'public'/entry['slug']/'index.html').exists(),entry['slug']
print('Public HTML assets, project routes and JavaScript syntax verified.')
