# New Crown 1 Workspace

This area is for temporary or investigatory material related to `NEW CROWN 1`.

Suggested usage:

- `upstream/`
  - raw files downloaded from the publisher site
- `extracted/`
  - parsed or normalized intermediate outputs
- `legacy/`
  - older derived datasets and superseded package material kept only for reference
- `notes/`
  - ad hoc findings, mappings, and reverse-engineering notes
- `tools/`
  - local-only scripts for textbook-specific extraction work that should not live in the public repo

Current expected paths:

- `upstream/data_nc1.js`
  - downloaded content index from the publisher site
- `upstream/fragments/`
  - downloaded HTML fragments, preserving publisher-relative paths such as `ST/starter1_scene_text.html`
- `extracted/fragment_index.tsv`
  - generated list of fragment pages derived from `data_nc1.js`
- `tools/`
  - private helper scripts such as fragment list generators and downloaders
- `notes/enrichment_policy.md`
  - current editorial policy for `ja` and `study_note` in the 925-row enrichment TSV
- `legacy/pronunciation_check_package/`
  - the older pronunciation-check-based package snapshot, including its JSON, source files, and audio tree

These directories are ignored in Git except for their placeholders.
