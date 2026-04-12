#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_TSV = Path("content/new_crown1/source/book_data.tsv")
DEFAULT_NOTES = Path("content/new_crown1/source/new_crown1_combined_japanese_notes.md")
DEFAULT_OUTPUT = Path("content/new_crown1/content.json")
LOCAL_AUDIO_ROOT = Path("content/new_crown1/audio")


TAG_RE = re.compile(r"<[^>]+>")
HEADER_3_RE = re.compile(r"^###\s+(.+)$")
HEADER_4_RE = re.compile(r"^####\s+(.+)$")
ITEM_HEADER_RE = re.compile(r"^(?:\d+|[①-⑳])\.\s+(.*)$")


@dataclass
class NoteEntry:
    english: str | None
    speaker: str | None
    japanese: str | None
    grammar_note: str | None
    study_note: str | None
    pronunciation_note: str | None
    audio_path: str
    group_marker: str | None
    note_section: str | None


def normalize_whitespace(value: str) -> str:
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def clean_text(value: str) -> str:
    if not value:
        return ""
    value = value.replace("\\", "/")
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = TAG_RE.sub("", value)
    value = html.unescape(value)
    return normalize_whitespace(value)


def slugify(value: str) -> str:
    value = value.lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_") or "item"


def parse_duration_seconds(raw: str) -> float | None:
    match = re.fullmatch(r"\[(\d+):(\d+(?:\.\d+)?)\]", raw.strip())
    if not match:
        return None
    minutes = int(match.group(1))
    seconds = float(match.group(2))
    return minutes * 60 + seconds


def looks_like_marker(value: str) -> bool:
    return bool(re.fullmatch(r"[①-⑳]", value))


def parse_note_entries(notes_path: Path) -> dict[str, NoteEntry]:
    lines = notes_path.read_text(encoding="utf-8").splitlines()

    entries: dict[str, NoteEntry] = {}
    current_section: str | None = None
    current_group_marker: str | None = None
    current_entry: dict[str, Any] | None = None

    def finalize_current_entry() -> None:
        nonlocal current_entry
        if not current_entry:
            return
        audio_path = current_entry.get("audio_path")
        if not audio_path:
            current_entry = None
            return
        if audio_path in entries:
            raise ValueError(f"duplicate audio path in notes: {audio_path}")
        entries[audio_path] = NoteEntry(
            english=current_entry.get("english"),
            speaker=current_entry.get("speaker"),
            japanese=current_entry.get("japanese"),
            grammar_note=current_entry.get("grammar_note"),
            study_note=current_entry.get("study_note"),
            pronunciation_note=current_entry.get("pronunciation_note"),
            audio_path=audio_path,
            group_marker=current_entry.get("group_marker"),
            note_section=current_entry.get("note_section"),
        )
        current_entry = None

    for raw_line in lines:
        line = raw_line.rstrip()

        if line.startswith("## NEW CROWN 1 — "):
            finalize_current_entry()
            current_section = None
            current_group_marker = None
            continue

        if line.startswith("## "):
            finalize_current_entry()
            current_section = line[3:].strip()
            current_group_marker = None
            continue

        header4 = HEADER_4_RE.match(line)
        if header4:
            finalize_current_entry()
            title = header4.group(1).strip()
            item_match = ITEM_HEADER_RE.match(title)
            if not item_match:
                continue
            current_entry = {
                "english": clean_text(item_match.group(1)),
                "speaker": None,
                "japanese": None,
                "grammar_note": None,
                "study_note": None,
                "pronunciation_note": None,
                "audio_path": None,
                "group_marker": current_group_marker,
                "note_section": current_section,
            }
            continue

        header3 = HEADER_3_RE.match(line)
        if header3:
            finalize_current_entry()
            title = header3.group(1).strip()
            item_match = ITEM_HEADER_RE.match(title)
            if item_match:
                current_entry = {
                    "english": clean_text(item_match.group(1)),
                    "speaker": None,
                    "japanese": None,
                    "grammar_note": None,
                    "study_note": None,
                    "pronunciation_note": None,
                    "audio_path": None,
                    "group_marker": current_group_marker,
                    "note_section": current_section,
                }
            else:
                current_group_marker = title
            continue

        if not current_entry:
            continue

        if line.startswith("- Speaker: "):
            current_entry["speaker"] = line[len("- Speaker: ") :].strip()
            continue

        if line.startswith("- Japanese: "):
            current_entry["japanese"] = line[len("- Japanese: ") :].strip()
            continue

        if line.startswith("- Grammar / meaning: "):
            current_entry["grammar_note"] = line[len("- Grammar / meaning: ") :].strip()
            continue

        if line.startswith("- Study note: "):
            study = line[len("- Study note: ") :].strip()
            if " Pronunciation: " in study:
                study, pronunciation = study.split(" Pronunciation: ", 1)
                current_entry["study_note"] = study.strip()
                current_entry["pronunciation_note"] = pronunciation.strip()
            else:
                current_entry["study_note"] = study
            continue

        if line.startswith("- Pronunciation: "):
            current_entry["pronunciation_note"] = line[len("- Pronunciation: ") :].strip()
            continue

        if line.startswith("- Audio: `") and line.endswith("`"):
            current_entry["audio_path"] = line[len("- Audio: `") : -1]
            continue

    finalize_current_entry()
    return entries


def parse_book_and_items(
    tsv_path: Path,
    notes_by_audio: dict[str, NoteEntry],
    notes_path: Path,
    output_path: Path,
) -> dict[str, Any]:
    rows = list(csv.reader(tsv_path.open(encoding="utf-8", newline=""), delimiter="\t"))

    # Book metadata lives in the first non-comment row after the metadata comments.
    book_meta_row = rows[5]
    book_meta = {
        "title": book_meta_row[0],
        "theme_color": book_meta_row[1],
        "font_scale": book_meta_row[2],
        "image_scale": book_meta_row[3],
        "advice_threshold": book_meta_row[4],
        "background": book_meta_row[5],
        "animation_seconds": int(book_meta_row[6]),
        "auto_advance_ms": int(book_meta_row[7]),
    }

    units: list[dict[str, Any]] = []
    unit_index: dict[str, dict[str, Any]] = {}
    current_part: dict[str, Any] | None = None
    current_unit: dict[str, Any] | None = None
    current_speaker: str | None = None
    current_marker: str | None = None
    item_counter = 0

    for row in rows[9:]:
        row = row + [""] * (8 - len(row))
        lesson_cell, role_cell, english_cell, audio_cell, extra_cell, advice_cell, duration_cell, flag_cell = row[:8]

        if not any(cell.strip() for cell in row):
            continue

        normalized_audio = audio_cell.strip().replace("\\", "/")

        if normalized_audio.endswith(".mp3"):
            if current_part is None or current_unit is None:
                raise ValueError(f"audio row encountered before any section header: {row}")

            role = role_cell.strip()
            marker = current_marker
            speaker = current_speaker
            speaker_display = None

            if role.endswith(":"):
                speaker_display = role
                speaker = role[:-1].strip()
                current_speaker = speaker
            elif looks_like_marker(role):
                marker = role
                current_marker = marker
                speaker = None
                current_speaker = None
            elif role:
                speaker_display = role
                speaker = role
                current_speaker = role

            item_counter += 1
            english = clean_text(english_cell)
            advice = clean_text(advice_cell)
            note_entry = notes_by_audio.get(normalized_audio)
            if note_entry is None:
                raise ValueError(f"missing note entry for audio path: {normalized_audio}")
            audio_local_path = LOCAL_AUDIO_ROOT / normalized_audio
            audio_url = Path(os.path.relpath(audio_local_path, output_path.parent)).as_posix()

            item = {
                "id": f"item_{item_counter:04d}",
                "sequence": item_counter,
                "unit": current_unit["label"],
                "part": current_part["label"],
                "page": current_part["page"],
                "part_subtitle": current_part["subtitle"],
                "speaker": speaker,
                "speaker_display": speaker_display,
                "marker": marker,
                "english": english,
                "english_html": english_cell.strip(),
                "japanese": note_entry.japanese,
                "grammar_note": note_entry.grammar_note,
                "study_note": note_entry.study_note,
                "pronunciation_note": note_entry.pronunciation_note,
                "textbook_pronunciation_advice": advice or None,
                "audio_relative_path": normalized_audio,
                "audio_url": audio_url,
                "audio_local_path": audio_local_path.as_posix(),
                "duration_raw": duration_cell.strip() or None,
                "duration_seconds": parse_duration_seconds(duration_cell),
            }
            current_part["items"].append(item)
            continue

        # Section header row.
        lesson_title = lesson_cell.strip()
        section_title = role_cell.strip()
        if not lesson_title or not section_title:
            continue

        current_speaker = None
        current_marker = None

        unit_obj = unit_index.get(lesson_title)
        if unit_obj is None:
            unit_obj = {
                "id": slugify(lesson_title),
                "label": lesson_title,
                "subtitle": None,
                "parts": [],
            }
            unit_index[lesson_title] = unit_obj
            units.append(unit_obj)

        current_unit = unit_obj
        raw_subtitle = clean_text(audio_cell) or None
        part_subtitle = raw_subtitle
        if raw_subtitle and unit_obj["subtitle"] is None:
            unit_obj["subtitle"] = raw_subtitle
            part_subtitle = None
        current_part = {
            "id": f"{unit_obj['id']}__{slugify(section_title)}",
            "label": section_title,
            "page": english_cell.strip() or None,
            "subtitle": part_subtitle,
            "display_width_or_asset": extra_cell.strip() or None,
            "part_advice_html": advice_cell.strip() or None,
            "part_advice": clean_text(advice_cell) or None,
            "flag": flag_cell.strip() or None,
            "items": [],
        }
        unit_obj["parts"].append(current_part)

    used_audio_paths = {
        item["audio_relative_path"]
        for unit in units
        for part in unit["parts"]
        for item in part["items"]
    }
    unused_notes = sorted(set(notes_by_audio) - used_audio_paths)
    if unused_notes:
        raise ValueError(f"unused note entries found: {len(unused_notes)}")

    return {
        "content": {
            "id": "new_crown1",
            **book_meta,
        },
        "source_files": {
            "tsv": str(tsv_path),
            "notes_markdown": str(notes_path),
        },
        "audio_root": Path(os.path.relpath(LOCAL_AUDIO_ROOT, output_path.parent)).as_posix(),
        "unit_count": len(units),
        "part_count": sum(len(unit["parts"]) for unit in units),
        "item_count": item_counter,
        "units": units,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build an app-ready JSON dataset from New Crown TSV and combined notes."
    )
    parser.add_argument("--tsv", type=Path, default=DEFAULT_TSV, help=f"Default: {DEFAULT_TSV}")
    parser.add_argument(
        "--notes",
        type=Path,
        default=DEFAULT_NOTES,
        help=f"Default: {DEFAULT_NOTES}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Default: {DEFAULT_OUTPUT}",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    notes_by_audio = parse_note_entries(args.notes)
    dataset = parse_book_and_items(args.tsv, notes_by_audio, args.notes, args.output)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"wrote {args.output}")
    print(
        f"units={dataset['unit_count']} "
        f"parts={dataset['part_count']} "
        f"items={dataset['item_count']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
