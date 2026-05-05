#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


DEFAULT_CSV = Path("content/jhs1_typing_500/source/jhs1_typing_500_sentences.csv")
DEFAULT_OUTPUT = Path("content/jhs1_typing_500/content.json")
DEFAULT_AUDIO_ROOT = Path("content/jhs1_typing_500/audio")

REQUIRED_FIELDS = [
    "id",
    "unit_id",
    "unit_label",
    "part_id",
    "part_label",
    "lesson",
    "item",
    "focus",
    "sentence",
    "ja",
    "study_note",
]


def clean(value: str | None) -> str:
    return (value or "").strip()


def optional(value: str | None) -> str | None:
    normalized = clean(value)
    return normalized or None


def parse_int(value: str | None, field_name: str) -> int:
    normalized = clean(value)
    if not normalized:
        raise ValueError(f"Missing integer field: {field_name}")
    return int(normalized)


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_fields = [field for field in REQUIRED_FIELDS if field not in (reader.fieldnames or [])]
        if missing_fields:
            raise ValueError(f"{csv_path} is missing columns: {', '.join(missing_fields)}")
        rows = list(reader)

    rows.sort(key=lambda row: parse_int(row.get("id"), "id"))
    return rows


def build_dataset(rows: list[dict[str, str]], csv_path: Path) -> dict[str, Any]:
    units: list[dict[str, Any]] = []
    unit_index: dict[str, dict[str, Any]] = {}
    part_counter = 0

    for row in rows:
        unit_id = clean(row["unit_id"])
        part_id = clean(row["part_id"])

        unit = unit_index.get(unit_id)
        if unit is None:
            unit = {
                "id": unit_id,
                "label": clean(row["unit_label"]),
                "subtitle": None,
                "parts": [],
                "_part_index": {},
            }
            units.append(unit)
            unit_index[unit_id] = unit

        part = unit["_part_index"].get(part_id)
        if part is None:
            part_counter += 1
            focus = optional(row.get("focus"))
            part = {
                "id": part_id,
                "label": clean(row["part_label"]),
                "subtitle": focus,
                "section": clean(row["lesson"]),
                "scene": None,
                "detail": focus,
                "items": [],
            }
            unit["parts"].append(part)
            unit["_part_index"][part_id] = part

        sequence = parse_int(row.get("id"), "id")
        item = {
            "id": f"item_{sequence:05d}",
            "sequence": sequence,
            "segment_index": parse_int(row.get("item"), "item"),
            "speaker": None,
            "text": clean(row["sentence"]),
            "ja": clean(row["ja"]),
            "study_note": clean(row["study_note"]),
            "audio_url": f"audio/item_{sequence:05d}.mp3",
        }
        part["items"].append(item)

    for unit in units:
        unit.pop("_part_index", None)

    return {
        "content": {
            "id": "jhs1_typing_500",
            "title": "JHS 1 Typing 500",
            "audio_root": "audio/",
        },
        "source_files": {
            "sentences_csv": str(csv_path),
        },
        "unit_count": len(units),
        "part_count": part_counter,
        "item_count": len(rows),
        "units": units,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the JHS 1 Typing 500 runtime JSON."
    )
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_AUDIO_ROOT)
    args = parser.parse_args()

    rows = load_rows(args.csv)
    dataset = build_dataset(rows, args.csv)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {args.output}")
    print(f"Units: {dataset['unit_count']}")
    print(f"Parts: {dataset['part_count']}")
    print(f"Items: {dataset['item_count']}")

    missing_audio_count = 0
    for unit in dataset["units"]:
        for part in unit["parts"]:
            for item in part["items"]:
                audio_url = item["audio_url"]
                audio_path = args.audio_root / audio_url.removeprefix("audio/")
                if not audio_path.exists():
                    missing_audio_count += 1
    print(f"Missing package-local audio files: {missing_audio_count}")


if __name__ == "__main__":
    main()
