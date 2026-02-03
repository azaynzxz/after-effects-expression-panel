// XLSX to CSV Converter Helper
// Use this to convert XLSX files to CSV for use with List Jumper

(function() {
    
    function convertXLSXtoCSV() {
        var win = new Window("dialog", "XLSX to CSV Converter");
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 15;
        win.margins = 20;
        
        // Instructions
        var infoText = win.add("statictext", undefined, 
            "This tool helps convert XLSX to CSV using Excel.\n" +
            "Make sure Microsoft Excel is installed on your system.",
            {multiline: true});
        infoText.preferredSize.width = 400;
        
        // File selection
        var fileGroup = win.add("group");
        fileGroup.orientation = "column";
        fileGroup.alignChildren = ["fill", "top"];
        fileGroup.spacing = 10;
        
        var selectBtn = fileGroup.add("button", undefined, "Select XLSX File to Convert");
        var filePathText = fileGroup.add("statictext", undefined, "No file selected");
        filePathText.preferredSize.width = 380;
        
        // Progress/Status
        var statusText = win.add("statictext", undefined, "Ready");
        statusText.preferredSize.width = 380;
        
        // Buttons
        var btnGroup = win.add("group");
        btnGroup.orientation = "row";
        btnGroup.alignChildren = ["center", "center"];
        btnGroup.spacing = 10;
        
        var convertBtn = btnGroup.add("button", undefined, "Convert to CSV");
        convertBtn.enabled = false;
        
        var closeBtn = btnGroup.add("button", undefined, "Close");
        
        var selectedFile = null;
        
        // Event handlers
        selectBtn.onClick = function() {
            var file = File.openDialog("Select XLSX file", "*.xlsx");
            if (file) {
                selectedFile = file;
                filePathText.text = file.fsName;
                convertBtn.enabled = true;
                statusText.text = "Ready to convert";
            }
        };
        
        convertBtn.onClick = function() {
            if (!selectedFile) return;
            
            try {
                statusText.text = "Converting... (Excel will open briefly)";
                win.update();
                
                // Determine output file path
                var outputPath = selectedFile.fsName.replace(/\.xlsx$/i, ".csv");
                
                // For Windows, use VBScript to automate Excel
                if ($.os.indexOf("Windows") !== -1) {
                    convertUsingExcelWindows(selectedFile.fsName, outputPath);
                } else {
                    // For Mac, try AppleScript
                    convertUsingExcelMac(selectedFile.fsName, outputPath);
                }
                
                statusText.text = "Conversion complete! Saved to:\n" + outputPath;
                alert("Conversion successful!\n\nCSV saved to:\n" + outputPath);
                
            } catch (error) {
                statusText.text = "Error: " + error.message;
                alert("Conversion failed: " + error.message + 
                      "\n\nPlease convert manually:\n" +
                      "1. Open XLSX in Excel\n" +
                      "2. File > Save As > CSV (Comma delimited)\n" +
                      "3. Save the file");
            }
        };
        
        closeBtn.onClick = function() {
            win.close();
        };
        
        win.show();
    }
    
    // Convert using Excel on Windows (VBScript)
    function convertUsingExcelWindows(xlsxPath, csvPath) {
        // Create a temporary VBScript file
        var vbsScript = 
            'Set objExcel = CreateObject("Excel.Application")\n' +
            'objExcel.Visible = False\n' +
            'objExcel.DisplayAlerts = False\n' +
            'Set objWorkbook = objExcel.Workbooks.Open("' + xlsxPath + '")\n' +
            'objWorkbook.SaveAs "' + csvPath + '", 6\n' + // 6 = CSV format
            'objWorkbook.Close False\n' +
            'objExcel.Quit\n' +
            'Set objWorkbook = Nothing\n' +
            'Set objExcel = Nothing\n';
        
        // Write VBScript to temp file
        var tempVBS = new File(Folder.temp + "/xlsx_to_csv_" + Date.now() + ".vbs");
        tempVBS.open("w");
        tempVBS.write(vbsScript);
        tempVBS.close();
        
        // Execute VBScript
        var command = 'cscript //nologo "' + tempVBS.fsName + '"';
        system.callSystem(command);
        
        // Wait a bit for Excel to finish
        $.sleep(2000);
        
        // Clean up temp file
        tempVBS.remove();
        
        // Verify output exists
        var outputFile = new File(csvPath);
        if (!outputFile.exists) {
            throw new Error("CSV file was not created. Excel may not be installed or accessible.");
        }
    }
    
    // Convert using Excel on Mac (AppleScript)
    function convertUsingExcelMac(xlsxPath, csvPath) {
        var appleScript =
            'tell application "Microsoft Excel"\n' +
            '    activate\n' +
            '    set visible of application "Microsoft Excel" to false\n' +
            '    open "' + xlsxPath + '"\n' +
            '    set activeWorkbook to active workbook\n' +
            '    save workbook as activeWorkbook filename "' + csvPath + '" file format CSV Mac file format\n' +
            '    close active workbook saving no\n' +
            '    quit\n' +
            'end tell';
        
        var tempAS = new File(Folder.temp + "/xlsx_to_csv_" + Date.now() + ".scpt");
        tempAS.open("w");
        tempAS.write(appleScript);
        tempAS.close();
        
        var command = 'osascript "' + tempAS.fsName + '"';
        system.callSystem(command);
        
        $.sleep(2000);
        
        tempAS.remove();
        
        var outputFile = new File(csvPath);
        if (!outputFile.exists) {
            throw new Error("CSV file was not created. Excel may not be installed or accessible.");
        }
    }
    
    // Start the converter
    convertXLSXtoCSV();
    
})();






