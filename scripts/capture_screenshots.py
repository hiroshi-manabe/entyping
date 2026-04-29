#!/usr/bin/env python3
from __future__ import annotations

import argparse
import platform
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "http://127.0.0.1:4173"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "tmp" / "screenshots"


@dataclass(frozen=True)
class ScreenshotTarget:
    name: str
    route: str
    selector: str
    viewport: str
    full_page: bool = False


TARGETS = [
    ScreenshotTarget(
        name="contents-desktop",
        route="#/",
        selector="#contents-list",
        viewport="1440,900",
        full_page=True,
    ),
    ScreenshotTarget(
        name="practice-desktop",
        route="#/practice/unit_001/part_001",
        selector="#target-text",
        viewport="1440,900",
    ),
    ScreenshotTarget(
        name="contents-mobile",
        route="#/",
        selector="#contents-list",
        viewport="390,844",
        full_page=True,
    ),
    ScreenshotTarget(
        name="practice-mobile",
        route="#/practice/unit_001/part_001",
        selector="#target-text",
        viewport="390,844",
    ),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Capture UI screenshots with Playwright. "
            "Run `npm run dev` in another terminal first."
        )
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help=f"Default: {DEFAULT_BASE_URL}")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Default: {DEFAULT_OUTPUT_DIR.relative_to(REPO_ROOT)}",
    )
    parser.add_argument(
        "--timeout",
        default="10000",
        help="Playwright timeout in milliseconds. Default: 10000",
    )
    parser.add_argument(
        "--channel",
        default="auto",
        help='Browser channel to use, such as "chrome". Default: auto',
    )
    return parser.parse_args()


def has_system_chrome() -> bool:
    if shutil.which("google-chrome") or shutil.which("chrome"):
        return True
    if platform.system() == "Darwin":
        return Path("/Applications/Google Chrome.app").exists()
    return False


def resolve_browser_channel(channel: str) -> str | None:
    if channel != "auto":
        return channel or None
    return "chrome" if has_system_chrome() else None


def check_dev_server(base_url: str) -> None:
    try:
        with urlopen(base_url, timeout=2) as response:
            if response.status >= 400:
                raise RuntimeError(f"dev server returned HTTP {response.status}")
    except (OSError, URLError) as error:
        raise RuntimeError(
            f"could not reach {base_url}; run `npm run dev` in another terminal first"
        ) from error


def build_url(base_url: str, route: str) -> str:
    return f"{base_url.rstrip('/')}/{route}"


def capture(
    target: ScreenshotTarget,
    base_url: str,
    output_dir: Path,
    timeout: str,
    channel: str | None,
) -> Path:
    output_path = output_dir / f"{target.name}.png"
    command = [
        "playwright",
        "screenshot",
        "--browser",
        "chromium",
        "--viewport-size",
        target.viewport,
        "--wait-for-selector",
        target.selector,
        "--wait-for-timeout",
        "500",
        "--timeout",
        timeout,
    ]
    if channel:
        command.extend(["--channel", channel])
    if target.full_page:
        command.append("--full-page")
    command.extend([build_url(base_url, target.route), str(output_path)])
    subprocess.run(command, check=True)
    return output_path


def main() -> int:
    args = parse_args()
    if not shutil.which("playwright"):
        print("error: Playwright CLI was not found on PATH", file=sys.stderr)
        return 1

    try:
        check_dev_server(args.base_url)
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    channel = resolve_browser_channel(args.channel)
    for target in TARGETS:
        output_path = capture(target, args.base_url, args.output_dir, args.timeout, channel)
        print(output_path.relative_to(REPO_ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
