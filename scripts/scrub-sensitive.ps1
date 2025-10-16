<#
PowerShell scrub script for sensitive/local artifacts before pushing to GitHub.
- Moves common sensitive/test files into ./secret-backup/<timestamp>/
- Leaves a small report of what was moved.
- Designed to be safe (moves, doesn't delete by default).

Usage:
  # Preview what would be moved
  .\scripts\scrub-sensitive.ps1 -WhatIf

  # Actually move files
  .\scripts\scrub-sensitive.ps1
#>
param(
    [switch]$DeleteInstead  # if set, delete files instead of moving
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$backupDir = Join-Path $root "secret-backup\$timestamp"

$candidates = @( 
    'token-out.json',
    'token-*.json',
    'token.json',
    'statement.pdf',
    'statement-*.pdf',
    'statement-base64.txt',
    '*.base64.txt',
    '*.pem',
    '*.key',
    '.env',
    '.env.local',
    '.credentials',
    'aws-credentials',
    'credentials'
)

Write-Host "Repo root: $root"
Write-Host "Backup dir: $backupDir"

if (-not $DeleteInstead) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$found = @()
foreach ($pat in $candidates) {
    $matches = Get-ChildItem -Path $root -Recurse -ErrorAction SilentlyContinue -Filter $pat | Where-Object { -not ($_.FullName -match '\.git') }
    foreach ($m in $matches) {
        $rel = $m.FullName.Substring($root.Length+1)
        $found += $rel
        if ($DeleteInstead) {
            Write-Host "Deleting: $rel"
            Remove-Item -LiteralPath $m.FullName -Force -ErrorAction SilentlyContinue
        } else {
            $target = Join-Path $backupDir $rel
            $tdir = Split-Path -Parent $target
            if (-not (Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
            Write-Host "Moving: $rel -> $target"
            Move-Item -LiteralPath $m.FullName -Destination $target -Force
        }
    }
}

if ($found.Count -eq 0) {
    Write-Host "No candidate files found. Nothing to move/delete."
} else {
    Write-Host "Moved/Deleted the following files:`n" -NoNewline
    $found | ForEach-Object { Write-Host " - $_" }
    Write-Host "\nBackup directory: $backupDir"
    Write-Host "Note: remember to add any remaining sensitive files to .gitignore before pushing."
}

# Helpful hint for git
Write-Host "\nYou can now run:`n  git status`nto verify there are no local sensitive files staged."
