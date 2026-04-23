# Repository Layout

This repository is split into four concerns:

- `app/`
  - the typing program itself
- `content/`
  - content packages, generated datasets, and local audio assets
- `scripts/`
  - content import and build utilities
- `workspace/`
  - investigation, reverse-engineering, and intermediate files that should not become runtime data by default

## App

- `app/src/`
  - future typing UI, game loop, input handling, selection flow, and audio playback code

## Content Packages

- `content/new_crown1/`
  - textbook-aligned content package
- `content/new_crown1/source/`
  - source TSV and combined Japanese notes
- `content/new_crown1/content.json`
  - generated app-ready JSON dataset
- `content/new_crown1/audio/`
  - downloaded local MP3 files with original relative paths preserved

At runtime, the app should be configured with the URL of `content.json` and resolve relative `audio_url` values from there.

- `content/synthetic/`
  - fallback synthetic content package
- `content/synthetic/source/`
  - synthetic sentence CSV

## Tools

- `scripts/build_static_site.py`
  - builds the public-safe placeholder site into `dist/`
- `scripts/dev_server.py`
  - serves `app/site` locally and exposes local content packages under `/content/`
- `scripts/build_new_crown_dataset.py`
  - rebuilds the generated New Crown dataset from the source files
- `scripts/download_new_crown_audio.py`
  - downloads textbook MP3 files into the New Crown content package

## Workspace

- `workspace/new_crown1/`
  - scratch area for `NEW CROWN 1` investigation
- `workspace/new_crown1/upstream/`
  - raw downloaded site files
- `workspace/new_crown1/extracted/`
  - parsed intermediate outputs
- `workspace/new_crown1/notes/`
  - temporary notes and mappings

## Common Commands

```bash
npm run dev
npm run build
python3 scripts/build_new_crown_dataset.py
python3 scripts/download_new_crown_audio.py --limit 10 --dry-run
```
