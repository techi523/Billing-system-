# PowerShell Script to Install Node.js LTS on Windows
# Run this script as Administrator

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Node.js Installation Script for Windows" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "This script should be run as Administrator for best results."
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Method 1: Install via Chocolatey (if available)
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "`n[Method 1] Installing Node.js via Chocolatey..." -ForegroundColor Green
    choco install nodejs-lts -y
    Write-Host "Node.js installed successfully via Chocolatey!" -ForegroundColor Green
}
# Method 2: Install via winget (Windows Package Manager)
elseif (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "`n[Method 2] Installing Node.js LTS via winget..." -ForegroundColor Green
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    Write-Host "Node.js installed successfully via winget!" -ForegroundColor Green
}
# Method 3: Download and install manually
else {
    Write-Host "`n[Method 3] Downloading Node.js LTS installer..." -ForegroundColor Yellow
    $url = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi"
    $output = "$env:TEMP\nodejs-lts.msi"

    Write-Host "Downloading from: $url" -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "Download complete. Installing..." -ForegroundColor Green

        # Install silently
        $process = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$output`" /qn" -Wait -PassThru

        if ($process.ExitCode -eq 0) {
            Write-Host "Node.js installed successfully!" -ForegroundColor Green
        } else {
            Write-Error "Node.js installation failed with exit code: $($process.ExitCode)"
        }

        # Cleanup
        Remove-Item $output -ErrorAction SilentlyContinue
    }
    catch {
        Write-Error "Failed to download or install Node.js: $_"
        Write-Host "`nManual installation required:" -ForegroundColor Red
        Write-Host "1. Download Node.js LTS from: https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi" -ForegroundColor Yellow
        Write-Host "2. Run the installer with default settings" -ForegroundColor Yellow
        Write-Host "3. Restart your terminal/VS Code" -ForegroundColor Yellow
    }
}

# Verify installation
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Verifying Installation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Start-Sleep -Seconds 2

try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "Node.js Version: $nodeVersion" -ForegroundColor Green
    Write-Host "npm Version: $npmVersion" -ForegroundColor Green

    # Install pnpm globally
    Write-Host "`nInstalling pnpm globally..." -ForegroundColor Yellow
    npm install -g pnpm

    # Verify pnpm
    $pnpmVersion = pnpm --version
    Write-Host "pnpm Version: $pnpmVersion" -ForegroundColor Green
}
catch {
    Write-Warning "Could not verify Node.js installation. You may need to restart your terminal."
    Write-Host "Please run these commands after restarting:" -ForegroundColor Yellow
    Write-Host "  node --version"
    Write-Host "  npm --version"
    Write-Host "  npm install -g pnpm"
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "1. Restart VS Code or open a new terminal" -ForegroundColor White
Write-Host "2. Navigate to the billing system directory" -ForegroundColor White
Write-Host "3. Run: pnpm install" -ForegroundColor White
Write-Host "4. Run: pnpm install --prefix frontend" -ForegroundColor White
Write-Host "5. Create .env file from .env.example" -ForegroundColor White
Write-Host "6. Run: pnpm dev" -ForegroundColor White
