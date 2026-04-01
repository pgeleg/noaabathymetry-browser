"""Entry point — starts localhost server and opens the system browser."""

import os
import secrets
import socket
import sys
import tempfile
import webbrowser

from aiohttp import web

from src.server import create_app

_LOCK_FILE = os.path.join(tempfile.gettempdir(), "nbs_bathymetry.lock")
_lock_fh = None


def _find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _acquire_lock():
    """Prevent multiple instances via OS-level file lock.

    The lock is held as long as the process is alive — the OS releases
    it automatically on crash, kill, or os._exit().
    """
    global _lock_fh
    try:
        _lock_fh = open(_LOCK_FILE, "w")
        if sys.platform == "win32":
            import msvcrt
            msvcrt.locking(_lock_fh.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(_lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except (IOError, OSError):
        return False


def _setup_ssl():
    """Set SSL certificate path for GDAL /vsicurl/ HTTPS requests."""
    try:
        import certifi
        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
        os.environ.setdefault("CURL_CA_BUNDLE", certifi.where())
    except ImportError:
        pass


def main():
    if not _acquire_lock():
        sys.exit(0)

    _setup_ssl()
    port = _find_free_port()
    token = secrets.token_urlsafe(32)
    app = create_app(token)

    async def on_startup(app):
        webbrowser.open(f"http://127.0.0.1:{port}?token={token}")

    app.on_startup.append(on_startup)
    web.run_app(app, host="127.0.0.1", port=port, print=None)


if __name__ == "__main__":
    main()
