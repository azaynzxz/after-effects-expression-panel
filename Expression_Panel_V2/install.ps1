<#
.SYNOPSIS
    Universal ScriptUI Panels Installer for Adobe After Effects (Windows).
.DESCRIPTION
    Installs Expression Panel ScriptUI panels to Adobe After Effects on Windows.
    Auto-detects installed AE versions, elevates as Administrator if needed,
    and supports both interactive menu and command-line execution.

.EXAMPLE
    # Interactive menu (or right-click -> "Run with PowerShell"):
    .\install.ps1

.EXAMPLE
    # Install directly to After Effects 2026:
    .\install.ps1 2026

.EXAMPLE
    # Install to all detected After Effects versions:
    .\install.ps1 all
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$Version,
    [switch]$DryRun,
    [switch]$SkipElevation
)

# List of ScriptUI panels to deploy
$ScriptsToInstall = @(
    "Expression_Panel_V2.jsx",
    "List_Jumper.jsx",
    "X Crop.jsx",
    "Anchor_Point_Control.jsx",
    "Sync_PSDs_Timeline.jsx",
    "BatchRendering.jsx",
    "SmartRig.jsx",
    "config.json"
)

$SourceDir = $PSScriptRoot
if (-not $SourceDir) {
    $SourceDir = (Get-Location).Path
}

# -----------------------------------------------------------------------------
# 1. Administrator Elevation Check
# -----------------------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin -and -not $SkipElevation) {
    Write-Host "Requesting Administrator privileges to write to Program Files..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Definition
    $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    if ($Version) { $argList += " `"$Version`"" }
    if ($DryRun) { $argList += " -DryRun" }
    
    Start-Process powershell -Verb RunAs -ArgumentList $argList
    exit
}

# -----------------------------------------------------------------------------
# 2. Detect Installed After Effects Versions
# -----------------------------------------------------------------------------
$AdobeBase = "C:\Program Files\Adobe"
$detected = @()

if (Test-Path $AdobeBase) {
    $folders = Get-ChildItem -Directory -Path $AdobeBase -Filter "Adobe After Effects *" -ErrorAction SilentlyContinue
    foreach ($folder in $folders) {
        $panelsPath = Join-Path $folder.FullName "Support Files\Scripts\ScriptUI Panels"
        if (Test-Path $panelsPath) {
            $verName = $folder.Name -replace '^Adobe After Effects\s*', ''
            $detected += [PSCustomObject]@{
                Index   = $detected.Count + 1
                Name    = $folder.Name
                Version = $verName
                Path    = $panelsPath
            }
        }
    }
}

# -----------------------------------------------------------------------------
# 3. Helper Functions
# -----------------------------------------------------------------------------
function Prompt-UserChoice {
    while ($true) {
        Clear-Host
        Write-Host "===================================================================" -ForegroundColor Cyan
        Write-Host "          AE Expression Panel - ScriptUI Panels Installer" -ForegroundColor Cyan
        Write-Host "===================================================================" -ForegroundColor Cyan
        Write-Host "Source: $SourceDir`n" -ForegroundColor Gray

        if ($detected.Count -gt 0) {
            Write-Host "Detected Adobe After Effects installations:" -ForegroundColor Green
            foreach ($item in $detected) {
                Write-Host "  [$($item.Index)] $($item.Name)" -ForegroundColor White
            }
            if ($detected.Count -gt 1) {
                Write-Host "  [A] All detected versions" -ForegroundColor White
            }
            Write-Host "  [C] Custom version or folder path (e.g. 2027)" -ForegroundColor White
            Write-Host ""
            $choice = Read-Host "Select version [1-$($detected.Count), A, C] (Default: 1)"
            if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }
        } else {
            Write-Host "No After Effects installations detected automatically in $AdobeBase." -ForegroundColor Yellow
            $choice = Read-Host "Enter After Effects year/version (e.g. 2024, 2026) or custom path"
            if ([string]::IsNullOrWhiteSpace($choice)) {
                Write-Host "[ERROR] No input specified." -ForegroundColor Red
                continue
            }
        }

        $res = Resolve-Choice $choice
        if ($res.Count -gt 0) {
            return $res
        }

        Write-Host "`n[WARNING] Invalid selection: '$choice'. Press Enter to try again..." -ForegroundColor Yellow
        Read-Host
    }
}

function Resolve-Choice([string]$inputStr) {
    $clean = $inputStr.Trim().Trim('"').Trim("'")
    if (-not $clean) { return @() }

    # Option: All
    if ($clean -match '^(a|all)$') {
        if ($detected.Count -eq 0) {
            Write-Host "[ERROR] No detected versions available." -ForegroundColor Red
            return @()
        }
        return $detected
    }

    # Option: Custom
    if ($clean -match '^(c|custom)$') {
        $customInput = (Read-Host "Enter After Effects year (e.g. 2027) or full folder path").Trim().Trim('"').Trim("'")
        if (-not $customInput) { return @() }
        return Resolve-CustomPath $customInput
    }

    # Match numeric index (1, 2, 3...)
    if ($clean -match '^\d+$') {
        $num = [int]$clean
        $matchIndex = $detected | Where-Object { $_.Index -eq $num }
        if ($matchIndex) { return @($matchIndex) }
    }

    # Match year/version name (e.g. 2024, 2026)
    $matchVer = $detected | Where-Object { $_.Version -eq $clean -or $_.Name -like "*$clean*" }
    if ($matchVer) { return @($matchVer) }

    # Check direct year folder in Adobe Base
    $candidate = Join-Path $AdobeBase "Adobe After Effects $clean\Support Files\Scripts\ScriptUI Panels"
    if (Test-Path $candidate) {
        return @([PSCustomObject]@{
            Index   = 1
            Name    = "Adobe After Effects $clean"
            Version = $clean
            Path    = $candidate
        })
    }

    return (Resolve-CustomPath $clean)
}

function Resolve-CustomPath([string]$pathStr) {
    if (Test-Path (Join-Path $pathStr "Support Files\Scripts\ScriptUI Panels")) {
        $target = Join-Path $pathStr "Support Files\Scripts\ScriptUI Panels"
        return @([PSCustomObject]@{ Index = 1; Name = "Custom: $pathStr"; Version = "Custom"; Path = $target })
    }
    if (Test-Path $pathStr) {
        return @([PSCustomObject]@{ Index = 1; Name = "Custom: $pathStr"; Version = "Custom"; Path = $pathStr })
    }
    $candidate = Join-Path $AdobeBase "Adobe After Effects $pathStr\Support Files\Scripts\ScriptUI Panels"
    if (Test-Path $candidate) {
        return @([PSCustomObject]@{ Index = 1; Name = "Adobe After Effects $pathStr"; Version = $pathStr; Path = $candidate })
    }
    Write-Host "[ERROR] Target folder not found for: '$pathStr'" -ForegroundColor Red
    return @()
}

# -----------------------------------------------------------------------------
# 4. Resolve Target Versions
# -----------------------------------------------------------------------------
if ($Version) {
    $selectedTargets = Resolve-Choice $Version
    if ($selectedTargets.Count -eq 0) {
        Write-Host "[ERROR] Could not resolve '$Version' to an installed After Effects version." -ForegroundColor Red
        if ($Host.Name -eq "ConsoleHost") { Read-Host "Press Enter to exit..." }
        exit 1
    }
} else {
    $selectedTargets = Prompt-UserChoice
}

Write-Host "`n===================================================================" -ForegroundColor Cyan
Write-Host "Target Installation(s) Selected:" -ForegroundColor Cyan
foreach ($t in $selectedTargets) {
    Write-Host "  - $($t.Name) [$($t.Path)]" -ForegroundColor White
}
Write-Host "===================================================================`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "[DRY RUN] Skipping file operations." -ForegroundColor Magenta
    exit 0
}

# -----------------------------------------------------------------------------
# 5. Copy Scripts to Targets
# -----------------------------------------------------------------------------
foreach ($target in $selectedTargets) {
    Write-Host "-------------------------------------------------------------------" -ForegroundColor DarkCyan
    Write-Host "Installing to: $($target.Name)" -ForegroundColor White
    Write-Host "Destination:   $($target.Path)" -ForegroundColor Gray
    Write-Host "-------------------------------------------------------------------" -ForegroundColor DarkCyan

    if (-not (Test-Path $target.Path)) {
        Write-Host "Creating directory: $($target.Path)" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $target.Path -Force | Out-Null
    }

    foreach ($script in $ScriptsToInstall) {
        $src = Join-Path $SourceDir $script
        $dst = Join-Path $target.Path $script

        if (Test-Path $src) {
            if (Test-Path $dst) {
                Remove-Item -Path $dst -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -Path $src -Destination $dst -Force
            Write-Host "  [OK] Copied: $script" -ForegroundColor Green
        } else {
            Write-Host "  [SKIP] Not found in source: $script" -ForegroundColor DarkGray
        }
    }
    
    # Initialize User Documents Preset folder (writable by AE without Admin privileges)
    try {
        $docsPresetFolder = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Adobe\After Effects $($target.Version)\Expression Panel Preset"
        if (-not (Test-Path $docsPresetFolder)) {
            New-Item -ItemType Directory -Path $docsPresetFolder -Force | Out-Null
            Write-Host "  [OK] Created User Preset Folder: $docsPresetFolder" -ForegroundColor Cyan
        }
        $userConfigFile = Join-Path $docsPresetFolder "config.json"
        $srcConfig = Join-Path $SourceDir "config.json"
        if (Test-Path $srcConfig) {
            if (-not (Test-Path $userConfigFile)) {
                Copy-Item -Path $srcConfig -Destination $userConfigFile -Force
                Write-Host "  [OK] Initialized User Preset: $userConfigFile" -ForegroundColor Green
            } else {
                Write-Host "  [KEEP] Existing User Preset found: $userConfigFile" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  [WARN] Could not initialize User Preset folder: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "===================================================================" -ForegroundColor Green
Write-Host "Done - Scripts successfully installed to all selected targets!" -ForegroundColor Green
Write-Host "===================================================================`n" -ForegroundColor Green

# Pause if running interactively
if ($Host.Name -eq "ConsoleHost" -and -not $Version) {
    Read-Host "Press Enter to exit..."
}
