#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import random
import sys
import time
from pathlib import Path, PurePosixPath
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://tbqr.sanseido-publ.co.jp/07nc1/contents/00_data/"
DEFAULT_TSV = Path("content/new_crown1/source/book_data.tsv")
DEFAULT_OUTPUT_DIR = Path("content/new_crown1/audio")


def normalize_audio_path(raw: str) -> str:
    return raw.strip().replace("\\", "/")


def collect_audio_paths(tsv_path: Path) -> list[str]:
    audio_paths: list[str] = []
    seen: set[str] = set()

    with tsv_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        for row in reader:
            for cell in row:
                normalized = normalize_audio_path(cell)
                if not normalized.endswith(".mp3"):
                    continue
                if normalized in seen:
                    continue
                seen.add(normalized)
                audio_paths.append(normalized)

    return audio_paths


def filter_audio_paths(
    audio_paths: Iterable[str],
    match: str | None,
    offset: int,
    limit: int | None,
) -> list[str]:
    filtered = [path for path in audio_paths if not match or match in path]
    if offset:
        filtered = filtered[offset:]
    if limit is not None:
        filtered = filtered[:limit]
    return filtered


def build_remote_url(base_url: str, relative_path: str) -> str:
    encoded_parts = [quote(part) for part in PurePosixPath(relative_path).parts]
    return base_url.rstrip("/") + "/" + "/".join(encoded_parts)


def sleep_between(min_sleep: float, max_sleep: float) -> None:
    duration = random.uniform(min_sleep, max_sleep)
    time.sleep(duration)


def download_file(
    remote_url: str,
    local_path: Path,
    timeout: float,
    user_agent: str,
) -> None:
    request = Request(remote_url, headers={"User-Agent": user_agent})
    with urlopen(request, timeout=timeout) as response:
        data = response.read()

    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download New Crown 1 audio files referenced by book_data.tsv "
            "while preserving the original relative directory structure."
        )
    )
    parser.add_argument(
        "--tsv",
        type=Path,
        default=DEFAULT_TSV,
        help=f"Path to the source TSV file. Default: {DEFAULT_TSV}",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Remote base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Local output root. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only download the first N matching files.",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip the first N matching files before downloading.",
    )
    parser.add_argument(
        "--match",
        default=None,
        help="Only include audio paths containing this substring.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.4,
        help="Minimum sleep in seconds between downloads. Default: 0.4",
    )
    parser.add_argument(
        "--sleep-jitter",
        type=float,
        default=0.2,
        help="Additional random sleep in seconds. Default: 0.2",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="Per-request timeout in seconds. Default: 20",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be downloaded without writing files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Redownload files even if they already exist locally.",
    )
    parser.add_argument(
        "--user-agent",
        default="entyping-audio-downloader/1.0",
        help="HTTP User-Agent string to send with requests.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.sleep < 0 or args.sleep_jitter < 0:
        print("sleep values must be non-negative", file=sys.stderr)
        return 2
    if args.offset < 0:
        print("offset must be non-negative", file=sys.stderr)
        return 2
    if args.limit is not None and args.limit < 0:
        print("limit must be non-negative", file=sys.stderr)
        return 2
    if not args.tsv.exists():
        print(f"TSV not found: {args.tsv}", file=sys.stderr)
        return 2

    audio_paths = collect_audio_paths(args.tsv)
    selected_paths = filter_audio_paths(audio_paths, args.match, args.offset, args.limit)

    print(f"found {len(audio_paths)} unique audio paths in {args.tsv}")
    print(f"selected {len(selected_paths)} path(s) for this run")

    downloaded = 0
    skipped = 0
    failed = 0
    min_sleep = args.sleep
    max_sleep = args.sleep + args.sleep_jitter

    for index, relative_path in enumerate(selected_paths, start=1):
        local_path = args.output_dir / Path(relative_path)
        remote_url = build_remote_url(args.base_url, relative_path)

        if args.dry_run:
            print(f"[dry-run {index}/{len(selected_paths)}] {remote_url} -> {local_path}")
            continue

        if local_path.exists() and not args.force:
            skipped += 1
            print(f"[skip {index}/{len(selected_paths)}] {local_path}")
            continue

        try:
            download_file(remote_url, local_path, args.timeout, args.user_agent)
            downloaded += 1
            print(f"[ok {index}/{len(selected_paths)}] {local_path}")
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            failed += 1
            print(f"[failed {index}/{len(selected_paths)}] {relative_path}: {exc}", file=sys.stderr)

        if index < len(selected_paths):
            sleep_between(min_sleep, max_sleep)

    print(
        "summary:",
        f"downloaded={downloaded}",
        f"skipped={skipped}",
        f"failed={failed}",
    )

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
