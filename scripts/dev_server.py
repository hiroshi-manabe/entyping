#!/usr/bin/env python3
from __future__ import annotations

import argparse
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_ROOT = REPO_ROOT / "app" / "site"
CONTENT_ROOT = REPO_ROOT / "content"


class EntypingDevHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed_path = urlsplit(path).path
        normalized = posixpath.normpath(unquote(parsed_path))
        relative = normalized.lstrip("/")

        if relative.startswith("content/"):
            root = REPO_ROOT
        else:
            root = SITE_ROOT
            if not relative or relative == ".":
                relative = "index.html"

        candidate = (root / relative).resolve()
        try:
            candidate.relative_to(root.resolve())
        except ValueError:
            return str(root / "__forbidden__")

        return str(candidate)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve app/site locally and expose local content packages under /content/."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=4173, help="Default: 4173")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not SITE_ROOT.exists():
        raise SystemExit(f"site root not found: {SITE_ROOT}")

    server = ThreadingHTTPServer((args.host, args.port), EntypingDevHandler)
    print(f"serving http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
