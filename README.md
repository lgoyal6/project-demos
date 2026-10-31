# Project demonstrations

[Open the demos](https://laksh-project-demos.vercel.app/)

Seventeen project demonstrations, each explicit about whether it executes original
code, explores recorded evidence, uses fictional fixtures, or reconstructs a
teaching example. Interactive controls never turn recorded results into new
measurements.

## Public source boundary

This repository publishes the demo UI, authored API adapters, and the approved
sample assets already visible on the public site. Original project source links
appear on each page when publicly available.

Private runtime implementations are deliberately excluded from Git. The deployed
Python and Node functions receive those modules through a separately prepared
private bundle. This includes the original citation checks, queue rules and
extracted physiology model. No credentials or private application records belong
in this repository.

The frontend bundle is inspectable and reproducible from this checkout. A complete
backend deployment requires the excluded modules and their original permissions.
Public CI checks HTML asset paths, project routes and JavaScript syntax;
runtime verification uses the separately assembled deployment.

## Work on the interface

Requires Python 3.12+ and Node 22+.

    python render.py
    python check-site.py
    python -m http.server 8773 --directory public

The static server supports recorded explorers and browser-only interactions.
Pages that use the original Python or Node functions require a separately
configured same-origin API. Python dependencies are pinned in requirements.txt.

Edit pages/ for layouts and public/workspaces/ for interactions and styling.
render.py regenerates public HTML without fetching private repositories or
changing recorded inputs.

## Attribution and scope

Recorded data remains tied to its original project and identified on the demo.
Night Shift Coach credits Alan Moazzam for the original physiology model and
Laksh Goyal for the native SwiftUI port. Helmet Identification Model cites the
published Azure Custom Vision paper and does not claim live inference.
Original public project repositories remain the source for their implementations
and licenses. This repository does not relicense those implementations.
