"""Fail without printing secret values if private runtime or credentials enter Git."""
from pathlib import Path
import re
import subprocess

root=Path(__file__).resolve().parent
tracked=subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines()
patterns=[rb'gh[pousr]_[A-Za-z0-9]{20,}',rb'sk-proj-[A-Za-z0-9_-]{15,}',
          rb'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',rb'AKIA[0-9A-Z]{16}']
for filename in tracked:
    path=Path(filename)
    assert not any(part in {'vendor','.vercel','__pycache__'} for part in path.parts),filename
    assert not path.name.startswith('.env'),filename
    contents=(root/path).read_bytes()
    assert not any(re.search(pattern,contents) for pattern in patterns),'Possible credential pattern in '+filename
print('Tracked public source excludes private runtime modules and credential patterns.')
