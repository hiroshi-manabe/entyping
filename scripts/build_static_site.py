#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


DEFAULT_SOURCE = Path("app/site")
DEFAULT_DIST = Path("dist")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the minimal static placeholder site into dist/."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Source directory. Default: {DEFAULT_SOURCE}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DIST,
        help=f"Output directory. Default: {DEFAULT_DIST}",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.source.exists():
        raise SystemExit(f"source directory not found: {args.source}")

    if args.output.exists():
        shutil.rmtree(args.output)
    shutil.copytree(args.source, args.output)

    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
