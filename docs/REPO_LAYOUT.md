# Repository Layout

This repository is split into three concerns:

- `app/`
  - the typing program itself
- `content/`
  - content packages, generated datasets, and local audio assets
- `scripts/`
  - content import and build utilities

## App

- `app/src/`
  - future typing UI, game loop, input handling, selection flow, and audio playback code

## Content Packages

- `content/new_crown1/`
  - textbook-aligned content package
- `content/new_crown1/source/`
  - source TSV and combined Japanese notes
- `content/new_crown1/dataset/`
  - generated app-ready JSON dataset
- `content/new_crown1/audio/`
  - downloaded local MP3 files with original relative paths preserved

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

## Common Commands

```bash
npm run dev
npm run build
python3 scripts/build_new_crown_dataset.py
python3 scripts/download_new_crown_audio.py --limit 10 --dry-run
```
