// host.jsx - ExtendScript Host for Universal 2D Joystick CEP Extension

if (typeof $.global._pupilJoystickState === "undefined") {
    $.global._pupilJoystickState = {
        originX: 0,
        originY: 0,
        currentX: 0,
        currentY: 0,
        dragStartX: 0,
        dragStartY: 0,
        lastAppliedX: null,
        lastAppliedY: null,
        lastAppliedTargetX: null,
        lastAppliedTargetY: null,
        isRelative: true,
        isAutoSync: true,
        isMirrored: false,
        targetName: "Position",
        layerBaseMap: {},
        primaryLayerId: null,
        lastLayerKey: "",
        hasLiveUndo: false
    };
}

function _joy_escapeStr(str) {
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
}

function _joy_toJSON(val) {
    if (val === null || typeof val === "undefined") {
        return "null";
    }
    var t = typeof val;
    if (t === "number") {
        return isFinite(val) ? String(val) : "0";
    }
    if (t === "boolean") {
        return val ? "true" : "false";
    }
    if (t === "string") {
        return '"' + _joy_escapeStr(val) + '"';
    }
    if (val instanceof Array) {
        var arrParts = [];
        for (var i = 0; i < val.length; i++) {
            arrParts.push(_joy_toJSON(val[i]));
        }
        return "[" + arrParts.join(",") + "]";
    }
    if (t === "object") {
        var objParts = [];
        for (var k in val) {
            if (val.hasOwnProperty(k)) {
                objParts.push('"' + _joy_escapeStr(k) + '":' + _joy_toJSON(val[k]));
            }
        }
        return "{" + objParts.join(",") + "}";
    }
    return "null";
}

function _joy_parseBool(val, fallback) {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
        if (val === "true") return true;
        if (val === "false") return false;
    }
    return fallback;
}

function _joy_clearLiveUndo() {
    var st = $.global._pupilJoystickState;
    if (st.hasLiveUndo) {
        try {
            app.executeCommand(16);
        } catch (e) { }
        st.hasLiveUndo = false;
    }
}

function _joy_findTargetProperty(layer, targetName) {
    if (!layer || !targetName) return null;

    // 1. Essential Properties (Master Properties)
    try {
        var essProps = layer.property("ADBE Master Properties") || layer.property("Essential Properties");
        if (essProps) {
            var p = essProps.property(targetName);
            if (p) return p;
        }
    } catch (e) { }

    // 2. Effects
    try {
        var effects = layer.property("ADBE Effect Parade") || layer.property("Effects");
        if (effects) {
            var fx = effects.property(targetName);
            if (fx) {
                if (fx.numProperties && fx.numProperties >= 1) {
                    return fx.property(1);
                }
                return fx;
            }
        }
    } catch (e) { }

    // 3. Transform Properties
    try {
        var lower = String(targetName).toLowerCase();
        if (lower === "position") {
            return layer.transform.position;
        } else if (lower === "anchor point") {
            return layer.transform.anchorPoint;
        } else if (lower === "scale") {
            return layer.transform.scale;
        }
    } catch (e) { }

    return null;
}

function _joy_getLayerCurrentValue(layer, targetName) {
    if (!layer) return null;
    var prop = _joy_findTargetProperty(layer, targetName);
    if (!prop) return null;

    try {
        if (prop.matchName === "ADBE Position" && prop.dimensionsSeparated) {
            var transformGrp = layer.property("ADBE Transform Group");
            if (transformGrp) {
                var posX = transformGrp.property("ADBE Position_0");
                var posY = transformGrp.property("ADBE Position_1");
                if (posX && posY) {
                    return [posX.value, posY.value, 0];
                }
            }
        }
    } catch (e) { }

    try {
        if (prop.value !== undefined) {
            var val = prop.value;
            if (val instanceof Array) {
                return [val[0], val[1], val.length > 2 ? val[2] : 0];
            } else if (typeof val === "number") {
                return [val, 0, 0];
            }
        }
    } catch (e) { }

    return null;
}

function _joy_scanLayerProperties(layer) {
    var propsList = [];
    if (!layer) return propsList;

    // 1. Essential Properties (ADBE Master Properties)
    try {
        var essProps = layer.property("ADBE Master Properties") || layer.property("Essential Properties");
        if (essProps) {
            for (var i = 1; i <= essProps.numProperties; i++) {
                var prop = essProps.property(i);
                if (prop && prop.name) {
                    propsList.push(prop.name);
                }
            }
        }
    } catch (e) { }

    // 2. Effects (ADBE Effect Parade)
    try {
        var fxParade = layer.property("ADBE Effect Parade") || layer.property("Effects");
        if (fxParade) {
            for (var j = 1; j <= fxParade.numProperties; j++) {
                var fx = fxParade.property(j);
                if (fx && fx.name) {
                    var alreadyIn = false;
                    for (var k = 0; k < propsList.length; k++) {
                        if (propsList[k] === fx.name) {
                            alreadyIn = true;
                            break;
                        }
                    }
                    if (!alreadyIn) {
                        propsList.push(fx.name);
                    }
                }
            }
        }
    } catch (e) { }

    // 3. Transform properties
    propsList.push("Position");
    propsList.push("Anchor Point");

    return propsList;
}

function _joy_getSelectedLayerKey(targetName) {
    if (!app.project || !app.project.activeItem) return "";
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return "";

    var ids = [];
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var lyr = comp.selectedLayers[i];
        ids.push(lyr.id ? lyr.id : lyr.index);
    }
    return comp.id + "_" + ids.join(",") + "_" + (targetName || "Position");
}

function _joy_calculateTargetCoords(rawX, rawY, layerRef) {
    var st = $.global._pupilJoystickState;
    var outX = Number(rawX) || 0;
    var outY = Number(rawY) || 0;

    if (st.isMirrored) {
        outX = -outX;
    }

    if (st.isRelative) {
        var baseX = st.originX;
        var baseY = st.originY;

        if (layerRef) {
            var lId = layerRef.id ? layerRef.id : layerRef.index;
            if (lId !== st.primaryLayerId && st.layerBaseMap[lId]) {
                baseX = st.layerBaseMap[lId][0];
                baseY = st.layerBaseMap[lId][1];
            }
        }
        return [
            Math.round((baseX + outX) * 1000) / 1000,
            Math.round((baseY + outY) * 1000) / 1000
        ];
    } else {
        return [
            Math.round(outX * 1000) / 1000,
            Math.round(outY * 1000) / 1000
        ];
    }
}

function _joy_captureOriginFromSelection(targetName) {
    var st = $.global._pupilJoystickState;
    if (!app.project || !app.project.activeItem) return false;
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return false;

    var tName = targetName || st.targetName || "Position";
    var primaryLayer = comp.selectedLayers[0];
    var val = _joy_getLayerCurrentValue(primaryLayer, tName);

    if (val !== null) {
        st.originX = Math.round(val[0] * 1000) / 1000;
        st.originY = Math.round(val[1] * 1000) / 1000;
        st.primaryLayerId = primaryLayer.id ? primaryLayer.id : primaryLayer.index;

        st.layerBaseMap = {};
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var lyr = comp.selectedLayers[i];
            var lVal = _joy_getLayerCurrentValue(lyr, tName);
            if (lVal !== null) {
                var lId = lyr.id ? lyr.id : lyr.index;
                st.layerBaseMap[lId] = [
                    Math.round(lVal[0] * 1000) / 1000,
                    Math.round(lVal[1] * 1000) / 1000
                ];
            }
        }

        st.lastLayerKey = _joy_getSelectedLayerKey(tName);
        st.lastAppliedTargetX = st.originX;
        st.lastAppliedTargetY = st.originY;
        return true;
    }
    return false;
}

function _joy_setTargetPropertyValue(x, y) {
    var st = $.global._pupilJoystickState;
    if (!app.project || !app.project.activeItem) return false;
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return false;
    var layers = comp.selectedLayers;
    if (layers.length === 0) return false;

    var targetName = st.targetName || "Position";
    if (!targetName || targetName === "(Custom...)") return false;

    var modifiedCount = 0;

    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var targetProp = _joy_findTargetProperty(layer, targetName);
        if (!targetProp) continue;

        var coords = _joy_calculateTargetCoords(x, y, layer);
        var targetX = coords[0];
        var targetY = coords[1];

        try {
            if (targetProp.matchName === "ADBE Position" && targetProp.dimensionsSeparated) {
                var transformGrp = layer.property("ADBE Transform Group");
                if (transformGrp) {
                    var posX = transformGrp.property("ADBE Position_0");
                    var posY = transformGrp.property("ADBE Position_1");
                    if (posX && posX.setValue) {
                        var animX = (posX.isTimeVarying || (posX.numKeys !== undefined && posX.numKeys > 0));
                        if (animX) posX.setValueAtTime(comp.time, targetX);
                        else posX.setValue(targetX);
                    }
                    if (posY && posY.setValue) {
                        var animY = (posY.isTimeVarying || (posY.numKeys !== undefined && posY.numKeys > 0));
                        if (animY) posY.setValueAtTime(comp.time, targetY);
                        else posY.setValue(targetY);
                    }
                    modifiedCount++;
                }
                continue;
            }

            if (!targetProp.setValue) continue;

            var curVal = targetProp.value;
            var newVal = [targetX, targetY];

            if (curVal instanceof Array) {
                if (curVal.length === 3) {
                    newVal = [targetX, targetY, curVal[2]];
                } else if (curVal.length === 2) {
                    newVal = [targetX, targetY];
                }
            } else if (typeof curVal === "number") {
                newVal = targetX;
            }

            var isAnimated = (targetProp.isTimeVarying || (targetProp.numKeys !== undefined && targetProp.numKeys > 0));

            if (isAnimated) {
                targetProp.setValueAtTime(comp.time, newVal);
            } else {
                targetProp.setValue(newVal);
            }
            modifiedCount++;
        } catch (e) { }
    }

    if (modifiedCount > 0) {
        var primaryCoords = _joy_calculateTargetCoords(x, y, null);
        st.lastAppliedTargetX = primaryCoords[0];
        st.lastAppliedTargetY = primaryCoords[1];
    }

    return modifiedCount > 0;
}

function _joy_buildStateResponse(extra) {
    var st = $.global._pupilJoystickState;
    var coords = _joy_calculateTargetCoords(st.currentX, st.currentY, null);
    var res = {
        originX: st.originX,
        originY: st.originY,
        currentX: st.currentX,
        currentY: st.currentY,
        finalX: coords[0],
        finalY: coords[1],
        targetName: st.targetName
    };
    if (extra) {
        for (var k in extra) {
            if (extra.hasOwnProperty(k)) {
                res[k] = extra[k];
            }
        }
    }
    return _joy_toJSON(res);
}

// ============================================================================
// Public Host API Functions (called from CEP main.js via csInterface.evalScript)
// ============================================================================

function host_initOrScan(isManualScan) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();
    isManualScan = _joy_parseBool(isManualScan, false);

    var hasComp = false;
    var hasSelection = false;
    var scannedList = [];

    if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
        hasComp = true;
        var comp = app.project.activeItem;
        if (comp.selectedLayers.length > 0) {
            hasSelection = true;
            scannedList = _joy_scanLayerProperties(comp.selectedLayers[0]);
        }
    }

    if (isManualScan) {
        if (!app.project || !app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            alert("Please open an active composition first.");
            return _joy_buildStateResponse({ ok: false, reason: "no_comp" });
        }
        if (!hasSelection) {
            alert("Please select a layer with Transform, Essential Properties, or Effects.");
            return _joy_buildStateResponse({ ok: false, reason: "no_layer" });
        }
    }

    if (scannedList.length === 0) {
        scannedList = ["Position", "Anchor Point", "pupil-ctrl Position"];
    }

    var prevTarget = st.targetName || "";
    if ((!prevTarget || prevTarget === "Position") && app.settings && app.settings.haveSetting("Joystick", "target_prop")) {
        prevTarget = app.settings.getSetting("Joystick", "target_prop");
    }
    if (!prevTarget) {
        prevTarget = "Position";
    }

    var matchedIdx = -1;
    var keywords = ["position", "joystick", "pupil", "look", "eye", "head", "pos", "point", "ctrl"];

    for (var i = 0; i < scannedList.length; i++) {
        var itemText = scannedList[i];
        if (itemText === prevTarget) {
            matchedIdx = i;
            break;
        }
    }

    if (matchedIdx === -1) {
        for (var j = 0; j < scannedList.length; j++) {
            var lower = scannedList[j].toLowerCase();
            for (var k = 0; k < keywords.length; k++) {
                if (lower.indexOf(keywords[k]) !== -1) {
                    matchedIdx = j;
                    break;
                }
            }
            if (matchedIdx !== -1) break;
        }
    }

    if (prevTarget && prevTarget !== "" && prevTarget !== "(Custom...)") {
        var foundPrev = false;
        for (var m = 0; m < scannedList.length; m++) {
            if (scannedList[m] === prevTarget) {
                foundPrev = true;
                break;
            }
        }
        if (!foundPrev && !isManualScan) {
            scannedList.push(prevTarget);
            if (matchedIdx === -1) matchedIdx = scannedList.length - 1;
        }
    }

    var selectedTarget = (matchedIdx >= 0 && matchedIdx < scannedList.length) ? scannedList[matchedIdx] : scannedList[0];
    st.targetName = selectedTarget;

    if (selectedTarget && selectedTarget !== "(Custom...)" && app.settings) {
        try {
            app.settings.saveSetting("Joystick", "target_prop", selectedTarget);
        } catch (e) { }
    }

    if (hasSelection) {
        st.currentX = 0;
        st.currentY = 0;
        _joy_captureOriginFromSelection(selectedTarget);
    }

    return _joy_buildStateResponse({
        ok: true,
        hasComp: hasComp,
        hasSelection: hasSelection,
        props: scannedList,
        selectedTarget: selectedTarget,
        resetOffset: hasSelection
    });
}

function host_selectTarget(targetName) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    if (!targetName || targetName === "(Custom...)") {
        return _joy_buildStateResponse({ ok: false });
    }

    st.targetName = String(targetName);
    if (app.settings) {
        try {
            app.settings.saveSetting("Joystick", "target_prop", st.targetName);
        } catch (e) { }
    }

    st.currentX = 0;
    st.currentY = 0;
    var captured = _joy_captureOriginFromSelection(st.targetName);

    return _joy_buildStateResponse({
        ok: true,
        captured: captured,
        resetOffset: true
    });
}

function host_getOrigin(isManualClick) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();
    isManualClick = _joy_parseBool(isManualClick, false);

    var captured = _joy_captureOriginFromSelection(st.targetName);
    if (!captured && isManualClick) {
        alert("Please select a layer in an active composition.");
        return _joy_buildStateResponse({ ok: false });
    }

    if (captured) {
        st.currentX = 0;
        st.currentY = 0;
        st.dragStartX = 0;
        st.dragStartY = 0;
    }

    return _joy_buildStateResponse({
        ok: captured,
        resetOffset: captured
    });
}

function host_autoSync(targetName, currentX, currentY, isRelative, isAutoSync, isMirrored, rangeVal) {
    var st = $.global._pupilJoystickState;
    if (st.hasLiveUndo) {
        return _joy_buildStateResponse({ synced: false });
    }

    if (targetName && targetName !== "(Custom...)") st.targetName = String(targetName);
    st.isRelative = _joy_parseBool(isRelative, st.isRelative);
    st.isAutoSync = _joy_parseBool(isAutoSync, st.isAutoSync);
    st.isMirrored = _joy_parseBool(isMirrored, st.isMirrored);
    st.currentX = Number(currentX) || 0;
    st.currentY = Number(currentY) || 0;

    if (!st.isAutoSync) {
        return _joy_buildStateResponse({ synced: false });
    }

    if (!app.project || !app.project.activeItem) {
        return _joy_buildStateResponse({ synced: false });
    }
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        return _joy_buildStateResponse({ synced: false });
    }

    var currentKey = _joy_getSelectedLayerKey(st.targetName);
    if (currentKey !== st.lastLayerKey) {
        // Layer selection or target changed: reset joystick to center and sample new layer
        st.currentX = 0;
        st.currentY = 0;
        st.dragStartX = 0;
        st.dragStartY = 0;
        _joy_captureOriginFromSelection(st.targetName);
        return _joy_buildStateResponse({
            synced: true,
            resetOffset: true
        });
    }

    if (st.currentX === 0 && st.currentY === 0) {
        // Same layer and joystick is at center: keep origin live-synced
        _joy_captureOriginFromSelection(st.targetName);
        return _joy_buildStateResponse({
            synced: true,
            resetOffset: false
        });
    }

    // Same layer while offset is non-zero: check if AE value was undone (Ctrl+Z) or externally modified
    var primaryLayer = comp.selectedLayers[0];
    var curVal = _joy_getLayerCurrentValue(primaryLayer, st.targetName);
    if (curVal !== null && st.lastAppliedTargetX !== null && st.lastAppliedTargetY !== null) {
        var diffFromLastX = Math.abs(curVal[0] - st.lastAppliedTargetX);
        var diffFromLastY = Math.abs(curVal[1] - st.lastAppliedTargetY);

        if (diffFromLastX > 0.05 || diffFromLastY > 0.05) {
            // The property value in AE changed outside of the joystick (e.g. user pressed Ctrl+Z in AE or scrubbed timeline)
            var diffFromOriginX = Math.abs(curVal[0] - st.originX);
            var diffFromOriginY = Math.abs(curVal[1] - st.originY);
            var maxRange = (Number(rangeVal) || 100) * 1.5;

            if (diffFromOriginX < 0.05 && diffFromOriginY < 0.05) {
                // Returned to base origin (e.g. via Ctrl+Z)
                st.currentX = 0;
                st.currentY = 0;
                st.dragStartX = 0;
                st.dragStartY = 0;
                st.lastAppliedTargetX = st.originX;
                st.lastAppliedTargetY = st.originY;
                return _joy_buildStateResponse({
                    synced: true,
                    resetOffset: true
                });
            } else if (st.isRelative && diffFromOriginX <= maxRange && diffFromOriginY <= maxRange) {
                // Updated to another offset within range (e.g. previous joystick step or keyframe)
                var newOffX = curVal[0] - st.originX;
                var newOffY = curVal[1] - st.originY;
                if (st.isMirrored) newOffX = -newOffX;
                st.currentX = Math.round(newOffX * 10) / 10;
                st.currentY = Math.round(newOffY * 10) / 10;
                st.dragStartX = st.currentX;
                st.dragStartY = st.currentY;
                st.lastAppliedTargetX = Math.round(curVal[0] * 1000) / 1000;
                st.lastAppliedTargetY = Math.round(curVal[1] * 1000) / 1000;
                return _joy_buildStateResponse({
                    synced: true,
                    offsetUpdated: true
                });
            }
        }
    }

    return _joy_buildStateResponse({ synced: false });
}

function host_startDrag(targetName, x, y, isRelative, isAutoSync, isMirrored, wasAtCenter) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    if (targetName && targetName !== "(Custom...)") st.targetName = String(targetName);
    st.isRelative = _joy_parseBool(isRelative, st.isRelative);
    st.isAutoSync = _joy_parseBool(isAutoSync, st.isAutoSync);
    st.isMirrored = _joy_parseBool(isMirrored, st.isMirrored);
    wasAtCenter = _joy_parseBool(wasAtCenter, false);

    var originSynced = false;
    if (st.isAutoSync && app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
        var comp = app.project.activeItem;
        if (comp.selectedLayers.length > 0) {
            var currentKey = _joy_getSelectedLayerKey(st.targetName);
            if (currentKey !== st.lastLayerKey || wasAtCenter) {
                originSynced = _joy_captureOriginFromSelection(st.targetName);
            }
        }
    }

    // Record exact starting offset before this drag modifies the layer
    st.dragStartX = wasAtCenter ? 0 : st.currentX;
    st.dragStartY = wasAtCenter ? 0 : st.currentY;

    if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
        var activeComp = app.project.activeItem;
        if (activeComp.selectedLayers.length > 0 && st.isRelative) {
            var curVal = _joy_getLayerCurrentValue(activeComp.selectedLayers[0], st.targetName);
            if (curVal !== null) {
                var actualOffX = curVal[0] - st.originX;
                var actualOffY = curVal[1] - st.originY;
                if (st.isMirrored) actualOffX = -actualOffX;
                st.dragStartX = Math.round(actualOffX * 1000) / 1000;
                st.dragStartY = Math.round(actualOffY * 1000) / 1000;
            }
        }
    }

    var numX = Math.round((Number(x) || 0) * 10) / 10;
    var numY = Math.round((Number(y) || 0) * 10) / 10;
    st.currentX = numX;
    st.currentY = numY;
    st.lastAppliedX = numX;
    st.lastAppliedY = numY;

    if (Math.abs(numX - st.dragStartX) > 0.001 || Math.abs(numY - st.dragStartY) > 0.001) {
        var didModify = false;
        app.beginUndoGroup("Joystick Live");
        try {
            didModify = _joy_setTargetPropertyValue(numX, numY);
        } finally {
            app.endUndoGroup();
        }
        st.hasLiveUndo = didModify;
    }

    return _joy_buildStateResponse({
        originSynced: originSynced
    });
}

function host_applyLive(x, y) {
    var st = $.global._pupilJoystickState;
    var numX = Math.round((Number(x) || 0) * 10) / 10;
    var numY = Math.round((Number(y) || 0) * 10) / 10;

    st.currentX = numX;
    st.currentY = numY;

    if (st.lastAppliedX !== null && st.lastAppliedY !== null) {
        if (Math.abs(numX - st.lastAppliedX) < 0.001 && Math.abs(numY - st.lastAppliedY) < 0.001) {
            return _joy_buildStateResponse();
        }
    }

    if (st.hasLiveUndo) {
        try {
            app.executeCommand(16);
        } catch (e) { }
        st.hasLiveUndo = false;
    }

    if (Math.abs(numX - st.dragStartX) > 0.001 || Math.abs(numY - st.dragStartY) > 0.001) {
        var didModify = false;
        app.beginUndoGroup("Joystick Live");
        try {
            didModify = _joy_setTargetPropertyValue(numX, numY);
        } finally {
            app.endUndoGroup();
        }
        st.hasLiveUndo = didModify;
    } else {
        var startCoords = _joy_calculateTargetCoords(st.dragStartX, st.dragStartY, null);
        st.lastAppliedTargetX = startCoords[0];
        st.lastAppliedTargetY = startCoords[1];
    }

    st.lastAppliedX = numX;
    st.lastAppliedY = numY;

    return _joy_buildStateResponse();
}

function host_commitDrag(x, y) {
    var st = $.global._pupilJoystickState;
    var numX = Math.round((Number(x) || 0) * 10) / 10;
    var numY = Math.round((Number(y) || 0) * 10) / 10;

    if (st.hasLiveUndo) {
        try {
            app.executeCommand(16);
        } catch (e) { }
        st.hasLiveUndo = false;
    }

    st.currentX = numX;
    st.currentY = numY;

    if (Math.abs(numX - st.dragStartX) > 0.001 || Math.abs(numY - st.dragStartY) > 0.001) {
        app.beginUndoGroup("Joystick Move");
        try {
            _joy_setTargetPropertyValue(numX, numY);
        } finally {
            app.endUndoGroup();
        }
    }

    st.dragStartX = numX;
    st.dragStartY = numY;
    st.lastAppliedX = numX;
    st.lastAppliedY = numY;

    return _joy_buildStateResponse();
}

function host_setOffsetDirect(x, y, axisLabel) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    var numX = Math.round((Number(x) || 0) * 1000) / 1000;
    var numY = Math.round((Number(y) || 0) * 1000) / 1000;
    st.currentX = numX;
    st.currentY = numY;
    st.dragStartX = numX;
    st.dragStartY = numY;
    st.lastAppliedX = numX;
    st.lastAppliedY = numY;

    var undoTitle = axisLabel ? ("Joystick Move " + axisLabel) : "Joystick Move";
    app.beginUndoGroup(undoTitle);
    try {
        _joy_setTargetPropertyValue(numX, numY);
    } finally {
        app.endUndoGroup();
    }

    return _joy_buildStateResponse();
}

function host_setOriginDirect(originX, originY, currentX, currentY, isRelative, isMirrored) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    var newOriginX = Math.round((Number(originX) || 0) * 1000) / 1000;
    var newOriginY = Math.round((Number(originY) || 0) * 1000) / 1000;
    var deltaX = newOriginX - st.originX;
    var deltaY = newOriginY - st.originY;

    st.originX = newOriginX;
    st.originY = newOriginY;
    st.currentX = Number(currentX) || 0;
    st.currentY = Number(currentY) || 0;
    st.isRelative = _joy_parseBool(isRelative, st.isRelative);
    st.isMirrored = _joy_parseBool(isMirrored, st.isMirrored);

    for (var lId in st.layerBaseMap) {
        if (st.layerBaseMap.hasOwnProperty(lId)) {
            if (lId == st.primaryLayerId) {
                st.layerBaseMap[lId] = [newOriginX, newOriginY];
            } else {
                st.layerBaseMap[lId] = [
                    Math.round((st.layerBaseMap[lId][0] + deltaX) * 1000) / 1000,
                    Math.round((st.layerBaseMap[lId][1] + deltaY) * 1000) / 1000
                ];
            }
        }
    }

    if (st.isRelative) {
        app.beginUndoGroup("Joystick Origin Adjust");
        try {
            _joy_setTargetPropertyValue(st.currentX, st.currentY);
        } finally {
            app.endUndoGroup();
        }
    }

    return _joy_buildStateResponse();
}

function host_setOptions(isRelative, isAutoSync, isMirrored, currentX, currentY, undoLabel) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    st.isRelative = _joy_parseBool(isRelative, st.isRelative);
    st.isAutoSync = _joy_parseBool(isAutoSync, st.isAutoSync);
    st.isMirrored = _joy_parseBool(isMirrored, st.isMirrored);
    st.currentX = Number(currentX) || 0;
    st.currentY = Number(currentY) || 0;

    if (undoLabel && undoLabel !== "") {
        app.beginUndoGroup(String(undoLabel));
        try {
            _joy_setTargetPropertyValue(st.currentX, st.currentY);
        } finally {
            app.endUndoGroup();
        }
    }

    return _joy_buildStateResponse();
}

function host_resetToOriginal() {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();

    st.currentX = 0;
    st.currentY = 0;
    st.dragStartX = 0;
    st.dragStartY = 0;
    st.lastAppliedX = 0;
    st.lastAppliedY = 0;

    app.beginUndoGroup("Reset to Original Position");
    try {
        _joy_setTargetPropertyValue(0, 0);
    } finally {
        app.endUndoGroup();
    }

    return _joy_buildStateResponse({ resetOffset: true });
}

function host_triggerUndoRedo(isRedo) {
    var st = $.global._pupilJoystickState;
    _joy_clearLiveUndo();
    isRedo = _joy_parseBool(isRedo, false);

    try {
        app.executeCommand(isRedo ? 20 : 16);
    } catch (e) { }

    if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
        var comp = app.project.activeItem;
        if (comp.selectedLayers.length > 0) {
            var curVal = _joy_getLayerCurrentValue(comp.selectedLayers[0], st.targetName);
            if (curVal !== null) {
                if (st.isRelative) {
                    var offX = curVal[0] - st.originX;
                    var offY = curVal[1] - st.originY;
                    if (st.isMirrored) offX = -offX;
                    st.currentX = Math.round(offX * 10) / 10;
                    st.currentY = Math.round(offY * 10) / 10;
                } else {
                    var absX = curVal[0];
                    var absY = curVal[1];
                    if (st.isMirrored) absX = -absX;
                    st.currentX = Math.round(absX * 10) / 10;
                    st.currentY = Math.round(absY * 10) / 10;
                }
                st.dragStartX = st.currentX;
                st.dragStartY = st.currentY;
                st.lastAppliedX = st.currentX;
                st.lastAppliedY = st.currentY;
                st.lastAppliedTargetX = Math.round(curVal[0] * 1000) / 1000;
                st.lastAppliedTargetY = Math.round(curVal[1] * 1000) / 1000;
            }
        }
    }

    return _joy_buildStateResponse({ offsetUpdated: true });
}
