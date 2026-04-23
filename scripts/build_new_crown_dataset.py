#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


DEFAULT_TSV = Path("workspace/new_crown1/extracted/index_reachable_natural_segments.tsv")
DEFAULT_OUTPUT = Path("content/new_crown1/content.json")
DEFAULT_AUDIO_ROOT = Path("content/new_crown1/audio")


def clean(value: str | None) -> str:
    return (value or "").strip()


def optional(value: str | None) -> str | None:
    normalized = clean(value)
    if not normalized or normalized == "-":
        return None
    return normalized


def parse_int(value: str | None) -> int | None:
    normalized = clean(value)
    if not normalized:
        return None
    return int(normalized)


def runtime_audio_path(audio_rel_path: str) -> str:
    normalized = clean(audio_rel_path)
    if normalized.startswith("00_data/"):
        normalized = normalized[len("00_data/") :]
    return f"audio/{normalized}"


def build_part_label(section: str | None, scene: str | None, detail: str | None) -> str:
    components = [value for value in (section, scene) if value]
    if components:
        return " ".join(components)
    if detail:
        return detail
    return "Part"


def load_rows(tsv_path: Path) -> list[dict[str, str]]:
    with tsv_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))

    rows.sort(
        key=lambda row: (
            parse_int(row.get("source_order")) or 0,
            parse_int(row.get("segment_index")) or 0,
        )
    )
    return rows


def build_dataset(rows: list[dict[str, str]], tsv_path: Path, audio_root: Path) -> tuple[dict[str, Any], int]:
    units: list[dict[str, Any]] = []
    unit_by_label: dict[str, dict[str, Any]] = {}

    unit_counter = 0
    part_counter = 0
    item_counter = 0
    missing_audio_count = 0

    for row in rows:
        lesson = clean(row["lesson"])
        section = optional(row.get("section"))
        scene = optional(row.get("scene"))
        detail = optional(row.get("detail"))

        unit = unit_by_label.get(lesson)
        if unit is None:
            unit_counter += 1
            unit = {
                "id": f"unit_{unit_counter:03d}",
                "label": lesson,
                "subtitle": None,
                "parts": [],
                "_part_index": {},
            }
            units.append(unit)
            unit_by_label[lesson] = unit

        part_key = (section or "", scene or "", detail or "")
        part = unit["_part_index"].get(part_key)
        if part is None:
            part_counter += 1
            part = {
                "id": f"part_{part_counter:03d}",
                "label": build_part_label(section, scene, detail),
                "subtitle": detail,
                "section": section,
                "scene": scene,
                "detail": detail,
                "items": [],
            }
            unit["parts"].append(part)
            unit["_part_index"][part_key] = part

        item_counter += 1
        speaker = optional(row.get("speaker"))
        audio_url = runtime_audio_path(row["audio_rel_path"])
        runtime_path = audio_root / audio_url[len("audio/") :]
        if not runtime_path.exists():
            missing_audio_count += 1

        item = {
            "id": f"item_{item_counter:05d}",
            "sequence": item_counter,
            "segment_index": parse_int(row.get("segment_index")),
            "speaker": speaker,
            "text": clean(row["text"]),
            "ja": clean(row["ja"]),
            "study_note": clean(row["study_note"]),
            "audio_url": audio_url,
        }
        part["items"].append(item)

    for unit in units:
        unit.pop("_part_index", None)

    dataset = {
        "content": {
            "id": "new_crown1",
            "title": "NEW CROWN 1",
            "audio_root": "audio/",
        },
        "source_files": {
            "segments_tsv": str(tsv_path),
        },
        "unit_count": len(units),
        "part_count": part_counter,
        "item_count": item_counter,
        "units": units,
    }
    return dataset, missing_audio_count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the current NEW CROWN 1 runtime JSON from the reviewed TSV."
    )
    parser.add_argument("--tsv", type=Path, default=DEFAULT_TSV)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_AUDIO_ROOT)
    args = parser.parse_args()

    rows = load_rows(args.tsv)
    dataset, missing_audio_count = build_dataset(rows, args.tsv, args.audio_root)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {args.output}")
    print(f"Units: {dataset['unit_count']}")
    print(f"Parts: {dataset['part_count']}")
    print(f"Items: {dataset['item_count']}")
    print(f"Missing package-local audio files: {missing_audio_count}")


if __name__ == "__main__":
    main()
