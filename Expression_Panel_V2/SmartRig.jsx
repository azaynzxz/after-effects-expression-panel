(function (thisObj) {
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Smart Rig Builder", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 2;
        win.margins = 4;

        var tpanel = win.add("tabbedpanel");
        tpanel.alignChildren = ["fill", "fill"];
        tpanel.margins = 0;

        var tabRig = tpanel.add("tab", undefined, "Rig Builder");
        tabRig.orientation = "column";
        tabRig.alignChildren = ["fill", "top"];
        tabRig.spacing = 2;
        tabRig.margins = 4;

        var tabPicker = tpanel.add("tab", undefined, "Smart Picker");
        tabPicker.orientation = "column";
        tabPicker.alignChildren = ["fill", "top"];
        tabPicker.spacing = 2;
        tabPicker.margins = 4;

        var tabSwitcher = tpanel.add("tab", undefined, "Switcher");
        tabSwitcher.orientation = "column";
        tabSwitcher.alignChildren = ["fill", "top"];
        tabSwitcher.spacing = 4;
        tabSwitcher.margins = 4;


        // Group 1 & 2: Top Bar (Add & Target)
        var topBar = tabRig.add("group");
        topBar.orientation = "row";
        topBar.alignChildren = ["left", "center"];
        topBar.spacing = 5;
        topBar.margins = 0;

        var btnAdd = topBar.add("button", undefined, "+");
        btnAdd.helpTip = "Add New Rig from template";
        btnAdd.preferredSize.width = 30;

        var listRig = topBar.add("dropdownlist", undefined, ["Leg", "Hand", "Body"]);
        listRig.selection = 0; // Default to Leg
        listRig.preferredSize.width = 100;

        var btnCopyChar = topBar.add("button", undefined, "Select Character to Copy");
        btnCopyChar.helpTip = "Duplicate a character comp, rename it, and add it to the active comp";

        // Group 2.5: Base Names (Editable)
        var panelNames = tabRig.add("panel", undefined, "Base Layer Names (Edit if renamed)");
        panelNames.orientation = "column";
        panelNames.alignChildren = ["fill", "top"];
        panelNames.spacing = 2;

        var row1 = panelNames.add("group");
        row1.orientation = "row";
        row1.margins = 0; row1.spacing = 5;

        var lblM = row1.add("statictext", undefined, "Master:");
        lblM.preferredSize.width = 45;
        var txtMaster = row1.add("edittext", undefined, "Body CTRL");
        txtMaster.preferredSize.width = 65;

        var lbl1 = row1.add("statictext", undefined, "Pt 1:");
        lbl1.preferredSize.width = 25;
        var txtP1 = row1.add("edittext", undefined, "K-Kanan");
        txtP1.preferredSize.width = 65;

        var row2 = panelNames.add("group");
        row2.orientation = "row";
        row2.margins = 0; row2.spacing = 5;

        var lbl2 = row2.add("statictext", undefined, "Pt 2:");
        lbl2.preferredSize.width = 45;
        var txtP2 = row2.add("edittext", undefined, "K-Pinggang");
        txtP2.preferredSize.width = 65;

        var lbl3 = row2.add("statictext", undefined, "Pt 3:");
        lbl3.preferredSize.width = 25;
        var txtP3 = row2.add("edittext", undefined, "K-Kiri");
        txtP3.preferredSize.width = 65;

        // Group 3: Top Joint
        var panelTop = tabRig.add("panel", undefined, "Top Joint Curvature");
        panelTop.orientation = "column";
        var groupTopX = panelTop.add("group");
        groupTopX.add("statictext", undefined, "Bend (X):");
        var slideTopX = groupTopX.add("slider", undefined, 350, -1000, 1000);
        var txtTopX = groupTopX.add("edittext", undefined, "350");
        txtTopX.characters = 5;

        var groupTopY = panelTop.add("group");
        groupTopY.add("statictext", undefined, "Height (Y):");
        var slideTopY = groupTopY.add("slider", undefined, 150, -1000, 1000);
        var txtTopY = groupTopY.add("edittext", undefined, "150");
        txtTopY.characters = 5;

        // Group 4: Bottom Joint
        var panelBot = tabRig.add("panel", undefined, "Bottom Joint Curvature");
        panelBot.orientation = "column";
        var groupBotX = panelBot.add("group");
        groupBotX.add("statictext", undefined, "Bend (X):");
        var slideBotX = groupBotX.add("slider", undefined, -150, -1000, 1000);
        var txtBotX = groupBotX.add("edittext", undefined, "-150");
        txtBotX.characters = 5;

        var groupBotY = panelBot.add("group");
        groupBotY.add("statictext", undefined, "Height (Y):");
        var slideBotY = groupBotY.add("slider", undefined, -350, -1000, 1000);
        var txtBotY = groupBotY.add("edittext", undefined, "-350");
        txtBotY.characters = 5;

        // Group 5: Actions
        var grpActions = tabRig.add("group");
        var btnReset = grpActions.add("button", undefined, "Reset");
        var btnApply = grpActions.add("button", undefined, "Update Expression");

        // Slider syncing
        function sync(slider, txt) {
            slider.onChanging = function () { txt.text = Math.round(slider.value).toString(); };
            txt.onChange = function () { slider.value = parseFloat(txt.text) || 0; };
        }
        sync(slideTopX, txtTopX); sync(slideTopY, txtTopY);
        sync(slideBotX, txtBotX); sync(slideBotY, txtBotY);

        var currentSuffix = "";

        function updateDefaults() {
            if (!listRig.selection) return;
            var sel = listRig.selection.text;
            if (sel === "Leg") {
                slideTopX.value = 350; slideTopY.value = 150;
                slideBotX.value = -150; slideBotY.value = -350;
                txtMaster.text = "Body CTRL" + currentSuffix; txtP1.text = "K-Kanan" + currentSuffix; txtP2.text = "K-Pinggang" + currentSuffix; txtP3.text = "K-Kiri" + currentSuffix;
            } else if (sel === "Hand") {
                slideTopX.value = -250; slideTopY.value = 350;
                slideBotX.value = 350; slideBotY.value = -150;
                txtMaster.text = "Body CTRL" + currentSuffix; txtP1.text = "H-Kanan" + currentSuffix; txtP2.text = "H-Up" + currentSuffix; txtP3.text = "H-Kiri" + currentSuffix;
            } else if (sel === "Body") {
                slideTopX.value = 350; slideTopY.value = 150;
                slideBotX.value = 350; slideBotY.value = 150;
                txtMaster.text = "Body CTRL" + currentSuffix; txtP1.text = "Leher" + currentSuffix; txtP2.text = "Dada" + currentSuffix; txtP3.text = "Pinggang" + currentSuffix;
            }
            txtTopX.text = slideTopX.value; txtTopY.text = slideTopY.value;
            txtBotX.text = slideBotX.value; txtBotY.text = slideBotY.value;
        }

        listRig.onChange = updateDefaults;
        btnReset.onClick = updateDefaults;

        function generateExpression(rigType, tx, ty, bx, by, masterName, p1, p2, p3) {
            var mappingCode;
            var nullArr = '["' + p1 + '", "' + p2 + '", "' + p3 + '"]';

            if (rigType === "Leg") {
                mappingCode =
                    "var topHandle = linear(driverX, 50, -50, [" + tx + ", " + ty + "], [" + ty + ", " + tx + "]);\n" +
                    "var botHandle = linear(driverX, 50, -50, [" + bx + ", " + by + "], [" + by + ", " + bx + "]);\n";
            } else if (rigType === "Hand") {
                mappingCode =
                    "var topHandle = linear(driverX, 50, -50, [" + tx + ", " + ty + "], [" + (-ty) + ", " + (-tx) + "]);\n" +
                    "var botHandle = linear(driverX, 50, -50, [" + bx + ", " + by + "], [" + (-by) + ", " + (-bx) + "]);\n";
            } else {
                mappingCode =
                    "var topHandle = linear(driverX, 50, -50, [" + tx + ", " + ty + "], [" + ty + ", " + tx + "]);\n" +
                    "var botHandle = linear(driverX, 50, -50, [" + bx + ", " + by + "], [" + by + ", " + bx + "]);\n";
            }

            var exp =
                "// --- SMART RIG SETUP ---\n" +
                "var nullLayerNames = " + nullArr + ";\n" +
                "var origPath = thisProperty;\n" +
                "var origPoints = origPath.points();\n" +
                "var origInTang = origPath.inTangents();\n" +
                "var origOutTang = origPath.outTangents();\n" +
                "var getNullLayers = [];\n" +
                "for (var i = 0, il = nullLayerNames.length; i < il; i++) {\n" +
                "    try {\n" +
                "        var targetName = nullLayerNames[i];\n" +
                "        getNullLayers.push(thisComp.layer(targetName));\n" +
                "    } catch (err) {\n" +
                "        getNullLayers.push(null);\n" +
                "    }\n" +
                "}\n" +
                "for (var i = 0, il = getNullLayers.length; i < il; i++) {\n" +
                "    if (getNullLayers[i] != null && getNullLayers[i].index != thisLayer.index) {\n" +
                "        origPoints[i] = fromCompToSurface(getNullLayers[i].toComp(getNullLayers[i].anchorPoint));\n" +
                "    }\n" +
                "}\n" +
                "// --- EMBEDDED AUTO-MAPPING ---\n" +
                "var masterScale = [100, 100];\n" +
                "try { masterScale = thisComp.layer('" + masterName + "').transform.scale; } catch(e) {}\n" +
                "var scaleX = masterScale[0] / 100;\n" +
                "var scaleY = masterScale[1] / 100;\n" +
                "var scaledInTang = [];\n" +
                "var scaledOutTang = [];\n" +
                "var driverX = 0;\n" +
                "try { driverX = getNullLayers[2].transform.position[0]; } catch(e) {}\n\n" +
                mappingCode + "\n" +
                "scaledInTang.push([topHandle[0] * scaleX, topHandle[1] * scaleY]);\n" +
                "scaledOutTang.push([-topHandle[0] * scaleX, -topHandle[1] * scaleY]);\n" +
                "scaledInTang.push([0, 0]);\n" +
                "scaledOutTang.push([0, 0]);\n" +
                "scaledInTang.push([botHandle[0] * scaleX, botHandle[1] * scaleY]);\n" +
                "scaledOutTang.push([-botHandle[0] * scaleX, -botHandle[1] * scaleY]);\n" +
                "createPath(origPoints, scaledInTang, scaledOutTang, origPath.isClosed());";
            return exp;
        }

        function getPathProperty(layer) {
            try {
                var contents = layer.property("ADBE Root Vectors Group");
                for (var i = 1; i <= contents.numProperties; i++) {
                    var group = contents.property(i);
                    if (group.matchName === "ADBE Vector Group") {
                        var pathGroup = group.property("ADBE Vectors Group");
                        for (var j = 1; j <= pathGroup.numProperties; j++) {
                            var shape = pathGroup.property(j);
                            if (shape.matchName === "ADBE Vector Shape - Group") {
                                return shape.property("ADBE Vector Shape");
                            }
                        }
                    }
                }
            } catch (e) { }
            return null;
        }

        btnApply.onClick = function () {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            if (comp.selectedLayers.length === 0) {
                alert("Please select at least one Shape Layer (e.g., Leg, Hand).");
                return;
            }

            app.beginUndoGroup("Update Smart Rig Expression");
            try {
                var selType = listRig.selection ? listRig.selection.text : "Leg";
                var exp = generateExpression(selType, slideTopX.value, slideTopY.value, slideBotX.value, slideBotY.value, txtMaster.text, txtP1.text, txtP2.text, txtP3.text);

                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    if (layer instanceof ShapeLayer) {
                        var pathProp = getPathProperty(layer);
                        if (pathProp) {
                            pathProp.expression = exp;
                        } else {
                            alert("Could not find the Path property on layer: " + layer.name);
                        }
                    }
                }
            } finally {
                app.endUndoGroup();
            }
        };

        btnAdd.onClick = function () {
            var activeComp = app.project.activeItem;
            if (!activeComp || !(activeComp instanceof CompItem)) {
                alert("Please open a composition first to add the rig into.");
                return;
            }

            var allComps = [];
            var bodyRigIdx = 0;
            for (var i = 1; i <= app.project.numItems; i++) {
                if (app.project.item(i) instanceof CompItem && app.project.item(i).id !== activeComp.id) {
                    var c = app.project.item(i);
                    allComps.push(c);
                    if (c.name === "body-rig") bodyRigIdx = allComps.length - 1;
                }
            }

            if (allComps.length === 0) {
                alert("No other compositions found to copy from. Create a 'body-rig' template comp first.");
                return;
            }

            var winDlg = new Window("dialog", "Add Rig Template", undefined, { resizeable: true });
            winDlg.orientation = "column";
            winDlg.alignChildren = ["fill", "top"];
            winDlg.spacing = 10;
            winDlg.margins = 16;

            var grpComp = winDlg.add("group");
            grpComp.add("statictext", undefined, "Source Comp:");
            var ddComp = grpComp.add("dropdownlist", undefined, []);
            for (var i = 0; i < allComps.length; i++) {
                ddComp.add("item", allComps[i].name);
            }
            if (allComps.length > 0) ddComp.selection = bodyRigIdx;
            ddComp.preferredSize.width = 180;

            var grpSuffix = winDlg.add("group");
            grpSuffix.add("statictext", undefined, "Suffix:");
            var txtSuffix = grpSuffix.add("edittext", undefined, "");
            txtSuffix.preferredSize.width = 100;
            txtSuffix.helpTip = "e.g., _01 (Leave blank for no suffix)";

            var grpBtns = winDlg.add("group");
            grpBtns.alignment = ["center", "top"];
            var btnOk = grpBtns.add("button", undefined, "Add");
            var btnCancel = grpBtns.add("button", undefined, "Cancel");

            btnOk.onClick = function () {
                if (!ddComp.selection) {
                    alert("Please select a composition.");
                    return;
                }
                var selComp = allComps[ddComp.selection.index];
                var suffix = txtSuffix.text;

                // Auto-add separation if the user didn't type one
                if (suffix !== "" && suffix.charAt(0) !== "_" && suffix.charAt(0) !== "-" && suffix.charAt(0) !== " ") {
                    suffix = "_" + suffix;
                }

                var targetComp = app.project.activeItem;
                if (!targetComp || !(targetComp instanceof CompItem)) {
                    alert("Please select the target composition in the timeline/viewer.");
                    return;
                }

                // Close the dialog immediately so it doesn't block AE
                winDlg.close(1);

                // 1. Prepare maps to restore parenting and track mattes, and handle locked layers.
                var parentMap = {};
                var matteMap = {};
                var lockedLayers = [];
                var aeVersion = parseFloat(app.version);

                for (var i = 1; i <= selComp.numLayers; i++) {
                    var l = selComp.layer(i);
                    if (l.parent != null) {
                        parentMap[i] = l.parent.index;
                    }
                    if (l.locked) {
                        l.locked = false;
                        lockedLayers.push(l);
                    }
                    try {
                        if (l.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
                            if (aeVersion >= 23.0 && l.trackMatteLayer != null) {
                                matteMap[i] = { type: l.trackMatteType, parentIdx: l.trackMatteLayer.index };
                            } else {
                                matteMap[i] = { type: l.trackMatteType, parentIdx: i - 1 };
                            }
                        }
                    } catch (e) { }
                }

                // Deselect all in target comp so they paste cleanly
                for (var i = 1; i <= targetComp.numLayers; i++) {
                    try { targetComp.layer(i).selected = false; } catch (e) { }
                }

                // We use copyToComp to completely avoid viewer-switching lag.
                // CRITICAL: We CANNOT have an Undo Group open here!
                for (var i = selComp.numLayers; i >= 1; i--) {
                    try {
                        selComp.layer(i).copyToComp(targetComp);
                    } catch (e) { }
                }

                // Restore locks in source comp
                for (var i = 0; i < lockedLayers.length; i++) {
                    lockedLayers[i].locked = true;
                }

                // Grab copied layers directly from targetComp (they remain selected)
                var copiedLayers = [];
                for (var i = 0; i < targetComp.selectedLayers.length; i++) {
                    copiedLayers.push(targetComp.selectedLayers[i]);
                }
                copiedLayers.sort(function (a, b) { return a.index - b.index; });

                if (copiedLayers.length !== selComp.numLayers) {
                    // Fallback if selection was lost (rare, but just in case)
                    copiedLayers = [];
                    for (var i = 1; i <= selComp.numLayers; i++) {
                        copiedLayers.push(targetComp.layer(i));
                    }
                }

                // Fix physical timeline order if reversed
                if (copiedLayers.length > 0) {
                    var firstCopiedName = copiedLayers[0].name;
                    var srcLast = selComp.layer(selComp.numLayers).name;

                    if (firstCopiedName.substring(0, srcLast.length) === srcLast) {
                        copiedLayers.reverse();

                        // Physically fix their order in the timeline
                        for (var i = copiedLayers.length - 1; i >= 0; i--) {
                            copiedLayers[i].moveToBeginning();
                        }
                    }
                }

                // NOW we can begin the undo group for all the modifications
                app.beginUndoGroup("Configure Rig: " + selComp.name);
                try {
                    // 3. Restore Parenting and Track Mattes
                    for (var i = 0; i < copiedLayers.length; i++) {
                        var srcIndex = i + 1;

                        // Parenting
                        if (parentMap[srcIndex] !== undefined) {
                            var parentSrcIndex = parentMap[srcIndex];
                            if (parentSrcIndex >= 1 && parentSrcIndex <= copiedLayers.length) {
                                copiedLayers[i].parent = copiedLayers[parentSrcIndex - 1];
                            }
                        }

                        // Track Mattes
                        if (matteMap[srcIndex] !== undefined) {
                            var matteData = matteMap[srcIndex];
                            var matteParentSrcIndex = matteData.parentIdx;
                            if (matteParentSrcIndex >= 1 && matteParentSrcIndex <= copiedLayers.length) {
                                try {
                                    if (aeVersion >= 23.0) {
                                        copiedLayers[i].trackMatteLayer = copiedLayers[matteParentSrcIndex - 1];
                                    }
                                    copiedLayers[i].trackMatteType = matteData.type;
                                } catch (e) { }
                            }
                        }
                    }

                    // 4. Rename with Suffix
                    // Doing this AFTER copying all layers allows After Effects to safely auto-update 
                    // any internal expressions that reference these layers by their original names.
                    var nameMap = {};
                    for (var i = 0; i < copiedLayers.length; i++) {
                        var srcName = selComp.layer(i + 1).name;
                        var newName = srcName;
                        if (suffix !== "") {
                            newName = srcName + suffix;
                        }
                        nameMap[srcName] = newName;
                        copiedLayers[i].name = newName;
                    }

                    currentSuffix = suffix;
                    updateDefaults(); // Update UI text boxes

                    // Deeply scan layers to manually fix any expressions (like Stroke Width) 
                    // that After Effects' engine might have missed or dropped during the rename.
                    function forceUpdateExpressions(propGroup) {
                        for (var p = 1; p <= propGroup.numProperties; p++) {
                            var prop = propGroup.property(p);
                            if (prop.propertyType === PropertyType.PROPERTY) {
                                if (prop.canSetExpression && prop.expression !== "") {
                                    var exp = prop.expression;
                                    var modified = false;
                                    for (var oldN in nameMap) {
                                        var newN = nameMap[oldN];
                                        if (oldN !== newN) {
                                            var s1 = 'thisComp.layer("' + oldN + '")';
                                            var r1 = 'thisComp.layer("' + newN + '")';
                                            var s2 = "thisComp.layer('" + oldN + "')";
                                            var r2 = "thisComp.layer('" + newN + "')";
                                            var s3 = 'thisComp.layer("' + oldN + ' 2")';
                                            var s4 = "thisComp.layer('" + oldN + " 2')";

                                            if (exp.indexOf(s1) !== -1) { exp = exp.split(s1).join(r1); modified = true; }
                                            if (exp.indexOf(s2) !== -1) { exp = exp.split(s2).join(r2); modified = true; }
                                            if (exp.indexOf(s3) !== -1) { exp = exp.split(s3).join(r1); modified = true; }
                                            if (exp.indexOf(s4) !== -1) { exp = exp.split(s4).join(r2); modified = true; }
                                        }
                                    }
                                    if (modified) {
                                        try { prop.expression = exp; } catch (e) { }
                                    }
                                }
                            } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
                                forceUpdateExpressions(prop);
                            }
                        }
                    }

                    // 5. Apply Smart Rig expressions to shape layers
                    for (var i = 0; i < copiedLayers.length; i++) {
                        var layer = copiedLayers[i];

                        // Run the expression fixer to catch Stroke Widths etc.
                        forceUpdateExpressions(layer);

                        if (layer instanceof ShapeLayer) {
                            var rigType = null;
                            var srcName = selComp.layer(i + 1).name;

                            if (srcName.indexOf("Leg") !== -1) rigType = "Leg";
                            else if (srcName.indexOf("Hand") !== -1) rigType = "Hand";
                            else if (srcName.indexOf("Body") !== -1) rigType = "Body";

                            if (rigType) {
                                var exp = "";
                                if (rigType === "Leg") {
                                    exp = generateExpression("Leg", 350, 150, -150, -350, "Body CTRL" + suffix, "K-Kanan" + suffix, "K-Pinggang" + suffix, "K-Kiri" + suffix);
                                } else if (rigType === "Hand") {
                                    exp = generateExpression("Hand", -250, 350, 350, -150, "Body CTRL" + suffix, "H-Kanan" + suffix, "H-Up" + suffix, "H-Kiri" + suffix);
                                } else {
                                    exp = generateExpression("Body", 350, 150, 350, 150, "Body CTRL" + suffix, "Leher" + suffix, "Dada" + suffix, "Pinggang" + suffix);
                                }

                                var pathProp = getPathProperty(layer);
                                if (pathProp) pathProp.expression = exp;
                            }
                        }
                    }
                } finally {
                    app.endUndoGroup();
                }
            };

            btnCancel.onClick = function () {
                winDlg.close(0);
            };

            winDlg.show();
        };

        btnCopyChar.onClick = function () {
            var activeComp = app.project.activeItem;

            if (!activeComp || !(activeComp instanceof CompItem)) {
                alert("Please open a composition first to act as the target comp.");
                return;
            }

            var selectedLayers = activeComp.selectedLayers;
            var parentLayersToAttach = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                parentLayersToAttach.push(selectedLayers[i]);
            }

            var allComps = [];
            var allFolders = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    allComps.push(item);
                } else if (item instanceof FolderItem) {
                    allFolders.push(item);
                }
            }

            if (allComps.length < 2) {
                alert("You need at least 2 compositions in the project to use this feature.");
                return;
            }

            allComps.sort(function (a, b) {
                var nameA = a.name.toLowerCase();
                var nameB = b.name.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            allFolders.sort(function (a, b) {
                var nameA = a.name.toLowerCase();
                var nameB = b.name.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            var winDlg = new Window("palette", "Copy Character to Active Comp", undefined, { resizeable: true });
            winDlg.orientation = "column";
            winDlg.alignChildren = ["fill", "fill"];
            winDlg.spacing = 10;
            winDlg.margins = 16;
            winDlg.preferredSize.width = 400;

            var panelChar = winDlg.add("panel", undefined, "Select Character to Copy");
            panelChar.orientation = "column";
            panelChar.alignChildren = ["fill", "fill"];
            panelChar.spacing = 5;

            var savedFolderName = "All Folders";
            if (app.settings.haveSetting("SmartRig", "LastFolder")) {
                savedFolderName = app.settings.getSetting("SmartRig", "LastFolder");
            }

            var ddFolder = panelChar.add("dropdownlist", undefined, ["All Folders"]);
            var folderSelIdx = 0;
            for (var i = 0; i < allFolders.length; i++) {
                ddFolder.add("item", allFolders[i].name);
                if (allFolders[i].name === savedFolderName) {
                    folderSelIdx = i + 1;
                }
            }
            ddFolder.selection = folderSelIdx;

            var txtSearchChar = panelChar.add("edittext", undefined, "");
            txtSearchChar.helpTip = "Search Character Comp by name...";

            var mainContentGrp = panelChar.add("group");
            mainContentGrp.orientation = "row";
            mainContentGrp.alignChildren = ["fill", "fill"];
            mainContentGrp.spacing = 10;

            var listChar = mainContentGrp.add("listbox", undefined, []);
            listChar.preferredSize.height = 200;
            listChar.preferredSize.width = 150;

            var imgGrp = mainContentGrp.add("group");
            imgGrp.orientation = "column";
            imgGrp.alignChildren = ["center", "top"];
            var previewImg = imgGrp.add("image", undefined, undefined);
            previewImg.preferredSize.width = 200;
            previewImg.preferredSize.height = 200;
            var btnReloadThumb = imgGrp.add("button", undefined, "Reload Thumbnail");
            btnReloadThumb.onClick = function () {
                if (listChar.selection) {
                    var selComp = filteredChars[listChar.selection.index];
                    if (selComp) {
                        var tempFile = new File(Folder.temp.fsName + "/smartrig_preview_v2_" + selComp.id + ".png");
                        if (tempFile.exists) tempFile.remove();
                        var oldV1 = new File(Folder.temp.fsName + "/smartrig_preview_" + selComp.id + ".png");
                        if (oldV1.exists) oldV1.remove();
                        listChar.onChange();
                    }
                }
            };

            listChar.onChange = function () {
                if (!listChar.selection) {
                    previewImg.image = null;
                    return;
                }
                var selComp = filteredChars[listChar.selection.index];
                if (selComp) {
                    try {
                        var tempFile = new File(Folder.temp.fsName + "/smartrig_preview_v2_" + selComp.id + ".png");
                        if (!tempFile.exists) {
                            var pw = 200;
                            var ph = 200;
                            var tempComp = null;
                            try {
                                tempComp = app.project.items.addComp("SmartRig_PreviewTemp", pw, ph, 1, 1, selComp.frameRate > 0 ? selComp.frameRate : 30);
                                var compBg = (selComp.bgColor && selComp.bgColor.length === 3) ? selComp.bgColor : [0.18, 0.18, 0.18];
                                tempComp.layers.addSolid(compBg, "BG", pw, ph, 1, 1);
                                var srcLayer = tempComp.layers.add(selComp);

                                srcLayer.property("Position").setValue([pw / 2, ph / 2]);

                                var scaleX = pw / selComp.width;
                                var scaleY = ph / selComp.height;
                                // 18% margin (9% padding on all sides) so artwork is never squeezed or touching borders
                                var scale = Math.min(scaleX, scaleY) * 82;
                                srcLayer.property("Scale").setValue([scale, scale]);

                                tempComp.saveFrameToPng(0, tempFile);
                            } catch (e) {
                            } finally {
                                if (tempComp) {
                                    try { tempComp.remove(); } catch (err) { }
                                }
                            }
                        }
                        if (tempFile.exists) {
                            previewImg.image = tempFile;
                        } else {
                            previewImg.image = null;
                        }
                    } catch (e) {
                        previewImg.image = null;
                    }
                }
            };

            var filteredChars = [];

            function populateChar() {
                listChar.removeAll();
                filteredChars = [];
                var q = txtSearchChar.text.toLowerCase();
                var selFolderIdx = ddFolder.selection.index;
                var selFolder = selFolderIdx > 0 ? allFolders[selFolderIdx - 1] : null;

                for (var i = 0; i < allComps.length; i++) {
                    var comp = allComps[i];
                    if (selFolder && comp.parentFolder !== selFolder) {
                        continue;
                    }
                    if (comp.id === activeComp.id) continue; // Skip target comp

                    if (comp.name.toLowerCase().indexOf(q) !== -1) {
                        listChar.add("item", comp.name);
                        filteredChars.push(comp);
                    }
                }
                if (listChar.items.length > 0) {
                    listChar.selection = 0;
                } else {
                    previewImg.image = null;
                }
                if (listChar.onChange) listChar.onChange();
            }

            txtSearchChar.onChanging = populateChar;
            ddFolder.onChange = function () {
                if (ddFolder.selection) {
                    app.settings.saveSetting("SmartRig", "LastFolder", ddFolder.selection.text);
                }
                populateChar();
            };

            populateChar();

            var grpCharOpts = panelChar.add("group");
            grpCharOpts.orientation = "row";
            grpCharOpts.alignChildren = ["left", "center"];
            grpCharOpts.spacing = 12;

            var chkFlip = grpCharOpts.add("checkbox", undefined, "Flip Horizontally");
            chkFlip.value = false;

            var chkDuplicate = grpCharOpts.add("checkbox", undefined, "Duplicate");
            chkDuplicate.value = false;

            var chkHideParent = grpCharOpts.add("checkbox", undefined, "Hide Parent Layer");
            var savedHideParent = "0";
            if (app.settings && app.settings.haveSetting("SmartRig", "hide_parent_layer")) {
                savedHideParent = app.settings.getSetting("SmartRig", "hide_parent_layer");
            }
            chkHideParent.value = (savedHideParent === "1");

            var grpBtns = winDlg.add("group");
            grpBtns.alignment = ["center", "top"];
            var btnOk = grpBtns.add("button", undefined, "Copy & Add");
            var btnCancel = grpBtns.add("button", undefined, "Cancel");

            btnOk.onClick = function () {
                if (!listChar.selection) {
                    alert("Please select a Character.");
                    return;
                }

                if (app.settings) {
                    app.settings.saveSetting("SmartRig", "hide_parent_layer", chkHideParent.value ? "1" : "0");
                }

                activeComp = app.project.activeItem;
                if (!activeComp || !(activeComp instanceof CompItem)) {
                    alert("Please open a composition first to act as the target comp.");
                    return;
                }

                parentLayersToAttach = [];
                for (var i = 0; i < activeComp.selectedLayers.length; i++) {
                    parentLayersToAttach.push(activeComp.selectedLayers[i]);
                }

                var finalCharComp = filteredChars[listChar.selection.index];

                if (finalCharComp.id === activeComp.id) {
                    alert("Cannot copy a composition into itself.");
                    return;
                }

                app.beginUndoGroup("Copy Character Comp");
                try {
                    var targetFolder = null;
                    for (var i = 1; i <= app.project.numItems; i++) {
                        if (app.project.item(i) instanceof FolderItem && app.project.item(i).name === "chara-copied") {
                            targetFolder = app.project.item(i);
                            break;
                        }
                    }
                    if (!targetFolder) {
                        targetFolder = app.project.items.addFolder("chara-copied");
                    }

                    var suffix = "-" + activeComp.name;

                    // We loop parent layers if they exist. If none, we loop once.
                    var attachCount = parentLayersToAttach.length > 0 ? parentLayersToAttach.length : 1;

                    for (var j = 0; j < attachCount; j++) {
                        var newComp = finalCharComp;
                        if (chkDuplicate.value) {
                            newComp = finalCharComp.duplicate();
                            newComp.name = finalCharComp.name + suffix + (attachCount > 1 ? "_" + (j + 1) : "");

                            // Move to folder first to avoid any reference issues
                            newComp.parentFolder = targetFolder;
                        }

                        var newLayer = activeComp.layers.add(newComp);
                        if (newLayer) newLayer.selected = true;

                        if (parentLayersToAttach.length > 0) {
                            var parentLyr = parentLayersToAttach[j];
                            newLayer.moveBefore(parentLyr);
                            newLayer.parent = parentLyr;
                            newLayer.transform.position.setValue(parentLyr.transform.anchorPoint.value);
                            if (chkHideParent.value) {
                                parentLyr.enabled = false;
                            }

                            // Auto-Scale (Fit) character comp to match the placeholder's bounding box
                            try {
                                var parentRect = parentLyr.sourceRectAtTime(activeComp.time, false);
                                var pWidth = parentRect.width;
                                var pHeight = parentRect.height;

                                var newWidth = newComp.width;
                                var newHeight = newComp.height;

                                if (pWidth > 0 && pHeight > 0 && newWidth > 0 && newHeight > 0) {
                                    var scaleX = pWidth / newWidth;
                                    var scaleY = pHeight / newHeight;

                                    // Using 'Fit' (Minimum Scale Factor) to ensure it fits entirely inside
                                    var fitScale = Math.min(scaleX, scaleY) * 100;

                                    newLayer.transform.scale.setValue([fitScale, fitScale]);
                                }
                            } catch (e) {
                                // Ignore if sourceRectAtTime fails (e.g. on Null Objects)
                            }
                        }

                        if (chkFlip.value) {
                            var currentScale = newLayer.transform.scale.value;
                            newLayer.transform.scale.setValue([-currentScale[0], currentScale[1]]);
                        }
                    }
                } catch (e) {
                    alert("Error copying character: " + e.message);
                } finally {
                    app.endUndoGroup();
                }
            };

            btnCancel.onClick = function () {
                winDlg.close(0);
            };

            winDlg.show();
        };
        // --- SMART PICKER LOGIC ---
        function isAeLightMode() {
            if (app.settings && app.settings.haveSetting("SmartRig", "IconTheme")) {
                var savedTheme = app.settings.getSetting("SmartRig", "IconTheme");
                if (savedTheme === "Dark (for Light AE)") return true;
                if (savedTheme === "Light (for Dark AE)") return false;
            }
            try {
                if (app.preferences && app.preferences.havePref("Main Pref Section v2", "User Interface Brightness (4) [0.0..1.0]")) {
                    var b = app.preferences.getPrefAsFloat("Main Pref Section v2", "User Interface Brightness (4) [0.0..1.0]");
                    if (b > 0.45) return true;
                } else if (app.preferences && app.preferences.havePref("Main Pref Section", "User Interface Brightness (3) [0.0..1.0]")) {
                    var b2 = app.preferences.getPrefAsFloat("Main Pref Section", "User Interface Brightness (3) [0.0..1.0]");
                    if (b2 > 0.45) return true;
                }
            } catch (e) { }

            try {
                if (win && win.graphics && win.graphics.backgroundColor && win.graphics.backgroundColor.color) {
                    var c = win.graphics.backgroundColor.color;
                    var lum = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
                    if (lum > 0.45) return true;
                }
            } catch (e) { }

            return false;
        }

        function ensureIconsExist() {
            var iconDir = new Folder(Folder.userData.fsName.replace(/\\/g, "/") + "/SmartPickerThumbs/icons");
            if (!iconDir.exists) iconDir.create();

            var hexData = {
                "load_light": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000004249444154789c636018055405771e3cfb8f0d5364203162141b4808936420398e202889cf25241b48c87b2419484c980dbc97878681f8004103c9c1a43a6214e007008fc7ef834b451d290000000049454e44ae426082",
                "scan_light": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000006149444154789c63601816e0ce8367ff41982a86e0c2641b86ee42920d25563151eab029c2e7558286a22b20958fd540428ab1198ad775c8814fc810bc11447503a9ee655c8a298e14aa261ba215919abfa99af5b0194a71e180cb708a0c19340000484a87fc11e986520000000049454e44ae426082",
                "settings_light": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000005249444154789c636018d2e0ce8367ff4118179f648370194892c1e89a0861fa1b488aa1040d21269cb0c963359c141710a576841a884d3121c31870450a2117d03c0d0eae9c42489c6880cb40920d1a540000928f27b71a3c57f70000000049454e44ae426082",
                "load_dark": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000004249444154789c636018055405ca6abaffb1618a0c24468c62030961920c24c7110425f1b984640309798f24038909b381f7f2d030101f206820399854478c02fc000004f9602b64956f370000000049454e44ae426082",
                "scan_dark": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000006149444154789c6360181640594df73f0853c5105c986cc3d05d48b2a1c42a264a1d3645f8bc4ad0507405a4f2b11a4848313643f1ba0e39f00919823782a86e20d5bd8c4b31c59142d56443b42252f33755b31e3643292e1c70194e9121830600007bd99d5d986a0b840000000049454e44ae426082",
                "settings_dark": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000005249444154789c636018d240594df73f08e3e2936c102e034932185d13214c7f03493194a021c484133679ac8693e202a2d48e5003b12926641803ae4821e4029aa7c1c195530889130d701948b241830a00002704dd7939fcede20000000049454e44ae426082",
                "load": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000004249444154789c636018055405771e3cfb8f0d5364203162141b4808936420398e202889cf25241b48c87b2419484c980dbc97878681f8004103c9c1a43a6214e007008fc7ef834b451d290000000049454e44ae426082",
                "scan": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000006149444154789c63601816e0ce8367ff41982a86e0c2641b86ee42920d25563151eab029c2e7558286a22b20958fd540428ab1198ad775c8814fc810bc11447503a9ee655c8a298e14aa261ba215919abfa99af5b0194a71e180cb708a0c19340000484a87fc11e986520000000049454e44ae426082",
                "settings": "89504e470d0a1a0a0000000d49484452000000140000001408060000008d891d0d0000005249444154789c636018d2e0ce8367ff4118179f648370194892c1e89a0861fa1b488aa1040d21269cb0c963359c141710a576841a884d3121c31870450a2117d03c0d0eae9c42489c6880cb40920d1a540000928f27b71a3c57f70000000049454e44ae426082"
            };

            for (var k in hexData) {
                if (!hexData.hasOwnProperty(k)) continue;
                var f = new File(iconDir.fsName.replace(/\\/g, "/") + "/" + k + ".png");
                if (!f.exists) {
                    try {
                        f.encoding = "BINARY";
                        f.open("w");
                        var hexStr = hexData[k];
                        for (var i = 0; i < hexStr.length; i += 2) {
                            var byteVal = parseInt(hexStr.substr(i, 2), 16);
                            f.write(String.fromCharCode(byteVal));
                        }
                        f.close();
                    } catch (err) { }
                }
            }
        }
        ensureIconsExist();

        function getIconFile(iconName) {
            var isLight = isAeLightMode();
            var variantName = iconName + (isLight ? "_dark" : "_light");
            var f = new File(Folder.userData.fsName.replace(/\\/g, "/") + "/SmartPickerThumbs/icons/" + variantName + ".png");
            if (f.exists) return f;
            try {
                var scriptDir = (new File($.fileName)).parent;
                var f2 = new File(scriptDir.fsName.replace(/\\/g, "/") + "/icons/" + variantName + ".png");
                if (f2.exists) return f2;
            } catch (e) { }
            var fBase = new File(Folder.userData.fsName.replace(/\\/g, "/") + "/SmartPickerThumbs/icons/" + iconName + ".png");
            if (fBase.exists) return fBase;
            return null;
        }

        function refreshAllIcons() {
            var iconScan = getIconFile("scan");
            var iconSettings = getIconFile("settings");
            var iconLoad = getIconFile("load");

            if (btnScanAllProps && iconScan) {
                try { btnScanAllProps.image = iconScan; } catch (e) { }
            }
            if (btnSettings && iconSettings) {
                try { btnSettings.image = iconSettings; } catch (e) { }
            }
            for (var p = 0; p < pickersData.length; p++) {
                var ui = pickersUI[pickersData[p].id];
                if (ui) {
                    if (ui.btnLoad && iconLoad) {
                        try { ui.btnLoad.image = iconLoad; } catch (e) { }
                    }
                    if (ui.btnScanRow && iconScan) {
                        try { ui.btnScanRow.image = iconScan; } catch (e) { }
                    }
                }
            }
            if (win && win.layout) win.layout.layout(true);
        }

        var thumbSizes = {
            "Small": { key: "sq_s4", btnSize: [42, 42], renderSize: [42, 42], cols: 5 },
            "Medium": { key: "sq_m4", btnSize: [64, 64], renderSize: [64, 64], cols: 4 },
            "Big": { key: "sq_b4", btnSize: [92, 92], renderSize: [92, 92], cols: 3 }
        };

        var grpPickerTop = tabPicker.add("group");
        grpPickerTop.orientation = "column";
        grpPickerTop.alignChildren = ["fill", "top"];
        grpPickerTop.spacing = 4;
        grpPickerTop.margins = [2, 4, 2, 2];

        // Row 1: Apply Blink with Target Dropdown
        var grpBlinkRow = grpPickerTop.add("group");
        grpBlinkRow.orientation = "row";
        grpBlinkRow.alignChildren = ["left", "center"];
        grpBlinkRow.spacing = 4;
        grpBlinkRow.alignment = ["fill", "top"];

        var btnBlinkOp = grpBlinkRow.add("button", undefined, "Apply Blink");
        btnBlinkOp.preferredSize = [78, 22];
        btnBlinkOp.helpTip = "Adds blink expression (0% for 4 frames on 'B' marker) to the targeted property.";

        grpBlinkRow.add("statictext", undefined, "To:");
        var ddBlinkTarget = grpBlinkRow.add("dropdownlist", undefined, [
            "eye-open Opacity",
            "eye-close Opacity",
            "Opacity",
            "(Custom...)"
        ]);
        var cachedBlink = "eye-open Opacity";
        if (app.settings && app.settings.haveSetting("SmartRig", "blink_target")) {
            cachedBlink = app.settings.getSetting("SmartRig", "blink_target");
        }
        var bIdx = 0;
        for (var bi = 0; bi < ddBlinkTarget.items.length; bi++) {
            if (ddBlinkTarget.items[bi].text === cachedBlink) {
                bIdx = bi;
                break;
            }
        }
        ddBlinkTarget.selection = bIdx;
        ddBlinkTarget.alignment = ["fill", "center"];
        ddBlinkTarget.preferredSize.height = 20;

        ddBlinkTarget.onChange = function () {
            if (!this.selection) return;
            if (this.selection.text === "(Custom...)") {
                var custom = prompt("Enter target property name for blink (e.g. eye-open Opacity):", "");
                if (custom && custom !== "") {
                    var itm = this.add("item", custom);
                    this.selection = itm;
                    if (app.settings) app.settings.saveSetting("SmartRig", "blink_target", custom);
                } else {
                    this.selection = 0;
                }
            } else {
                if (app.settings) app.settings.saveSetting("SmartRig", "blink_target", this.selection.text);
            }
        };

        btnBlinkOp.onClick = function () {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            if (comp.selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            var targetPropName = (ddBlinkTarget && ddBlinkTarget.selection && ddBlinkTarget.selection.text !== "(Custom...)") ? ddBlinkTarget.selection.text : "eye-open Opacity";
            var countApplied = 0;

            app.beginUndoGroup("Apply Blink Opacity");
            try {
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    var targetProp = null;

                    try {
                        var essProps = layer.property("ADBE Master Properties");
                        if (!essProps) essProps = layer.property("Essential Properties");
                        if (essProps) {
                            targetProp = essProps.property(targetPropName);
                        }
                    } catch (e) { }

                    if (!targetProp && targetPropName.toLowerCase() === "opacity") {
                        try { targetProp = layer.transform.opacity; } catch (e) { }
                    }

                    if (!targetProp) {
                        try {
                            var fxParade = layer.property("ADBE Effect Parade") || layer.property("Effects");
                            if (fxParade) {
                                var fx = fxParade.property(targetPropName);
                                if (fx) targetProp = fx.property(1);
                            }
                        } catch (e) { }
                    }

                    if (targetProp && targetProp.canSetExpression) {
                        targetProp.expression = [
                            'try {',
                            '    var holdFrames = 4;',
                            '    var fps = 1.0 / thisComp.frameDuration;',
                            '    var holdSec = holdFrames / fps;',
                            '    var op = value;',
                            '    if (marker.numKeys > 0) {',
                            '        var idx = marker.nearestKey(time).index;',
                            '        if (marker.key(idx).time > time) idx--;',
                            '        if (idx > 0) {',
                            '            var mk = marker.key(idx);',
                            '            var c = mk.comment.toUpperCase();',
                            '            if (c === "B" || c === "BLINK") {',
                            '                var t = time - mk.time;',
                            '                if (t >= 0 && t < holdSec) {',
                            '                    op = 0;',
                            '                }',
                            '            }',
                            '        }',
                            '    }',
                            '    op;',
                            '} catch(err) {',
                            '    value;',
                            '}'
                        ].join('\n');
                        countApplied++;
                    } else {
                        alert("Could not find '" + targetPropName + "' on layer: " + layer.name);
                    }
                }
            } finally {
                app.endUndoGroup();
            }
        };

        // Row 2: Clean toolbar with Scan All (icon) and Settings (icon)
        var grpPickerToolbar = grpPickerTop.add("group");
        grpPickerToolbar.orientation = "row";
        grpPickerToolbar.alignChildren = ["left", "center"];
        grpPickerToolbar.spacing = 6;
        grpPickerToolbar.alignment = ["fill", "top"];

        var scanAllIcon = getIconFile("scan");
        var btnScanAllProps;
        if (scanAllIcon) {
            btnScanAllProps = grpPickerToolbar.add("iconbutton", undefined, scanAllIcon, { style: "toolbutton" });
            btnScanAllProps.preferredSize = [24, 22];
        } else {
            btnScanAllProps = grpPickerToolbar.add("button", undefined, "Scan All");
            btnScanAllProps.preferredSize = [60, 22];
        }
        btnScanAllProps.helpTip = "Scan selected layer and refresh all Target dropdowns";

        var lblStatusScan = grpPickerToolbar.add("statictext", undefined, "Scan all targets");
        lblStatusScan.alignment = ["fill", "center"];

        var settingsIcon = getIconFile("settings");
        var btnSettings;
        if (settingsIcon) {
            btnSettings = grpPickerToolbar.add("iconbutton", undefined, settingsIcon, { style: "toolbutton" });
            btnSettings.preferredSize = [24, 22];
        } else {
            btnSettings = grpPickerToolbar.add("button", undefined, "Settings");
            btnSettings.preferredSize = [60, 22];
        }
        btnSettings.helpTip = "Open Settings (Thumbnail Size, Reload, Cache Folder)";

        function reloadAllPickerThumbnails() {
            var reloadedCount = 0;
            for (var p = 0; p < pickersData.length; p++) {
                var pData = pickersData[p];
                var foundComp = null;
                if (pickersUI[pData.id] && pickersUI[pData.id].sourceComp) {
                    foundComp = pickersUI[pData.id].sourceComp;
                }
                if (!foundComp && app.settings && app.settings.haveSetting("SmartRig", "comp_" + pData.id)) {
                    var cName = app.settings.getSetting("SmartRig", "comp_" + pData.id);
                    if (cName) {
                        for (var i = 1; i <= app.project.numItems; i++) {
                            if (app.project.item(i) instanceof CompItem && app.project.item(i).name === cName) {
                                foundComp = app.project.item(i);
                                break;
                            }
                        }
                    }
                }
                if (foundComp) {
                    var tDir = new Folder(Folder.userData.fsName + "/SmartPickerThumbs");
                    if (tDir.exists) {
                        var oldFiles = tDir.getFiles("comp_" + foundComp.id + "_*");
                        for (var f = 0; f < oldFiles.length; f++) {
                            try { oldFiles[f].remove(); } catch (e) { }
                        }
                    }
                    buildPickerGrid(pData.id, foundComp);
                    reloadedCount++;
                }
            }
            return reloadedCount;
        }

        btnSettings.onClick = function () {
            var dlg = new Window("dialog", "Smart Picker Settings");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 8;
            dlg.margins = [12, 12, 12, 10];

            var pnlDisplay = dlg.add("panel", undefined, "Appearance & Theme");
            pnlDisplay.orientation = "column";
            pnlDisplay.alignChildren = ["fill", "top"];
            pnlDisplay.spacing = 6;
            pnlDisplay.margins = [10, 10, 10, 8];

            var grpSize = pnlDisplay.add("group");
            grpSize.orientation = "row";
            grpSize.add("statictext", undefined, "Thumbnail Size:");
            var ddSizeDlg = grpSize.add("dropdownlist", undefined, ["Small", "Medium", "Big"]);
            var curSize = (app.settings && app.settings.haveSetting("SmartRig", "ThumbSize")) ? app.settings.getSetting("SmartRig", "ThumbSize") : "Small";
            ddSizeDlg.selection = (curSize === "Big") ? 2 : (curSize === "Medium" ? 1 : 0);

            var grpTheme = pnlDisplay.add("group");
            grpTheme.orientation = "row";
            grpTheme.add("statictext", undefined, "Icon Theme:");
            var ddThemeDlg = grpTheme.add("dropdownlist", undefined, ["Auto (Detect)", "Dark (for Light AE)", "Light (for Dark AE)"]);
            var curTheme = (app.settings && app.settings.haveSetting("SmartRig", "IconTheme")) ? app.settings.getSetting("SmartRig", "IconTheme") : "Auto (Detect)";
            ddThemeDlg.selection = (curTheme === "Dark (for Light AE)") ? 1 : (curTheme === "Light (for Dark AE)" ? 2 : 0);

            var grpCacheBtns = pnlDisplay.add("group");
            grpCacheBtns.orientation = "row";
            grpCacheBtns.spacing = 6;
            var btnReloadCache = grpCacheBtns.add("button", undefined, "Reload All Thumbnails");
            btnReloadCache.helpTip = "Clears cached PNG thumbnails and regenerates them";
            var btnOpenCacheDir = grpCacheBtns.add("button", undefined, "Open Cache Folder");

            btnReloadCache.onClick = function () {
                var count = reloadAllPickerThumbnails();
                if (count > 0) {
                    alert("Cleared cache and reloaded thumbnails for " + count + " picker(s).");
                } else {
                    alert("No compositions loaded yet. Click the Load icon on a picker row first.");
                }
            };

            btnOpenCacheDir.onClick = function () {
                var thumbDir = new Folder(Folder.userData.fsName + "/SmartPickerThumbs");
                if (!thumbDir.exists) thumbDir.create();
                thumbDir.execute();
            };

            var grpButtons = dlg.add("group");
            grpButtons.orientation = "row";
            grpButtons.alignment = ["right", "bottom"];
            var btnSave = grpButtons.add("button", undefined, "OK");
            var btnCancel = grpButtons.add("button", undefined, "Cancel");

            btnSave.onClick = function () {
                if (app.settings) {
                    if (ddSizeDlg.selection) {
                        app.settings.saveSetting("SmartRig", "ThumbSize", ddSizeDlg.selection.text);
                    }
                    if (ddThemeDlg.selection) {
                        app.settings.saveSetting("SmartRig", "IconTheme", ddThemeDlg.selection.text);
                    }
                }
                dlg.close(1);
                refreshAllIcons();
                for (var p = 0; p < pickersData.length; p++) {
                    var pId = pickersData[p].id;
                    if (pickersUI[pId] && pickersUI[pId].sourceComp) {
                        buildPickerGrid(pId, pickersUI[pId].sourceComp);
                    }
                }
            };

            btnCancel.onClick = function () {
                dlg.close(0);
            };

            dlg.show();
        };

        var mainScroll = tabPicker.add("panel", undefined, "");
        mainScroll.alignment = ["fill", "fill"];
        mainScroll.orientation = "column";
        mainScroll.alignChildren = ["fill", "top"];
        mainScroll.margins = [4, 4, 4, 4];
        mainScroll.spacing = 4;

        var pickersData = [
            { id: "eyebrow", label: "Eyebrow Picker", defaultTarget: "eyebrow-slider" },
            { id: "eye_close", label: "Eye Close Picker", defaultTarget: "eye-close-slider" },
            { id: "mouth", label: "Mouth Picker", defaultTarget: "mouth-slider" },
            { id: "mode", label: "Mode Picker", defaultTarget: "-mode-slider" }
        ];

        var pickersUI = {};

        function scanLayerProperties(layer) {
            var propsList = [];
            if (!layer) return propsList;

            // 1. Scan Essential Properties (ADBE Master Properties)
            try {
                var essProps = layer.property("ADBE Master Properties");
                if (!essProps) essProps = layer.property("Essential Properties");
                if (essProps) {
                    for (var i = 1; i <= essProps.numProperties; i++) {
                        var prop = essProps.property(i);
                        if (prop && prop.name) {
                            propsList.push(prop.name);
                        }
                    }
                }
            } catch (e) { }

            // 2. Scan Effects (ADBE Effect Parade)
            try {
                var fxParade = layer.property("ADBE Effect Parade");
                if (!fxParade) fxParade = layer.property("Effects");
                if (fxParade) {
                    for (var i = 1; i <= fxParade.numProperties; i++) {
                        var fx = fxParade.property(i);
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

            return propsList;
        }

        function updatePickerDropdown(pickerId, scannedList) {
            var ui = pickersUI[pickerId];
            if (!ui || !ui.ddTarget) return;

            var dd = ui.ddTarget;
            var prevTarget = "";
            if (dd.selection && dd.selection.text !== "(Custom...)") {
                prevTarget = dd.selection.text;
            } else if (app.settings && app.settings.haveSetting("SmartRig", "target_" + pickerId)) {
                prevTarget = app.settings.getSetting("SmartRig", "target_" + pickerId);
            }
            if (!prevTarget) {
                for (var p = 0; p < pickersData.length; p++) {
                    if (pickersData[p].id === pickerId) {
                        prevTarget = pickersData[p].defaultTarget;
                        break;
                    }
                }
            }

            dd.removeAll();

            var matchedIdx = -1;
            var keywords = [];
            if (pickerId === "eyebrow") keywords = ["eyebrow", "brow"];
            else if (pickerId === "eye_close") keywords = ["eye-close", "eye_close", "close", "blink"];
            else if (pickerId === "mouth") keywords = ["mouth", "lipsync", "lip"];
            else if (pickerId === "mode") keywords = ["mode"];

            for (var i = 0; i < scannedList.length; i++) {
                var itemText = scannedList[i];
                dd.add("item", itemText);

                if (itemText === prevTarget) {
                    matchedIdx = i;
                } else if (matchedIdx === -1) {
                    var lower = itemText.toLowerCase();
                    for (var k = 0; k < keywords.length; k++) {
                        if (lower.indexOf(keywords[k]) !== -1) {
                            matchedIdx = i;
                            break;
                        }
                    }
                }
            }

            if (prevTarget && prevTarget !== "" && prevTarget !== "(Custom...)") {
                var foundPrev = false;
                for (var i = 0; i < scannedList.length; i++) {
                    if (scannedList[i] === prevTarget) {
                        foundPrev = true;
                        break;
                    }
                }
                if (!foundPrev) {
                    dd.add("item", prevTarget);
                    if (matchedIdx === -1) matchedIdx = dd.items.length - 1;
                }
            }

            dd.add("item", "(Custom...)");

            if (matchedIdx >= 0 && matchedIdx < dd.items.length) {
                dd.selection = matchedIdx;
            } else if (dd.items.length > 1) {
                dd.selection = 0;
            }

            if (dd.selection && dd.selection.text !== "(Custom...)" && app.settings) {
                app.settings.saveSetting("SmartRig", "target_" + pickerId, dd.selection.text);
            }
        }

        btnScanAllProps.onClick = function () {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }
            if (comp.selectedLayers.length === 0) {
                alert("Please select a character layer (with Essential Properties or Effects) in the timeline.");
                return;
            }

            var layer = comp.selectedLayers[0];
            var scannedProps = scanLayerProperties(layer);

            if (scannedProps.length === 0) {
                alert("No Essential Properties or Effects found on layer: " + layer.name);
                return;
            }

            for (var p = 0; p < pickersData.length; p++) {
                updatePickerDropdown(pickersData[p].id, scannedProps);
            }
        };

        function setPickerTarget(pickerId, targetName) {
            var ui = pickersUI[pickerId];
            if (!ui || !ui.ddTarget) return;
            var dd = ui.ddTarget;
            var foundIdx = -1;
            for (var i = 0; i < dd.items.length; i++) {
                if (dd.items[i].text === targetName) {
                    foundIdx = i;
                    break;
                }
            }
            if (foundIdx === -1) {
                var item = dd.add("item", targetName);
                dd.selection = item;
            } else {
                dd.selection = foundIdx;
            }
            if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pickerId, targetName);
        }

        function getPickerTarget(pickerId) {
            var ui = pickersUI[pickerId];
            if (!ui || !ui.ddTarget || !ui.ddTarget.selection) {
                if (app.settings && app.settings.haveSetting("SmartRig", "target_" + pickerId)) {
                    return app.settings.getSetting("SmartRig", "target_" + pickerId);
                }
                for (var p = 0; p < pickersData.length; p++) {
                    if (pickersData[p].id === pickerId) return pickersData[p].defaultTarget;
                }
                return "";
            }
            var selText = ui.ddTarget.selection.text;
            if (selText === "(Custom...)") return "";
            return selText;
        }

        function promptLoadComp(pickerId) {
            var allComps = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                if (app.project.item(i) instanceof CompItem) {
                    allComps.push(app.project.item(i));
                }
            }
            allComps.sort(function (a, b) { return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1; });

            var winDlg = new Window("dialog", "Select Source Comp", undefined, { resizeable: true });
            winDlg.orientation = "column";
            winDlg.alignChildren = ["fill", "top"];
            winDlg.spacing = 6;
            winDlg.margins = 12;

            winDlg.add("statictext", undefined, "Select Composition containing poses/frames:");

            var grpSearch = winDlg.add("group");
            grpSearch.orientation = "row";
            grpSearch.alignChildren = ["left", "center"];
            grpSearch.spacing = 4;
            grpSearch.alignment = ["fill", "top"];

            grpSearch.add("statictext", undefined, "Search:");
            var txtSearch = grpSearch.add("edittext", undefined, "");
            txtSearch.alignment = ["fill", "center"];
            txtSearch.preferredSize.height = 22;
            txtSearch.helpTip = "Type to search composition by name...";

            var compList = winDlg.add("listbox", undefined, [], { multiselect: false });
            compList.preferredSize = [280, 220];

            var filteredComps = [];

            function populateCompList() {
                compList.removeAll();
                filteredComps = [];
                var q = txtSearch.text.toLowerCase();

                for (var i = 0; i < allComps.length; i++) {
                    var c = allComps[i];
                    if (q === "" || c.name.toLowerCase().indexOf(q) !== -1) {
                        compList.add("item", c.name);
                        filteredComps.push(c);
                    }
                }

                if (compList.items.length > 0) {
                    compList.selection = 0;
                }
            }

            txtSearch.onChanging = populateCompList;
            populateCompList();

            var grpDlgButtons = winDlg.add("group");
            grpDlgButtons.orientation = "row";
            grpDlgButtons.alignment = ["center", "bottom"];

            var btnOk = grpDlgButtons.add("button", undefined, "OK");
            var btnCancel = grpDlgButtons.add("button", undefined, "Cancel");

            compList.onDoubleClick = function () {
                btnOk.onClick();
            };

            btnOk.onClick = function () {
                if (compList.selection !== null && filteredComps[compList.selection.index]) {
                    var selectedComp = filteredComps[compList.selection.index];
                    winDlg.close(1);
                    if (app.settings) {
                        app.settings.saveSetting("SmartRig", "comp_" + pickerId, selectedComp.name);
                    }
                    buildPickerGrid(pickerId, selectedComp);
                } else {
                    alert("Please select a composition first.");
                }
            };

            btnCancel.onClick = function () {
                winDlg.close(0);
            };

            txtSearch.active = true;
            winDlg.show();
        }

        // Initialize UI for each picker
        for (var p = 0; p < pickersData.length; p++) {
            (function (pData) {
                var pnl = mainScroll.add("panel", undefined, pData.label);
                pnl.orientation = "column";
                pnl.alignChildren = ["fill", "top"];
                pnl.spacing = 3;
                pnl.margins = [4, 8, 4, 4];
                pnl.alignment = ["fill", "top"];

                // Row 1: Load (icon), Target dropdown, Scan (icon)
                var grpRow1 = pnl.add("group");
                grpRow1.orientation = "row";
                grpRow1.alignChildren = ["left", "center"];
                grpRow1.spacing = 4;
                grpRow1.margins = 0;
                grpRow1.alignment = ["fill", "top"];

                var loadIcon = getIconFile("load");
                var btnLoad;
                if (loadIcon) {
                    btnLoad = grpRow1.add("iconbutton", undefined, loadIcon, { style: "toolbutton" });
                    btnLoad.preferredSize = [24, 20];
                } else {
                    btnLoad = grpRow1.add("button", undefined, "Load");
                    btnLoad.preferredSize = [42, 20];
                }
                btnLoad.helpTip = "Load composition frames as thumbnails";

                var lblTarget = grpRow1.add("statictext", undefined, "Target:");
                lblTarget.preferredSize.width = 40;

                var ddTarget = grpRow1.add("dropdownlist", undefined, []);
                ddTarget.alignment = ["fill", "center"];
                ddTarget.preferredSize.height = 20;

                var scanIcon = getIconFile("scan");
                var btnScanRow;
                if (scanIcon) {
                    btnScanRow = grpRow1.add("iconbutton", undefined, scanIcon, { style: "toolbutton" });
                    btnScanRow.preferredSize = [24, 20];
                } else {
                    btnScanRow = grpRow1.add("button", undefined, "Scan");
                    btnScanRow.preferredSize = [42, 20];
                }
                btnScanRow.helpTip = "Scan Essential Properties and Effects from the selected layer";

                var cachedTarget = "";
                if (app.settings && app.settings.haveSetting("SmartRig", "target_" + pData.id)) {
                    cachedTarget = app.settings.getSetting("SmartRig", "target_" + pData.id);
                }
                var initTarget = cachedTarget ? cachedTarget : pData.defaultTarget;
                ddTarget.add("item", initTarget);
                ddTarget.add("item", "(Custom...)");
                ddTarget.selection = 0;

                ddTarget.onChange = function () {
                    if (!this.selection) return;
                    if (this.selection.text === "(Custom...)") {
                        var custom = prompt("Enter target property name:", "");
                        if (custom && custom !== "") {
                            var item = this.add("item", custom);
                            this.selection = item;
                            if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pData.id, custom);
                        } else {
                            this.selection = 0;
                        }
                    } else {
                        if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pData.id, this.selection.text);
                    }
                };

                btnScanRow.onClick = function () {
                    var comp = app.project.activeItem;
                    if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
                        alert("Please select a character layer in the timeline to scan.");
                        return;
                    }
                    var layer = comp.selectedLayers[0];
                    var props = scanLayerProperties(layer);
                    if (props.length === 0) {
                        alert("No Essential Properties or Effects found on layer: " + layer.name);
                        return;
                    }
                    updatePickerDropdown(pData.id, props);
                };

                // Hidden Limit and Mode state (configured via Settings if needed)
                var hiddenLimit = { text: "" };
                var hiddenMode = { selection: { text: "0-100%" } };

                var grpGrid = pnl.add("group");
                grpGrid.orientation = "column";
                grpGrid.alignChildren = ["left", "top"];
                grpGrid.alignment = ["fill", "top"];
                grpGrid.spacing = 2;
                grpGrid.margins = 0;

                pickersUI[pData.id] = {
                    panel: pnl,
                    btnLoad: btnLoad,
                    ddTarget: ddTarget,
                    btnScanRow: btnScanRow,
                    txtManualLimit: hiddenLimit,
                    ddMode: hiddenMode,
                    grpGrid: grpGrid,
                    sourceComp: null
                };

                btnLoad.onClick = function () {
                    promptLoadComp(pData.id);
                };
            })(pickersData[p]);
        }

        function buildPickerGrid(pickerId, sourceComp) {
            try {
                var ui = pickersUI[pickerId];
                if (!ui) return;
                ui.sourceComp = sourceComp;

                var scrollGroup = ui.grpGrid;
                while (scrollGroup.children.length > 0) {
                    scrollGroup.remove(scrollGroup.children[0]);
                }

                var maxCompFrames = Math.round(sourceComp.duration / sourceComp.frameDuration);
                if (maxCompFrames <= 0) {
                    alert("Selected comp has no duration.");
                    return;
                }

                // Determine number of frames to render (e.g. 17 instead of 1080)
                var numFrames = maxCompFrames;
                var userLimit = 0;
                if (ui.txtManualLimit && ui.txtManualLimit.text !== "" && ui.txtManualLimit.text.toLowerCase() !== "auto") {
                    var p = parseInt(ui.txtManualLimit.text, 10);
                    if (!isNaN(p) && p > 0) userLimit = p;
                }
                if (userLimit > 0 && userLimit < maxCompFrames) {
                    numFrames = userLimit;
                }

                var currentSizeName = "Small";
                if (app.settings && app.settings.haveSetting("SmartRig", "ThumbSize")) {
                    currentSizeName = app.settings.getSetting("SmartRig", "ThumbSize");
                }
                var sizeConfig = thumbSizes[currentSizeName] || thumbSizes["Small"];

                var currentRow = null;
                var frameDuration = sourceComp.frameDuration;
                var thumbDir = new Folder(Folder.userData.fsName + "/SmartPickerThumbs");
                if (!thumbDir.exists) thumbDir.create();

                // Render Thumbnails if missing for this size
                var missingThumbs = false;
                for (var i = 0; i < numFrames; i++) {
                    var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_" + sizeConfig.key + "_f" + i + ".png";
                    if (!(new File(pathStr)).exists) {
                        missingThumbs = true;
                        break;
                    }
                }

                if (missingThumbs) {
                    var tempComp = null;
                    try {
                        var rw = sizeConfig.renderSize[0];
                        var rh = sizeConfig.renderSize[1];
                        tempComp = app.project.items.addComp("SmartPicker_Temp", rw, rh, 1, sourceComp.duration, sourceComp.frameRate);
                        var compBg = [0.88, 0.88, 0.88];
                        if (sourceComp.bgColor && sourceComp.bgColor.length === 3) {
                            var b = (sourceComp.bgColor[0] * 0.299 + sourceComp.bgColor[1] * 0.587 + sourceComp.bgColor[2] * 0.114);
                            if (b >= 0.25) {
                                compBg = sourceComp.bgColor;
                            }
                        }
                        tempComp.layers.addSolid(compBg, "BG", rw, rh, 1, sourceComp.duration);
                        var srcLayer = tempComp.layers.add(sourceComp);

                        srcLayer.property("Position").setValue([rw / 2, rh / 2]);

                        var scaleX = rw / sourceComp.width;
                        var scaleY = rh / sourceComp.height;
                        // Auto-fit into 1:1 square: uniform Math.min prevents stretching, 82% gives comfortable margins
                        var scale = Math.min(scaleX, scaleY) * 82;
                        srcLayer.property("Scale").setValue([scale, scale]);

                        for (var i = 0; i < numFrames; i++) {
                            var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_" + sizeConfig.key + "_f" + i + ".png";
                            var tempFile = new File(pathStr);
                            if (!tempFile.exists) {
                                var timeToRender = i * frameDuration;
                                try {
                                    tempComp.saveFrameToPng(timeToRender, tempFile);
                                    $.sleep(20);
                                } catch (e) { }
                            }
                        }
                    } catch (e) {
                    } finally {
                        if (tempComp) {
                            try { tempComp.remove(); } catch (err) { }
                        }
                    }
                }

                // Build UI Grid
                for (var i = 0; i < numFrames; i++) {
                    if (i % sizeConfig.cols === 0) {
                        currentRow = scrollGroup.add("group");
                        currentRow.orientation = "row";
                        currentRow.alignChildren = ["left", "top"];
                        currentRow.spacing = 4;
                        currentRow.margins = [0, 2, 0, 2];
                    }

                    var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_" + sizeConfig.key + "_f" + i + ".png";
                    var tempFile = new File(pathStr);

                    var btnIcon;
                    if (tempFile.exists) {
                        btnIcon = currentRow.add("iconbutton", undefined, tempFile, { style: "toolbutton" });
                    } else {
                        btnIcon = currentRow.add("button", undefined, (i).toString());
                    }
                    btnIcon.preferredSize = sizeConfig.btnSize;
                    btnIcon.pickerId = pickerId;
                    btnIcon.frameIndex = i;

                    btnIcon.onClick = function () {
                        applyPickerValue(this.pickerId, this.frameIndex, numFrames);
                    };
                }

                scrollGroup.layout.layout(true);
                ui.panel.layout.layout(true);
                mainScroll.layout.layout(true);
                if (win && win.layout) {
                    win.layout.layout(true);
                    win.layout.resize();
                }
            } catch (errGrid) {
                alert("Error building picker thumbnails: " + errGrid.toString());
            }
        }

        function autoRestoreLoadedComps() {
            if (!app.project) return;
            for (var p = 0; p < pickersData.length; p++) {
                var pData = pickersData[p];
                if (app.settings && app.settings.haveSetting("SmartRig", "comp_" + pData.id)) {
                    var cName = app.settings.getSetting("SmartRig", "comp_" + pData.id);
                    if (!cName) continue;
                    var foundComp = null;
                    for (var i = 1; i <= app.project.numItems; i++) {
                        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === cName) {
                            foundComp = app.project.item(i);
                            break;
                        }
                    }
                    if (foundComp) {
                        buildPickerGrid(pData.id, foundComp);
                    }
                }
            }
        }

        function applyPickerValue(pickerId, index, totalFrames) {
            var targetComp = app.project.activeItem;
            if (!targetComp || targetComp.selectedLayers.length === 0) {
                alert("Please select the target layer in the timeline.");
                return;
            }

            var ui = pickersUI[pickerId];
            var effectName = getPickerTarget(pickerId);
            var targetLayer = targetComp.selectedLayers[0];
            var targetProp = null;

            function findPropertyWithSuffix(group, suffix) {
                if (!group) return null;
                for (var i = 1; i <= group.numProperties; i++) {
                    var prop = group.property(i);
                    var pName = prop.name;
                    if (pName.length >= suffix.length && pName.substring(pName.length - suffix.length) === suffix) {
                        return prop;
                    }
                }
                return null;
            }

            try {
                var essProps = targetLayer.property("ADBE Master Properties");
                if (!essProps) essProps = targetLayer.property("Essential Properties");

                if (essProps) {
                    if (effectName.charAt(0) === "-") {
                        var foundProp = findPropertyWithSuffix(essProps, effectName);
                        if (foundProp) {
                            targetProp = foundProp;
                            setPickerTarget(pickerId, foundProp.name);
                            effectName = foundProp.name;
                        }
                    } else {
                        targetProp = essProps.property(effectName);
                    }
                }
            } catch (e) { }

            if (!targetProp) {
                try {
                    var effectsGrp = targetLayer.property("ADBE Effect Parade") || targetLayer.property("Effects");
                    if (effectsGrp) {
                        if (effectName.charAt(0) === "-") {
                            var foundFx = findPropertyWithSuffix(effectsGrp, effectName);
                            if (foundFx) {
                                targetProp = foundFx.property(1);
                                setPickerTarget(pickerId, foundFx.name);
                                effectName = foundFx.name;
                            }
                        } else {
                            var fx = effectsGrp.property(effectName);
                            if (fx) targetProp = fx.property(1);
                        }
                    }
                } catch (e) { }
            }

            if (!targetProp) {
                alert("Property '" + effectName + "' not found on layer: " + targetLayer.name + ". Click 'Scan' to refresh properties.");
                return;
            }

            if (!targetProp.canSetExpression) {
                alert("The found property '" + targetProp.name + "' cannot be keyframed.");
                return;
            }

            // --- Auto-detect Slider Mode & Limit ---
            var chosenMode = (ui.ddMode && ui.ddMode.selection) ? ui.ddMode.selection.text : "Auto";
            var isNormalized = false;
            var isJnS = false;
            var detectedLimit = 0;

            // 1. Manual Limit from text input if specified (ignore "100" which represents 100% slider range, not frame count)
            if (ui.txtManualLimit && ui.txtManualLimit.text !== "" && ui.txtManualLimit.text.toLowerCase() !== "auto") {
                var parsedLimit = parseFloat(ui.txtManualLimit.text);
                if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit !== 100) {
                    detectedLimit = parsedLimit;
                }
            }

            // 2. Check for Normalized Switcher expression
            var expToInspect = "";
            var expLimit = 0;

            // Check targetProp expression directly
            try {
                if (targetProp && targetProp.canSetExpression && targetProp.expression) {
                    expToInspect = targetProp.expression;
                }
            } catch (e) { }

            // Check targetLayer Time Remapping
            if (!expToInspect) {
                var tr = targetLayer.property("ADBE Time Remapping") || targetLayer.timeRemap;
                if (tr && tr.expression) {
                    expToInspect = tr.expression;
                }
            }

            // If not found directly, inspect child layers inside targetLayer.source (Essential Properties rig)
            if (!expToInspect && targetLayer.source && (targetLayer.source instanceof CompItem)) {
                var innerComp = targetLayer.source;

                // Priority 1: layer whose source comp is ui.sourceComp (the exact comp loaded into this picker)
                if (ui && ui.sourceComp) {
                    for (var li = 1; li <= innerComp.numLayers; li++) {
                        var childL = innerComp.layer(li);
                        if (childL.source && childL.source === ui.sourceComp) {
                            var childTr = childL.property("ADBE Time Remapping") || childL.timeRemap;
                            if (childTr && childTr.expression) {
                                expToInspect = childTr.expression;
                                break;
                            }
                        }
                    }
                }

                // Priority 2: match by layer name / clean effect name / prefix / pickerId
                if (!expToInspect) {
                    var cleanTarget = effectName.toLowerCase().replace(/-slider$/, "");
                    var prefix = effectName.split("-")[0].toLowerCase();
                    for (var li = 1; li <= innerComp.numLayers; li++) {
                        var childL = innerComp.layer(li);
                        var cName = childL.name.toLowerCase();
                        if (cName.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cName) !== -1 || cName.indexOf(prefix) !== -1 || cName.indexOf(pickerId) !== -1) {
                            var childTr = childL.property("ADBE Time Remapping") || childL.timeRemap;
                            if (childTr && childTr.expression) {
                                expToInspect = childTr.expression;
                                break;
                            }
                        }
                    }
                }

                // Priority 3: any layer in innerComp referencing effectName or linear Time Remap
                if (!expToInspect) {
                    for (var li = 1; li <= innerComp.numLayers; li++) {
                        var childL = innerComp.layer(li);
                        var childTr = childL.property("ADBE Time Remapping") || childL.timeRemap;
                        if (childTr && childTr.expression && (childTr.expression.indexOf(effectName) !== -1 || childTr.expression.indexOf("linear") !== -1)) {
                            expToInspect = childTr.expression;
                            break;
                        }
                    }
                }
            }

            if (expToInspect) {
                if (expToInspect.indexOf("clamp(x, 0, 100)") !== -1 || expToInspect.indexOf("0, 100, 0") !== -1 || expToInspect.indexOf("linear(") !== -1) {
                    isNormalized = true;
                }
                var mLimit = expToInspect.match(/0\s*,\s*100\s*,\s*0\s*,\s*(\d+(?:\.\d+)?)/);
                if (!mLimit) {
                    mLimit = expToInspect.match(/linear\([^,]+,\s*0\s*,\s*100\s*,\s*0\s*,\s*(\d+(?:\.\d+)?)\s*\)/);
                }
                if (mLimit && mLimit[1]) {
                    expLimit = parseFloat(mLimit[1]);
                }
            }

            // 3. Check for Joysticks 'n Sliders
            if (!isNormalized && targetLayer.source instanceof CompItem) {
                try {
                    var jnsPrefix = effectName.split("-")[0];
                    var sdLayer = null;
                    for (var i = 1; i <= targetLayer.source.numLayers; i++) {
                        var l = targetLayer.source.layer(i);
                        if (l.name.indexOf(jnsPrefix) === 0 && l.name.indexOf("-sd") !== -1) {
                            sdLayer = l;
                            break;
                        }
                    }
                    if (sdLayer) {
                        var effects = sdLayer.property("ADBE Effect Parade") || sdLayer.property("Effects");
                        if (effects) {
                            for (var e = 1; e <= effects.numProperties; e++) {
                                if (effects.property(e).matchName === "Pseudo/fL3c11baf7UVr" || effects.property(e).name.indexOf("Slider Options") !== -1) {
                                    var limitProp = effects.property(e).property("Slider Limit") || effects.property(e).property(2);
                                    if (limitProp && limitProp.value > 0) {
                                        detectedLimit = limitProp.value;
                                        isJnS = true;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) { }
            }

            // Honor explicit user mode selection if overridden
            if (chosenMode === "0-100%") {
                isNormalized = true;
                isJnS = false;
            } else if (chosenMode === "Frames") {
                isNormalized = false;
                isJnS = false;
            }

            // Calculate keyframe value
            var val = 0;
            if (isNormalized) {
                // Determine divisor for frames:
                // 1. If expression limit is found in AE (e.g. 12), that is the ground truth
                // 2. If user manually entered a limit (and it's not 100), use that
                // 3. Otherwise use totalFrames (e.g. 6 thumbnails)
                var divisor = 0;
                if (expLimit > 0) {
                    divisor = expLimit;
                } else if (detectedLimit > 0) {
                    divisor = detectedLimit;
                } else {
                    divisor = (totalFrames > 0) ? totalFrames : 1;
                }

                if (divisor <= 0) divisor = 1;
                val = (index / divisor) * 100;
                val = Math.round(val * 100) / 100;

                // Auto-sync UI input box to show the real frame count instead of empty or 100
                if (ui.txtManualLimit && (ui.txtManualLimit.text === "" || ui.txtManualLimit.text === "100" || ui.txtManualLimit.text.toLowerCase() === "auto")) {
                    ui.txtManualLimit.text = divisor.toString();
                    if (app.settings) app.settings.saveSetting("SmartRig", "limit_val_" + pickerId, divisor.toString());
                }
            } else if (isJnS) {
                var jnsLimit = (detectedLimit > 0) ? detectedLimit : totalFrames;
                var step = jnsLimit / totalFrames;
                val = (index * step) + (step * 0.2);
            } else {
                val = index;
            }

            app.beginUndoGroup("Smart Picker Apply");
            try {
                targetProp.setValueAtTime(targetComp.time, val);
                var newKeyIndex = targetProp.nearestKeyIndex(targetComp.time);
                if (newKeyIndex > 0) {
                    targetProp.setInterpolationTypeAtKey(newKeyIndex, KeyframeInterpolationType.HOLD);
                }
            } catch (e) {
                alert("Error setting value: " + e.toString());
            } finally {
                app.endUndoGroup();
            }
        }

        // --- END SMART PICKER LOGIC ---

        // ==========================================
        // --- SWITCHER LOGIC ---
        // ==========================================
        var pnlSwitcherInfo = tabSwitcher.add("panel", undefined, "Time Remap Switcher");
        pnlSwitcherInfo.orientation = "column";
        pnlSwitcherInfo.alignChildren = ["fill", "top"];
        pnlSwitcherInfo.spacing = 6;
        pnlSwitcherInfo.margins = [8, 10, 8, 8];

        var switcherConfig = {
            countModeIdx: 0, // Inner Comp Layers (numLayers)
            customLimit: 17,
            namePattern: "{name}-slider",
            modeIdx: 1, // Normalized (0 to 100%)
            clamp: true,
            round: true,
            addToEG: false
        };

        if (app.settings && app.settings.haveSetting("SmartRig", "sw_count_mode")) {
            switcherConfig.countModeIdx = parseInt(app.settings.getSetting("SmartRig", "sw_count_mode"), 10) || 0;
        }
        if (app.settings && app.settings.haveSetting("SmartRig", "sw_name_pattern")) {
            switcherConfig.namePattern = app.settings.getSetting("SmartRig", "sw_name_pattern");
        }
        if (app.settings && app.settings.haveSetting("SmartRig", "sw_mode_idx")) {
            switcherConfig.modeIdx = parseInt(app.settings.getSetting("SmartRig", "sw_mode_idx"), 10);
            if (isNaN(switcherConfig.modeIdx)) switcherConfig.modeIdx = 1;
        }

        // Row 1: Auto Create Switcher checkbox (Checked by default)
        var chkAutoCreate = pnlSwitcherInfo.add("checkbox", undefined, "Auto Create Switcher");
        var savedAutoCreate = "1";
        if (app.settings && app.settings.haveSetting("SmartRig", "auto_create_switcher")) {
            savedAutoCreate = app.settings.getSetting("SmartRig", "auto_create_switcher");
        }
        chkAutoCreate.value = (savedAutoCreate !== "0");
        chkAutoCreate.helpTip = "Automatically inspects the selected layer, enables Time Remapping, creates the slider effect, and sets the normalized expression in 1 click.";

        // Row 2: Selected layer info
        var lblInspectLayer = pnlSwitcherInfo.add("statictext", undefined, "Selected: (None)");
        lblInspectLayer.alignment = ["fill", "center"];

        var lblInspectDetails = pnlSwitcherInfo.add("statictext", undefined, "Source Comp: - | Inner Layers: -");
        lblInspectDetails.alignment = ["fill", "center"];

        // Row 3: Action Buttons
        var grpActionBtns = pnlSwitcherInfo.add("group");
        grpActionBtns.orientation = "row";
        grpActionBtns.alignChildren = ["fill", "center"];
        grpActionBtns.spacing = 6;

        var btnActionSwitcher = grpActionBtns.add("button", undefined, chkAutoCreate.value ? "Inspect & Create Switcher" : "Inspect Selected");
        btnActionSwitcher.preferredSize = [185, 28];
        btnActionSwitcher.helpTip = "Inspect the selected layer and set up the Time Remap Switcher";

        var btnOptions = grpActionBtns.add("button", undefined, "Options...");
        btnOptions.preferredSize = [80, 28];
        btnOptions.helpTip = "Customize Switcher settings (naming pattern, limit calculation, clamping)";

        var lblStatus = pnlSwitcherInfo.add("statictext", undefined, "Select precomp layer in timeline and click.");
        lblStatus.alignment = ["fill", "center"];

        chkAutoCreate.onClick = function () {
            if (app.settings) app.settings.saveSetting("SmartRig", "auto_create_switcher", this.value ? "1" : "0");
            btnActionSwitcher.text = this.value ? "Inspect & Create Switcher" : "Inspect Selected";
        };

        btnOptions.onClick = function () {
            var dlg = new Window("dialog", "Switcher Options");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 8;
            dlg.margins = [12, 12, 12, 10];

            var pnlOpt = dlg.add("panel", undefined, "Configuration");
            pnlOpt.orientation = "column";
            pnlOpt.alignChildren = ["left", "top"];
            pnlOpt.spacing = 6;
            pnlOpt.margins = [10, 10, 10, 8];

            var grpCount = pnlOpt.add("group");
            grpCount.orientation = "row";
            grpCount.add("statictext", undefined, "Calculate Limit From:");
            var ddCountMode = grpCount.add("dropdownlist", undefined, [
                "Inner Comp Layers (numLayers)",
                "Comp Duration (Frames)",
                "Manual Limit"
            ]);
            ddCountMode.selection = switcherConfig.countModeIdx;
            ddCountMode.preferredSize.width = 180;

            var grpLimitRow = pnlOpt.add("group");
            grpLimitRow.orientation = "row";
            grpLimitRow.add("statictext", undefined, "Manual Limit:");
            var txtCustomLimit = grpLimitRow.add("edittext", undefined, switcherConfig.customLimit.toString());
            txtCustomLimit.preferredSize = [50, 20];

            var grpNaming = pnlOpt.add("group");
            grpNaming.orientation = "row";
            grpNaming.add("statictext", undefined, "Slider Effect Name:");
            var txtSliderPattern = grpNaming.add("edittext", undefined, switcherConfig.namePattern);
            txtSliderPattern.preferredSize = [140, 20];

            var grpMode = pnlOpt.add("group");
            grpMode.orientation = "row";
            grpMode.add("statictext", undefined, "Slider Mode:");
            var ddSliderMode = grpMode.add("dropdownlist", undefined, [
                "Frame Numbers (0 to N)",
                "Normalized (0 to 100%)"
            ]);
            ddSliderMode.selection = switcherConfig.modeIdx;

            var chkClamp = pnlOpt.add("checkbox", undefined, "Clamp expression to frame limit: clamp(x, 0, limit)");
            chkClamp.value = switcherConfig.clamp;

            var chkRound = pnlOpt.add("checkbox", undefined, "Round slider value in expression: Math.round(x)");
            chkRound.value = switcherConfig.round;

            var chkAddToEG = pnlOpt.add("checkbox", undefined, "Add Slider to Essential Graphics panel (if supported)");
            chkAddToEG.value = switcherConfig.addToEG;

            var btnOpenEditValue = pnlOpt.add("button", undefined, "Open AE 'Edit Value' dialog...");
            btnOpenEditValue.onClick = function () {
                var comp = app.project.activeItem;
                if (!comp || comp.selectedLayers.length === 0) {
                    alert("Please select a layer with a slider control.");
                    return;
                }
                try {
                    var cmdId = app.findMenuCommandId("Edit Value...");
                    if (cmdId) app.executeCommand(cmdId);
                } catch (e) { }
            };

            var grpBtns = dlg.add("group");
            grpBtns.orientation = "row";
            grpBtns.alignment = ["right", "bottom"];
            var btnOk = grpBtns.add("button", undefined, "OK");
            var btnCancel = grpBtns.add("button", undefined, "Cancel");

            btnOk.onClick = function () {
                switcherConfig.countModeIdx = ddCountMode.selection.index;
                switcherConfig.customLimit = parseInt(txtCustomLimit.text, 10) || 12;
                switcherConfig.namePattern = txtSliderPattern.text || "{name}-slider";
                switcherConfig.modeIdx = ddSliderMode.selection.index;
                switcherConfig.clamp = chkClamp.value;
                switcherConfig.round = chkRound.value;
                switcherConfig.addToEG = chkAddToEG.value;

                if (app.settings) {
                    app.settings.saveSetting("SmartRig", "sw_count_mode", switcherConfig.countModeIdx.toString());
                    app.settings.saveSetting("SmartRig", "sw_name_pattern", switcherConfig.namePattern);
                    app.settings.saveSetting("SmartRig", "sw_mode_idx", switcherConfig.modeIdx.toString());
                }
                dlg.close(1);
            };

            btnCancel.onClick = function () {
                dlg.close(0);
            };

            dlg.show();
        };


        // Panel 2: Quick Frame Controller
        var pnlQuickCtrl = tabSwitcher.add("panel", undefined, "Quick Frame Controller");
        pnlQuickCtrl.orientation = "column";
        pnlQuickCtrl.alignChildren = ["fill", "top"];
        pnlQuickCtrl.spacing = 6;
        pnlQuickCtrl.margins = [8, 10, 8, 8];

        var grpQuickTarget = pnlQuickCtrl.add("group");
        grpQuickTarget.orientation = "row";
        grpQuickTarget.alignChildren = ["left", "center"];
        grpQuickTarget.spacing = 6;

        grpQuickTarget.add("statictext", undefined, "Target Slider:");
        var txtQuickTarget = grpQuickTarget.add("edittext", undefined, "");
        txtQuickTarget.alignment = ["fill", "center"];
        txtQuickTarget.preferredSize.height = 20;

        var btnQuickFind = grpQuickTarget.add("button", undefined, "Detect");
        btnQuickFind.preferredSize = [60, 20];
        btnQuickFind.helpTip = "Find the slider on the currently selected layer";

        var grpQuickSlider = pnlQuickCtrl.add("group");
        grpQuickSlider.orientation = "row";
        grpQuickSlider.alignChildren = ["left", "center"];
        grpQuickSlider.spacing = 6;

        var btnPrevFrame = grpQuickSlider.add("button", undefined, "[-]");
        btnPrevFrame.preferredSize = [30, 22];
        btnPrevFrame.helpTip = "Previous Frame (-1)";

        var slideQuickVal = grpQuickSlider.add("slider", undefined, 0, 0, 12);
        slideQuickVal.alignment = ["fill", "center"];

        var txtQuickVal = grpQuickSlider.add("edittext", undefined, "0");
        txtQuickVal.preferredSize = [35, 20];

        var btnNextFrame = grpQuickSlider.add("button", undefined, "[+]");
        btnNextFrame.preferredSize = [30, 22];
        btnNextFrame.helpTip = "Next Frame (+1)";

        var grpQuickButtons = pnlQuickCtrl.add("group");
        grpQuickButtons.orientation = "row";
        grpQuickButtons.alignChildren = ["left", "center"];
        grpQuickButtons.spacing = 6;

        var chkHoldKey = grpQuickButtons.add("checkbox", undefined, "Hold Keyframe at Current Time");
        chkHoldKey.value = true;

        // Quick Frame Controller helpers
        function findActiveSlider() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length === 0) return null;
            var layer = comp.selectedLayers[0];
            var effectsGroup = layer.property("ADBE Effect Parade") || layer.property("Effects");
            if (!effectsGroup) return null;

            var fx = null;
            var targetName = txtQuickTarget.text;
            if (targetName && targetName !== "") {
                fx = effectsGroup.property(targetName);
            }
            if (!fx) {
                fx = effectsGroup.property(layer.name + "-slider");
            }
            if (!fx) {
                for (var e = 1; e <= effectsGroup.numProperties; e++) {
                    var prop = effectsGroup.property(e);
                    if (prop.matchName === "ADBE Slider Control") {
                        fx = prop;
                        break;
                    }
                }
            }
            if (fx) {
                return { layer: layer, effect: fx, sliderProp: fx.property(1) };
            }
            return null;
        }

        function isSliderNormalized(layer, sliderName) {
            if (!layer) return false;
            var tr = layer.property("ADBE Time Remapping") || layer.timeRemap;
            if (tr && tr.expression && (tr.expression.indexOf("100") !== -1 || tr.expression.indexOf("linear") !== -1)) {
                return true;
            }
            return (switcherConfig.modeIdx === 1);
        }

        function syncQuickController() {
            var found = findActiveSlider();
            if (found) {
                txtQuickTarget.text = found.effect.name;
                var limit = 12;
                if (found.layer.source && found.layer.source instanceof CompItem) {
                    limit = found.layer.source.numLayers;
                    if (limit <= 0) limit = Math.round(found.layer.source.duration / found.layer.source.frameDuration);
                }
                slideQuickVal.maxvalue = limit > 0 ? limit : 12;
                var curVal = found.sliderProp.value;
                var isNorm = isSliderNormalized(found.layer, found.effect.name);
                var displayFrame = isNorm ? Math.round((curVal / 100) * limit) : Math.round(curVal);
                if (displayFrame < 0) displayFrame = 0;
                if (displayFrame > slideQuickVal.maxvalue) displayFrame = slideQuickVal.maxvalue;
                slideQuickVal.value = displayFrame;
                txtQuickVal.text = displayFrame.toString();
            }
        }

        function applyQuickFrame(frameVal, withUndo) {
            if (withUndo === undefined) withUndo = true;
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) return;
            var found = findActiveSlider();
            if (!found || !found.sliderProp) return;

            var limit = slideQuickVal.maxvalue || 12;
            var isNorm = isSliderNormalized(found.layer, found.effect.name);
            var valToSet = frameVal;
            if (isNorm) {
                valToSet = (limit > 0) ? (frameVal / limit) * 100 : 0;
            }

            if (withUndo) app.beginUndoGroup("Switch Frame");
            try {
                if (chkHoldKey.value) {
                    found.sliderProp.setValueAtTime(comp.time, valToSet);
                    var keyIdx = found.sliderProp.nearestKeyIndex(comp.time);
                    if (keyIdx > 0) {
                        found.sliderProp.setInterpolationTypeAtKey(keyIdx, KeyframeInterpolationType.HOLD);
                    }
                } else {
                    found.sliderProp.setValue(valToSet);
                }
            } catch (e) { 
            } finally {
                if (withUndo) app.endUndoGroup();
            }
        }

        function inspectCurrentLayer() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
                lblInspectLayer.text = "Selected: (None)";
                lblInspectDetails.text = "Source Comp: - | Inner Layers: -";
                return null;
            }
            var layer = comp.selectedLayers[0];
            lblInspectLayer.text = "Selected: " + layer.name;
            if (layer.source && layer.source instanceof CompItem) {
                var numL = layer.source.numLayers;
                var durF = Math.round(layer.source.duration / layer.source.frameDuration);
                lblInspectDetails.text = "Source: " + layer.source.name + " | Inner Layers: " + numL + " (" + durF + " frames)";
                switcherConfig.customLimit = numL;
                return { layer: layer, numLayers: numL, durationFrames: durF };
            } else if (layer.source && layer.source.duration) {
                var durF = Math.round(layer.source.duration / layer.source.frameDuration);
                lblInspectDetails.text = "Source: " + layer.source.name + " | Duration: " + durF + " frames";
                switcherConfig.customLimit = durF;
                return { layer: layer, numLayers: durF, durationFrames: durF };
            } else {
                lblInspectDetails.text = "Source: Non-comp layer";
                return { layer: layer, numLayers: 12, durationFrames: 12 };
            }
        }

        function executeCreateSwitcher() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition first.");
                return;
            }

            var selLayers = comp.selectedLayers;
            if (selLayers.length === 0) {
                alert("Please select at least one precomp layer (e.g., Lipsync or Expression layer).");
                return;
            }

            app.beginUndoGroup("Create Time Remap Switcher");
            try {
                var processed = 0;
                var lastSliderName = "";
                var lastLimit = 12;
                var isNormalized = (switcherConfig.modeIdx === 1);

                for (var i = 0; i < selLayers.length; i++) {
                    var layer = selLayers[i];

                    var limitVal = 12;
                    var isComp = (layer.source && layer.source instanceof CompItem);

                    if (switcherConfig.countModeIdx === 0) { // Inner Comp Layers (numLayers)
                        if (isComp) {
                            limitVal = layer.source.numLayers;
                            if (limitVal <= 0) {
                                limitVal = Math.round(layer.source.duration / layer.source.frameDuration);
                            }
                        } else if (layer.source && layer.source.duration) {
                            limitVal = Math.round(layer.source.duration / layer.source.frameDuration);
                        } else {
                            limitVal = switcherConfig.customLimit || 12;
                        }
                    } else if (switcherConfig.countModeIdx === 1) { // Comp Duration (Frames)
                        if (isComp || (layer.source && layer.source.duration)) {
                            limitVal = Math.round(layer.source.duration / layer.source.frameDuration);
                        } else {
                            limitVal = switcherConfig.customLimit || 12;
                        }
                    } else { // Manual Limit
                        limitVal = switcherConfig.customLimit || 12;
                    }

                    if (limitVal <= 0) limitVal = 1;

                    var wasLocked = layer.locked;
                    if (wasLocked) layer.locked = false;

                    if (!layer.timeRemapEnabled) {
                        try {
                            if (layer.canSetTimeRemapEnabled) {
                                layer.timeRemapEnabled = true;
                            } else {
                                layer.timeRemapEnabled = true;
                            }
                        } catch (errRemap) { }
                    }

                    if (!layer.timeRemapEnabled) {
                        alert("Layer '" + layer.name + "' cannot enable Time Remapping. Please make sure the layer is a composition or footage layer.");
                        if (wasLocked) layer.locked = true;
                        continue;
                    }

                    var timeRemapProp = layer.property("ADBE Time Remapping");
                    if (!timeRemapProp) timeRemapProp = layer.timeRemap;

                    if (!timeRemapProp || !timeRemapProp.canSetExpression) {
                        alert("Cannot access Time Remap property on layer: " + layer.name);
                        if (wasLocked) layer.locked = true;
                        continue;
                    }

                    var effectsGroup = layer.property("ADBE Effect Parade") || layer.property("Effects");
                    var pattern = switcherConfig.namePattern || "{name}-slider";
                    var desiredSliderName = pattern.replace(/\{name\}/g, layer.name);

                    var sliderEffect = null;
                    if (effectsGroup) {
                        sliderEffect = effectsGroup.property(desiredSliderName);
                        if (!sliderEffect) {
                            sliderEffect = effectsGroup.addProperty("ADBE Slider Control");
                            sliderEffect.name = desiredSliderName;
                        }
                    }

                    if (!sliderEffect) {
                        alert("Failed to create Slider Control on layer: " + layer.name);
                        if (wasLocked) layer.locked = true;
                        continue;
                    }

                    var actualSliderName = sliderEffect.name;
                    var sliderProp = sliderEffect.property(1);

                    if (sliderProp) {
                        try {
                            sliderProp.setValue(0);
                            try { sliderProp.maxValue = limitVal; } catch (e) { }
                        } catch (e) { }
                    }

                    var exp = "";
                    if (isNormalized) {
                        exp += 'x=effect("' + actualSliderName + '")("Slider")\n';
                        exp += 'framesToTime(Math.round(linear(clamp(x, 0, 100), 0, 100, 0, ' + limitVal + ')))';
                    } else {
                        if (switcherConfig.round) {
                            exp += 'x=Math.round(effect("' + actualSliderName + '")("Slider"))\n';
                        } else {
                            exp += 'x=effect("' + actualSliderName + '")("Slider")\n';
                        }

                        if (switcherConfig.clamp) {
                            exp += 'framesToTime(clamp(x, 0, ' + limitVal + '))';
                        } else {
                            exp += 'framesToTime(x)';
                        }
                    }

                    timeRemapProp.expression = exp;

                    if (switcherConfig.addToEG && sliderProp) {
                        try {
                            if (sliderProp.canAddToMotionGraphicsTemplate && sliderProp.canAddToMotionGraphicsTemplate(comp)) {
                                if (sliderProp.addToMotionGraphicsTemplateAs) {
                                    sliderProp.addToMotionGraphicsTemplateAs(comp, actualSliderName);
                                } else {
                                    sliderProp.addToMotionGraphicsTemplate(comp);
                                }
                            }
                        } catch (e) { }
                    }

                    if (wasLocked) layer.locked = true;

                    processed++;
                    lastSliderName = actualSliderName;
                    lastLimit = limitVal;
                }

                if (processed > 0) {
                    lblStatus.text = "Success! Configured " + processed + " layer(s). Limit: " + lastLimit + (isNormalized ? " (0-100%)" : "");
                    txtQuickTarget.text = lastSliderName;
                    slideQuickVal.maxvalue = lastLimit;
                    slideQuickVal.value = 0;
                    txtQuickVal.text = "0";
                }

            } catch (err) {
                alert("Error configuring switcher: " + err.toString());
            } finally {
                app.endUndoGroup();
            }
        }

        btnActionSwitcher.onClick = function () {
            var info = inspectCurrentLayer();
            if (!info) return;

            if (chkAutoCreate.value) {
                executeCreateSwitcher();
            } else {
                lblStatus.text = "Layer inspected: " + info.layer.name + ". Ready.";
            }
        };

        btnQuickFind.onClick = function () {
            syncQuickController();
        };

        slideQuickVal.onChanging = function () {
            var v = Math.round(this.value);
            txtQuickVal.text = v.toString();
            applyQuickFrame(v, false);
        };

        slideQuickVal.onChange = function () {
            var v = Math.round(this.value);
            txtQuickVal.text = v.toString();
            applyQuickFrame(v, true);
        };

        txtQuickVal.onChange = function () {
            var v = parseInt(this.text, 10);
            if (isNaN(v)) v = 0;
            if (v < 0) v = 0;
            if (v > slideQuickVal.maxvalue) v = slideQuickVal.maxvalue;
            this.text = v.toString();
            slideQuickVal.value = v;
            applyQuickFrame(v, true);
        };

        btnPrevFrame.onClick = function () {
            var v = Math.max(0, Math.round(slideQuickVal.value) - 1);
            slideQuickVal.value = v;
            txtQuickVal.text = v.toString();
            applyQuickFrame(v, true);
        };

        btnNextFrame.onClick = function () {
            var v = Math.min(slideQuickVal.maxvalue, Math.round(slideQuickVal.value) + 1);
            slideQuickVal.value = v;
            txtQuickVal.text = v.toString();
            applyQuickFrame(v, true);
        };

        tpanel.onChange = function () {
            if (tpanel.selection === tabSwitcher) {
                inspectCurrentLayer();
                syncQuickController();
            } else if (tpanel.selection === tabPicker) {
                var comp = app.project.activeItem;
                if (comp && (comp instanceof CompItem) && comp.selectedLayers.length > 0) {
                    var layer = comp.selectedLayers[0];
                    var props = scanLayerProperties(layer);
                    if (props.length > 0) {
                        for (var p = 0; p < pickersData.length; p++) {
                            var pId = pickersData[p].id;
                            var ui = pickersUI[pId];
                            if (ui && ui.ddTarget && ui.ddTarget.items.length <= 2) {
                                updatePickerDropdown(pId, props);
                            }
                        }
                        if (ddBlinkTarget) {
                            var prevBlink = (ddBlinkTarget.selection) ? ddBlinkTarget.selection.text : "eye-open Opacity";
                            ddBlinkTarget.removeAll();
                            var blinkMatch = -1;
                            for (var bi = 0; bi < props.length; bi++) {
                                var pText = props[bi];
                                ddBlinkTarget.add("item", pText);
                                if (pText === prevBlink) {
                                    blinkMatch = bi;
                                } else if (blinkMatch === -1 && (pText.toLowerCase().indexOf("eye-open") !== -1 || pText.toLowerCase().indexOf("opacity") !== -1)) {
                                    blinkMatch = bi;
                                }
                            }
                            ddBlinkTarget.add("item", "(Custom...)");
                            if (blinkMatch >= 0) {
                                ddBlinkTarget.selection = blinkMatch;
                            } else if (ddBlinkTarget.items.length > 1) {
                                ddBlinkTarget.selection = 0;
                            }
                        }
                    }
                }
                try {
                    for (var p = 0; p < pickersData.length; p++) {
                        var pId = pickersData[p].id;
                        if (pickersUI[pId] && !pickersUI[pId].sourceComp) {
                            autoRestoreLoadedComps();
                            break;
                        }
                    }
                } catch (eRestore) { }
            }
        };

        // --- END SWITCHER LOGIC ---

        try {
            autoRestoreLoadedComps();
        } catch (eInit) { }

        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
            win.layout.resize();
        }
    }
    buildUI(thisObj);
})(this);
