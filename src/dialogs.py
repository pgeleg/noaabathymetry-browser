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


def _win_startupinfo():
    """Hide the PowerShell console window on Windows."""
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    si.wShowWindow = 0  # SW_HIDE
    return si


_WIN_OWNER_FORM = (
    "Add-Type -TypeDefinition '"
    "using System; using System.Runtime.InteropServices; "
    "public class FG { "
    '[DllImport("user32.dll")] '
    "public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e); "
    '[DllImport("user32.dll")] '
    "public static extern bool SetForegroundWindow(IntPtr h); "
    "}';"
    "[FG]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero);"
    "[FG]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero);"
    "$f = New-Object System.Windows.Forms.Form;"
    "$f.TopMost = $true;"
    "$f.ShowInTaskbar = $false;"
    '$f.FormBorderStyle = "None";'
    '$f.StartPosition = "Manual";'
    "$f.Location = New-Object System.Drawing.Point(-32000, -32000);"
    "$f.Size = New-Object System.Drawing.Size(1, 1);"
    "$f.Show();"
    "[FG]::SetForegroundWindow($f.Handle);"
)


def _win_choose_folder():
    try:
        ps = (
            'Add-Type -AssemblyName System.Windows.Forms;'
            + _WIN_OWNER_FORM +
            '$d = New-Object System.Windows.Forms.OpenFileDialog;'
            '$d.ValidateNames = $false;'
            '$d.CheckFileExists = $false;'
            '$d.CheckPathExists = $true;'
            '$d.FileName = "Select Folder";'
            '$d.Title = "Select Project Directory";'
            '$d.Filter = "Folders|no_file";'
            'if ($d.ShowDialog($f) -eq "OK") { [System.IO.Path]::GetDirectoryName($d.FileName) } else { "" };'
            '$f.Close()'
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
            capture_output=True, text=True, timeout=300,
            startupinfo=_win_startupinfo(),
        )
        return result.stdout.strip()
    except Exception:
        return ""


def _win_choose_file():
    try:
        ps = (
            'Add-Type -AssemblyName System.Windows.Forms;'
            + _WIN_OWNER_FORM +
            '$d = New-Object System.Windows.Forms.OpenFileDialog;'
            '$d.Title = "Select Geometry File";'
            '$d.Filter = "All Supported|*.gpkg;*.shp;*.geojson;*.json;*.kml|'
            'GeoPackage|*.gpkg|Shapefile|*.shp|GeoJSON|*.geojson;*.json|KML|*.kml|All Files|*.*";'
            'if ($d.ShowDialog($f) -eq "OK") { $d.FileName } else { "" };'
            '$f.Close()'
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
            capture_output=True, text=True, timeout=300,
            startupinfo=_win_startupinfo(),
        )
        return result.stdout.strip()
    except Exception:
        return ""
