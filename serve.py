"""Dev server for The Bartender's Ledger.

Same as `python -m http.server` but sends Cache-Control: no-cache so the
browser always revalidates — edited files show up on plain reload instead
of hiding behind the heuristic HTTP cache. (In production the service
worker owns caching; this server is for development only.)

Usage: py serve.py [port]
"""
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8631
    root = Path(__file__).parent
    import os
    os.chdir(root)
    print(f"Serving {root} at http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
