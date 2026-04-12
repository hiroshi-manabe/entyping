# Entyping Project Notes

## Current Direction

- The project is a local typing app for a new junior high school student.
- Benchmark inspiration for tempo and game feel is `Pop Typing`.
- The main content source is now textbook-aligned `NEW CROWN 1` data, not the synthetic CSV.
- The first version should stay simple at the UI level even if the content structure is richer underneath.
- The repository should keep the typing program and content packages clearly separated.

## Pop Typing Research

- Public site inspected: `https://keyx0.net/pop/`
- The current public build is a Unity WebGL app.
- The shipped prompt bank is embedded in a Unity `TextAsset` named `word`.
- The prompt bank contains `1,652` entries in total.
- Entries are grouped into buckets `txt2` through `txt14`.
- Those buckets appear to be grouped by reading length in kana rather than by topic.
- This suggests a Pop-like structure of:
  - 60-second rounds
  - large prompt pool
  - length-based prompt grouping
  - random selection within a bucket

## Primary Content Source

- Source TSV: [book_data.tsv](/Users/manabe/Software/entyping/content/new_crown1/source/book_data.tsv)
- Source notes: [new_crown1_combined_japanese_notes.md](/Users/manabe/Software/entyping/content/new_crown1/source/new_crown1_combined_japanese_notes.md)
- Generated dataset: [new_crown1.json](/Users/manabe/Software/entyping/content/new_crown1/dataset/new_crown1.json)
- Downloaded local audio root: [audio](/Users/manabe/Software/entyping/content/new_crown1/audio)

## Dataset Status

- The generated New Crown dataset currently contains:
  - `18` units
  - `80` parts
  - `754` items
- The generated schema is intentionally generic:
  - `content`
  - `units`
  - `parts`
  - `items`
- The dataset lives inside a content package, not inside the future app code.
- Textbook-specific strings are preserved as labels in the data itself:
  - example unit label: `Lesson 2`
  - example unit subtitle: `My Hero`
  - example part label: `Part 1 Scene 1`

## Content Modeling Decisions

- Keep the real textbook hierarchy in the data.
- Keep the program architecture generic by using neutral structural names such as `units` and `parts`.
- Do not hardcode `Lesson` and `Section` as schema concepts.
- Lesson-theme strings such as `My Hero` belong to the unit level, not the first part.

## Audio Decisions

- Use the textbook publisher MP3 files as the primary English audio source.
- Store audio locally rather than depending on remote URLs at runtime.
- Preserve the original relative path structure under `content/new_crown1/audio/`.
- Japanese audio is not needed.

## Synthetic Fallback Dataset

- File: [jhs1_typing_500_sentences.csv](/Users/manabe/Software/entyping/content/synthetic/source/jhs1_typing_500_sentences.csv)
- The file remains useful as fallback or extra practice content.
- It is no longer the primary direction for version 1.
- The CSV has Japanese translations for all `500` rows.

## Selection UI Decisions

- Do not copy the publisher site’s two-level multi-select checkbox UI.
- The typing app should keep selection simpler:
  - choose one unit
  - then choose either `All parts` or one specific part
- Do not support arbitrary multi-select combinations across unrelated units in version 1.
- A child-facing typing app benefits more from fast start and clarity than from maximum content-selection flexibility.

## Reference Value Of The Publisher Pronunciation Site

- The New Crown pronunciation site is useful as a reference for:
  - curriculum-aligned navigation
  - one-sentence vs full-text practice modes
  - text/audio study-mode ideas
- It is not the right benchmark for the typing loop itself.
- Pop Typing remains the better benchmark for pacing, prompt rotation, and game feel.

## Build Scripts

- Static placeholder build: [build_static_site.py](/Users/manabe/Software/entyping/scripts/build_static_site.py)
- Dataset build script: [build_new_crown_dataset.py](/Users/manabe/Software/entyping/scripts/build_new_crown_dataset.py)
- Audio downloader: [download_new_crown_audio.py](/Users/manabe/Software/entyping/scripts/download_new_crown_audio.py)
- Current rebuild command:

```bash
python3 scripts/build_static_site.py
python3 scripts/build_new_crown_dataset.py
```

## Repository Split

- `app/` should contain only typing-program code.
- `content/` should contain content packages, generated datasets, and local audio.
- The app should load content through a small loader layer instead of importing textbook-specific assumptions into the game logic.
