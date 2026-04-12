---
sidebar_position: 6
title: Troubleshooting
---

# Troubleshooting

## macOS: App blocked by Gatekeeper

Because the app is unsigned, macOS may prevent it from opening. To resolve:

- Right-click (or Control-click) the app and select **Open**, then click **Open** in the confirmation dialog
- Or run in Terminal:
  ```bash
  xattr -cr /path/to/noaabathymetry.app
  ```

## Windows: SmartScreen warning

Windows SmartScreen may block the app because it is unsigned:

- Click **More info** in the SmartScreen dialog
- Click **Run anyway**

## "Already running" message

The app uses instance locking to prevent duplicate launches. If you see this message:

- Check if the app is already open in another browser tab
- If the app crashed previously, the lock file may be stale. Restarting should resolve it.

## App opens but map doesn't load

- Verify your internet connection — the map tiles and NBS data are loaded from remote servers
- Check that your browser supports WebGL (required by MapLibre GL)
- Try a different browser

## Tiles not appearing on the map

- Ensure you have the correct **Data Source** selected in the dropdown
- Toggle the **NBS Source** layer on to verify tile coverage exists in your area
- Check the output log for error messages

## Version check

The app checks for updates on startup. If a newer version is available, a toast notification will appear with details. Download the latest version from the [releases page](https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/releases).

## Reporting bugs

File bug reports on the [GitHub Issues](https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/issues) page. Issue templates are available for bugs, feature requests, and questions.

For security vulnerabilities, follow the instructions in the [Security Policy](https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/blob/main/SECURITY.md).
