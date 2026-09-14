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
            app.beginUndoGroup("Update Smart Rig Expression");
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            if (comp.selectedLayers.length === 0) {
                alert("Please select at least one Shape Layer (e.g., Leg, Hand).");
                return;
            }

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
            app.endUndoGroup();
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

                app.endUndoGroup();
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
                        var tempFile = new File(Folder.temp.fsName + "/smartrig_preview_" + selComp.id + ".png");
                        if (tempFile.exists) tempFile.remove();
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
                        var tempFile = new File(Folder.temp.fsName + "/smartrig_preview_" + selComp.id + ".png");
                        if (!tempFile.exists) {
                            var origRes = selComp.resolutionFactor;
                            try { selComp.resolutionFactor = [4, 4]; } catch (e) { }
                            selComp.saveFrameToPng(0, tempFile);
                            try { selComp.resolutionFactor = origRes; } catch (e) { }
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

            var chkFlip = panelChar.add("checkbox", undefined, "Flip Horizontally");
            chkFlip.value = false;

            var chkDuplicate = panelChar.add("checkbox", undefined, "Duplicate");
            chkDuplicate.value = false;

            var grpBtns = winDlg.add("group");
            grpBtns.alignment = ["center", "top"];
            var btnOk = grpBtns.add("button", undefined, "Copy & Add");
            var btnCancel = grpBtns.add("button", undefined, "Cancel");

            btnOk.onClick = function () {
                if (!listChar.selection) {
                    alert("Please select a Character.");
                    return;
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

                try {
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
                            parentLyr.enabled = false;

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
                }

                app.endUndoGroup();
            };

            btnCancel.onClick = function () {
                winDlg.close(0);
            };

            winDlg.show();
        };
        // --- SMART PICKER LOGIC ---
        var grpBlinkOpacity = tabPicker.add("group");
        grpBlinkOpacity.orientation = "row";
        grpBlinkOpacity.alignChildren = ["left", "center"];
        grpBlinkOpacity.margins = [10, 10, 10, 0];

        var btnBlinkOp = grpBlinkOpacity.add("button", undefined, "Apply Blink to 'eye-open Opacity'");
        btnBlinkOp.helpTip = "Adds an expression to 'eye-open Opacity' in Essential Properties. Blinks (0%) for 4 frames when hitting a 'B' marker.";
        btnBlinkOp.onClick = function () {
            app.beginUndoGroup("Apply Blink Opacity");
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                app.endUndoGroup();
                return;
            }
            if (comp.selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                app.endUndoGroup();
                return;
            }
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                var essProps = layer.property("ADBE Master Properties");
                if (!essProps) essProps = layer.property("Essential Properties");
                var targetProp = null;
                if (essProps) {
                    targetProp = essProps.property("eye-open Opacity");
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
                } else {
                    alert("Could not find 'eye-open Opacity' in Essential Properties on layer: " + layer.name);
                }
            }
            app.endUndoGroup();
        };

        var btnReloadAll = grpBlinkOpacity.add("button", undefined, "Reload All Pickers");
        btnReloadAll.onClick = function () {
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
        };

        var mainScroll = tabPicker.add("panel", undefined, "");
        mainScroll.alignment = ["fill", "fill"];
        mainScroll.orientation = "column";
        mainScroll.alignChildren = ["fill", "top"];
        var MAX_COLUMNS = 8;
        var pickersData = [
            { id: "eyebrow", label: "Eyebrow Picker", defaultTarget: "eyebrow-slider" },
            { id: "eye_close", label: "Eye Close Picker", defaultTarget: "eye-close-slider" },
            { id: "mouth", label: "Mouth Picker", defaultTarget: "mouth-slider" },
            { id: "mode", label: "Mode Picker", defaultTarget: "-mode-slider" }
        ];

        var pickersUI = {};

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
            winDlg.alignChildren = ["fill", "fill"];
            winDlg.preferredSize.width = 300;

            var txtSearch = winDlg.add("edittext", undefined, "");
            txtSearch.helpTip = "Search Source Comp...";

            var listComps = winDlg.add("listbox", undefined, []);
            listComps.preferredSize.height = 200;

            var filteredComps = [];
            function populate() {
                listComps.removeAll();
                filteredComps = [];
                var q = txtSearch.text.toLowerCase();
                for (var i = 0; i < allComps.length; i++) {
                    var c = allComps[i];
                    if (c.name.toLowerCase().indexOf(q) !== -1) {
                        listComps.add("item", c.name);
                        filteredComps.push(c);
                    }
                }
                if (listComps.items.length > 0) listComps.selection = 0;
            }

            txtSearch.onChanging = populate;
            populate();

            var btnOk = winDlg.add("button", undefined, "Load");

            btnOk.onClick = function () {
                if (!listComps.selection) return;
                var selComp = filteredComps[listComps.selection.index];
                winDlg.close(1);

                if (app.settings) {
                    app.settings.saveSetting("SmartRig", "comp_" + pickerId, selComp.name);
                }

                buildPickerGrid(pickerId, selComp);
            };

            winDlg.show();
        }

        // Initialize UI for each picker
        for (var p = 0; p < pickersData.length; p++) {
            (function (pData) {
                var pnl = mainScroll.add("panel", undefined, pData.label);
                pnl.orientation = "column";
                pnl.alignChildren = ["left", "top"];
                pnl.spacing = 2;
                pnl.margins = 5;
                pnl.alignment = ["fill", "top"];

                var grpControls = pnl.add("group");
                grpControls.orientation = "row";
                grpControls.alignChildren = ["left", "center"];
                grpControls.spacing = 4;
                grpControls.margins = 0;

                var btnLoad = grpControls.add("button", undefined, "Load");
                btnLoad.preferredSize.height = 20;
                grpControls.add("statictext", undefined, "Target:");

                var cachedTarget = "";
                if (app.settings && app.settings.haveSetting("SmartRig", "target_" + pData.id)) {
                    cachedTarget = app.settings.getSetting("SmartRig", "target_" + pData.id);
                }
                var txtTarget = grpControls.add("edittext", undefined, cachedTarget ? cachedTarget : pData.defaultTarget);
                txtTarget.preferredSize.width = 100;
                txtTarget.preferredSize.height = 20;

                txtTarget.onChange = function () {
                    if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pData.id, this.text);
                };

                var chkManualLimit = grpControls.add("checkbox", undefined, "Limit:");

                var cachedLimit = "100";
                if (app.settings && app.settings.haveSetting("SmartRig", "limit_val_" + pData.id)) {
                    cachedLimit = app.settings.getSetting("SmartRig", "limit_val_" + pData.id);
                }
                var txtManualLimit = grpControls.add("edittext", undefined, cachedLimit);
                txtManualLimit.preferredSize.width = 40;
                txtManualLimit.preferredSize.height = 20;

                var cachedCheck = false;
                if (app.settings && app.settings.haveSetting("SmartRig", "limit_chk_" + pData.id)) {
                    cachedCheck = app.settings.getSetting("SmartRig", "limit_chk_" + pData.id) === "true";
                }
                chkManualLimit.value = cachedCheck;
                txtManualLimit.enabled = cachedCheck;

                chkManualLimit.onClick = function () {
                    txtManualLimit.enabled = this.value;
                    if (app.settings) app.settings.saveSetting("SmartRig", "limit_chk_" + pData.id, this.value.toString());
                };

                txtManualLimit.onChange = function () {
                    if (app.settings) app.settings.saveSetting("SmartRig", "limit_val_" + pData.id, this.text);
                };

                var grpGrid = pnl.add("group");
                grpGrid.orientation = "column";
                grpGrid.alignChildren = ["left", "top"];

                pickersUI[pData.id] = {
                    panel: pnl,
                    btnLoad: btnLoad,
                    txtTarget: txtTarget,
                    chkManualLimit: chkManualLimit,
                    txtManualLimit: txtManualLimit,
                    grpGrid: grpGrid,
                    sourceComp: null
                };

                btnLoad.onClick = function () {
                    promptLoadComp(pData.id);
                };
            })(pickersData[p]);
        }

        function buildPickerGrid(pickerId, sourceComp) {
            var ui = pickersUI[pickerId];
            ui.sourceComp = sourceComp;

            var scrollGroup = ui.grpGrid;
            while (scrollGroup.children.length > 0) {
                scrollGroup.remove(scrollGroup.children[0]);
            }

            var numFrames = Math.round(sourceComp.duration / sourceComp.frameDuration);
            if (numFrames <= 0) {
                alert("Selected comp has no duration.");
                return;
            }

            var currentRow = null;
            var frameDuration = sourceComp.frameDuration;
            var thumbDir = new Folder(Folder.userData.fsName + "/SmartPickerThumbs");
            if (!thumbDir.exists) thumbDir.create();

            // Render Thumbnails if missing (Proxy Comp 50x35)
            var missingThumbs = false;
            for (var i = 0; i < numFrames; i++) {
                var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_f" + i + ".png";
                if (!(new File(pathStr)).exists) {
                    missingThumbs = true;
                    break;
                }
            }

            if (missingThumbs) {
                app.beginUndoGroup("Generate Thumbnails");
                try {
                    var tempComp = app.project.items.addComp("SmartPicker_Temp", 30, 20, 1, sourceComp.duration, sourceComp.frameRate);
                    tempComp.layers.addSolid([0.8, 0.8, 0.8], "BG", 30, 20, 1, sourceComp.duration);
                    var srcLayer = tempComp.layers.add(sourceComp);

                    var scaleX = 30 / sourceComp.width;
                    var scaleY = 20 / sourceComp.height;
                    var scale = Math.min(scaleX, scaleY) * 95;
                    srcLayer.property("Scale").setValue([scale, scale]);

                    for (var i = 0; i < numFrames; i++) {
                        var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_f" + i + ".png";
                        var tempFile = new File(pathStr);
                        if (!tempFile.exists) {
                            var timeToRender = i * frameDuration;
                            try {
                                tempComp.saveFrameToPng(timeToRender, tempFile);
                                $.sleep(50);
                            } catch (e) { }
                        }
                    }
                    tempComp.remove();
                } catch (e) { }
                app.endUndoGroup();
            }

            // Build UI Grid
            for (var i = 0; i < numFrames; i++) {
                if (i % MAX_COLUMNS === 0) {
                    currentRow = scrollGroup.add("group");
                    currentRow.orientation = "row";
                    currentRow.alignChildren = ["left", "top"];
                    currentRow.spacing = 5;
                }

                var pathStr = thumbDir.fsName.replace(/\\/g, "/") + "/comp_" + sourceComp.id + "_f" + i + ".png";
                var tempFile = new File(pathStr);

                var btnIcon;
                if (tempFile.exists) {
                    btnIcon = currentRow.add("iconbutton", undefined, tempFile, { style: "toolbutton" });
                } else {
                    btnIcon = currentRow.add("button", undefined, "IMG");
                }
                btnIcon.preferredSize = [30, 20];
                btnIcon.pickerId = pickerId;
                btnIcon.frameIndex = i;

                btnIcon.onClick = function () {
                    applyPickerValue(this.pickerId, this.frameIndex, numFrames);
                };
            }

            if (win instanceof Window) {
                win.layout.layout(true);
            } else {
                win.layout.layout(true);
                win.layout.resize();
            }
        }

        function applyPickerValue(pickerId, index, totalFrames) {
            app.beginUndoGroup("Smart Picker Apply");
            var targetComp = app.project.activeItem;
            if (!targetComp || targetComp.selectedLayers.length === 0) {
                alert("Please select the target layer in the timeline.");
                app.endUndoGroup();
                return;
            }

            var ui = pickersUI[pickerId];
            var effectName = ui.txtTarget.text;
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
                            ui.txtTarget.text = foundProp.name;
                            effectName = foundProp.name;
                            if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pickerId, effectName);
                        }
                    } else {
                        targetProp = essProps.property(effectName);
                    }
                }
            } catch (e) { }

            if (!targetProp) {
                try {
                    var effectsGrp = targetLayer.property("ADBE Effect Parade");
                    if (!effectsGrp) effectsGrp = targetLayer.property("Effects");
                    if (effectsGrp) {
                        if (effectName.charAt(0) === "-") {
                            var foundFx = findPropertyWithSuffix(effectsGrp, effectName);
                            if (foundFx) {
                                targetProp = foundFx.property(1);
                                ui.txtTarget.text = foundFx.name;
                                effectName = foundFx.name;
                                if (app.settings) app.settings.saveSetting("SmartRig", "target_" + pickerId, effectName);
                            }
                        } else {
                            var fx = effectsGrp.property(effectName);
                            if (fx) targetProp = fx.property(1);
                        }
                    }
                } catch (e) { }
            }

            if (!targetProp) {
                alert("Property '" + effectName + "' not found! Please manually specify the name in the text box.");
                app.endUndoGroup();
                return;
            }

            if (!targetProp.canSetExpression) {
                alert("The found property '" + targetProp.name + "' cannot be keyframed.");
                app.endUndoGroup();
                return;
            }

            // --- Auto-detect Slider Limit ---
            var limitVal = 100; // default

            if (ui.chkManualLimit && ui.chkManualLimit.value) {
                var parsedLimit = parseFloat(ui.txtManualLimit.text);
                if (!isNaN(parsedLimit)) {
                    limitVal = parsedLimit;
                }
            } else {
                try {
                    if (targetLayer.source instanceof CompItem) {
                        var prefix = effectName.split("-")[0]; // e.g., 'eyebrow' or 'mouth'
                        var sdLayer = null;

                        // Search for the Joysticks n Sliders '-sd' layer
                        for (var i = 1; i <= targetLayer.source.numLayers; i++) {
                            var l = targetLayer.source.layer(i);
                            if (l.name.indexOf(prefix) === 0 && l.name.indexOf("-sd") !== -1) {
                                sdLayer = l;
                                break;
                            }
                        }

                        if (sdLayer) {
                            var effects = sdLayer.property("ADBE Effect Parade");
                            var sliderOpts = null;
                            if (effects) {
                                for (var e = 1; e <= effects.numProperties; e++) {
                                    if (effects.property(e).matchName === "Pseudo/fL3c11baf7UVr" || effects.property(e).name.indexOf("Slider Options") !== -1) {
                                        sliderOpts = effects.property(e);
                                        break;
                                    }
                                }
                            }
                            if (sliderOpts) {
                                var limitProp = sliderOpts.property("Slider Limit");
                                if (!limitProp) limitProp = sliderOpts.property(2); // Fallback to prop index 2
                                if (limitProp) limitVal = limitProp.value;
                            }
                        }
                    }
                } catch (e) { }
            }

            var step = limitVal / totalFrames;
            // Place keyframe safely inside the threshold (20% into the step)
            var val = (index * step) + (step * 0.2);

            try {
                targetProp.setValueAtTime(targetComp.time, val);
                var newKeyIndex = targetProp.nearestKeyIndex(targetComp.time);
                if (newKeyIndex > 0) {
                    targetProp.setInterpolationTypeAtKey(newKeyIndex, KeyframeInterpolationType.HOLD);
                }
            } catch (e) {
                alert("Error setting value: " + e.toString());
            }

            app.endUndoGroup();
        }

        // Auto-Load Cached Pickers removed to prevent UI freeze on startup
        // The user can now click the global 'Reload All Pickers' button to explicitly load previous picker grids.
        // --- END SMART PICKER LOGIC ---


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
