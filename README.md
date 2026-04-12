# Entyping

A local-first English typing app with pluggable content packages.

## Status

This repository currently contains:

- the project structure for the typing app
- content-package conventions
- dataset/audio preparation scripts
- notes about the current direction

It does **not** yet contain the finished typing UI or game loop.

## Design Goal

The app should stay generic, while content stays replaceable.

That means:

- app code should not hardcode one textbook or dataset
- content should be loaded through a neutral schema
- private or copyrighted content can stay local and out of Git

## Repository Structure

- [app](/Users/manabe/Software/entyping/app)
  - typing-program code
- [content](/Users/manabe/Software/entyping/content)
  - content-package layout and local package area
- [scripts](/Users/manabe/Software/entyping/scripts)
  - dataset/audio build utilities
- [docs](/Users/manabe/Software/entyping/docs)
  - project notes and repository layout notes

## Content Model

The current generated dataset shape is intentionally generic:

- `content`
- `units`
- `parts`
- `items`

This keeps the runtime model neutral even when the source material uses labels such as `Lesson 2` or `Part 1 Scene 1`.

## Private Content Workflow

This public repository is intended to work with local content packages.

For example, a private package can live under:

- `content/<package-name>/source/`
- `content/<package-name>/dataset/`
- `content/<package-name>/audio/`

Large or sensitive content can be kept out of Git with `.gitignore`, while the app and tooling remain reusable.

## Current Scripts

- [build_new_crown_dataset.py](/Users/manabe/Software/entyping/scripts/build_new_crown_dataset.py)
  - builds a structured JSON dataset from local source files
- [download_new_crown_audio.py](/Users/manabe/Software/entyping/scripts/download_new_crown_audio.py)
  - downloads local audio assets for the corresponding content package

## Example Commands

```bash
npm run dev
npm run build
python3 scripts/build_new_crown_dataset.py
python3 scripts/download_new_crown_audio.py --limit 10 --dry-run
```

`npm run dev` serves `app/site` locally and exposes local content packages under `/content/...`.
The build command writes a deployable `dist/` directory for static hosting.
The content scripts expect the corresponding local source files to exist under the package paths they target.

## Notes

- This project is currently optimized for local/private use.
- The current benchmark inspiration for pacing and game feel is `Pop Typing`.
- The current child-facing selection direction is simple:
  - choose one unit
  - choose all parts or one part

For more detail, see:

- [PROJECT_NOTES.md](/Users/manabe/Software/entyping/docs/PROJECT_NOTES.md)
- [REPO_LAYOUT.md](/Users/manabe/Software/entyping/docs/REPO_LAYOUT.md)
