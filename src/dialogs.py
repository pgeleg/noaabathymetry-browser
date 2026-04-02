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
    "$null = [FG]::SetForegroundWindow($f.Handle);"
)


def _win_choose_folder():
    try:
        ps = """\
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;

public class FG {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr h);
}

[ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
class FileOpenDialog {}

[ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"),
 InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellItem {
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName,
        [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
    void Compare(IShellItem psi, uint hint, out int piOrder);
}

[ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"),
 InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IFileOpenDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
    void SetFileTypeIndex(uint iFileType);
    void GetFileTypeIndex(out uint piFileType);
    void Advise(IntPtr pfde, out uint pdwCookie);
    void Unadvise(uint dwCookie);
    void SetOptions(uint fos);
    void GetOptions(out uint pfos);
    void SetDefaultFolder(IntPtr psi);
    void SetFolder(IntPtr psi);
    void GetFolder(out IntPtr ppsi);
    void GetCurrentSelection(out IntPtr ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
    void GetResult(out IShellItem ppsi);
    void AddPlace(IntPtr psi, int fdap);
    void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
    void Close(int hr);
    void SetClientGuid(ref Guid guid);
    void ClearClientData();
    void SetFilter(IntPtr pFilter);
    void GetResults(out IntPtr ppenum);
    void GetSelectedItems(out IntPtr ppsai);
}

public class FolderPicker {
    public static string Pick(IntPtr owner, string title) {
        IFileOpenDialog dlg = (IFileOpenDialog)(new FileOpenDialog());
        uint options;
        dlg.GetOptions(out options);
        dlg.SetOptions(options | 0x20 | 0x40);
        if (title != null) dlg.SetTitle(title);
        if (dlg.Show(owner) != 0) return "";
        IShellItem item;
        dlg.GetResult(out item);
        string path;
        item.GetDisplayName(0x80058000, out path);
        return path != null ? path : "";
    }
}
'

[FG]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[FG]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
$f = New-Object System.Windows.Forms.Form
$f.TopMost = $true
$f.ShowInTaskbar = $false
$f.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$f.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$f.Location = New-Object System.Drawing.Point(-32000, -32000)
$f.Size = New-Object System.Drawing.Size(1, 1)
$f.Show()
$null = [FG]::SetForegroundWindow($f.Handle)

$result = [FolderPicker]::Pick($f.Handle, "Select Project Directory")
$f.Close()
if ($result) { $result } else { "" }
"""
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
