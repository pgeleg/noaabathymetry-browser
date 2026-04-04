// MapLibre map with draw tools for AOI selection.

// ── Basemaps ─────────────────────────────────────────

var cartoAttribution = '© <a href="https://carto.com/" target="_blank">CARTO</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

var basemapStyles = {
    "Voyager": {
        version: 8,
        sources: { carto: { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"], tileSize: 256, attribution: cartoAttribution } },
        layers: [{ id: "carto", type: "raster", source: "carto" }]
    },
    "Dark": {
        version: 8,
        sources: { carto: { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"], tileSize: 256, attribution: cartoAttribution } },
        layers: [{ id: "carto", type: "raster", source: "carto" }]
    },
    "Light": {
        version: 8,
        sources: { carto: { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], tileSize: 256, attribution: cartoAttribution } },
        layers: [{ id: "carto", type: "raster", source: "carto" }]
    },
};

var basemapNames = Object.keys(basemapStyles);
var basemapIndex = 0;

var map = new maplibregl.Map({
    container: "map",
    style: basemapStyles["Voyager"],
    center: [-80, 30],
    zoom: 4,
    attributionControl: false,
});

// Integer zoom with smooth animation on scroll
map.scrollZoom.disable();
var scrollZooming = false;
map.getCanvas().addEventListener("wheel", function (e) {
    e.preventDefault();
    if (scrollZooming) return;
    scrollZooming = true;
    var z = Math.round(map.getZoom());
    var newZ = e.deltaY < 0 ? z + 1 : z - 1;
    newZ = Math.max(1, Math.min(20, newZ));
    if (e.deltaY < 0) {
        var point = map.unproject([e.offsetX, e.offsetY]);
        map.easeTo({ zoom: newZ, center: point, duration: 300 });
    } else {
        map.easeTo({ zoom: newZ, duration: 300 });
    }
    map.once("moveend", function () { scrollZooming = false; });
}, { passive: false });

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

function setBasemapByName(name) {
    var idx = basemapNames.indexOf(name);
    if (idx >= 0 && idx !== basemapIndex) setBasemap(idx);
}

function setBasemap(idx) {
    basemapIndex = idx;
    // Preserve sources/layers we've added
    var center = map.getCenter();
    var zoom = map.getZoom();
    map.setStyle(basemapStyles[basemapNames[idx]]);
    map.once("styledata", function () {
        map.jumpTo({ center: center, zoom: zoom });
        readdAllSources();
    });
    if (bridge) bridge.save_basemap(basemapNames[idx]);
}

// ── Draw tools (custom polygon drawing) ──────────────

var currentGeometry = null;
var drawingMode = false;
var drawPoints = [];

var DrawControl = {
    onAdd: function () {
        var div = document.createElement("div");
        div.className = "maplibregl-ctrl maplibregl-ctrl-group";
        div.innerHTML =
            '<button id="draw-polygon-btn" class="draw-btn" title="Draw polygon" onclick="startDrawing()">⬠</button>' +
            '<button id="draw-rect-btn" class="draw-btn" title="Draw rectangle" onclick="startRectangle()">▭</button>' +
            '<button id="draw-clear-btn" class="draw-btn" title="Clear geometry" onclick="clearDrawing()">✕</button>';
        return div;
    },
    onRemove: function () {}
};
map.addControl(DrawControl, "top-left");

function startDrawing() {
    if (drawingMode) {
        finishDrawing();
        return;
    }
    if (rectMode) cancelRect();
    drawingMode = true;
    drawPoints = [];
    map.dragPan.disable();
    map.doubleClickZoom.disable();
    map.getCanvas().style.setProperty("cursor", "crosshair", "important");
    document.getElementById("draw-polygon-btn").classList.add("active");
    // Clear previous
    if (map.getSource("draw-polygon")) map.getSource("draw-polygon").setData({ type: "FeatureCollection", features: [] });
    if (map.getSource("draw-points")) map.getSource("draw-points").setData({ type: "FeatureCollection", features: [] });
}

function finishDrawing() {
    drawingMode = false;
    map.dragPan.enable();
    map.doubleClickZoom.enable();
    map.getCanvas().style.setProperty("cursor", "", "");
    document.getElementById("draw-polygon-btn").classList.remove("active");
    if (drawPoints.length >= 3) {
        var coords = drawPoints.slice();
        coords.push(coords[0]); // close the ring
        var geom = { type: "Polygon", coordinates: [coords] };
        currentGeometry = JSON.stringify(geom);
        var input = document.getElementById("opt-geometry");
        input.value = currentGeometry;
        input.scrollLeft = input.scrollWidth;
        updateDrawLayer();
    }
}

function clearDrawing() {
    drawingMode = false;
    drawPoints = [];
    currentGeometry = null;
    map.dragPan.enable();
    map.doubleClickZoom.enable();
    map.getCanvas().style.setProperty("cursor", "", "");
    document.getElementById("draw-polygon-btn").classList.remove("active");
    document.getElementById("draw-rect-btn").classList.remove("active");
    document.getElementById("opt-geometry").value = "";
    if (map.getSource("draw-polygon")) map.getSource("draw-polygon").setData({ type: "FeatureCollection", features: [] });
    if (map.getSource("draw-points")) map.getSource("draw-points").setData({ type: "FeatureCollection", features: [] });
}

// ── Rectangle drawing (drag) ─────────────────────────

var rectMode = false;
var rectStart = null;

function startRectangle() {
    if (rectMode) {
        cancelRect();
        return;
    }
    if (drawingMode) finishDrawing();
    rectMode = true;
    rectStart = null;
    map.dragPan.disable();
    map.getCanvas().style.setProperty("cursor", "crosshair", "important");
    document.getElementById("draw-rect-btn").classList.add("active");
}

function cancelRect() {
    rectMode = false;
    rectStart = null;
    map.dragPan.enable();
    map.getCanvas().style.setProperty("cursor", "", "");
    document.getElementById("draw-rect-btn").classList.remove("active");
}

function finishRect(start, end) {
    rectMode = false;
    rectStart = null;
    map.dragPan.enable();
    map.getCanvas().style.setProperty("cursor", "", "");
    document.getElementById("draw-rect-btn").classList.remove("active");
    var coords = [
        [start.lng, start.lat],
        [end.lng, start.lat],
        [end.lng, end.lat],
        [start.lng, end.lat],
        [start.lng, start.lat],
    ];
    var geom = { type: "Polygon", coordinates: [coords] };
    currentGeometry = JSON.stringify(geom);
    var input = document.getElementById("opt-geometry");
    input.value = currentGeometry;
    input.scrollLeft = input.scrollWidth;
    drawPoints = coords.slice(0, 4);
    updateDrawLayer();
}

map.on("mousedown", function (e) {
    if (!rectMode) return;
    rectStart = e.lngLat;
});

map.on("mousemove", function (e) {
    if (!rectMode || !rectStart) return;
    var s = rectStart;
    var c = e.lngLat;
    var coords = [
        [s.lng, s.lat], [c.lng, s.lat], [c.lng, c.lat], [s.lng, c.lat], [s.lng, s.lat]
    ];
    if (map.getSource("draw-polygon")) {
        map.getSource("draw-polygon").setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }]
        });
    }
});

map.on("mouseup", function (e) {
    if (!rectMode || !rectStart) return;
    if (Math.abs(e.lngLat.lng - rectStart.lng) > 0.001 || Math.abs(e.lngLat.lat - rectStart.lat) > 0.001) {
        finishRect(rectStart, e.lngLat);
    } else {
        rectStart = null; // click too small, reset
    }
});

function raiseDrawLayers() {
    ["draw-fill", "draw-line", "draw-vertices"].forEach(function (id) {
        if (map.getLayer(id)) map.moveLayer(id);
    });
}

function updateDrawLayer() {
    var features = [];
    if (drawPoints.length >= 3) {
        var coords = drawPoints.slice();
        coords.push(coords[0]);
        features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} });
    } else if (drawPoints.length >= 2) {
        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: drawPoints }, properties: {} });
    }
    if (map.getSource("draw-polygon")) {
        map.getSource("draw-polygon").setData({ type: "FeatureCollection", features: features });
    }
    var pointFeatures = drawPoints.map(function (p) {
        return { type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} };
    });
    if (map.getSource("draw-points")) {
        map.getSource("draw-points").setData({ type: "FeatureCollection", features: pointFeatures });
    }
}

map.on("load", function () {
    map.addSource("draw-polygon", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("draw-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "draw-fill", type: "fill", source: "draw-polygon", paint: { "fill-color": "rgba(100,140,255,0.15)", "fill-opacity": 1 } });
    map.addLayer({ id: "draw-line", type: "line", source: "draw-polygon", paint: { "line-color": "rgba(100,140,255,0.8)", "line-width": 2, "line-dasharray": [3, 2] } });
    map.addLayer({ id: "draw-vertices", type: "circle", source: "draw-points", paint: { "circle-radius": 4, "circle-color": "rgba(100,140,255,1)", "circle-stroke-color": "white", "circle-stroke-width": 1.5 } });
});

function segmentsIntersect(a1, a2, b1, b2) {
    var d1x = a2[0] - a1[0], d1y = a2[1] - a1[1];
    var d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
    var cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-12) return false;
    var dx = b1[0] - a1[0], dy = b1[1] - a1[1];
    var t = (dx * d2y - dy * d2x) / cross;
    var u = (dx * d1y - dy * d1x) / cross;
    return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

function wouldSelfIntersect(points, newPoint) {
    if (points.length < 2) return false;
    var newEdge = [points[points.length - 1], newPoint];
    for (var i = 0; i < points.length - 1; i++) {
        if (segmentsIntersect(newEdge[0], newEdge[1], points[i], points[i + 1])) return true;
    }
    return false;
}

map.on("click", function (e) {
    if (!drawingMode) return;
    var pt = [e.lngLat.lng, e.lngLat.lat];
    if (wouldSelfIntersect(drawPoints, pt)) {
        showToast("Polygon edges cannot cross");
        return;
    }
    drawPoints.push(pt);
    updateDrawLayer();
});

map.on("dblclick", function (e) {
    if (!drawingMode) return;
    e.preventDefault();
    // Check if closing edge would self-intersect
    if (drawPoints.length >= 3 && wouldSelfIntersect(drawPoints, drawPoints[0])) {
        showToast("Polygon edges cannot cross");
        return;
    }
    finishDrawing();
});

// ── Cursor coordinates ───────────────────────────────

var coordDiv = document.createElement("div");
coordDiv.className = "map-coords";
coordDiv.textContent = "0.0000, 0.0000";

map.on("mousemove", function (e) {
    coordDiv.textContent = e.lngLat.lat.toFixed(4) + ", " + e.lngLat.lng.toFixed(4);
});

// ── Lat/long gridlines ───────────────────────────────

var gridColorIndex = 0;
var gridWeight = 0.5;
var gridColor = "rgba(255,255,255,0.25)";
var gridLabelColor = "rgba(255,255,255,0.4)";
var gridVisible = false;

var gridColors = [
    { name: "White", line: "rgba(255,255,255,0.25)", label: "rgba(255,255,255,0.4)" },
    { name: "Black", line: "rgba(0,0,0,0.3)", label: "rgba(0,0,0,0.5)" },
    { name: "Blue", line: "rgba(100,140,255,0.3)", label: "rgba(100,140,255,0.5)" },
    { name: "Red", line: "rgba(220,60,60,0.3)", label: "rgba(220,60,60,0.5)" },
];

function buildGridGeoJSON() {
    var features = [];
    for (var lat = -80; lat <= 80; lat += 10) {
        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[-180, lat], [180, lat]] }, properties: { label: lat + "°" } });
    }
    for (var lng = -180; lng <= 180; lng += 10) {
        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[lng, -85], [lng, 85]] }, properties: { label: lng + "°" } });
    }
    return { type: "FeatureCollection", features: features };
}

function addGridToMap() {
    if (map.getSource("grid")) return;
    map.addSource("grid", { type: "geojson", data: buildGridGeoJSON() });
    map.addLayer({ id: "grid-lines", type: "line", source: "grid", paint: { "line-color": gridColor, "line-width": gridWeight } });
}

function removeGridFromMap() {
    if (map.getLayer("grid-lines")) map.removeLayer("grid-lines");
    if (map.getSource("grid")) map.removeSource("grid");
}

function setGridWeight(val) {
    gridWeight = val;
    if (map.getLayer("grid-lines")) map.setPaintProperty("grid-lines", "line-width", gridWeight);
}

function setGridColor(idx) {
    gridColorIndex = idx;
    gridColor = gridColors[idx].line;
    gridLabelColor = gridColors[idx].label;
    if (gridVisible) {
        removeGridFromMap();
        addGridToMap();
    } else {
        gridVisible = true;
        addGridToMap();
    }
    document.getElementById("toolbar-grid").classList.add("toolbar-active");
}

function gridOff() {
    if (gridVisible) {
        gridVisible = false;
        removeGridFromMap();
        document.getElementById("toolbar-grid").classList.remove("toolbar-active");
    }
}

// ── UTM zone dividers ────────────────────────────────

var utmColorIndex = 0;
var utmWeight = 1;
var utmColor = "rgba(255,180,50,0.3)";
var utmLabelColor = "rgba(255,180,50,0.5)";
var utmVisible = false;

var utmColors = [
    { name: "Amber", line: "rgba(255,180,50,0.3)", label: "rgba(255,180,50,0.5)" },
    { name: "White", line: "rgba(255,255,255,0.25)", label: "rgba(255,255,255,0.4)" },
    { name: "Black", line: "rgba(0,0,0,0.3)", label: "rgba(0,0,0,0.5)" },
    { name: "Green", line: "rgba(100,190,140,0.3)", label: "rgba(100,190,140,0.5)" },
];

function buildUtmGeoJSON() {
    var features = [];
    for (var zone = 1; zone <= 60; zone++) {
        var lng = -180 + (zone - 1) * 6;
        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[lng, -80], [lng, 84]] }, properties: { label: String(zone) } });
    }
    return { type: "FeatureCollection", features: features };
}

function addUtmToMap() {
    if (map.getSource("utm")) return;
    map.addSource("utm", { type: "geojson", data: buildUtmGeoJSON() });
    map.addLayer({ id: "utm-lines", type: "line", source: "utm", paint: { "line-color": utmColor, "line-width": utmWeight, "line-dasharray": [4, 4] } });
}

function removeUtmFromMap() {
    if (map.getLayer("utm-lines")) map.removeLayer("utm-lines");
    if (map.getSource("utm")) map.removeSource("utm");
}

function setUtmWeight(val) {
    utmWeight = val;
    if (map.getLayer("utm-lines")) map.setPaintProperty("utm-lines", "line-width", utmWeight);
}

function setUtmColor(idx) {
    utmColorIndex = idx;
    utmColor = utmColors[idx].line;
    utmLabelColor = utmColors[idx].label;
    if (utmVisible) {
        removeUtmFromMap();
        addUtmToMap();
    } else {
        utmVisible = true;
        addUtmToMap();
    }
    document.getElementById("toolbar-utm").classList.add("toolbar-active");
}

function utmOff() {
    if (utmVisible) {
        utmVisible = false;
        removeUtmFromMap();
        document.getElementById("toolbar-utm").classList.remove("toolbar-active");
    }
}

// ── Map toolbar ──────────────────────────────────────

var ToolbarControl = {
    onAdd: function () {
        var div = document.createElement("div");
        div.className = "map-toolbar maplibregl-ctrl";
        div.innerHTML =
            '<a class="toolbar-btn" id="toolbar-basemap" href="#" onclick="event.preventDefault();toggleBasemapMenu()" title="Basemap">◫</a>' +
            '<a class="toolbar-btn" id="toolbar-grid" href="#" onclick="event.preventDefault();toggleGridMenu()" title="Lat/long grid">#</a>' +
            '<a class="toolbar-btn" id="toolbar-utm" href="#" onclick="event.preventDefault();toggleUtmMenu()" title="UTM zones">▮</a>' +
            '<a class="toolbar-btn toolbar-btn-text" id="toolbar-wmts" href="#" onclick="event.preventDefault();toggleWmtsMenu()" title="BlueTopo WMTS Tiles">BT</a>' +
            '<a class="toolbar-btn" id="toolbar-credits" href="#" onclick="event.preventDefault();toggleCreditsMenu()" title="Credits">ⓘ</a>' +
            '<div class="toolbar-menu" id="basemap-menu"></div>' +
            '<div class="toolbar-menu" id="grid-menu"></div>' +
            '<div class="toolbar-menu" id="utm-menu"></div>' +
            '<div class="toolbar-menu" id="wmts-menu"></div>' +
            '<div class="toolbar-menu" id="credits-menu"></div>';
        return div;
    },
    onRemove: function () {}
};
map.addControl(ToolbarControl, "top-left");

function closeAllMenus() {
    ["basemap-menu", "grid-menu", "utm-menu", "wmts-menu", "credits-menu"].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) m.style.display = "none";
    });
}

function getCreditsHtml() {
    return '<div class="credits-section-label">Basemaps</div>' +
        '© <a href="https://carto.com/" target="_blank">CARTO</a><br>' +
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' +
        '<div class="credits-sep"></div>' +
        '<div class="credits-section-label">Data</div>' +
        'Compiled by <a href="https://nauticalcharts.noaa.gov/learn/nbs.html" target="_blank">NBS</a>';
}

function toggleCreditsMenu() {
    var menu = document.getElementById("credits-menu");
    var wasOpen = menu.style.display === "block";
    closeAllMenus();
    if (wasOpen) return;
    menu.innerHTML = '<div class="toolbar-menu-credits">' + getCreditsHtml() + '</div>';
    menu.style.display = "block";
}

function toggleBasemapMenu() {
    var menu = document.getElementById("basemap-menu");
    var wasOpen = menu.style.display === "block";
    closeAllMenus();
    if (wasOpen) return;
    menu.innerHTML = "";
    basemapNames.forEach(function (name, i) {
        var item = document.createElement("div");
        item.className = "toolbar-menu-item" + (i === basemapIndex ? " active" : "");
        item.textContent = name;
        item.onclick = function () {
            setBasemap(i);
            menu.style.display = "none";
        };
        menu.appendChild(item);
    });
    menu.style.display = "block";
}

function toggleGridMenu() {
    var menu = document.getElementById("grid-menu");
    var wasOpen = menu.style.display === "block";
    closeAllMenus();
    if (wasOpen) return;
    menu.innerHTML = "";
    gridColors.forEach(function (c, i) {
        var item = document.createElement("div");
        item.className = "toolbar-menu-item" + (gridVisible && i === gridColorIndex ? " active" : "");
        item.innerHTML = "<span class='color-dot' style='background:" + c.line.replace(/0\.\d+\)/, "0.8)") + "'></span>" + c.name;
        item.onclick = function (e) { e.stopPropagation(); setGridColor(i); menu.style.display = "none"; };
        menu.appendChild(item);
    });
    var sep = document.createElement("div"); sep.className = "toolbar-menu-sep"; menu.appendChild(sep);
    var sliderRow = document.createElement("div");
    sliderRow.className = "toolbar-menu-slider";
    sliderRow.innerHTML = '<input type="range" min="0.5" max="3" step="0.5" value="' + gridWeight + '" oninput="setGridWeight(parseFloat(this.value))">';
    sliderRow.onclick = function (e) { e.stopPropagation(); };
    menu.appendChild(sliderRow);
    var sep2 = document.createElement("div"); sep2.className = "toolbar-menu-sep"; menu.appendChild(sep2);
    var off = document.createElement("div");
    off.className = "toolbar-menu-item" + (!gridVisible ? " active" : "");
    off.textContent = "Off";
    off.onclick = function (e) { e.stopPropagation(); gridOff(); menu.style.display = "none"; };
    menu.appendChild(off);
    menu.style.display = "block";
}

function toggleUtmMenu() {
    var menu = document.getElementById("utm-menu");
    var wasOpen = menu.style.display === "block";
    closeAllMenus();
    if (wasOpen) return;
    menu.innerHTML = "";
    utmColors.forEach(function (c, i) {
        var item = document.createElement("div");
        item.className = "toolbar-menu-item" + (utmVisible && i === utmColorIndex ? " active" : "");
        item.innerHTML = "<span class='color-dot' style='background:" + c.line.replace(/0\.\d+\)/, "0.8)") + "'></span>" + c.name;
        item.onclick = function (e) { e.stopPropagation(); setUtmColor(i); menu.style.display = "none"; };
        menu.appendChild(item);
    });
    var sep = document.createElement("div"); sep.className = "toolbar-menu-sep"; menu.appendChild(sep);
    var sliderRow = document.createElement("div");
    sliderRow.className = "toolbar-menu-slider";
    sliderRow.innerHTML = '<input type="range" min="0.5" max="3" step="0.5" value="' + utmWeight + '" oninput="setUtmWeight(parseFloat(this.value))">';
    sliderRow.onclick = function (e) { e.stopPropagation(); };
    menu.appendChild(sliderRow);
    var sep2 = document.createElement("div"); sep2.className = "toolbar-menu-sep"; menu.appendChild(sep2);
    var off = document.createElement("div");
    off.className = "toolbar-menu-item" + (!utmVisible ? " active" : "");
    off.textContent = "Off";
    off.onclick = function (e) { e.stopPropagation(); utmOff(); menu.style.display = "none"; };
    menu.appendChild(off);
    menu.style.display = "block";
}

// ── WMTS overlays (nowCOAST) ─────────────────────────

var wmtsOverlayActive = false;

function wmtsUrl(layer) {
    return "https://nowcoast.noaa.gov/geoserver/gwc/service/wmts" +
        "?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=" + encodeURIComponent(layer) +
        "&STYLE=&FORMAT=image/png8" +
        "&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}";
}

function setWmtsOverlay(on) {
    var btn = document.getElementById("toolbar-wmts");
    if (on && !wmtsOverlayActive) {
        var firstVector = null;
        var layers = map.getStyle().layers;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].id.indexOf("remote") === 0 || layers[i].id.indexOf("tracked") === 0 || layers[i].id.indexOf("draw") === 0) {
                firstVector = layers[i].id;
                break;
            }
        }
        map.addSource("wmts-hillshade", { type: "raster", tiles: [wmtsUrl("bluetopo:hillshade")], tileSize: 256, attribution: 'WMTS served by <a href="https://nowcoast.noaa.gov" target="_blank">nowCOAST</a>' });
        map.addLayer({ id: "wmts-hillshade", type: "raster", source: "wmts-hillshade", paint: { "raster-opacity": 1 } }, firstVector);
        map.addSource("wmts-bathymetry", { type: "raster", tiles: [wmtsUrl("bluetopo:bathymetry")], tileSize: 256 });
        map.addLayer({ id: "wmts-bathymetry", type: "raster", source: "wmts-bathymetry", paint: { "raster-opacity": 0.7 } }, firstVector);
        wmtsOverlayActive = true;
        btn.classList.add("toolbar-active");
    } else if (!on && wmtsOverlayActive) {
        ["wmts-bathymetry", "wmts-hillshade"].forEach(function (id) {
            if (map.getLayer(id)) map.removeLayer(id);
            if (map.getSource(id)) map.removeSource(id);
        });
        wmtsOverlayActive = false;
        btn.classList.remove("toolbar-active");
    }
}

function toggleWmtsMenu() {
    var menu = document.getElementById("wmts-menu");
    var wasOpen = menu.style.display === "block";
    closeAllMenus();
    if (wasOpen) return;
    menu.innerHTML = "";
    var row = document.createElement("div");
    row.className = "toolbar-menu-toggle";
    row.innerHTML = '<span class="wmts-label' + (wmtsOverlayActive ? ' wmts-label-on' : '') + '" id="wmts-label">BlueTopo</span><span class="switch wmts-switch' + (wmtsOverlayActive ? ' on' : '') + '" id="wmts-switch"><span class="switch-knob"></span></span>';
    row.onclick = function (e) {
        e.stopPropagation();
        setWmtsOverlay(!wmtsOverlayActive);
        document.getElementById("wmts-switch").classList.toggle("on", wmtsOverlayActive);
        document.getElementById("wmts-label").classList.toggle("wmts-label-on", wmtsOverlayActive);
    };
    menu.appendChild(row);
    var sep = document.createElement("div"); sep.className = "toolbar-menu-sep"; menu.appendChild(sep);
    var credit = document.createElement("div");
    credit.className = "toolbar-menu-credits";
    credit.innerHTML = '<div class="credits-section-label">WMTS</div>Served by <a href="https://nowcoast.noaa.gov" target="_blank">nowCOAST</a>';
    menu.appendChild(credit);
    menu.style.display = "block";
}

document.addEventListener("click", function (e) {
    if (!e.target.closest(".map-toolbar")) closeAllMenus();
});

// ── Layer toggle control ─────────────────────────────

var layerDiv = document.createElement("div");
layerDiv.className = "map-layer-control";
layerDiv.innerHTML =
    '<button id="btn-layer-remote" class="layer-toggle" onclick="toggleRemoteLayer()" title="What\'s available on NBS?">' +
    '<span class="layer-dot remote"></span>NBS Source</button>' +
    '<button id="btn-layer-tracked" class="layer-toggle" onclick="toggleTrackedLayer()" title="What\'s the status of your tiles?">' +
    '<span class="layer-dot tracked"></span>Your Project</button>' +
    '<button id="btn-layer-fill" class="layer-toggle layer-on" onclick="toggleFill()" title="Toggle fill">' +
    '<span class="fill-icon"></span>Fill</button>';
layerDiv.appendChild(coordDiv);
document.getElementById("map").appendChild(layerDiv);

// ── Tile scheme layers ───────────────────────────────

function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

function buildPopupHtml(props) {
    var rows = "";
    for (var key in props) {
        if (props[key] == null) continue;
        rows += "<tr><td class='popup-key'>" + escapeHtml(String(key)) + "</td><td class='popup-val'>" + escapeHtml(String(props[key])) + "</td></tr>";
    }
    return rows ? "<table class='popup-table'>" + rows + "</table>" : "";
}

// ── Age-based styling ────────────────────────────────

var AGE_COLORS = [
    { days: 1,    color: [74, 222, 128] },
    { days: 7,    color: [34, 160, 70] },
    { days: 30,   color: [130, 190, 255] },
    { days: 120,  color: [25, 70, 170] },
    { days: 365,  color: [130, 130, 140] },
    { days: Infinity, color: [90, 90, 98] }
];
var NULL_DATE_COLOR = [30, 30, 30];
var layerFilled = true;

function getDateField(props) {
    return props["Delivered_Date"] || props["ISSUANCE"] || null;
}

function ageColor(props) {
    var dateStr = getDateField(props);
    if (!dateStr) return NULL_DATE_COLOR;
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return NULL_DATE_COLOR;
    var ageDays = (Date.now() - date.getTime()) / 86400000;
    for (var i = 0; i < AGE_COLORS.length; i++) {
        if (ageDays <= AGE_COLORS[i].days) return AGE_COLORS[i].color;
    }
    return AGE_COLORS[AGE_COLORS.length - 1].color;
}

function colorFeatures(geojson) {
    if (!geojson || !geojson.features) return geojson;
    geojson.features.forEach(function (f) {
        var c = ageColor(f.properties);
        f.properties._color = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    });
    return geojson;
}

var TRACKED_COLORS = {
    up_to_date: "rgb(34,197,94)",
    updates_available: "rgb(249,115,22)",
    missing_from_disk: "rgb(239,68,68)",
    removed_from_scheme: "rgb(160,160,168)",
};

function toggleFill() {
    layerFilled = !layerFilled;
    document.getElementById("btn-layer-fill").classList.toggle("layer-on", layerFilled);
    var opacity = layerFilled ? 0.8 : 0;
    if (map.getLayer("remote-fill")) map.setPaintProperty("remote-fill", "fill-opacity", opacity);
    ["up_to_date", "updates_available", "missing_from_disk", "removed_from_scheme"].forEach(function (cat) {
        if (map.getLayer("tracked-" + cat + "-fill")) map.setPaintProperty("tracked-" + cat + "-fill", "fill-opacity", layerFilled ? 1 : 0);
    });
}

// ── Remote layer ─────────────────────────────────────

function addRemoteToMap(geojson) {
    if (map.getSource("remote")) {
        map.getSource("remote").setData(geojson);
    } else {
        map.addSource("remote", { type: "geojson", data: geojson });
        map.addLayer({ id: "remote-fill", type: "fill", source: "remote", paint: { "fill-color": ["get", "_color"], "fill-opacity": layerFilled ? 0.8 : 0 } });
        map.addLayer({ id: "remote-outline", type: "line", source: "remote", paint: { "line-color": ["get", "_color"], "line-width": 1, "line-opacity": 0.7 } });
    }
    raiseTrackedLayers();
    raiseDrawLayers();
}

function removeRemoteFromMap() {
    if (map.getLayer("remote-outline")) map.removeLayer("remote-outline");
    if (map.getLayer("remote-fill")) map.removeLayer("remote-fill");
    if (map.getSource("remote")) map.removeSource("remote");
}

// ── Tracked layers ───────────────────────────────────

var trackedCategories = ["up_to_date", "updates_available", "missing_from_disk", "removed_from_scheme"];

function raiseTrackedLayers() {
    // Fills first, then outlines on top
    trackedCategories.forEach(function (cat) {
        var srcId = "tracked-" + cat;
        if (map.getLayer(srcId + "-fill")) map.moveLayer(srcId + "-fill");
    });
    trackedCategories.forEach(function (cat) {
        var srcId = "tracked-" + cat;
        if (map.getLayer(srcId + "-outline")) map.moveLayer(srcId + "-outline");
    });
}

function addTrackedToMap(data) {
    var empty = { type: "FeatureCollection", features: [] };
    // Add all fills first
    trackedCategories.forEach(function (cat) {
        var geojson = data[cat];
        var hasFeatures = geojson && geojson.features.length > 0;
        var srcId = "tracked-" + cat;
        if (!map.getSource(srcId)) {
            if (!hasFeatures) return;
            map.addSource(srcId, { type: "geojson", data: geojson });
            map.addLayer({ id: srcId + "-fill", type: "fill", source: srcId, paint: { "fill-color": TRACKED_COLORS[cat], "fill-opacity": layerFilled ? 1 : 0 } });
        } else {
            map.getSource(srcId).setData(hasFeatures ? geojson : empty);
        }
    });
    // Then all outlines on top so they're visible above fills
    trackedCategories.forEach(function (cat) {
        var geojson = data[cat];
        if (!geojson || geojson.features.length === 0) return;
        var srcId = "tracked-" + cat;
        if (!map.getLayer(srcId + "-outline")) {
            map.addLayer({ id: srcId + "-outline", type: "line", source: srcId, paint: { "line-color": "rgba(0,0,0,0.3)", "line-width": 1 } });
        }
    });
    raiseDrawLayers();
}

function removeTrackedFromMap() {
    trackedCategories.forEach(function (cat) {
        var srcId = "tracked-" + cat;
        if (map.getLayer(srcId + "-outline")) map.removeLayer(srcId + "-outline");
        if (map.getLayer(srcId + "-fill")) map.removeLayer(srcId + "-fill");
        if (map.getSource(srcId)) map.removeSource(srcId);
    });
}

// ── Popups ───────────────────────────────────────────

var popup = new maplibregl.Popup({ maxWidth: "360px", className: "dark-popup", closeOnClick: false, closeButton: false });

map.on("click", function (e) {
    if (drawingMode || rectMode) return;
    // Check all clickable layers
    var layers = ["remote-fill"];
    trackedCategories.forEach(function (cat) { layers.push("tracked-" + cat + "-fill"); });
    var existing = layers.filter(function (l) { return map.getLayer(l); });
    if (existing.length === 0) { popup.remove(); return; }
    var features = map.queryRenderedFeatures(e.point, { layers: existing });
    if (features.length === 0) { popup.remove(); return; }
    // Pick the smallest resolution feature (topmost visually)
    var best = features[0];
    if (features.length > 1) {
        var bestRes = Infinity;
        features.forEach(function (f) {
            var r = parseFloat(f.properties.Resolution || f.properties.resolution || "Infinity");
            if (!isNaN(r) && r < bestRes) {
                bestRes = r;
                best = f;
            }
        });
    }
    var props = Object.assign({}, best.properties);
    delete props._color;
    var html = buildPopupHtml(props);
    if (html) popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
});

// Pointer cursor on hoverable layers
map.on("mousemove", function (e) {
    var layers = ["remote-fill"];
    trackedCategories.forEach(function (cat) { layers.push("tracked-" + cat + "-fill"); });
    var existing = layers.filter(function (l) { return map.getLayer(l); });
    if (existing.length === 0) return;
    var features = map.queryRenderedFeatures(e.point, { layers: existing });
    if (!drawingMode && !rectMode) {
        map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
    }
});

// ── Re-add sources after basemap change ──────────────

function readdAllSources() {
    // Re-add draw layers
    map.addSource("draw-polygon", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("draw-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "draw-fill", type: "fill", source: "draw-polygon", paint: { "fill-color": "rgba(100,140,255,0.15)", "fill-opacity": 1 } });
    map.addLayer({ id: "draw-line", type: "line", source: "draw-polygon", paint: { "line-color": "rgba(100,140,255,0.8)", "line-width": 2, "line-dasharray": [3, 2] } });
    map.addLayer({ id: "draw-vertices", type: "circle", source: "draw-points", paint: { "circle-radius": 4, "circle-color": "rgba(100,140,255,1)", "circle-stroke-color": "white", "circle-stroke-width": 1.5 } });

    if (remoteActive && remoteDisplayData && !remoteLoading) {
        addRemoteToMap(remoteDisplayData);
    }
    if (trackedActive && trackedDisplayData && !trackedLoading) {
        addTrackedToMap(trackedDisplayData);
    }
    if (wmtsOverlayActive) {
        wmtsOverlayActive = false;
        setWmtsOverlay(true);
    }
    if (gridVisible) addGridToMap();
    if (utmVisible) addUtmToMap();
    raiseDrawLayers();
}

// ── Legend ────────────────────────────────────────────

var legendDiv = null;
var remoteSourceLabel = "";
var trackedDirName = "";

function getDirName(path) {
    var parts = path.replace(/\\/g, "/").replace(/\/+$/, "").split("/");
    return parts[parts.length - 1] || path;
}

function buildLegendHtml() {
    var html = "";
    if (remoteActive) {
        html += "<div class='legend-section'>" + escapeHtml(remoteSourceLabel || "NBS Source") + "</div>";
        var labels = ["< 1 day", "< 1 week", "< 1 month", "< 4 months", "< 12 months", "12+ months"];
        for (var i = 0; i < AGE_COLORS.length; i++) {
            var c = AGE_COLORS[i].color;
            html += "<div class='legend-row'><span class='legend-swatch' style='background:rgb(" + c[0] + "," + c[1] + "," + c[2] + ")'></span>" + labels[i] + "</div>";
        }
        html += "<div class='legend-row'><span class='legend-swatch' style='background:rgb(" + NULL_DATE_COLOR[0] + "," + NULL_DATE_COLOR[1] + "," + NULL_DATE_COLOR[2] + ");border:1px solid rgba(255,255,255,0.15)'></span>No delivery</div>";
    }
    if (trackedActive) {
        if (html) html += "<div class='legend-divider'></div>";
        html += "<div class='legend-section'>" + escapeHtml(trackedDirName || "Your Project") + "</div>";
        var cats = [["up_to_date", "Up to date"], ["updates_available", "Updates available"], ["missing_from_disk", "Missing from disk"], ["removed_from_scheme", "Removed from scheme"]];
        for (var j = 0; j < cats.length; j++) {
            html += "<div class='legend-row'><span class='legend-swatch' style='background:" + TRACKED_COLORS[cats[j][0]] + "'></span>" + cats[j][1] + "</div>";
        }
    }
    return html;
}

function updateLegend() {
    if (legendDiv) { legendDiv.remove(); legendDiv = null; }
    if (!remoteActive && !trackedActive) return;
    legendDiv = document.createElement("div");
    legendDiv.className = "map-legend";
    legendDiv.innerHTML = buildLegendHtml();
    document.getElementById("map").appendChild(legendDiv);
}

// ── Layer state ──────────────────────────────────────

var remoteActive = false;
var remoteRequestedSource = null;
var trackedActive = false;
var trackedRequestedDir = null;
var remoteLoading = false;
var trackedLoading = false;

var remoteDisplayData = null;
var trackedDisplayData = null;
var trackedIsReload = false;
var trackedStartup = false;

function clearTrackedOnly() {
    var wasActive = trackedActive;
    if (trackedActive || trackedLoading) {
        trackedActive = false;
        trackedLoading = false;
        trackedIsReload = false;
        trackedStartup = false;
        trackedDisplayData = null;
        removeTrackedFromMap();
        var tb = document.getElementById("btn-layer-tracked");
        tb.classList.remove("layer-on", "layer-loading");
    }
    updateLegend();
    return wasActive;
}

function refreshTracked() {
    var wasLoading = trackedLoading;
    var wasActive = clearTrackedOnly();
    if (wasActive && !currentCommand && !wasLoading) {
        toggleTrackedLayer();
    }
}

function clearAllLayers() {
    if (remoteActive || remoteLoading) {
        remoteActive = false;
        remoteLoading = false;
        remoteDisplayData = null;
        removeRemoteFromMap();
        var rb = document.getElementById("btn-layer-remote");
        rb.classList.remove("layer-on", "layer-loading");
    }
    clearTrackedOnly();
}

function refreshAllLayers() {
    var wasRemote = remoteActive;
    var wasTracked = trackedActive;
    var wasTrackedLoading = trackedLoading;
    clearAllLayers();
    if (wasRemote) toggleRemoteLayer();
    if (wasTracked && !currentCommand && !wasTrackedLoading) {
        toggleTrackedLayer();
    }
}

function toggleRemoteLayer() {
    if (remoteLoading) return;
    var btn = document.getElementById("btn-layer-remote");
    if (remoteActive) {
        remoteActive = false;
        removeRemoteFromMap();
        btn.classList.remove("layer-on");
        updateLegend();
    } else {
        if (!bridge) return;
        var source = document.getElementById("data-source").value;
        remoteActive = true;
        remoteLoading = true;
        remoteRequestedSource = source;
        remoteSourceLabel = document.getElementById("source-label").textContent;
        btn.classList.add("layer-on");
        btn.classList.add("layer-loading");
        bridge.load_remote_layer(source);
    }
}

function toggleTrackedLayer() {
    if (trackedLoading) return;
    var btn = document.getElementById("btn-layer-tracked");
    if (trackedActive) {
        trackedActive = false;
        removeTrackedFromMap();
        btn.classList.remove("layer-on");
        updateLegend();
    } else {
        if (!bridge) return;
        if (currentCommand === "fetch") { showToast("Wait for fetch to finish"); return; }
        var dir = document.getElementById("project-dir").value;
        if (!dir) return;
        var source = document.getElementById("data-source").value;
        trackedActive = true;
        trackedLoading = true;
        trackedRequestedDir = dir;
        trackedDirName = getDirName(dir);
        btn.classList.add("layer-on");
        btn.classList.add("layer-loading");
        bridge.load_tracked_layer(dir, source);
    }
}

function reloadTrackedLayer() {
    if (!bridge || trackedLoading) return;
    trackedLoading = true;
    trackedIsReload = true;
    var btn = document.getElementById("btn-layer-tracked");
    btn.classList.add("layer-loading");
    var dir = document.getElementById("project-dir").value;
    trackedRequestedDir = dir;
    var source = document.getElementById("data-source").value;
    bridge.load_tracked_layer(dir, source);
}

// ── Fit bounds helper ────────────────────────────────

function fitToGeojson(geojson) {
    if (!geojson || !geojson.features || geojson.features.length === 0) return;
    var bounds = new maplibregl.LngLatBounds();
    geojson.features.forEach(function (f) {
        if (!f.geometry || !f.geometry.coordinates) return;
        var coords = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] :
                     f.geometry.type === "MultiPolygon" ? f.geometry.coordinates[0][0] : [];
        coords.forEach(function (c) { bounds.extend(c); });
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 20 });
}

// ── onLayersReady ────────────────────────────────────

function onLayersReady(data) {
    if (data.layer === "remote") {
        remoteLoading = false;
        var btn = document.getElementById("btn-layer-remote");
        btn.classList.remove("layer-loading");
        // Discard if remote was turned off or source changed
        if (!remoteActive) {
            remoteLoading = false;
            return;
        }
        if (data.source && remoteRequestedSource && data.source !== remoteRequestedSource) {
            remoteLoading = false;
            return;
        }
        if (data.error) {
            remoteActive = false;
            btn.classList.remove("layer-on");
            showToast(data.error);
            return;
        }
        colorFeatures(data.data);
        var firstDisplay = !remoteDisplayData;
        remoteDisplayData = data.data;
        addRemoteToMap(data.data);
        updateLegend();
        if (firstDisplay) fitToGeojson(data.data);
    } else if (data.layer === "tracked") {
        trackedLoading = false;
        var btn = document.getElementById("btn-layer-tracked");
        btn.classList.remove("layer-loading");
        // Discard if tracked was turned off or this response is for a different directory
        if (!trackedActive) return;
        if (trackedRequestedDir && data.dir !== trackedRequestedDir) return;
        if (data.error) {
            trackedActive = false;
            trackedIsReload = false;
            btn.classList.remove("layer-on");
            var errMsg = data.error || "";
            if (errMsg.indexOf("Registry database not found") >= 0 || errMsg.indexOf("Folder path not found") >= 0) {
                showToast("No project found here yet. Fetch to get started");
            } else {
                showToast(errMsg);
            }
            return;
        }
        trackedDisplayData = data.data;
        addTrackedToMap(data.data);
        updateLegend();
        if (!trackedIsReload) {
            // Fit to all tracked features
            var allFeatures = [];
            for (var cat in data.data) {
                if (data.data[cat].features) allFeatures = allFeatures.concat(data.data[cat].features);
            }
            if (allFeatures.length > 0) fitToGeojson({ type: "FeatureCollection", features: allFeatures });
        }
        trackedIsReload = false;

        if (trackedStartup) {
            trackedStartup = false;
            var updates = data.data.updates_available ? data.data.updates_available.features.length : 0;
            var missing = data.data.missing_from_disk ? data.data.missing_from_disk.features.length : 0;
            var removed = data.data.removed_from_scheme ? data.data.removed_from_scheme.features.length : 0;
            var total = data.total || 0;
            var issues = (updates > 0 ? 1 : 0) + (missing > 0 ? 1 : 0) + (removed > 0 ? 1 : 0);
            if (issues === 1 && updates > 0) {
                showToast({ icon: "⟳", title: "Updates Available", body: updates + " of your tiles have updates. Fetch to download them." }, "toast-welcome");
            } else if (issues === 1 && missing > 0) {
                showToast({ icon: "⚠", title: "Tiles Missing", body: missing + " of your tiles " + (missing === 1 ? "is" : "are") + " missing from disk. Fetch to re-download." }, "toast-welcome");
            } else if (issues === 1 && removed > 0) {
                showToast({ icon: "⚠", title: "Tiles Removed", body: removed + " of your tiles " + (removed === 1 ? "was" : "were") + " removed from the NBS source." }, "toast-welcome");
            } else if (issues > 1) {
                var parts = [];
                if (updates > 0) parts.push(updates + " update" + (updates !== 1 ? "s" : ""));
                if (missing > 0) parts.push(missing + " missing");
                if (removed > 0) parts.push(removed + " removed");
                showToast({ icon: "⚠", title: "Attention Needed", body: parts.join(", ") + ". Fetch to resolve." }, "toast-welcome");
            } else if (total > 0) {
                showToast({ icon: "✓", title: "All Up to Date", body: "All " + total + " of your tiles are current with the NBS." }, "toast-welcome");
            }
        }
    }
}
