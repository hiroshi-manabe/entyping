# Entyping Project Notes

## Current Direction

- The project is a local typing app for a new junior high school student.
- Benchmark inspiration for tempo and game feel is `Pop Typing`.
- The main content source is now textbook-aligned `NEW CROWN 1` data, not the generated 500-sentence CSV.
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

- Editorial source TSV: [index_reachable_natural_segments.tsv](/Users/manabe/Software/entyping/workspace/new_crown1/extracted/index_reachable_natural_segments.tsv)
- Generated dataset: [content.json](/Users/manabe/Software/entyping/content/new_crown1/content.json)
- Downloaded local audio root: [audio](/Users/manabe/Software/entyping/content/new_crown1/audio)
- Older pronunciation-check-based data is preserved only as legacy reference under [legacy](/Users/manabe/Software/entyping/workspace/new_crown1/legacy).

## Dataset Status

- The generated New Crown dataset currently contains:
  - `25` units
  - `72` parts
  - `925` items
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
- Put the generated dataset at the package root so runtime audio URLs can stay simple, such as `audio/...`.
- Japanese audio is not needed.

## Runtime Loading Decisions

- The runtime entry point should be a dataset JSON URL, not a package name hardcoded in the app.
- The same loading rule should be used locally and in deployed environments.
- Item-level `audio_url` values should normally be relative, so the same dataset remains portable across hosts.
- The runtime should also accept absolute `audio_url` values when present.
- Relative audio paths should be resolved against the dataset JSON URL.
- The chosen dataset URL should be saved locally in the browser and editable later from settings.
- Local validation should use a served URL such as `http://127.0.0.1:4173/content/new_crown1/content.json`, not `file://`.

## Multi-Source Content Direction

- The app should eventually support multiple registered dataset JSON URLs instead of a single saved source.
- Normal use should expose a content selector in the main UI, while add/remove/reload controls remain in settings.
- Registered sources should be stored as a local source registry, not just as one `datasetUrl` string.
- A registered source should store at least:
  - local source ID
  - dataset URL
  - dataset `content.id`
  - dataset `content.title`
  - item/unit/part counts when known
  - last loaded timestamp when useful
- Progress and saved state must be namespaced per source or per content identity so two datasets cannot overwrite each other.
- If two different URLs use the same `content.id`, the app should either prevent duplicates or use a separate local source ID for save-data namespacing.
- Removing a source should ask whether to remove only the source or also delete saved progress for that source.
- Load/reload source, reset source, and delete progress actions should use a consistent in-app confirmation UI.
- The current JSON `content` object only has `id`, `title`, and `audio_root`.
- A short source description/tagline field is not present yet, but will likely be useful for the content selector.
- A likely future metadata shape is `content.description`, for example a short phrase such as `Textbook-aligned NEW CROWN 1 practice` or `500-sentence JHS 1 review`.

## JHS 1 Typing 500 Dataset

- File: [jhs1_typing_500_sentences.csv](/Users/manabe/Software/entyping/content/jhs1_typing_500/source/jhs1_typing_500_sentences.csv)
- The file remains useful as supplemental or extra practice content.
- It is no longer the primary direction for version 1.
- The CSV has Japanese translations for all `500` rows.

## Selection UI Decisions

- Use a textbook-style contents page rather than keeping dataset loading as the main screen.
- Dataset source controls belong in settings because normal use should focus on lesson navigation.
- Units should expand and collapse for navigation.
- Full units are too large as practice targets, so the playable selection unit is a single part.
- Do not support arbitrary multi-select combinations across unrelated units in version 1.
- A child-facing typing app benefits more from fast start and clarity than from maximum content-selection flexibility.

## Long-Term Navigation Direction

- Contents and practice should eventually be distinct app views with meaningful URLs.
- The app can still be implemented as a single static page, but practice state should be addressable through lightweight routing.
- A likely static-hosting-friendly shape is:
  - `/`
  - `#/practice/part_006`
- Browser Back should return from practice to contents naturally.
- Direct linking, reload restoration, and saved progress can later build on the same route structure.

## Reference Value Of The Publisher Pronunciation Site

- The New Crown pronunciation site is useful as a reference for:
  - curriculum-aligned navigation
  - one-sentence vs full-text practice modes
  - text/audio study-mode ideas
- It is not the right benchmark for the typing loop itself.
- Pop Typing remains the better benchmark for pacing, prompt rotation, and game feel.

## Build Scripts

- Local dev server: [dev_server.py](/Users/manabe/Software/entyping/scripts/dev_server.py)
- Static placeholder build: [build_static_site.py](/Users/manabe/Software/entyping/scripts/build_static_site.py)
- Dataset build script: [build_new_crown_dataset.py](/Users/manabe/Software/entyping/scripts/build_new_crown_dataset.py)
- Audio downloader: [download_new_crown_audio.py](/Users/manabe/Software/entyping/scripts/download_new_crown_audio.py)
- Current local app command:

```bash
npm run dev
```

- Local development should still use the same JSON-URL-driven runtime model as deployment, with the dev server only providing the local HTTP URL.

- Current public site build command:

```bash
npm run build
```

- Current local content rebuild command:

```bash
python3 scripts/build_new_crown_dataset.py
```

## Repository Split

- `app/` should contain only typing-program code.
- `content/` should contain content packages, generated datasets, and local audio.
- The app should load content through a small loader layer instead of importing textbook-specific assumptions into the game logic.
