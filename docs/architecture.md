# Project structure

src/       Presentation, camera, character, chart and typography source
assets/    Attributed models, fonts, charts and CC0 motion
vendor/    Pinned Three.js and Splitting.js with licences
tools/     Integrity checks and selected deterministic QA
docs/      Gallery, architecture, attribution and speaker notes
build.py   Offline HTML build entry point

The 2D content and 3D scenes share a deterministic presentation clock. Loading/preparation precedes an explicit Start gesture. Source edits are rebuilt into a portable offline HTML; the browser never needs the development logs.

Preview provenance and its limits are recorded in [media/SOURCES.md](media/SOURCES.md).

The complete original classroom delivery is retained separately in the owner's private archive. This public tree keeps the reusable implementation, permitted inputs, attribution and a small verification entry point.
