$ErrorActionPreference = 'Stop'

Write-Host "Deploying Pupil Joystick CEP Extension..."
$src = $PSScriptRoot
$dest = "$env:APPDATA\Adobe\CEP\extensions\PupilJoystickCEP"

If (Test-Path $dest) {
    Write-Host "Removing old version at $dest..."
    Remove-Item $dest -Recurse -Force
}

$parentDest = "$env:APPDATA\Adobe\CEP\extensions"
If (!(Test-Path $parentDest)) {
    New-Item -ItemType Directory -Force -Path $parentDest | Out-Null
}

Write-Host "Copying files to $dest..."
Copy-Item -Path $src -Destination $dest -Recurse -Force

Write-Host "Setting PlayerDebugMode registry keys for Adobe CC versions..."
# Allow unsigned extensions for multiple CC versions
$csxs_versions = 9..16
foreach ($ver in $csxs_versions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    If (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    New-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
    Write-Host "Configured for CSXS.$ver"
}

Write-Host "Deployment complete! Please restart After Effects, and open Window > Extensions > Pupil Joystick."
Pause
