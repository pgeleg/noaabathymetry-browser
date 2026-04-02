"""Entry point — starts localhost server and opens the system browser."""

import multiprocessing
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


def _bind_socket():
    """Bind to a free port on localhost. Returns the socket (kept open)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    assert sock.getsockname()[0] == "127.0.0.1", "Server must bind to localhost only"
    sock.listen(1)
    return sock


def _acquire_lock():
    """Prevent multiple instances via OS-level file lock.

    The lock is held as long as the process is alive — the OS releases
    it automatically on crash, kill, or os._exit().
    If locking fails, check if the PID in the lock file is still alive.
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
        _lock_fh.write(str(os.getpid()))
        _lock_fh.flush()
        return True
    except (IOError, OSError):
        # Lock held — check if the process is actually alive
        try:
            _lock_fh.close()
            with open(_LOCK_FILE, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, 0)
            return False  # Process is alive
        except (ValueError, OSError, ProcessLookupError):
            # Stale lock — force acquire
            _lock_fh = open(_LOCK_FILE, "w")
            if sys.platform == "win32":
                pass  # Windows already released on close
            else:
                import fcntl
                fcntl.flock(_lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
            _lock_fh.write(str(os.getpid()))
            _lock_fh.flush()
            return True


def _setup_ssl():
    """Set SSL certificate path for GDAL /vsicurl/ HTTPS requests."""
    try:
        import certifi
        ca = certifi.where()
        os.environ.setdefault("SSL_CERT_FILE", ca)
        os.environ.setdefault("CURL_CA_BUNDLE", ca)
        os.environ.setdefault("REQUESTS_CA_BUNDLE", ca)
        # Also set via GDAL config for vsicurl
        from osgeo import gdal
        gdal.SetConfigOption("GDAL_CURL_CA_BUNDLE", ca)
        gdal.SetConfigOption("CURL_CA_BUNDLE", ca)
    except ImportError:
        pass


def main():
    multiprocessing.freeze_support()

    try:
        if not _acquire_lock():
            sys.exit(0)
    except Exception:
        sys.exit(0)  # Lock failed — don't risk a duplicate instance

    _setup_ssl()
    sock = _bind_socket()
    assert sock.getsockname()[0] == "127.0.0.1", "Server must bind to localhost only"
    port = sock.getsockname()[1]
    token = secrets.token_urlsafe(32)
    app = create_app(token)

    async def on_startup(app):
        webbrowser.open(f"http://127.0.0.1:{port}?token={token}")

    app.on_startup.append(on_startup)
    web.run_app(app, sock=sock, print=None)


if __name__ == "__main__":
    main()
