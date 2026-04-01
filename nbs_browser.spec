# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for National Bathymetric Source Browser GUI.

No Qt/PySide6 — uses aiohttp + system browser.
Single file executable on both platforms.

Usage:
    pyinstaller nbs_browser.spec
"""

import os
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# ── Platform ──────────────────────────────────────────

is_win = sys.platform == "win32"
is_mac = sys.platform == "darwin"

# ── Paths ──────────────────────────────────────────────

env = Path(sys.prefix)
src_dir = Path("src")
web_dir = src_dir / "web"

if is_win:
    gdal_data = env / "Library" / "share" / "gdal"
    proj_data = env / "Library" / "share" / "proj"
else:
    gdal_data = env / "share" / "gdal"
    proj_data = env / "share" / "proj"

# ── Data files ───────────────────────────���─────────────

datas = [
    # Web assets
    (str(web_dir / "index.html"), "src/web"),
    (str(web_dir / "styles.css"), "src/web"),
    (str(web_dir / "map.js"), "src/web"),
    (str(web_dir / "panels.js"), "src/web"),
    (str(web_dir / "bridge-ws.js"), "src/web"),
    # GDAL + PROJ data
    (str(gdal_data), "share/gdal"),
    (str(proj_data), "share/proj"),
]

datas += collect_data_files("botocore")
datas += collect_data_files("certifi")

# ── Hidden imports ─────────────────────────────────────

hiddenimports = [
    *collect_submodules("nbs.noaabathymetry"),
    "osgeo", "osgeo.gdal", "osgeo.ogr", "osgeo.osr",
    *collect_submodules("boto3"),
    *collect_submodules("botocore"),
    *collect_submodules("aiohttp"),
    "multidict", "yarl", "aiosignal", "frozenlist",
    "tqdm",
    "tkinter", "tkinter.filedialog",
]

# ── Runtime hooks ──────────────────────────────────────

runtime_hook_content = '''
import os, sys
if getattr(sys, '_MEIPASS', None):
    base = sys._MEIPASS
    os.environ.setdefault("GDAL_DATA", os.path.join(base, "share", "gdal"))
    os.environ.setdefault("PROJ_LIB", os.path.join(base, "share", "proj"))
'''

runtime_hook_path = os.path.join("build", "_rthook_gdal.py")
os.makedirs("build", exist_ok=True)
with open(runtime_hook_path, "w") as f:
    f.write(runtime_hook_content)

# ── Icon ──────────────────────────────────────────────

if is_win and os.path.exists("assets/NOAA.ico"):
    exe_icon = "assets/NOAA.ico"
elif os.path.exists("assets/NOAA-1.png"):
    exe_icon = "assets/NOAA-1.png"
else:
    exe_icon = None

# ── Analysis ───────────────────────────────────────────

a = Analysis(
    ["src/main.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[runtime_hook_path],
    excludes=[
        "matplotlib",
        "numpy.distutils",
        "test",
        "unittest",
        "PySide6",
        "PyQt5",
        "PyQt6",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="noaabathymetry",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    onefile=True,
    console=False,
    icon=exe_icon,
)
