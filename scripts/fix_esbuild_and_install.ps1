# fix_esbuild_and_install.ps1
# Usage: Open PowerShell as Administrator, cd to repository root and run:
#   .\scripts\fix_esbuild_and_install.ps1

function Ensure-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Warning "This script is not running as Administrator. Some removal steps may fail with EPERM. Consider re-running PowerShell as Administrator."
  }
}

function Stop-Node-Vite {
  Write-Host "Stopping node and vite processes (if any)..." -ForegroundColor Cyan
  Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host "Stopped node pid=$($_.Id)" } catch { } }
  Get-Process vite -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host "Stopped vite pid=$($_.Id)" } catch { } }
}

function Remove-EsbuildIfExists {
  $rel = "node_modules\@esbuild\win32-x64\esbuild.exe"
  $full = Join-Path (Get-Location) $rel
  if (Test-Path $full) {
    Write-Host "Attempting to remove $rel" -ForegroundColor Yellow
    try {
      Remove-Item -LiteralPath $full -Force -ErrorAction Stop
      Write-Host "Removed ${rel}" -ForegroundColor Green
    } catch {
      Write-Warning "Failed to remove ${rel}: $($_.Exception.Message)"
      # Try to take ownership and grant full control, then retry removal (requires admin)
      try {
        Write-Host "Attempting takeown/icacls and retry (requires Administrator)..." -ForegroundColor Yellow
        & takeown /f "$full" /a 2>$null
        & icacls "$full" /grant "$env:USERNAME`:(F)" /C 2>$null
        Remove-Item -LiteralPath $full -Force -ErrorAction Stop
        Write-Host "Removed ${rel} after takeown/icacls" -ForegroundColor Green
      } catch {
        Write-Warning "Retry also failed: $($_.Exception.Message)"
        Write-Host "If removal failed with EPERM, please close programs that might lock the file (editors, terminals, antivirus), reboot, or run this script as Administrator." -ForegroundColor Yellow
      }
    }
  } else {
    Write-Host "$rel not present, skipping removal." -ForegroundColor Gray
  }
}

function Remove-NpmCacheIndex {
  Write-Host "Attempting to remove problematic npm cache index folder..." -ForegroundColor Cyan
  $indexRel = Join-Path $env:LOCALAPPDATA "npm-cache\_cacache\index-v5\9a"
  if (Test-Path $indexRel) {
    Write-Host "Found cache folder: $indexRel" -ForegroundColor Yellow
    try {
      Remove-Item -LiteralPath $indexRel -Recurse -Force -ErrorAction Stop
      Write-Host "Removed cache folder: $indexRel" -ForegroundColor Green
      return $true
    } catch {
      Write-Warning "Initial remove failed: $($_.Exception.Message)"
      try {
        Write-Host "Attempting takeown/icacls on cache folder (requires Administrator)..." -ForegroundColor Yellow
        & takeown /f "$indexRel" /r /d y 2>$null
        & icacls "$indexRel" /grant "$env:USERNAME`:(F)" /C 2>$null
        Remove-Item -LiteralPath $indexRel -Recurse -Force -ErrorAction Stop
        Write-Host "Removed after takeown/icacls: $indexRel" -ForegroundColor Green
        return $true
      } catch {
        Write-Warning "Retry failed: $($_.Exception.Message)"
        Write-Host "As fallback, attempting to remove entire npm-cache root..." -ForegroundColor Yellow
        $cacheRoot = Join-Path $env:LOCALAPPDATA "npm-cache"
        try {
          Remove-Item -LiteralPath $cacheRoot -Recurse -Force -ErrorAction Stop
          Write-Host "Removed npm-cache root: $cacheRoot" -ForegroundColor Green
          return $true
        } catch {
          Write-Warning "Fallback remove failed: $($_.Exception.Message)"
          Write-Host "Could not remove npm cache automatically. Please run this script as Administrator or remove the folder manually: $indexRel" -ForegroundColor Yellow
          return $false
        }
      }
    }
  } else {
    Write-Host "Cache index folder not present, skipping." -ForegroundColor Gray
    return $true
  }
}

function NpmInstallClean {
  Write-Host "Cleaning npm cache and installing dependencies (npm ci)..." -ForegroundColor Cyan
  try { npm cache clean --force } catch { Write-Warning "npm cache clean failed: $($_.Exception.Message)" }
  $rc = & npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm ci failed with exit code $LASTEXITCODE"
    return $false
  }
  return $true
}

function Run-TypeCheck {
  Write-Host "Running TypeScript type-check (npx tsc --noEmit --project tsconfig.app.json)" -ForegroundColor Cyan
  try {
    npx tsc --noEmit --project tsconfig.app.json
    if ($LASTEXITCODE -ne 0) { Write-Warning "TypeScript reported errors (see output)." } else { Write-Host "TypeScript check completed without errors." -ForegroundColor Green }
  } catch { Write-Warning "TypeScript check failed to run: $($_.Exception.Message)" }
}

# Main
Ensure-Admin
Stop-Node-Vite
Remove-EsbuildIfExists
$cacheOk = Remove-NpmCacheIndex
if (-not $cacheOk) {
  Write-Warning "Automatic cache removal could not complete. You may need to run this script as Administrator or delete the cache path manually and retry npm ci.";
}
$ok = NpmInstallClean
if ($ok) { Run-TypeCheck }

Write-Host "\nDone. If VSCode still shows TypeScript errors, in VSCode select: Command Palette -> 'TypeScript: Select TypeScript Version' -> 'Use Workspace Version', then 'TypeScript: Restart TS Server' or reload the window." -ForegroundColor Cyan

Write-Host "If you want, run this script as Administrator after a reboot for best chance to clear locked files." -ForegroundColor Yellow
