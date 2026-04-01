"""aiohttp application — serves web UI and handles WebSocket communication."""

import asyncio
import json
import os

from aiohttp import web

from src.bridge import Bridge


_shutdown_handle = None


def create_app(token):
    app = web.Application()
    app["token"] = token
    app["ws"] = None
    app["bridge"] = None

    web_dir = os.path.join(os.path.dirname(__file__), "web")
    app["web_dir"] = web_dir

    app.router.add_get("/", index_handler)
    app.router.add_get("/ws", websocket_handler)
    app.router.add_static("/static", web_dir)

    # If no WebSocket connects within 30s of startup, shut down
    async def _startup_timeout(app):
        async def _check():
            await asyncio.sleep(30)
            if app["ws"] is None:
                os._exit(0)
        asyncio.create_task(_check())

    app.on_startup.append(_startup_timeout)

    return app


def _validate_token(request):
    return request.query.get("token") == request.app["token"]


async def index_handler(request):
    if not _validate_token(request):
        return web.Response(status=403, text="Forbidden")
    path = os.path.join(request.app["web_dir"], "index.html")
    return web.FileResponse(path)


async def websocket_handler(request):
    if not _validate_token(request):
        return web.Response(status=403, text="Forbidden")

    ws = web.WebSocketResponse()
    await ws.prepare(request)

    loop = asyncio.get_event_loop()

    # Cancel any pending shutdown
    global _shutdown_handle
    if _shutdown_handle is not None:
        _shutdown_handle.cancel()
        _shutdown_handle = None

    # Disconnect previous session if any
    old_ws = request.app["ws"]
    if old_ws is not None and not old_ws.closed:
        await old_ws.close()

    request.app["ws"] = ws

    def send_msg(msg):
        """Thread-safe send to WebSocket."""
        if not ws.closed:
            asyncio.run_coroutine_threadsafe(ws.send_json(msg), loop)

    bridge = Bridge(send_msg)
    request.app["bridge"] = bridge

    try:
        async for raw in ws:
            if raw.type == web.WSMsgType.TEXT:
                try:
                    msg = json.loads(raw.data)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")
                if msg_type != "call":
                    continue

                call_id = msg.get("id")
                method = msg.get("method")
                args = msg.get("args", {})

                await _dispatch(bridge, ws, call_id, method, args, loop)
    finally:
        request.app["ws"] = None
        request.app["bridge"] = None
        # Start grace period — shut down if no reconnection
        _shutdown_handle = loop.call_later(5, _shutdown)

    return ws


def _shutdown():
    os._exit(0)


# Methods that return a value synchronously
_SYNC_METHODS = {
    "get_recents", "get_cpu_count", "browse_directory",
    "browse_geometry", "complete_path", "save_basemap",
    "remove_recent",
}

# Methods that run async (thread-based, push results via signals)
_ASYNC_METHODS = {
    "fetch", "mosaic", "load_remote_layer", "load_tracked_layer",
}


async def _dispatch(bridge, ws, call_id, method, args, loop):
    if method in _SYNC_METHODS:
        fn = getattr(bridge, method, None)
        if fn is None:
            return
        # Run sync methods in thread to avoid blocking event loop
        # (browse_directory/browse_geometry spawn subprocesses)
        result = await loop.run_in_executor(None, lambda: fn(**args))
        if call_id is not None and not ws.closed:
            await ws.send_json({"type": "result", "id": call_id, "data": result})

    elif method in _ASYNC_METHODS:
        fn = getattr(bridge, method, None)
        if fn is None:
            return
        # These methods start their own threads and push via send_msg
        fn(**args)
