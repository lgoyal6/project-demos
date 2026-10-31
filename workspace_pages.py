"""Render the three approved workspaces without changing other project pages."""
from pathlib import Path

def build_workspaces(public):
    pages=Path(__file__).resolve().parent/'pages'
    for template in sorted(pages.glob('*.html')):
        destination=public/template.stem/'index.html'
        destination.parent.mkdir(exist_ok=True,parents=True)
        destination.write_text(template.read_text())
