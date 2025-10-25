// Puppet Pin to Null Object Parenter
// Creates nulls for ALL puppet pins across ALL meshes

(function() {
    
    // Check if AE is available
    if (!(app instanceof Application)) {
        alert("This script must be run from Adobe After Effects");
        return;
    }
    
    // Function to get a random integer between min and max (inclusive)
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Main function
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Puppet Pin Null Parenter", undefined);
        
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 15;
        
        // Instructions
        var instructionsGroup = win.add("group");
        instructionsGroup.orientation = "column";
        instructionsGroup.alignChildren = ["left", "top"];
        
        var title = instructionsGroup.add("statictext", undefined, "Puppet Pins to Nulls");
        title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "Bold", 14);
        
        instructionsGroup.add("statictext", undefined, "Instructions:", {multiline: false});
        instructionsGroup.add("statictext", undefined, "1. Select a layer with Puppet effect applied", {multiline: true});
        instructionsGroup.add("statictext", undefined, "2. Click 'Scan Puppet Pins'", {multiline: true});
        instructionsGroup.add("statictext", undefined, "3. Select pins from list, then Create", {multiline: true});
        
        win.add("panel", undefined, "", {borderStyle: "gray"});
        
        // Info display
        var infoGroup = win.add("group");
        infoGroup.orientation = "column";
        infoGroup.alignChildren = ["fill", "top"];
        
        infoGroup.add("statictext", undefined, "Selected Layer:");
        var selectedLayerText = infoGroup.add("statictext", undefined, "None", {multiline: true});
        selectedLayerText.preferredSize = [400, 60];
        
        // Pin selection area
        var pinSelectGroup = win.add("group");
        pinSelectGroup.orientation = "column";
        pinSelectGroup.alignChildren = ["fill", "top"];
        
        pinSelectGroup.add("statictext", undefined, "Select Puppet Pins to Create Nulls For:");
        var pinList = pinSelectGroup.add("listbox", undefined, [], {multiline: true});
        pinList.preferredSize = [400, 200];
        
        var selectAllBtn = pinSelectGroup.add("button", undefined, "Select All");
        var deselectAllBtn = pinSelectGroup.add("button", undefined, "Deselect All");
        
        // Refresh/Scan button
        var refreshBtn = win.add("button", undefined, "Scan Puppet Pins");
        refreshBtn.preferredSize = [-1, 30];
        
        // Create button
        var createBtn = win.add("button", undefined, "Create Nulls for Selected Pins");
        createBtn.preferredSize = [-1, 35];
        
        // Status text
        var statusText = win.add("statictext", undefined, "Status: Select a layer and click 'Scan Puppet Pins'", {multiline: true});
        statusText.preferredSize = [400, 60];
        
        // Store current selection data
        var currentLayer = null;
        var puppetEffect = null;
        var pinData = []; // Store all pin information
        
        // Function to check and display current selection
        function checkSelection() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                selectedLayerText.text = "No composition selected";
                statusText.text = "Status: Please open a composition";
                currentLayer = null;
                puppetEffect = null;
                return;
            }
            
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                selectedLayerText.text = "No layer selected";
                statusText.text = "Status: Please select a layer";
                currentLayer = null;
                puppetEffect = null;
                return;
            }
            
            // Get the first selected layer
            var layer = selectedLayers[0];
            currentLayer = layer;
            
            // Check for Puppet effect
            puppetEffect = layer.effect("Puppet");
            
            if (puppetEffect != null) {
                // Count meshes and pins
                var meshCount = 0;
                var totalPins = 0;
                pinData = []; // Reset pin data
                pinList.removeAll(); // Clear the list
                
                try {
                    // Loop through meshes by index (simpler approach)
                    for (var m = 1; m <= 10; m++) {
                        try {
                            var mesh = puppetEffect.arap.mesh("Mesh " + m);
                            if (!mesh) break;
                            
                            meshCount++;
                            
                            // Loop through pins by index
                            for (var p = 1; p <= 100; p++) {
                                try {
                                    var pin = mesh.deform("Puppet Pin " + p);
                                    if (!pin) break;
                                    
                                    // Check if position property exists
                                    var pinPos = pin.position;
                                    if (pinPos) {
                                        totalPins++;
                                        
                                        // Store pin data
                                        var pinInfo = {
                                            meshIndex: m,
                                            pinIndex: p,
                                            meshName: "Mesh " + m,
                                            pinName: "Puppet Pin " + p,
                                            displayName: layer.name + "_Mesh" + m + "_Pin" + p + "_null"
                                        };
                                        pinData.push(pinInfo);
                                        
                                        // Add to list
                                        var listItem = pinList.add("item", pinInfo.displayName);
                                        listItem.selected = true; // Select all by default
                                    }
                                } catch(e) {
                                    break; // No more pins
                                }
                            }
                        } catch(e) {
                            break; // No more meshes
                        }
                    }
                } catch(e) {
                    selectedLayerText.text = "Layer: " + layer.name + "\n\nError reading puppet data:\n" + e.toString();
                    statusText.text = "Status: Error - " + e.toString();
                    return;
                }
                
                selectedLayerText.text = "Layer: " + layer.name + "\n" +
                                        "Puppet Effect: Found ✓\n" +
                                        "Meshes: " + meshCount + "\n" +
                                        "Total Pins: " + totalPins + "\n\n" +
                                        "✓ Pins loaded! Select from list below.";
                
                statusText.text = "Status: Found " + totalPins + " pin(s). Select pins and click Create.";
            } else {
                selectedLayerText.text = "Layer: " + layer.name + "\n\nNo Puppet effect found";
                statusText.text = "Status: Please apply Puppet effect to the layer";
                puppetEffect = null;
            }
        }
        
        // Refresh/Scan button handler
        refreshBtn.onClick = function() {
            checkSelection();
            win.layout.layout(true);
        };
        
        // Select All button handler
        selectAllBtn.onClick = function() {
            for (var i = 0; i < pinList.items.length; i++) {
                pinList.items[i].selected = true;
            }
            statusText.text = "Status: All " + pinList.items.length + " pins selected. Click Create.";
        };
        
        // Deselect All button handler
        deselectAllBtn.onClick = function() {
            for (var i = 0; i < pinList.items.length; i++) {
                pinList.items[i].selected = false;
            }
            statusText.text = "Status: All pins deselected. Select pins you want.";
        };
        
        // Create button handler
        createBtn.onClick = function() {
            if (!currentLayer || !puppetEffect) {
                alert("Please select a layer with Puppet effect applied first.");
                return;
            }
            
            // Get selected pins from the list
            var selectedPins = [];
            for (var i = 0; i < pinList.items.length; i++) {
                if (pinList.items[i].selected) {
                    selectedPins.push(pinData[i]);
                }
            }
            
            if (selectedPins.length === 0) {
                alert("Please select at least one puppet pin from the list.");
                return;
            }
            
            app.beginUndoGroup("Create Nulls for Selected Puppet Pins");
            
            try {
                var comp = app.project.activeItem;
                var myLayer = currentLayer;
                var createdNulls = 0;
                
                // Get the current rotation and scale of myLayer
                var myLrotation = myLayer.property("Transform").property("Rotation").value;
                var myLscale = myLayer.property("Transform").property("Scale").value;
                
                // Loop through selected pins only
                for (var s = 0; s < selectedPins.length; s++) {
                    var pinInfo = selectedPins[s];
                    var m = pinInfo.meshIndex;
                    var i = pinInfo.pinIndex;
                    
                    try {
                        var mesh = puppetEffect.arap.mesh("Mesh " + m);
                        var puppetPin = mesh.deform("Puppet Pin " + i);
                        
                        if (puppetPin != null) {
                            // Reset rotation and scale values of myLayer before operation
                            myLayer.property("Transform").property("Rotation").setValue(0);
                            myLayer.property("Transform").property("Scale").setValue([100, 100, 100]);
                            
                            // Calculate the position
                            var puppetPos = puppetPin.position.value;
                            var myLanchor = myLayer.transform.anchorPoint.value;
                            var myLpos = myLayer.transform.position.value;
                            var pos = [myLpos[0] + puppetPos[0] - myLanchor[0], myLpos[1] + puppetPos[1] - myLanchor[1]];
                            
                            // Create a new null layer at the calculated position
                            var myNull = comp.layers.addNull();
                            myNull.name = pinInfo.displayName;
                            myNull.transform.position.setValue(pos);
                            myNull.source.width = 350;
                            myNull.source.height = 350;
                            myNull.moveBefore(myLayer);
                            
                            // Set the anchor point of the null to its center
                            myNull.transform.anchorPoint.setValue([myNull.source.width/2, myNull.source.height/2]);
                            
                            // Assign a random label color to the null layer
                            myNull.label = getRandomInt(1, 15);
                            
                            // Link the Puppet Pin position to the null layer position
                            var expr = "n=thisComp.layer(\"" + myNull.name + "\");\n";
                            expr += "nullpos=n.toComp(n.anchorPoint);\n";
                            expr += "fromComp(nullpos);";
                            puppetPin.position.expression = expr;
                            
                            // Link null to myLayer
                            myNull.parent = myLayer;
                            
                            // Set original rotation and scale values back to myLayer
                            myLayer.property("Transform").property("Rotation").setValue(myLrotation);
                            myLayer.property("Transform").property("Scale").setValue(myLscale);
                            
                            createdNulls++;
                        }
                    } catch(e) {
                        statusText.text = "Status: Error on " + pinInfo.displayName + "\n" + e.toString();
                    }
                }
                
                if (createdNulls > 0) {
                    statusText.text = "Status: SUCCESS!\nCreated " + createdNulls + " null object(s).\nPuppet pins are now linked to nulls.";
                } else {
                    statusText.text = "Status: No nulls were created.";
                }
                
            } catch(e) {
                alert("Error creating null objects:\n" + e.toString());
                statusText.text = "Status: Error - " + e.toString();
            }
            
            app.endUndoGroup();
        };
        
        // Initial state - don't auto-check on startup
        // User needs to click "Scan Puppet Pins" button
        
        // Layout and show
        win.layout.layout(true);
        win.layout.resize();
        win.onResizing = win.onResize = function() {
            this.layout.resize();
        };
        
        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
        }
    }
    
    // Run the script
    buildUI(this);
    
})();
