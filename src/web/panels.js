// UI panel logic — connects buttons to the Python bridge via WebSocket.
// bridge object is provided by bridge-ws.js

function _onBridgeReady() {
    bridge.prewarm_scheme(document.getElementById("data-source").value);
    bridge.get_cpu_count(function (count) {
        document.getElementById("opt-workers").max = Math.max(1, Math.floor(count / 2));
        document.getElementById("opt-workers").placeholder = "1";
    });
    bridge.get_recents(function (response) {
        var recents = JSON.parse(response);
        if (recents.length > 0) {
            var recent = recents[0];
            var path = typeof recent === "string" ? recent : recent.path;
            var source = typeof recent === "string" ? "bluetopo" : (recent.source || "bluetopo");
            document.getElementById("project-dir").value = path;
            lastCommittedDir = path;
            updateOpenFolderBtn();
            setSource(source);
            var basemap = recent.basemap;
            if (basemap) setBasemapByName(basemap);
            trackedStartup = true;
            toggleTrackedLayer();
        } else {
            showToast({ icon: "👋", title: "Welcome", body: "<span class='welcome-subtitle'>Get started</span><div class='welcome-steps'><div>1. Enter a project directory<div class='welcome-step-note'>Don't worry, we'll create it if it doesn't exist yet.</div></div><div>2. Draw your area of interest</div><div>3. Click Fetch to download tiles</div></div><div class='welcome-hint'>Hint: Turn on the NBS Source layer in the bottom left to see NBS offerings.</div>", duration: 120000 }, "toast-welcome");
        }
    });
}

function glowElement(el) {
    el.classList.remove("glow");
    void el.offsetWidth; // reflow to restart animation
    el.classList.add("glow");
}

var dirDebounce = null;

function onDirInput() {
    justFocused = false;
    clearTimeout(dirDebounce);
    dirDebounce = setTimeout(function () {
        if (!bridge) return;
        var val = document.getElementById("project-dir").value;
        if (!val || val.length < 2) {
            showRecents();
            return;
        }
        bridge.complete_path(val, function (response) {
            var paths = JSON.parse(response);
            var box = document.getElementById("dir-suggestions");
            if (paths.length === 0) {
                hideSuggestions();
                return;
            }
            box.innerHTML = "";
            selectedIndex = -1;
            paths.forEach(function (p) {
                var div = document.createElement("div");
                div.textContent = p;
                div.onclick = function () {
                    var input = document.getElementById("project-dir");
                    input.value = p;
                    lastCommittedDir = p;
                    updateOpenFolderBtn();
                    hideSuggestions();
                    glowElement(input.closest(".dir-input-wrap"));
                    refreshTracked();
                };
                box.appendChild(div);
            });
            box.style.display = "block";
        });
    }, 150);
}

function setSource(value) {
    document.getElementById("data-source").value = value;
    var items = document.querySelectorAll("#source-dropdown .dropdown-item");
    items.forEach(function (item) {
        if (item.getAttribute("data-value") === value) {
            document.getElementById("source-label").textContent = item.textContent;
            item.classList.add("selected");
        } else {
            item.classList.remove("selected");
        }
    });
}

var lastCommittedDir = "";

var justFocused = false;

function onDirFocus() {
    justFocused = true;
    showRecents();
}

function onDirClick() {
    if (!justFocused) {
        showRecents();
    }
}

function showRecents() {
    if (!bridge) return;
    bridge.get_recents(function (response) {
        var recents = JSON.parse(response);
        var box = document.getElementById("dir-suggestions");
        if (recents.length === 0) {
            hideSuggestions();
            return;
        }
        box.innerHTML = "";
        selectedIndex = -1;
        var label = document.createElement("div");
        label.textContent = "RECENT";
        label.className = "suggestions-label";
        box.appendChild(label);
        recents.forEach(function (r) {
            var path = typeof r === "string" ? r : r.path;
            var source = typeof r === "string" ? "bluetopo" : (r.source || "bluetopo");
            var div = document.createElement("div");
            div.className = "recent-item";
            var pathSpan = document.createElement("span");
            pathSpan.className = "recent-path";
            pathSpan.textContent = path;
            var sourceSpan = document.createElement("span");
            sourceSpan.className = "recent-source";
            sourceSpan.textContent = source;
            div.appendChild(pathSpan);
            div.appendChild(sourceSpan);
            div.onclick = function () {
                var input = document.getElementById("project-dir");
                var currentSource = document.getElementById("data-source").value;
                input.value = path;
                lastCommittedDir = path;
                updateOpenFolderBtn();
                setSource(source);
                hideSuggestions();
                if (source !== currentSource) {
                    refreshAllLayers();
                } else {
                    refreshTracked();
                }
                glowElement(input.closest(".dir-input-wrap"));
                glowElement(document.getElementById("source-select"));
            };
            box.appendChild(div);
        });
        box.style.display = "block";
    });
}

var selectedIndex = -1;

document.getElementById("project-dir").addEventListener("keydown", function (e) {
    var box = document.getElementById("dir-suggestions");
    var items = box.querySelectorAll("div:not(.suggestions-label)");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
    } else if (e.key === "Tab") {
        if (items.length > 0) {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection(items);
            var input = document.getElementById("project-dir");
            input.value = items[selectedIndex].textContent;
            input.setSelectionRange(input.value.length, input.value.length);
        }
    } else if (e.key === "Enter") {
        e.preventDefault();
        var input = document.getElementById("project-dir");
        if (selectedIndex >= 0 && selectedIndex < items.length) {
            input.value = items[selectedIndex].textContent;
            input.setSelectionRange(input.value.length, input.value.length);
        }
        hideSuggestions();
        lastCommittedDir = input.value;
        updateOpenFolderBtn();
        input.blur();
        glowElement(input.closest(".dir-input-wrap"));
        refreshTracked();
    } else if (e.key === "Escape") {
        hideSuggestions();
    }
});

function updateSelection(items) {
    items.forEach(function (item, i) {
        item.classList.toggle("active", i === selectedIndex);
    });
    if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
}

function hideSuggestions() {
    document.getElementById("dir-suggestions").style.display = "none";
    selectedIndex = -1;
}

// Hide suggestions when focus leaves or clicking elsewhere
document.getElementById("project-dir").addEventListener("blur", function () {
    // Small delay so click on suggestion registers before hiding
    var input = this;
    setTimeout(function () {
        hideSuggestions();
        if (input.value && input.value !== lastCommittedDir) {
            glowElement(input.closest(".dir-input-wrap"));
        }
        if (input.value !== lastCommittedDir) {
            lastCommittedDir = input.value;
            updateOpenFolderBtn();
            refreshTracked();
        }
    }, 200);
});

document.addEventListener("click", function (e) {
    if (!e.target.closest("#project-dir") && !e.target.closest("#dir-suggestions")) {
        hideSuggestions();
    }
});

function browseDir() {
    if (!bridge) return;
    bridge.browse_directory(function (path) {
        if (path) {
            var input = document.getElementById("project-dir");
            input.value = path;
            lastCommittedDir = path;
            updateOpenFolderBtn();
            glowElement(input.closest(".dir-input-wrap"));
            refreshTracked();
        }
    });
}

function openProjectFolder() {
    var dir = document.getElementById("project-dir").value;
    if (!dir) { showToast("Enter a project directory first"); return; }
    if (bridge) bridge.open_folder(dir, function (ok) {
        if (!ok) showToast("Folder not found");
    });
}

function updateOpenFolderBtn() {
    var btn = document.getElementById("btn-open-folder");
    btn.style.display = lastCommittedDir ? "" : "none";
}

// ── Custom data source dropdown ──────────────────────

var sourceOpen = false;

function toggleSourceDropdown() {
    sourceOpen = !sourceOpen;
    document.getElementById("source-dropdown").style.display = sourceOpen ? "block" : "none";
}

function pickSource(el) {
    var value = el.getAttribute("data-value");
    var label = el.textContent;
    document.getElementById("data-source").value = value;
    document.getElementById("source-label").textContent = label;
    // Update selected state
    var items = document.querySelectorAll("#source-dropdown .dropdown-item");
    items.forEach(function (item) {
        item.classList.toggle("selected", item === el);
    });
    toggleSourceDropdown();
    glowElement(document.getElementById("source-select"));
    refreshAllLayers();
}

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
    if (!e.target.closest("#source-select") && !e.target.closest("#source-dropdown")) {
        if (sourceOpen) {
            sourceOpen = false;
            document.getElementById("source-dropdown").style.display = "none";
        }
    }
});

// Mark initial selection
document.addEventListener("DOMContentLoaded", function () {
    var items = document.querySelectorAll("#source-dropdown .dropdown-item");
    if (items.length > 0) items[0].classList.add("selected");
});

// ── Toast & status bar ──────────────────────────────

var docsUrl = "https://noaa-ocs-hydrography.github.io/BlueTopo/";

function switchView(view) {
    document.getElementById("btn-view-app").classList.toggle("active", view === "app");
    document.getElementById("btn-view-docs").classList.toggle("active", view === "docs");
    var overlay = document.getElementById("docs-overlay");
    if (view === "docs") {
        document.getElementById("docs-frame").src = docsUrl;
        overlay.style.display = "block";
    } else {
        overlay.style.display = "none";
    }
}

function showToast(msg, cls) {
    var container = document.getElementById("toast-container");
    var toast = document.createElement("div");
    toast.className = "toast" + (cls ? " " + cls : "");
    if (cls === "toast-welcome" && typeof msg === "object") {
        toast.innerHTML = '<span class="welcome-icon">' + msg.icon + '</span><div><div class="welcome-title">' + msg.title + '</div><div class="welcome-body">' + msg.body + '</div></div>' +
            '<button class="toast-dismiss" onclick="dismissToast(this)">&#x2303;</button>';
    } else {
        toast.textContent = msg;
    }
    if (cls === "toast-welcome" && msg.duration) {
        toast.style.animation = "slide-in-down 0.4s ease-out, slide-out-up 0.4s ease-in " + (msg.duration / 1000 - 0.4) + "s forwards";
    }
    container.insertBefore(toast, container.firstChild);
    var duration = (cls === "toast-welcome" && msg.duration) ? msg.duration : (cls === "toast-welcome" ? 20000 : 6000);
    setTimeout(function () { toast.remove(); }, duration);
}

function dismissToast(btn) {
    var toast = btn.closest(".toast-welcome");
    if (!toast) return;
    toast.style.animation = "none";
    void toast.offsetWidth;
    toast.style.animation = "slide-out-up 0.4s ease-in forwards";
    setTimeout(function () { toast.remove(); }, 400);
}

function setStatus(left) {
    document.getElementById("statusbar-left").textContent = left || "";
}

// ── Log streaming & results ─────────────────────────

var currentCommand = null;

var logOpen = false;

function showLog() {
    if (!logOpen) {
        logOpen = true;
        document.getElementById("log-pane").style.display = "block";
    }
}

function toggleLog() {
    logOpen = !logOpen;
    document.getElementById("log-pane").style.display = logOpen ? "block" : "none";
}

function appendLog(line) {
    var pre = document.getElementById("results");
    pre.textContent += line + "\n";
    var pane = document.getElementById("log-pane");
    pane.scrollTop = pane.scrollHeight;
}

function clearLog() {
    document.getElementById("results").textContent = "";
}

function showError(msg) {
    showLog();
    appendLog("Error: " + msg);
}

function stripAnsi(s) {
    return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// Called from Python via runJavaScript
function onLogLine(line) {
    line = stripAnsi(line);
    // tqdm lines contain "Tiles" and a percentage — replace instead of append
    if (line.indexOf("Tiles") >= 0 && line.indexOf("%") >= 0) {
        updateProgress(line);
    } else {
        appendLog(line);
    }
}

function updateProgress(line) {
    // Extract just the meaningful parts: "BlueTopo Fetch:  73% | 198/270 Tiles 00:10"
    var clean = line.replace(/\|[^|]*\|/, "|").replace(/[#█▏▎▍▌▋▊▉ ]+\|/, " | ");
    var pre = document.getElementById("results");
    var lines = pre.textContent.split("\n");
    // Replace last line if it was also a progress line
    if (lines.length > 1 && lines[lines.length - 2].indexOf("Tiles") >= 0) {
        lines[lines.length - 2] = clean;
        pre.textContent = lines.join("\n");
    } else {
        appendLog(clean);
    }
    var pane = document.getElementById("log-pane");
    pane.scrollTop = pane.scrollHeight;
}

function onCommandDone(data) {
    var wasCommand = currentCommand;
    var fetched = false;
    try {
        if (data.ok) {
            setStatus("Complete");
            if (wasCommand === "fetch") {
                showToast("Fetch complete");
            } else if (wasCommand === "mosaic") {
                showToast("Mosaic complete");
            } else if (wasCommand === "export") {
                var size = data.result && data.result.zip_size
                    ? " (" + (data.result.zip_size / 1e6).toFixed(1) + " MB)"
                    : "";
                showToast("Export complete" + size);
            } else {
                showToast("Complete");
            }
            fetched = data.result && data.result.downloaded && data.result.downloaded.length > 0;
        } else {
            appendLog("Error: " + data.error);
            setStatus("Failed");
        }
    } finally {
        var doneLabel = wasCommand ? "· " + wasCommand.charAt(0).toUpperCase() + wasCommand.slice(1) + " Done" : "";
        currentCommand = null;
        setButtonsDisabled(false);
        document.getElementById("log-command").textContent = doneLabel;
    }
    // After currentCommand is cleared, refresh tracked layer
    if (fetched) {
        if (trackedActive) {
            reloadTrackedLayer();
        } else {
            trackedIsReload = true;
            toggleTrackedLayer();
        }
    }
}

function getDir() {
    return document.getElementById("project-dir").value;
}

function getSource() {
    return document.getElementById("data-source").value;
}

function setButtonsDisabled(disabled) {
    var btns = ["btn-fetch", "btn-mosaic", "btn-export"];
    var msg = disabled ? "Waiting for current task to finish" : "";
    btns.forEach(function (id) {
        var btn = document.getElementById(id);
        btn.disabled = disabled;
        btn.title = msg;
    });
    var dot = document.getElementById("log-dot");
    if (dot) dot.classList.toggle("active", disabled);
}

function runCommand(name, fn) {
    if (!bridge) { showError("Bridge not ready"); return; }
    if (currentCommand) { showError("A command is already running."); return; }
    if (name === "fetch" && trackedLoading) { showToast("Waiting for your project to finish loading..."); return; }
    var dir = getDir();
    if (!dir) { showError("Please enter a project directory."); return; }

    currentCommand = name;
    clearLog();
    showLog();
    setButtonsDisabled(true);
    setStatus(name.charAt(0).toUpperCase() + name.slice(1) + "...");
    var runLabel = name === "fetch" ? "Fetching..." : name === "mosaic" ? "Mosaicing..." : "Exporting...";
    document.getElementById("log-command").textContent = "· " + runLabel;
    try {
        fn(dir);
    } catch (e) {
        currentCommand = null;
        setButtonsDisabled(false);
        showError(String(e));
    }
}

// ── Geometry field autocomplete ──────────────────────

function looksLikePath(val) {
    if (!val) return false;
    if (val.charAt(0) === "/" || val.charAt(0) === "\\") return true;
    if (val.length >= 2 && val.charAt(1) === ":" && /[a-zA-Z]/.test(val.charAt(0))) return true;
    if (val.charAt(0) === "~") return true;
    return false;
}

var geomDebounce = null;

function onGeomInput() {
    clearTimeout(geomDebounce);
    var val = document.getElementById("opt-geometry").value;
    if (!looksLikePath(val) || !bridge) {
        hideGeomSuggestions();
        return;
    }
    geomDebounce = setTimeout(function () {
        bridge.complete_path(val, function (response) {
            var paths = JSON.parse(response);
            var box = document.getElementById("geom-suggestions");
            if (paths.length === 0) {
                hideGeomSuggestions();
                return;
            }
            box.innerHTML = "";
            paths.forEach(function (p) {
                var div = document.createElement("div");
                div.textContent = p;
                div.onclick = function () {
                    document.getElementById("opt-geometry").value = p;
                    hideGeomSuggestions();
                };
                box.appendChild(div);
            });
            box.style.display = "block";
        });
    }, 150);
}

var geomSelectedIndex = -1;

document.getElementById("opt-geometry").addEventListener("keydown", function (e) {
    var box = document.getElementById("geom-suggestions");
    var items = box.querySelectorAll("div");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        geomSelectedIndex = Math.min(geomSelectedIndex + 1, items.length - 1);
        updateGeomSelection(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        geomSelectedIndex = Math.max(geomSelectedIndex - 1, 0);
        updateGeomSelection(items);
    } else if (e.key === "Tab") {
        if (items.length > 0) {
            e.preventDefault();
            geomSelectedIndex = (geomSelectedIndex + 1) % items.length;
            updateGeomSelection(items);
            this.value = items[geomSelectedIndex].textContent;
            this.setSelectionRange(this.value.length, this.value.length);
        }
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (geomSelectedIndex >= 0 && geomSelectedIndex < items.length) {
            this.value = items[geomSelectedIndex].textContent;
            this.setSelectionRange(this.value.length, this.value.length);
        }
        hideGeomSuggestions();
    } else if (e.key === "Escape") {
        hideGeomSuggestions();
    }
});

function updateGeomSelection(items) {
    items.forEach(function (item, i) {
        item.classList.toggle("active", i === geomSelectedIndex);
    });
    if (geomSelectedIndex >= 0 && items[geomSelectedIndex]) {
        items[geomSelectedIndex].scrollIntoView({ block: "nearest" });
    }
}

function hideGeomSuggestions() {
    document.getElementById("geom-suggestions").style.display = "none";
    geomSelectedIndex = -1;
}

document.getElementById("opt-geometry").addEventListener("blur", function () {
    setTimeout(hideGeomSuggestions, 150);
});

function browseGeometry() {
    if (!bridge) return;
    bridge.browse_geometry(function (path) {
        if (path) {
            var input = document.getElementById("opt-geometry");
            input.value = path;
            input.blur();
            // Scroll to show end of path
            input.setSelectionRange(path.length, path.length);
            input.scrollLeft = input.scrollWidth;
        }
    });
}

// Numeric-only inputs — strip non-numeric on input, clamp on blur
document.getElementById("opt-resolution").addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9.]/g, "");
});
document.getElementById("opt-resolution").addEventListener("blur", function () {
    if (this.value !== "" && (parseFloat(this.value) < 1 || isNaN(parseFloat(this.value)))) {
        this.value = "";
    }
});

document.getElementById("opt-workers").addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
});
document.getElementById("opt-workers").addEventListener("blur", function () {
    if (this.value !== "" && (parseInt(this.value) < 1 || isNaN(parseInt(this.value)))) {
        this.value = "";
    }
});

function getMosaicOptions() {
    var opts = {
        hillshade: document.getElementById("opt-hillshade").classList.contains("on"),
    };
    var w = document.getElementById("opt-workers").value;
    if (w) opts.workers = parseInt(w, 10);
    var r = document.getElementById("opt-resolution").value;
    if (r) opts.resolution_target = parseFloat(r);
    return JSON.stringify(opts);
}

function runFetch() {
    runCommand("fetch", function (dir) {
        var geom = document.getElementById("opt-geometry").value || "";
        var resFilter = document.getElementById("opt-fetch-resolution").value || "";
        bridge.fetch(dir, geom, getSource(), resFilter);
    });
}

function runMosaic() {
    runCommand("mosaic", function (dir) {
        bridge.mosaic(dir, getSource(), getMosaicOptions());
    });
}

function runExport() {
    runCommand("export", function (dir) {
        var includeMosaics = document.getElementById("opt-export-mosaics").classList.contains("on");
        var flagForRepair = document.getElementById("opt-export-repair").classList.contains("on");
        bridge.export(dir, getSource(), includeMosaics, flagForRepair);
    });
}


