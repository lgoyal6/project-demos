"""Render editable UI templates over the checked-in, scoped evidence bundle."""
from pathlib import Path
from workspace_pages import build_workspaces

build_workspaces(Path(__file__).resolve().parent/'public')
print('Rendered project workspaces.')
