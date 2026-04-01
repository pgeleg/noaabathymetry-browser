"""Native file dialogs using OS-native commands.

macOS: osascript (AppleScript)
Windows: PowerShell
"""

import subprocess
import sys


def browse_directory():
    """Open a native folder picker, return selected path or empty string."""
    if sys.platform == "darwin":
        return _mac_choose_folder()
    elif sys.platform == "win32":
        return _win_choose_folder()
    return ""


def browse_geometry():
    """Open a file picker for geometry files, return selected path or empty string."""
    if sys.platform == "darwin":
        return _mac_choose_file()
    elif sys.platform == "win32":
        return _win_choose_file()
    return ""


def _mac_choose_folder():
    try:
        result = subprocess.run(
            ["osascript", "-e",
             'set f to POSIX path of (choose folder with prompt "Select Project Directory")\nreturn f'],
            capture_output=True, text=True, timeout=300,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def _mac_choose_file():
    try:
        result = subprocess.run(
            ["osascript", "-e",
             'set f to POSIX path of (choose file with prompt "Select Geometry File" '
             'of type {"gpkg", "shp", "geojson", "json", "kml"})\nreturn f'],
            capture_output=True, text=True, timeout=300,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def _win_choose_folder():
    try:
        ps = (
            'Add-Type -AssemblyName System.Windows.Forms;'
            '$d = New-Object System.Windows.Forms.FolderBrowserDialog;'
            '$d.Description = "Select Project Directory";'
            'if ($d.ShowDialog() -eq "OK") { $d.SelectedPath } else { "" }'
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True, text=True, timeout=300,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def _win_choose_file():
    try:
        ps = (
            'Add-Type -AssemblyName System.Windows.Forms;'
            '$d = New-Object System.Windows.Forms.OpenFileDialog;'
            '$d.Title = "Select Geometry File";'
            '$d.Filter = "All Supported|*.gpkg;*.shp;*.geojson;*.json;*.kml|'
            'GeoPackage|*.gpkg|Shapefile|*.shp|GeoJSON|*.geojson;*.json|KML|*.kml|All Files|*.*";'
            'if ($d.ShowDialog() -eq "OK") { $d.FileName } else { "" }'
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True, text=True, timeout=300,
        )
        return result.stdout.strip()
    except Exception:
        return ""
